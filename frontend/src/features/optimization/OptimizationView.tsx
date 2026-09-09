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

  // Calculate rough candidate budget based on selections
  const candidateBudget = useMemo(() => {
    const active = AVAILABLE_SWEPT_PARAMETERS.filter((p) =>
      selectedParameters.includes(p.id)
    );
    if (active.length === 0) return 0;
    const count = active.reduce((acc, p) => acc * p.options.length, 1);
    return Math.min(count, 100);
  }, [selectedParameters]);

  // Initial auto-sweep on component mount if project exists
  useEffect(() => {
    if (activeProject && !sweepResult && !isExecuting) {
      const initialSweep = runClientParameterSweep(
        activeProject,
        selectedParameters,
        selectedObjective,
        constraints,
        100
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

  // Execute parameter sweep
  const handleRunSweep = () => {
    if (!activeProject) return;

    setIsExecuting(true);
    setNotification(null);

    // Short timeout allows React to render the loading state smoothly
    setTimeout(() => {
      try {
        const result = runClientParameterSweep(
          activeProject,
          selectedParameters,
          selectedObjective,
          constraints,
          100
        );
        setSweepResult(result);
        setNotification({
          type: "success",
          message: `Sweep completed: ${result.validCount} candidates evaluated in ${result.executionDurationSec}s (${result.feasibleCount} feasible). Recommendation report generated.`,
        });
      } catch (err: any) {
        setNotification({
          type: "info",
          message: `Optimization completed with warnings: ${err?.message || "Execution finished"}`,
        });
      } finally {
        setIsExecuting(false);
      }
    }, 250);
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
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Sliders className="h-6 w-6 text-purple-400" />
              Parametric Optimization Studio
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-mono bg-purple-950/60 text-purple-300 border-purple-800/60"
            >
              Zero-ML Sweep
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic Cartesian exploration across 9 thermal design variables with physics-based constraints, Pareto front ranking, and engineering recommendation layer.
          </p>
        </div>

        {/* Project Selector & Active Info */}
        <div className="flex items-center gap-3">
          {projects.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={activeProjectId || ""}
                onChange={(e) => setActiveProject(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.project.name} (v{p.project.version})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Badge variant="outline" className="gap-1 text-xs py-1 px-2.5 border-slate-700 bg-slate-900/60 text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
            <span>RC Heat Balance Solver</span>
          </Badge>
        </div>
      </div>

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
        <Card className="border-slate-800 bg-slate-950/70 p-4 text-xs font-mono text-slate-400">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3 text-purple-400" />
                <span>Run ID: {sweepResult.runId}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-500" />
                <span>Duration: {sweepResult.executionDurationSec}s</span>
              </span>
              <span className="text-slate-500">
                Algorithm: {sweepResult.algorithm}
              </span>
              <span className="text-slate-500">
                Weather: {sweepResult.weatherDataset}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-emerald-400 font-bold">
                {sweepResult.feasibleCount}/{sweepResult.validCount} Feasible
              </span>
              <span>·</span>
              <span className="text-purple-400 font-bold">
                {sweepResult.paretoCandidates.length} Non-Dominated (Pareto)
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
