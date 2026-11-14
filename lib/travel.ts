import { prisma } from "@/lib/prisma";
import type { TravelStage } from "@/generated/prisma/client";
import type { TravelScanDTO, TravelSnapshot } from "@/lib/travel-shared";

export async function buildTravelSnapshot(viewer: { id: string; name: string; isAdmin: boolean }): Promise<TravelSnapshot> {
  const [slots, checkpoints, students, coordinators, admins, scans, me] = await Promise.all([
    prisma.travelSlot.findMany({ orderBy: [{ departureAt: "asc" }, { createdAt: "asc" }] }),
    prisma.travelCheckpoint.findMany(),
    prisma.user.findMany({
      where: { OR: [{ isAdmin: false }, { travelAssignment: { isNot: null } }] },
      select: {
        id: true,
        name: true,
        pgpId: true,
        isbEmail: true,
        cohortSplit: true,
        travelAssignment: { select: { slotId: true, busNumber: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.travelCoordinator.findMany({ select: { user: { select: { id: true, name: true } } } }),
    prisma.user.findMany({ where: { isAdmin: true }, select: { id: true, name: true } }),
    serializeScans(),
    prisma.travelCoordinator.findUnique({ where: { userId: viewer.id }, select: { checkpointId: true } }),
  ]);

  return {
    me: { userId: viewer.id, name: viewer.name, isAdmin: viewer.isAdmin, checkpointId: me?.checkpointId ?? null },
    slots: slots.map((s) => ({
      id: s.id,
      label: s.label,
      flightNo: s.flightNo,
      departureAt: s.departureAt?.toISOString() ?? null,
    })),
    checkpoints: checkpoints.map((c) => ({ id: c.id, slotId: c.slotId, stage: c.stage, label: c.label })),
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      pgpId: s.pgpId,
      isbEmail: s.isbEmail,
      cohortSplit: s.cohortSplit,
      slotId: s.travelAssignment?.slotId ?? null,
      busNumber: s.travelAssignment?.busNumber ?? null,
    })),
    scanners: [...admins, ...coordinators.map((c) => c.user)],
    scans,
  };
}

/**
 * Travel Log server helpers. Access model mirrors attendance tracking:
 *  - admins see and do everything;
 *  - TravelCoordinator rows make a non-admin a travel team member with a check-in station (not admin rights);
 *  - every student sees the Travel tab; once they're on a flight they scan a team member's station QR
 *    to check in (before that, the Travel page says they haven't been assigned yet).
 */

export const TRAVEL_STAGES: TravelStage[] = ["BUS", "AIRPORT", "GATE"];

export const DEFAULT_CHECKPOINT_LABELS: Record<TravelStage, string> = {
  BUS: "Bus boarding",
  AIRPORT: "Airport check-in",
  GATE: "Gate boarding",
};

export async function serializeScans(): Promise<TravelScanDTO[]> {
  const scans = await prisma.travelScan.findMany({
    select: { id: true, userId: true, checkpointId: true, scannedById: true, scannedAt: true, method: true, notes: true },
  });
  return scans.map((s) => ({ ...s, scannedAt: s.scannedAt.toISOString() }));
}

/**
 * Record a check-in. Idempotent per (student, checkpoint): a repeat updates the row, and the stored
 * `scannedAt` only ever moves forward (a late offline sync never rewinds it). `existed` says whether
 * the student had already checked in at this checkpoint before this call.
 */
export async function upsertTravelScan(input: {
  userId: string;
  checkpointId: string;
  scannedById: string;
  scannedAt: Date;
  method: "qr" | "manual";
  notes: string | null;
}) {
  const key = { userId_checkpointId: { userId: input.userId, checkpointId: input.checkpointId } };
  const write = async () => {
    const existing = await prisma.travelScan.findUnique({ where: key });
    if (!existing) {
      return { row: await prisma.travelScan.create({ data: input }), existed: false };
    }
    const row = await prisma.travelScan.update({
      where: key,
      data: {
        scannedById: input.scannedById,
        method: input.method,
        scannedAt: input.scannedAt > existing.scannedAt ? input.scannedAt : existing.scannedAt,
        notes: input.notes ?? existing.notes,
      },
    });
    return { row, existed: true };
  };
  try {
    return await write();
  } catch (e) {
    // Two check-ins for the same student + checkpoint at the same instant: the unique constraint
    // rejected the second create — retry as an update.
    if ((e as { code?: string }).code !== "P2002") throw e;
    return write();
  }
}

export async function isTravelCoordinator(userId: string): Promise<boolean> {
  const row = await prisma.travelCoordinator.findUnique({ where: { userId }, select: { id: true } });
  return !!row;
}

/** Can this user use the scanner / see the live travel data? */
export async function canUseTravelScanner(user: { id?: string; isAdmin?: boolean }): Promise<boolean> {
  if (user.isAdmin) return true;
  if (!user.id) return false;
  return isTravelCoordinator(user.id);
}
