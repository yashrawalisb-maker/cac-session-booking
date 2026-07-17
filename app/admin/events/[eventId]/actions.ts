"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { bookSessionForUser, cancelBooking, BookingError } from "@/lib/booking";
import { parseCsvWithHeader } from "@/lib/csv";

export type ActionState = { error?: string; success?: boolean; message?: string } | undefined;

function revalidateEvent(eventId: string) {
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
}

// --- Event ---

export async function updateEvent(
  eventId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const bookingDeadline = String(formData.get("bookingDeadline") ?? "");
  const status = String(formData.get("status") ?? "draft") as "draft" | "published" | "closed";
  const overlapCheckEnabled = formData.get("overlapCheckEnabled") === "on";

  if (!name || !startDate || !endDate || !bookingDeadline) {
    return { error: "Name, start date, end date, and booking deadline are required." };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      name,
      description: description || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      bookingDeadline: new Date(bookingDeadline),
      status,
      overlapCheckEnabled,
    },
  });

  revalidateEvent(eventId);
  return { success: true };
}

// --- Sessions ---

function parseSessionForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dayLabel = String(formData.get("dayLabel") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const venueName = String(formData.get("venueName") ?? "").trim();
  const venueLocation = String(formData.get("venueLocation") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 0);
  const speakerProfileId = String(formData.get("speakerProfileId") ?? "").trim();
  const speakerDescription = String(formData.get("speakerDescription") ?? "").trim();

  if (!title || !dayLabel || !startsAt || !endsAt || !venueName || !capacity) {
    return { error: "Title, day, start/end time, venue, and capacity are required." } as const;
  }
  if (new Date(endsAt) <= new Date(startsAt)) {
    return { error: "End time must be after start time." } as const;
  }

  return {
    data: {
      title,
      description: description || null,
      dayLabel,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      venueName,
      venueLocation: venueLocation || null,
      capacity,
      speakerProfileId: speakerProfileId || null,
      speakerDescription: speakerDescription || null,
    },
  } as const;
}

export async function createSession(
  eventId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseSessionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  await prisma.session.create({ data: { ...parsed.data, eventId, status: "open" } });
  revalidateEvent(eventId);
  return { success: true };
}

export async function updateSession(
  eventId: string,
  sessionId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseSessionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  await prisma.session.update({ where: { id: sessionId }, data: parsed.data });
  revalidateEvent(eventId);
  return { success: true };
}

export async function cancelSession(eventId: string, sessionId: string): Promise<void> {
  await requireAdmin();
  // Existing bookings are intentionally left in place (flagged for admin follow-up), not deleted.
  await prisma.session.update({ where: { id: sessionId }, data: { status: "cancelled" } });
  revalidateEvent(eventId);
}

// --- Ticket allotments ---

export async function setDefaultTickets(
  eventId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const tickets = Number(formData.get("tickets") ?? 0);
  if (!Number.isFinite(tickets) || tickets < 0) return { error: "Enter a valid ticket count." };

  const users = await prisma.user.findMany({ where: { isAdmin: false }, select: { id: true } });
  const existing = await prisma.eventTicketAllotment.findMany({
    where: { eventId },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((a) => a.userId));
  const newUserIds = users.filter((u) => !existingIds.has(u.id)).map((u) => u.id);

  // Two bulk statements instead of one create-per-user inside a single interactive
  // transaction — with a large roster, N individual creates blew past Prisma's default 5s
  // transaction timeout. This is idempotent (safe to re-run) so no transaction is needed.
  if (newUserIds.length > 0) {
    await prisma.eventTicketAllotment.createMany({
      data: newUserIds.map((userId) => ({ eventId, userId, ticketsAllotted: tickets })),
    });
  }
  if (existingIds.size > 0) {
    await prisma.eventTicketAllotment.updateMany({
      where: { eventId, userId: { in: Array.from(existingIds) } },
      data: { ticketsAllotted: tickets },
    });
  }

  revalidateEvent(eventId);
  return { success: true, message: `Set ${tickets} ticket(s) for ${users.length} user(s).` };
}

export async function setUserTickets(
  eventId: string,
  userId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const tickets = Number(formData.get("tickets") ?? 0);
  if (!Number.isFinite(tickets) || tickets < 0) return { error: "Enter a valid ticket count." };

  await prisma.eventTicketAllotment.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { ticketsAllotted: tickets },
    create: { eventId, userId, ticketsAllotted: tickets },
  });

  revalidateEvent(eventId);
  return { success: true };
}

export async function importAllotmentsCsv(
  eventId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a CSV file." };
  const text = await file.text();

  const { results, headerError } = parseCsvWithHeader(
    text,
    ["pgp_id", "tickets_allotted"],
    (record, row) => {
      const pgpId = record.pgp_id?.trim();
      const tickets = Number(record.tickets_allotted);
      if (!pgpId) throw new Error(`Row ${row}: missing pgp_id`);
      if (!Number.isFinite(tickets) || tickets < 0) throw new Error(`Row ${row}: invalid tickets_allotted`);
      return { pgpId, tickets };
    }
  );
  if (headerError) return { error: headerError };

  const errors = results.filter((r) => r.error).map((r) => r.error!);
  const valid = results.filter((r): r is { row: number; data: { pgpId: string; tickets: number } } => !!r.data);

  const users = await prisma.user.findMany({
    where: { pgpId: { in: valid.map((v) => v.data.pgpId) } },
  });
  const userByPgp = new Map(users.map((u) => [u.pgpId.toLowerCase(), u]));

  let applied = 0;
  for (const v of valid) {
    const user = userByPgp.get(v.data.pgpId.toLowerCase());
    if (!user) {
      errors.push(`Row ${v.row}: no user with pgp_id ${v.data.pgpId}`);
      continue;
    }
    await prisma.eventTicketAllotment.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      update: { ticketsAllotted: v.data.tickets },
      create: { eventId, userId: user.id, ticketsAllotted: v.data.tickets },
    });
    applied++;
  }

  revalidateEvent(eventId);
  if (errors.length > 0) {
    return { error: `Applied ${applied} row(s). Errors:\n${errors.join("\n")}` };
  }
  return { success: true, message: `Applied ${applied} row(s).` };
}

// --- Manual booking override ---

export async function manualBookingOverride(
  eventId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const bypassTicketCheck = formData.get("bypassTicketCheck") === "on";

  if (!userId || !sessionId || !note) {
    return { error: "User, session, and a reason note are required." };
  }

  try {
    await bookSessionForUser(prisma, {
      userId,
      eventId,
      sessionId,
      bookingType: "self_selected",
      adminOverride: { adminUserId: admin.id!, note, bypassTicketCheck, bypassDeadline: true },
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }

  revalidateEvent(eventId);
  return { success: true };
}

export async function adminCancelBooking(
  eventId: string,
  bookingId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "A reason note is required to cancel a booking." };

  await cancelBooking(prisma, { bookingId, adminUserId: admin.id!, note });
  revalidateEvent(eventId);
  return { success: true };
}
