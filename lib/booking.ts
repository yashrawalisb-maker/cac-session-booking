import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { sessionsOverlap } from "./overlap";
import { sendAcknowledgmentEmail } from "./email";
import { isWibClub } from "./wibTracks";

export type BookingErrorCode =
  | "SESSION_FULL"
  | "NO_TICKETS"
  | "ALREADY_BOOKED"
  | "TIME_CONFLICT"
  | "DEADLINE_PASSED"
  | "SESSION_NOT_OPEN"
  | "NOT_ENTITLED"
  | "TRACK_REQUIRED"
  | "TRACK_FULL";

const MESSAGES: Record<BookingErrorCode, string> = {
  SESSION_FULL: "This session just filled up — please choose another.",
  NO_TICKETS: "You have no tickets remaining for this event.",
  ALREADY_BOOKED: "You've already booked this session.",
  TIME_CONFLICT: "This session overlaps with another session you've already booked.",
  DEADLINE_PASSED: "Booking for this event has closed.",
  SESSION_NOT_OPEN: "This session is not currently open for booking.",
  NOT_ENTITLED: "You don't have a ticket allotment for this event.",
  TRACK_REQUIRED: "Please choose a table track for this session.",
  TRACK_FULL: "That table track just filled up — please choose another.",
};

export class BookingError extends Error {
  code: BookingErrorCode;
  constructor(code: BookingErrorCode) {
    super(MESSAGES[code]);
    this.code = code;
    this.name = "BookingError";
  }
}

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export type AdminOverride = {
  adminUserId: string;
  note: string;
  bypassTicketCheck?: boolean;
  bypassDeadline?: boolean;
};

export type AttemptBookingParams = {
  userId: string;
  eventId: string;
  sessionId: string;
  bookingType: "self_selected" | "auto_allotted";
  // Required when the session is a Women in Business session (its seats live on the tracks, not
  // the session). Ignored for every other session.
  sessionTrackId?: string;
  adminOverride?: AdminOverride;
};

/**
 * The single source of truth for creating a booking, atomically. Used by both the manual
 * self-service booking flow and auto-allocation — never duplicate this logic elsewhere.
 *
 * Must be called inside `prisma.$transaction(tx => attemptBooking(tx, params))`.
 */
