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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: BookActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData
): Promise<BookActionState> {
  const user = await requireUser();

  try {
    await bookSessionForUser(prisma, {
      userId: user.id!,
      eventId,
      sessionId,
      bookingType: "self_selected",
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
