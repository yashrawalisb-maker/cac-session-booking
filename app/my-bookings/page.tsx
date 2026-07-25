import Link from "next/link";
import { Clock, MapPin, CalendarX2 } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isPast } from "@/lib/time";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { hasAttendanceAccess } from "@/lib/attendance";
import { AddToCalendarLink } from "@/components/add-to-calendar-link";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAY_FORMATTER = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit" });
const MON_FORMATTER = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" });
const TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

type BookingWithRefs = Awaited<ReturnType<typeof loadBookings>>[number];

async function loadBookings(userId: string) {
  return prisma.booking.findMany({
    where: { userId, status: { in: ["confirmed", "cancelled_by_admin"] } },
    include: { session: true, event: true },
    orderBy: { session: { startsAt: "asc" } },
  });
}

function BookingRow({ booking }: { booking: BookingWithRefs }) {
  const { session, event } = booking;
  const cancelled = booking.status === "cancelled_by_admin";
  const auto = booking.bookingType === "auto_allotted";

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div
          className={cn(
            "flex size-14 shrink-0 flex-col items-center justify-center rounded-lg",
            cancelled ? "bg-muted text-muted-foreground" : "bg-brand-navy-tint text-primary"
          )}
        >
          <span className="text-lg font-bold leading-none">{DAY_FORMATTER.format(session.startsAt)}</span>
          <span className="text-xs uppercase">{MON_FORMATTER.format(session.startsAt)}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold tracking-tight">{session.title}</span>
            {cancelled ? (
              <span className="rounded-full bg-danger-bg px-2 py-0.5 text-xs font-medium text-danger">
                Cancelled
              </span>
            ) : auto ? (
              <span className="rounded-full bg-brand-navy-tint px-2 py-0.5 text-xs font-medium text-primary">
                Auto-assigned
              </span>
            ) : (
              <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                Confirmed
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{event.name}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {TIME_FORMATTER.format(session.startsAt)} – {TIME_FORMATTER.format(session.endsAt)} IST
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {session.venueName}
              {session.venueLocation ? `, ${session.venueLocation}` : ""}
            </span>
          </div>
          {!cancelled && (
            <AddToCalendarLink
              eventId={event.id}
              sessionId={session.id}
              className="mt-2"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function MyBookingsPage() {
  const user = await requireUser();
  const [bookings, unreadUpdates, showAttendanceTab] = await Promise.all([
    loadBookings(user.id!),
    hasUnreadAnnouncements(user.id!),
    hasAttendanceAccess(user.id!),
  ]);

  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && !isPast(b.session.startsAt)
  );
  const past = bookings.filter(
    (b) => b.status === "confirmed" && isPast(b.session.startsAt)
  );
  const cancelled = bookings.filter((b) => b.status === "cancelled_by_admin");

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
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your confirmed sessions. Bookings are final — contact CAC for any changes.
          </p>
        </div>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <CalendarX2 className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You haven&apos;t booked any sessions yet.
              </p>
              <Button render={<Link href="/dashboard" />}>Browse events</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold tracking-tight">Upcoming</h2>
                <div className="flex flex-col gap-3">
                  {upcoming.map((b) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold tracking-tight">Past</h2>
                <div className="flex flex-col gap-3">
                  {past.map((b) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </div>
              </section>
            )}

            {cancelled.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold tracking-tight">Cancelled</h2>
                <div className="flex flex-col gap-3">
                  {cancelled.map((b) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
