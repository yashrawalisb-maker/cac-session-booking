import { redirect } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { canUseTravelScanner } from "@/lib/travel";
import { TravelDataProvider } from "@/components/travel/travel-data";
import { TravelGate } from "@/components/travel/travel-ui";
import { TravelDashboard } from "@/components/travel/travel-dashboard";
import {
  NoTravelAccess,
  TravelTeamShell,
} from "@/components/travel/travel-team-shell";

/**
 * All-flights live overview for CAC staff and travel team members: who has checked in at each
 * checkpoint and who is left, with manual check-in. (Admins have the same view under /admin/travel.)
 */
export default async function TravelOverviewPage() {
  const user = await requireUser({ allowStaff: true });
  if (user.isAdmin) redirect("/admin/travel");
  const allowed = await canUseTravelScanner(user);
  if (!allowed && !user.isStaff) redirect("/travel");

  return (
    <TravelTeamShell user={user}>
      {allowed ? (
        <TravelDataProvider userId={user.id!}>
          <TravelGate>
            <TravelDashboard mode="team" />
          </TravelGate>
        </TravelDataProvider>
      ) : (
        <NoTravelAccess />
      )}
    </TravelTeamShell>
  );
}
