import { AppShell } from "@/components/layout/AppShell";
import { ProjectsView } from "@/features/projects/ProjectsView";

export const metadata = {
  title: "Projects | ShelterThermal",
  description: "Repository of shelter models and cold-climate envelope configurations.",
};

export default function ProjectsPage() {
  return (
    <AppShell>
      <ProjectsView />
    </AppShell>
  );
}
