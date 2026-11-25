import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requestOrigin, stageCheckinUrls } from "@/lib/travel-token";
import { requireUser } from "@/lib/authz";
import { canUseTravelScanner } from "@/lib/travel";
import { TravelDataProvider } from "@/components/travel/travel-data";
import { TravelGate } from "@/components/travel/travel-ui";
import { TravelStation } from "@/components/travel/travel-station";
import { TravelTeamShell } from "@/components/travel/travel-team-shell";

export default async function TravelStationPage() {
  const user = await requireUser({ allowStaff: true });
  if (!(await canUseTravelScanner(user))) redirect(user.isStaff ? "/travel/overview" : "/travel");
  const qrUrls = stageCheckinUrls(requestOrigin(await headers()));

  return (
    <TravelTeamShell user={user}>
      <TravelDataProvider userId={user.id!}>
        <TravelGate>
          <TravelStation qrUrls={qrUrls} />
        </TravelGate>
      </TravelDataProvider>
    </TravelTeamShell>
  );
}
