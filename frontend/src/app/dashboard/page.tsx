import { AppShell } from "@/components/layout/AppShell";
import { DashboardView } from "@/features/dashboard/DashboardView";

export const metadata = {
  title: "Dashboard | ShelterThermal",
  description: "Area-Specific Shelter Thermal Design & Simulation Dashboard",
};

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
