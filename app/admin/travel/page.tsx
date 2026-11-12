import { requireAdmin } from "@/lib/authz";
import { TravelDataProvider } from "@/components/travel/travel-data";
import { TravelGate } from "@/components/travel/travel-ui";
import { TravelDashboard } from "@/components/travel/travel-dashboard";

export default async function AdminTravelPage() {
  const admin = await requireAdmin();
  return (
    <TravelDataProvider userId={admin.id!}>
      <TravelGate>
        <TravelDashboard />
      </TravelGate>
    </TravelDataProvider>
  );
}
