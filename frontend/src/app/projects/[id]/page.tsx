import { AppShell } from "@/components/layout/AppShell";
import { ProjectDetailsView } from "@/features/projects/ProjectDetailsView";

export const metadata = {
  title: "Project Details | ThemoShelter",
  description: "Detailed envelope assemblies, fenestration specs, and simulation triggers.",
};

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <ProjectDetailsView projectId={params.id} />
    </AppShell>
  );
}
