import { PrismaClient } from "@/generated/prisma/client";
import { attemptBooking, BookingError } from "./booking";
import { sendAcknowledgmentEmail } from "./email";
import { isWibClub } from "./wibTracks";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type AutoAllocationSummary = {
  usersProcessed: number;
  bookingsCreated: number;
  usersFullyAllotted: number;
  usersPartiallyAllotted: { userId: string; name: string; stillUnused: number }[];
};

/**
 * Runs auto-allocation for every user with unused tickets on this event, **round-robin** so scarce
 * seats are shared fairly: each round gives every still-eligible user at most one new booking, and
 * the user order is reshuffled every round. This avoids the old greedy behaviour where the
 * first-processed users could take all of their tickets while users processed later got none.
 *
 * Idempotent and safe to re-run: already-fulfilled users are skipped, and the same
 * ticket/capacity checks that guard manual booking prevent any double-booking. Each candidate
 * attempt is its own small transaction so a mid-run failure never loses completed bookings.
 */
export async function runAutoAllocation(prisma: PrismaClient, eventId: string): Promise<AutoAllocationSummary> {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });

  // Prisma's query API can't compare two columns of the same row (ticketsUsed < ticketsAllotted),
  // so fetch this event's allotments and filter in app code.
  const allAllotments = await prisma.eventTicketAllotment.findMany({
    where: { eventId },
    include: { user: true },
  });
  const allotments = allAllotments.filter((a) => a.ticketsUsed < a.ticketsAllotted);

  const summary: AutoAllocationSummary = {
    usersProcessed: allotments.length,
    bookingsCreated: 0,
    usersFullyAllotted: 0,
    usersPartiallyAllotted: [],
  };
  if (allotments.length === 0) {
    void event;
    return summary;
  }

  // Tickets still owed to each user, decremented as they're placed.
  const remaining = new Map(allotments.map((a) => [a.userId, a.ticketsAllotted - a.ticketsUsed]));
  const maxTicketsAllotted = Math.max(...allotments.map((a) => a.ticketsAllotted));
  // Defensive cap; the zero-progress break below bounds rounds to maxTicketsAllotted + 1 in practice.
  const MAX_ROUNDS = maxTicketsAllotted + 5;

  // Acknowledgment emails are fanned out AFTER all rounds commit (see below), never awaited one at
  // a time inside the loop — otherwise a full-roster run stacks up hundreds of serial sends.
  const createdBookingIds: string[] = [];

  let round = 0;
  while ([...remaining.values()].some((r) => r > 0) && round < MAX_ROUNDS) {
    round++;
    const pendingUserIds = shuffle(
      [...remaining.entries()].filter(([, r]) => r > 0).map(([id]) => id)
    );
    let bookingsThisRound = 0;

    for (const userId of pendingUserIds) {
      const allOpenSessions = await prisma.session.findMany({ where: { eventId, status: "open" } });
      // Skip WIB sessions — auto-allocation can't choose a table track on the student's behalf.
      const openSessions = allOpenSessions.filter(
        (s) => s.bookedCount < s.capacity && !isWibClub(s.club)
      );
      const alreadyBooked = await prisma.booking.findMany({
        where: { userId, eventId, status: "confirmed" },
        select: { sessionId: true },
      });
      const bookedIds = new Set(alreadyBooked.map((b) => b.sessionId));
      const candidates = shuffle(openSessions.filter((s) => !bookedIds.has(s.id)));

      for (const session of candidates) {
        try {
          const booking = await prisma.$transaction((tx) =>
            attemptBooking(tx, { userId, eventId, sessionId: session.id, bookingType: "auto_allotted" })
          );
          remaining.set(userId, remaining.get(userId)! - 1);
          summary.bookingsCreated++;
          bookingsThisRound++;
          createdBookingIds.push(booking.id);
          break; // this user gets at most one new ticket per round
        } catch (e) {
          if (e instanceof BookingError) continue; // filled/conflicted since candidates were built
          throw e;
        }
      }
    }

    // No booking placed anywhere this round => capacity exhausted; more rounds would repeat identically.
    if (bookingsThisRound === 0) break;
  }

  // sendAcknowledgmentEmail never throws (it logs failures), so allSettled is belt-and-braces.
  await Promise.allSettled(createdBookingIds.map((id) => sendAcknowledgmentEmail(id)));

  for (const a of allotments) {
    const r = remaining.get(a.userId)!;
    if (r <= 0) {
      summary.usersFullyAllotted++;
    } else {
      summary.usersPartiallyAllotted.push({ userId: a.userId, name: a.user.name, stillUnused: r });
    }
  }

  void event; // referenced for the findUniqueOrThrow existence check above
  return summary;
}
