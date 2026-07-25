"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { canMarkAttendance } from "@/lib/attendance";

export async function markAttendance(
  sessionId: string,
  bookingId: string,
  attended: boolean
): Promise<{ error?: string }> {
  const user = await requireUser();

  const allowed = await canMarkAttendance(user.id!, sessionId, !!user.isAdmin);
  if (!allowed) return { error: "You don't have attendance access for this session." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.sessionId !== sessionId || booking.status !== "confirmed") {
    return { error: "Booking not found." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { attended, attendanceMarkedBy: user.id!, attendanceMarkedAt: new Date() },
  });

  revalidatePath(`/attendance/${sessionId}`);
  return {};
}
