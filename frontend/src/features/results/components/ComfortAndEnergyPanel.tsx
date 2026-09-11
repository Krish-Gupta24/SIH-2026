"use client";

import React from "react";
import {
  ShieldCheck,
  Flame,
  Clock,
  Award,
  AlertCircle,
  TrendingUp,
  Percent,
  CheckCircle2,
  Layers,
  Thermometer,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComfortMetrics, EnergyMetrics, UnitSystem } from "@/types/simulation";
import {
  convertTemperature,
  convertEnergy,
  convertEnergyDensity,
  getTemperatureUnit,
  getEnergyUnit,
  getEnergyDensityUnit,
  formatNumber,
} from "../unit-converter";

interface ComfortAndEnergyPanelProps {
  comfort: ComfortMetrics;
  energy: EnergyMetrics;
  unit: UnitSystem;
  floorAreaM2?: number;
}

export function ComfortAndEnergyPanel({
  comfort,
  energy,
  unit,
  floorAreaM2 = 24.0,
}: ComfortAndEnergyPanelProps) {
  const tUnit = getTemperatureUnit(unit);
  const eUnit = getEnergyUnit(unit);
  const edUnit = getEnergyDensityUnit(unit);

  const comfortMin = typeof comfort.comfortTemperatureMinC === "number" ? convertTemperature(comfort.comfortTemperatureMinC, unit) : 18;
  const comfortMax = typeof comfort.comfortTemperatureMaxC === "number" ? convertTemperature(comfort.comfortTemperatureMaxC, unit) : 26;
  const targetIndoorTemp = typeof comfort.targetIndoorTemperatureC === "number" ? convertTemperature(comfort.targetIndoorTemperatureC, unit) : null;
  const targetRangeDisplay = comfort.targetRangeStr || `${comfortMin}–${comfortMax} ${tUnit}`;
  const modelName = comfort.comfortDefinition?.standardOrModelName || "DesignTargets Operational Band";
  const assumptions = comfort.comfortDefinition?.assumptions;
  const applicableConditions = comfort.comfortDefinition?.applicableConditions;

  const hoursInsideTarget = typeof comfort.hoursInsideTarget === "number" ? comfort.hoursInsideTarget : comfort.hoursInComfortBand;
  const hoursBelowTarget = typeof comfort.hoursBelowTarget === "number" ? comfort.hoursBelowTarget : comfort.hoursBelowComfort;
  const hoursAboveTarget = typeof comfort.hoursAboveTarget === "number" ? comfort.hoursAboveTarget : comfort.hoursAboveComfort;

  const lossesObj = energy.envelopeLossesKwh || null;
  const totalLosses = lossesObj
    ? Object.values(lossesObj).reduce((a, b) => a + Math.abs(b), 0)
    : null;

  const heatingDemandTotal = typeof energy.heatingDemandKwh === "number" ? energy.heatingDemandKwh : null;
  const heatingDemandPerM2 = heatingDemandTotal !== null ? heatingDemandTotal / floorAreaM2 : null;

  const convertedHeatingTotal = heatingDemandTotal !== null ? convertEnergy(heatingDemandTotal, unit) : null;
  const convertedHeatingPerM2 = heatingDemandPerM2 !== null ? convertEnergyDensity(heatingDemandPerM2, unit) : null;
  const convertedSolarKwh = typeof energy.totalSolarGainsKwh === "number" ? convertEnergy(energy.totalSolarGainsKwh, unit) : null;

  // Calculate passive solar fraction without fallback
  const passiveSolarFraction =
    totalLosses !== null && totalLosses > 0 && typeof energy.totalSolarGainsKwh === "number"
      ? Math.min(100, Math.max(0, (energy.totalSolarGainsKwh / totalLosses) * 100))
      : null;

  const hasComfortPct = typeof comfort.percentTimeComfortable === "number";
  const hasHoursInComfort = typeof hoursInsideTarget === "number";
  const hasUnderheatingHrs = typeof hoursBelowTarget === "number";
  const hasOverheatingHrs = typeof hoursAboveTarget === "number";
  const hasUnderheatingDegreeHrs = typeof comfort.underheatingDegreeHoursCh === "number";
  const hasSwing = typeof comfort.diurnalTemperatureSwingC === "number";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Thermal Comfort Analysis Card */}
      <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Thermal Comfort Metrics & Occupant Resilience
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Evaluation against project DesignTargets ({targetRangeDisplay}).
              </p>
            </div>
          </div>

          <Badge
            variant={comfort.isValid ? "outline" : "secondary"}
            className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          >
            {comfort.isValid ? "Design Targets Evaluated" : "Passive Zone Assessment"}
          </Badge>
        </div>

        {/* Comfort Progress Indicator */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Hours inside Target Range ({comfortMin}–{comfortMax}{tUnit})</span>
            {hasComfortPct ? (
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatNumber(comfort.percentTimeComfortable!, 1)}% {hasHoursInComfort ? `(${formatNumber(hoursInsideTarget!, 1)} hrs)` : ""}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground italic">Metric unavailable from this simulation</span>
            )}
          </div>

          {hasComfortPct && (
            <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden flex">
              {/* Hours in Comfort (Green) */}
              <div
                className="bg-emerald-500 transition-all rounded-l-full"
                style={{ width: `${comfort.percentTimeComfortable!}%` }}
                title="Time Inside Target Range"
              />
              {/* Hours Below Comfort (Blue) */}
              <div
                className="bg-sky-500 transition-all rounded-r-full"
                style={{ width: `${100 - comfort.percentTimeComfortable!}%` }}
                title="Underheating Hours"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-1">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Inside Target: {hasHoursInComfort ? `${formatNumber(hoursInsideTarget!, 0)} h` : "—"}
            </span>
            <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
              <span className="size-1.5 rounded-full bg-sky-500" />
              Below Target: {hasUnderheatingHrs ? `${formatNumber(hoursBelowTarget!, 0)} h` : "—"}
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Above Target: {hasOverheatingHrs ? `${formatNumber(hoursAboveTarget!, 0)} h` : "0 h"}
            </span>
          </div>
        </div>

        {/* Comfort Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-border bg-secondary/30 p-3.5 space-y-1">
            <span className="text-muted-foreground text-[11px]">Underheating Degree-Hours</span>
            <div className="text-base font-bold font-mono text-sky-600 dark:text-sky-400">
              {hasUnderheatingDegreeHrs ? (
                `${formatNumber(comfort.underheatingDegreeHoursCh!, 1)} ${tUnit}·h`
              ) : (
                <span className="text-xs text-muted-foreground italic font-sans">Metric unavailable</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground block">Cumulative deficit below {comfortMin}{tUnit}</span>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-3.5 space-y-1">
            <span className="text-muted-foreground text-[11px]">Diurnal Zone Temp Swing</span>
            <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {hasSwing ? (
                `${formatNumber(comfort.diurnalTemperatureSwingC!, 1)} ${tUnit}`
              ) : (
                <span className="text-xs text-muted-foreground italic font-sans">Metric unavailable</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground block">Mass-damped diurnal swing</span>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-3.5 space-y-1">
            <span className="text-muted-foreground text-[11px]">Target Indoor Temperature</span>
            <div className="text-base font-bold font-mono text-foreground">
              {targetIndoorTemp !== null ? `${formatNumber(targetIndoorTemp, 1)} ${tUnit}` : "—"}
            </div>
            <span className="text-[10px] text-muted-foreground block">DesignTargets reference value</span>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-3.5 space-y-1">
            <span className="text-muted-foreground text-[11px]">Simulated Air Temperature</span>
            <div className="text-xs font-mono text-foreground mt-0.5">
              {typeof comfort.indoorMinC === "number" && typeof comfort.indoorMaxC === "number" ? (
                <>
                  <span className="text-sky-600 dark:text-sky-400 font-bold">{formatNumber(convertTemperature(comfort.indoorMinC, unit), 1)}°</span> to{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{formatNumber(convertTemperature(comfort.indoorMaxC, unit), 1)}°</span> (Mean:{" "}
                  <span className="text-foreground font-bold">{typeof comfort.indoorMeanC === "number" ? formatNumber(convertTemperature(comfort.indoorMeanC, unit), 1) : "—"}°</span>)
                </>
              ) : (
                <span className="text-muted-foreground italic font-sans">Metric unavailable</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground block">Min / Max / Mean zone air</span>
          </div>
        </div>

        {/* Formal Comfort Model & Assumptions */}
        <div className="rounded-2xl border border-border bg-secondary/20 p-3.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">Model: {modelName}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono">Target: {targetRangeDisplay}</span>
          </div>
          {assumptions && (
            <p className="text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">Assumptions: </span>{assumptions}
            </p>
          )}
          {applicableConditions && (
            <p className="text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">Applicability: </span>{applicableConditions}
            </p>
          )}
          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 italic pt-1 border-t border-border">
            Thermal comfort criteria are conditionally defined by project design targets and local acclimatization; no universal comfort is claimed.
          </p>
        </div>
      </div>

      {/* 2. Integrated Energy Metrics & Losses Card */}
      <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Energy Balance & Envelope Transmission
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Integrated auxiliary heating requirements and component thermal loss breakdown.
              </p>
            </div>
          </div>

          <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
            {energy.isUnconditioned ? "Passive Mode (Zero HVAC)" : "Conditioned"}
          </Badge>
        </div>

        {/* Primary Heating Requirement Banner */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-medium">Estimated Heating Demand Index</span>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {convertedHeatingPerM2 !== null ? (
                `${formatNumber(convertedHeatingPerM2, 1)} ${edUnit}`
              ) : (
                <span className="text-xs text-muted-foreground italic font-sans">Metric unavailable from this simulation</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {convertedHeatingTotal !== null ? `Total Space Heating: ${formatNumber(convertedHeatingTotal, 0)} ${eUnit} / year` : "Auxiliary heating demand"}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-muted-foreground font-medium">Passive Solar Fraction</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {passiveSolarFraction !== null ? (
                `${formatNumber(passiveSolarFraction, 1)}%`
              ) : (
                <span className="text-xs text-muted-foreground italic font-sans">Metric unavailable</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              Direct solar heat offset
            </span>
          </div>
        </div>

        {/* Component Loss Distribution */}
        <div className="space-y-2.5 text-xs">
          <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
            Envelope Thermal Loss Shares (% of Total Transmission)
          </span>

          {lossesObj && totalLosses && totalLosses > 0 ? (
            [
              { name: "Opaque Exterior Walls", color: "bg-rose-500", kwh: Math.abs(lossesObj.walls ?? 0) },
              { name: "Roof & Ceiling Assembly", color: "bg-purple-500", kwh: Math.abs(lossesObj.roof ?? 0) },
              { name: "Glazed Windows (Conduction)", color: "bg-sky-500", kwh: Math.abs(lossesObj.windows ?? 0) },
              { name: "Air Infiltration & Exfiltration", color: "bg-cyan-500", kwh: Math.abs(lossesObj.infiltration ?? 0) },
              { name: "Ground Floor Slab Conduction", color: "bg-emerald-500", kwh: Math.abs(lossesObj.floor ?? 0) },
            ]
              .filter((item) => item.kwh > 0)
              .map((item) => {
                const pct = Math.round((item.kwh / totalLosses) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-mono text-foreground font-medium">
                        {pct}% ({formatNumber(convertEnergy(item.kwh, unit), 1)} {eUnit})
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="rounded-2xl border border-border bg-secondary/20 py-4 text-center text-xs text-muted-foreground italic">
              Metric unavailable from this simulation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
