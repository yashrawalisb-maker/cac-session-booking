"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string; success?: boolean } | undefined;

export async function createEvent(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const bookingDeadline = String(formData.get("bookingDeadline") ?? "");
  const status = String(formData.get("status") ?? "draft");

  if (!name || !startDate || !endDate || !bookingDeadline) {
    return { error: "Name, start date, end date, and booking deadline are required." };
  }

  await prisma.event.create({
    data: {
      name,
      description: description || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      bookingDeadline: new Date(bookingDeadline),
      status: status as "draft" | "published" | "closed",
      overlapCheckEnabled: true,
      createdById: admin.id!,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}
