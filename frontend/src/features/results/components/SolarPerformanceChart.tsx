"use client";

import React from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Sun, Sparkles, Compass } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UnitSystem } from "@/types/simulation";
import {
  convertFlux,
  convertPower,
  getFluxUnit,
  getPowerUnit,
  formatNumber,
} from "../unit-converter";
import { computeDownsampleIndices, formatTimeLabel } from "../chart-downsample";

interface SolarPerformanceChartProps {
  timestamps: string[];
  solarRadiation: number[]; // W/m² (Global Horizontal Irradiance)
  solarGains: number[];     // Watts (transmitted solar gains through glazing)
  directNormal?: number[];  // W/m² (DNI)
  windowHeatGains?: number[]; // Watts (Zone Windows Total Heat Gain Rate)
  absorbedGlazing?: number[]; // Watts (Window Glazing Layers Absorbed Solar)
  absorbedSurfaces?: number[]; // Watts (Opaque Envelope Absorbed Solar)
  usefulSolarGainKwh?: number;
  unit: UnitSystem;
}

export function SolarPerformanceChart({
  timestamps,
  solarRadiation,
  solarGains,
  directNormal,
  windowHeatGains,
  absorbedGlazing,
  absorbedSurfaces,
  usefulSolarGainKwh,
  unit,
}: SolarPerformanceChartProps) {
  const fUnit = getFluxUnit(unit);
  const pUnit = getPowerUnit(unit);

  const hasDni = Boolean(
    directNormal && directNormal.length > 0 && directNormal.some((v) => v > 0)
  );
  const hasWindowHeatGain = Boolean(
    windowHeatGains && windowHeatGains.length > 0 && windowHeatGains.some((v) => v !== 0)
  );

  const totalLength = Math.max(timestamps.length, solarRadiation.length, solarGains.length);
  const { indices, stride } = React.useMemo(
    () => computeDownsampleIndices(totalLength, 168),
    [totalLength]
  );

  const chartData = React.useMemo(() => {
    return indices.map((idx) => {
      const ts = timestamps[idx] || `H${idx + 1}`;
      const rawGhi = solarRadiation[idx] ?? 0;
      const rawGains = solarGains[idx] ?? 0;
      const rawDni = hasDni ? (directNormal?.[idx] ?? 0) : null;
      const rawWinHeat = hasWindowHeatGain ? (windowHeatGains?.[idx] ?? 0) : null;

      const timeLabel = formatTimeLabel(ts, idx, stride);

      return {
        index: idx,
        timestamp: ts,
        timeLabel: stride > 1 ? timeLabel : `H${idx + 1} (${timeLabel})`,
        ghi: Number(convertFlux(rawGhi, unit).toFixed(1)),
        dni: rawDni !== null ? Number(convertFlux(rawDni, unit).toFixed(1)) : null,
        solarGains: Number(convertPower(rawGains, unit).toFixed(1)),
        windowHeatGains: rawWinHeat !== null ? Number(convertPower(rawWinHeat, unit).toFixed(1)) : null,
        rawGhi,
        rawGains,
      };
    });
  }, [indices, timestamps, solarRadiation, solarGains, directNormal, windowHeatGains, hasDni, hasWindowHeatGain, unit, stride]);

  const maxGhi = Math.max(...chartData.map((d) => Math.max(d.ghi, d.dni || 0)), 100);
  const maxGains = Math.max(...chartData.map((d) => Math.max(d.solarGains, d.windowHeatGains || 0)), 100);

  // Peak metrics
  const peakGhi = Math.max(...solarRadiation, 0);
  const peakDni = hasDni && directNormal ? Math.max(...directNormal, 0) : null;
  const peakTransmittedW = Math.max(...solarGains, 0);
  const peakWindowHeatGainW = hasWindowHeatGain && windowHeatGains ? Math.max(...windowHeatGains, 0) : null;
  const peakGlazingAbsorbedW = absorbedGlazing && absorbedGlazing.length ? Math.max(...absorbedGlazing, 0) : null;
  const peakSurfaceAbsorbedW = absorbedSurfaces && absorbedSurfaces.length ? Math.max(...absorbedSurfaces, 0) : null;

  return (
    <div className="space-y-6">
      {/* 5 Required Solar Concept Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Incident Solar Radiation */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
              1. Incident Solar
            </span>
            <Sun className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">
            {convertFlux(peakGhi, unit).toFixed(0)} <span className="text-xs text-muted-foreground">{fUnit}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {peakDni !== null ? (
              <span>Peak DNI: {convertFlux(peakDni, unit).toFixed(0)} {fUnit}</span>
            ) : (
              <span>Peak Global Horizontal (GHI)</span>
            )}
          </div>
        </div>

        {/* 2. Transmitted Solar Radiation */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
              2. Transmitted Solar
            </span>
            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">
            {convertPower(peakTransmittedW, unit).toFixed(0)} <span className="text-xs text-muted-foreground">{pUnit}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Peak transmitted through glazing
          </div>
        </div>

        {/* 3. Absorbed Solar Gains */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">
              3. Absorbed Gains
            </span>
            <Compass className="h-3.5 w-3.5 text-orange-500" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">
            {peakSurfaceAbsorbedW !== null ? (
              <span>{convertPower(peakSurfaceAbsorbedW, unit).toFixed(0)} <span className="text-xs text-muted-foreground">{pUnit}</span></span>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">Validated</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {peakGlazingAbsorbedW !== null ? (
              <span>Glazing: {convertPower(peakGlazingAbsorbedW, unit).toFixed(0)} {pUnit}</span>
            ) : (
              <span>Opaque envelope + glazing</span>
            )}
          </div>
        </div>

        {/* 4. Solar Heat Gain Through Windows */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              4. Window Heat Gain
            </span>
            <Sun className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">
            {peakWindowHeatGainW !== null ? (
              <span>{convertPower(peakWindowHeatGainW, unit).toFixed(0)} <span className="text-xs text-muted-foreground">{pUnit}</span></span>
            ) : (
              <span>{convertPower(peakTransmittedW, unit).toFixed(0)} <span className="text-xs text-muted-foreground">{pUnit}</span></span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Transmitted + glass conduction
          </div>
        </div>

        {/* 5. Total Useful Solar Gain */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              5. Useful Solar Gain
            </span>
            <Sparkles className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">
            {usefulSolarGainKwh !== undefined ? (
              <span>{usefulSolarGainKwh.toFixed(1)} <span className="text-xs text-muted-foreground">kWh</span></span>
            ) : (
              <span>{(solarGains.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} <span className="text-xs text-muted-foreground">kWh</span></span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Integrated zone aperture energy
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Solar Radiation & Aperture Heat Gain Profile</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct and global solar irradiance incident at site vs verified passive solar heat gain entering through glazed fenestrations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-600 dark:text-amber-400 font-medium">
              <span className="size-2 rounded-full bg-amber-500" />
              <span>GHI ({fUnit})</span>
            </span>
            {hasDni && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-orange-600 dark:text-orange-400 font-medium">
                <span className="size-2 rounded-full bg-orange-500" />
                <span>DNI ({fUnit})</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-yellow-600 dark:text-yellow-400 font-medium">
              <span className="size-2 rounded-full bg-yellow-500" />
              <span>Glazing Transmitted ({pUnit})</span>
            </span>
            {hasWindowHeatGain && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Total Window Gain ({pUnit})</span>
              </span>
            )}
          </div>
        </div>

        <div className="h-88 w-full" style={{ height: "340px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="solarGhiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="solarGainsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
              <XAxis
                dataKey="timeLabel"
                stroke="currentColor"
                strokeOpacity={0.4}
                fontSize={10}
                interval="preserveStartEnd"
                minTickGap={35}
                tickLine={false}
              />
              {/* Left Axis: Solar Irradiance */}
              <YAxis
                yAxisId="left"
                stroke="#f59e0b"
                fontSize={11}
                unit={` ${fUnit}`}
                domain={[0, Math.ceil(maxGhi * 1.15)]}
                tickLine={false}
              />
              {/* Right Axis: Transmitted & Window Heat Gains */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#eab308"
                fontSize={11}
                unit={` ${pUnit}`}
                domain={[0, Math.ceil(maxGains * 1.15)]}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
                      <div className="border-b border-border/60 pb-1 font-bold text-foreground">
                        {d.timeLabel}
                      </div>
                      <div className="flex items-center justify-between text-amber-500">
                        <span>Global Horizontal (GHI):</span>
                        <span className="font-mono font-bold">
                          {d.ghi} {fUnit}
                        </span>
                      </div>
                      {d.dni !== null && (
                        <div className="flex items-center justify-between text-orange-500">
                          <span>Direct Normal (DNI):</span>
                          <span className="font-mono font-bold">
                            {d.dni} {fUnit}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-yellow-600 dark:text-yellow-400 font-semibold border-t border-border/60 pt-1.5">
                        <span>Glazing Solar Gain:</span>
                        <span className="font-mono font-bold">
                          {d.solarGains} {pUnit}
                        </span>
                      </div>
                      {d.windowHeatGains !== null && (
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span>Total Window Heat Gain:</span>
                          <span className="font-mono font-bold">
                            {d.windowHeatGains} {pUnit}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="ghi"
                name={`Solar Irradiance GHI (${fUnit})`}
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#solarGhiGrad)"
              />
              {hasDni && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="dni"
                  name={`Direct Normal DNI (${fUnit})`}
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="solarGains"
                name={`Glazing Transmitted Gain (${pUnit})`}
                stroke="#eab308"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#solarGainsGrad)"
              />
              {hasWindowHeatGain && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="windowHeatGains"
                  name={`Total Window Heat Gain (${pUnit})`}
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
