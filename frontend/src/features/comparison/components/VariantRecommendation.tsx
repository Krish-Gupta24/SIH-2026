"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Award,
  Zap,
  Check,
  Building2,
} from "lucide-react";
import { ShelterVariant, VariantMetrics } from "../variant-calculator";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { ShelterModel } from "@/types/shelter";

interface VariantRecommendationProps {
  variants: ShelterVariant[];
  metrics: VariantMetrics[];
  activeProject: ShelterModel | null;
}

export function VariantRecommendation({
  variants,
  metrics,
  activeProject,
}: VariantRecommendationProps) {
  const { updateProject } = useShelterStore();
  const [applied, setApplied] = useState(false);

  if (variants.length === 0 || metrics.length === 0) return null;

  // Determine winning variant index by highest compositeEfficiencyScore
  let winnerIndex = 0;
  let highestScore = -1;

  metrics.forEach((m, idx) => {
    if (m.compositeEfficiencyScore > highestScore) {
      highestScore = m.compositeEfficiencyScore;
      winnerIndex = idx;
    }
  });

  const winner = variants[winnerIndex];
  const winnerMetrics = metrics[winnerIndex];
  const letter = String.fromCharCode(65 + winnerIndex);

  const handleApplyToActiveShelter = () => {
    if (!activeProject) return;

    // Build updated shelter model with the winning variant's parameters
    const updatedModel: ShelterModel = {
      ...activeProject,
      geometry: {
        ...activeProject.geometry,
        length: winner.length,
        width: winner.width,
        height: winner.height,
      },
      envelope: {
        ...activeProject.envelope,
        walls: {
          ...activeProject.envelope.walls,
          north: {
            ...activeProject.envelope.walls.north,
            layers: [
              {
                materialId: winner.wallInsulationMatId,
                name: winner.wallInsulationMatId.includes("eps") ? "Expanded Polystyrene (EPS)" : "Continuous Insulation",
                thickness: winner.wallInsulationThicknessMm / 1000,
              },
              {
                materialId: winner.wallMassMatId,
                name: winner.wallMassMatId.includes("rammed") ? "Stabilized Rammed Earth" : "Thermal Mass",
                thickness: winner.wallMassThicknessMm / 1000,
              },
            ],
          },
          south: {
            ...activeProject.envelope.walls.south,
            layers: [
              {
                materialId: winner.wallMassMatId,
                name: "Passive Solar Storage Mass",
                thickness: winner.wallMassThicknessMm / 1000,
              },
              {
                materialId: winner.wallInsulationMatId,
                name: "Exterior Continuous Insulation",
                thickness: (winner.wallInsulationThicknessMm * 0.75) / 1000,
              },
            ],
          },
          east: {
            ...activeProject.envelope.walls.east,
            layers: [
              {
                materialId: winner.wallInsulationMatId,
                name: "Continuous Insulation",
                thickness: winner.wallInsulationThicknessMm / 1000,
              },
              {
                materialId: winner.wallMassMatId,
                name: "Thermal Mass Core",
                thickness: (winner.wallMassThicknessMm * 0.8) / 1000,
              },
            ],
          },
          west: {
            ...activeProject.envelope.walls.west,
            layers: [
              {
                materialId: winner.wallInsulationMatId,
                name: "Continuous Insulation",
                thickness: winner.wallInsulationThicknessMm / 1000,
              },
              {
                materialId: winner.wallMassMatId,
                name: "Thermal Mass Core",
                thickness: (winner.wallMassThicknessMm * 0.8) / 1000,
              },
            ],
          },
        },
        roof: {
          ...activeProject.envelope.roof,
          layers: [
            {
              materialId: winner.roofInsulationMatId,
              name: "Super-Insulated Roof Core",
              thickness: winner.roofInsulationThicknessMm / 1000,
            },
          ],
        },
      },
    };

    updateProject(activeProject.id, updatedModel);
    setApplied(true);
    setTimeout(() => setApplied(false), 4000);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-card to-card border border-emerald-500/30 p-6 shadow-sm space-y-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-black shadow-xs">
              <Award className="size-3" />  Recommended Design Winner
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Composite Score: {winnerMetrics.compositeEfficiencyScore}/100
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Variant {letter}: {winner.name}
          </h3>
        </div>

        {/* Action Button: Apply to Active Shelter */}
        <button
          type="button"
          onClick={handleApplyToActiveShelter}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${applied
              ? "bg-emerald-500 text-black shadow-emerald-500/20"
              : "bg-foreground text-background hover:opacity-90"
            }`}
        >
          {applied ? (
            <>
              <Check className="size-4" />
              <span>Applied to Active Shelter!</span>
            </>
          ) : (
            <>
              <Sparkles className="size-4 text-emerald-400" />
              <span>Apply Winner to Active Shelter</span>
              <ArrowRight className="size-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Rationale Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-500" /> Thermal Equilibrium
          </span>
          <p className="text-sm font-bold text-foreground">
            {winnerMetrics.estimatedComfortPct}% Annual Comfort
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Maintains 18°C–24°C living zone with low Wall U-value ({winnerMetrics.wallUValue} W/m²K) and continuous Roof U-value ({winnerMetrics.roofUValue} W/m²K).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Zap className="size-3.5 text-amber-500" /> Zero-Fuel Autonomy
          </span>
          <p className="text-sm font-bold text-foreground">
            +{winnerMetrics.estimatedFuelDisplacementLiters.toLocaleString()} L / yr Displaced
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Eliminates high-altitude military kerosene convoys, yielding approx ₹{(winnerMetrics.estimatedAnnualCostSavingsInr / 100000).toFixed(2)} Lakhs annual savings per outpost.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building2 className="size-3.5 text-sky-500" /> Transportability & Sizing
          </span>
          <p className="text-sm font-bold text-foreground">
            {winnerMetrics.totalEnvelopeWeightKg.toLocaleString()} kg Total Weight
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Optimized {winner.length}×{winner.width}×{winner.height}m volume meets forward-defense platoon density while remaining air-transportable by medium-lift helicopters.
          </p>
        </div>
      </div>
    </div>
  );
}
