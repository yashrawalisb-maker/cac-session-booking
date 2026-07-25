import Link from "next/link";
import { CalendarDays, ArrowRight, Ticket } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isPast, now, greetingForIST } from "@/lib/time";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { hasAttendanceAccess } from "@/lib/attendance";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const UPCOMING_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = (user.name ?? "there").trim().split(/\s+/)[0];

  const [allotments, upcoming, unreadUpdates, showAttendanceTab] = await Promise.all([
    prisma.eventTicketAllotment.findMany({
      where: { userId: user.id!, event: { status: "published" } },
      include: { event: true },
      orderBy: { event: { startDate: "asc" } },
    }),
    prisma.booking.findFirst({
      where: {
        userId: user.id!,
        status: "confirmed",
        session: { startsAt: { gte: now() } },
      },
      include: { session: true, event: true },
      orderBy: { session: { startsAt: "asc" } },
    }),
    hasUnreadAnnouncements(user.id!),
    hasAttendanceAccess(user.id!),
  ]);

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
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greetingForIST()}, {firstName}! <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your sessions.
          </p>
        </div>

        {upcoming && (
          <Card className="overflow-hidden border-none bg-primary text-primary-foreground">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
                  Upcoming session
                </span>
                <span className="text-lg font-semibold">{upcoming.session.title}</span>
                <span className="text-sm text-primary-foreground/80">
                  {UPCOMING_FORMATTER.format(upcoming.session.startsAt)} IST · {upcoming.session.venueName}
                </span>
              </div>
              <Button
                variant="secondary"
                render={<Link href={`/events/${upcoming.eventId}`} />}
                className="shrink-0"
              >
                View event
              </Button>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Your events</h2>
          {allotments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                You don&apos;t have a ticket allotment for any published event yet. Contact CAC if
                you believe this is a mistake.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {allotments.map((a) => {
                const deadlinePassed = isPast(a.event.bookingDeadline);
                const remaining = a.ticketsAllotted - a.ticketsUsed;
                return (
                  <Card key={a.id} className="flex h-full flex-col">
                    <CardContent className="flex flex-1 flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold tracking-tight">{a.event.name}</h3>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <CalendarDays className="size-4" />
                            {DATE_FORMATTER.format(a.event.startDate)} – {DATE_FORMATTER.format(a.event.endDate)}
                          </p>
                        </div>
                        {deadlinePassed ? (
                          <Badge variant="secondary">Closed</Badge>
                        ) : (
                          <Badge className="bg-success-bg text-success">Open</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Ticket className="size-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{remaining}</span>
                        <span className="text-muted-foreground">
                          of {a.ticketsAllotted} ticket{a.ticketsAllotted === 1 ? "" : "s"} remaining
                        </span>
                      </div>

                      <Button
                        variant={deadlinePassed ? "outline" : "default"}
                        render={<Link href={`/events/${a.event.id}`} />}
                        className="mt-auto w-full"
                      >
                        {deadlinePassed ? "View sessions" : "Book a session"}
                        <ArrowRight className="size-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
