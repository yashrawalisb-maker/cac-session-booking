"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string; success?: boolean } | undefined;

function revalidateAnnouncements() {
  revalidatePath("/admin/announcements");
  revalidatePath("/updates");
}

function parseAnnouncementForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim();

  if (!title || !body) {
    return { error: "Title and message are required." } as const;
  }
  return { data: { title, body, eventId: eventId || null } } as const;
}

export async function createAnnouncement(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parseAnnouncementForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  if (parsed.data.eventId) {
    const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
    if (!event) return { error: "Selected event no longer exists." };
  }

  await prisma.announcement.create({ data: { ...parsed.data, createdById: admin.id! } });
  revalidateAnnouncements();
  return { success: true };
}

export async function updateAnnouncement(
  announcementId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseAnnouncementForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  if (parsed.data.eventId) {
    const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
    if (!event) return { error: "Selected event no longer exists." };
  }

  await prisma.announcement.update({ where: { id: announcementId }, data: parsed.data });
  revalidateAnnouncements();
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  await requireAdmin();
  await prisma.announcement.delete({ where: { id: announcementId } });
  revalidateAnnouncements();
}
