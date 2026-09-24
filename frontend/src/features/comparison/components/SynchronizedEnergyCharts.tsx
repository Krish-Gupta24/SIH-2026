"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  Flame,
  Sun,
  Layers,
  ArrowDownUp,
  Info,
} from "lucide-react";
import { SimulationJobItem } from "@/lib/store/use-shelter-store";
import { useUnitSystem } from "@/lib/unit-system";
import { TRACE_COLORS } from "./ConfigurationComparisonStrip";

interface SynchronizedEnergyChartsProps {
  jobs: SimulationJobItem[];
}

export function SynchronizedEnergyCharts({ jobs }: SynchronizedEnergyChartsProps) {
  if (!jobs || jobs.length === 0) return null;

  const baseline = jobs[0];
  const { toPower, powerUnit, isIP } = useUnitSystem();
  const [syncHour, setSyncHour] = useState<number | null>(null);

  // Build 24-hr synced dataset across Heat Loss, Solar Gain, and Net Balance
  const chartData = Array.from({ length: 24 }, (_, i) => {
    const timeLabel = `${String(i).padStart(2, "0")}:00`;

    const point: Record<string, any> = {
      hour: i,
      timeLabel,
    };

    jobs.forEach((job) => {
      const ts = job.results?.hourlyTimeseries?.[i];
      const h = job.results?.hourly;

      // 1. Envelope Heat Flow (sum of wall, roof, floor, window, infiltration heat loss)
      const wallLoss = ts?.wallHeatTransferW ?? h?.wallHeatTransfer?.[i] ?? 0;
      const roofLoss = ts?.roofHeatTransferW ?? h?.roofHeatTransfer?.[i] ?? 0;
      const floorLoss = ts?.floorHeatTransferW ?? h?.floorHeatTransfer?.[i] ?? 0;
      const winLoss = ts?.windowHeatTransferW ?? h?.windowHeatTransfer?.[i] ?? 0;
      const infLoss = ts?.infiltrationHeatTransferW ?? h?.infiltrationHeatTransfer?.[i] ?? 0;
      const rawTotalHeat = wallLoss + roofLoss + floorLoss + winLoss + infLoss;
      const totalHeatFlow = Math.round(isIP ? rawTotalHeat * 3.41214 : rawTotalHeat);

      point[`heatFlow_${job.id}`] = totalHeatFlow;

      // 2. Solar Gains
      const rawSolar = ts?.solarGainsW ?? h?.solarGains?.[i] ?? 0;
      const solarGain = Math.round(isIP ? rawSolar * 3.41214 : rawSolar);
      point[`solar_${job.id}`] = solarGain;

      // 3. Thermal Storage / Net Energy Balance
      const rawInternalW = 480;
      const rawNet = rawSolar + rawInternalW + rawTotalHeat;
      const netBalance = Math.round(isIP ? rawNet * 3.41214 : rawNet);
      point[`balance_${job.id}`] = netBalance;
    });

    return point;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="micro-label">Thermodynamic Mechanics</span>
          <h2 className="font-editorial text-xl sm:text-2xl font-medium tracking-tight text-foreground">
            Synchronized Energy & Heat Flow Behaviour
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consistent 24-hour time axes explaining WHY configurations behave differently: envelope transmission losses, solar aperture harvest, and net thermal storage.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CHART 1: Total Envelope Heat Loss Rate (W) */}
        <div className="rounded-[2rem] border border-border bg-card p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="micro-label">Envelope Transmission</span>
              <Flame className="size-4 text-rose-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground mt-1">
              Hourly Envelope Heat Flow ({powerUnit})
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Negative values indicate continuous heat escaping through walls, roof, and infiltration.
            </p>
          </div>

          <div className="h-60 w-full mt-4" style={{ height: "240px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.2} />
                <XAxis dataKey="timeLabel" stroke="currentColor" strokeOpacity={0.4} fontSize={9} interval={5} />
                <YAxis stroke="currentColor" strokeOpacity={0.4} fontSize={9} unit={` ${powerUnit}`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl border border-border bg-card/95 p-2.5 shadow-xl text-xs space-y-1">
                        <span className="font-bold text-foreground block">{label}</span>
                        {payload.map((e: any, i: number) => {
                          const job = jobs.find((j) => `heatFlow_${j.id}` === e.dataKey);
                          return (
                            <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <span className="size-2 rounded-full" style={{ backgroundColor: e.color }} />
                                {job?.projectName.split(" ")[0]}
                              </span>
                              <strong className="font-mono text-foreground">{e.value} {powerUnit}</strong>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                {jobs.map((job, idx) => {
                  const color = TRACE_COLORS[idx % TRACE_COLORS.length];
                  return (
                    <Line
                      key={job.id}
                      type="monotone"
                      dataKey={`heatFlow_${job.id}`}
                      stroke={color.hex}
                      strokeWidth={2}
                      dot={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-[10px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Peak Loss: Nighttime</span>
            <span className="font-mono">Less negative = Better insulation</span>
          </div>
        </div>

        {/* CHART 2: Passive Solar Aperture Gains (W) */}
        <div className="rounded-[2rem] border border-border bg-card p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="micro-label">Solar Aperture</span>
              <Sun className="size-4 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground mt-1">
              Passive Solar Harvest ({powerUnit})
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Direct and diffuse solar radiation captured through south glazing and Trombe wall.
            </p>
          </div>

          <div className="h-60 w-full mt-4" style={{ height: "240px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.2} />
                <XAxis dataKey="timeLabel" stroke="currentColor" strokeOpacity={0.4} fontSize={9} interval={5} />
                <YAxis stroke="currentColor" strokeOpacity={0.4} fontSize={9} unit={` ${powerUnit}`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl border border-border bg-card/95 p-2.5 shadow-xl text-xs space-y-1">
                        <span className="font-bold text-foreground block">{label}</span>
                        {payload.map((e: any, i: number) => {
                          const job = jobs.find((j) => `solar_${j.id}` === e.dataKey);
                          return (
                            <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <span className="size-2 rounded-full" style={{ backgroundColor: e.color }} />
                                {job?.projectName.split(" ")[0]}
                              </span>
                              <strong className="font-mono text-foreground">{e.value} {powerUnit}</strong>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                {jobs.map((job, idx) => {
                  const color = TRACE_COLORS[idx % TRACE_COLORS.length];
                  return (
                    <Line
                      key={job.id}
                      type="monotone"
                      dataKey={`solar_${job.id}`}
                      stroke={color.hex}
                      strokeWidth={2}
                      dot={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-[10px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Peak Sun: 11:00–14:00</span>
            <span className="font-mono">Clean daytime heating</span>
          </div>
        </div>

        {/* CHART 3: Thermal Storage / Net Energy Balance (W) */}
        <div className="rounded-[2rem] border border-border bg-card p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="micro-label">Thermal Storage</span>
              <Layers className="size-4 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground mt-1">
              Net Thermal Storage Balance ({powerUnit})
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Positive = heat charging into mass core; Negative = heat deficit needing auxiliary stove.
            </p>
          </div>

          <div className="h-60 w-full mt-4" style={{ height: "240px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="2 2" />
                <XAxis dataKey="timeLabel" stroke="currentColor" strokeOpacity={0.4} fontSize={9} interval={5} />
                <YAxis stroke="currentColor" strokeOpacity={0.4} fontSize={9} unit={` ${powerUnit}`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl border border-border bg-card/95 p-2.5 shadow-xl text-xs space-y-1">
                        <span className="font-bold text-foreground block">{label}</span>
                        {payload.map((e: any, i: number) => {
                          const job = jobs.find((j) => `balance_${j.id}` === e.dataKey);
                          return (
                            <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <span className="size-2 rounded-full" style={{ backgroundColor: e.color }} />
                                {job?.projectName.split(" ")[0]}
                              </span>
                              <strong className="font-mono text-foreground">{e.value} {powerUnit}</strong>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                {jobs.map((job, idx) => {
                  const color = TRACE_COLORS[idx % TRACE_COLORS.length];
                  return (
                    <Line
                      key={job.id}
                      type="monotone"
                      dataKey={`balance_${job.id}`}
                      stroke={color.hex}
                      strokeWidth={2}
                      dot={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-[10px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Above 0 = Heat Surplus</span>
            <span className="font-mono">Below 0 = Auxiliary needed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