export async function attemptBooking(tx: TxClient, params: AttemptBookingParams) {
  const { userId, eventId, sessionId, bookingType, sessionTrackId, adminOverride } = params;

  // Narrow row lock: only serializes this user's attempts on this event (low contention),
  // closing the same-user-two-tabs race on the ticket/overlap checks below.
  await tx.$queryRaw`
    SELECT id FROM "event_ticket_allotments"
    WHERE event_id = ${eventId} AND user_id = ${userId} FOR UPDATE`;

  const [session, allotment, event] = await Promise.all([
    tx.session.findUnique({ where: { id: sessionId } }),
    tx.eventTicketAllotment.findUnique({ where: { eventId_userId: { eventId, userId } } }),
    tx.event.findUnique({ where: { id: eventId } }),
  ]);

  if (!session || !event) throw new BookingError("SESSION_NOT_OPEN");
  if (!allotment) throw new BookingError("NOT_ENTITLED");

  if (session.status !== "open") throw new BookingError("SESSION_NOT_OPEN");

  // Auto-allocation is by definition a post-deadline sweep (PRD §8.4 "Auto-allotment logic
  // (post-deadline)"), so it must not be blocked by the deadline the way self-service booking is.
  const isAutoAllotment = bookingType === "auto_allotted";
  if (
    !adminOverride?.bypassDeadline &&
    !isAutoAllotment &&
    event.bookingDeadline.getTime() < Date.now()
  ) {
    throw new BookingError("DEADLINE_PASSED");
  }

  const alreadyBooked = await tx.booking.findUnique({
    where: { userId_sessionId: { userId, sessionId } },
  });
  if (alreadyBooked && alreadyBooked.status === "confirmed") {
    throw new BookingError("ALREADY_BOOKED");
  }

  if (event.overlapCheckEnabled) {
    const existing = await tx.booking.findMany({
      where: { userId, eventId, status: "confirmed" },
      include: { session: true },
    });
    if (existing.some((b) => sessionsOverlap(b.session, session))) {
      throw new BookingError("TIME_CONFLICT");
    }
  }

  // WIB sessions hold their seats on the chosen track, not the session itself. Resolve + validate
  // the track; every other session ignores it entirely.
  const isWib = isWibClub(session.club);
  let track = null;
  if (isWib) {
    if (!sessionTrackId) throw new BookingError("TRACK_REQUIRED");
    track = await tx.sessionTrack.findUnique({ where: { id: sessionTrackId } });
    if (!track || track.sessionId !== sessionId) throw new BookingError("TRACK_REQUIRED");
  }

  // High-contention path: Postgres serializes concurrent writers to the same row, so this
  // conditional update is race-safe without raw locking or SERIALIZABLE isolation.
  if (isWib && track) {
    const trackClaim = await tx.sessionTrack.updateMany({
      where: { id: track.id, bookedCount: { lt: track.capacity } },
      data: { bookedCount: { increment: 1 } },
    });
    if (trackClaim.count === 0) throw new BookingError("TRACK_FULL");
    // Keep the session's aggregate count in sync for display; the track is the real gate.
    await tx.session.update({ where: { id: sessionId }, data: { bookedCount: { increment: 1 } } });
  } else {
    const capacityClaim = await tx.session.updateMany({
      where: { id: sessionId, status: "open", bookedCount: { lt: session.capacity } },
      data: { bookedCount: { increment: 1 } },
    });
    if (capacityClaim.count === 0) throw new BookingError("SESSION_FULL");
  }

  // Undo the seat(s) claimed just above — same transaction, still atomic.
  const rollbackSeat = async () => {
    if (isWib && track) {
      await tx.sessionTrack.update({ where: { id: track.id }, data: { bookedCount: { decrement: 1 } } });
    }
    await tx.session.update({ where: { id: sessionId }, data: { bookedCount: { decrement: 1 } } });
  };

  if (adminOverride?.bypassTicketCheck) {
    await tx.eventTicketAllotment.update({
      where: { id: allotment.id },
      data: { ticketsUsed: { increment: 1 } },
    });
  } else {
    const ticketClaim = await tx.eventTicketAllotment.updateMany({
      where: { id: allotment.id, ticketsUsed: { lt: allotment.ticketsAllotted } },
      data: { ticketsUsed: { increment: 1 } },
    });
    if (ticketClaim.count === 0) {
      await rollbackSeat();
      throw new BookingError("NO_TICKETS");
    }
  }

  try {
    const booking = await tx.booking.create({
      data: {
        userId,
        eventId,
        sessionId,
        sessionTrackId: track?.id ?? null,
        bookingType,
        status: "confirmed",
        adminNote: adminOverride?.note,
        overriddenBy: adminOverride?.adminUserId,
        overriddenAt: adminOverride ? new Date() : undefined,
      },
    });
    return booking;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new BookingError("ALREADY_BOOKED");
    }
    throw e;
  }
}

/** Wraps attemptBooking in its own transaction and sends the acknowledgment email after commit. */
export async function bookSessionForUser(
  prisma: PrismaClient,
  params: AttemptBookingParams
) {
  const booking = await prisma.$transaction((tx) => attemptBooking(tx, params));
  await sendAcknowledgmentEmail(booking.id);
  return booking;
}

/** Admin-only: cancel a confirmed booking, freeing capacity/ticket, with an audit note. */
export async function cancelBooking(
  prisma: PrismaClient,
  params: { bookingId: string; adminUserId: string; note: string }
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: params.bookingId } });
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "confirmed") return booking;

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "cancelled_by_admin",
        adminNote: params.note,
        overriddenBy: params.adminUserId,
        overriddenAt: new Date(),
      },
    });

    await tx.session.update({
      where: { id: booking.sessionId },
      data: { bookedCount: { decrement: 1 } },
    });

    // Free the WIB track seat too, if this booking was for one.
    if (booking.sessionTrackId) {
      await tx.sessionTrack.update({
        where: { id: booking.sessionTrackId },
        data: { bookedCount: { decrement: 1 } },
      });
    }

    const allotment = await tx.eventTicketAllotment.findUnique({
      where: { eventId_userId: { eventId: booking.eventId, userId: booking.userId } },
    });
    if (allotment) {
      await tx.eventTicketAllotment.update({
        where: { id: allotment.id },
        data: { ticketsUsed: { decrement: 1 } },
      });
    }

    return updated;
  });
}
