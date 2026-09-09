import { AppShell } from "@/components/layout/AppShell";
import { DemoWorkflowView } from "@/features/demo/DemoWorkflowView";

export const metadata = {
  title: "SIH Judge Demonstration | High-Altitude Shelter Thermal Platform",
  description: "Interactive 20-step guided walkthrough for SIH 2026 judges and defense reviewers.",
};

export default function DemoPage() {
  return (
    <AppShell>
      <DemoWorkflowView />
    </AppShell>
  );
}
