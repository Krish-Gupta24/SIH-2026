import { AppShell } from "@/components/layout/AppShell";
import { MaterialsView } from "@/features/materials/MaterialsView";

export const metadata = {
  title: "Thermal Materials | ShelterThermal",
  description: "Comprehensive physical properties catalog for building envelope layers.",
};

export default function MaterialsPage() {
  return (
    <AppShell>
      <MaterialsView />
    </AppShell>
  );
}
