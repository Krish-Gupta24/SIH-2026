"use client";

import React from "react";
import {
  Award,
  Target,
  Info,
} from "lucide-react";
import {
  ComparisonObjectiveId,
  WinnerEvaluationResult,
} from "../types";
import { COMPARISON_OBJECTIVES } from "../comparison-engine";
import { Status } from "@/components/v0/platform-components";

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
    <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-foreground shrink-0">
            <Award className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Status strong>Decision Engine</Status>
            </div>
          </div>
        </div>

        {/* Objective Selector */}
        <div className="flex items-center gap-2">
          <span className="micro-label">
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
        <div className="rounded-[2rem] bg-black text-white p-7 sm:p-9 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-white/50 uppercase tracking-wider mb-3">
            <Target className="size-4 text-[#CBDCE6]" />
            <span>Design Evaluation</span>
          </div>

          <h2 className="font-editorial text-2xl sm:text-3xl font-medium tracking-tight text-white leading-tight">
            &ldquo;{evaluation.statementText}&rdquo;
          </h2>

          <div className="mt-6 flex flex-wrap items-center gap-4 pt-5 border-t border-white/10 text-xs text-white/70">
            <div className="flex items-center gap-2">
              <span className="text-white/50">Winning Candidate:</span>
              <span className="font-semibold text-white">{evaluation.winnerName}</span>
            </div>
            <span className="text-white/20">·</span>
            <div className="flex items-center gap-2">
              <span className="text-white/50">Score:</span>
              <span className="font-semibold text-[#CBDCE6]">{evaluation.score} pts</span>
            </div>
            <span className="text-white/20">·</span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white text-[10px] border border-white/15">
              {evaluation.marginOfVictory}
            </span>
          </div>
        </div>

        {/* Multi-Criteria Rationale Points */}
        <div className="rounded-2xl border border-border bg-secondary/25 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
            <Info className="size-3.5 text-foreground" />
            <span className="micro-label text-foreground">Mathematical & Engineering Reasons</span>
          </div>

          <ul className="space-y-2.5 text-xs text-[#536772]">
            {evaluation.rationalePoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-[#CBDCE6] text-black text-[9px] font-bold shrink-0 mt-0.5">
                  ✓
                </span>
                <span className="leading-relaxed text-foreground/90">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
