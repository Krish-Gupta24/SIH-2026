"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Copy,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { ActionButton, EmptyState, PageIntro } from "@/components/v0/platform-components";
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";
import { generateReproducibilityManifest } from "./comparison-engine";

// Design Decision Workspace Components
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

export function ComparisonView() {
  const {
    projects,
    activeProjectId,
    simulations,
    comparisonJobIds,
    toggleComparisonJobId,
    clearComparison,
    saveProjectVersion,
    addSimulationJob,
    weatherDatasets,
    activeWeatherId,
  } = useShelterStore();

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

  // All completed simulation jobs with valid results
  const completedJobs = useMemo(() => {
    return simulations.filter((s) => s.status === "completed" && s.results);
  }, [simulations]);

  // Active compared jobs based directly on store selection
  const comparedJobs = useMemo(() => {
    return completedJobs.filter((s) => comparisonJobIds.includes(s.id));
  }, [completedJobs, comparisonJobIds]);

  // Ensure default comparison candidates if fewer than 2 selected for immediate storytelling
  useEffect(() => {
    if (comparisonJobIds.length < 2 && completedJobs.length >= 2) {
      const first = completedJobs[0];
      const second = completedJobs[1];
      if (first && !comparisonJobIds.includes(first.id)) {
        toggleComparisonJobId(first.id);
      }
      if (second && !comparisonJobIds.includes(second.id)) {
        toggleComparisonJobId(second.id);
      }
    }
  }, [comparisonJobIds, completedJobs, toggleComparisonJobId]);

  const handleToggleJob = (jobId: string) => {
    const isSelected = comparisonJobIds.includes(jobId);
    if (!isSelected && comparisonJobIds.length >= 4) {
      setSelectionNotice("Maximum 4 configurations can be compared simultaneously. Remove a case to add another.");
      setTimeout(() => setSelectionNotice(null), 3500);
      return;
    }
    setSelectionNotice(null);
    toggleComparisonJobId(jobId);
  };

  // Generate reproducibility manifest
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

  if (completedJobs.length < 2) {
    return (
      <div className="max-w-3xl mx-auto py-16">
        <EmptyState
          title="Minimum 2 simulation runs needed"
          description="Scenario comparison requires at least two simulation runs to evaluate thermal differences, physical deltas, and envelope trade-offs."
          action={
            <div className="flex items-center justify-center gap-3">
              <Link href="/designer/3d">
                <ActionButton tone="primary" className="rounded-full text-xs font-semibold">
                  Create Design in 3D
                </ActionButton>
              </Link>
              <Link href="/simulations">
                <ActionButton tone="secondary" className="rounded-full text-xs font-semibold">
                  Run Simulations
                </ActionButton>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      {/* 0. Professional Design Decision Workspace Intro */}
      <PageIntro
        eyebrow="Design decision workspace"
        title="Scenario comparison"
        description="One coherent story: Here is the same shelter, here are the configurations we tested, here is exactly what changed, and here is how those changes affected thermal behaviour."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton
              tone="primary"
              onClick={() => setIsSaveModalOpen(true)}
              className="rounded-full text-xs font-bold"
            >
              <Copy className="size-3.5" />
              Save As New Variant
            </ActionButton>

            <ActionButton
              tone="quiet"
              onClick={clearComparison}
              className="rounded-full text-xs font-semibold"
            >
              <RotateCcw className="size-3.5" />
              Reset Selection
            </ActionButton>
          </div>
        }
      />

      {selectionNotice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-300 animate-in fade-in slide-in-from-top-1">
          {selectionNotice}
        </div>
      )}

      {/* 1. DESIGNS: Configuration Comparison Strip */}
      <section aria-label="Tested Configurations">
        <ConfigurationComparisonStrip
          comparedJobs={comparedJobs}
          allCompletedJobs={completedJobs}
          onToggleJob={handleToggleJob}
        />
      </section>

      {/* 2. CONTROLLED CONDITIONS: Reassuring Controlled Experiment Bar */}
      <section aria-label="Controlled Experimental Parameters">
        <ControlledConditionsBar jobs={comparedJobs} />
      </section>

      {/* 3. WHAT CHANGED: Elegant Visual Diff highlighting only differing parameters */}
      <section aria-label="Parametric Differences">
        <WhatChangedDiff jobs={comparedJobs} />
      </section>

      {/* 4. THERMAL RESULTS: Large Diurnal Graph with Comfort Bands + Authentic KPIs */}
      <section aria-label="Thermal Temperature Results">
        <ThermalResultsSection jobs={comparedJobs} />
      </section>

      {/* 5. THERMAL BEHAVIOUR: Factual Physical Observations */}
      <section aria-label="Physical Thermal Behaviour">
        <ThermalBehaviourInsights jobs={comparedJobs} />
      </section>

      {/* 6. ENERGY & HEAT BEHAVIOUR: Synchronized Heat Loss, Solar, and Storage Balance */}
      <section aria-label="Synchronized Physics Charts">
        <SynchronizedEnergyCharts jobs={comparedJobs} />
      </section>

      {/* 7. 3D VISUAL EXPLANATION: Single Polished Viewer with Layer Inspection */}
      <section aria-label="3D CAD Explanation">
        <Comparison3DViewer jobs={comparedJobs} />
      </section>

      {/* 8. ENGINEERING COMPARISON MATRIX: Collapsible Progressive Disclosure */}
      <section aria-label="Engineering Specifications Matrix">
        <EngineeringComparisonMatrix jobs={comparedJobs} />
      </section>

      {/* 9. SIMULATION VERIFICATION: Reproducibility Manifest */}
      {reproducibilityManifest && (
        <section aria-label="Simulation Audit Manifest">
          <ReproducibilityManifestCard manifest={reproducibilityManifest} />
        </section>
      )}

      {/* Save Version Modal */}
      <SaveVersionModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId || undefined}
        onSaveVersion={handleSaveVersion}
      />

      {/* Linear Engineering Workflow Pipeline Footer */}
      <WorkflowFooter customNextLabel="Generate Certified Report" customNextHref="/reports" />
    </div>
  );
}
