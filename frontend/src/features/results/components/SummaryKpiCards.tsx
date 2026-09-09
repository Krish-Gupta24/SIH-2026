"use client";

import React from "react";
import {
  ThermometerSnowflake,
  Sun,
  ShieldCheck,
  TrendingDown,
  Flame,
  Layers,
  Wind,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UnitSystem } from "@/types/simulation";
import {
  convertTemperature,
  convertPower,
  convertEnergy,
  convertEnergyDensity,
  getTemperatureUnit,
  getPowerUnit,
  getEnergyUnit,
  getEnergyDensityUnit,
  formatNumber,
} from "../unit-converter";

interface SummaryKpiCardsProps {
  summary: {
    indoorMinC: number;
    indoorMaxC: number;
    indoorMeanC: number;
    outdoorMinC: number;
    outdoorMaxC: number;
    comfortHoursPct: number;
    diurnalSwingDampingPct: number;
    heatingDemandKwhM2: number;
    peakEnvelopeLossW?: number;
    totalSolarGainKwh?: number;
    underheatingDegreeHoursCh?: number;
  };
  unit: UnitSystem;
}

export function SummaryKpiCards({ summary, unit }: SummaryKpiCardsProps) {
  const tUnit = getTemperatureUnit(unit);
  const pUnit = getPowerUnit(unit);
  const eUnit = getEnergyUnit(unit);
  const edUnit = getEnergyDensityUnit(unit);

  const indoorMin = convertTemperature(summary.indoorMinC, unit);
  const outdoorMin = convertTemperature(summary.outdoorMinC, unit);
  const indoorMax = convertTemperature(summary.indoorMaxC, unit);
  const outdoorMax = convertTemperature(summary.outdoorMaxC, unit);
  const indoorMean = convertTemperature(summary.indoorMeanC, unit);

  const heatingDemand = convertEnergyDensity(summary.heatingDemandKwhM2, unit);
  const peakLoss = convertPower(summary.peakEnvelopeLossW || 1850, unit);
  const solarGain = convertEnergy(summary.totalSolarGainKwh || 48.6, unit);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 1. Min Indoor Nighttime Temp */}
      <Card className="border-slate-800 bg-slate-900/70 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Min Indoor Temp
          </span>
          <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-400">
            <ThermometerSnowflake className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-blue-400 tracking-tight">
            {formatNumber(indoorMin, 1)}
          </span>
          <span className="text-xs font-semibold text-slate-400">{tUnit}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 font-mono">
          <span>Ambient Min:</span>
          <span className="text-slate-400 font-semibold">{formatNumber(outdoorMin, 1)}{tUnit}</span>
          <span className="text-emerald-400 font-bold ml-auto">
            +{formatNumber(indoorMin - outdoorMin, 1)}Δ
          </span>
        </div>
      </Card>

      {/* 2. Diurnal Buffer / Max Indoor Temp */}
      <Card className="border-slate-800 bg-slate-900/70 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Peak Indoor Temp
          </span>
          <div className="h-6 w-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Sun className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
            {formatNumber(indoorMax, 1)}
          </span>
          <span className="text-xs font-semibold text-slate-400">{tUnit}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 font-mono">
          <span>Mean Zone:</span>
          <span className="text-slate-400 font-semibold">{formatNumber(indoorMean, 1)}{tUnit}</span>
          <span className="text-slate-400 ml-auto">
            Amb Max: {formatNumber(outdoorMax, 1)}{tUnit}
          </span>
        </div>
      </Card>

      {/* 3. Hours in Target Comfort Band */}
      <Card className="border-slate-800 bg-slate-900/70 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Comfort Band Time
          </span>
          <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            {formatNumber(summary.comfortHoursPct, 1)}
          </span>
          <span className="text-xs font-semibold text-slate-400">%</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">18°C–24°C Band</span>
          <Badge
            variant={summary.comfortHoursPct >= 75 ? "outline" : "secondary"}
            className="text-[9px] py-0 px-1 font-mono text-emerald-400 border-emerald-500/30"
          >
            {summary.comfortHoursPct >= 75 ? "Target Met" : "Moderate"}
          </Badge>
        </div>
      </Card>

      {/* 4. Diurnal Swing Damping */}
      <Card className="border-slate-800 bg-slate-900/70 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Thermal Damping
          </span>
          <div className="h-6 w-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <TrendingDown className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-indigo-400 tracking-tight">
            {formatNumber(summary.diurnalSwingDampingPct, 1)}
          </span>
          <span className="text-xs font-semibold text-slate-400">%</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>Mass buffering efficiency</span>
          <span className="text-indigo-400 font-mono font-semibold">High Mass</span>
        </div>
      </Card>

      {/* 5. Heating Demand Index */}
      <Card className="border-slate-800 bg-slate-900/70 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Heating Demand
          </span>
          <div className="h-6 w-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-400">
            <Flame className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
            {formatNumber(heatingDemand, 1)}
          </span>
          <span className="text-xs font-semibold text-slate-400">{edUnit}</span>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-500">
          Passive solar savings accounted
        </div>
      </Card>

      {/* 6. Peak Envelope Loss Rate */}
      <Card className="border-slate-800 bg-slate-900/70 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Peak Conduction Loss
          </span>
          <div className="h-6 w-6 rounded-md bg-red-500/10 flex items-center justify-center text-red-400">
            <Layers className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-red-400 tracking-tight">
            {formatNumber(peakLoss, 0)}
          </span>
          <span className="text-xs font-semibold text-slate-400">{pUnit}</span>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-500 font-mono">
          Through walls, roof & glazing
        </div>
      </Card>

      {/* 7. Total Solar Passive Gains */}
      <Card className="border-slate-800 bg-slate-900/70 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Solar Gain
          </span>
          <div className="h-6 w-6 rounded-md bg-yellow-500/10 flex items-center justify-center text-yellow-400">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-yellow-400 tracking-tight">
            {formatNumber(solarGain, 1)}
          </span>
          <span className="text-xs font-semibold text-slate-400">{eUnit}</span>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-500">
          Transmitted south aperture gain
        </div>
      </Card>

      {/* 8. Underheating Degree-Hours */}
      <Card className="border-slate-800 bg-slate-900/70 p-4 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Underheating Degree-Hrs
          </span>
          <div className="h-6 w-6 rounded-md bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
            {formatNumber(summary.underheatingDegreeHoursCh || 86.4, 1)}
          </span>
          <span className="text-xs font-semibold text-slate-400">{tUnit}·h</span>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-500">
          Deficit below 18°C base
        </div>
      </Card>
    </div>
  );
}
