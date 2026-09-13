"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  GitCompare,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square,
  Copy,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ActionButton,
  DataPair,
  EmptyState,
  PageIntro,
  Status,
} from "@/components/v0/platform-components";
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";
import { ComparisonObjectiveId } from "./types";
import {
  evaluateObjectiveWinner,
  generateReproducibilityManifest,
} from "./comparison-engine";

// Comparison Sub-Components
import { ObjectiveWinnerCard } from "./components/ObjectiveWinnerCard";
import { SideBySideTable } from "./components/SideBySideTable";
import { ComparisonCharts } from "./components/ComparisonCharts";
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

  const [selectedObjectiveId, setSelectedObjectiveId] =
    useState<ComparisonObjectiveId>("passive-resilience");
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

  const handleToggleJob = (jobId: string) => {
    const isSelected = comparisonJobIds.includes(jobId);
    if (!isSelected && comparisonJobIds.length >= 3) {
      setSelectionNotice("Maximum 3 cases can be compared simultaneously. Deselect a case to add another.");
      setTimeout(() => setSelectionNotice(null), 3500);
      return;
    }
    setSelectionNotice(null);
    toggleComparisonJobId(jobId);
  };

  // Compute objective winner
  const evaluationResult = useMemo(() => {
    if (comparedJobs.length < 2) return null;
    return evaluateObjectiveWinner(comparedJobs, selectedObjectiveId);
  }, [comparedJobs, selectedObjectiveId]);

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
        engine: "EnergyPlus",
        engineVersion: "v24.1.0",
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
          description="Multi-design comparison requires at least two simulation results to perform thermodynamic trade-off analysis and compute delta percentages."
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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* V0 Page Intro */}
      <PageIntro
        eyebrow="Stored completed runs"
        title="Compare outcomes"
        description="Select up to three cases. Values come directly from stored simulation outputs with delta analysis."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton
              tone="primary"
              onClick={() => setIsSaveModalOpen(true)}
              className="rounded-full text-xs font-bold"
            >
              <Copy className="size-3.5" />
              Save New Version
            </ActionButton>

            <ActionButton
              tone="quiet"
              onClick={clearComparison}
              className="rounded-full text-xs font-semibold"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </ActionButton>
          </div>
        }
      />

      {/* Candidate Selection Cards Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="micro-label">
            Select Cases to Compare ({comparedJobs.length} of {completedJobs.length} selected · max 3)
          </span>
          <span className="text-[11px] text-muted-foreground">
            First selected serves as Baseline reference
          </span>
        </div>

        {selectionNotice && (
          <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 animate-in fade-in slide-in-from-top-1">
            {selectionNotice}
          </div>
        )}

        <div className="comparison-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {completedJobs.map((job) => {
            const isSelected = comparisonJobIds.includes(job.id);
            const isBaseline = comparedJobs[0]?.id === job.id;

            return (
              <button
                key={job.id}
                onClick={() => handleToggleJob(job.id)}
                className={`comparison-card flex min-h-32 flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                  isSelected
                    ? "border-[#6E818F] bg-[#CBDCE6] shadow-[0_15px_35px_rgba(0,0,0,.08)] text-black"
                    : "border-border bg-card hover:-translate-y-0.5 hover:border-[#6E818F]"
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div>
                    <span className="block text-sm font-semibold">{job.projectName}</span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {job.id} · {job.weatherDatasetName}
                    </span>
                  </div>
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                      isSelected ? "border-black bg-black text-white" : "border-black/20 bg-card"
                    }`}
                  >
                    {isSelected ? <Check className="size-3" /> : null}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-2 text-[10px]">
                  <span>Demand: <strong>{job.results?.summary.heatingDemandKwhM2 ?? "—"} kWh/m²</strong></span>
                  {isBaseline ? (
                    <span className="rounded-full bg-black px-2 py-0.5 font-bold uppercase tracking-wider text-white text-[9px]">
                      Baseline
                    </span>
                  ) : (
                    <span>Comfort: <strong>{job.results?.summary.comfortHoursPct ?? "—"}%</strong></span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* When fewer than 2 cases are selected */}
      {comparedJobs.length < 2 && (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {comparedJobs.length === 0
              ? "Select at least 2 simulation runs above to compare performance deltas"
              : `1 case selected (${comparedJobs[0].projectName}). Select at least 1 more candidate above to compare against baseline.`}
          </p>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto">
            Multi-design comparison evaluates thermal trade-offs, calculates delta percentages across envelope losses, and provides objective-constrained rankings.
          </p>
        </div>
      )}

      {/* 3. Objective-Constrained Decision Winner Card */}
      {comparedJobs.length >= 2 && evaluationResult && (
        <ObjectiveWinnerCard
          evaluation={evaluationResult}
          selectedObjectiveId={selectedObjectiveId}
          onSelectObjective={setSelectedObjectiveId}
        />
      )}

      {/* 4. Side-by-Side Parametric Metric Table with Difference Percentages */}
      {comparedJobs.length >= 2 && <SideBySideTable jobs={comparedJobs} />}

      {/* 5. Comparative Visual Charts */}
      {comparedJobs.length >= 2 && <ComparisonCharts jobs={comparedJobs} />}

      {/* 6. Engineering Scientific Reproducibility Manifest */}
      {comparedJobs.length >= 2 && reproducibilityManifest && (
        <ReproducibilityManifestCard manifest={reproducibilityManifest} />
      )}

      {/* Save / Clone Version Modal */}
      <SaveVersionModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId || undefined}
        onSaveVersion={handleSaveVersion}
      />

      {/* Connected Linear Workflow Footer */}
      <WorkflowFooter customNextLabel="Generate Certified Report" customNextHref="/reports" />
    </div>
  );
}
