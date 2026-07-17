import Link from "next/link";
import { CalendarDays, LayoutList, Ticket, Users, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewEventDialog } from "@/components/admin/new-event-dialog";
import { StatTile } from "@/components/admin/stat-tile";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function AdminDashboardPage() {
  const [events, sessionCount, bookingCount, studentCount] = await Promise.all([
    prisma.event.findMany({ orderBy: { startDate: "desc" } }),
    prisma.session.count(),
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.user.count({ where: { isAdmin: false } }),
  ]);

  const fillStats = await Promise.all(
    events.map((e) =>
      prisma.eventTicketAllotment.aggregate({
        where: { eventId: e.id },
        _sum: { ticketsUsed: true, ticketsAllotted: true },
      })
    )
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of One Club Conclave bookings and events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/admin/users" />}>
            <Users className="size-4" />
            Roster
          </Button>
          <NewEventDialog />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Events" value={events.length} icon={CalendarDays} />
        <StatTile label="Sessions" value={sessionCount} icon={LayoutList} />
        <StatTile label="Confirmed bookings" value={bookingCount} icon={Ticket} />
        <StatTile label="Students" value={studentCount} icon={Users} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Events</h2>
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No events yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((e, i) => {
              const used = fillStats[i]._sum.ticketsUsed ?? 0;
              const allotted = fillStats[i]._sum.ticketsAllotted ?? 0;
              const pct = allotted > 0 ? Math.round((used / allotted) * 100) : 0;
              return (
                <Card key={e.id} className="flex h-full flex-col">
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold tracking-tight">{e.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {DATE_FORMATTER.format(e.startDate)} – {DATE_FORMATTER.format(e.endDate)}
                        </p>
                      </div>
                      <Badge
                        variant={e.status === "published" ? "default" : "secondary"}
                        className={e.status === "published" ? "bg-success-bg text-success" : ""}
                      >
                        {e.status}
                      </Badge>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tickets used</span>
                        <span className="font-medium">
                          {used}/{allotted} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <Button variant="outline" render={<Link href={`/admin/events/${e.id}`} />} className="mt-auto w-full">
                      Manage event
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
  );
}
