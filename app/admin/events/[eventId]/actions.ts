"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { bookSessionForUser, attemptBooking, cancelBooking, BookingError } from "@/lib/booking";
import { sendAcknowledgmentEmail } from "@/lib/email";
import { parseCsvWithHeader } from "@/lib/csv";
import { isClubValue } from "@/lib/clubs";
import { isCohortSplitValue } from "@/lib/cohortSplits";
import { parseIstDateTime } from "@/lib/time";
import { parseSpeakers } from "@/lib/speakers";

export type ActionState = { error?: string; success?: boolean; message?: string } | undefined;

export type GroupBookingResultRow = { name: string; pgpId: string; outcome: string };
export type GroupBookingActionState =
  | {
      error?: string;
      success?: boolean;
      summary?: { total: number; booked: number; skipped: number };
      results?: GroupBookingResultRow[];
    }
  | undefined;

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
      bookingDeadline: parseIstDateTime(bookingDeadline),
      status,
      overlapCheckEnabled,
    },
  });

  revalidateEvent(eventId);
  return { success: true };
}

/**
 * Permanently delete an event and everything under it. The schema's `onDelete: Cascade` FKs
 * mean a single delete removes the event's sessions, ticket allotments, bookings, and their
 * acknowledgment logs in one DB-level cascade. Guarded by a name match on the client, and
 * re-checked here so a stale/tampered request can't delete the wrong event.
 */
