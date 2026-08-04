"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { attemptBooking, BookingError } from "@/lib/booking";
import { sendAcknowledgmentEmail } from "@/lib/email";

export type ConfirmCartState =
  | { error?: string; failedSessionId?: string; success?: boolean; booked?: number }
  | undefined;

/**
 * Commit a whole cart of tentative picks at once, all-or-nothing. Every pick books inside a single
 * transaction via the same atomic `attemptBooking` used everywhere else — if any one fails (full,
 * ticket limit, time clash, already booked), the transaction rolls back and NOTHING is booked, so
 * the student can fix that pick and retry. Overlap between two picks is caught automatically because
 * earlier bookings in the transaction are visible to a later pick's overlap check.
 */
export async function confirmBookings(
  eventId: string,
  items: { sessionId: string; sessionTrackId?: string }[]
): Promise<ConfirmCartState> {
  const user = await requireUser();
  if (items.length === 0) return { error: "Your plan is empty — add a session first." };

  const createdIds: string[] = [];
  let failedSessionId: string | undefined;
  try {
    await prisma.$transaction(
      async (tx) => {
        for (const item of items) {
          try {
            const booking = await attemptBooking(tx, {
              userId: user.id!,
              eventId,
              sessionId: item.sessionId,
              bookingType: "self_selected",
              sessionTrackId: item.sessionTrackId,
            });
            createdIds.push(booking.id);
          } catch (e) {
            failedSessionId = item.sessionId; // remember which pick broke, then abort the whole batch
            throw e;
          }
        }
      },
      { timeout: 15000 }
    );
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message, failedSessionId };
    throw e;
  }

  // Acknowledgment emails fanned out after commit (never awaited inside the transaction).
  await Promise.allSettled(createdIds.map((id) => sendAcknowledgmentEmail(id)));

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-bookings");
  return { success: true, booked: createdIds.length };
}
