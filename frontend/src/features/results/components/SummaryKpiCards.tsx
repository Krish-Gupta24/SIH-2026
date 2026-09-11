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

  const indoorMin = typeof summary.indoorMinC === "number" ? convertTemperature(summary.indoorMinC, unit) : null;
  const outdoorMin = typeof summary.outdoorMinC === "number" ? convertTemperature(summary.outdoorMinC, unit) : null;
  const indoorMax = typeof summary.indoorMaxC === "number" ? convertTemperature(summary.indoorMaxC, unit) : null;
  const outdoorMax = typeof summary.outdoorMaxC === "number" ? convertTemperature(summary.outdoorMaxC, unit) : null;
  const indoorMean = typeof summary.indoorMeanC === "number" ? convertTemperature(summary.indoorMeanC, unit) : null;

  const heatingDemand = typeof summary.heatingDemandKwhM2 === "number" ? convertEnergyDensity(summary.heatingDemandKwhM2, unit) : null;
  const hasPeakLoss = typeof summary.peakEnvelopeLossW === "number";
  const peakLoss = hasPeakLoss ? convertPower(summary.peakEnvelopeLossW!, unit) : null;

  const hasSolarGain = typeof summary.totalSolarGainKwh === "number";
  const solarGain = hasSolarGain ? convertEnergy(summary.totalSolarGainKwh!, unit) : null;

  const hasUnderheating = typeof summary.underheatingDegreeHoursCh === "number";
  const underheatingVal = hasUnderheating ? summary.underheatingDegreeHoursCh! : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 1. Min Indoor Nighttime Temp */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label text-muted-foreground">
            Min Indoor Temp
          </span>
          <div className="h-7 w-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
            <ThermometerSnowflake className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {indoorMin !== null ? (
            <>
              <span className="text-3xl font-medium tracking-tight">
                {formatNumber(indoorMin, 1)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{tUnit}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic py-1">Unavailable</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <span>Amb Min:</span>
          <span className="font-medium text-foreground">
            {outdoorMin !== null ? `${formatNumber(outdoorMin, 1)}${tUnit}` : "—"}
          </span>
          {indoorMin !== null && outdoorMin !== null && (
            <span className="text-emerald-500 font-semibold ml-auto">
              +{formatNumber(indoorMin - outdoorMin, 1)}Δ
            </span>
          )}
        </div>
      </div>

      {/* 2. Diurnal Buffer / Max Indoor Temp */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label text-muted-foreground">
            Peak Indoor Temp
          </span>
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Sun className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {indoorMax !== null ? (
            <>
              <span className="text-3xl font-medium tracking-tight">
                {formatNumber(indoorMax, 1)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{tUnit}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic py-1">Unavailable</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <span>Mean:</span>
          <span className="font-medium text-foreground">
            {indoorMean !== null ? `${formatNumber(indoorMean, 1)}${tUnit}` : "—"}
          </span>
          <span className="ml-auto">
            Amb: {outdoorMax !== null ? `${formatNumber(outdoorMax, 1)}${tUnit}` : "—"}
          </span>
        </div>
      </div>

      {/* 3. Hours in Target Comfort Band */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label text-muted-foreground">
            Comfort Band Time
          </span>
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {typeof summary.comfortHoursPct === "number" ? (
            <>
              <span className="text-3xl font-medium tracking-tight">
                {formatNumber(summary.comfortHoursPct, 1)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">%</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic py-1">Unavailable</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">18°C–24°C Band</span>
          {typeof summary.comfortHoursPct === "number" && (
            <Badge
              variant={summary.comfortHoursPct >= 75 ? "outline" : "secondary"}
              className="text-[10px] py-0 px-2 font-medium"
            >
              {summary.comfortHoursPct >= 75 ? "Target Met" : "Moderate"}
            </Badge>
          )}
        </div>
      </div>

      {/* 4. Diurnal Swing Damping */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label text-muted-foreground">
            Thermal Damping
          </span>
          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <TrendingDown className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {typeof summary.diurnalSwingDampingPct === "number" ? (
            <>
              <span className="text-3xl font-medium tracking-tight">
                {formatNumber(summary.diurnalSwingDampingPct, 1)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">%</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic py-1">Unavailable</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Mass buffering</span>
          <span className="text-emerald-500 font-medium">Optimal</span>
        </div>
      </div>

      {/* 5. Heating Demand Index */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label text-muted-foreground">
            Heating Demand
          </span>
          <div className="h-7 w-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
            <Flame className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {heatingDemand !== null ? (
            <>
              <span className="text-3xl font-medium tracking-tight">
                {formatNumber(heatingDemand, 1)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{edUnit}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic py-1">Unavailable</span>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Passive solar accounted
        </div>
      </div>

      {/* 6. Peak Envelope Loss Rate */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label text-muted-foreground">
            Peak Conduction Loss
          </span>
          <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {hasPeakLoss ? (
            <>
              <span className="text-3xl font-medium tracking-tight">
                {formatNumber(peakLoss!, 0)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{pUnit}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic py-1">
              Unavailable
            </span>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Walls, roof & glazing
        </div>
      </div>

      {/* 7. Total Solar Passive Gains */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label text-muted-foreground">
            Total Solar Gain
          </span>
          <div className="h-7 w-7 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {hasSolarGain ? (
            <>
              <span className="text-3xl font-medium tracking-tight">
                {formatNumber(solarGain!, 1)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{eUnit}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic py-1">
              Unavailable
            </span>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          South aperture radiation
        </div>
      </div>

      {/* 8. Underheating Degree-Hours */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label text-muted-foreground">
            Underheating Deficit
          </span>
          <div className="h-7 w-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {hasUnderheating ? (
            <>
              <span className="text-3xl font-medium tracking-tight">
                {formatNumber(underheatingVal!, 1)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{tUnit}·h</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic py-1">
              Unavailable
            </span>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Base: 18.0°C Alpine standard
        </div>
      </div>
    </div>
  );
}
