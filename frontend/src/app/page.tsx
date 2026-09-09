import { AppShell } from "@/components/layout/AppShell";
import { DashboardView } from "@/features/dashboard/DashboardView";

export const metadata = {
  title: "Dashboard | High-Altitude Shelter Thermal Platform",
  description: "Thermal engineering dashboard for extreme cold alpine shelters (SIH 2026).",
};

export default function HomePage() {
  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
