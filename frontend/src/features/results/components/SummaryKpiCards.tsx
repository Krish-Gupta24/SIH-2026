"use client";

import React from "react";
import {
  ThermometerSnowflake,
  Sun,
  ShieldCheck,
  TrendingDown,
  Flame,
  Layers,
  Sparkles,
  Clock,
} from "lucide-react";
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
          <span className="micro-label">Min Indoor Temp</span>
          <div className="size-7 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            <ThermometerSnowflake className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {indoorMin !== null ? (
            <>
              <span className="font-editorial text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
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
            <span className="text-foreground font-semibold ml-auto">
              +{formatNumber(indoorMin - outdoorMin, 1)}Δ
            </span>
          )}
        </div>
      </div>

      {/* 2. Diurnal Buffer / Max Indoor Temp */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label">Peak Indoor Temp</span>
          <div className="size-7 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            <Sun className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {indoorMax !== null ? (
            <>
              <span className="font-editorial text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
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
          <span className="micro-label">Comfort Band Time</span>
          <div className="size-7 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            <ShieldCheck className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {typeof summary.comfortHoursPct === "number" ? (
            <>
              <span className="font-editorial text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
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
            <span className="rounded-full bg-[#CBDCE6] text-black px-2 py-0.5 text-[9px] font-bold">
              {summary.comfortHoursPct >= 75 ? "Target Met" : "Moderate"}
            </span>
          )}
        </div>
      </div>

      {/* 4. Diurnal Swing Damping */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label">Thermal Damping</span>
          <div className="size-7 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            <TrendingDown className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {typeof summary.diurnalSwingDampingPct === "number" ? (
            <>
              <span className="font-editorial text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
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
          <span className="text-foreground font-semibold">Optimal</span>
        </div>
      </div>

      {/* 5. Heating Demand Index */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-[#6E818F] transition-colors relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="micro-label">Heating Demand</span>
          <div className="size-7 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            <Flame className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {heatingDemand !== null ? (
            <>
              <span className="font-editorial text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
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
          <span className="micro-label">Peak Conduction Loss</span>
          <div className="size-7 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            <Layers className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {hasPeakLoss ? (
            <>
              <span className="font-editorial text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
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
          <span className="micro-label">Total Solar Gain</span>
          <div className="size-7 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            <Sparkles className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {hasSolarGain ? (
            <>
              <span className="font-editorial text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
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
          <span className="micro-label">Underheating Deficit</span>
          <div className="size-7 rounded-xl bg-secondary flex items-center justify-center text-foreground">
            <Clock className="size-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          {hasUnderheating ? (
            <>
              <span className="font-editorial text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
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
