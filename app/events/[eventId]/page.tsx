import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isPast } from "@/lib/time";
import { SiteHeader } from "@/components/site-header";
import { SessionCard, type SessionCardStatus } from "@/components/session-card";
import { Badge } from "@/components/ui/badge";

const TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
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
  hour: "2-digit",
  minute: "2-digit",
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

  const [sessions, bookings] = await Promise.all([
    prisma.session.findMany({ where: { eventId }, orderBy: { startsAt: "asc" } }),
    prisma.booking.findMany({
      where: { userId: user.id!, eventId, status: "confirmed" },
      select: { sessionId: true, bookingType: true },
    }),
  ]);

  const bookingBySession = new Map(bookings.map((b) => [b.sessionId, b.bookingType]));
  const deadlinePassed = isPast(event.bookingDeadline);
  const ticketsRemaining = allotment.ticketsAllotted - allotment.ticketsUsed;

  const dayLabels = Array.from(new Set(sessions.map((s) => s.dayLabel)));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader userName={user.name ?? user.email ?? ""} isAdmin={!!user.isAdmin} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          {event.description && (
            <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={deadlinePassed ? "secondary" : "outline"}>
              {deadlinePassed ? "Booking deadline passed" : "Deadline"}:{" "}
              {DEADLINE_FORMATTER.format(event.bookingDeadline)} IST
            </Badge>
            <Badge variant="outline">
              {ticketsRemaining} of {allotment.ticketsAllotted} tickets remaining
            </Badge>
          </div>
        </div>

        {dayLabels.map((day) => (
          <section key={day} className="mb-8">
            <h2 className="mb-3 text-lg font-medium">{day}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {sessions
                .filter((s) => s.dayLabel === day)
                .map((s) => {
                  const bookingType = bookingBySession.get(s.id);
                  const seatsRemaining = Math.max(s.capacity - s.bookedCount, 0);

                  let status: SessionCardStatus;
                  if (bookingType === "auto_allotted") status = "booked_auto";
                  else if (bookingType) status = "booked";
                  else if (seatsRemaining <= 0 || s.status !== "open") status = "full";
                  else if (ticketsRemaining <= 0) status = "no_tickets";
                  else if (deadlinePassed) status = "deadline_passed";
                  else status = "bookable";

                  return (
                    <SessionCard
                      key={s.id}
                      eventId={event.id}
                      sessionId={s.id}
                      title={s.title}
                      description={s.description}
                      timeLabel={`${DATE_FORMATTER.format(s.startsAt)}, ${TIME_FORMATTER.format(s.startsAt)}–${TIME_FORMATTER.format(s.endsAt)} IST`}
                      venueName={s.venueName}
                      venueLocation={s.venueLocation}
                      speaker={s.speakerDescription}
                      seatsRemaining={seatsRemaining}
                      capacity={s.capacity}
                      status={status}
                    />
                  );
                })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
