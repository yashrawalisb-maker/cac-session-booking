/**
 * Fires many simultaneous booking attempts at the same low-capacity session and verifies
 * exactly `capacity - alreadyBooked` succeed and the rest are cleanly rejected as SESSION_FULL,
 * with the session's bookedCount never exceeding its capacity.
 *
 * Usage: npx tsx scripts/concurrency-test.ts ["Event Name"]
 * Defaults to the seeded "OCC" event and its lowest-capacity open session.
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { bookSessionForUser, BookingError } from "../lib/booking";

async function main() {
  const eventName = process.argv[2] ?? "OCC";
  const event = await prisma.event.findFirst({ where: { name: eventName } });
  if (!event) throw new Error(`Event "${eventName}" not found. Run the seed script first.`);

  const session = await prisma.session.findFirst({
    where: { eventId: event.id, status: "open" },
    orderBy: { capacity: "asc" },
  });
  if (!session) throw new Error("No open session found for this event.");

  const seatsRemaining = session.capacity - session.bookedCount;
  if (seatsRemaining <= 0) {
    console.log(
      `Session "${session.title}" is already full (${session.bookedCount}/${session.capacity}). Reseed to reset, or point this at a different event.`
    );
    process.exit(0);
  }

  const existingBookings = await prisma.booking.findMany({
    where: { sessionId: session.id, status: "confirmed" },
    select: { userId: true },
  });
  const alreadyBookedIds = new Set(existingBookings.map((b) => b.userId));

  const allotments = await prisma.eventTicketAllotment.findMany({
    where: { eventId: event.id },
  });
  const eligible = allotments.filter(
    (a) => a.ticketsUsed < a.ticketsAllotted && !alreadyBookedIds.has(a.userId)
  );

  const wanted = seatsRemaining + 5; // overshoot on purpose to prove the excess gets rejected
  const chosen = eligible.slice(0, wanted);

  if (chosen.length < seatsRemaining + 1) {
    console.warn(
      `Only ${eligible.length} eligible user(s) available (wanted ${wanted}); result may not prove the overbooking case. Reseed for a clean run.`
    );
  }

  console.log(
    `Firing ${chosen.length} concurrent booking attempts at "${session.title}" (${seatsRemaining} seat(s) remaining of ${session.capacity})...`
  );

  const results = await Promise.allSettled(
    chosen.map((a) =>
      bookSessionForUser(prisma, {
        userId: a.userId,
        eventId: event.id,
        sessionId: session.id,
        bookingType: "self_selected",
      })
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const rejectedFull = results.filter(
    (r) => r.status === "rejected" && r.reason instanceof BookingError && r.reason.code === "SESSION_FULL"
  ).length;
  const rejectedOther = results.filter(
    (r) => r.status === "rejected" && !(r.reason instanceof BookingError && r.reason.code === "SESSION_FULL")
  );

  const expectedSucceed = Math.min(seatsRemaining, chosen.length);

  console.log(`Succeeded: ${succeeded} (expected ${expectedSucceed})`);
  console.log(`Rejected as SESSION_FULL: ${rejectedFull}`);
  if (rejectedOther.length > 0) {
    console.log(`Rejected for other reasons: ${rejectedOther.length}`);
    for (const r of rejectedOther) {
      if (r.status === "rejected") console.log("  -", r.reason instanceof Error ? r.reason.message : r.reason);
    }
  }

  const finalSession = await prisma.session.findUniqueOrThrow({ where: { id: session.id } });
  const capacityHeld = finalSession.bookedCount <= finalSession.capacity;
  const countMatches = succeeded === expectedSucceed;
  const ok = capacityHeld && countMatches;

  console.log(
    `Final: bookedCount=${finalSession.bookedCount} capacity=${finalSession.capacity} — ${
      capacityHeld ? "capacity held" : "CAPACITY EXCEEDED"
    }`
  );
  console.log(ok ? "PASS" : "FAIL");

  process.exit(ok ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
