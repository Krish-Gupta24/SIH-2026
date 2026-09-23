import { AppShell } from "@/components/layout/AppShell";
import { OptimizationView } from "@/features/optimization/OptimizationView";

export const metadata = {
  title: "Thermal Optimization | ThermoShelter",
  description:
    "Parametric design exploration, Pareto sensitivity analysis, and structured engineering recommendations.",
};

export default function OptimizationPage() {
  return (
    <AppShell>
      <OptimizationView />
    </AppShell>
  );
}
