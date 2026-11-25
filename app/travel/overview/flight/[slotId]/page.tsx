import { redirect } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { canUseTravelScanner } from "@/lib/travel";
import { TravelDataProvider } from "@/components/travel/travel-data";
import { TravelGate } from "@/components/travel/travel-ui";
import { FlightRoster } from "@/components/travel/flight-roster";
import { TravelTeamShell } from "@/components/travel/travel-team-shell";

/** One flight's live student list for CAC staff and travel team members (with manual check-in). */
export default async function TravelOverviewFlightPage({
  params,
}: {
  params: Promise<{ slotId: string }>;
}) {
  const user = await requireUser({ allowStaff: true });
  const { slotId } = await params;
  if (user.isAdmin) redirect(`/admin/travel/flight/${slotId}`);
  if (!(await canUseTravelScanner(user))) redirect("/travel/overview");
  if (slotId === "unassigned") redirect("/travel/overview");

  return (
    <TravelTeamShell user={user}>
      <TravelDataProvider userId={user.id!}>
        <TravelGate>
          <FlightRoster slotId={slotId} mode="team" />
        </TravelGate>
      </TravelDataProvider>
    </TravelTeamShell>
  );
}
