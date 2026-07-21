import Link from "next/link";
import { CalendarClock, MapPin, Megaphone } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { istDayWindow, now } from "@/lib/time";
import { visibleAnnouncementsWhere } from "@/lib/announcements";
import { clubShort } from "@/lib/clubs";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

const TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default async function UpdatesPage() {
  const user = await requireUser();

  // Visiting this page clears the unread bell dot.
  await prisma.user.update({
    where: { id: user.id! },
    data: { announcementsSeenAt: new Date() },
  });

  const { start, end } = istDayWindow();
  const [announcements, todaySessions] = await Promise.all([
    prisma.announcement.findMany({
      where: visibleAnnouncementsWhere(user.id!),
      orderBy: { createdAt: "desc" },
      include: { event: { select: { name: true } } },
    }),
    prisma.session.findMany({
      where: {
        startsAt: { gte: start, lt: end },
        status: { not: "cancelled" },
        event: { status: "published", ticketAllotments: { some: { userId: user.id! } } },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const current = now();

  return (
    <AppShell
      variant="student"
      userName={user.name ?? user.email ?? ""}
      userSubtitle={user.email ?? undefined}
      unreadUpdates={false}
    >
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Updates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Announcements from CAC and today&apos;s schedule at a glance.
          </p>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Happening today</h2>
          {todaySessions.length === 0 ? (
            <p className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              No sessions scheduled today.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {todaySessions.map((s) => {
                const live = s.startsAt <= current && current < s.endsAt;
                const ended = s.endsAt <= current;
                return (
                  <Link
                    key={s.id}
                    href={`/events/${s.eventId}/sessions/${s.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{s.title}</span>
                        {clubShort(s.club) && <Badge variant="secondary">{clubShort(s.club)}</Badge>}
                        {live && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success">
                            <span className="relative flex size-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                              <span className="relative inline-flex size-2 rounded-full bg-success" />
                            </span>
                            Live now
                          </span>
                        )}
                        {ended && (
                          <span className="rounded-full bg-disabled-bg px-2.5 py-0.5 text-xs font-medium text-disabled-fg">
                            Ended
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarClock className="size-4 text-primary/70" />
                          {TIME_FORMATTER.format(s.startsAt)} – {TIME_FORMATTER.format(s.endsAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-4 text-primary/70" />
                          {s.venueName}
                          {s.venueLocation ? `, ${s.venueLocation}` : ""}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Announcements</h2>
          {announcements.length === 0 ? (
            <p className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              No announcements yet — check back later.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {announcements.map((a) => (
                <article key={a.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-navy-tint text-primary">
                        <Megaphone className="size-4" />
                      </span>
                      <h3 className="font-semibold text-foreground">{a.title}</h3>
                      {a.event && <Badge variant="secondary">{a.event.name}</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {DATE_TIME_FORMATTER.format(a.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{a.body}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
