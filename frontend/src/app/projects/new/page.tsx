import { AppShell } from "@/components/layout/AppShell";
import { NewProjectView } from "@/features/projects/NewProjectView";

export const metadata = {
  title: "New Shelter Project | ShelterThermal",
  description: "Create a new shelter project from cold-climate archetypes or launch the designer.",
};

export default function NewProjectPage() {
  return (
    <AppShell>
      <NewProjectView />
    </AppShell>
  );
}
