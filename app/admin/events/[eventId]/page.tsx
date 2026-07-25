import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventDetailsForm } from "@/components/admin/event-details-form";
import { SessionsPanel } from "@/components/admin/sessions-panel";
import { TicketsPanel } from "@/components/admin/tickets-panel";
import { BookingsPanel } from "@/components/admin/bookings-panel";
import { AutoAllocateButton } from "@/components/admin/auto-allocate-button";
import { BookingResetPanel } from "@/components/admin/booking-reset-panel";
import { DeleteEventPanel } from "@/components/admin/delete-event-panel";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();

  const [sessions, allotments, bookings, allUsers, attendanceGrants] = await Promise.all([
    prisma.session.findMany({ where: { eventId }, orderBy: { startsAt: "asc" } }),
    prisma.eventTicketAllotment.findMany({ where: { eventId }, include: { user: true } }),
    prisma.booking.findMany({
      where: { eventId },
      include: { user: true, session: true },
      orderBy: { bookedAt: "desc" },
    }),
    prisma.user.findMany({ where: { isAdmin: false }, orderBy: { name: "asc" } }),
    prisma.sessionAttendanceGrant.findMany({
      where: { session: { eventId } },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const attendanceGrantsBySession: Record<
    string,
    { id: string; userId: string; name: string; isbEmail: string }[]
  > = {};
  for (const g of attendanceGrants) {
    (attendanceGrantsBySession[g.sessionId] ??= []).push({
      id: g.id,
      userId: g.userId,
      name: g.user.name,
      isbEmail: g.user.isbEmail,
    });
  }

  const allotmentByUser = new Map(allotments.map((a) => [a.userId, a]));
  const ticketRows = allUsers.map((u) => {
    const a = allotmentByUser.get(u.id);
    return {
      userId: u.id,
      name: u.name,
      isbEmail: u.isbEmail,
      ticketsAllotted: a?.ticketsAllotted ?? 0,
      ticketsUsed: a?.ticketsUsed ?? 0,
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">{event.name}</h1>
        <EventDetailsForm
          eventId={event.id}
          defaults={{
            name: event.name,
            description: event.description ?? "",
            startDate: event.startDate,
            endDate: event.endDate,
            bookingDeadline: event.bookingDeadline,
            status: event.status,
            overlapCheckEnabled: event.overlapCheckEnabled,
          }}
        />
      </div>

      <SessionsPanel
        eventId={event.id}
        sessions={sessions}
        attendanceGrantsBySession={attendanceGrantsBySession}
        allUsers={allUsers.map((u) => ({ id: u.id, name: u.name, isbEmail: u.isbEmail }))}
      />

      <TicketsPanel eventId={event.id} rows={ticketRows} />

      <BookingsPanel
        eventId={event.id}
        bookings={bookings.map((b) => ({
          id: b.id,
          userName: b.user.name,
          sessionTitle: b.session.title,
          bookingType: b.bookingType,
          status: b.status,
          bookedAt: b.bookedAt,
          adminNote: b.adminNote,
        }))}
        users={allUsers.map((u) => ({ id: u.id, name: u.name, isbEmail: u.isbEmail }))}
        sessions={sessions.map((s) => ({ id: s.id, title: s.title, dayLabel: s.dayLabel }))}
      />

      <AutoAllocateButton eventId={event.id} />

      <BookingResetPanel eventId={event.id} />

      <DeleteEventPanel eventId={event.id} eventName={event.name} />
    </div>
  );
}
