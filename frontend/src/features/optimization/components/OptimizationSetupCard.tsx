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
import { Card } from "@/components/ui/card";
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
    <Card className="border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/30">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Parametric Optimization Setup (Zero-ML)
              </span>
              <Badge variant="outline" className="text-[10px] bg-purple-950/50 text-purple-400 border-purple-800/50">
                Cartesian Sweep
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Select variables to sweep, choose an engineering objective, and enforce boundary constraints.
            </p>
          </div>
        </div>

        {/* Primary Run Trigger */}
        <Button
          onClick={onRunSweep}
          disabled={isExecuting || selectedParameters.length === 0}
          className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-900/30"
        >
          {isExecuting ? (
            <>
              <Sparkles className="h-3.5 w-3.5 animate-spin text-purple-200" />
              <span>Running Sweep...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Execute Parameter Sweep</span>
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Parameters Selection (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-sky-400" />
              <span>Design Variables to Sweep ({selectedParameters.length} of 9 selected):</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Est. Candidates: ~{candidateBudget}
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
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "bg-purple-500/10 border-purple-500/50 shadow-sm"
                      : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-slate-200 truncate pr-1">
                      {param.label}
                    </span>
                    {isSelected ? (
                      <CheckSquare className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 truncate">
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
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Target className="h-3.5 w-3.5 text-amber-400" />
              <span>Optimization Objective</span>
            </div>

            <select
              value={selectedObjective}
              onChange={(e) => onSelectObjective(e.target.value as OptimizationObjectiveId)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm"
            >
              {OPTIMIZATION_OBJECTIVES.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.label}
                </option>
              ))}
            </select>

            <p className="text-[11px] text-slate-400 pt-1">
              {activeObjective?.description}
            </p>
          </div>

          {/* Hard Constraints Checklist */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Boundary Constraints</span>
            </div>

            <div className="space-y-2">
              {constraints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onToggleConstraint(c.id)}
                  className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-900/60 transition-colors"
                >
                  {c.enabled ? (
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-white">
                      {c.name} ({c.operator} {c.threshold}{c.unit})
                    </div>
                    <div className="text-[10px] text-slate-500">{c.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
