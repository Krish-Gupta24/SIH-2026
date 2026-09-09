"use client";

import React from "react";
import {
  Award,
  CheckCircle2,
  Sliders,
  ChevronRight,
  ShieldAlert,
  Target,
  Info,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ComparisonObjective,
  ComparisonObjectiveId,
  WinnerEvaluationResult,
} from "../types";
import { COMPARISON_OBJECTIVES } from "../comparison-engine";

interface ObjectiveWinnerCardProps {
  evaluation: WinnerEvaluationResult;
  selectedObjectiveId: ComparisonObjectiveId;
  onSelectObjective: (id: ComparisonObjectiveId) => void;
}

export function ObjectiveWinnerCard({
  evaluation,
  selectedObjectiveId,
  onSelectObjective,
}: ObjectiveWinnerCardProps) {
  return (
    <Card className="border-sky-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-sky-950/40 p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Multi-Objective Engineering Synthesis
              </span>
              <Badge variant="outline" className="text-[10px] bg-amber-950/60 text-amber-300 border-amber-800/50 py-0">
                Decision Engine
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Definitive ranking derived from physical thermodynamic performance, not arbitrary preference.
            </p>
          </div>
        </div>

        {/* Objective Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            Evaluation Objective:
          </span>
          <select
            value={selectedObjectiveId}
            onChange={(e) => onSelectObjective(e.target.value as ComparisonObjectiveId)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
          >
            {COMPARISON_OBJECTIVES.map((obj) => (
              <option key={obj.id} value={obj.id}>
                {obj.shortLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mandatory Structured Decision Statement */}
      <div className="mt-5 space-y-4">
        <div className="rounded-xl border border-sky-500/40 bg-slate-950/80 p-4 shadow-inner">
          <div className="flex items-center gap-2 text-xs font-mono text-sky-400 uppercase tracking-wider mb-1">
            <Target className="h-3.5 w-3.5" />
            <span>Design Evaluation Determination</span>
          </div>

          <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
            &ldquo;{evaluation.statementText}&rdquo;
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Winning Candidate:</span>
              <span className="font-bold text-sky-300">{evaluation.winnerName}</span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Score:</span>
              <span className="font-mono font-bold text-emerald-400">{evaluation.score} pts</span>
            </div>
            <span className="text-slate-600">·</span>
            <Badge variant="outline" className="text-[10px] bg-emerald-950/60 text-emerald-400 border-emerald-800/60">
              {evaluation.marginOfVictory}
            </Badge>
          </div>
        </div>

        {/* Multi-Criteria Rationale Points */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Info className="h-3.5 w-3.5 text-sky-400" />
            <span>Mathematical & Engineering Rationale</span>
          </div>

          <ul className="space-y-1.5 text-xs text-slate-300">
            {evaluation.rationalePoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
