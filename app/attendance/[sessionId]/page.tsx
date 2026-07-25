import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { canMarkAttendance, hasAttendanceAccess } from "@/lib/attendance";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { AppShell } from "@/components/app-shell";
import { AttendanceMarker } from "@/components/attendance-marker";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default async function AttendanceSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireUser();

  const allowed = await canMarkAttendance(user.id!, sessionId, !!user.isAdmin);
  if (!allowed) notFound();

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { event: true },
  });
  if (!session) notFound();

  const [bookings, unreadUpdates, showAttendanceTab] = await Promise.all([
    prisma.booking.findMany({
      where: { sessionId, status: "confirmed" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
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
          <Link
            href="/attendance"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to attendance
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{session.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{session.event.name}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-4 text-primary/70" />
              {DATE_FORMATTER.format(session.startsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-primary/70" />
              {session.venueName}
              {session.venueLocation ? `, ${session.venueLocation}` : ""}
            </span>
          </div>
        </div>

        <AttendanceMarker
          sessionId={sessionId}
          rows={bookings.map((b) => ({
            bookingId: b.id,
            name: b.user.name,
            isbEmail: b.user.isbEmail,
            section: b.user.section,
            attended: b.attended,
          }))}
        />
      </div>
    </AppShell>
  );
}
