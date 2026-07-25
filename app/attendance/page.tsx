import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default async function AttendanceListPage() {
  const user = await requireUser();

  const [grants, unreadUpdates] = await Promise.all([
    prisma.sessionAttendanceGrant.findMany({
      where: { userId: user.id! },
      include: { session: { include: { event: true } } },
      orderBy: { session: { startsAt: "asc" } },
    }),
    hasUnreadAnnouncements(user.id!),
  ]);

  return (
    <AppShell
      variant="student"
      userName={user.name ?? user.email ?? ""}
      userSubtitle={user.email ?? undefined}
      unreadUpdates={unreadUpdates}
      showAttendanceTab={grants.length > 0}
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sessions you&apos;ve been given access to mark attendance for.
          </p>
        </div>

        {grants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <ClipboardCheck className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You haven&apos;t been assigned as an attendance tracker for any session yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {grants.map((g) => (
              <Link key={g.id} href={`/attendance/${g.sessionId}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="py-4">
                    <p className="font-semibold tracking-tight">{g.session.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{g.session.event.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {DATE_FORMATTER.format(g.session.startsAt)} · {g.session.venueName}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
