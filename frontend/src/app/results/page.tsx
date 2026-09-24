import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ResultsView } from "@/features/results/ResultsView";

export const metadata = {
  title: "Thermal Results & Analytics | ThemoShelter",
  description: "Interactive thermal comfort, hourly temperature series, and heat transfer breakdowns.",
};

export default function ResultsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="text-slate-400 p-8 text-center">Loading simulation results...</div>}>
        <ResultsView />
      </Suspense>
    </AppShell>
  );
}
