"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { parseCsvWithHeader } from "@/lib/csv";
import { parseIstDateTime } from "@/lib/time";
import { isCohortSplitValue } from "@/lib/cohortSplits";
import { DEFAULT_CHECKPOINT_LABELS, TRAVEL_STAGES } from "@/lib/travel";

export type ActionState = { error?: string; message?: string; confirmCheckins?: number } | undefined;

function revalidateTravel() {
  revalidatePath("/admin/travel", "layout");
  revalidatePath("/travel", "layout");
}

function readSlotFields(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const flightNo = String(formData.get("flightNo") ?? "").trim() || null;
  const departureRaw = String(formData.get("departureAt") ?? "").trim();
  // datetime-local must go through the IST helper (server TZ differs between Vercel and local).
  const departureAt = departureRaw ? parseIstDateTime(departureRaw) : null;
  if (departureAt && Number.isNaN(departureAt.getTime())) return { error: "Departure time isn't a valid date." } as const;
  if (!label) return { error: "Give the flight a name, e.g. “Day 1 Morning”." } as const;
  return { label, flightNo, departureAt } as const;
}

// ---- flights --------------------------------------------------------------------------------

export async function createTravelSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const f = readSlotFields(formData);
  if ("error" in f) return { error: f.error };
  await prisma.travelSlot.create({
    data: {
      label: f.label,
      flightNo: f.flightNo,
      departureAt: f.departureAt,
      checkpoints: { create: TRAVEL_STAGES.map((stage) => ({ stage, label: DEFAULT_CHECKPOINT_LABELS[stage] })) },
    },
  });
  revalidateTravel();
  return { message: `Added ${f.label}.` };
}

export async function updateTravelSlot(slotId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const f = readSlotFields(formData);
  if ("error" in f) return { error: f.error };
  await prisma.travelSlot.update({
    where: { id: slotId },
    data: { label: f.label, flightNo: f.flightNo, departureAt: f.departureAt },
  });
  revalidateTravel();
  return { message: "Saved." };
}

/**
 * Delete a flight. Students on it become "not assigned" (FK ON DELETE SET NULL); its checkpoints and
 * their check-ins are removed with it (ON DELETE CASCADE). If it already has check-ins, the first call
 * returns `confirmCheckins` instead of deleting, and the admin must confirm again (`withCheckins`).
 */
export async function deleteTravelSlot(slotId: string, withCheckins = false): Promise<ActionState> {
  await requireAdmin();
  const scans = await prisma.travelScan.count({ where: { checkpoint: { slotId } } });
  if (scans > 0 && !withCheckins) return { confirmCheckins: scans };
  const deleted = await prisma.travelSlot.deleteMany({ where: { id: slotId } });
  if (deleted.count === 0) return { error: "That flight no longer exists." };
  revalidateTravel();
  return { message: "Flight deleted." };
}

// ---- allocation -----------------------------------------------------------------------------

/** Put every student in a cohort split on one flight (and optionally one bus). */
export async function assignCohortSplit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const split = String(formData.get("split") ?? "");
  const slotId = String(formData.get("slotId") ?? "") || null;
  const busNumber = String(formData.get("busNumber") ?? "").trim() || null;
  if (!isCohortSplitValue(split)) return { error: "Pick a cohort split." };
  if (slotId && !(await prisma.travelSlot.findUnique({ where: { id: slotId }, select: { id: true } }))) {
    return { error: "That flight no longer exists." };
  }

  const users = await prisma.user.findMany({ where: { cohortSplit: split, isAdmin: false }, select: { id: true } });
  if (users.length === 0) return { error: `No students in ${split}. Is the roster's cohort_split filled in?` };
  const ids = users.map((u) => u.id);

  // Bulk (createMany + updateMany), never a per-row loop in one transaction — see PROJECT_CONTEXT gotcha #1.
  await prisma.$transaction([
    prisma.travelAssignment.createMany({ data: ids.map((userId) => ({ userId })), skipDuplicates: true }),
    prisma.travelAssignment.updateMany({ where: { userId: { in: ids } }, data: { slotId, busNumber } }),
  ]);
  revalidateTravel();
  return { message: `${split}: ${ids.length} students ${slotId ? "assigned" : "unassigned"}.` };
}

