"use client";

import { useRouter } from "next/navigation";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { PremiumLanding } from "@/features/landing/LandingView";

export default function HomePage() {
  const router = useRouter();
  const { projects, activeProjectId, simulations } = useShelterStore();

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];
  const latestCompleted = simulations.find(
    (s) => s.status === "completed" && s.results?.summary
  );

  return (
    <PremiumLanding
      onOpen={() => router.push("/projects")}
      onContinue={() => router.push("/dashboard")}
      hasProject={Boolean(activeProject)}
      summary={latestCompleted?.results?.summary}
    />
  );
}
