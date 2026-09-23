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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageIntro, ActionButton } from "@/components/v0/platform-components";
import { useShelterStore } from "@/lib/store/use-shelter-store";
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
import { EnergyDashboardPanel } from "@/features/optimization/components/EnergyDashboardPanel";
import { EnergyCharts } from "@/features/optimization/components/EnergyCharts";
import { EnergySetupPanel } from "@/features/optimization/components/EnergySetupPanel";
import { DesignTradeoffTable, WorkspaceProjectSimulationItem } from "@/features/optimization/components/DesignTradeoffTable";

export function FuelCostsView() {
  const { projects, activeProjectId, setActiveProject, updateProject } = useShelterStore();

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  // Configuration States
  const [comfortConfig, setComfortConfig] = useState<ComfortConfig>(DEFAULT_COMFORT_CONFIG);
  const [energyConfig, setEnergyConfig] = useState<EnergySystemConfig>(DEFAULT_ENERGY_SYSTEM_CONFIG);
  const [keroseneConfig, setKeroseneConfig] = useState<KeroseneBackupConfig>(DEFAULT_KEROSENE_CONFIG);
  const [logisticsConfig, setLogisticsConfig] = useState<FuelLogisticsConfig>(DEFAULT_LOGISTICS_CONFIG);
  const [baselineConfig, setBaselineConfig] = useState<BaselineShelterConfig>(DEFAULT_BASELINE_SHELTER);
  const [outdoorMinC, setOutdoorMinC] = useState<number>(-17.0);
  const [outdoorMaxC, setOutdoorMaxC] = useState<number>(-3.0);

  // Real-time evaluation of all workspace portfolio projects
  const evaluatedWorkspaceProjects = useMemo(() => {
    return projects.map((proj) => {
      try {
        const sim = runIntegratedEnergySimulation(
          proj,
          comfortConfig,
          energyConfig,
          keroseneConfig,
          logisticsConfig,
          baselineConfig,
          outdoorMinC,
          outdoorMaxC
        );
        return {
          project: proj,
          simulation: sim,
        };
      } catch (err) {
        console.error("Simulation failed for workspace project:", proj.id, err);
        return null;
      }
    }).filter(Boolean) as WorkspaceProjectSimulationItem[];
  }, [
    projects,
    comfortConfig,
    energyConfig,
    keroseneConfig,
    logisticsConfig,
    baselineConfig,
    outdoorMinC,
    outdoorMaxC,
  ]);

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<EnergySimulationResult | null>(null);
  const [tradeoffCandidates, setTradeoffCandidates] = useState<DesignTradeoffCandidate[]>([]);

  // Execute simulation when inputs change or on initial load
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

  // Initial auto-simulation
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
  };

  const handleApplyTradeoffToProject = (candidate: DesignTradeoffCandidate) => {
    if (!activeProject) return;

    // Update solar PV capacity
    setEnergyConfig((prev) => ({
      ...prev,
      solarPvCapacityKw: candidate.parameters.solarPvKw,
      batteryCapacityKwh: candidate.parameters.batteryKwh,
      electricHeaterCapacityKw: candidate.parameters.electricHeaterKw,
    }));

    // Update active project orientation and roof solar panels
    const roofPanels = activeProject.envelope?.roof?.solarPanels || {
      enabled: true,
      panelCount: candidate.parameters.roofPanelsCount,
      panelWattageW: 400,
      panelEfficiencyPct: 21.5,
    };

    updateProject(activeProject.id, {
      geometry: {
        ...activeProject.geometry,
        orientation: candidate.parameters.orientationDeg,
      },
      envelope: {
        ...activeProject.envelope,
        roof: {
          ...activeProject.envelope.roof,
          solarPanels: {
            ...roofPanels,
            enabled: candidate.parameters.roofPanelsCount > 0,
            panelCount: candidate.parameters.roofPanelsCount,
          },
        },
      },
    });

    // Re-run simulation with adopted architecture
    setTimeout(() => {
      runSimulation();
    }, 100);
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
        No active project found. Please select or create a project to run energy simulation.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Editorial Page Header */}
      <PageIntro
        eyebrow="PS-26051 · Defense Fuel Logistics & Operational Abatement"
        title="Fuel, Cost & Energy Analytics"
        description="Comprehensive real-time simulation of space heating displacement, delivered high-altitude kerosene logistics costs, renewable solar microgrid dispatch, and detailed engineering breakdown across all evaluated shelters."
        action={
          <div className="flex items-center gap-2.5 flex-wrap">
            <ActionButton
              tone="secondary"
              onClick={() => setShowSetup((prev) => !prev)}
              className="rounded-full text-xs font-semibold cursor-pointer"
            >
              <Sliders className="size-3.5" />
              {showSetup ? "Hide Parameters" : "Edit Assumptions & Fuel Rates"}
            </ActionButton>
            <ActionButton
              tone="primary"
              onClick={runSimulation}
              disabled={isSimulating}
              className="rounded-full text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isSimulating ? "animate-spin" : ""}`} />
              {isSimulating ? "Calculating..." : "Re-Simulate"}
            </ActionButton>
          </div>
        }
      />

      {/* Primary Workflow Sequence Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto py-3 px-4 bg-secondary/40 border border-border rounded-2xl text-[11px] text-muted-foreground shadow-sm">
        <span className="font-semibold text-foreground shrink-0 uppercase tracking-wider text-[10px]">Strategy Flow:</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">1. Passive Envelope</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
        <span className="text-cyan-600 dark:text-cyan-400 font-semibold">2. Minimize Heat Deficit</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
        <span className="text-amber-600 dark:text-amber-400 font-semibold">3. Solar PV + BIPV Window Panes</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
        <span className="text-rose-600 dark:text-rose-400 font-semibold">4. Kerosene Backup (Deficit Only)</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
        <span className="text-purple-600 dark:text-purple-400 font-semibold">5. Fuel Abatement & Lifecycle Savings</span>
      </div>

      {/* Active Workspace Project Selector Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-2xl shadow-[0_20px_55px_rgba(0,0,0,.04)]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="micro-label">Active Evaluated Shelter</span>
          <span className="text-xs font-bold text-foreground bg-secondary/80 px-3 py-1 rounded-full border border-border">
            {activeProject.project?.name}
          </span>
          <span className="text-[11px] text-muted-foreground">
            ({activeProject.location?.region || "Ladakh"} · {activeProject.location?.elevation || 3500}m)
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="micro-label">Switch Project:</span>
          {projects.map((proj) => (
            <button
              key={proj.id}
              type="button"
              onClick={() => setActiveProject(proj.id)}
              className={`px-3 py-1 text-xs rounded-full transition cursor-pointer font-semibold ${
                proj.id === activeProjectId
                  ? "bg-black text-white dark:bg-white dark:text-black border border-transparent shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {proj.project?.name?.split(" (")[0] || proj.id}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible Setup Drawer */}
      {showSetup && (
        <EnergySetupPanel
          model={activeProject}
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

      {/* Main Simulation Results & Analytics */}
      {simulationResult ? (
        <div className="space-y-8">
          {/* Section 1: Executive KPI Dashboard & Solar Opportunity Advisory */}
          <EnergyDashboardPanel
            simulationResult={simulationResult}
            onInstallSolar={handleInstallSolar}
          />

          {/* Section 2: 7 Dynamic Analytics Charts */}
          <EnergyCharts
            simulationResult={simulationResult}
            tradeoffCandidates={tradeoffCandidates}
          />

          {/* Section 3: Engineering Design Recommendations */}
          <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-foreground border border-border">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <span className="micro-label">Engineering Audit</span>
                  <h3 className="font-editorial text-xl font-medium text-foreground tracking-tight mt-0.5">
                    Engineering Observations & Design Explanations
                  </h3>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border font-mono">
                ML Model Estimates
              </Badge>
            </div>
            <div className="space-y-2.5 text-xs text-foreground/80">
              {simulationResult.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: All Listed Shelters in Detail (Comparative Matrix & Dossier Cards) */}
          <DesignTradeoffTable
            candidates={tradeoffCandidates}
            workspaceProjects={evaluatedWorkspaceProjects}
            activeProjectId={activeProjectId}
            onSelectProject={(id) => setActiveProject(id)}
            onApplyToShelterModel={handleApplyTradeoffToProject}
          />
        </div>
      ) : (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
          <span>Running ML thermal simulation & energy dispatch...</span>
        </div>
      )}
    </div>
  );
}
