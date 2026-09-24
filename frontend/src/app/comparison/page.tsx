import { AppShell } from "@/components/layout/AppShell";
import { ComparisonView } from "@/features/comparison/ComparisonView";

export const metadata = {
  title: "Scenario Comparison | ThemoShelter",
  description: "Side-by-side performance evaluation between baseline and optimized shelter models.",
};

export default function ComparisonPage() {
  return (
    <AppShell>
      <ComparisonView />
    </AppShell>
  );
}
