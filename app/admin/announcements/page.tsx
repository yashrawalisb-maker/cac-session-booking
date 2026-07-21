import { prisma } from "@/lib/prisma";
import { AnnouncementsPanel } from "@/components/admin/announcements-panel";

export default async function AdminAnnouncementsPage() {
  const [announcements, events] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: { event: { select: { name: true } } },
    }),
    prisma.event.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
  ]);

  return (
    <AnnouncementsPanel
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        eventId: a.eventId,
        eventName: a.event?.name ?? null,
        createdAt: a.createdAt,
      }))}
      events={events}
    />
  );
}
