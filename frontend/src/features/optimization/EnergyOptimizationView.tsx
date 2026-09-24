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
  Info,
  CheckCircle2,
  FileText,
  ArrowRight,
  IndianRupee,
  Activity,
  MapPin,
  Gauge,
  Shield,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useShelterStore, SimulationJobItem } from "@/lib/store/use-shelter-store";
import { ShelterModel } from "@/types/shelter";
import {
  ComfortConfig,
  EnergySystemConfig,
  KeroseneBackupConfig,
  FuelLogisticsConfig,
  BaselineShelterConfig,
  EnergySimulationResult,
  DesignTradeoffCandidate,
} from "./energy-types";
import {
  DEFAULT_COMFORT_CONFIG,
  DEFAULT_ENERGY_SYSTEM_CONFIG,
  DEFAULT_BASELINE_SHELTER,
  runIntegratedEnergySimulation,
  generateDesignTradeoffCandidates,
} from "./energy-simulation";
import {
  DEFAULT_LOGISTICS_CONFIG,
  DEFAULT_KEROSENE_CONFIG,
} from "./fuel-logistics";
import { EnergyDashboardPanel } from "./components/EnergyDashboardPanel";
import { EnergyCharts } from "./components/EnergyCharts";
import { EnergySetupPanel } from "./components/EnergySetupPanel";

export interface EnergyOptimizationViewProps {
  activeJob?: SimulationJobItem | null;
  activeProject?: ShelterModel | null;
  computedFloorAreaM2?: number;
  computedEnvelopeAreaM2?: number;
  computedSouthWallAreaM2?: number;
  computedAverageUFactor?: number;
  totalSolarGainsKwh?: number;
  summary?: {
    indoorMinC?: number;
    indoorMaxC?: number;
    indoorMeanC?: number;
    outdoorMinC?: number;
    outdoorMaxC?: number;
    comfortHoursPct?: number;
    heatingDemandKwhM2?: number;
    totalSolarGainKwh?: number;
    peakEnvelopeLossW?: number;
  };
}

