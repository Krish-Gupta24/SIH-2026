"use client";

import React, { useState } from "react";
import { Flame, ShieldAlert, TrendingDown, Truck, Leaf, Award, Info, Sliders, ChevronDown, ChevronUp } from "lucide-react";

interface FossilFuelDisplacementCardProps {
  heatingDemandKwhM2?: number;
  floorAreaM2?: number;
  comfortHoursPct?: number;
  projectName?: string;
  baselineDemandKwhM2Default?: number;
}

const FUEL_SPECS = {
  SKO: {
    name: "Superior Kerosene Oil (SKO)",
    shortName: "Kerosene (SKO)",
    lhvKwhPerUnit: 9.6,
    co2KgPerUnit: 2.52,
    unit: "L",
    defaultCost: 120,
    burnRateUnitPerHour: 0.9,
    description: "Standard defense-grade stove heating fuel for vented Bukharis in Ladakh/Siachen.",
  },
  HSD: {
    name: "High Speed Diesel (HSD)",
    shortName: "Diesel (HSD)",
    lhvKwhPerUnit: 10.0,
    co2KgPerUnit: 2.68,
    unit: "L",
    defaultCost: 135,
    burnRateUnitPerHour: 0.85,
    description: "Winter-grade alpine diesel utilized for generator sets and forced-air heaters.",
  },
  LPG: {
    name: "Liquefied Petroleum Gas (LPG)",
    shortName: "LPG Cylinders",
    lhvKwhPerUnit: 12.8,
    co2KgPerUnit: 3.0,
    unit: "kg",
    defaultCost: 160,
    burnRateUnitPerHour: 0.7,
    description: "Pressurized composite cylinders transported over high passes for clean combustion.",
  },
};

