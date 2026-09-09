import { AppShell } from "@/components/layout/AppShell";
import { OptimizationView } from "@/features/optimization/OptimizationView";

export const metadata = {
  title: "Thermal Optimization | ShelterThermal",
  description: "Parametric sensitivity curves for insulation thickness, WWR, and thermal mass.",
};

export default function OptimizationPage() {
  return (
    <AppShell>
      <OptimizationView />
    </AppShell>
  );
}