/**
 * CSV upload for when the real allocation arrives student-by-student.
 * Columns: pgp_id (required), flight (flight name or flight number; blank = not assigned), bus (optional).
 */
export async function importTravelAssignmentsCsv(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };

  const [slots, users] = await Promise.all([
    prisma.travelSlot.findMany({ select: { id: true, label: true, flightNo: true } }),
    prisma.user.findMany({ select: { id: true, pgpId: true } }),
  ]);
  const slotByKey = new Map<string, string>();
  for (const s of slots) {
    slotByKey.set(s.label.trim().toLowerCase(), s.id);
    if (s.flightNo) slotByKey.set(s.flightNo.trim().toLowerCase(), s.id);
  }
  const userByPgp = new Map(users.map((u) => [u.pgpId.trim().toLowerCase(), u.id]));

  const { results, headerError } = parseCsvWithHeader(await file.text(), ["pgp_id"], (record, row) => {
    const pgp = record.pgp_id?.trim();
    if (!pgp) throw new Error(`Row ${row}: missing pgp_id`);
    const userId = userByPgp.get(pgp.toLowerCase());
    if (!userId) throw new Error(`Row ${row}: no student with PGP ID ${pgp}`);
    const flight = record.flight?.trim() ?? "";
    const slotId = flight ? slotByKey.get(flight.toLowerCase()) : null;
    if (flight && !slotId) throw new Error(`Row ${row}: unknown flight “${flight}” (use a flight name or number from the Flights list)`);
    return { userId, slotId: slotId ?? null, busNumber: record.bus?.trim() || null };
  });
  if (headerError) return { error: headerError };

  const errors = results.filter((r) => r.error).map((r) => r.error!);
  if (errors.length) return { error: `Nothing imported — fix these rows first:\n${errors.slice(0, 15).join("\n")}${errors.length > 15 ? `\n…and ${errors.length - 15} more` : ""}` };
  const rows = results.map((r) => r.data!);
  if (rows.length === 0) return { error: "The CSV has no data rows." };

  const ids = rows.map((r) => r.userId);
  // Replace these students' assignments in one batch (delete + createMany, no interactive tx).
  await prisma.$transaction([
    prisma.travelAssignment.deleteMany({ where: { userId: { in: ids } } }),
    prisma.travelAssignment.createMany({ data: rows }),
  ]);
  revalidateTravel();
  const assigned = rows.filter((r) => r.slotId).length;
  return { message: `Imported ${rows.length} students (${assigned} on a flight, ${rows.length - assigned} not assigned).` };
}

/** Per-student change from the flight list (e.g. a late swap). */
export async function setStudentAssignment(userId: string, slotId: string | null, busNumber: string | null): Promise<ActionState> {
  await requireAdmin();
  await prisma.travelAssignment.upsert({
    where: { userId },
    create: { userId, slotId, busNumber: busNumber?.trim() || null },
    update: { slotId, busNumber: busNumber?.trim() || null },
  });
  revalidateTravel();
  return { message: "Saved." };
}

export async function clearAllAssignments(): Promise<ActionState> {
  await requireAdmin();
  const { count } = await prisma.travelAssignment.deleteMany({});
  revalidateTravel();
  return { message: `Cleared ${count} assignments.` };
}

// ---- coordinators ---------------------------------------------------------------------------

export async function grantTravelCoordinator(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const checkpointId = String(formData.get("checkpointId") ?? "") || null;
  if (!userId) return { error: "Pick a roster member." };
  await prisma.travelCoordinator.upsert({
    where: { userId },
    create: { userId, checkpointId, grantedById: admin.id! },
    update: { checkpointId },
  });
  revalidateTravel();
  return { message: "Coordinator added." };
}

export async function revokeTravelCoordinator(id: string): Promise<ActionState> {
  await requireAdmin();
  await prisma.travelCoordinator.delete({ where: { id } });
  revalidateTravel();
  return { message: "Removed." };
}
