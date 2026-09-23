"use client";

import React from "react";
import {
  Sliders,
  Sparkles,
  CheckSquare,
  Square,
  Target,
  ShieldCheck,
  Play,
  Layers,
  Settings2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SweptParameterId,
  OptimizationObjectiveId,
  OptimizationConstraintConfig,
} from "../types";
import {
  AVAILABLE_SWEPT_PARAMETERS,
  OPTIMIZATION_OBJECTIVES,
} from "../optimization-engine";

interface OptimizationSetupCardProps {
  selectedParameters: SweptParameterId[];
  onToggleParameter: (id: SweptParameterId) => void;
  selectedObjective: OptimizationObjectiveId;
  onSelectObjective: (id: OptimizationObjectiveId) => void;
  constraints: OptimizationConstraintConfig[];
  onToggleConstraint: (id: string) => void;
  isExecuting: boolean;
  onRunSweep: () => void;
  candidateBudget: number;
}

export function OptimizationSetupCard({
  selectedParameters,
  onToggleParameter,
  selectedObjective,
  onSelectObjective,
  constraints,
  onToggleConstraint,
  isExecuting,
  onRunSweep,
  candidateBudget,
}: OptimizationSetupCardProps) {
  const activeObjective = OPTIMIZATION_OBJECTIVES.find((o) => o.id === selectedObjective);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-secondary flex items-center justify-center text-foreground border border-border">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label">Step 7 · Multi-Objective Design</span>
              <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[10px] font-semibold text-foreground font-mono">
                Cartesian Sweep
              </span>
            </div>
            <h2 className="font-editorial text-2xl font-medium text-foreground tracking-tight mt-0.5">
              Parametric Optimization Setup
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select design variables to sweep, establish optimization objectives, and enforce boundary constraints.
            </p>
          </div>
        </div>

        {/* Primary Run Trigger */}
        <button
          type="button"
          onClick={onRunSweep}
          disabled={isExecuting || selectedParameters.length === 0}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-6 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6E818F] disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {isExecuting ? (
            <>
              <Sparkles className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span>Evaluating Sweep...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Execute Parameter Sweep</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Parameters Selection (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="micro-label flex items-center gap-1.5 text-muted-foreground">
              <Layers className="h-3.5 w-3.5 text-foreground" />
              <span>Design Variables to Sweep ({selectedParameters.length} of {AVAILABLE_SWEPT_PARAMETERS.length} selected):</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              Est. Combinations: ~{candidateBudget}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {AVAILABLE_SWEPT_PARAMETERS.map((param) => {
              const isSelected = selectedParameters.includes(param.id);
              return (
                <button
                  key={param.id}
                  type="button"
                  onClick={() => onToggleParameter(param.id)}
                  className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? "bg-secondary border-black/30 dark:border-white/30 text-foreground shadow-sm"
                      : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-semibold text-foreground truncate pr-1">
                      {param.label}
                    </span>
                    {isSelected ? (
                      <CheckSquare className="h-3.5 w-3.5 text-foreground shrink-0" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {param.options.length} discrete steps: {param.options[0]?.label}..
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Objectives & Constraints (Right col) */}
        <div className="space-y-4">
          {/* Objective Selector */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2">
            <div className="micro-label flex items-center gap-1.5 text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-foreground" />
              <span>Optimization Objective</span>
            </div>

            <select
              value={selectedObjective}
              onChange={(e) => onSelectObjective(e.target.value as OptimizationObjectiveId)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 shadow-sm cursor-pointer"
            >
              {OPTIMIZATION_OBJECTIVES.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.label}
                </option>
              ))}
            </select>

            <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
              {activeObjective?.description}
            </p>
          </div>

          {/* Hard Constraints Checklist */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2.5">
            <div className="micro-label flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-foreground" />
              <span>Boundary Constraints</span>
            </div>

            <div className="space-y-1.5">
              {constraints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onToggleConstraint(c.id)}
                  className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer p-2 rounded-xl hover:bg-secondary/70 transition-colors"
                >
                  {c.enabled ? (
                    <CheckSquare className="h-3.5 w-3.5 text-foreground mt-0.5 shrink-0" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-foreground">
                      {c.name} ({c.operator} {c.threshold}{c.unit})
                    </div>
                    <div className="text-[10px] text-muted-foreground">{c.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
