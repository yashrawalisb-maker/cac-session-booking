import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewEventDialog } from "@/components/admin/new-event-dialog";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function AdminDashboardPage() {
  const events = await prisma.event.findMany({ orderBy: { startDate: "desc" } });

  const fillStats = await Promise.all(
    events.map((e) =>
      prisma.eventTicketAllotment.aggregate({
        where: { eventId: e.id },
        _sum: { ticketsUsed: true, ticketsAllotted: true },
      })
    )
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Manage CAC events, sessions, rosters, and bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/users" className="text-sm text-primary hover:underline">
            Roster
          </Link>
          <NewEventDialog />
        </div>
      </div>

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
            return (
              <Link key={e.id} href={`/admin/events/${e.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle>{e.name}</CardTitle>
                      <Badge
                        variant={
                          e.status === "published"
                            ? "default"
                            : e.status === "closed"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {e.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {DATE_FORMATTER.format(e.startDate)} – {DATE_FORMATTER.format(e.endDate)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {used}/{allotted} tickets used
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
