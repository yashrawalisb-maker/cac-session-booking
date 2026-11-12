import { redirect } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { hasAttendanceAccess } from "@/lib/attendance";
import { hasUnreadAnnouncements } from "@/lib/announcements";
import { canUseTravelScanner } from "@/lib/travel";
import { AppShell } from "@/components/app-shell";
import { TravelDataProvider } from "@/components/travel/travel-data";
import { TravelGate } from "@/components/travel/travel-ui";
import { TravelStation } from "@/components/travel/travel-station";

export default async function TravelStationPage() {
  const user = await requireUser();
  if (!(await canUseTravelScanner(user))) redirect("/travel");
  const [unreadUpdates, showAttendanceTab] = user.isAdmin
    ? [false, false]
    : await Promise.all([hasUnreadAnnouncements(user.id!), hasAttendanceAccess(user.id!)]);

  return (
    <AppShell
      variant={user.isAdmin ? "admin" : "student"}
      userName={user.name ?? user.email ?? ""}
      userSubtitle={user.isAdmin ? "CAC Admin" : "Travel team"}
      unreadUpdates={unreadUpdates}
      showAttendanceTab={showAttendanceTab}
      showTravelTab
    >
      <TravelDataProvider userId={user.id!}>
        <TravelGate>
          <TravelStation />
        </TravelGate>
      </TravelDataProvider>
    </AppShell>
  );
}
