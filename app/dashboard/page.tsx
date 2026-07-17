import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isPast } from "@/lib/time";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function DashboardPage() {
  const user = await requireUser();

  const allotments = await prisma.eventTicketAllotment.findMany({
    where: { userId: user.id!, event: { status: "published" } },
    include: { event: true },
    orderBy: { event: { startDate: "asc" } },
  });

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader userName={user.name ?? user.email ?? ""} isAdmin={!!user.isAdmin} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-1 font-serif text-3xl font-semibold tracking-tight">My Events</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Events you&apos;re entitled to book sessions for.
        </p>

        {allotments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              You don&apos;t have a ticket allotment for any published event yet. Contact CAC if
              you believe this is a mistake.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {allotments.map((a) => {
              const deadlinePassed = isPast(a.event.bookingDeadline);
              return (
                <Link key={a.id} href={`/events/${a.event.id}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle>{a.event.name}</CardTitle>
                        {deadlinePassed && <Badge variant="secondary">Deadline passed</Badge>}
                      </div>
                      <CardDescription>
                        {DATE_FORMATTER.format(a.event.startDate)} –{" "}
                        {DATE_FORMATTER.format(a.event.endDate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        <span className="font-medium">{a.ticketsUsed}</span> of{" "}
                        <span className="font-medium">{a.ticketsAllotted}</span> tickets used
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
