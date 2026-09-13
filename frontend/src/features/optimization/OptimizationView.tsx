"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  ArrowRight,
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
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";
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
    simulations,
    activeProjectId,
    setActiveProject,
    updateProject,
    saveProjectVersion,
  } = useShelterStore();

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  const hasSimulated = useMemo(() => {
    if (!activeProject) return false;
    return simulations.some(
      (s) =>
        (s.projectId === activeProject.id ||
          s.shelterModel?.id === activeProject.id ||
          s.shelterModel?.project?.id === activeProject.id) &&
        s.status === "completed"
    );
  }, [simulations, activeProject]);

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

  // Reset sweepResult when activeProject changes or was deleted
  const lastActiveProjectIdRef = useRef<string | undefined>(activeProject?.id);
  useEffect(() => {
    if (activeProject && activeProject.id !== lastActiveProjectIdRef.current) {
      lastActiveProjectIdRef.current = activeProject.id;
      setSweepResult(null);
    }
  }, [activeProject?.id]);

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

      {/* AI Generative Designer Flagship Banner */}
      <div className="rounded-[2rem] border border-border bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-emerald-900/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
            <Sparkles className="size-5 text-emerald-400" />
          </span>
          <div>
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <span>Flagship AI: Generative Inverse Thermal Designer</span>
              <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                Surrogate ML + NSGA-II
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore thousands of candidate shelter shapes and envelope assemblies in under 4 seconds with SHAP explainability.
            </p>
          </div>
        </div>
        <Link
          href="/ai-designer"
          className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 shadow-md"
        >
          <span>Launch AI Designer</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-semibold shadow-sm ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-muted-foreground hover:text-foreground text-xs px-2 transition-colors"
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

      {/* Pre-Simulation Guidance: Unsimulated Project Banner */}
      {!sweepResult && !hasSimulated && (
        <div className="rounded-[2rem] border border-amber-500/30 bg-amber-500/5 p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-base font-bold text-foreground">
              Baseline Simulation Required Before Optimization
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No completed physical thermal simulations were detected for{" "}
              <strong className="text-foreground">
                {activeProject?.project?.name || "this project"}
              </strong>
              . Multi-objective optimization algorithms and Pareto frontier rankings require an authentic EnergyPlus physical baseline to calibrate envelope thermal loads and compute comparative delta improvements.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/simulations">
              <Button
                size="sm"
                className="rounded-full bg-primary text-primary-foreground font-semibold px-5 text-xs shadow-sm hover:opacity-90"
              >
                <Cpu className="size-3.5 mr-2" />
                Queue Baseline Simulation
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunSweep}
              disabled={isExecuting}
              className="rounded-full border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold px-5"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="size-3.5 mr-2 animate-spin" />
                  Running Sweep...
                </>
              ) : (
                <>
                  <Sliders className="size-3.5 mr-2" />
                  Run Direct Exploratory Sweep
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Baseline Completed: Ready to Sweep Invitation Card */}
      {!sweepResult && hasSimulated && (
        <div className="rounded-[2rem] border border-border bg-card/60 p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-base font-bold text-foreground">
              Baseline Simulation Validated — Ready to Sweep
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Physical baseline simulation data is available for{" "}
              <strong className="text-foreground">
                {activeProject?.project?.name || "this project"}
              </strong>
              . Configure your design variables, objective function, and constraints above, then trigger the parameter sweep to generate non-dominated Pareto frontiers and automated engineering recommendations.
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <Button
              size="sm"
              onClick={handleRunSweep}
              disabled={isExecuting}
              className="rounded-full bg-primary text-primary-foreground font-bold px-6 text-xs shadow-sm hover:opacity-90"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="size-3.5 mr-2 animate-spin" />
                  Sweeping Candidates...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 mr-2 text-amber-300" />
                  Run Parameter Sweep ({candidateBudget} Candidates)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 0 Feasible Guidance Advisory */}
      {sweepResult && sweepResult.feasibleCount === 0 && (
        <div className="p-6 rounded-[2rem] border-2 border-amber-500/40 bg-amber-500/10 text-xs space-y-3 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>All {sweepResult.validCount} Candidates Physically Simulated — 0 Met Strict Hard Constraints</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In sub-zero Himalayan winter (-20°C outdoor ambient), 100% passive unheated shelters naturally dip below standard room comfort (8°C) before dawn while still preventing hypothermia. Because a strict constraint was active, all candidates were marked as violated.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              size="sm"
              onClick={() => {
                setConstraints((prev) =>
                  prev.map((c) => (c.id === "c-min-temp" ? { ...c, threshold: 0.0 } : c))
                );
                handleRunSweep();
              }}
              className="rounded-full bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold px-4"
            >
              Set Survival Minimum to 0°C & Re-Run
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConstraints((prev) =>
                  prev.map((c) => (c.id === "c-min-temp" ? { ...c, enabled: false } : c))
                );
                handleRunSweep();
              }}
              className="rounded-full border-amber-500/40 bg-card hover:bg-secondary text-foreground text-xs font-semibold px-4"
            >
              Disable Min-Temp Constraint & Re-Run
            </Button>
          </div>
        </div>
      )}

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
        <div className="rounded-[2rem] border border-border bg-card p-6 text-xs text-muted-foreground shadow-[0_20px_55px_rgba(0,0,0,.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Database className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span>Run ID: {sweepResult.runId}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Duration: {sweepResult.executionDurationSec}s</span>
              </span>
              <span>
                Algorithm: <strong className="text-foreground">{sweepResult.algorithm}</strong>
              </span>
              <span>
                Weather: <strong className="text-foreground">{sweepResult.weatherDataset}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {sweepResult.feasibleCount}/{sweepResult.validCount} Feasible
              </span>
              <span>·</span>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">
                {sweepResult.paretoCandidates.length} Non-Dominated (Pareto)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Connected Linear Workflow Footer */}
      <WorkflowFooter customNextLabel="Compare Design Alternatives" customNextHref="/comparison" />
    </div>
  );
}
