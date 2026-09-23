"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Check,
  ChevronRight,
  TrendingDown,
  Layers,
  Sun,
  Flame,
  IndianRupee,
  Clock,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DesignTradeoffCandidate } from "../energy-types";

interface DesignTradeoffTableProps {
  candidates: DesignTradeoffCandidate[];
  onSelectCandidate?: (candidate: DesignTradeoffCandidate) => void;
  onApplyToShelterModel?: (candidate: DesignTradeoffCandidate) => void;
}

export function DesignTradeoffTable({
  candidates,
  onSelectCandidate,
  onApplyToShelterModel,
}: DesignTradeoffTableProps) {
  const [selectedId, setSelectedId] = useState<string>(candidates[0]?.id || "");
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleApply = (candidate: DesignTradeoffCandidate) => {
    setAppliedId(candidate.id);
    onApplyToShelterModel?.(candidate);
    setTimeout(() => setAppliedId(null), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Multi-Objective Pareto Design Candidates
          </h3>
          <p className="text-xs text-slate-400">
            No single configuration is universally optimal. Review trade-offs across Comfort, Energy, Kerosene, and Lifecycle Cost.
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
          {candidates.length} Evaluated Architectures
        </Badge>
      </div>

      {/* Grid of Design Candidates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map((cand) => {
          const isSelected = selectedId === cand.id;
          const isApplied = appliedId === cand.id;

          return (
            <Card
              key={cand.id}
              className={`p-4 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? "bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
              }`}
              onClick={() => {
                setSelectedId(cand.id);
                onSelectCandidate?.(cand);
              }}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      {cand.name}
                      {cand.isCurrentProposed && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{cand.tagline}</p>
                  </div>
                  {cand.isParetoOptimal && (
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 shrink-0">
                      Pareto Efficient
                    </Badge>
                  )}
                </div>

                {/* Core 4-Axis KPI Grid */}
                <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-center">
                  <div className="p-1.5 rounded bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" /> Comfort
                    </span>
                    <span className="text-xs font-bold text-slate-100">
                      {cand.metrics.comfortHoursPerDay} h/day
                    </span>
                  </div>

                  <div className="p-1.5 rounded bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
                      <Sun className="w-3 h-3 text-yellow-400" /> Energy
                    </span>
                    <span className="text-xs font-bold text-cyan-400">
                      {cand.metrics.energyRequiredKwhPerDay} kWh/d
                    </span>
                  </div>

                  <div className="p-1.5 rounded bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" /> Kerosene
                    </span>
                    <span className="text-xs font-bold text-amber-400">
                      {cand.metrics.keroseneLPerDay} L/day
                    </span>
                  </div>

                  <div className="p-1.5 rounded bg-white/[0.02]">
                    <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
                      <IndianRupee className="w-3 h-3 text-emerald-400" /> Total Cost
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      ₹{cand.metrics.totalCostPerDay}/day
                    </span>
                  </div>
                </div>

                {/* Architectural Parameters Summary */}
                <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-800/60 pt-2.5">
                  <div className="flex justify-between">
                    <span>Insulation & Mass:</span>
                    <span className="text-slate-300 font-medium">{cand.parameters.insulationThicknessMm}mm | {cand.parameters.thermalMassType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aperture & Glazing:</span>
                    <span className="text-slate-300 font-medium">{cand.parameters.windowAreaM2} m² @ {cand.parameters.orientationDeg}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Solar Hardware:</span>
                    <span className="text-slate-300 font-medium">
                      {cand.parameters.roofPanelsCount}x Roof PV ({cand.parameters.solarPvKw.toFixed(1)} kWp)
                      {cand.parameters.hasWindowSolarPanes ? " + BIPV Glass" : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-emerald-400/90">
                  {cand.metrics.keroseneSavingsPct}% Kerosene saved
                </span>
                <Button
                  size="sm"
                  variant={cand.isCurrentProposed ? "secondary" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(cand);
                  }}
                  className="h-7 text-xs px-2.5"
                >
                  {isApplied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Applied!
                    </>
                  ) : cand.isCurrentProposed ? (
                    "Active Model"
                  ) : (
                    "Adopt Design"
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
