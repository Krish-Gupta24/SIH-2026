"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { step2dTo3d, step3dTo2d } from "@/lib/store/shelter-model-adapter";
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";

// Dynamically import the 3D designer with SSR disabled for WebGL canvas compatibility
const Shelter3DDesigner = dynamic(
  () => import("@/features/shelter-3d/Shelter3DDesigner").then((mod) => mod.Shelter3DDesigner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[720px] flex-col items-center justify-center space-y-4 rounded-3xl border border-border bg-slate-950 text-slate-400">
        <div className="relative">
          <Box className="h-12 w-12 text-sky-500 animate-pulse" />
          <Loader2 className="absolute -bottom-2 -right-2 h-5 w-5 text-sky-400 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-200">Initializing Three.js WebGL Engine...</p>
          <p className="text-xs text-slate-500">Loading parametric 3D shelter geometry & shaders</p>
        </div>
      </div>
    ),
  }
);

import Link from "next/link";
import {
  FolderKanban,
  MapPin,
  Box as BoxIcon,
  Compass,
  Layers,
  Home,
  Grid,
  Square,
  DoorOpen,
  Sun,
  Mountain,
  Wind,
  Target,
  Sliders,
  Eye,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { AnsysDeckExportModal } from "@/components/modals/AnsysDeckExportModal";
import { DesignPresetsDropdown } from "@/features/shelter-editor/components/DesignPresetsDropdown";

const UNIFIED_13_STEPS = [
  { id: 1, name: "Project", description: "Identity & Version", icon: FolderKanban },
  { id: 2, name: "Location", description: "Climate & EPW", icon: MapPin },
  { id: 3, name: "Geometry", description: "Dimensions & Roof Form", icon: BoxIcon },
  { id: 4, name: "Orientation", description: "Solar Azimuth & Wind Axis", icon: Compass },
  { id: 5, name: "Walls", description: "Envelope Assemblies & Insulation", icon: Layers },
  { id: 6, name: "Roof", description: "Pitch, Overhang & Eaves", icon: Home },
  { id: 7, name: "Floor", description: "Foundation Slab & Subgrade", icon: Grid },
  { id: 8, name: "Windows", description: "South Solar Glazing & Apertures", icon: Square },
  { id: 9, name: "Doors", description: "Ingress & Airtight Barriers", icon: DoorOpen },
  { id: 10, name: "Shading", description: "Solar Cutoff Overhangs & Fins", icon: Sun },
  { id: 11, name: "Thermal Mass", description: "Capacitive Storage & Trombe Wall", icon: Mountain },
  { id: 12, name: "Ventilation", description: "Infiltration ACH & Heat Recovery", icon: Wind },
  { id: 13, name: "Simulation", description: "Targets & EnergyPlus Run", icon: Target },
];

function Shelter3DPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    projects,
    activeProjectId,
    activeWizardStep,
    setActiveWizardStep,
    updateProject,
    addProject,
  } = useShelterStore();

  const stageParam = searchParams.get("stage") ?? searchParams.get("step");

  const [step, setStep] = useState<number>(() => {
    if (stageParam !== null) {
      const parsed = parseInt(stageParam, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 12) return parsed;
    }
    return step2dTo3d(activeWizardStep || 1);
  });

  const [ansysModalOpen, setAnsysModalOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const activeModel = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Sync step if store or query param changes
  useEffect(() => {
    if (stageParam !== null) {
      const parsed = parseInt(stageParam, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 12) {
        setStep(parsed);
        setActiveWizardStep(step3dTo2d(parsed));
        return;
      }
    }
    if (activeWizardStep) {
      const step3d = step2dTo3d(activeWizardStep);
      setStep(step3d);
    }
  }, [stageParam, activeWizardStep, setActiveWizardStep]);

  const handleStepChange = (newStep: number) => {
    const validStep = Math.min(Math.max(0, newStep), 12);
    setStep(validStep);
    setActiveWizardStep(step3dTo2d(validStep));
  };

  if (!activeModel) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
          <p>No project loaded. Please create or select a project first.</p>
        </div>
      </AppShell>
    );
  }

  const currentStepInfo = UNIFIED_13_STEPS[step] || UNIFIED_13_STEPS[0];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Stage Header with View Toggle Pill */}
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label">Canonical Model · 13-Step Sequence</span>
              <span className="text-xs text-muted-foreground">
                Stage {step + 1} of {UNIFIED_13_STEPS.length}
              </span>
            </div>
            <h1 className="font-editorial mt-2 text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
              {currentStepInfo.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {currentStepInfo.description} · Interactive Three.js WebGL Spatial Studio
            </p>
          </div>

          {/* Action Area: Save Project + ANSYS Export + View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeModel) {
                  addProject(activeModel);
                  setSavedToast(true);
                  setTimeout(() => setSavedToast(false), 3000);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background shadow-sm hover:opacity-90 transition"
            >
              <FolderKanban className="size-3.5" />
              <span>Save Project</span>
            </button>

            {savedToast && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="size-3.5" />
                Saved to Projects
              </span>
            )}

            <button
              type="button"
              onClick={() => setAnsysModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/60 transition shadow-sm"
            >
              <Cpu className="size-3.5 text-emerald-500" />
              <span>Export ANSYS Deck</span>
            </button>

            {/* View Switcher: 2D Wizard vs 3D CAD Studio */}
            <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-0.5">
              <Link
                href={`/designer?step=${step3dTo2d(step)}`}
                onClick={() => setActiveWizardStep(step3dTo2d(step))}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <Sliders className="size-3.5" />
                <span>2D Wizard</span>
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background shadow-sm">
                <Eye className="size-3.5" />
                <span>3D CAD Studio</span>
              </span>
            </div>
          </div>
        </div>

        {/* 1-Click Design Presets (Baseline vs Passive Solar vs Super-Insulated) */}
        <DesignPresetsDropdown />

        {/* Stepper Navigation Strip with all 13 options */}
        <div className="overflow-x-auto pb-2">
          <nav
            className="flex min-w-max items-center gap-1.5 rounded-2xl bg-secondary/40 p-1.5 border border-border"
            aria-label="3D CAD design stages"
          >
            {UNIFIED_13_STEPS.map((s, idx) => {
              const isCurrent = step === idx;
              const isCompleted = step > idx;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleStepChange(idx)}
                  className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isCurrent
                      ? "bg-foreground text-background shadow-sm"
                      : isCompleted
                      ? "bg-white text-black border border-black/10"
                      : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? "bg-background text-foreground"
                        : isCompleted
                        ? "bg-[#CBDCE6] text-black"
                        : "bg-black/5 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? "✓" : s.id}
                  </span>
                  <span>{s.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 3D CAD Interactive Canvas Studio */}
        <Shelter3DDesigner
          model={activeModel}
          step={step}
          onStepChange={handleStepChange}
          onUpdate={(patch: any) => updateProject(activeModel.id, patch)}
          onSimulate={() => router.push("/simulations")}
        />

        {/* ANSYS Validation Deck Export Modal */}
        <AnsysDeckExportModal open={ansysModalOpen} onOpenChange={setAnsysModalOpen} />

        {/* Connected Linear Workflow Footer */}
        <WorkflowFooter customNextLabel="Proceed to EnergyPlus Simulation" customNextHref="/simulations" />
      </div>
    </AppShell>
  );
}

export default function Shelter3DPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-foreground" />
            <span className="ml-2 text-xs">Loading 3D CAD Studio...</span>
          </div>
        </AppShell>
      }
    >
      <Shelter3DPageContent />
    </Suspense>
  );
}