export function EnergyOptimizationView({
  activeJob,
  activeProject: propActiveProject,
  computedFloorAreaM2,
  computedEnvelopeAreaM2,
  computedSouthWallAreaM2,
  computedAverageUFactor,
  totalSolarGainsKwh,
  summary,
}: EnergyOptimizationViewProps = {}) {
  const { projects, activeProjectId, updateProject } = useShelterStore();

  // Resolve target project strictly for this specific simulation/shelter
  const targetProject = useMemo(() => {
    return (
      propActiveProject ||
      activeJob?.shelterModel ||
      projects.find((p) => p.id === activeJob?.projectId) ||
      projects.find((p) => p.id === activeProjectId) ||
      projects[0] ||
      null
    );
  }, [propActiveProject, activeJob, projects, activeProjectId]);

  // Derive climate bounds from live simulation or shelter location
  const initialMinC = summary?.outdoorMinC ?? targetProject?.location?.designTempWinter ?? -18.0;
  const initialMaxC = summary?.outdoorMaxC ?? targetProject?.location?.designTempSummer ?? -2.0;

  // Configuration States tailored specifically to this shelter
  const [comfortConfig, setComfortConfig] = useState<ComfortConfig>(DEFAULT_COMFORT_CONFIG);
  const [energyConfig, setEnergyConfig] = useState<EnergySystemConfig>(DEFAULT_ENERGY_SYSTEM_CONFIG);
  const [keroseneConfig, setKeroseneConfig] = useState<KeroseneBackupConfig>(DEFAULT_KEROSENE_CONFIG);
  const [logisticsConfig, setLogisticsConfig] = useState<FuelLogisticsConfig>(() => {
    const loc = targetProject?.location?.region || targetProject?.location?.name || "Leh Ladakh";
    return {
      ...DEFAULT_LOGISTICS_CONFIG,
      shelterLocation: loc,
      remoteAreaLogisticsPremiumPct: (targetProject?.location?.elevation ?? 3500) > 4000 ? 35 : 20,
    };
  });
  const [baselineConfig, setBaselineConfig] = useState<BaselineShelterConfig>(DEFAULT_BASELINE_SHELTER);
  const [outdoorMinC, setOutdoorMinC] = useState<number>(initialMinC);
  const [outdoorMaxC, setOutdoorMaxC] = useState<number>(initialMaxC);

  // Update outdoor bounds when simulation summary updates
  useEffect(() => {
    if (summary?.outdoorMinC !== undefined) setOutdoorMinC(summary.outdoorMinC);
    if (summary?.outdoorMaxC !== undefined) setOutdoorMaxC(summary.outdoorMaxC);
  }, [summary?.outdoorMinC, summary?.outdoorMaxC]);

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<EnergySimulationResult | null>(null);
  const [tradeoffCandidates, setTradeoffCandidates] = useState<DesignTradeoffCandidate[]>([]);
  const [adoptedCandidateId, setAdoptedCandidateId] = useState<string | null>(null);

  // Run simulation specifically for this project
  const runSimulation = useCallback(() => {
    if (!targetProject) return;
    setIsSimulating(true);

    try {
      const result = runIntegratedEnergySimulation(
        targetProject,
        comfortConfig,
        energyConfig,
        keroseneConfig,
        logisticsConfig,
        baselineConfig,
        outdoorMinC,
        outdoorMaxC
      );

      const candidates = generateDesignTradeoffCandidates(
        targetProject,
        comfortConfig,
        energyConfig,
        keroseneConfig,
        logisticsConfig,
        baselineConfig
      );

      setSimulationResult(result);
      setTradeoffCandidates(candidates);
    } catch (err) {
      console.error("Project energy simulation error:", err);
    } finally {
      setIsSimulating(false);
    }
  }, [
    targetProject,
    comfortConfig,
    energyConfig,
    keroseneConfig,
    logisticsConfig,
    baselineConfig,
    outdoorMinC,
    outdoorMaxC,
  ]);

  // Run automatically when target project or inputs change
  useEffect(() => {
    if (targetProject) {
      runSimulation();
    }
  }, [targetProject?.id, runSimulation]);

  const handleResetDefaults = () => {
    setComfortConfig(DEFAULT_COMFORT_CONFIG);
    setEnergyConfig(DEFAULT_ENERGY_SYSTEM_CONFIG);
    setKeroseneConfig(DEFAULT_KEROSENE_CONFIG);
    setLogisticsConfig({
      ...DEFAULT_LOGISTICS_CONFIG,
      shelterLocation: targetProject?.location?.region || "Leh Ladakh",
    });
    setBaselineConfig(DEFAULT_BASELINE_SHELTER);
    setOutdoorMinC(initialMinC);
    setOutdoorMaxC(initialMaxC);
  };

  const handleApplyTradeoffToProject = (candidate: DesignTradeoffCandidate) => {
    if (!targetProject) return;
    setAdoptedCandidateId(candidate.id);

    setEnergyConfig((prev) => ({
      ...prev,
      solarPvCapacityKw: candidate.parameters.solarPvKw,
      batteryCapacityKwh: candidate.parameters.batteryKwh,
      electricHeaterCapacityKw: candidate.parameters.electricHeaterKw,
    }));

    const roofPanels = targetProject.envelope?.roof?.solarPanels || {
      enabled: true,
      panelCount: candidate.parameters.roofPanelsCount,
      panelWattageW: 400,
      panelEfficiencyPct: 21.5,
    };

    updateProject(targetProject.id, {
      geometry: {
        ...targetProject.geometry,
        orientation: candidate.parameters.orientationDeg,
      },
      envelope: {
        ...targetProject.envelope,
        roof: {
          ...targetProject.envelope?.roof,
          solarPanels: {
            ...roofPanels,
            enabled: candidate.parameters.roofPanelsCount > 0,
            panelCount: candidate.parameters.roofPanelsCount,
          },
        },
      },
    });

    setTimeout(() => {
      runSimulation();
    }, 150);
  };

  const handleInstallSolar = () => {
    if (!targetProject) return;
    const recPanels = simulationResult?.solarOpportunityAdvisory?.recommendedPanelCount || 6;
    const recTilt = simulationResult?.solarOpportunityAdvisory?.recommendedTiltDeg || 45;
    const recKw = simulationResult?.solarOpportunityAdvisory?.recommendedKw || 2.4;

    setEnergyConfig((prev) => ({
      ...prev,
      includeRooftopSolar: true,
      solarPvCapacityKw: recKw,
    }));

    updateProject(targetProject.id, {
      envelope: {
        ...targetProject.envelope,
        roof: {
          ...targetProject.envelope?.roof,
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
    }, 150);
  };

  if (!targetProject) {
    return (
      <div className="p-12 text-center text-muted-foreground border border-border rounded-3xl bg-card">
        No active project selected. Select a simulation run to view real-time energy & fuel optimization.
      </div>
    );
  }

  const floorArea = computedFloorAreaM2 || (targetProject.geometry?.length || 6) * (targetProject.geometry?.width || 4);
  const locationText = targetProject.location?.region || targetProject.location?.name || "Leh Ladakh";
  const elevationM = targetProject.location?.elevation || 3500;
  const projectName = activeJob?.projectName || targetProject.project?.name || "Active Shelter";
  const heatingDemand = summary?.heatingDemandKwhM2 ?? 24.5;
  const comfortHoursPct = summary?.comfortHoursPct ?? 88;

  return (
    <div className="space-y-6">
      {/* Real-time Project-Specific Header Banner */}
      <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border relative">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <Zap className="size-3.5 fill-emerald-500/20" /> PS 26051 Optimization
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Microgrid & Fuel Dispatch Simulation
              </span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <MapPin className="size-3 text-amber-600" />
                {locationText} ({elevationM.toLocaleString()}m ASL)
              </span>
            </div>

            <h3 className="font-editorial text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
              Energy & Fuel Dispatch Optimization: <span className="underline decoration-emerald-500/40">{projectName}</span>
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-3xl leading-relaxed">
              Real-time physical hourly energy simulation for <strong>{projectName}</strong> ({floorArea} m² footprint).
              Evaluates passive solar retention, rooftop PV generation, battery microgrid dispatch, and Bukhari auxiliary mitigation strictly for this shelter.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSetup((prev) => !prev)}
              className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition-all shadow-xs ${
                showSetup
                  ? "bg-foreground text-background border-foreground"
                  : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
              }`}
            >
              <Sliders className="size-3.5" />
              <span>{showSetup ? "Hide Parameters" : "Edit Assumptions & Rates"}</span>
              {showSetup ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            <button
              type="button"
              onClick={runSimulation}
              disabled={isSimulating}
              className="flex items-center gap-2 rounded-2xl bg-foreground text-background px-4 py-2.5 text-xs font-semibold hover:opacity-90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isSimulating ? "animate-spin" : ""}`} />
              <span>{isSimulating ? "Simulating..." : "Re-Simulate"}</span>
            </button>
          </div>
        </div>

        {/* Real-time Project Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 text-xs">
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/70 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Thermal Demand</div>
            <div className="text-lg font-bold font-mono text-foreground">{heatingDemand} <span className="text-xs font-normal text-muted-foreground">kWh/m²·a</span></div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Active Simulation Result</div>
          </div>

          <div className="p-3 rounded-xl bg-secondary/30 border border-border/70 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Passive Comfort</div>
            <div className="text-lg font-bold font-mono text-foreground">{comfortHoursPct}% <span className="text-xs font-normal text-muted-foreground">hours</span></div>
            <div className="text-[10px] text-muted-foreground">Unconditioned living band</div>
          </div>

          <div className="p-3 rounded-xl bg-secondary/30 border border-border/70 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Design Temp Band</div>
            <div className="text-lg font-bold font-mono text-foreground">{outdoorMinC}°C <span className="text-xs font-normal text-muted-foreground">to</span> {outdoorMaxC}°C</div>
            <div className="text-[10px] text-muted-foreground">Alpine winter envelope load</div>
          </div>

          <div className="p-3 rounded-xl bg-secondary/30 border border-border/70 space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Floor Area & Volume</div>
            <div className="text-lg font-bold font-mono text-foreground">{floorArea} <span className="text-xs font-normal text-muted-foreground">m²</span></div>
            <div className="text-[10px] text-muted-foreground">{((floorArea) * (targetProject.geometry?.height || 2.8)).toFixed(0)} m³ interior air volume</div>
          </div>
        </div>
      </div>

      {/* Collapsible Setup Drawer specifically for this shelter */}
      {showSetup && (
        <EnergySetupPanel
          model={targetProject}
          comfortConfig={comfortConfig}
          onUpdateComfort={setComfortConfig}
          energyConfig={energyConfig}
          onUpdateEnergy={setEnergyConfig}
          keroseneConfig={keroseneConfig}
          onUpdateKerosene={setKeroseneConfig}
          logisticsConfig={logisticsConfig}
          onUpdateLogistics={setLogisticsConfig}
          baselineConfig={baselineConfig}
          onUpdateBaseline={setBaselineConfig}
          outdoorMinC={outdoorMinC}
          outdoorMaxC={outdoorMaxC}
          onChangeOutdoorTemps={(minC, maxC) => {
            setOutdoorMinC(minC);
            setOutdoorMaxC(maxC);
          }}
          onResetDefaults={handleResetDefaults}
        />
      )}

      {/* Main Simulation Results & Analytics for THIS project */}
      {simulationResult ? (
        <div className="space-y-8">
          {/* Section 1: Executive KPI Dashboard & Solar Opportunity Advisory */}
          <EnergyDashboardPanel
            simulationResult={simulationResult}
            onInstallSolar={handleInstallSolar}
          />

          {/* Section 2: 7 Dynamic Analytics Charts for THIS shelter */}
          <EnergyCharts
            simulationResult={simulationResult}
            tradeoffCandidates={tradeoffCandidates}
          />

          {/* Section 3: Engineering Design Recommendations for THIS shelter */}
          <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-foreground border border-border">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <span className="micro-label">Physical & ML Audit</span>
                  <h3 className="font-editorial text-xl font-medium text-foreground tracking-tight mt-0.5">
                    Engineering Observations for {projectName}
                  </h3>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border font-mono">
                Project Specific
              </Badge>
            </div>
            <div className="space-y-2.5 text-xs text-foreground/80">
              {simulationResult.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Project Parametric Optimization Tradeoffs (Only for THIS Shelter) */}
          <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <span className="micro-label">Parametric Exploration</span>
                <h3 className="font-editorial text-xl sm:text-2xl font-medium text-foreground tracking-tight mt-0.5">
                  Design Tradeoff Candidates for {projectName}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Architectural variations evaluated strictly for this shelter geometry and thermal envelope.
                </p>
              </div>
              <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                {tradeoffCandidates.length} Evaluated Configurations
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tradeoffCandidates.map((c) => {
                const isAdopted = adoptedCandidateId === c.id;
                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                      c.isParetoOptimal
                        ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                        : "border-border bg-secondary/20"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-foreground truncate">{c.name}</span>
                        {c.isParetoOptimal && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold">
                            Pareto
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{c.tagline}</p>

                      <div className="pt-2 border-t border-border/60 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Kerosene Saved:</span>
                          <strong className="font-mono text-emerald-600 dark:text-emerald-400">{c.metrics.keroseneSavingsPct}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly Fuel:</span>
                          <strong className="font-mono">{c.metrics.keroseneLPerMonth} L</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly Cost Saved:</span>
                          <strong className="font-mono text-foreground">₹{c.metrics.totalCostPerMonth.toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Comfort Hours:</span>
                          <strong className="font-mono">{c.metrics.comfortPct}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Solar Array:</span>
                          <strong className="font-mono">{c.parameters.solarPvKw} kWp</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Battery Storage:</span>
                          <strong className="font-mono">{c.parameters.batteryKwh} kWh</strong>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyTradeoffToProject(c)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isAdopted
                          ? "bg-emerald-600 text-white"
                          : "bg-secondary text-foreground hover:bg-foreground hover:text-background border border-border"
                      }`}
                    >
                      {isAdopted ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Active on Shelter</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5 text-amber-500" />
                          <span>Apply to {projectName.split(" ")[0]}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center text-muted-foreground border border-border rounded-3xl bg-card">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
          <span>Running physics simulation & microgrid energy dispatch for {projectName}...</span>
        </div>
      )}
    </div>
  );
}
