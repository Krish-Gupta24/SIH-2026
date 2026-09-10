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
      <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-white">
                Thermal Comfort Metrics & Occupant Resilience
              </CardTitle>
              <p className="text-[11px] text-slate-400">
                Evaluation against project DesignTargets ({targetRangeDisplay}).
              </p>
            </div>
          </div>

          <Badge
            variant={comfort.isValid ? "outline" : "secondary"}
            className="text-[10px] bg-emerald-950/60 text-emerald-400 border-emerald-800/50"
          >
            {comfort.isValid ? "Design Targets Evaluated" : "Passive Zone Assessment"}
          </Badge>
        </div>

        {/* Comfort Progress Indicator */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Hours inside Target Range ({comfortMin}–{comfortMax}{tUnit})</span>
            {hasComfortPct ? (
              <span className="font-mono font-bold text-emerald-400">
                {formatNumber(comfort.percentTimeComfortable!, 1)}% {hasHoursInComfort ? `(${formatNumber(hoursInsideTarget!, 1)} hrs)` : ""}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 italic">Metric unavailable from this simulation</span>
            )}
          </div>

          {hasComfortPct && (
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
              {/* Hours in Comfort (Green) */}
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${comfort.percentTimeComfortable!}%` }}
                title="Time Inside Target Range"
              />
              {/* Hours Below Comfort (Blue) */}
              <div
                className="bg-sky-500 transition-all"
                style={{ width: `${100 - comfort.percentTimeComfortable!}%` }}
                title="Underheating Hours"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Inside Target: {hasHoursInComfort ? `${formatNumber(hoursInsideTarget!, 0)} h` : "—"}
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Below Target: {hasUnderheatingHrs ? `${formatNumber(hoursBelowTarget!, 0)} h` : "—"}
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Above Target: {hasOverheatingHrs ? `${formatNumber(hoursAboveTarget!, 0)} h` : "0 h"}
            </span>
          </div>
        </div>

        {/* Comfort Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <span className="text-slate-400 text-[11px]">Underheating Degree-Hours</span>
            <div className="text-base font-bold font-mono text-blue-400 mt-1">
              {hasUnderheatingDegreeHrs ? (
                `${formatNumber(comfort.underheatingDegreeHoursCh!, 1)} ${tUnit}·h`
              ) : (
                <span className="text-xs text-slate-500 italic font-sans">Metric unavailable from this simulation</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">Cumulative deficit below {comfortMin}{tUnit}</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <span className="text-slate-400 text-[11px]">Diurnal Zone Temp Swing</span>
            <div className="text-base font-bold font-mono text-indigo-400 mt-1">
              {hasSwing ? (
                `${formatNumber(comfort.diurnalTemperatureSwingC!, 1)} ${tUnit}`
              ) : (
                <span className="text-xs text-slate-500 italic font-sans">Metric unavailable from this simulation</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">Mass-damped diurnal variation</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <span className="text-slate-400 text-[11px]">Target Indoor Temperature</span>
            <div className="text-base font-bold font-mono text-white mt-1">
              {targetIndoorTemp !== null ? `${formatNumber(targetIndoorTemp, 1)} ${tUnit}` : "—"}
            </div>
            <span className="text-[10px] text-slate-500">Specified in ShelterModel DesignTargets</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <span className="text-slate-400 text-[11px]">Actual Temperature Span</span>
            <div className="text-xs font-mono text-slate-200 mt-1">
              {typeof comfort.indoorMinC === "number" && typeof comfort.indoorMaxC === "number" ? (
                <>
                  <span className="text-sky-400 font-bold">{formatNumber(convertTemperature(comfort.indoorMinC, unit), 1)}°</span> to{" "}
                  <span className="text-amber-400 font-bold">{formatNumber(convertTemperature(comfort.indoorMaxC, unit), 1)}°</span> (Mean:{" "}
                  <span className="text-white font-bold">{typeof comfort.indoorMeanC === "number" ? formatNumber(convertTemperature(comfort.indoorMeanC, unit), 1) : "—"}°</span>)
                </>
              ) : (
                <span className="text-slate-500 italic font-sans">Metric unavailable</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">Min / Max / Mean simulated zone air</span>
          </div>
        </div>

        {/* Formal Comfort Model & Assumptions */}
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-300">Model: {modelName}</span>
            <span className="text-emerald-400 font-mono">Target: {targetRangeDisplay}</span>
          </div>
          {assumptions && (
            <p className="text-[10px] text-slate-400">
              <span className="font-semibold text-slate-500">Assumptions: </span>{assumptions}
            </p>
          )}
          {applicableConditions && (
            <p className="text-[10px] text-slate-400">
              <span className="font-semibold text-slate-500">Applicability: </span>{applicableConditions}
            </p>
          )}
          <p className="text-[10px] text-amber-500/80 italic pt-1 border-t border-slate-800/60">
            Thermal comfort criteria are conditionally defined by project design targets and local acclimatization; no universal comfort is claimed.
          </p>
        </div>
      </Card>

      {/* 2. Integrated Energy Metrics & Losses Card */}
      <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-white">
                Energy Balance & Envelope Transmission
              </CardTitle>
              <p className="text-[11px] text-slate-400">
                Integrated auxiliary heating requirements and component thermal loss breakdown.
              </p>
            </div>
          </div>

          <Badge variant="outline" className="text-[10px] bg-amber-950/60 text-amber-400 border-amber-800/50">
            {energy.isUnconditioned ? "Passive Mode (Zero HVAC)" : "Conditioned"}
          </Badge>
        </div>

        {/* Primary Heating Requirement Banner */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Estimated Heating Demand Index</span>
            <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
              {convertedHeatingPerM2 !== null ? (
                `${formatNumber(convertedHeatingPerM2, 1)} ${edUnit}`
              ) : (
                <span className="text-xs text-slate-500 italic font-sans">Metric unavailable from this simulation</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">
              {convertedHeatingTotal !== null ? `Total Space Heating: ${formatNumber(convertedHeatingTotal, 0)} ${eUnit} / year` : "Auxiliary heating demand"}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Passive Solar Fraction</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {passiveSolarFraction !== null ? (
                `${formatNumber(passiveSolarFraction, 1)}%`
              ) : (
                <span className="text-xs text-slate-500 italic font-sans">Metric unavailable</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">
              Direct solar heat offset
            </span>
          </div>
        </div>

        {/* Component Loss Distribution */}
        <div className="space-y-2 text-xs">
          <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
            Envelope Thermal Loss Shares (% of Total Transmission)
          </span>

          {lossesObj && totalLosses && totalLosses > 0 ? (
            [
              { name: "Opaque Exterior Walls", color: "bg-red-400", kwh: Math.abs(lossesObj.walls ?? 0) },
              { name: "Roof & Ceiling Assembly", color: "bg-purple-400", kwh: Math.abs(lossesObj.roof ?? 0) },
              { name: "Glazed Windows (Conduction)", color: "bg-sky-400", kwh: Math.abs(lossesObj.windows ?? 0) },
              { name: "Air Infiltration & Exfiltration", color: "bg-cyan-400", kwh: Math.abs(lossesObj.infiltration ?? 0) },
              { name: "Ground Floor Slab Conduction", color: "bg-emerald-400", kwh: Math.abs(lossesObj.floor ?? 0) },
            ]
              .filter((item) => item.kwh > 0)
              .map((item) => {
                const pct = Math.round((item.kwh / totalLosses) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{item.name}</span>
                      <span className="font-mono text-slate-300">
                        {pct}% ({formatNumber(convertEnergy(item.kwh, unit), 1)} {eUnit})
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 py-4 text-center text-xs text-slate-500 italic">
              Metric unavailable from this simulation
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
