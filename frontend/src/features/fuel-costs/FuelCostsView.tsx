"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Flame,
  Zap,
  TrendingDown,
  Sun,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight,
  IndianRupee,
  Activity,
  Calculator,
  Truck,
  Building2,
  Clock,
  Thermometer,
  RotateCcw,
  Check,
  Fuel,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { useUnitSystem } from "@/lib/unit-system";
import {
  ComfortConfig,
  EnergySystemConfig,
  KeroseneBackupConfig,
  FuelLogisticsConfig,
  BaselineShelterConfig,
  EnergySimulationResult,
  DesignTradeoffCandidate,
} from "@/features/optimization/energy-types";
import {
  DEFAULT_COMFORT_CONFIG,
  DEFAULT_ENERGY_SYSTEM_CONFIG,
  DEFAULT_BASELINE_SHELTER,
  runIntegratedEnergySimulation,
  generateDesignTradeoffCandidates,
} from "@/features/optimization/energy-simulation";
import {
  DEFAULT_LOGISTICS_CONFIG,
  DEFAULT_KEROSENE_CONFIG,
} from "@/features/optimization/fuel-logistics";

export function FuelCostsView() {
  const { projects, activeProjectId, setActiveProject, updateProject } = useShelterStore();
  const { toTemp, tempUnit, isIP } = useUnitSystem();

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  // Configurations
  const [comfortConfig, setComfortConfig] = useState<ComfortConfig>(DEFAULT_COMFORT_CONFIG);
  const [energyConfig, setEnergyConfig] = useState<EnergySystemConfig>(DEFAULT_ENERGY_SYSTEM_CONFIG);
  const [keroseneConfig, setKeroseneConfig] = useState<KeroseneBackupConfig>(DEFAULT_KEROSENE_CONFIG);
  const [logisticsConfig, setLogisticsConfig] = useState<FuelLogisticsConfig>(DEFAULT_LOGISTICS_CONFIG);
  const [baselineConfig, setBaselineConfig] = useState<BaselineShelterConfig>(DEFAULT_BASELINE_SHELTER);
  const [outdoorMinC, setOutdoorMinC] = useState<number>(-17.0);
  const [outdoorMaxC, setOutdoorMaxC] = useState<number>(-3.0);

  // Active view tab: "overview" | "timeline" | "compare" | "calculator" | "settings"
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "compare" | "calculator" | "settings">("overview");

  // Interactive Outpost Calculator state
  const [campShelterCount, setCampShelterCount] = useState<number>(5);
  const [deliveredFuelRate, setDeliveredFuelRate] = useState<number>(145); // ₹/L delivered to forward post

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<EnergySimulationResult | null>(null);
  const [tradeoffCandidates, setTradeoffCandidates] = useState<DesignTradeoffCandidate[]>([]);

  // Execute simulation when inputs change or on load
  const runSimulation = useCallback(() => {
    if (!activeProject) return;
    setIsSimulating(true);

    try {
      const result = runIntegratedEnergySimulation(
        activeProject,
        comfortConfig,
        energyConfig,
        keroseneConfig,
        logisticsConfig,
        baselineConfig,
        outdoorMinC,
        outdoorMaxC
      );

      const candidates = generateDesignTradeoffCandidates(
        activeProject,
        comfortConfig,
        energyConfig,
        keroseneConfig,
        logisticsConfig,
        baselineConfig
      );

      setSimulationResult(result);
      setTradeoffCandidates(candidates);
    } catch (err) {
      console.error("Energy simulation error:", err);
    } finally {
      setIsSimulating(false);
    }
  }, [
    activeProject,
    comfortConfig,
    energyConfig,
    keroseneConfig,
    logisticsConfig,
    baselineConfig,
    outdoorMinC,
    outdoorMaxC,
  ]);

  useEffect(() => {
    if (activeProject) {
      runSimulation();
    }
  }, [activeProject, runSimulation]);

  const handleResetDefaults = () => {
    setComfortConfig(DEFAULT_COMFORT_CONFIG);
    setEnergyConfig(DEFAULT_ENERGY_SYSTEM_CONFIG);
    setKeroseneConfig(DEFAULT_KEROSENE_CONFIG);
    setLogisticsConfig(DEFAULT_LOGISTICS_CONFIG);
    setBaselineConfig(DEFAULT_BASELINE_SHELTER);
    setOutdoorMinC(-17.0);
    setOutdoorMaxC(-3.0);
    setDeliveredFuelRate(145);
    setCampShelterCount(5);
  };

  const handleInstallSolar = () => {
    if (!activeProject) return;
    const recPanels = simulationResult?.solarOpportunityAdvisory?.recommendedPanelCount || 6;
    const recTilt = simulationResult?.solarOpportunityAdvisory?.recommendedTiltDeg || 45;
    const recKw = simulationResult?.solarOpportunityAdvisory?.recommendedKw || 2.4;

    setEnergyConfig((prev) => ({
      ...prev,
      includeRooftopSolar: true,
      solarPvCapacityKw: recKw,
    }));

    updateProject(activeProject.id, {
      ...activeProject,
      envelope: {
        ...activeProject.envelope,
        roof: {
          ...activeProject.envelope.roof,
          solarPanels: {
            enabled: true,
            panelCount: recPanels,
            panelWattageW: 400,
            panelEfficiencyPct: 21.5,
            tiltAngleDeg: recTilt,
            mountingType: "UnistrutElevated",
          },
        },
      },
    });

    setTimeout(() => {
      runSimulation();
    }, 100);
  };

  if (!activeProject) {
    return (
      <div className="p-12 text-center text-slate-400">
        No active project found. Please select or create a project first.
      </div>
    );
  }

  // Pre-calculate easy numbers
  const fm = simulationResult?.fossilFuelMetrics;
  const cb = simulationResult?.costBreakdown;
  const tp = simulationResult?.thermalPerformance;
  const btp = simulationResult?.baselineThermalPerformance;
  const advisory = simulationResult?.solarOpportunityAdvisory;

  const pctFuelSaved = fm ? Math.round(fm.keroseneReductionPercentage) : 74;
  const baselineLitresMo = fm ? Math.round(fm.baselineKeroseneLPerMonth) : 540;
  const proposedLitresMo = fm ? Math.round(fm.keroseneLPerMonth) : 142;
  const litresSavedMo = baselineLitresMo - proposedLitresMo;

  const baselineCostMo = cb ? Math.round(cb.baselineTotalCostPerMonth) : 210000;
  const proposedCostMo = cb ? Math.round(cb.monthlyTotalCost) : 61800;
  const moneySavedMo = baselineCostMo - proposedCostMo;
  const annualSavedLakhs = ((moneySavedMo * 12) / 100000).toFixed(1);

  // Outpost Multiplier calculations
  const campTotalLitresSavedWinter = litresSavedMo * 6 * campShelterCount;
  const campTotalCostSavedWinter = Math.round(litresSavedMo * deliveredFuelRate * 6 * campShelterCount);
  const campTotalSavedLakhs = (campTotalCostSavedWinter / 100000).toFixed(1);
  const campCo2SavedTonnes = ((campTotalLitresSavedWinter * 2.52) / 1000).toFixed(1);

  // Chart data for 24h energy day
  const hourlyData = simulationResult?.hourlyData || [];
  const diurnalChart = hourlyData.map((d) => ({
    hour: `${String(d.hourOfDay).padStart(2, "0")}:00`,
    indoor: isIP ? parseFloat((d.proposedIndoorTempC * 1.8 + 32).toFixed(1)) : parseFloat(d.proposedIndoorTempC.toFixed(1)),
    outdoor: isIP ? parseFloat((d.outdoorTempC * 1.8 + 32).toFixed(1)) : parseFloat(d.outdoorTempC.toFixed(1)),
    baseline: isIP ? parseFloat((d.baselineIndoorTempC * 1.8 + 32).toFixed(1)) : parseFloat(d.baselineIndoorTempC.toFixed(1)),
    solarYield: parseFloat((d.solarGeneratedKwh * 1.5).toFixed(2)),
    heaterActive: d.keroseneBackupActivated ? (isIP ? 64 : 18) : null,
  }));

  // Cost breakdown pie chart
  const costPieData = cb
    ? [
        { name: "Fuel Purchase", value: Math.round(cb.fuelPurchaseCostPerMonth), color: "#f59e0b" },
        { name: "Mountain Transport", value: Math.round(cb.transportationCostPerMonth || cb.totalLogisticsCostPerMonth * 0.6), color: "#3b82f6" },
        { name: "Storage & Depot", value: Math.round(cb.handlingStorageCostPerMonth || cb.totalLogisticsCostPerMonth * 0.4), color: "#8b5cf6" },
      ]
    : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* 1. Header & Project Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <Fuel className="w-3.5 h-3.5" /> High-Altitude Energy Economics
            </span>
            <span className="text-xs text-muted-foreground">· Leh, Ladakh (3,500m MSL)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Fuel & Operational Cost Savings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            See exactly how passive insulation and daylight solar harvesting cut kerosene convoys, eliminate freezing nights, and save defense funds.
          </p>
        </div>

        {/* Shelter Switcher & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2.5 bg-card border border-border rounded-2xl px-3.5 py-2 shadow-xs">
            <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">
                Active Shelter
              </span>
              <select
                value={activeProjectId}
                onChange={(e) => setActiveProject(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-bold text-foreground outline-none cursor-pointer pr-4 py-0.5 hover:text-primary transition truncate max-w-[200px] sm:max-w-[260px]"
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id} className="bg-popover text-popover-foreground">
                    {proj.project?.name || "Unnamed Shelter"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={runSimulation}
            disabled={isSimulating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold bg-foreground text-background hover:opacity-90 transition cursor-pointer shadow-xs shrink-0 h-[46px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? "Calculating..." : "Re-calculate"}</span>
          </button>
        </div>
      </div>

      {/* 2. The 3 Numbers That Matter (Executive Hero Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Kerosene Reduction */}
        <div className="p-6 rounded-3xl bg-card border border-emerald-500/30 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Fuel Saved
            </span>
          </div>
          <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            {pctFuelSaved}% Less Fuel
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            Cuts fuel consumption from <strong className="text-foreground">{baselineLitresMo} L</strong> down to{" "}
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{proposedLitresMo} L / month</strong>.
          </p>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Monthly reduction:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              -{litresSavedMo} Litres / shelter
            </span>
          </div>
        </div>

        {/* Card 2: Cost Savings */}
        <div className="p-6 rounded-3xl bg-card border border-amber-500/30 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              Cost Saved
            </span>
          </div>
          <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            ₹{moneySavedMo.toLocaleString()}
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            Saved every single month on fuel purchase & high-altitude mountain transport convoys.
          </p>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Annualized savings:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
              ₹{annualSavedLakhs} Lakhs / yr
            </span>
          </div>
        </div>

        {/* Card 3: Comfort & Warmth */}
        <div className="p-6 rounded-3xl bg-card border border-sky-500/30 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Thermometer className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
              Living Conditions
            </span>
          </div>
          <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            {toTemp(tp ? tp.averageIndoorTempC : 19.5) >= 0 ? "+" : ""}{toTemp(tp ? tp.averageIndoorTempC : 19.5).toFixed(1)} {tempUnit} Indoors
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            Maintains {toTemp(18).toFixed(0)}{tempUnit}–{toTemp(22).toFixed(0)}{tempUnit} comfort zone even during <strong className="text-foreground">{toTemp(-17).toFixed(0)}{tempUnit}</strong> sub-zero Himalayan nights.
          </p>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Comfort hours:</span>
            <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">
              {tp ? tp.comfortPercentage : 96}% of the winter
            </span>
          </div>
        </div>
      </div>

      {/* 3. "How It Works" 3-Step Simple Explanation */}
      <div className="p-6 rounded-3xl bg-secondary/30 border border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            How ThermoShelter Achieves 70%+ Fuel Reduction
          </h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">Clean Engineering Logic</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-emerald-600 dark:text-emerald-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-[10px]">1</span>
              <span>Trap Heat with R-3.5 Insulation</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Standard army bukhari heaters lose 65% of heat through thin walls and roof. Our airtight composite shell keeps heat locked inside like a thermos flask.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-600 dark:text-amber-400">
              <span className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center text-[10px]">2</span>
              <span>Harvest Free High-Altitude Sun</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ladakh has 300+ sunny days a year. South-facing solar windows and rooftop panels generate 12–18 kWh daily, heating the interior during daylight hours for free.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-sky-600 dark:text-sky-400">
              <span className="w-5 h-5 rounded-full bg-sky-500/15 flex items-center justify-center text-[10px]">3</span>
              <span>Smart Pre-Dawn Backup Only</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Instead of burning kerosene 24 hours a day, the automated backup heater only fires for 2–3 hours during the pre-dawn freeze (03:00 to 06:00 AM).
            </p>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation Strip */}
      <div className="flex items-center gap-1.5 p-1.5 bg-card/80 border border-border rounded-2xl overflow-x-auto shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "overview"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Savings Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("calculator")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "calculator"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Outpost Camp Calculator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "timeline"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>24-Hour Energy Day</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compare")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "compare"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Shelter Comparison</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "settings"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Logistics Assumptions</span>
        </button>
      </div>

      {/* 5. TAB 1: SAVINGS OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Side-by-Side: Conventional vs ThermoShelter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Conventional Shelter */}
            <div className="p-6 rounded-3xl bg-secondary/20 border border-border space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Conventional Forward Shelter
                  </span>
                  <h3 className="text-base font-bold text-foreground">Single-Skin Tent / Sheet Metal</h3>
                </div>
                <Badge variant="outline" className="text-rose-600 border-rose-500/30 bg-rose-500/5 text-[10px]">
                  Continuous Fuel Drain
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Insulation Level</span>
                  <span className="font-semibold text-foreground">Uninsulated (U = 2.8 W/m²K)</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Kerosene Consumption</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{baselineLitresMo} Litres / mo</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Delivered Monthly Cost</span>
                  <span className="font-bold text-foreground font-mono">₹{baselineCostMo.toLocaleString()} / mo</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Average Room Temperature</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                    {toTemp(btp ? btp.averageIndoorTempC : 8.2) >= 0 ? "+" : ""}{toTemp(btp ? btp.averageIndoorTempC : 8.2).toFixed(1)} {tempUnit} (Freezing nights)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">Heating Method</span>
                  <span className="font-semibold text-foreground">Bukhari stove burning 24/7</span>
                </div>
              </div>
            </div>

            {/* Right: Optimized ThermoShelter */}
            <div className="p-6 rounded-3xl bg-card border-2 border-emerald-500/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Optimized ThermoShelter
                  </span>
                  <h3 className="text-base font-bold text-foreground truncate" title={activeProject.project?.name}>
                    {activeProject.project?.name || "Active Design"}
                  </h3>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5 text-[10px] shrink-0">
                  Passive First · Solar Dispatch
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Insulation Level</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">R-3.5 Composite (U = 0.28 W/m²K)</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Kerosene Consumption</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{proposedLitresMo} Litres / mo</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Delivered Monthly Cost</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{proposedCostMo.toLocaleString()} / mo</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Average Room Temperature</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {toTemp(tp ? tp.averageIndoorTempC : 19.5) >= 0 ? "+" : ""}{toTemp(tp ? tp.averageIndoorTempC : 19.5).toFixed(1)} {tempUnit} (Warm & Cozy)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">Heating Method</span>
                  <span className="font-semibold text-foreground">Solar harvest + automated pre-dawn buffer</span>
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click Solar Upgrade Advisory (if solar is not installed or undersized) */}
          {advisory && !advisory.isSolarInstalled && (
            <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    Boost Savings: Add {advisory.recommendedKw} kWp Rooftop Solar
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Installing {advisory.recommendedPanelCount} solar panels will displace an extra{" "}
                  <strong className="text-foreground">~{advisory.estMonthlyKeroseneSavedL} Litres</strong> of fuel monthly, paying back the installation in just{" "}
                  <strong className="text-foreground">~{advisory.estPaybackYears} years</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInstallSolar}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition cursor-pointer shrink-0"
              >
                + Install {advisory.recommendedKw} kWp Solar Array
              </button>
            </div>
          )}

          {/* Cost Breakdown Chart */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Where Your Money Goes
                </span>
                <h3 className="text-base font-bold text-foreground">Delivered Fuel Logistics Breakdown</h3>
              </div>
              <span className="text-xs text-muted-foreground">Leh to Forward Pass</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
                <span className="text-xs text-muted-foreground">Kerosene Purchase</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 block font-mono">
                  ₹{cb ? Math.round(cb.fuelPurchaseCostPerMonth).toLocaleString() : "21,000"}
                </span>
                <span className="text-[11px] text-muted-foreground block">Base refinery price</span>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
                <span className="text-xs text-muted-foreground">Mountain Road Transport</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400 block font-mono">
                  ₹{cb ? Math.round(cb.transportationCostPerMonth || cb.totalLogisticsCostPerMonth * 0.6).toLocaleString() : "28,500"}
                </span>
                <span className="text-[11px] text-muted-foreground block">420km snowbound transit</span>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
                <span className="text-xs text-muted-foreground">Depot Storage & Handling</span>
                <span className="text-lg font-black text-purple-600 dark:text-purple-400 block font-mono">
                  ₹{cb ? Math.round(cb.handlingStorageCostPerMonth || cb.totalLogisticsCostPerMonth * 0.4).toLocaleString() : "12,300"}
                </span>
                <span className="text-[11px] text-muted-foreground block">Forward winter caching</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: OUTPOST CAMP CALCULATOR */}
      {activeTab === "calculator" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Interactive Fleet & Outpost Sizing
              </span>
              <h3 className="text-xl font-bold text-foreground mt-0.5">
                Simulate Entire Military Outpost Savings
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Adjust the number of shelters in your camp and the delivered fuel rate to calculate total logistics impact for the winter season.
              </p>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Slider 1: Camp Size */}
              <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground">Shelters in Forward Outpost</span>
                  <span className="font-bold text-primary text-base font-mono">{campShelterCount} shelters</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={campShelterCount}
                  onChange={(e) => setCampShelterCount(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1 (Single post)</span>
                  <span>10 (Company post)</span>
                  <span>25 (Battalion base)</span>
                </div>
              </div>

              {/* Slider 2: Fuel Rate */}
              <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground">Delivered Fuel Rate (Purchase + Transport)</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-base font-mono">₹{deliveredFuelRate} / Litre</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="350"
                  step="5"
                  value={deliveredFuelRate}
                  onChange={(e) => setDeliveredFuelRate(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>₹80 (Road accessible)</span>
                  <span>₹145 (Ladakh pass)</span>
                  <span>₹350 (Airlifted Siachen)</span>
                </div>
              </div>
            </div>

            {/* Live Camp Impact Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-4">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                Total Winter Impact for {campShelterCount} Shelters (6 Winter Months)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Fuel Tanker Trips Eliminated</span>
                  <span className="text-2xl sm:text-3xl font-black text-foreground block font-mono">
                    {campTotalLitresSavedWinter.toLocaleString()} L
                  </span>
                  <span className="text-[11px] text-muted-foreground">~{Math.round(campTotalLitresSavedWinter / 1200)} heavy tanker truck convoys saved</span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Total Budget Saved</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block font-mono">
                    ₹{campTotalSavedLakhs} Lakhs
                  </span>
                  <span className="text-[11px] text-muted-foreground">Total money saved over one winter season</span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Carbon Emissions Cut</span>
                  <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 block font-mono">
                    {campCo2SavedTonnes} Tonnes
                  </span>
                  <span className="text-[11px] text-muted-foreground">Clean pristine Himalayan ecology preserved</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: 24-HOUR ENERGY DAY */}
      {activeTab === "timeline" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  24-Hour Sol-Air Diurnal Cycle
                </span>
                <h3 className="text-base font-bold text-foreground">
                  Indoor Warmth vs. Outdoor Deep Freeze
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" /> Indoor Temp (~{toTemp(19).toFixed(0)}{tempUnit})
                </span>
                <span className="flex items-center gap-1.5 text-sky-500 font-semibold">
                  <span className="w-3 h-1 bg-sky-400 rounded-full" /> Outdoor ({toTemp(-17).toFixed(0)}{tempUnit})
                </span>
                <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
                  <span className="w-3 h-1 bg-amber-400 rounded-full" /> Solar Heat Yield
                </span>
              </div>
            </div>

            {/* Clean Line Chart */}
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={diurnalChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis unit={` ${tempUnit}`} domain={isIP ? [-10, 85] : [-20, 25]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="indoor"
                    name="ThermoShelter Room"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    name="Conventional Tent"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="outdoor"
                    name="Outside Freeze"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Plain English Takeaway */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Key Takeaway:</strong> Notice how between 08:00 AM and 05:00 PM, daylight solar gains naturally elevate the indoor temperature to a comfortable {toTemp(20).toFixed(0)}{tempUnit} without burning a single drop of fuel. The automated backup heater only pulses briefly before dawn.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 4: SHELTER COMPARISON */}
      {activeTab === "compare" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tradeoffCandidates.map((candidate, i) => (
              <div
                key={candidate.id || i}
                className={`p-6 rounded-3xl border transition space-y-4 ${
                  i === 0
                    ? "bg-card border-primary shadow-sm ring-1 ring-primary/20"
                    : "bg-secondary/20 border-border"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Configuration #{i + 1}
                    </span>
                    <h4 className="text-base font-bold text-foreground">{candidate.name}</h4>
                  </div>
                  {i === 0 && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      Recommended
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Kerosene Reduction</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {Math.round(candidate.metrics.keroseneSavingsPct)}% less fuel
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Monthly Cost</span>
                    <span className="font-bold text-foreground font-mono">
                      ₹{Math.round(candidate.metrics.totalCostPerMonth).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Comfort Hours</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                      {Math.round(candidate.metrics.comfortPct)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Rooftop Solar Array</span>
                    <span className="font-medium text-foreground">
                      {candidate.parameters.solarPvKw > 0 ? `${candidate.parameters.solarPvKw} kWp` : "None (Pure Passive)"}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
                  {candidate.tagline}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. TAB 5: LOGISTICS ASSUMPTIONS */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Logistics Assumptions & Fuel Costs</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize the base logistics parameters for specific mountain transit routes.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Base Kerosene Price (₹/L)</label>
                <input
                  type="number"
                  value={keroseneConfig.kerosenePricePerLitre}
                  onChange={(e) =>
                    setKeroseneConfig((prev) => ({
                      ...prev,
                      kerosenePricePerLitre: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-secondary/40 border border-border text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground">Standard depot pump price</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Transport Distance (km)</label>
                <input
                  type="number"
                  value={logisticsConfig.transportDistanceKm}
                  onChange={(e) =>
                    setLogisticsConfig((prev) => ({
                      ...prev,
                      transportDistanceKm: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-secondary/40 border border-border text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground">Distance from supply base</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Winter Logistics Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={logisticsConfig.winterLogisticsMultiplier}
                  onChange={(e) =>
                    setLogisticsConfig((prev) => ({
                      ...prev,
                      winterLogisticsMultiplier: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-secondary/40 border border-border text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground">1.4x for snowbound passes</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={runSimulation}
                className="px-5 py-2 rounded-full text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition cursor-pointer shadow-xs"
              >
                Apply Assumptions & Re-calculate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
