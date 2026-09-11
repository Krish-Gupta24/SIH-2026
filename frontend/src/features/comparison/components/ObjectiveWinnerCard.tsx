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
    <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label text-foreground">
                Engineering Synthesis
              </span>
              <Badge variant="outline" className="text-[10px] py-0 font-medium">
                Decision Engine
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Definitive ranking derived from physical thermodynamic performance criteria.
            </p>
          </div>
        </div>

        {/* Objective Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            Objective:
          </span>
          <select
            value={selectedObjectiveId}
            onChange={(e) => onSelectObjective(e.target.value as ComparisonObjectiveId)}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring shadow-sm cursor-pointer"
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
      <div className="space-y-4">
        <div className="rounded-2xl bg-black text-white p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-white/50 uppercase tracking-wider mb-2">
            <Target className="h-4 w-4 text-emerald-400" />
            <span>Design Evaluation Determination</span>
          </div>

          <h2 className="font-editorial text-2xl sm:text-3xl font-medium tracking-tight text-white leading-tight">
            &ldquo;{evaluation.statementText}&rdquo;
          </h2>

          <div className="mt-5 flex flex-wrap items-center gap-4 pt-4 border-t border-white/10 text-xs text-white/70">
            <div className="flex items-center gap-1.5">
              <span className="text-white/40">Winning Candidate:</span>
              <span className="font-semibold text-white">{evaluation.winnerName}</span>
            </div>
            <span className="text-white/20">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white/40">Score:</span>
              <span className="font-medium text-emerald-400">{evaluation.score} pts</span>
            </div>
            <span className="text-white/20">·</span>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-medium text-emerald-300 text-[10px] border border-emerald-500/30">
              {evaluation.marginOfVictory}
            </span>
          </div>
        </div>

        {/* Multi-Criteria Rationale Points */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
            <Info className="h-3.5 w-3.5 text-sky-500" />
            <span>Mathematical & Engineering Rationale</span>
          </div>

          <ul className="space-y-2 text-xs text-muted-foreground">
            {evaluation.rationalePoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
