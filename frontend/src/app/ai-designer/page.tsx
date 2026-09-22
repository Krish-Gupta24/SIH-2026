import { AppShell } from "@/components/layout/AppShell";
import { AIDesignerView } from "@/features/ai-designer/AIDesignerView";

export const metadata = {
  title: "AI Generative Thermal Designer | ThermoShelter",
  description:
    "Flagship AI Inverse Design Engine powered by surrogate ML, true NSGA-II genetic optimization, SHAP explainability, and first-principles physics validation.",
};

export default function AIDesignerPage() {
  return (
    <AppShell>
      <AIDesignerView />
    </AppShell>
  );
}