export function FossilFuelDisplacementCard({
  heatingDemandKwhM2 = 42.5,
  floorAreaM2 = 24.0,
  comfortHoursPct = 80,
  projectName = "Passive Solar Outpost",
  baselineDemandKwhM2Default = 180.0,
}: FossilFuelDisplacementCardProps) {
  // Operational logistics state
  const [fuelType, setFuelType] = useState<"SKO" | "HSD" | "LPG">("SKO");
  const [convoyCostPerUnit, setConvoyCostPerUnit] = useState<number>(120);
  const [stoveEfficiencyPct, setStoveEfficiencyPct] = useState<number>(65);
  const [baselineHeatingDemandKwhM2, setBaselineHeatingDemandKwhM2] = useState<number>(baselineDemandKwhM2Default);
  const [showLogisticsControls, setShowLogisticsControls] = useState<boolean>(false);

  const spec = FUEL_SPECS[fuelType];
  const effectiveDeliveredKwh = spec.lhvKwhPerUnit * (stoveEfficiencyPct / 100);

  const actualHeatingDemandKwhM2 = Math.min(baselineHeatingDemandKwhM2, Math.max(0, heatingDemandKwhM2));
  const totalBaselineKwh = baselineHeatingDemandKwhM2 * floorAreaM2;
  const totalActualKwh = actualHeatingDemandKwhM2 * floorAreaM2;
  const savedHeatingKwh = Math.max(0, totalBaselineKwh - totalActualKwh);

  const fuelUnitsDisplaced = Math.round(savedHeatingKwh / effectiveDeliveredKwh);
  const stoveHoursAvoided = Math.round(fuelUnitsDisplaced / spec.burnRateUnitPerHour);
  const co2AvoidedKg = Math.round(fuelUnitsDisplaced * spec.co2KgPerUnit);
  const co2AvoidedTons = (co2AvoidedKg / 1000).toFixed(2);
  const convoyCostAvoidedInr = Math.round(fuelUnitsDisplaced * convoyCostPerUnit);
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
            Quantified thermal displacement against uninsulated galvanized tin (CGI) defense barrack baseline under alpine winter conditions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowLogisticsControls(!showLogisticsControls)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary/70 transition-colors"
          >
            <Sliders className="size-3.5 text-muted-foreground" />
            <span>Logistics Parameters</span>
            {showLogisticsControls ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-3 border border-border shrink-0">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Heating Saved</div>
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
      </div>

      {/* Interactive Logistics Drawer */}
      {showLogisticsControls && (
        <div className="mt-5 rounded-2xl border border-border bg-secondary/20 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Operational Defense Logistics & Convoy Configuration
            </span>
            <span className="text-[11px] text-muted-foreground">Real-time dynamic recalculation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            {/* Fuel Type */}
            <div>
              <label className="block text-muted-foreground font-semibold mb-1.5">Fuel Specification</label>
              <div className="grid grid-cols-3 gap-1">
                {(["SKO", "HSD", "LPG"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setFuelType(t);
                      setConvoyCostPerUnit(FUEL_SPECS[t].defaultCost);
                    }}
                    className={`rounded-lg py-1.5 text-xs font-bold border transition-colors ${
                      fuelType === t
                        ? "bg-amber-500 text-slate-950 border-amber-500"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{spec.shortName}</p>
            </div>

            {/* Landed Convoy Cost */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-muted-foreground font-semibold">Landed Cost</label>
                <span className="font-mono font-bold text-foreground">₹{convoyCostPerUnit} / {spec.unit}</span>
              </div>
              <input
                type="range"
                min="70"
                max="350"
                step="5"
                value={convoyCostPerUnit}
                onChange={(e) => setConvoyCostPerUnit(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[10px] text-muted-foreground">Forward mountain pass delivery cost</span>
            </div>

            {/* Stove Efficiency */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-muted-foreground font-semibold">Bukhari / Heater Efficiency</label>
                <span className="font-mono font-bold text-foreground">{stoveEfficiencyPct}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="90"
                step="5"
                value={stoveEfficiencyPct}
                onChange={(e) => setStoveEfficiencyPct(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-[10px] text-muted-foreground">Delivered heat: {effectiveDeliveredKwh.toFixed(2)} kWh/{spec.unit}</span>
            </div>

            {/* Baseline Tin Demand */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-muted-foreground font-semibold">Uninsulated Barrack Baseline</label>
                <span className="font-mono font-bold text-foreground">{baselineHeatingDemandKwhM2} kWh/m²</span>
              </div>
              <input
                type="range"
                min="120"
                max="260"
                step="10"
                value={baselineHeatingDemandKwhM2}
                onChange={(e) => setBaselineHeatingDemandKwhM2(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
              <span className="text-[10px] text-muted-foreground">Tin barrack seasonal heating load</span>
            </div>
          </div>
        </div>
      )}

      {/* 4 Impact Metric Cells */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Metric 1: Fuel Saved */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{spec.shortName} Saved</span>
            <Flame className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight pt-1">
            {fuelUnitsDisplaced.toLocaleString()} <span className="text-sm font-sans font-normal text-muted-foreground">{spec.unit} / season</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Replaces fossil combustion in forward Himalayan defense shelters.
          </p>
        </div>

        {/* Metric 2: Bukhari Burn Hours */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Heating Burn Hours Avoided</span>
            <TrendingDown className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight pt-1">
            {stoveHoursAvoided.toLocaleString()} <span className="text-sm font-sans font-normal text-muted-foreground">hrs / winter</span>
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
            Avoids hazardous mountain convoy & snow-pass delivery overhead.
          </p>
        </div>
      </div>

      {/* Military Field Note */}
      <div className="mt-6 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 flex items-start gap-3 text-xs text-foreground/80">
        <Info className="size-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-foreground">Operational Defense Context: </span>
          In high-altitude forward border sectors (Leh, Siachen Base, Nyoma, Daulat Beg Oldie), troops rely heavily on fossil heating fuels. Every {spec.unit} displaced by our passive solar thermal storage wall eliminates hazardous snow-pass transport logistics while maintaining safe continuous non-freezing thermal conditions (&gt;0°C).
        </div>
      </div>
    </div>
  );
}
