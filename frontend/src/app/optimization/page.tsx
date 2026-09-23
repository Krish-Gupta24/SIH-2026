import { AppShell } from "@/components/layout/AppShell";
import { OptimizationPageContainer } from "@/features/optimization";

export const metadata = {
  title: "Thermal, Energy, Fuel & Cost Optimization | ShelterThermal",
  description: "Area-specific passive shelter optimization, renewable solar dispatch, and kerosene abatement analysis.",
};

export default function OptimizationPage() {
  return (
    <AppShell>
      <OptimizationPageContainer />
    </AppShell>
  );
}
