"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Copy,
  ChevronDown,
  Sparkles,
  Sliders,
  Layers,
  Building2,
  GitCompare,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { ActionButton, PageIntro, EmptyState } from "@/components/v0/platform-components";
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";

// Variant Explorer Components
import {
  ShelterVariant,
  generateDefaultVariants,
  calculateVariantMetrics,
} from "./variant-calculator";
import { VariantDesignerStrip } from "./components/VariantDesignerStrip";
import { VariantResultsMatrix } from "./components/VariantResultsMatrix";
import { VariantRecommendation } from "./components/VariantRecommendation";

// Multi-run Comparison Components (Secondary mode)
import { ConfigurationComparisonStrip } from "./components/ConfigurationComparisonStrip";
import { ControlledConditionsBar } from "./components/ControlledConditionsBar";
import { WhatChangedDiff } from "./components/WhatChangedDiff";
import { ThermalResultsSection } from "./components/ThermalResultsSection";
import { SynchronizedEnergyCharts } from "./components/SynchronizedEnergyCharts";
import { ThermalBehaviourInsights } from "./components/ThermalBehaviourInsights";
import { Comparison3DViewer } from "./components/Comparison3DViewer";
import { EngineeringComparisonMatrix } from "./components/EngineeringComparisonMatrix";
import { ReproducibilityManifestCard } from "./components/ReproducibilityManifestCard";
import { SaveVersionModal } from "./components/SaveVersionModal";
import { generateReproducibilityManifest } from "./comparison-engine";

