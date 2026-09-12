"use client";

import React from "react";
import { Flame, ShieldAlert, TrendingDown, Truck, Leaf, Award, Info } from "lucide-react";

interface FossilFuelDisplacementCardProps {
  heatingDemandKwhM2?: number;
  floorAreaM2?: number;
  comfortHoursPct?: number;
  projectName?: string;
}

export function FossilFuelDisplacementCard({
  heatingDemandKwhM2 = 42.5,
  floorAreaM2 = 24.0,
  comfortHoursPct = 80,
  projectName = "Passive Solar Outpost",
}: FossilFuelDisplacementCardProps) {
  // Conventional Uninsulated High-Altitude Tin Barrack Benchmark
  // Baseline seasonal heating demand in Leh winter (~180 kWh/m²)
  const baselineHeatingDemandKwhM2 = 180.0;
  const actualHeatingDemandKwhM2 = Math.min(baselineHeatingDemandKwhM2, Math.max(0, heatingDemandKwhM2));

  const totalBaselineKwh = baselineHeatingDemandKwhM2 * floorAreaM2;
  const totalActualKwh = actualHeatingDemandKwhM2 * floorAreaM2;
  const savedHeatingKwh = Math.max(0, totalBaselineKwh - totalActualKwh);

  // High-Altitude Physics Constants:
  // - 1 liter Superior Kerosene Oil (SKO) = ~9.6 kWh lower heating value
  // - Typical high-altitude vented Bukhari thermal efficiency = 65%
  // - Delivered heat per liter = 9.6 * 0.65 = 6.24 kWh/L
  // - Typical Bukhari burn rate = ~0.9 L/hour
  // - Carbon emissions = 2.52 kg CO2e / liter of kerosene
  // - High-altitude landed fuel transport cost (forward border outposts) = ~₹120 / liter
  const keroseneLitersDisplaced = Math.round(savedHeatingKwh / 6.24);
  const bukhariHoursAvoided = Math.round(keroseneLitersDisplaced / 0.9);
  const co2AvoidedKg = Math.round(keroseneLitersDisplaced * 2.52);
  const co2AvoidedTons = (co2AvoidedKg / 1000).toFixed(2);
  const convoyCostAvoidedInr = Math.round(keroseneLitersDisplaced * 120);
  const percentSaved = Math.round(((baselineHeatingDemandKwhM2 - actualHeatingDemandKwhM2) / baselineHeatingDemandKwhM2) * 100);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-7 sm:p-9 shadow-sm relative overflow-hidden">
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6 relative">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Flame className="size-3" /> PS 26051 Core Objective
            </span>
            <span className="text-[11px] text-muted-foreground font-semibold">
              Minimization of Fossil Fuel Application
            </span>
          </div>
          <h3 className="font-editorial mt-2 text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
            Fossil Fuel & Kerosene Bukhari Mitigation
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Quantified thermal displacement against a standard uninsulated galvanized iron (CGI) defense barrack under Leh/Ladakh winter conditions.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-3 border border-border shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Heating Energy Saved</div>
            <div className="text-2xl font-bold font-mono text-emerald-500 mt-0.5">
              {percentSaved}%
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Passive Ratio</div>
            <div className="text-2xl font-bold font-mono text-foreground mt-0.5">
              {comfortHoursPct}%
            </div>
          </div>
        </div>
      </div>

      {/* 4 Impact Metric Cells */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Metric 1: Kerosene Saved */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Kerosene (SKO) Saved</span>
            <Flame className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight pt-1">
            {keroseneLitersDisplaced.toLocaleString()} <span className="text-sm font-sans font-normal text-muted-foreground">L / season</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Replaces defense-grade heating fuel in forward Himalayan outposts.
          </p>
        </div>

        {/* Metric 2: Bukhari Burn Hours */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Bukhari Hours Avoided</span>
            <TrendingDown className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight pt-1">
            {bukhariHoursAvoided.toLocaleString()} <span className="text-sm font-sans font-normal text-muted-foreground">hrs / winter</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Reduces indoor carbon monoxide, PM2.5 soot, and fire hazards.
          </p>
        </div>

        {/* Metric 3: CO2 Mitigated */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">CO₂e Mitigated</span>
            <Leaf className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight pt-1">
            {co2AvoidedTons} <span className="text-sm font-sans font-normal text-muted-foreground">metric tons</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Protects fragile high-altitude glaciated Himalayan ecosystems.
          </p>
        </div>

        {/* Metric 4: Logistics Cost Avoided */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Logistics Cost Saved</span>
            <Truck className="size-4 text-sky-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight pt-1">
            ₹{convoyCostAvoidedInr.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Avoids hazardous mountain convoy & air-drop fuel delivery costs.
          </p>
        </div>
      </div>

      {/* Military Field Note */}
      <div className="mt-6 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 flex items-start gap-3 text-xs text-foreground/80">
        <Info className="size-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-foreground">Operational Defense Context: </span>
          In high-altitude border regions like Leh, Siachen base, and Nyoma, troops burn Superior Kerosene Oil (SKO) in vented Bukhari stoves. Every liter displaced by our passive solar thermal storage wall directly eliminates hazardous snow-pass road transport logistics while ensuring continuous unconditioned thermal comfort above freezing (&gt;0°C).
        </div>
      </div>
    </div>
  );
}
