import { AppShell } from "@/components/layout/AppShell";
import { SimulationsView } from "@/features/simulations/SimulationsView";

export const metadata = {
  title: "Simulations Queue | ShelterThermal",
  description: "Monitor and execute asynchronous EnergyPlus simulation runs.",
};

export default function SimulationsPage() {
  return (
    <AppShell>
      <SimulationsView />
    </AppShell>
  );
}
