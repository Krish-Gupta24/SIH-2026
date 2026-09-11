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
  } = useShelterStore();

  const [selectedObjectiveId, setSelectedObjectiveId] =
    useState<ComparisonObjectiveId>("passive-resilience");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // All completed simulation jobs with valid results
  const completedJobs = useMemo(() => {
    return simulations.filter((s) => s.status === "completed" && s.results);
  }, [simulations]);

  // Active compared jobs based on store IDs or fallback to first 2 or 3 completed jobs
  const comparedJobs = useMemo(() => {
    const selected = completedJobs.filter((s) => comparisonJobIds.includes(s.id));
    if (selected.length >= 2) return selected;
    return completedJobs.slice(0, 3);
  }, [completedJobs, comparisonJobIds]);

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
    saveProjectVersion(sourceId, versionName, description);
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

      {/* V0 Candidate Selection Cards Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="micro-label">
            Select Cases to Compare ({comparedJobs.length} of {completedJobs.length} active)
          </span>
          <span className="text-[11px] text-muted-foreground">
            First selected serves as Baseline reference
          </span>
        </div>

        <div className="comparison-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {completedJobs.map((job) => {
            const isSelected = comparisonJobIds.includes(job.id);
            const isBaseline = comparedJobs[0]?.id === job.id;

            return (
              <button
                key={job.id}
                onClick={() => toggleComparisonJobId(job.id)}
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

      {/* 3. Objective-Constrained Decision Winner Card */}
      {evaluationResult && (
        <ObjectiveWinnerCard
          evaluation={evaluationResult}
          selectedObjectiveId={selectedObjectiveId}
          onSelectObjective={setSelectedObjectiveId}
        />
      )}

      {/* 4. Side-by-Side Parametric Metric Table with Difference Percentages */}
      <SideBySideTable jobs={comparedJobs} />

      {/* 5. Comparative Visual Charts */}
      <ComparisonCharts jobs={comparedJobs} />

      {/* 6. Engineering Scientific Reproducibility Manifest */}
      {reproducibilityManifest && (
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
    </div>
  );
}
