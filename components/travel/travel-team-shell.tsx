import type { Session } from "next-auth";
import { hasAttendanceAccess } from "@/lib/attendance";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { AppShell } from "@/components/app-shell";

/** App shell for travel-team pages (overview, station), for admins, CAC staff and student team members. */
export async function TravelTeamShell({
  user,
  children,
}: {
  user: Session["user"];
  children: React.ReactNode;
}) {
  const student = !user.isAdmin && !user.isStaff;
  const [unreadUpdates, showAttendanceTab] = student
    ? await Promise.all([
        hasUnreadAnnouncements(user.id!),
        hasAttendanceAccess(user.id!),
      ])
    : [false, false];

  return (
    <AppShell
      variant={user.isAdmin ? "admin" : user.isStaff ? "staff" : "student"}
      userName={user.name ?? user.email ?? ""}
      userSubtitle={
        user.isAdmin ? "CAC Admin" : user.isStaff ? "CAC staff" : "Travel team"
      }
      unreadUpdates={unreadUpdates}
      showAttendanceTab={showAttendanceTab}
    >
      {children}
    </AppShell>
  );
}

/** Shown to a staff account that no longer has travel access (its team row was removed in Setup). */
export function NoTravelAccess() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">No travel access</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This staff account isn&apos;t on the travel team right now. Please
        contact the CAC admin.
      </p>
    </div>
  );
}
