import { AppShell } from "@/components/layout/AppShell";
import { FuelCostsView } from "@/features/fuel-costs/FuelCostsView";

export const metadata = {
  title: "Fuel & Cost Optimization | ThermoShelter",
  description:
    "Comprehensive fuel consumption displacement, lifecycle logistics costs, renewable solar dispatch, and detailed shelter comparisons for high-altitude alpine defense outposts.",
};

export default function FuelCostsPage() {
  return (
    <AppShell>
      <FuelCostsView />
    </AppShell>
  );
}
