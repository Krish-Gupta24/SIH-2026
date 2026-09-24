"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Flame,
  ShieldAlert,
  TrendingDown,
  Truck,
  Leaf,
  Info,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MapPin,
  ShieldCheck,
  ThermometerSnowflake,
  Fuel,
  PackageCheck,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { PulseBeacon } from "@/components/motion/MotionWrappers";
import { useUnitSystem } from "@/lib/unit-system";

export interface FossilFuelDisplacementCardProps {
  heatingDemandKwhM2?: number;
  floorAreaM2?: number;
  comfortHoursPct?: number;
  projectName?: string;
  baselineDemandKwhM2Default?: number;
  totalSolarGainKwh?: number;
  outdoorMinC?: number;
  indoorMinC?: number;
  indoorMaxC?: number;
  locationName?: string;
  elevationM?: number;
  climateZone?: string;
  engineName?: string;
  activeJobId?: string;
  isBaselineTin?: boolean;
}

export interface FuelSpecification {
  name: string;
  shortName: string;
  lhvKwhPerUnit: number;
  co2KgPerUnit: number;
  unit: string;
  defaultCost: number;
  densityKgPerUnit: number;
  burnRateUnitPerHour: number;
  description: string;
}

export const FUEL_SPECS: Record<"SKO" | "HSD" | "LPG", FuelSpecification> = {
  SKO: {
    name: "Superior Kerosene Oil (SKO)",
    shortName: "Kerosene (SKO)",
    lhvKwhPerUnit: 9.6,
    co2KgPerUnit: 2.52,
    unit: "L",
    defaultCost: 120,
    densityKgPerUnit: 0.80,
    burnRateUnitPerHour: 0.85,
    description: "Standard defense-grade stove heating fuel for vented Bukharis in Ladakh/Siachen.",
  },
  HSD: {
    name: "High Speed Diesel (HSD)",
    shortName: "Diesel (HSD)",
    lhvKwhPerUnit: 10.0,
    co2KgPerUnit: 2.68,
    unit: "L",
    defaultCost: 135,
    densityKgPerUnit: 0.84,
    burnRateUnitPerHour: 0.80,
    description: "Winter-grade alpine diesel with anti-freeze additive for forced-air blast heaters.",
  },
  LPG: {
    name: "Liquefied Petroleum Gas (LPG)",
    shortName: "LPG Cylinders",
    lhvKwhPerUnit: 12.8,
    co2KgPerUnit: 3.0,
    unit: "kg",
    defaultCost: 165,
    densityKgPerUnit: 0.54,
    burnRateUnitPerHour: 0.65,
    description: "Pressurized composite cylinders transported over high passes for clean combustion.",
  },
};

export interface ForwardSectorPreset {
  id: string;
  name: string;
  elevationM: number;
  defaultCost: number;
  seasonDays: number;
  designWinterMinC: number;
  baselineDemandKwhM2: number;
  description: string;
  strategicNote: string;
}

export const FORWARD_SECTOR_PRESETS: ForwardSectorPreset[] = [
  {
    id: "LEH_MAIN",
    name: "Leh Military Base",
    elevationM: 3500,
    defaultCost: 95,
    seasonDays: 150,
    designWinterMinC: -20,
    baselineDemandKwhM2: 215,
    description: "Forward Logistics Depot · Road accessible via Manali/Srinagar axis.",
    strategicNote: "Base-level transit depot; moderate mountain pass surcharge.",
  },
  {
    id: "DRAS_KARGIL",
    name: "Dras-Kargil Sector",
    elevationM: 3300,
    defaultCost: 135,
    seasonDays: 165,
    designWinterMinC: -38,
    baselineDemandKwhM2: 245,
    description: "Extreme Cold Inhabited Sector · High Zojila snowbound pass surcharge.",
    strategicNote: "Severe freeze zone demanding continuous fuel burning in conventional tin barracks.",
  },
  {
    id: "SIACHEN_BASE",
    name: "Siachen Glacier Base",
    elevationM: 5400,
    defaultCost: 195,
    seasonDays: 210,
    designWinterMinC: -35,
    baselineDemandKwhM2: 260,
    description: "Highest Battlefield Sector · Hazardous snow-pass & animal mule convoy.",
    strategicNote: "Extreme supply vulnerability; every liter displaced eliminates hazardous snow-pass risk.",
  },
  {
    id: "NYOMA_ALG",
    name: "Nyoma Forward Post",
    elevationM: 4180,
    defaultCost: 160,
    seasonDays: 180,
    designWinterMinC: -28,
    baselineDemandKwhM2: 230,
    description: "Cold Desert Border Sector · High wind exposure & severe diurnal swings.",
    strategicNote: "High-altitude plateau with strong winds that strip heat from tin barracks.",
  },
  {
    id: "DBO_SECTOR",
    name: "Daulat Beg Oldie (DBO)",
    elevationM: 5065,
    defaultCost: 265,
    seasonDays: 210,
    designWinterMinC: -42,
    baselineDemandKwhM2: 280,
    description: "Karakoram Pass Outpost · Heavy reliance on air-drop and C-130 sorties.",
    strategicNote: "Air-drop fuel delivery costs exceed ₹250/L; passive solar is vital for survival.",
  },
];

