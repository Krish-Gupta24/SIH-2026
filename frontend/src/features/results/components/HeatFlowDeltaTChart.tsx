"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Flame, ArrowDownRight, Thermometer, ShieldCheck, Moon } from "lucide-react";
import { UnitSystem } from "@/types/simulation";
import { convertTemperature, getTemperatureUnit } from "../unit-converter";
import { computeDownsampleIndices, formatTimeLabel } from "../chart-downsample";

interface HeatFlowDeltaTChartProps {
  timestamps: string[];
  indoorTemp: number[];
  outdoorTemp: number[];
  unit: UnitSystem;
  envelopeAreaM2?: number;
  averageUFactor?: number;
}

export function HeatFlowDeltaTChart({
  timestamps,
  indoorTemp,
  outdoorTemp,
  unit,
  envelopeAreaM2 = 104.0,
  averageUFactor = 0.28,
}: HeatFlowDeltaTChartProps) {
  const tUnit = getTemperatureUnit(unit);

  const totalLength = Math.max(timestamps.length, indoorTemp.length, outdoorTemp.length);
  const { indices, stride } = useMemo(
    () => computeDownsampleIndices(totalLength, 168),
    [totalLength]
  );

  const chartData = useMemo(() => {
    return indices.map((idx) => {
      const ts = timestamps[idx] || `H${idx + 1}`;
      const rawIn = indoorTemp[idx] ?? 12.0;
      const rawOut = outdoorTemp[idx] ?? -15.0;
      const deltaT = Number((rawIn - rawOut).toFixed(2));

      // Heat flow Q = U * A * deltaT (Watts)
      const heatFlowWatts = Math.round(averageUFactor * envelopeAreaM2 * deltaT);
      const heatFlowFlux = Number((averageUFactor * deltaT).toFixed(1));

      // Nighttime window detector (e.g. 18:00 to 06:00)
      const hour = ts.includes("T")
        ? parseInt(ts.split("T")[1]?.slice(0, 2) || "0", 10)
        : idx % 24;
      const isNight = hour >= 18 || hour < 6;

      const timeLabel = formatTimeLabel(ts, idx, stride);

      return {
        index: idx,
        timestamp: ts,
        timeLabel: stride > 1 ? timeLabel : `H${idx + 1} (${timeLabel})`,
        deltaT,
        heatFlowWatts,
        heatFlowFlux,
        indoorTemp: Number(convertTemperature(rawIn, unit).toFixed(1)),
        outdoorTemp: Number(convertTemperature(rawOut, unit).toFixed(1)),
        isNight,
      };
    });
  }, [indices, timestamps, indoorTemp, outdoorTemp, unit, envelopeAreaM2, averageUFactor, stride]);

  const maxDeltaT = useMemo(
    () => Math.max(...chartData.map((d) => d.deltaT), 1),
    [chartData]
  );
  const minDeltaT = useMemo(
    () => Math.min(...chartData.map((d) => d.deltaT), 0),
    [chartData]
  );
  const meanDeltaT = useMemo(
    () => (chartData.reduce((acc, d) => acc + d.deltaT, 0) / Math.max(chartData.length, 1)).toFixed(1),
    [chartData]
  );
  const totalHeatLossKwh = useMemo(() => {
    const sumWatts = chartData.reduce((acc, d) => acc + d.heatFlowWatts, 0);
    return ((sumWatts * 1.0) / 1000).toFixed(1);
  }, [chartData]);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
      {/* Header with Problem Statement Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20">
              DRDO Mandatory Output #3
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
              Q = U·A·ΔT
            </span>
          </div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mt-1">
            <Flame className="h-4 w-4 text-amber-500" />
            <span>Heat Flow & Temperature Difference (ΔT = T_shelter − T_ambient)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hourly conduction & convection heat flux driven by temperature differential between living space and sub-zero exterior.
          </p>
        </div>

        {/* Nighttime annotation pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
            <Moon className="size-3.5" />
            18:00–06:00 Nighttime Retention Zone
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Thermometer className="size-3.5 text-sky-500" />
            <span>Peak Thermal Lift (ΔT_max)</span>
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            +{maxDeltaT.toFixed(1)}°C
          </div>
          <div className="text-[10px] text-muted-foreground">Max buffer against ambient cold</div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Thermometer className="size-3.5 text-emerald-500" />
            <span>Mean Diurnal ΔT</span>
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            +{meanDeltaT}°C
          </div>
          <div className="text-[10px] text-muted-foreground">Average operational temperature buffer</div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Flame className="size-3.5 text-amber-500" />
            <span>Peak Heat Loss Rate</span>
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            {Math.max(...chartData.map((d) => d.heatFlowWatts)).toLocaleString()} W
          </div>
          <div className="text-[10px] text-muted-foreground">At lowest outdoor ambient temperature</div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <ArrowDownRight className="size-3.5 text-purple-500" />
            <span>Total 24h Heat Transfer</span>
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            {totalHeatLossKwh} kWh
          </div>
          <div className="text-[10px] text-muted-foreground">Envelope conduction & infiltration</div>
        </div>
      </div>

      {/* Primary Chart Area */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
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
            {/* Left Y-Axis: Temperature Difference (°C) */}
            <YAxis
              yAxisId="left"
              stroke="#f59e0b"
              fontSize={11}
              unit="°C"
              domain={[Math.floor(minDeltaT - 2), Math.ceil(maxDeltaT + 3)]}
              tickLine={false}
            />
            {/* Right Y-Axis: Heat Flow (Watts) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#8b5cf6"
              fontSize={11}
              unit=" W"
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
                    <div className="border-b border-border/60 pb-1.5 font-bold text-foreground flex items-center justify-between">
                      <span>{d.timeLabel}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{d.timestamp}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
                        <Thermometer className="size-3" />
                        Temperature Difference (ΔT):
                      </span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        +{d.deltaT}°C
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-purple-500 font-semibold">
                        <Flame className="size-3" />
                        Heat Loss Rate (Q):
                      </span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        {d.heatFlowWatts.toLocaleString()} W
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Heat Flux per Area:</span>
                      <span className="font-mono font-medium text-foreground">
                        {d.heatFlowFlux} W/m²
                      </span>
                    </div>

                    <div className="border-t border-border/60 pt-1.5 text-[10px] text-muted-foreground flex justify-between">
                      <span>Indoor: {d.indoorTemp}{tUnit}</span>
                      <span>Ambient: {d.outdoorTemp}{tUnit}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
              iconType="plainline"
            />

            {/* Zero ΔT baseline */}
            <ReferenceLine
              yAxisId="left"
              y={0}
              stroke="#64748b"
              strokeDasharray="3 3"
              strokeOpacity={0.4}
              label={{ value: "Ambient Equilibrium (ΔT = 0)", fill: "#64748b", fontSize: 10, position: "insideBottomLeft" }}
            />

            {/* Line 1: Thermal Lift (ΔT) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="deltaT"
              name="Temperature Difference ΔT (°C)"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 2.5, fill: "#f59e0b" }}
              activeDot={{ r: 6, fill: "#d97706", stroke: "#ffffff", strokeWidth: 2 }}
            />

            {/* Line 2: Heat Flow Rate (Watts) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="heatFlowWatts"
              name="Envelope Heat Flow Rate (W)"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
