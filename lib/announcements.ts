import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Visibility rule: an announcement is visible to a student when it's global
 * (no event tag) or tagged to a published event they hold a ticket allotment for.
 */
export function visibleAnnouncementsWhere(userId: string): Prisma.AnnouncementWhereInput {
  return {
    OR: [
      { eventId: null },
      { event: { status: "published", ticketAllotments: { some: { userId } } } },
    ],
  };
}

/** Whether anything visible was posted after the user's last visit to /updates. */
export async function hasUnreadAnnouncements(userId: string): Promise<boolean> {
  const [user, latest] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { announcementsSeenAt: true } }),
    prisma.announcement.findFirst({
      where: visibleAnnouncementsWhere(userId),
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  if (!latest) return false;
  if (!user?.announcementsSeenAt) return true;
  return latest.createdAt > user.announcementsSeenAt;
}
