"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sliders,
  Sparkles,
  Layers,
  Target,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Cpu,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ActionButton,
  DataPair,
  PageIntro,
  Status,
} from "@/components/v0/platform-components";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import {
  SweptParameterId,
  OptimizationObjectiveId,
  OptimizationConstraintConfig,
  OptimizationSweepResult,
  CandidateResult,
} from "./types";
import {
  AVAILABLE_SWEPT_PARAMETERS,
  OPTIMIZATION_OBJECTIVES,
  DEFAULT_OPTIMIZATION_CONSTRAINTS,
  runClientParameterSweep,
  runBackendEnergyPlusSweep,
} from "./optimization-engine";
import {
  generateClientRecommendationReport,
} from "./recommendation-engine";
import { OptimizationSetupCard } from "./components/OptimizationSetupCard";
import { OptimalCandidateCard } from "./components/OptimalCandidateCard";
import { RecommendedDesignReportCard } from "./components/RecommendedDesignReportCard";
import { ParetoAndSensitivityCharts } from "./components/ParetoAndSensitivityCharts";
import { CandidateRankingsTable } from "./components/CandidateRankingsTable";
import { ShelterModel } from "@/types/shelter";

export function OptimizationView() {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    updateProject,
    saveProjectVersion,
  } = useShelterStore();

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  // Sweep configuration state
  const [selectedParameters, setSelectedParameters] = useState<SweptParameterId[]>([
    "orientation",
    "insulation_thickness",
    "wall_construction",
    "window_area",
    "glazing_type",
  ]);
  const [selectedObjective, setSelectedObjective] =
    useState<OptimizationObjectiveId>("maximize_comfort");
  const [constraints, setConstraints] = useState<OptimizationConstraintConfig[]>(
    DEFAULT_OPTIMIZATION_CONSTRAINTS
  );

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [sweepResult, setSweepResult] = useState<OptimizationSweepResult | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "info";
    message: string;
  } | null>(null);

  // Calculate rough candidate budget based on selections (Default demo: 20-50 candidates)
  const candidateBudget = useMemo(() => {
    const active = AVAILABLE_SWEPT_PARAMETERS.filter((p) =>
      selectedParameters.includes(p.id)
    );
    if (active.length === 0) return 0;
    const count = active.reduce((acc, p) => acc * p.options.length, 1);
    return Math.min(count, 25);
  }, [selectedParameters]);

  // Initial auto-sweep on component mount if project exists
  useEffect(() => {
    if (activeProject && !sweepResult && !isExecuting) {
      const initialSweep = runClientParameterSweep(
        activeProject,
        selectedParameters,
        selectedObjective,
        constraints,
        25
      );
      setSweepResult(initialSweep);
    }
  }, [activeProject]);

  // Generate Recommendation Report whenever sweepResult or activeProject changes
  const recommendationReport = useMemo(() => {
    if (!activeProject || !sweepResult || !sweepResult.bestCandidate) return null;
    return generateClientRecommendationReport(
      activeProject,
      sweepResult,
      165.0,
      35.0
    );
  }, [activeProject, sweepResult]);

  // Toggle variable in sweep
  const handleToggleParameter = (paramId: SweptParameterId) => {
    setSelectedParameters((prev) =>
      prev.includes(paramId) ? prev.filter((p) => p !== paramId) : [...prev, paramId]
    );
  };

  // Toggle constraint
  const handleToggleConstraint = (constraintId: string) => {
    setConstraints((prev) =>
      prev.map((c) => (c.id === constraintId ? { ...c, enabled: !c.enabled } : c))
    );
  };

  // Execute parameter sweep via EnergyPlus backend
  const handleRunSweep = async () => {
    if (!activeProject) return;

    setIsExecuting(true);
    setNotification(null);

    try {
      const result = await runBackendEnergyPlusSweep(
        activeProject,
        selectedParameters,
        selectedObjective,
        constraints,
        25,
        3
      );
      setSweepResult(result);
      setNotification({
        type: "success",
        message: `EnergyPlus physical sweep completed: ${result.validCount} candidates physically simulated with ${result.engineVersion || "EnergyPlus"} in ${result.executionDurationSec}s (${result.feasibleCount} feasible).`,
      });
    } catch (backendErr: any) {
      console.warn("Backend EnergyPlus sweep unavailable, running client RC preview:", backendErr);
      const fallbackResult = runClientParameterSweep(
        activeProject,
        selectedParameters,
        selectedObjective,
        constraints,
        25
      );
      setSweepResult(fallbackResult);
      setNotification({
        type: "info",
        message: `Client RC approximation evaluated (${fallbackResult.validCount} candidates). Backend EnergyPlus simulation unavailable.`,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Apply candidate parameters to active ShelterModel
  const handleApplyCandidate = (candidate: CandidateResult) => {
    if (!activeProject) return;

    const cloned: ShelterModel = JSON.parse(JSON.stringify(activeProject));
    const p = candidate.parameters;

    // 1. Orientation
    if (p.orientation !== undefined) {
      cloned.geometry.orientation = p.orientation;
    }

    // 2. Insulation thickness
    if (p.insulation_thickness !== undefined) {
      const t = Number(p.insulation_thickness);
      const wallKeys: Array<"north" | "south" | "east" | "west"> = [
        "north",
        "south",
        "east",
        "west",
      ];
      wallKeys.forEach((k) => {
        const wall = cloned.envelope.walls[k];
        if (wall && wall.layers && wall.layers.length > 0) {
          const insLayer =
            wall.layers.find(
              (l) =>
                l.materialId.includes("insulation") ||
                l.materialId.includes("eps") ||
                l.materialId.includes("xps") ||
                l.materialId.includes("aerogel")
            ) || wall.layers[0];
          insLayer.thickness = t;
        }
      });
    }

    // 3. Glazing type
    if (p.glazing_type !== undefined && cloned.windows) {
      cloned.windows = cloned.windows.map((w) => ({
        ...w,
        glazingType: p.glazing_type,
      }));
    }

    // 4. Ventilation
    if (p.ventilation !== undefined && cloned.ventilation) {
      cloned.ventilation.infiltrationACH = Number(p.ventilation);
    }

    // Update the active project
    updateProject(activeProject.id, cloned);

    // Also save as an explicit version for side-by-side comparison
    const versionName = `Opt-${candidate.id.toUpperCase()}`;
    saveProjectVersion(
      activeProject.id,
      versionName,
      `Optimized candidate ${candidate.id} (Objective: ${selectedObjective}, Score: ${candidate.objectiveScore.toFixed(1)})`
    );

    setNotification({
      type: "success",
      message: `Candidate ${candidate.id} applied to active project and saved as version "${versionName}". Ready for side-by-side comparison or 3D inspection!`,
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* V0 Page Intro */}
      <PageIntro
        eyebrow="Parametric Optimization Studio · Multi-Objective Design"
        title="Transparent optimization & recommendations"
        description="Deterministic Cartesian exploration across thermal design variables with physics constraints, Pareto frontier ranking, and engineering recommendations."
        action={
          projects.length > 1 ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold">
              <FolderOpen className="size-3.5 text-muted-foreground" />
              <select
                value={activeProjectId || ""}
                onChange={(e) => setActiveProject(e.target.value)}
                className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project.name} (v{p.project.version})
                  </option>
                ))}
              </select>
            </div>
          ) : undefined
        }
      />

      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold ${
            notification.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-blue-950/40 border-blue-500/40 text-blue-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Setup & Configuration Card */}
      <OptimizationSetupCard
        selectedParameters={selectedParameters}
        onToggleParameter={handleToggleParameter}
        selectedObjective={selectedObjective}
        onSelectObjective={setSelectedObjective}
        constraints={constraints}
        onToggleConstraint={handleToggleConstraint}
        isExecuting={isExecuting}
        onRunSweep={handleRunSweep}
        candidateBudget={candidateBudget}
      />

      {/* 2. Structured Recommendation Report (RECOMMENDED DESIGN) */}
      {recommendationReport && sweepResult?.bestCandidate && (
        <RecommendedDesignReportCard
          report={recommendationReport}
          onApplyToProject={handleApplyCandidate}
          rawCandidate={sweepResult.bestCandidate}
        />
      )}

      {/* 3. Multi-Objective Pareto Frontier & Diminishing Returns Charts */}
      {sweepResult && sweepResult.rankedCandidates.length > 0 && (
        <ParetoAndSensitivityCharts candidates={sweepResult.rankedCandidates} />
      )}

      {/* 4. Complete Candidate Rankings Table */}
      {sweepResult && sweepResult.rankedCandidates.length > 0 && (
        <CandidateRankingsTable
          candidates={sweepResult.rankedCandidates}
          onApplyCandidate={handleApplyCandidate}
        />
      )}

      {/* 5. Provenance & Engineering Audit Metadata */}
      {sweepResult && (
        <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Database className="h-3.5 w-3.5 text-purple-500" />
                <span>Run ID: {sweepResult.runId}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Duration: {sweepResult.executionDurationSec}s</span>
              </span>
              <span>
                Algorithm: {sweepResult.algorithm}
              </span>
              <span>
                Weather: {sweepResult.weatherDataset}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-semibold">
                {sweepResult.feasibleCount}/{sweepResult.validCount} Feasible
              </span>
              <span>·</span>
              <span className="text-purple-500 font-semibold">
                {sweepResult.paretoCandidates.length} Non-Dominated (Pareto)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