export async function deleteEvent(
  eventId: string,
  confirmName: string
): Promise<ActionState> {
  await requireAdmin();

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { name: true } });
  if (!event) return { error: "Event not found." };
  if (confirmName.trim() !== event.name) {
    return { error: "The typed name doesn't match the event name." };
  }

  await prisma.event.delete({ where: { id: eventId } });

  revalidatePath("/admin");
  redirect("/admin");
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

  // Multi-speaker: the form posts a JSON array; the flat speaker* columns below are kept mirrored
  // to the first speaker so legacy readers (booking email, un-migrated sessions) still work.
  const speakers = parseSpeakers(formData.get("speakers"));
  const primary = speakers[0] ?? null;

  const venueDescription = String(formData.get("venueDescription") ?? "").trim();
  const venuePhotoUrl = String(formData.get("venuePhotoUrl") ?? "").trim();
  const venueMapUrl = String(formData.get("venueMapUrl") ?? "").trim();
  const campus = String(formData.get("campus") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "").trim();
  // organizedBy is legacy free-text — no longer editable; the structured `club` replaces it.
  const club = String(formData.get("club") ?? "").trim();
  const keyTakeaways = String(formData.get("keyTakeaways") ?? "").trim();
  const agenda = String(formData.get("agenda") ?? "").trim();
  const whoShouldAttend = String(formData.get("whoShouldAttend") ?? "").trim();

  if (!title || !dayLabel || !startsAt || !endsAt || !venueName || !capacity) {
    return { error: "Title, day, start/end time, venue, and capacity are required." } as const;
  }
  const startsAtDate = parseIstDateTime(startsAt);
  const endsAtDate = parseIstDateTime(endsAt);
  if (endsAtDate <= startsAtDate) {
    return { error: "End time must be after start time." } as const;
  }
  if (club && !isClubValue(club)) {
    return { error: "Select a valid club." } as const;
  }

  return {
    data: {
      title,
      description: description || null,
      dayLabel,
      startsAt: startsAtDate,
      endsAt: endsAtDate,
      venueName,
      venueLocation: venueLocation || null,
      capacity,
      speakers,
      speakerName: primary?.name ?? null,
      speakerRole: primary?.role ?? null,
      speakerPhotoUrl: primary?.photoUrl ?? null,
      speakerBio: primary?.bio ?? null,
      speakerProfileUrl: primary?.profileUrl ?? null,
      speakerDescription: primary ? [primary.name, primary.role].filter(Boolean).join(" — ") : null,
      venueDescription: venueDescription || null,
      venuePhotoUrl: venuePhotoUrl || null,
      venueMapUrl: venueMapUrl || null,
      campus: campus || null,
      eventType: eventType || null,
      club: club || null,
      keyTakeaways: keyTakeaways || null,
      agenda: agenda || null,
      whoShouldAttend: whoShouldAttend || null,
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

/**
 * Permanently delete a session. The schema cascade-deletes its bookings, attendance grants, and
 * acknowledgment logs — but ticketsUsed is a denormalized counter the cascade can't touch, so we
 * first give each affected student their ticket back, then delete. One transaction keeps the
 * counter and the delete atomic. Use `cancelSession` for a reversible soft-cancel instead.
 */
export async function deleteSession(
  eventId: string,
  sessionId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: ActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { eventId: true } });
  if (!session || session.eventId !== eventId) return { error: "Session not found." };

  await prisma.$transaction(
    async (tx) => {
      // At most one confirmed booking per user per session (unique [userId, sessionId]), so each
      // affected user's ticketsUsed is decremented by exactly one.
      const confirmed = await tx.booking.findMany({
        where: { sessionId, status: "confirmed" },
        select: { userId: true },
      });
      for (const b of confirmed) {
        await tx.eventTicketAllotment.updateMany({
          where: { eventId, userId: b.userId },
          data: { ticketsUsed: { decrement: 1 } },
        });
      }
      await tx.session.delete({ where: { id: sessionId } });
    },
    { timeout: 15000 }
  );

  revalidateEvent(eventId);
  return { success: true };
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

/**
 * Save per-user ticket edits from the allotment table in one submit. Rows arrive as
 * `tickets:<userId>` fields; we group user IDs by their (few) distinct values so the whole
 * roster is written with a handful of bulk statements — never one update per user, which would
 * blow the interactive-transaction budget on a ~400-person roster.
 */
export async function setTicketsBulk(
  eventId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const byValue = new Map<number, string[]>();
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("tickets:")) continue;
    const tickets = Number(raw);
    if (!Number.isInteger(tickets) || tickets < 0) {
      return { error: "Every ticket count must be a whole number of 0 or more." };
    }
    const userId = key.slice("tickets:".length);
    let arr = byValue.get(tickets);
    if (!arr) byValue.set(tickets, (arr = []));
    arr.push(userId);
  }
  if (byValue.size === 0) return { error: "No changes to save." };

  const existing = await prisma.eventTicketAllotment.findMany({
    where: { eventId },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((a) => a.userId));

  let saved = 0;
  for (const [tickets, userIds] of byValue) {
    const toUpdate = userIds.filter((id) => existingIds.has(id));
    const toCreate = userIds.filter((id) => !existingIds.has(id));
    if (toUpdate.length > 0) {
      await prisma.eventTicketAllotment.updateMany({
        where: { eventId, userId: { in: toUpdate } },
        data: { ticketsAllotted: tickets },
      });
    }
    if (toCreate.length > 0) {
      await prisma.eventTicketAllotment.createMany({
        data: toCreate.map((userId) => ({ eventId, userId, ticketsAllotted: tickets })),
      });
    }
    saved += userIds.length;
  }

  revalidateEvent(eventId);
  return { success: true, message: `Saved ticket allotments for ${saved} user(s).` };
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

/**
 * Books every non-admin student in the selected cohort split(s) into one session. Each
 * student runs through the exact same bookSessionForUser() as the single-user override — its
 * own transaction, its own pass/fail — so one student's failure (already booked, no tickets,
 * time conflict, full) never blocks the rest of the group.
 */
export async function manualGroupBookingOverride(
  eventId: string,
  _prevState: GroupBookingActionState,
  formData: FormData
): Promise<GroupBookingActionState> {
  const admin = await requireAdmin();
  const cohortSplits = formData.getAll("cohortSplits").map(String).filter(isCohortSplitValue);
  const sessionId = String(formData.get("sessionId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const bypassTicketCheck = formData.get("bypassTicketCheck") === "on";

  if (cohortSplits.length === 0 || !sessionId || !note) {
    return { error: "At least one group, a session, and a reason note are required." };
  }

  const students = await prisma.user.findMany({
    where: { isAdmin: false, cohortSplit: { in: cohortSplits } },
    orderBy: { name: "asc" },
  });

  // Two phases so a whole cohort books quickly. Phase 1 commits every booking (DB-only, each in
  // its own transaction — one student's failure never blocks the rest, same as the single-user
  // override). Phase 2 sends the acknowledgment emails concurrently AFTER, so N serial provider
  // round-trips don't stack up inside the request.
  const results: GroupBookingResultRow[] = [];
  const bookedIds: string[] = [];
  for (const student of students) {
    try {
      const booking = await prisma.$transaction((tx) =>
        attemptBooking(tx, {
          userId: student.id,
          eventId,
          sessionId,
          bookingType: "self_selected",
          adminOverride: { adminUserId: admin.id!, note, bypassTicketCheck, bypassDeadline: true },
        })
      );
      bookedIds.push(booking.id);
      results.push({ name: student.name, pgpId: student.pgpId, outcome: "Booked" });
    } catch (e) {
      const message = e instanceof BookingError ? e.message : "Unexpected error";
      results.push({ name: student.name, pgpId: student.pgpId, outcome: message });
    }
  }
  const booked = bookedIds.length;

  // sendAcknowledgmentEmail never throws (it logs failures), so allSettled is belt-and-braces.
  await Promise.allSettled(bookedIds.map((id) => sendAcknowledgmentEmail(id)));

  revalidateEvent(eventId);
  return {
    success: true,
    summary: { total: students.length, booked, skipped: students.length - booked },
    results,
  };
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

// --- Reset bookings (admin: undo a run / clear test data) ---

/**
 * Recompute session.bookedCount and allotment.ticketsUsed for an event from the
 * confirmed-booking source of truth. Zeroes everything with two bulk statements, then
 * re-applies counts only for the (few) sessions/users that still have confirmed bookings —
 * so it never does a per-row update across the whole ~400-user roster (which would blow the
 * 5s interactive-transaction timeout).
 */
async function recomputeEventCounters(tx: Prisma.TransactionClient, eventId: string) {
  await tx.session.updateMany({ where: { eventId }, data: { bookedCount: 0 } });
  await tx.eventTicketAllotment.updateMany({ where: { eventId }, data: { ticketsUsed: 0 } });

  const bySession = await tx.booking.groupBy({
    by: ["sessionId"],
    where: { eventId, status: "confirmed" },
    _count: { _all: true },
  });
  for (const row of bySession) {
    await tx.session.update({
      where: { id: row.sessionId },
      data: { bookedCount: row._count._all },
    });
  }

  const byUser = await tx.booking.groupBy({
    by: ["userId"],
    where: { eventId, status: "confirmed" },
    _count: { _all: true },
  });
  for (const row of byUser) {
    await tx.eventTicketAllotment.updateMany({
      where: { eventId, userId: row.userId },
      data: { ticketsUsed: row._count._all },
    });
  }
}

/** Delete every auto-allotted booking for the event and restore capacity/tickets. */
export async function resetAutoAllocations(eventId: string): Promise<ActionState> {
  await requireAdmin();
  const removed = await prisma.$transaction(
    async (tx) => {
      const del = await tx.booking.deleteMany({ where: { eventId, bookingType: "auto_allotted" } });
      await recomputeEventCounters(tx, eventId);
      return del.count;
    },
    { timeout: 20000 }
  );
  revalidateEvent(eventId);
  return {
    success: true,
    message: `Removed ${removed} auto-allocated booking(s). Capacity and unused tickets restored.`,
  };
}

/** Delete ALL bookings for the event (self-selected + auto) and zero every counter. */
export async function resetAllBookings(eventId: string): Promise<ActionState> {
  await requireAdmin();
  const removed = await prisma.$transaction(
    async (tx) => {
      const del = await tx.booking.deleteMany({ where: { eventId } });
      await recomputeEventCounters(tx, eventId);
      return del.count;
    },
    { timeout: 20000 }
  );
  revalidateEvent(eventId);
  return {
    success: true,
    message: `Removed all ${removed} booking(s) for this event. Every ticket is now unused.`,
  };
}

// --- Attendance trackers ---

/** Grants a roster member permission to mark attendance for one session (no admin rights). */
export async function grantAttendanceAccess(
  eventId: string,
  sessionId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Select a person to grant access to." };

  const existing = await prisma.sessionAttendanceGrant.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  if (existing) return { error: "That person already has attendance access for this session." };

  await prisma.sessionAttendanceGrant.create({
    data: { sessionId, userId, grantedById: admin.id! },
  });

  revalidateEvent(eventId);
  return { success: true };
}

export async function revokeAttendanceAccess(eventId: string, grantId: string): Promise<void> {
  await requireAdmin();
  await prisma.sessionAttendanceGrant.delete({ where: { id: grantId } });
  revalidateEvent(eventId);
}
