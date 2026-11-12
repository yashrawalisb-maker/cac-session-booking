import { requireAdmin } from "@/lib/authz";
import { TravelDataProvider } from "@/components/travel/travel-data";
import { TravelGate } from "@/components/travel/travel-ui";
import { FlightRoster } from "@/components/travel/flight-roster";

export default async function AdminTravelFlightPage({ params }: { params: Promise<{ slotId: string }> }) {
  const admin = await requireAdmin();
  const { slotId } = await params;
  return (
    <TravelDataProvider userId={admin.id!}>
      <TravelGate>
        <FlightRoster slotId={slotId === "unassigned" ? null : slotId} />
      </TravelGate>
    </TravelDataProvider>
  );
}
