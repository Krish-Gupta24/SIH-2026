import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ShelterDesignerWizard } from "@/features/shelter-editor";

export const metadata = {
  title: "Shelter Designer | 13-Step Engineering Wizard",
  description: "Parametric cold-climate building thermal design wizard mapped to EnergyPlus.",
};

export default function DesignerPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading 2D Engineering Wizard...</div>}>
        <ShelterDesignerWizard />
      </Suspense>
    </AppShell>
  );
}

