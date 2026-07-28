"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { bookSessionForUser, BookingError } from "@/lib/booking";

export type BookActionState = { error?: string; success?: boolean } | undefined;

export async function bookSessionAction(
  eventId: string,
  sessionId: string,
  // useActionState requires this exact (prevState, formData) trailing signature after binding.
  _prevState: BookActionState,
  formData: FormData
): Promise<BookActionState> {
  const user = await requireUser();

  // Only WIB sessions send a track; the booking engine ignores it for every other session.
  const sessionTrackId = String(formData.get("sessionTrackId") ?? "") || undefined;

  try {
    await bookSessionForUser(prisma, {
      userId: user.id!,
      eventId,
      sessionId,
      bookingType: "self_selected",
      sessionTrackId,
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/sessions/${sessionId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
