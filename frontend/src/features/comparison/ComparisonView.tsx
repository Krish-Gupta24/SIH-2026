"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  GitCompare,
  Plus,
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
      <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
        <GitCompare className="h-12 w-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">Minimum 2 Simulation Runs Needed</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Multi-design comparison requires at least two simulation results to perform thermodynamic trade-off analysis.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button asChild>
            <Link href="/designer/3d">Create Design in 3D</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/simulations">Run Simulations</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Top Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <GitCompare className="h-6 w-6 text-sky-400" />
              <span>Multi-Design Comparison & Decision Engine</span>
            </h1>
            <Badge variant="outline" className="text-sky-400 border-sky-800/60 bg-sky-950/40 text-xs">
              {comparedJobs.length} Designs Active
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Side-by-side engineering evaluation, difference percentages ($\Delta\%$), and objective-constrained winner determination.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setIsSaveModalOpen(true)}
            className="gap-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Save New Version</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearComparison}
            className="gap-1 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* 2. Candidate Selection Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 backdrop-blur-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
            Select Designs to Compare ({comparedJobs.length} of {completedJobs.length} selected):
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            First selected serves as Baseline reference
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {completedJobs.map((job, idx) => {
            const isSelected = comparisonJobIds.includes(job.id);
            const isBaseline = comparedJobs[0]?.id === job.id;

            return (
              <button
                key={job.id}
                onClick={() => toggleComparisonJobId(job.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-sky-500/15 border-sky-500/50 text-sky-200 shadow-sm"
                    : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="h-3.5 w-3.5 text-sky-400" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-slate-600" />
                )}
                <span>{job.projectName}</span>
                {isBaseline && (
                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-emerald-400 border-emerald-500/40 bg-emerald-950/40">
                    Baseline
                  </Badge>
                )}
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
