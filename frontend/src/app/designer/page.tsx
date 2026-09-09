import { ShelterDesignerWizard } from "@/features/shelter-editor";

export const metadata = {
  title: "Shelter Designer | 13-Step Engineering Wizard",
  description: "Parametric cold-climate building thermal design wizard mapped to EnergyPlus.",
};

export default function DesignerPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50">
      <ShelterDesignerWizard />
    </main>
  );
}
