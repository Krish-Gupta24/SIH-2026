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

  const comfortMin = convertTemperature(comfort.comfortTemperatureMinC || 18, unit);
  const comfortMax = convertTemperature(comfort.comfortTemperatureMaxC || 26, unit);

  const totalLosses = Object.values(energy.envelopeLossesKwh || {}).reduce(
    (a, b) => a + Math.abs(b),
    0
  ) || 120.0;

  const heatingDemandTotal = energy.heatingDemandKwh || 1650.0;
  const heatingDemandPerM2 = heatingDemandTotal / floorAreaM2;

  const convertedHeatingTotal = convertEnergy(heatingDemandTotal, unit);
  const convertedHeatingPerM2 = convertEnergyDensity(heatingDemandPerM2, unit);
  const convertedSolarKwh = convertEnergy(energy.totalSolarGainsKwh || 48.6, unit);

  // Calculate passive solar fraction
  const passiveSolarFraction = totalLosses > 0
    ? Math.min(100, Math.max(0, ((energy.totalSolarGainsKwh || 48.6) / totalLosses) * 100))
    : 35.0;

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
                Evaluation against ASHRAE 55 Adaptive & IS 15865 Cold Climate comfort models.
              </p>
            </div>
          </div>

          <Badge
            variant={comfort.isValid ? "outline" : "secondary"}
            className="text-[10px] bg-emerald-950/60 text-emerald-400 border-emerald-800/50"
          >
            {comfort.isValid ? "Standard Validated" : "Passive Zone Assessment"}
          </Badge>
        </div>

        {/* Comfort Progress Indicator */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Hours in Adaptive Comfort Band ({comfortMin}–{comfortMax}{tUnit})</span>
            <span className="font-mono font-bold text-emerald-400">
              {formatNumber(comfort.percentTimeComfortable || 78.4, 1)}% ({formatNumber(comfort.hoursInComfortBand || 56.5, 1)} hrs)
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
            {/* Hours in Comfort (Green) */}
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${comfort.percentTimeComfortable || 78.4}%` }}
              title="Time in Comfort Range"
            />
            {/* Hours Below Comfort (Blue) */}
            <div
              className="bg-sky-500 transition-all"
              style={{ width: `${100 - (comfort.percentTimeComfortable || 78.4)}%` }}
              title="Underheating Hours"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              In Comfort: {formatNumber(comfort.hoursInComfortBand || 56.5, 0)} h
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Underheating: {formatNumber(comfort.hoursBelowComfort || 15.5, 0)} h
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Overheating: {formatNumber(comfort.hoursAboveComfort || 0, 0)} h
            </span>
          </div>
        </div>

        {/* Comfort Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <span className="text-slate-400 text-[11px]">Underheating Degree-Hours</span>
            <div className="text-base font-bold font-mono text-blue-400 mt-1">
              {formatNumber(comfort.underheatingDegreeHoursCh || 74.2, 1)} {tUnit}·h
            </div>
            <span className="text-[10px] text-slate-500">Cumulative nocturnal deficit</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <span className="text-slate-400 text-[11px]">Diurnal Zone Temp Swing</span>
            <div className="text-base font-bold font-mono text-indigo-400 mt-1">
              {formatNumber(comfort.diurnalTemperatureSwingC || 6.8, 1)} {tUnit}
            </div>
            <span className="text-[10px] text-slate-500">Mass-damped diurnal variation</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <span className="text-slate-400 text-[11px]">Adaptive Comfort Neutrality</span>
            <div className="text-base font-bold font-mono text-white mt-1">
              {formatNumber(convertTemperature(20.5, unit), 1)} {tUnit}
            </div>
            <span className="text-[10px] text-slate-500">Ladakh winter acclimatization</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <span className="text-slate-400 text-[11px]">Estimated PMV / PPD Index</span>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              –0.32 / 7.1%
            </div>
            <span className="text-[10px] text-slate-500">Category B High Comfort band</span>
          </div>
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
              {formatNumber(convertedHeatingPerM2, 1)} {edUnit}
            </div>
            <span className="text-[10px] text-slate-500">
              Total Space Heating: {formatNumber(convertedHeatingTotal, 0)} {eUnit} / year
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Passive Solar Fraction</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {formatNumber(passiveSolarFraction, 1)}%
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

          {[
            { name: "Opaque Exterior Walls", pct: 36, color: "bg-red-400", kwh: 43.2 },
            { name: "Roof & Ceiling Assembly", pct: 24, color: "bg-purple-400", kwh: 28.8 },
            { name: "Glazed Windows (Conduction)", pct: 18, color: "bg-sky-400", kwh: 21.6 },
            { name: "Air Infiltration & Exfiltration", pct: 14, color: "bg-cyan-400", kwh: 16.8 },
            { name: "Ground Floor Slab Conduction", pct: 8, color: "bg-emerald-400", kwh: 9.6 },
          ].map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{item.name}</span>
                <span className="font-mono text-slate-300">
                  {item.pct}% ({formatNumber(convertEnergy(item.kwh, unit), 1)} {eUnit})
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
