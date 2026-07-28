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
 * Runs auto-allocation for every user with unused tickets on this event. Idempotent and safe
 * to re-run: already-fulfilled users are simply skipped by the same ticket/capacity checks
 * that guard manual booking. Each candidate attempt is its own small transaction so a
 * mid-run failure never loses already-completed bookings.
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
    usersProcessed: 0,
    bookingsCreated: 0,
    usersFullyAllotted: 0,
    usersPartiallyAllotted: [],
  };

  // Acknowledgment emails are fanned out AFTER all bookings commit (see below), not awaited one
  // at a time inside the loop — otherwise a full-roster run stacks up hundreds of serial sends.
  const createdBookingIds: string[] = [];

  for (const allotment of allotments) {
    const remaining = allotment.ticketsAllotted - allotment.ticketsUsed;
    if (remaining <= 0) continue;
    summary.usersProcessed++;

    const allOpenSessions = await prisma.session.findMany({ where: { eventId, status: "open" } });
    // Skip WIB sessions — auto-allocation can't choose a table track on the student's behalf.
    const openSessions = allOpenSessions.filter(
      (s) => s.bookedCount < s.capacity && !isWibClub(s.club)
    );
    const alreadyBooked = await prisma.booking.findMany({
      where: { userId: allotment.userId, eventId, status: "confirmed" },
      select: { sessionId: true },
    });
    const bookedIds = new Set(alreadyBooked.map((b) => b.sessionId));
    const candidates = shuffle(openSessions.filter((s) => !bookedIds.has(s.id)));

    let booked = 0;
    for (const session of candidates) {
      if (booked >= remaining) break;
      try {
        const booking = await prisma.$transaction((tx) =>
          attemptBooking(tx, {
            userId: allotment.userId,
            eventId,
            sessionId: session.id,
            bookingType: "auto_allotted",
          })
        );
        booked++;
        summary.bookingsCreated++;
        createdBookingIds.push(booking.id);
      } catch (e) {
        if (e instanceof BookingError) continue; // filled/conflicted since candidate list was built
        throw e;
      }
    }

    if (booked >= remaining) {
      summary.usersFullyAllotted++;
    } else {
      summary.usersPartiallyAllotted.push({
        userId: allotment.userId,
        name: allotment.user.name,
        stillUnused: remaining - booked,
      });
    }
  }

  // sendAcknowledgmentEmail never throws (it logs failures), so allSettled is belt-and-braces.
  await Promise.allSettled(createdBookingIds.map((id) => sendAcknowledgmentEmail(id)));

  void event; // referenced for the findUniqueOrThrow existence check above
  return summary;
}