export function ComparisonView() {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    simulations,
    comparisonJobIds,
    toggleComparisonJobId,
    materials,
    saveProjectVersion,
    addSimulationJob,
    weatherDatasets,
    activeWeatherId,
  } = useShelterStore();

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  // Primary mode: "variants" (Same shelter, different material/size) vs "runs" (legacy multi-sim)
  const [activeMode, setActiveMode] = useState<"variants" | "runs">("variants");

  // State for active shelter variants
  const [variants, setVariants] = useState<ShelterVariant[]>(() =>
    generateDefaultVariants(activeProject)
  );

  // Reset or regenerate variants when active project changes
  useEffect(() => {
    if (activeProject) {
      setVariants(generateDefaultVariants(activeProject));
    }
  }, [activeProject?.id]);

  // Calculate live metrics for each variant
  const outdoorWinterTemp = activeProject?.location?.designTempWinter ?? -20;
  const metrics = useMemo(() => {
    return variants.map((v) => calculateVariantMetrics(v, materials, outdoorWinterTemp));
  }, [variants, materials, outdoorWinterTemp]);

  const handleUpdateVariant = (index: number, updated: ShelterVariant) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
  };

  const handleAddVariant = () => {
    if (variants.length >= 4) return;
    const letter = String.fromCharCode(65 + variants.length);
    const geom = activeProject?.geometry || { length: 6, width: 4, height: 2.8 };

    const newVar: ShelterVariant = {
      id: `var-${Date.now().toString(36)}`,
      name: `Variant ${letter}: Custom Insulation`,
      description: "Custom user-configured envelope assembly.",
      length: geom.length || 6,
      width: geom.width || 4,
      height: geom.height || 2.8,
      wallInsulationMatId: "mat-polyurethane-foam",
      wallInsulationThicknessMm: 150,
      wallMassMatId: "mat-rammed-earth",
      wallMassThicknessMm: 250,
      roofInsulationMatId: "mat-eps-insulation",
      roofInsulationThicknessMm: 200,
      floorInsulationMatId: "mat-xps-insulation",
      floorInsulationThicknessMm: 100,
      glazingMatId: "mat-double-low-e",
      windowAreaM2: 3.2,
      hasPcm: false,
      pcmThicknessMm: 0,
    };

    setVariants((prev) => [...prev, newVar]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 2) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetDefaults = () => {
    setVariants(generateDefaultVariants(activeProject));
  };

  // -------------------------------------------------------------
  // Legacy Multi-Simulation Runs state & logic
  // -------------------------------------------------------------
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

  const completedJobs = useMemo(() => {
    return simulations.filter((s) => s.status === "completed" && s.results);
  }, [simulations]);

  const comparedJobs = useMemo(() => {
    return completedJobs.filter((s) => comparisonJobIds.includes(s.id));
  }, [completedJobs, comparisonJobIds]);

  const handleToggleJob = (jobId: string) => {
    const isSelected = comparisonJobIds.includes(jobId);
    if (!isSelected && comparisonJobIds.length >= 4) {
      setSelectionNotice("Maximum 4 configurations can be compared simultaneously.");
      setTimeout(() => setSelectionNotice(null), 3500);
      return;
    }
    setSelectionNotice(null);
    toggleComparisonJobId(jobId);
  };

  const reproducibilityManifest = useMemo(() => {
    if (comparedJobs.length === 0) return null;
    return generateReproducibilityManifest(comparedJobs);
  }, [comparedJobs]);

  const handleSaveVersion = (sourceId: string, versionName: string, description: string) => {
    const newVersion = saveProjectVersion(sourceId, versionName, description);
    if (newVersion) {
      const simId = `sim-${Date.now().toString(36)}`;
      const activeWeather = weatherDatasets.find((w) => w.id === activeWeatherId) || weatherDatasets[0];
      addSimulationJob({
        id: simId,
        projectId: newVersion.id,
        projectName: newVersion.project?.name || newVersion.id,
        shelterModel: newVersion,
        weatherDatasetId: activeWeather?.id || "wx-leh-427053",
        weatherDatasetName: activeWeather?.name || "Leh Airport Station (3500m)",
        engine: "ThermoShelter Core",
        engineVersion: "3.0.0",
        status: "queued",
        queuedAt: new Date().toISOString(),
      });
      toggleComparisonJobId(simId);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 0. Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-muted-foreground">
              {activeProject?.location?.region || "Leh, Ladakh (3,500m MSL)"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Shelter Design & Material Variant Explorer
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Test the same base shelter with different insulation materials, wall thicknesses, glazing packages, and spatial dimensions to identify the most efficient design for high-altitude thermal comfort.
          </p>
        </div>

        {/* Shelter Switcher & Mode Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2.5 bg-card border border-border rounded-2xl px-3.5 py-2 shadow-xs">
            <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">
                Base Shelter
              </span>
              <select
                value={activeProjectId}
                onChange={(e) => setActiveProject(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-bold text-foreground outline-none cursor-pointer pr-4 py-0.5 hover:text-primary transition truncate max-w-[200px] sm:max-w-[240px]"
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id} className="bg-popover text-popover-foreground">
                    {proj.project?.name || "Unnamed Shelter"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-secondary/80 border border-border">
            <button
              type="button"
              onClick={() => setActiveMode("variants")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${activeMode === "variants"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Sliders className="size-3.5 text-primary" />
              <span>Material & Size Explorer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("runs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${activeMode === "runs"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Layers className="size-3.5 text-sky-500" />
              <span>Simulation Runs ({completedJobs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODE 1: Material & Size Variant Explorer ( Goal) */}
      {/* ------------------------------------------------------------------ */}
      {activeMode === "variants" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* AI Recommended Winner Banner */}
          <VariantRecommendation
            variants={variants}
            metrics={metrics}
            activeProject={activeProject}
          />

          {/* Interactive Variant Designer Strip */}
          <VariantDesignerStrip
            variants={variants}
            metrics={metrics}
            materials={materials}
            onUpdateVariant={handleUpdateVariant}
            onAddVariant={handleAddVariant}
            onRemoveVariant={handleRemoveVariant}
          />

          {/* Side-by-Side Results & Physical Matrix */}
          <VariantResultsMatrix
            variants={variants}
            metrics={metrics}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODE 2: Multi-Simulation Runs Benchmarking */}
      {/* ------------------------------------------------------------------ */}
      {activeMode === "runs" && (
        <div className="space-y-10 animate-in fade-in duration-200">
          {completedJobs.length < 2 ? (
            <div className="max-w-3xl mx-auto py-12">
              <EmptyState
                title="Minimum 2 completed simulation runs needed"
                description="To benchmark historical solver runs side-by-side, complete at least two simulations for your projects. You can also explore design variants in the Material Explorer without waiting for simulations!"
                action={
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveMode("variants")}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 transition cursor-pointer"
                    >
                      Open Material & Size Explorer
                    </button>
                    <Link href="/simulations">
                      <ActionButton tone="secondary" className="rounded-full text-xs font-semibold">
                        Launch Simulations
                      </ActionButton>
                    </Link>
                  </div>
                }
              />
            </div>
          ) : (
            <>
              {/* Configuration Candidate Comparison Strip */}
              <ConfigurationComparisonStrip
                allCompletedJobs={completedJobs}
                comparedJobs={comparedJobs}
                onToggleJob={handleToggleJob}
              />

              {/* Controlled Physics Boundary Conditions Bar */}
              <ControlledConditionsBar jobs={comparedJobs} />

              {/* What Changed Diff Matrix */}
              <WhatChangedDiff jobs={comparedJobs} />

              {/* 3D Architectural Spatial Delta Viewer */}
              <Comparison3DViewer jobs={comparedJobs} />

              {/* Synchronized Diurnal Thermal & Sol-Air Response Charts */}
              <SynchronizedEnergyCharts jobs={comparedJobs} />

              {/* High-Altitude Thermal Behaviour Diagnostics */}
              <ThermalBehaviourInsights jobs={comparedJobs} />

              {/* Rigorous Engineering Metrics Matrix */}
              <EngineeringComparisonMatrix jobs={comparedJobs} />

              {/* Forensic Thermal Results Breakdown */}
              <ThermalResultsSection jobs={comparedJobs} />

              {/* Reproducibility Manifest Card */}
              {reproducibilityManifest && (
                <ReproducibilityManifestCard manifest={reproducibilityManifest} />
              )}
            </>
          )}
        </div>
      )}

      {/* Save Project Version Modal */}
      <SaveVersionModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        projects={projects || []}
        activeProjectId={activeProjectId}
        onSaveVersion={handleSaveVersion}
      />

      {/* Workflow Navigation Footer */}
      <WorkflowFooter
        customNextHref="/reports"
        customNextLabel="Certified Compliance Report"
        customPrevHref="/optimization"
        customPrevLabel="Optimization"
      />
    </div>
  );
}
