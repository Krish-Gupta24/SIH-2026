"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { step2dTo3d, step3dTo2d } from "@/lib/store/shelter-model-adapter";

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
  Cpu,
} from "lucide-react";
import { AnsysDeckExportModal } from "@/components/modals/AnsysDeckExportModal";
import { DesignPresetsDropdown } from "@/features/shelter-editor/components/DesignPresetsDropdown";
import { Designer3DStepsNav } from "@/features/shelter-3d/components/Designer3DStepsNav";

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

  return (
    <AppShell>
      <div className="designer-3d-studio-page">
        <section className="designer-pagebar">
          <div className="designer-pagebar-title">
            <span className="micro-label">3D SHELTER DESIGNER</span>
            <h1>{activeModel.project.name}</h1>
            <p>{UNIFIED_13_STEPS[step]?.name} · Stage {step + 1} of {UNIFIED_13_STEPS.length}</p>
          </div>
          <div className="designer-pagebar-actions">
            <DesignPresetsDropdown compact />
            <Link
              href={`/designer?step=${step3dTo2d(step)}`}
              onClick={() => setActiveWizardStep(step3dTo2d(step))}
              className="designer-pagebar-button"
            >
              <Sliders className="size-3.5" /> 2D Designer
            </Link>
            <button type="button" onClick={() => setAnsysModalOpen(true)} className="designer-pagebar-button">
              <Cpu className="size-3.5" /> Export
            </button>
          </div>
        </section>
        
        {/* 13-Stage Engineering Workflow Navigation Strip & Phase Cards */}
        <Designer3DStepsNav
          currentStep={step}
          onStepChange={handleStepChange}
        />

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
