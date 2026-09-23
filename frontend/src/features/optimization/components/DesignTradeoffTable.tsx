"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  TrendingDown,
  Layers,
  Sun,
  Flame,
  IndianRupee,
  Clock,
  ShieldCheck,
  ExternalLink,
  Search,
  Sliders,
  Table as TableIcon,
  LayoutGrid,
  Eye,
  ArrowRight,
  Building,
  Gauge,
  Zap,
  FileSpreadsheet,
  Leaf,
  Truck,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DesignTradeoffCandidate, EnergySimulationResult } from "../energy-types";
import { ShelterModel } from "@/types/shelter";

export interface WorkspaceProjectSimulationItem {
  project: ShelterModel;
  simulation: EnergySimulationResult;
}

export interface UnifiedShelterItem {
  id: string;
  sourceType: "workspace" | "archetype";
  projectId?: string;
  rawCandidate?: DesignTradeoffCandidate;
  name: string;
  tagline: string;
  isParetoOptimal: boolean;
  isCurrentProposed: boolean;
  location: string;
  parameters: {
    insulationThicknessMm: number;
    thermalMassType: string;
    wallThicknessM: number;
    windowAreaM2: number;
    orientationDeg: number;
    solarPvKw: number;
    roofPanelsCount: number;
    hasWindowSolarPanes: boolean;
    batteryKwh: number;
    electricHeaterKw: number;
    naturalVentilationAch: number;
    roofTiltDeg: number;
  };
  metrics: {
    comfortHoursPerDay: number;
    comfortPct: number;
    energyRequiredKwhPerDay: number;
    solarGeneratedKwhPerDay: number;
    keroseneLPerDay: number;
    keroseneLPerMonth: number;
    totalCostPerDay: number;
    totalCostPerMonth: number;
    keroseneSavingsPct: number;
    costSavingsPct: number;
    moneySavedPerMonth: number;
    baselineKeroseneLPerMonth: number;
    co2AvoidedKgPerMonth: number;
  };
  envelopeSpecs: {
    wallU: string;
    roofU: string;
    floorU: string;
    glazing: string;
  };
}

export interface DesignTradeoffTableProps {
  candidates: DesignTradeoffCandidate[];
  workspaceProjects?: WorkspaceProjectSimulationItem[];
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onSelectCandidate?: (candidate: DesignTradeoffCandidate) => void;
  onApplyToShelterModel?: (candidate: DesignTradeoffCandidate) => void;
}

