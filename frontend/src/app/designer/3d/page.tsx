"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
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
  { id: 13, name: "Simulation", description: "Targets & ThermoShelter Run", icon: Target },
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

  const lastParamKeyRef = React.useRef<string | null>(
    searchParams.get("stage") ?? searchParams.get("step")
  );

  // Safely resolve initial 0-indexed stage from ?stage= (0..12) or ?step= (1..13 from 2D wizard)
  const resolveStageFromParams = React.useCallback((): number | null => {
    const stageQuery = searchParams.get("stage");
    if (stageQuery !== null) {
      const parsed = parseInt(stageQuery, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 12) return parsed;
    }
    const stepQuery = searchParams.get("step");
    if (stepQuery !== null) {
      const parsed = parseInt(stepQuery, 10);
      if (!isNaN(parsed)) {
        // If 1-indexed (1..13) coming from 2D designer, convert to 0-indexed stage (0..12)
        if (parsed >= 1 && parsed <= 13) return step2dTo3d(parsed);
        // If already 0-indexed
        if (parsed >= 0 && parsed <= 12) return parsed;
      }
    }
    return null;
  }, [searchParams]);

  const [step, setStep] = useState<number>(() => {
    const fromParams = resolveStageFromParams();
    if (fromParams !== null) return fromParams;
    return step2dTo3d(activeWizardStep || 1);
  });

  const [ansysModalOpen, setAnsysModalOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const activeModel = projects.find((p) => p.id === activeProjectId) || projects[0];
  const activeModelRef = React.useRef(activeModel);
  activeModelRef.current = activeModel;

  // Ensure synchronous flush on browser back (popstate), tab close (beforeunload), pagehide, and unmount
  useEffect(() => {
    const handleImmediateFlush = () => {
      if (activeModelRef.current) {
        updateProject(activeModelRef.current.id, activeModelRef.current);
      }
    };

    window.addEventListener("beforeunload", handleImmediateFlush);
    window.addEventListener("pagehide", handleImmediateFlush);
    window.addEventListener("popstate", handleImmediateFlush);

    return () => {
      window.removeEventListener("beforeunload", handleImmediateFlush);
      window.removeEventListener("pagehide", handleImmediateFlush);
      window.removeEventListener("popstate", handleImmediateFlush);
      handleImmediateFlush();
    };
  }, [updateProject]);

  // Only sync when the incoming URL query param actually changes from external navigation
  useEffect(() => {
    const currentParamKey = searchParams.get("stage") ?? searchParams.get("step");
    if (currentParamKey !== lastParamKeyRef.current) {
      lastParamKeyRef.current = currentParamKey;
      const fromParams = resolveStageFromParams();
      if (fromParams !== null) {
        setStep(fromParams);
        setActiveWizardStep(step3dTo2d(fromParams));
      }
    }
  }, [searchParams, resolveStageFromParams, setActiveWizardStep]);

  const handleStepChange = (newStep: number) => {
    const validStep = Math.min(Math.max(0, newStep), 12);
    setStep(validStep);
    setActiveWizardStep(step3dTo2d(validStep));
    lastParamKeyRef.current = String(validStep);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("stage", String(validStep));
      url.searchParams.delete("step");
      window.history.replaceState(null, "", url.toString());
    }
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
      <div className="3d-studio-page space-y-3">
        {/* Stage Header with View Toggle Pill */}
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label">Canonical Model · 13-Step Sequence</span>
              <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold text-foreground border border-border">
                {activeModel?.project?.name || activeModel?.name || "Untitled Shelter"}
              </span>
              <span className="text-xs text-muted-foreground">
                Stage {step + 1} of {UNIFIED_13_STEPS.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{currentStepInfo.name} · {currentStepInfo.description}</p>
          </div>

          {/* Action Area: Save Project + ANSYS Export + View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Autosave Active Badge */}
            <div
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-xs"
              title="Continuous autosave active: all edits are immediately saved to storage and project library"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-medium hidden sm:inline">Autosave Active</span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (activeModel) {
                  updateProject(activeModel.id, activeModel);
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
                onClick={() => {
                  if (activeModel) {
                    updateProject(activeModel.id, activeModel);
                  }
                  setActiveWizardStep(step3dTo2d(step));
                }}
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

        <DesignPresetsDropdown compact />

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
        <WorkflowFooter customNextLabel="Proceed to ThermoShelter Simulation" customNextHref="/simulations" />
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
