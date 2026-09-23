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
  onInstallSolar?: () => void;
}

export function EnergyDashboardPanel({ simulationResult, onInstallSolar }: EnergyDashboardPanelProps) {
  const {
    thermalPerformance,
    baselineThermalPerformance,
    energyMetrics,
    fossilFuelMetrics,
    costBreakdown,
    comfortConfig,
    solarHardware,
    solarOpportunityAdvisory,
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

      {/* Solar PV Opportunity & Cost Saving Advisory Card (When Solar is Disabled / Pure Passive) */}
      {solarOpportunityAdvisory && !solarOpportunityAdvisory.isSolarInstalled && (
        <div className="rounded-[2rem] border-2 border-amber-500/40 bg-card p-6 sm:p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] relative overflow-hidden space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="micro-label text-amber-600 dark:text-amber-400">
                      Solar Upgrade Opportunity
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                      100% Pure Passive Active
                    </span>
                  </div>
                  <h4 className="font-editorial text-xl font-medium text-foreground tracking-tight mt-0.5">
                    Solar PV Upgrade Opportunity & Fuel Cost Advisory
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {solarOpportunityAdvisory.rationale}
                  </p>
                </div>
              </div>

              {/* 4 Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-center">
                <div className="p-3 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Recommended Array</span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {solarOpportunityAdvisory.recommendedKw} kWp <small className="text-muted-foreground">({solarOpportunityAdvisory.recommendedTiltDeg}° Tilt)</small>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Est. Solar Harvest</span>
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    ~{solarOpportunityAdvisory.estDailyYieldKwh} kWh/day
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Kerosene Displaced</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ~{solarOpportunityAdvisory.estMonthlyKeroseneSavedL} L / month
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Annual Savings</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ~₹{solarOpportunityAdvisory.estAnnualCostSavingsInr.toLocaleString()} / yr
                  </span>
                </div>
              </div>
            </div>

            {/* 1-Click Action Button */}
            {onInstallSolar && (
              <div className="flex flex-col items-center md:items-end justify-center shrink-0">
                <button
                  type="button"
                  onClick={onInstallSolar}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-6 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6E818F]"
                >
                  <Zap className="w-4 h-4 fill-current text-amber-400" />
                  <span>+ Install {solarOpportunityAdvisory.recommendedKw} kWp Solar Array</span>
                </button>
                <span className="text-[10px] text-muted-foreground mt-1">
                  Payback period: ~{solarOpportunityAdvisory.estPaybackYears} years
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Comparative Impact Card */}
      <Card className="rounded-[2rem] border border-border bg-card p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-semibold text-foreground tracking-tight font-editorial sm:text-lg">
              Shelter Performance & Fossil Fuel Abatement Summary
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {solarHardware.totalSolarCapacityKw > 0 && (
              <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 text-[11px]">
                <Sun className="w-3 h-3 mr-1" />
                {solarHardware.totalSolarCapacityKw.toFixed(1)} kWp Total Solar (Roof: {solarHardware.rooftopPvKw.toFixed(1)} kWp | BIPV: {solarHardware.windowBipvKw.toFixed(2)} kWp)
              </Badge>
            )}
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {fossilFuelMetrics.keroseneReductionPercentage}% Kerosene Reduction
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
          {/* Indoor Comfort */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-[11px] font-medium text-muted-foreground block mb-1">Indoor Comfort</span>
            <div className="text-sm font-semibold text-foreground">
              <span className="text-muted-foreground line-through mr-1.5">{baselineThermalPerformance.comfortHoursPerDay}h</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-base font-bold">{thermalPerformance.comfortHoursPerDay} h/day</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              {thermalPerformance.comfortPercentage}% in range
            </span>
          </div>

          {/* Energy Requirement */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-[11px] font-medium text-muted-foreground block mb-1">Energy Required</span>
            <div className="text-base font-bold text-cyan-600 dark:text-cyan-400">
              {energyMetrics.totalEnergyRequirementKwhPerDay}{" "}
              <span className="text-xs font-normal text-muted-foreground">kWh/day</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              Heating: {energyMetrics.heatingEnergyRequirementKwhPerDay} kWh
            </span>
          </div>

          {/* Kerosene Per Day */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-[11px] font-medium text-muted-foreground block mb-1">Daily Kerosene</span>
            <div className="text-sm font-semibold text-foreground">
              <span className="text-rose-500/80 line-through mr-1.5">{fossilFuelMetrics.baselineKeroseneLPerDay}L</span>
              <span className="text-amber-600 dark:text-amber-400 text-base font-bold">{fossilFuelMetrics.keroseneLPerDay} L/day</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block font-medium">
              Save {fossilFuelMetrics.keroseneSavedLPerDay} L/day
            </span>
          </div>

          {/* Monthly Fuel Saving */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-[11px] font-medium text-muted-foreground block mb-1">Monthly Fuel Saved</span>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {fossilFuelMetrics.keroseneSavedLPerMonth}{" "}
              <span className="text-xs font-normal text-muted-foreground">L/month</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              From {fossilFuelMetrics.baselineKeroseneLPerMonth}L baseline
            </span>
          </div>

          {/* Total Heating Cost */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-[11px] font-medium text-muted-foreground block mb-1">Heating & Fuel Cost</span>
            <div className="text-sm font-semibold text-foreground">
              <span className="text-muted-foreground line-through mr-1.5 text-xs">₹{Math.round(costBreakdown.baselineFuelCostPerMonth / 1000)}k</span>
              <span className="text-cyan-600 dark:text-cyan-400 text-base font-bold">₹{Math.round(costBreakdown.totalHeatingCostPerMonth / 1000)}k</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">per month (delivered)</span>
          </div>

          {/* Estimated Monthly Saving */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/60">
            <span className="text-[11px] font-medium text-muted-foreground block mb-1">Estimated Saving</span>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              ₹{costBreakdown.moneySavedPerMonth.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">
              {costBreakdown.costReductionPercentage}% cost cut
            </span>
          </div>

          {/* Fossil Fuel Reduction */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 block mb-1">Fossil Reduction</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {fossilFuelMetrics.keroseneReductionPercentage}%
            </div>
            <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-1 block font-medium">Passive First</span>
          </div>
        </div>
      </Card>

      {/* Three Detailed Dashboard Sections (Section A, B, C) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Section A: Shelter Performance */}
        <Card className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <Thermometer className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-foreground font-editorial text-base">A. Shelter Performance</h4>
            </div>
            <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-500/30">
              Thermal Status
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" /> Comfort Hours
              </span>
              <span className="text-sm font-semibold text-foreground">
                {thermalPerformance.comfortHoursPerDay} hours/day
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-blue-500" /> Avg Indoor Temp
              </span>
              <span className="text-sm font-semibold text-foreground">
                {thermalPerformance.averageIndoorTempC}°C{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({thermalPerformance.minIndoorTempC}°C to {thermalPerformance.maxIndoorTempC}°C)
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-500" /> Energy Required
              </span>
              <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                {energyMetrics.totalEnergyRequirementKwhPerDay} kWh/day
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Kerosene Required
              </span>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {fossilFuelMetrics.keroseneLPerDay} L/day
              </span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground bg-secondary/40 p-3 rounded-xl border border-border/60">
            Target comfort range: <strong>{comfortConfig.comfortMinC}°C – {comfortConfig.comfortMaxC}°C</strong>. Below comfort for{" "}
            {thermalPerformance.hoursBelowComfort} hours/day (nocturnal dips).
          </div>
        </Card>

        {/* Section B: Fuel Saving */}
        <Card className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Flame className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-foreground font-editorial text-base">B. Fuel Saving</h4>
            </div>
            <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/30">
              Backup Analysis
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Baseline Kerosene</span>
              <span className="text-sm font-semibold text-rose-500">
                {fossilFuelMetrics.baselineKeroseneLPerMonth} L/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Proposed Kerosene</span>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {fossilFuelMetrics.keroseneLPerMonth} L/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Kerosene Saved</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {fossilFuelMetrics.keroseneSavedLPerMonth} L/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">Percentage Reduction</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {fossilFuelMetrics.keroseneReductionPercentage}%
              </span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground bg-secondary/40 p-3 rounded-xl border border-border/60">
            Kerosene serves as an <strong>emergency backup</strong> during severe overcast or pre-dawn temperature troughs, not primary heating.
          </div>
        </Card>

        {/* Section C: Cost Saving */}
        <Card className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <IndianRupee className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-foreground font-editorial text-base">C. Cost Saving</h4>
            </div>
            <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              Logistics + Fuel
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Existing Cost</span>
              <span className="text-sm font-semibold text-rose-500">
                ₹{costBreakdown.baselineTotalCostPerMonth.toLocaleString()}/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Proposed Cost</span>
              <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                ₹{costBreakdown.monthlyTotalCost.toLocaleString()}/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Estimated Saving</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                ₹{costBreakdown.moneySavedPerMonth.toLocaleString()}/month
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">Daily Operating Cost</span>
              <span className="text-sm font-semibold text-foreground">
                ₹{costBreakdown.dailyTotalCost}/day
              </span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground bg-secondary/40 p-3 rounded-xl border border-border/60">
            Includes delivered fuel, mountain transit, storage maintenance, and auxiliary electric heating costs.
          </div>
        </Card>
      </div>
    </div>
  );
}
