"use client";

import React from "react";
import {
  Flame,
  Zap,
  TrendingDown,
  Sun,
  ShieldCheck,
  IndianRupee,
  Clock,
  Thermometer,
  AlertTriangle,
  Sparkles,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnergySimulationResult } from "../energy-types";

interface EnergyDashboardPanelProps {
  simulationResult: EnergySimulationResult;
}

export function EnergyDashboardPanel({ simulationResult }: EnergyDashboardPanelProps) {
  const {
    thermalPerformance,
    baselineThermalPerformance,
    energyMetrics,
    fossilFuelMetrics,
    costBreakdown,
    comfortConfig,
    solarHardware,
  } = simulationResult;

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Physics & ML Simulation Notice:</strong> All performance figures and fuel reductions are{" "}
            <span className="underline decoration-dotted font-semibold">ML-based model estimates</span> derived from the
            calibrated thermal surrogate & RC engine. Economic figures reflect user-defined assumed logistics parameters.
          </span>
        </div>
        <Badge variant="outline" className="text-amber-400 border-amber-500/40 text-[10px] whitespace-nowrap">
          ML Model Estimates
        </Badge>
      </div>

      {/* Hero Comparative Impact Card */}
      <Card className="p-6 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white tracking-wide">
              Shelter Performance & Fossil Fuel Abatement Summary
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {solarHardware.totalSolarCapacityKw > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[11px]">
                <Sun className="w-3 h-3 mr-1" />
                {solarHardware.totalSolarCapacityKw.toFixed(1)} kWp Total Solar (Roof: {solarHardware.rooftopPvKw.toFixed(1)} kWp | BIPV: {solarHardware.windowBipvKw.toFixed(2)} kWp)
              </Badge>
            )}
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              {fossilFuelMetrics.keroseneReductionPercentage}% Kerosene Reduction
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
          {/* Indoor Comfort */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Indoor Comfort</span>
            <div className="text-sm font-semibold text-slate-200">
              <span className="text-slate-400 line-through mr-1.5">{baselineThermalPerformance.comfortHoursPerDay}h</span>
              <span className="text-emerald-400 text-base">{thermalPerformance.comfortHoursPerDay} h/day</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {thermalPerformance.comfortPercentage}% in range
            </span>
          </div>

          {/* Energy Requirement */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Energy Required</span>
            <div className="text-base font-semibold text-cyan-400">
              {energyMetrics.totalEnergyRequirementKwhPerDay}{" "}
              <span className="text-xs font-normal text-slate-400">kWh/day</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Heating: {energyMetrics.heatingEnergyRequirementKwhPerDay} kWh
            </span>
          </div>

          {/* Kerosene Per Day */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Daily Kerosene</span>
            <div className="text-sm font-semibold text-slate-200">
              <span className="text-rose-400/80 line-through mr-1.5">{fossilFuelMetrics.baselineKeroseneLPerDay}L</span>
              <span className="text-amber-400 text-base">{fossilFuelMetrics.keroseneLPerDay} L/day</span>
            </div>
            <span className="text-[10px] text-emerald-400 mt-1 block">
              Save {fossilFuelMetrics.keroseneSavedLPerDay} L/day
            </span>
          </div>

          {/* Monthly Fuel Saving */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Monthly Fuel Saved</span>
            <div className="text-base font-semibold text-emerald-400">
              {fossilFuelMetrics.keroseneSavedLPerMonth}{" "}
              <span className="text-xs font-normal text-slate-400">L/month</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              From {fossilFuelMetrics.baselineKeroseneLPerMonth}L baseline
            </span>
          </div>

          {/* Total Heating Cost */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Heating & Fuel Cost</span>
            <div className="text-sm font-semibold text-slate-200">
              <span className="text-slate-400 line-through mr-1.5 text-xs">₹{Math.round(costBreakdown.baselineFuelCostPerMonth / 1000)}k</span>
              <span className="text-cyan-400 text-base">₹{Math.round(costBreakdown.totalHeatingCostPerMonth / 1000)}k</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">per month (delivered)</span>
          </div>

          {/* Estimated Monthly Saving */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Estimated Saving</span>
            <div className="text-base font-semibold text-emerald-400">
              ₹{costBreakdown.moneySavedPerMonth.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400/90 mt-1 block">
              {costBreakdown.costReductionPercentage}% cost cut
            </span>
          </div>

          {/* Fossil Fuel Reduction */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] font-medium text-emerald-300 block mb-1">Fossil Reduction</span>
            <div className="text-xl font-bold text-emerald-400">
              {fossilFuelMetrics.keroseneReductionPercentage}%
            </div>
            <span className="text-[10px] text-emerald-300/80 mt-1 block">Passive First</span>
          </div>
        </div>
      </Card>

      {/* Three Detailed Dashboard Sections (Section A, B, C) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Section A: Shelter Performance */}
        <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Thermometer className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">A. Shelter Performance</h4>
            </div>
            <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
              Thermal Status
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Comfort Hours
              </span>
              <span className="text-sm font-semibold text-slate-100">
                {thermalPerformance.comfortHoursPerDay} hours/day
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-blue-400" /> Avg Indoor Temp
              </span>
              <span className="text-sm font-semibold text-slate-100">
                {thermalPerformance.averageIndoorTempC}°C{" "}
                <span className="text-xs font-normal text-slate-400">
                  ({thermalPerformance.minIndoorTempC}°C to {thermalPerformance.maxIndoorTempC}°C)
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" /> Energy Required
              </span>
              <span className="text-sm font-semibold text-cyan-400">
                {energyMetrics.totalEnergyRequirementKwhPerDay} kWh/day
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Kerosene Required
              </span>
              <span className="text-sm font-semibold text-amber-400">
                {fossilFuelMetrics.keroseneLPerDay} L/day
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
            Target comfort range: <strong>{comfortConfig.comfortMinC}°C – {comfortConfig.comfortMaxC}°C</strong>. Below comfort for{" "}
            {thermalPerformance.hoursBelowComfort} hours/day (nocturnal dips).
          </div>
        </Card>

        {/* Section B: Fuel Saving */}
        <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">B. Fuel Saving</h4>
            </div>
            <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
              Backup Analysis
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400">Baseline Kerosene</span>
              <span className="text-sm font-semibold text-rose-400">
                {fossilFuelMetrics.baselineKeroseneLPerMonth} L/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400">Proposed Kerosene</span>
              <span className="text-sm font-semibold text-amber-400">
                {fossilFuelMetrics.keroseneLPerMonth} L/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400">Kerosene Saved</span>
              <span className="text-sm font-semibold text-emerald-400">
                {fossilFuelMetrics.keroseneSavedLPerMonth} L/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-slate-400">Percentage Reduction</span>
              <span className="text-sm font-semibold text-emerald-400">
                {fossilFuelMetrics.keroseneReductionPercentage}%
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
            Kerosene serves as an <strong>emergency backup</strong> during severe overcast or pre-dawn temperature troughs, not primary heating.
          </div>
        </Card>

        {/* Section C: Cost Saving */}
        <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">C. Cost Saving</h4>
            </div>
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
              Logistics + Fuel
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400">Existing Cost</span>
              <span className="text-sm font-semibold text-rose-400">
                ₹{costBreakdown.baselineTotalCostPerMonth.toLocaleString()}/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400">Proposed Cost</span>
              <span className="text-sm font-semibold text-cyan-400">
                ₹{costBreakdown.monthlyTotalCost.toLocaleString()}/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-400">Estimated Saving</span>
              <span className="text-sm font-semibold text-emerald-400">
                ₹{costBreakdown.moneySavedPerMonth.toLocaleString()}/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-slate-400">Daily Operating Cost</span>
              <span className="text-sm font-semibold text-slate-200">
                ₹{costBreakdown.dailyTotalCost}/day
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
            Includes delivered fuel, mountain transit, storage maintenance, and auxiliary electric heating costs.
          </div>
        </Card>
      </div>
    </div>
  );
}
