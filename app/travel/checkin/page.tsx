import { requireUser } from "@/lib/authz";
import { hasAttendanceAccess } from "@/lib/attendance";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { AppShell } from "@/components/app-shell";
import { CheckinLanding } from "@/components/travel/student-checkin";

/** Opened when a student scans a station QR with their phone's normal camera app. */
export default async function TravelCheckinPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const user = await requireUser();
  const { t } = await searchParams;
  const [unreadUpdates, showAttendanceTab] = user.isAdmin
    ? [false, false]
    : await Promise.all([hasUnreadAnnouncements(user.id!), hasAttendanceAccess(user.id!)]);

  return (
    <AppShell
      variant={user.isAdmin ? "admin" : "student"}
      userName={user.name ?? user.email ?? ""}
      userSubtitle={user.isAdmin ? "CAC Admin" : (user.email ?? undefined)}
      unreadUpdates={unreadUpdates}
      showAttendanceTab={showAttendanceTab}
      showTravelTab
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <h1 className="text-2xl font-semibold tracking-tight">Travel check-in</h1>
        <CheckinLanding token={t ?? null} />
      </div>
    </AppShell>
  );
}
