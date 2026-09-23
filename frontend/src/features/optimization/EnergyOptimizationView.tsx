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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useShelterStore } from "@/lib/store/use-shelter-store";
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
import { DesignTradeoffTable } from "./components/DesignTradeoffTable";

export function EnergyOptimizationView() {
  const { projects, activeProjectId, updateProject } = useShelterStore();

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
    if (activeProject && !simulationResult) {
      runSimulation();
    }
  }, [activeProject, simulationResult, runSimulation]);

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

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-slate-400">
        No active project found. Please select or create a project to run energy simulation.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
              Integrated Module
            </Badge>
            <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 text-xs">
              ML Thermal Prediction Engine
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Thermal, Energy, Fuel, Cost & Comfort Optimization
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Stand-alone passive shelter optimization for extreme alpine climates. Prioritizes passive design first,
            deploys rooftop solar & transparent BIPV window panes, and treats kerosene strictly as an emergency backup.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSetup((prev) => !prev)}
            className="text-xs border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            {showSetup ? "Hide Parameters" : "Edit Assumptions & Systems"}
          </Button>

          <Button
            size="sm"
            onClick={runSimulation}
            disabled={isSimulating}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSimulating ? "animate-spin" : ""}`} />
            {isSimulating ? "Calculating..." : "Re-Simulate"}
          </Button>
        </div>
      </div>

      {/* Primary Workflow Sequence Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 px-3 bg-slate-900/60 border border-slate-800 rounded-lg text-[11px] text-slate-400">
        <span className="font-semibold text-slate-200 shrink-0">Strategy Flow:</span>
        <span className="text-emerald-400 font-medium">1. Passive Design</span>
        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className="text-cyan-400 font-medium">2. Reduce Heating Demand</span>
        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className="text-yellow-400 font-medium">3. Rooftop PV + Window BIPV Panes</span>
        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className="text-amber-400 font-medium">4. Kerosene Backup (Only if Required)</span>
        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
        <span className="text-purple-400 font-medium">5. Fuel Logistics & Cost Optimization</span>
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

      {/* Main Simulation Results */}
      {simulationResult ? (
        <div className="space-y-8">
          {/* Section 14: Interactive Dashboard (Section A, B, C) */}
          <EnergyDashboardPanel simulationResult={simulationResult} />

          {/* Section 15: 6 Key Analytics Charts */}
          <EnergyCharts
            simulationResult={simulationResult}
            tradeoffCandidates={tradeoffCandidates}
          />

          {/* Section 16: Engineering Design Recommendations */}
          <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Engineering Observations & Design Explanations
              </h3>
              <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700 ml-auto">
                ML Model Estimates
              </Badge>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              {simulationResult.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Section 13: Multi-Objective Design Optimization Candidates */}
          <DesignTradeoffTable
            candidates={tradeoffCandidates}
            onApplyToShelterModel={handleApplyTradeoffToProject}
          />
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
          <span>Running ML thermal simulation & energy dispatch...</span>
        </div>
      )}
    </div>
  );
}
