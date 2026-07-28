import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Ticket } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isPast } from "@/lib/time";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { hasAttendanceAccess } from "@/lib/attendance";
import { AppShell } from "@/components/app-shell";
import { SessionListFiltered, type FilterableSession } from "@/components/session-list-filtered";
import { computeSessionStatus } from "@/lib/sessionStatus";
import { effectiveSpeakers, speakersLabel } from "@/lib/speakers";

const TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "2-digit",
  month: "short",
});
const DEADLINE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const user = await requireUser();

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "published") notFound();

  const allotment = await prisma.eventTicketAllotment.findUnique({
    where: { eventId_userId: { eventId, userId: user.id! } },
  });
  if (!allotment) notFound();

  const [sessions, bookings, unreadUpdates, showAttendanceTab] = await Promise.all([
    prisma.session.findMany({ where: { eventId }, orderBy: { startsAt: "asc" } }),
    prisma.booking.findMany({
      where: { userId: user.id!, eventId, status: "confirmed" },
      select: { sessionId: true, bookingType: true },
    }),
    hasUnreadAnnouncements(user.id!),
    hasAttendanceAccess(user.id!),
  ]);

  const bookingBySession = new Map(bookings.map((b) => [b.sessionId, b.bookingType]));
  const deadlinePassed = isPast(event.bookingDeadline);
  const ticketsRemaining = allotment.ticketsAllotted - allotment.ticketsUsed;

  const filterableSessions: FilterableSession[] = sessions.map((s) => {
    const bookingType = bookingBySession.get(s.id);
    const seatsRemaining = Math.max(s.capacity - s.bookedCount, 0);
    return {
      sessionId: s.id,
      title: s.title,
      description: s.description,
      dayLabel: s.dayLabel,
      timeLabel: `${DATE_FORMATTER.format(s.startsAt)}, ${TIME_FORMATTER.format(s.startsAt)} – ${TIME_FORMATTER.format(s.endsAt)}`,
      venueName: s.venueName,
      venueLocation: s.venueLocation,
      speaker: speakersLabel(effectiveSpeakers(s)),
      club: s.club,
      seatsRemaining,
      capacity: s.capacity,
      status: computeSessionStatus({
        bookingType,
        seatsRemaining,
        sessionStatus: s.status,
        ticketsRemaining,
        deadlinePassed,
      }),
    };
  });

  return (
    <AppShell
      variant="student"
      userName={user.name ?? user.email ?? ""}
      userSubtitle={user.email ?? undefined}
      unreadUpdates={unreadUpdates}
      showAttendanceTab={showAttendanceTab}
    >
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{event.name}</h1>
          {event.description && (
            <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <CalendarClock className="size-4 text-primary/70" />
              <span className={deadlinePassed ? "text-danger" : "text-foreground"}>
                {deadlinePassed ? "Booking closed" : "Deadline"}: {DEADLINE_FORMATTER.format(event.bookingDeadline)} IST
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <Ticket className="size-4 text-primary/70" />
              <span>
                <span className="font-semibold text-foreground">{ticketsRemaining}</span> of{" "}
                {allotment.ticketsAllotted} tickets remaining
              </span>
            </div>
          </div>
        </div>

        <SessionListFiltered eventId={event.id} sessions={filterableSessions} />
      </div>
    </AppShell>
  );
}
