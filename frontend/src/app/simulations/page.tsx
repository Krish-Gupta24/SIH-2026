import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SimulationsView } from "@/features/simulations/SimulationsView";

export const metadata = {
  title: "Simulations Queue | ShelterThermal",
  description: "Monitor and execute asynchronous ThermoShelter simulation runs.",
};

export default function SimulationsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="text-slate-400 p-8 text-center">Loading simulation queue...</div>}>
        <SimulationsView />
      </Suspense>
    </AppShell>
  );
}
