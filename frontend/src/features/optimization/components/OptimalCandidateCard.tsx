"use client";

import React from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Thermometer,
  Zap,
  Box,
  Layers,
  Flame,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <Card className="border-purple-500/40 bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-900 p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Rank #1 Pareto-Optimal Design
              </span>
              <Badge variant="outline" className="text-[10px] bg-purple-950/60 text-purple-300 border-purple-800/50 py-0">
                Score: {candidate.objectiveScore} pts
              </Badge>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Optimal Parameter Assignment Candidate ({candidate.id})
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => onApplyToProject(candidate)}
            className="text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Apply to Active Project</span>
          </Button>

          <Button variant="outline" size="sm" asChild className="text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-white gap-1">
            <Link href="/designer/3d">
              <Box className="h-3.5 w-3.5 text-sky-400" />
              <span>Inspect in 3D</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Highlights & Key Tradeoffs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Heating Demand</span>
          <div className="text-xl font-bold text-rose-400 mt-1">
            {m.heatingDemandKwhM2} <span className="text-xs font-normal">kWh/m²</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">
            –{heatingReductionPct}% reduction
          </span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Comfort Hours (18-24°C)</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {m.comfortHoursPct}%
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">
            +{comfortGainPct}% improvement
          </span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Pre-Dawn Min Temp</span>
          <div className="text-xl font-bold text-blue-400 mt-1">
            {m.indoorMinC}°C
          </div>
          <span className="text-[10px] text-slate-400">
            Ambient: –18.0°C
          </span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Total Heat Loss Rate</span>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {m.totalHeatLossUA} <span className="text-xs font-normal">W/K</span>
          </div>
          <span className="text-[10px] text-indigo-400">
            {m.dampingRatioPct}% Damping
          </span>
        </div>
      </div>

      {/* Winning Parameters Breakdown */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Winning Parameter Combination:
        </span>

        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
          {Object.entries(candidate.parameters).map(([key, val]) => (
            <div
              key={key}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300"
            >
              <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}:</span>
              <span className="font-mono font-bold text-sky-300">{String(val)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