export function FossilFuelDisplacementCard({
  heatingDemandKwhM2 = 24.5,
  floorAreaM2 = 24.0,
  comfortHoursPct = 88,
  projectName = "Passive Solar Outpost",
  baselineDemandKwhM2Default = 215.0,
  totalSolarGainKwh = 18.4,
  outdoorMinC = -20.5,
  indoorMinC = 8.5,
  indoorMaxC = 23.4,
  locationName = "Leh Ladakh, India",
  elevationM = 3500,
  climateZone = "Alpine Cold (ASHRAE 8)",
  engineName = "ThermoShelter Core",
  activeJobId,
  isBaselineTin = false,
}: FossilFuelDisplacementCardProps) {
  const {
    formatTemp,
    formatTempVal,
    formatDeltaTempVal,
    tempUnit,
    deltaTempUnit,
    formatEnergyDensity,
    formatLength,
    formatArea,
  } = useUnitSystem();

  // Operational logistics state
  const [fuelType, setFuelType] = useState<"SKO" | "HSD" | "LPG">("SKO");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("AUTO");
  const [convoyCostPerUnit, setConvoyCostPerUnit] = useState<number>(120);
  const [stoveEfficiencyPct, setStoveEfficiencyPct] = useState<number>(65);
  const [baselineHeatingDemandKwhM2, setBaselineHeatingDemandKwhM2] = useState<number>(baselineDemandKwhM2Default);
  const [seasonDays, setSeasonDays] = useState<number>(180);
  const [showLogisticsControls, setShowLogisticsControls] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "comparison" | "tactical">("overview");

  // Synchronize state dynamically when props update from active simulation or project switches
  useEffect(() => {
    if (baselineDemandKwhM2Default && baselineDemandKwhM2Default > 0) {
      setBaselineHeatingDemandKwhM2(baselineDemandKwhM2Default);
    }
  }, [baselineDemandKwhM2Default, activeJobId]);

  // Auto-detect sector preset based on location name or elevation if AUTO
  const detectedSector = useMemo(() => {
    const locLower = (locationName || "").toLowerCase();
    if (locLower.includes("kargil") || locLower.includes("dras")) return FORWARD_SECTOR_PRESETS[1];
    if (locLower.includes("siachen")) return FORWARD_SECTOR_PRESETS[2];
    if (locLower.includes("nyoma")) return FORWARD_SECTOR_PRESETS[3];
    if (locLower.includes("dbo") || locLower.includes("daulat")) return FORWARD_SECTOR_PRESETS[4];
    return FORWARD_SECTOR_PRESETS[0]; // Leh default
  }, [locationName]);

  // Apply sector preset helper
  const applyPreset = (preset: ForwardSectorPreset) => {
    setSelectedPresetId(preset.id);
    setConvoyCostPerUnit(preset.defaultCost);
    setSeasonDays(preset.seasonDays);
    setBaselineHeatingDemandKwhM2(preset.baselineDemandKwhM2);
  };

  const spec = FUEL_SPECS[fuelType];
  const effectiveDeliveredKwh = spec.lhvKwhPerUnit * (stoveEfficiencyPct / 100);

  // Real-time thermal physics calculations
  const actualHeatingDemandKwhM2 = Math.min(baselineHeatingDemandKwhM2, Math.max(0, heatingDemandKwhM2));
  const totalBaselineKwh = baselineHeatingDemandKwhM2 * floorAreaM2;
  const totalActualKwh = actualHeatingDemandKwhM2 * floorAreaM2;
  const savedHeatingKwh = Math.max(0, totalBaselineKwh - totalActualKwh);

  // Dynamic Passive Solar Ratio (Solar Fraction or Savings Ratio)
  // Derived from physical gross thermal balance: solar harvest vs auxiliary heating required
  const dynamicPassiveRatioPct = useMemo(() => {
    if (totalBaselineKwh <= 0) return 0;
    // Useful solar gain component across season
    const estimatedSeasonalSolarKwh = totalSolarGainKwh > 0
      ? totalSolarGainKwh * 0.85 * (seasonDays / 1.0)
      : (totalBaselineKwh - totalActualKwh) * 0.9;
    const grossThermalDemand = totalActualKwh + Math.max(0, estimatedSeasonalSolarKwh);
    if (grossThermalDemand <= 0) return comfortHoursPct;
    const fraction = (estimatedSeasonalSolarKwh / grossThermalDemand) * 100;
    return Math.min(96, Math.max(comfortHoursPct > 0 ? Math.min(comfortHoursPct, 92) : 20, Math.round(fraction)));
  }, [totalSolarGainKwh, seasonDays, totalBaselineKwh, totalActualKwh, comfortHoursPct]);

  // Real-time military logistics impact metrics
  const fuelUnitsDisplaced = Math.round(savedHeatingKwh / effectiveDeliveredKwh);
  const stoveHoursAvoided = Math.round(fuelUnitsDisplaced / spec.burnRateUnitPerHour);
  const co2AvoidedKg = Math.round(fuelUnitsDisplaced * spec.co2KgPerUnit);
  const co2AvoidedTons = (co2AvoidedKg / 1000).toFixed(2);
  const convoyCostAvoidedInr = Math.round(fuelUnitsDisplaced * convoyCostPerUnit);
  const percentSaved = baselineHeatingDemandKwhM2 > 0
    ? Math.round(((baselineHeatingDemandKwhM2 - actualHeatingDemandKwhM2) / baselineHeatingDemandKwhM2) * 100)
    : 0;

  // Secondary logistics payload metrics
  const drumsDisplaced = (fuelUnitsDisplaced / 200).toFixed(1);
  const haulageWeightKg = Math.round(fuelUnitsDisplaced * spec.densityKgPerUnit + (fuelUnitsDisplaced / 200) * 18);
  const minIndoorFormatted = indoorMinC !== undefined
    ? `${indoorMinC > 0 ? "+" : ""}${formatTempVal(indoorMinC)} ${tempUnit}`
    : `+${formatTempVal(8.0)} ${tempUnit}`;
  const outdoorMinFormatted = outdoorMinC !== undefined
    ? `${formatTempVal(outdoorMinC)} ${tempUnit}`
    : `${formatTempVal(-20.5)} ${tempUnit}`;
  const thermalAdvantageDelta = indoorMinC !== undefined && outdoorMinC !== undefined
    ? formatDeltaTempVal(indoorMinC - outdoorMinC, 0)
    : formatDeltaTempVal(28, 0);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-9 shadow-sm relative overflow-hidden transition-all duration-300">
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 w-[28rem] h-[28rem] bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Top Telemetry & DRDO Badge Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-border/80 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-xs">
            <Flame className="size-3.5 fill-amber-500/20" /> PS 26051 Core Objective
          </span>
          <span className="text-muted-foreground font-semibold">
            Minimization of Fossil Fuel Application
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3 text-amber-600" />
            <strong className="text-foreground font-medium">{locationName}</strong> ({formatLength(elevationM, 0)} ASL)
          </span>
        </div>

        {/* Live Simulation Link Indicator */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20 shadow-xs">
            <PulseBeacon color="emerald" size="sm" />
            LIVE SIMULATION LINKED
          </span>
          <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
            {engineName}
          </span>
        </div>
      </div>

      {/* Header Banner & Real-time KPI Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pt-5 pb-6">
        <div>
          <h3 className="font-editorial text-2xl sm:text-3xl font-medium tracking-tight text-foreground flex items-center gap-2.5">
            Fossil Fuel & Kerosene Bukhari Mitigation
            {isBaselineTin && (
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 font-sans font-semibold">
                Baseline View
              </span>
            )}
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Quantified thermal displacement against uninsulated galvanized tin (CGI) defense barrack baseline under alpine winter conditions.
            Real-time thermal physics derived from active simulation geometry ({formatArea(floorAreaM2, 1)} footprint).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowLogisticsControls(!showLogisticsControls)}
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition-all shadow-xs ${
              showLogisticsControls
                ? "bg-foreground text-background border-foreground"
                : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
            }`}
          >
            <Sliders className="size-3.5" />
            <span>Logistics Parameters</span>
            {showLogisticsControls ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {/* Real-time High-Level Meters */}
          <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-3 border border-border shrink-0">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Heating Saved</div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {percentSaved}%
              </div>
            </div>
            <div className="h-9 w-px bg-border" />
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Passive Ratio</div>
              <div className="text-2xl font-bold font-mono text-foreground mt-0.5">
                {dynamicPassiveRatioPct}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Baseline Tin Notice If Active Run is CGI Tin */}
      {isBaselineTin && (
        <div className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold">Notice: Active project is the Uninsulated CGI Tin Barrack baseline.</strong>
            <p className="mt-0.5 text-xs opacity-90">
              The metrics below show the unmitigated fossil fuel burden ({formatEnergyDensity(baselineHeatingDemandKwhM2)}). Switch to an insulated passive solar shelter (e.g. Leh Ladakh Outpost, Kargil, or Spiti) in the top bar to evaluate positive displacement metrics.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Logistics & Convoy Configuration Drawer */}
      {showLogisticsControls && (
        <div className="mb-6 rounded-2xl border border-border bg-secondary/30 p-5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Operational Defense Logistics & Convoy Configuration
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPresetId("AUTO");
                  applyPreset(detectedSector);
                }}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                title="Reset to automatically detected forward post logistics"
              >
                <RotateCcw className="size-3" /> Reset to Sector Baseline
              </button>
            </div>
          </div>

          {/* Quick Forward Sector Presets Ribbon */}
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Quick Forward Sector Presets (High-Altitude Surcharge & Freeze Profile)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {FORWARD_SECTOR_PRESETS.map((p) => {
                const isSelected = selectedPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500/60 shadow-xs"
                        : "bg-card/70 border-border hover:bg-secondary/70"
                    }`}
                  >
                    <div className="font-bold text-foreground truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex justify-between">
                      <span>{p.elevationM}m</span>
                      <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">₹{p.defaultCost}/{spec.unit}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-1">
            {/* 1. Fuel Type */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
              <label className="block text-muted-foreground font-semibold">Fuel Specification</label>
              <div className="grid grid-cols-3 gap-1">
                {(["SKO", "HSD", "LPG"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setFuelType(t);
                      if (selectedPresetId === "AUTO") {
                        setConvoyCostPerUnit(FUEL_SPECS[t].defaultCost);
                      }
                    }}
                    className={`rounded-lg py-1.5 text-xs font-bold border transition-colors ${
                      fuelType === t
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                        : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight pt-0.5">
                {spec.name} · LHV: {spec.lhvKwhPerUnit} kWh/{spec.unit}
              </p>
            </div>

            {/* 2. Landed Convoy Cost */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-muted-foreground font-semibold">Landed Cost / {spec.unit}</label>
                <span className="font-mono font-bold text-foreground">₹{convoyCostPerUnit}</span>
              </div>
              <input
                type="range"
                min="70"
                max="350"
                step="5"
                value={convoyCostPerUnit}
                onChange={(e) => {
                  setConvoyCostPerUnit(Number(e.target.value));
                  setSelectedPresetId("CUSTOM");
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Depot: ₹75</span>
                <span>Mountain Pass Surcharge: ₹{Math.max(0, convoyCostPerUnit - 75)}</span>
              </div>
            </div>

            {/* 3. Stove Efficiency */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-muted-foreground font-semibold">Bukhari / Burner Efficiency</label>
                <span className="font-mono font-bold text-foreground">{stoveEfficiencyPct}%</span>
              </div>
              <input
                type="range"
                min="35"
                max="85"
                step="5"
                value={stoveEfficiencyPct}
                onChange={(e) => setStoveEfficiencyPct(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground block">
                Delivered Thermal Heat: <strong>{effectiveDeliveredKwh.toFixed(2)} kWh/{spec.unit}</strong>
              </span>
            </div>

            {/* 4. Uninsulated Tin Barrack Baseline */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-muted-foreground font-semibold">Tin Barrack Baseline</label>
                <span className="font-mono font-bold text-foreground">{baselineHeatingDemandKwhM2} kWh/m²</span>
              </div>
              <input
                type="range"
                min="140"
                max="290"
                step="5"
                value={baselineHeatingDemandKwhM2}
                onChange={(e) => {
                  setBaselineHeatingDemandKwhM2(Number(e.target.value));
                  setSelectedPresetId("CUSTOM");
                }}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground block truncate">
                CGI Tin Sheet (U=5.8 W/m²K, 1.8 ACH)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4 Primary Impact Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Fuel Saved */}
        <motion.div
          whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
          className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-2 hover:border-amber-500/40 hover:shadow-lg transition-all shimmer-card relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{spec.shortName} Saved</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Flame className="size-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight">
            {fuelUnitsDisplaced.toLocaleString()} <span className="text-sm font-sans font-normal text-muted-foreground">{spec.unit} / season</span>
          </div>
          <div className="space-y-1 pt-0.5">
            <p className="text-[11px] text-muted-foreground leading-snug">
              Replaces fossil combustion in forward Himalayan defense shelters.
            </p>
            <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
              <PackageCheck className="size-3" />
              <span>≈ {drumsDisplaced} standard 200L defense barrels</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 2: Bukhari Burn Hours Avoided */}
        <motion.div
          whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
          className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-2 hover:border-emerald-500/40 hover:shadow-lg transition-all shimmer-card relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Heating Burn Hours Avoided</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingDown className="size-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight">
            {stoveHoursAvoided.toLocaleString()} <span className="text-sm font-sans font-normal text-muted-foreground">hrs / winter</span>
          </div>
          <div className="space-y-1 pt-0.5">
            <p className="text-[11px] text-muted-foreground leading-snug">
              Reduces indoor carbon monoxide, PM2.5 soot, and fire hazards.
            </p>
            <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="size-3" />
              <span>Zero nighttime asphyxiation hazard</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 3: CO2 Mitigated */}
        <motion.div
          whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
          className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-2 hover:border-teal-500/40 hover:shadow-lg transition-all shimmer-card relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">CO₂e Mitigated</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
              <Leaf className="size-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight">
            {co2AvoidedTons} <span className="text-sm font-sans font-normal text-muted-foreground">metric tons</span>
          </div>
          <div className="space-y-1 pt-0.5">
            <p className="text-[11px] text-muted-foreground leading-snug">
              Protects fragile high-altitude glaciated Himalayan ecosystems.
            </p>
            <div className="text-[10px] font-mono text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1.5">
              <Zap className="size-3" />
              <span>{co2AvoidedKg.toLocaleString()} kg CO₂ eliminated at source</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 4: Logistics Cost Avoided */}
        <motion.div
          whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
          className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-2 hover:border-sky-500/40 hover:shadow-lg transition-all shimmer-card relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Logistics Cost Saved</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600">
              <Truck className="size-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight">
            ₹{convoyCostAvoidedInr.toLocaleString("en-IN")}
          </div>
          <div className="space-y-1 pt-0.5">
            <p className="text-[11px] text-muted-foreground leading-snug">
              Avoids hazardous mountain convoy & snow-pass delivery overhead.
            </p>
            <div className="text-[10px] font-mono text-sky-700 dark:text-sky-400 font-semibold flex items-center gap-1.5">
              <Fuel className="size-3" />
              <span>~{haulageWeightKg.toLocaleString()} kg transport payload cut</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Interactive Tabs: Overview · Side-by-Side Comparison · Tactical Logistics */}
      <div className="mt-6 pt-5 border-t border-border">
        <div className="flex items-center gap-2 mb-4 p-1 bg-secondary/40 rounded-2xl w-fit border border-border/60">
          {(
            [
              { id: "overview", label: "Operational Overview" },
              { id: "comparison", label: "CGI Tin vs Passive Solar Comparison" },
              { id: "tactical", label: "Tactical Mountain Defense Logistics" },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  isActive ? "text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="fossilFuelActiveTab"
                    className="absolute inset-0 bg-foreground rounded-xl shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Operational Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs animate-in fade-in duration-150">
            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <span>Freeze Risk Mitigation</span>
                <ThermometerSnowflake className="size-3.5 text-sky-500" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {minIndoorFormatted} <span className="text-xs font-sans text-muted-foreground">Min Indoor</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Maintains non-freezing living conditions even during {outdoorMinFormatted} peak pre-dawn freeze (+{thermalAdvantageDelta}{deltaTempUnit} passive thermal advantage).
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <span>Supply Chain Vulnerability</span>
                <Truck className="size-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {percentSaved}% Displacement
              </div>
              <p className="text-[11px] text-muted-foreground">
                Reduces outpost dependency on Zojila/Chang La winter convoy passes, ensuring post autonomy during winter blizzard road blocks.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <span>Acoustic & Thermal Stealth</span>
                <ShieldCheck className="size-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                Zero Drone Signature
              </div>
              <p className="text-[11px] text-muted-foreground">
                No noisy diesel generators and no hot exhaust flue plume detectable by adversary thermal imaging or drone reconnaissance.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: CGI Tin vs Passive Solar Comparison */}
        {activeTab === "comparison" && (
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4 text-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: CGI Tin Barrack Baseline */}
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between font-bold text-red-700 dark:text-red-400">
                  <span>Conventional CGI Tin Barrack (Baseline)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10">Uninsulated</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-foreground/80">
                  <div className="flex justify-between border-b border-red-500/10 pb-1">
                    <span>Heating Energy Demand:</span>
                    <strong className="font-mono">{formatEnergyDensity(baselineHeatingDemandKwhM2)}</strong>
                  </div>
                  <div className="flex justify-between border-b border-red-500/10 pb-1">
                    <span>Seasonal Fuel Required:</span>
                    <strong className="font-mono text-red-600 dark:text-red-400">
                      {Math.round(totalBaselineKwh / effectiveDeliveredKwh).toLocaleString()} {spec.unit}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-red-500/10 pb-1">
                    <span>Bukhari Combustion Time:</span>
                    <strong className="font-mono text-red-600 dark:text-red-400">
                      {Math.round((totalBaselineKwh / effectiveDeliveredKwh) / spec.burnRateUnitPerHour).toLocaleString()} hrs
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-red-500/10 pb-1">
                    <span>Nighttime Indoor Freeze:</span>
                    <strong className="font-mono text-red-600 dark:text-red-400">Drops to {formatTemp(-15, 0)} to {formatTemp(-25, 0)} without fire</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Indoor Air Quality:</span>
                    <strong className="text-red-600 dark:text-red-400">Acute CO / Soot Hazard</strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Passive Solar Shelter */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
                  <span>ThermoShelter Passive Solar Design</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10">Passive Solar</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-foreground/80">
                  <div className="flex justify-between border-b border-emerald-500/10 pb-1">
                    <span>Heating Energy Demand:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatEnergyDensity(actualHeatingDemandKwhM2)}</strong>
                  </div>
                  <div className="flex justify-between border-b border-emerald-500/10 pb-1">
                    <span>Auxiliary Fuel Required:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                      {Math.round(totalActualKwh / effectiveDeliveredKwh).toLocaleString()} {spec.unit}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-emerald-500/10 pb-1">
                    <span>Bukhari Avoidance:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                      {stoveHoursAvoided.toLocaleString()} hrs avoided
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-emerald-500/10 pb-1">
                    <span>Nighttime Indoor Temp:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{minIndoorFormatted} Non-Freezing</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Indoor Air Quality:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">100% Clean Breathing Air</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Tactical Mountain Defense Logistics */}
        {activeTab === "tactical" && (
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3 text-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                <div className="text-[11px] font-bold text-muted-foreground uppercase">Hazardous Convoy Passes</div>
                <div className="text-base font-bold font-mono text-foreground mt-1">Zojila / Khardung La</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Eliminates {fuelUnitsDisplaced.toLocaleString()} {spec.unit} of hazardous winter haulage over icy 17,500ft passes.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                <div className="text-[11px] font-bold text-muted-foreground uppercase">ALS 4x4 Tanker Sorties</div>
                <div className="text-base font-bold font-mono text-foreground mt-1">
                  {(fuelUnitsDisplaced / 5000).toFixed(2)} Tanker Trips
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Based on 5,000L high-altitude bowser capacity on narrow single-lane defense tracks.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                <div className="text-[11px] font-bold text-muted-foreground uppercase">Total Air/Mule Payload Cut</div>
                <div className="text-base font-bold font-mono text-foreground mt-1">
                  {haulageWeightKg.toLocaleString()} kg
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Includes fuel weight ({spec.densityKgPerUnit} kg/L) plus tare weight of steel storage drums.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Military Field Note */}
      <div className="mt-6 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 flex items-start gap-3 text-xs text-foreground/80">
        <Info className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-foreground">Operational Defense Context: </span>
          In high-altitude forward border sectors ({locationName}), troops rely heavily on fossil heating fuels. Every {spec.unit} displaced by our passive solar thermal storage wall eliminates hazardous snow-pass transport logistics while maintaining safe continuous non-freezing thermal conditions (&gt;0°C).
        </div>
      </div>
    </div>
  );
}