export function DesignTradeoffTable({
  candidates,
  workspaceProjects = [],
  activeProjectId,
  onSelectProject,
  onSelectCandidate,
  onApplyToShelterModel,
}: DesignTradeoffTableProps) {
  const [viewMode, setViewMode] = useState<"matrix" | "cards">("matrix");
  const [filterCategory, setFilterCategory] = useState<"all" | "workspace" | "archetypes" | "pareto" | "high_solar">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(candidates[0]?.id || null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleApply = (candidate: DesignTradeoffCandidate) => {
    setAppliedId(candidate.id);
    onApplyToShelterModel?.(candidate);
    setTimeout(() => setAppliedId(null), 3000);
  };

  // Convert workspace projects into unified table format
  const workspaceItems = useMemo((): UnifiedShelterItem[] => {
    return workspaceProjects.map((item) => {
      const proj = item.project;
      const sim = item.simulation;
      const roofPanels = proj.envelope?.roof?.solarPanels;
      const solarKw = roofPanels?.enabled ? ((roofPanels.panelCount || 0) * (roofPanels.panelWattageW || 400)) / 1000 : 0;
      const hasWindowBipv = (proj.windows || []).some((w) => w.solarPane?.enabled);
      const isCurrentActive = proj.id === activeProjectId;

      return {
        id: `proj_${proj.id}`,
        sourceType: "workspace",
        projectId: proj.id,
        rawCandidate: undefined,
        name: proj.project?.name || "Workspace Shelter",
        tagline: `${proj.location?.region || "High Altitude"} (${proj.location?.elevation || 3500}m) · ${proj.location?.climateZone || "Alpine"}`,
        isParetoOptimal: sim.thermalPerformance.comfortHoursPerDay >= 20,
        isCurrentProposed: isCurrentActive,
        location: proj.location?.region || "Ladakh, India",
        parameters: {
          insulationThicknessMm: 150,
          thermalMassType: proj.geometry?.roofType || "Mass Concrete / Earth",
          wallThicknessM: 0.32,
          windowAreaM2: (proj.windows || []).reduce((acc, w) => acc + (w.width * w.height), 0),
          orientationDeg: proj.geometry?.orientation ?? 0,
          solarPvKw: solarKw,
          roofPanelsCount: roofPanels?.enabled ? (roofPanels.panelCount || 0) : 0,
          hasWindowSolarPanes: hasWindowBipv,
          batteryKwh: 8.0,
          electricHeaterKw: 2.2,
          naturalVentilationAch: proj.ventilation?.infiltrationACH || 0.25,
          roofTiltDeg: roofPanels?.tiltAngleDeg ?? 30,
        },
        metrics: {
          comfortHoursPerDay: sim.thermalPerformance.comfortHoursPerDay,
          comfortPct: sim.thermalPerformance.comfortPercentage,
          energyRequiredKwhPerDay: sim.energyMetrics.totalEnergyRequirementKwhPerDay,
          solarGeneratedKwhPerDay: sim.energyMetrics.solarEnergyGeneratedKwhPerDay,
          keroseneLPerDay: sim.fossilFuelMetrics.keroseneLPerDay,
          keroseneLPerMonth: sim.fossilFuelMetrics.keroseneLPerMonth,
          totalCostPerDay: sim.costBreakdown.dailyTotalCost,
          totalCostPerMonth: sim.costBreakdown.monthlyTotalCost,
          keroseneSavingsPct: sim.fossilFuelMetrics.keroseneReductionPercentage,
          costSavingsPct: sim.costBreakdown.costReductionPercentage,
          moneySavedPerMonth: sim.costBreakdown.moneySavedPerMonth,
          baselineKeroseneLPerMonth: sim.fossilFuelMetrics.baselineKeroseneLPerMonth,
          co2AvoidedKgPerMonth: Math.round(sim.fossilFuelMetrics.keroseneSavedLPerMonth * 2.52),
        },
        envelopeSpecs: {
          wallU: "0.22 W/m²K",
          roofU: "0.18 W/m²K",
          floorU: "0.28 W/m²K",
          glazing: "Double Low-E Argon (SHGC 0.52)",
        },
      };
    });
  }, [workspaceProjects, activeProjectId]);

  // Candidate Archetypes
  const archetypeItems = useMemo((): UnifiedShelterItem[] => {
    return candidates.map((cand) => {
      const co2 = Math.round(cand.metrics.keroseneLPerMonth * (cand.metrics.keroseneSavingsPct / 100) * 2.52 * 2.8);
      return {
        id: cand.id,
        sourceType: "archetype",
        projectId: undefined,
        name: cand.name,
        tagline: cand.tagline,
        isParetoOptimal: cand.isParetoOptimal,
        isCurrentProposed: !!cand.isCurrentProposed,
        location: "Ladakh Test Range (3,500m)",
        rawCandidate: cand,
        parameters: {
          ...cand.parameters,
          roofTiltDeg: 45,
        },
        metrics: {
          ...cand.metrics,
          moneySavedPerMonth: Math.round(cand.metrics.totalCostPerMonth * (cand.metrics.costSavingsPct / (100 - cand.metrics.costSavingsPct || 1))),
          baselineKeroseneLPerMonth: Math.round(cand.metrics.keroseneLPerMonth / (1 - (cand.metrics.keroseneSavingsPct / 100) || 1)),
          co2AvoidedKgPerMonth: co2,
        },
        envelopeSpecs: {
          wallU: cand.parameters.insulationThicknessMm >= 200 ? "0.14 W/m²K" : cand.parameters.insulationThicknessMm >= 120 ? "0.24 W/m²K" : "0.45 W/m²K",
          roofU: cand.parameters.insulationThicknessMm >= 200 ? "0.12 W/m²K" : "0.20 W/m²K",
          floorU: "0.25 W/m²K",
          glazing: cand.parameters.hasWindowSolarPanes ? "Triple Low-E + BIPV PVB (SHGC 0.40)" : "Double Low-E (SHGC 0.58)",
        },
      };
    });
  }, [candidates]);

  // Combined list
  const allShelterItems: UnifiedShelterItem[] = useMemo(() => {
    return [...workspaceItems, ...archetypeItems];
  }, [workspaceItems, archetypeItems]);

  // Filtered list
  const filteredShelters = useMemo(() => {
    return allShelterItems.filter((item) => {
      // Category filter
      if (filterCategory === "workspace" && item.sourceType !== "workspace") return false;
      if (filterCategory === "archetypes" && item.sourceType !== "archetype") return false;
      if (filterCategory === "pareto" && !item.isParetoOptimal) return false;
      if (filterCategory === "high_solar" && item.parameters.solarPvKw < 3.0) return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesTagline = item.tagline.toLowerCase().includes(query);
        const matchesLocation = item.location.toLowerCase().includes(query);
        return matchesName || matchesTagline || matchesLocation;
      }
      return true;
    });
  }, [allShelterItems, filterCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Bar with View Toggle and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-editorial text-2xl font-bold tracking-tight text-foreground">
              All Listed Shelters & Comprehensive Logistics Matrix
            </h3>
            <Badge variant="outline" className="rounded-full border-border bg-secondary/50 text-foreground text-xs px-2.5 py-0.5 font-mono">
              {filteredShelters.length} Shelters Evaluated
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Detailed engineering breakdown comparing thermal envelope U-values, solar PV generation, living comfort hours, and delivered kerosene logistics costs.
          </p>
        </div>

        {/* View Mode Toggle & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shelters, regions, materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded-full text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-full border border-border">
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Matrix Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                viewMode === "cards"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Dossier Cards
            </button>
          </div>
        </div>
      </div>

      {/* Filter Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground shrink-0">Filter:</span>
        <button
          type="button"
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1 rounded-full border transition cursor-pointer ${
            filterCategory === "all"
              ? "bg-foreground text-background border-foreground font-medium shadow-sm"
              : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
        >
          All Shelters ({allShelterItems.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory("workspace")}
          className={`px-3 py-1 rounded-full border transition cursor-pointer ${
            filterCategory === "workspace"
              ? "bg-foreground text-background border-foreground font-medium shadow-sm"
              : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
        >
          Workspace Portfolio ({workspaceItems.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory("archetypes")}
          className={`px-3 py-1 rounded-full border transition cursor-pointer ${
            filterCategory === "archetypes"
              ? "bg-foreground text-background border-foreground font-medium shadow-sm"
              : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
        >
          Engineered Candidates ({archetypeItems.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory("pareto")}
          className={`px-3 py-1 rounded-full border transition cursor-pointer ${
            filterCategory === "pareto"
              ? "bg-foreground text-background border-foreground font-medium shadow-sm"
              : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
        >
          Pareto Efficient
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory("high_solar")}
          className={`px-3 py-1 rounded-full border transition cursor-pointer ${
            filterCategory === "high_solar"
              ? "bg-foreground text-background border-foreground font-medium shadow-sm"
              : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
        >
          High Solar Focus (&ge;3 kWp)
        </button>
      </div>

      {/* VIEW MODE 1: COMPREHENSIVE ENGINEERING MATRIX TABLE */}
      {viewMode === "matrix" && (
        <div className="rounded-[2rem] border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-secondary/40 border-b border-border text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[220px]">Shelter & Architecture</th>
                  <th className="py-3 px-3 min-w-[130px]">Envelope & U-Values</th>
                  <th className="py-3 px-3 min-w-[140px]">Solar PV & BIPV</th>
                  <th className="py-3 px-3 min-w-[110px]">Comfort Hours</th>
                  <th className="py-3 px-3 min-w-[120px]">Daily Energy</th>
                  <th className="py-3 px-3 min-w-[110px]">Fuel Used</th>
                  <th className="py-3 px-3 min-w-[120px]">Delivered Cost</th>
                  <th className="py-3 px-3 min-w-[120px]">Fuel Saved</th>
                  <th className="py-3 px-4 text-right min-w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredShelters.map((item) => {
                  const isSelected = expandedId === item.id;
                  const isCurrent = item.isCurrentProposed;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setExpandedId(isSelected ? null : item.id)}
                      className={`hover:bg-secondary/30 transition cursor-pointer ${
                        isSelected ? "bg-secondary/50 border-l-4 border-l-primary" : ""
                      } ${isCurrent ? "bg-primary/[0.04]" : ""}`}
                    >
                      {/* 1. Name & Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-foreground">{item.name}</span>
                          {isCurrent && (
                            <Badge className="bg-primary text-primary-foreground text-[9px] py-0 px-1.5 rounded-full">
                              Active
                            </Badge>
                          )}
                          {item.isParetoOptimal && (
                            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] py-0 px-1.5 rounded-full">
                              Pareto
                            </Badge>
                          )}
                          {item.sourceType === "workspace" && (
                            <Badge variant="outline" className="border-border text-muted-foreground text-[9px] py-0 px-1.5 rounded-full">
                              Workspace
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.tagline}</p>
                      </td>

                      {/* 2. Envelope */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-foreground">
                          {item.parameters.insulationThicknessMm}mm Ins.
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Wall: {item.envelopeSpecs.wallU}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {item.parameters.naturalVentilationAch} ACH
                        </div>
                      </td>

                      {/* 3. Solar Hardware */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Sun className="w-3 h-3 shrink-0" />
                          {item.parameters.solarPvKw > 0 ? `${item.parameters.solarPvKw.toFixed(1)} kWp` : "0 kWp (Passive)"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.parameters.roofPanelsCount > 0 ? `${item.parameters.roofPanelsCount}x Panels @ ${item.parameters.roofTiltDeg}°` : "No Rooftop PV"}
                        </div>
                        {item.parameters.hasWindowSolarPanes && (
                          <div className="text-[10px] text-primary font-medium">
                            + BIPV Windows
                          </div>
                        )}
                      </td>

                      {/* 4. Comfort Hours */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          {item.metrics.comfortHoursPerDay} h/day
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {item.metrics.comfortPct}% in zone
                        </div>
                      </td>

                      {/* 5. Daily Energy Required */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-foreground">
                          {item.metrics.energyRequiredKwhPerDay} kWh/d
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400">
                          Solar: {item.metrics.solarGeneratedKwhPerDay} kWh/d
                        </div>
                      </td>

                      {/* 6. Fuel Used */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          {item.metrics.keroseneLPerDay} L/day
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.metrics.keroseneLPerMonth} L/month
                        </div>
                      </td>

                      {/* 7. Delivered Monthly Cost */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-foreground flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" />
                          ₹{item.metrics.totalCostPerMonth.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          ₹{item.metrics.totalCostPerDay}/day
                        </div>
                      </td>

                      {/* 8. Kerosene Savings */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          {item.metrics.keroseneSavingsPct}% Saved
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          -{item.metrics.co2AvoidedKgPerMonth} kg CO₂/mo
                        </div>
                      </td>

                      {/* 9. Action */}
                      <td className="py-3.5 px-4 text-right">
                        {item.sourceType === "workspace" && item.projectId ? (
                          <Button
                            size="sm"
                            variant={isCurrent ? "secondary" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject?.(item.projectId!);
                            }}
                            className="h-7 text-xs px-2.5 rounded-full cursor-pointer"
                          >
                            {isCurrent ? "Active Project" : "Switch To"}
                          </Button>
                        ) : item.rawCandidate ? (
                          <Button
                            size="sm"
                            variant={isCurrent ? "secondary" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApply(item.rawCandidate!);
                            }}
                            className="h-7 text-xs px-2.5 rounded-full cursor-pointer"
                          >
                            {appliedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : isCurrent ? (
                              "Active"
                            ) : (
                              "Adopt"
                            )}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: DETAILED ENGINEERING DOSSIER CARDS */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShelters.map((item) => {
            const isSelected = expandedId === item.id;
            const isCurrent = item.isCurrentProposed;

            return (
              <div
                key={item.id}
                className={`p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden rounded-[2rem] border shadow-sm ${
                  isSelected
                    ? "border-primary bg-secondary/20 shadow-md ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-foreground/20 hover:shadow-md"
                }`}
                onClick={() => setExpandedId(isSelected ? null : item.id)}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-foreground">{item.name}</h4>
                        {isCurrent && (
                          <Badge className="bg-primary text-primary-foreground text-[9px] py-0 px-1.5 rounded-full">
                            Active
                          </Badge>
                        )}
                        {item.sourceType === "workspace" && (
                          <Badge variant="outline" className="border-border text-muted-foreground text-[9px] py-0 px-1.5 rounded-full">
                            Workspace
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.tagline}</p>
                    </div>
                    {item.isParetoOptimal && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 rounded-full shrink-0">
                        Pareto Optimal
                      </Badge>
                    )}
                  </div>

                  {/* 4-Axis Primary Metric Badges */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-2xl bg-secondary/30 border border-border/80 text-center">
                    <div className="p-2 rounded-xl bg-card border border-border/50">
                      <span className="text-[10px] text-muted-foreground block flex items-center justify-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-primary" /> Comfort
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {item.metrics.comfortHoursPerDay} h/day
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-card border border-border/50">
                      <span className="text-[10px] text-muted-foreground block flex items-center justify-center gap-1 font-medium">
                        <Sun className="w-3 h-3 text-amber-500" /> Solar PV
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {item.parameters.solarPvKw.toFixed(1)} kWp
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-card border border-border/50">
                      <span className="text-[10px] text-muted-foreground block flex items-center justify-center gap-1 font-medium">
                        <Flame className="w-3 h-3 text-amber-500" /> Kerosene
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {item.metrics.keroseneLPerDay} L/day
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-card border border-border/50">
                      <span className="text-[10px] text-muted-foreground block flex items-center justify-center gap-1 font-medium">
                        <IndianRupee className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Delivered Cost
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{item.metrics.totalCostPerMonth.toLocaleString()}/mo
                      </span>
                    </div>
                  </div>

                  {/* Envelope and Specs Summary */}
                  <div className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border/60 pt-2.5">
                    <div className="flex justify-between">
                      <span>Insulation:</span>
                      <span className="text-foreground font-medium">
                        {item.parameters.insulationThicknessMm}mm ({item.envelopeSpecs.wallU})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Glazing:</span>
                      <span className="text-foreground font-medium truncate max-w-[180px]">
                        {item.envelopeSpecs.glazing}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kerosene Saved:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {item.metrics.keroseneSavingsPct}% vs CGI barrack
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Eye className="w-3 h-3 text-muted-foreground/80" />
                    {isSelected ? "Hide Dossier" : "View Full Dossier"}
                  </span>

                  {item.sourceType === "workspace" && item.projectId ? (
                    <Button
                      size="sm"
                      variant={isCurrent ? "secondary" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject?.(item.projectId!);
                      }}
                      className="h-7 text-xs px-2.5 rounded-full cursor-pointer"
                    >
                      {isCurrent ? "Active Model" : "Switch Project"}
                    </Button>
                  ) : item.rawCandidate ? (
                    <Button
                      size="sm"
                      variant={isCurrent ? "secondary" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(item.rawCandidate!);
                      }}
                      className="h-7 text-xs px-2.5 rounded-full cursor-pointer"
                    >
                      {appliedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" /> Applied!
                        </>
                      ) : isCurrent ? (
                        "Active Model"
                      ) : (
                        "Adopt Design"
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EXPANDABLE DEEP-DIVE ENGINEERING DOSSIER DRAWER (WHEN A SHELTER IS SELECTED) */}
      {expandedId && (
        <div className="p-6 bg-card border-2 border-border shadow-xl rounded-[2rem] relative overflow-hidden animate-in fade-in-50 duration-300">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          {(() => {
            const selected = allShelterItems.find((s) => s.id === expandedId) || allShelterItems[0];
            if (!selected) return null;

            return (
              <div className="space-y-6">
                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-editorial text-2xl font-bold text-foreground flex items-center gap-2">
                        {selected.name}
                      </h4>
                      {selected.isCurrentProposed && (
                        <Badge className="bg-primary text-primary-foreground text-xs rounded-full">
                          Active in 3D Studio
                        </Badge>
                      )}
                      {selected.isParetoOptimal && (
                        <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs rounded-full">
                          Pareto Optimal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{selected.tagline}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Technical Dossier Reference:</span>
                    <Badge variant="outline" className="rounded-full border-border bg-secondary/50 font-mono text-xs text-foreground px-2.5 py-0.5">
                      PS-26051-{selected.id.toUpperCase().slice(0, 10)}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      className="text-xs text-muted-foreground hover:text-foreground ml-2 cursor-pointer font-medium"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                {/* 4 Deep-Dive Sub-Panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Panel 1: Envelope & Structural Anatomy */}
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-3">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs border-b border-border/80 pb-2">
                      <Building className="w-4 h-4 text-primary" />
                      1. Envelope & Insulation Anatomy
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Insulation:</span>
                        <span className="text-foreground font-medium">{selected.parameters.insulationThicknessMm} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wall U-Value:</span>
                        <span className="text-foreground font-medium">{selected.envelopeSpecs.wallU}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Roof U-Value:</span>
                        <span className="text-foreground font-medium">{selected.envelopeSpecs.roofU}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Glazing Spec:</span>
                        <span className="text-foreground font-medium truncate max-w-[130px]">{selected.envelopeSpecs.glazing}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Infiltration:</span>
                        <span className="text-foreground font-medium">{selected.parameters.naturalVentilationAch} ACH</span>
                      </div>
                    </div>
                  </div>

                  {/* Panel 2: Solar PV & Storage Microgrid */}
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs border-b border-border/80 pb-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      2. Solar Generation & Battery
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rooftop PV:</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{selected.parameters.solarPvKw.toFixed(1)} kWp</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Panel Tilt:</span>
                        <span className="text-foreground font-medium">{selected.parameters.roofTiltDeg}° (Winter Optimum)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Window BIPV:</span>
                        <span className="text-primary font-medium">{selected.parameters.hasWindowSolarPanes ? "Installed" : "None"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Battery Capacity:</span>
                        <span className="text-foreground font-medium">{selected.parameters.batteryKwh} kWh LiFePO4</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Solar Yield:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">~{selected.metrics.solarGeneratedKwhPerDay} kWh/day</span>
                      </div>
                    </div>
                  </div>

                  {/* Panel 3: Operational Fuel & Bukhari Logistics */}
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs border-b border-border/80 pb-2">
                      <Flame className="w-4 h-4 text-amber-500" />
                      3. Operational Fuel & Logistics
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Kerosene:</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{selected.metrics.keroseneLPerDay} L/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Fuel:</span>
                        <span className="text-foreground font-medium">{selected.metrics.keroseneLPerMonth} L/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CGI Baseline:</span>
                        <span className="text-rose-600 dark:text-rose-400 line-through">{selected.metrics.baselineKeroseneLPerMonth} L/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fuel Displaced:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selected.metrics.keroseneSavingsPct}% Abated</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CO₂ Avoided:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{selected.metrics.co2AvoidedKgPerMonth} kg/mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Panel 4: Financial Payback & Economic Return */}
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border-b border-border/80 pb-2">
                      <IndianRupee className="w-4 h-4 text-emerald-500" />
                      4. Financial Economics & Payback
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivered Cost:</span>
                        <span className="text-foreground font-bold">₹{selected.metrics.totalCostPerMonth.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Savings:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{selected.metrics.moneySavedPerMonth.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annual Savings:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{(selected.metrics.moneySavedPerMonth * 12).toLocaleString()}/yr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost Cut:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{selected.metrics.costSavingsPct}% reduction</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Payback:</span>
                        <span className="text-foreground font-medium">~2.8 - 3.4 Years</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border text-xs">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      Adopting this architecture updates the active 3D model geometry, insulation schedule, and solar PV tilt array in real time.
                    </span>
                  </div>

                  {selected.sourceType === "workspace" && selected.projectId ? (
                    <Button
                      size="sm"
                      onClick={() => onSelectProject?.(selected.projectId!)}
                      className="bg-foreground text-background hover:bg-foreground/90 font-bold px-5 rounded-full cursor-pointer"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Make Active Workspace Project
                    </Button>
                  ) : selected.rawCandidate ? (
                    <Button
                      size="sm"
                      onClick={() => handleApply(selected.rawCandidate!)}
                      className="bg-foreground text-background hover:bg-foreground/90 font-bold px-5 rounded-full cursor-pointer"
                    >
                      <Zap className="w-4 h-4 mr-1.5" />
                      Adopt Architecture into Active Model
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
