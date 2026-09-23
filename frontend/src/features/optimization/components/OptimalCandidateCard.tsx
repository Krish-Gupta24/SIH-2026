"use client";

import React from "react";
import Link from "next/link";
import {
  Award,
  Sparkles,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CandidateResult, OptimizationObjectiveId } from "../types";

interface OptimalCandidateCardProps {
  candidate: CandidateResult;
  objective: OptimizationObjectiveId;
  onApplyToProject: (candidate: CandidateResult) => void;
  baseHeatingDemand?: number;
  baseComfortHours?: number;
}

export function OptimalCandidateCard({
  candidate,
  objective,
  onApplyToProject,
  baseHeatingDemand = 165.0,
  baseComfortHours = 35.0,
}: OptimalCandidateCardProps) {
  const m = candidate.metrics;

  const heatingReductionPct = Math.max(
    0,
    Math.round(((baseHeatingDemand - m.heatingDemandKwhM2) / baseHeatingDemand) * 100)
  );
  const comfortGainPct = Math.max(
    0,
    Math.round(m.comfortHoursPct - baseComfortHours)
  );

  return (
    <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] relative overflow-hidden space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-secondary flex items-center justify-center text-foreground border border-border shadow-sm shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label text-emerald-600 dark:text-emerald-400">
                Rank #1 Pareto-Optimal Design
              </span>
              <span className="rounded-full border border-border bg-secondary/60 text-foreground font-semibold px-2.5 py-0.5 text-[10px] font-mono">
                Score: {candidate.objectiveScore} pts
              </span>
            </div>
            <h2 className="font-editorial text-2xl font-medium text-foreground mt-0.5 tracking-tight">
              Optimal Parameter Assignment Candidate ({candidate.id})
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => onApplyToProject(candidate)}
            className="rounded-full text-xs font-semibold bg-black text-white hover:bg-[#6E818F] shadow-sm gap-1.5 px-5 h-9"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Apply to Active Project</span>
          </Button>

          <Button variant="outline" size="sm" asChild className="rounded-full text-xs border-border bg-card hover:bg-secondary text-foreground gap-1.5 px-4 h-9 shadow-sm">
            <Link href="/designer/3d">
              <Box className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Inspect in 3D</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Highlights & Key Tradeoffs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-4 text-xs font-mono">
        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
          <span className="text-muted-foreground text-[10px] uppercase font-sans font-semibold">Heating Demand</span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {m.heatingDemandKwhM2} <span className="text-xs font-normal">kWh/m²</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            –{heatingReductionPct}% reduction
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
          <span className="text-muted-foreground text-[10px] uppercase font-sans font-semibold">Comfort Hours (18-24°C)</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {m.comfortHoursPct}%
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            +{comfortGainPct}% improvement
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
          <span className="text-muted-foreground text-[10px] uppercase font-sans font-semibold">Pre-Dawn Min Temp</span>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
            {m.indoorMinC}°C
          </div>
          <span className="text-[10px] text-muted-foreground">
            Ambient: –18.0°C
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
          <span className="text-muted-foreground text-[10px] uppercase font-sans font-semibold">Total Heat Loss Rate</span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {m.totalHeatLossUA} <span className="text-xs font-normal">W/K</span>
          </div>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
            {m.dampingRatioPct}% Damping
          </span>
        </div>
      </div>

      {/* Winning Parameters Breakdown */}
      <div className="mt-4 pt-4 border-t border-border">
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
          Winning Parameter Combination:
        </span>

        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
          {Object.entries(candidate.parameters).map(([key, val]) => (
            <div
              key={key}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/50 border border-border text-foreground"
            >
              <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
              <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{String(val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
