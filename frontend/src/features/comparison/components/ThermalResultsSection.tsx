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
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import {
  Thermometer,
  ShieldAlert,
  Flame,
  Zap,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { SimulationJobItem } from "@/lib/store/use-shelter-store";
import { useUnitSystem } from "@/lib/unit-system";
import { TRACE_COLORS } from "./ConfigurationComparisonStrip";

interface ThermalResultsSectionProps {
  jobs: SimulationJobItem[];
}

export function ThermalResultsSection({ jobs }: ThermalResultsSectionProps) {
  if (!jobs || jobs.length === 0) return null;

  const baseline = jobs[0];
  const {
    toTemp,
    toPower,
    toEnergy,
    toEnergyDensity,
    tempUnit,
    powerUnit,
    energyUnit,
    energyDensityUnit,
    formatUnitNumber,
    isIP,
  } = useUnitSystem();

  // Visibility toggle states
  const [showComfortBand, setShowComfortBand] = useState(true);
  const [showOutdoor, setShowOutdoor] = useState(true);
  const [visibleJobs, setVisibleJobs] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    jobs.forEach((j) => {
      initial[j.id] = true;
    });
    return initial;
  });

  const toggleJobTrace = (jobId: string) => {
    setVisibleJobs((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  // Build merged 24-hour diurnal timeseries
  const timestamps =
    baseline?.results?.hourly?.timestamps ||
    baseline?.results?.hourlyTimeseries?.map((h: any) => h.timestamp) ||
    Array.from({ length: 24 }, (_, i) => `H${i + 1}`);

  const totalHours = Math.min(24, timestamps.length);

  const chartData = Array.from({ length: totalHours }, (_, i) => {
    const ts = timestamps[i] || `H${i + 1}`;
    const timeFormatted = `${String(i).padStart(2, "0")}:00`;

    const outdoorVal =
      baseline?.results?.hourly?.outdoorTemp?.[i] ??
      baseline?.results?.hourlyTimeseries?.[i]?.outdoorTempC ??
      -18.0;

    const point: Record<string, any> = {
      hour: i,
      timeLabel: timeFormatted,
      outdoor: typeof outdoorVal === "number" ? Number((isIP ? outdoorVal * 1.8 + 32 : outdoorVal).toFixed(1)) : (isIP ? -0.4 : -18.0),
    };

    jobs.forEach((job) => {
      const indoorVal =
        job.results?.hourly?.indoorTemp?.[i] ??
        job.results?.hourlyTimeseries?.[i]?.indoorTempC;
      point[job.id] = typeof indoorVal === "number" ? Number((isIP ? indoorVal * 1.8 + 32 : indoorVal).toFixed(1)) : undefined;
    });

    return point;
  });

  // Extract authentic KPIs
  const getSummary = (j: SimulationJobItem) => j.results?.summary;
  const baselineSummary = getSummary(baseline);

  const kpis = [
    {
      id: "indoorMin",
      label: "Minimum Nocturnal Temperature",
      unit: tempUnit,
      higherIsBetter: true,
      description: "Coldest living zone temperature at pre-dawn (~05:00). Critical freeze survival threshold.",
      getValue: (s: any) => typeof s?.indoorMinC === "number" ? toTemp(s.indoorMinC) : undefined,
      format: (v: number) => `${formatUnitNumber(v, 1)} ${tempUnit}`,
    },
    {
      id: "indoorMean",
      label: "Average Indoor Temperature",
      unit: tempUnit,
      higherIsBetter: true,
      description: "24-hour time-weighted mean living zone temperature.",
      getValue: (s: any) => typeof s?.indoorMeanC === "number" ? toTemp(s.indoorMeanC) : undefined,
      format: (v: number) => `${formatUnitNumber(v, 1)} ${tempUnit}`,
    },
    {
      id: "comfortHours",
      label: `Adaptive Comfort Hours (${Math.round(toTemp(18))}–${Math.round(toTemp(24))}${tempUnit})`,
      unit: "%",
      higherIsBetter: true,
      description: "Percentage of the diurnal cycle maintaining comfort without auxiliary combustion.",
      getValue: (s: any) => s?.comfortHoursPct,
      format: (v: number) => `${Math.round(v)}%`,
    },
    {
      id: "heatingDemand",
      label: "Annual Space Heating Demand",
      unit: energyDensityUnit,
      higherIsBetter: false,
      description: "Estimated annual heating energy required to maintain setpoint.",
      getValue: (s: any) => typeof s?.heatingDemandKwhM2 === "number" ? toEnergyDensity(s.heatingDemandKwhM2) : undefined,
      format: (v: number) => `${formatUnitNumber(v, 1)} ${energyDensityUnit}`,
    },
    {
      id: "peakEnvelopeLoss",
      label: "Peak Conduction Loss Rate",
      unit: powerUnit,
      higherIsBetter: false,
      description: "Maximum instantaneous thermal transmission rate through the envelope during freezing wind.",
      getValue: (s: any) => typeof s?.peakEnvelopeLossW === "number" ? toPower(s.peakEnvelopeLossW) : undefined,
      format: (v: number) => `${formatUnitNumber(v, 0)} ${powerUnit}`,
    },
    {
      id: "solarGain",
      label: "Diurnal Passive Solar Harvest",
      unit: energyUnit,
      higherIsBetter: true,
      description: "Total clean solar thermal energy collected through south glazed apertures.",
      getValue: (s: any) => typeof s?.totalSolarGainKwh === "number" ? toEnergy(s.totalSolarGainKwh) : undefined,
      format: (v: number) => `${formatUnitNumber(v, 1)} ${energyUnit}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="micro-label">Physical Response</span>
          <h2 className="font-editorial text-xl sm:text-2xl font-medium tracking-tight text-foreground">
            Thermal Results (Diurnal Temperature & Authentic KPIs)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            24-hour indoor living zone temperature overlay under severe sub-zero cold, compared with outdoor ambient conditions and the ASHRAE adaptive comfort band.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Large Indoor vs Outdoor Temperature Chart (col-span-8) */}
        <div className="lg:col-span-8 rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          {/* Chart Controls & Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
            {/* Legend & Toggle Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Comfort Band Toggle */}
              <button
                type="button"
                onClick={() => setShowComfortBand(!showComfortBand)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                  showComfortBand
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-secondary text-muted-foreground line-through opacity-60"
                }`}
              >
                <span className="size-2 rounded-full bg-emerald-500" />
                Comfort Zone (18–24°C)
              </button>

              {/* Outdoor Ambient Toggle */}
              <button
                type="button"
                onClick={() => setShowOutdoor(!showOutdoor)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                  showOutdoor
                    ? "bg-slate-500/15 border border-slate-500/30 text-slate-700 dark:text-slate-300"
                    : "bg-secondary text-muted-foreground line-through opacity-60"
                }`}
              >
                <span className="size-2 rounded-full bg-slate-400" />
                Outdoor Ambient
              </button>

              {/* Individual Candidate Toggles */}
              {jobs.map((job, idx) => {
                const color = TRACE_COLORS[idx % TRACE_COLORS.length];
                const isVisible = visibleJobs[job.id] !== false;
                const isBaseline = idx === 0;

                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => toggleJobTrace(job.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                      isVisible
                        ? "bg-card border border-border shadow-2xs text-foreground"
                        : "bg-secondary text-muted-foreground line-through opacity-50"
                    }`}
                  >
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="truncate max-w-[120px]">
                      {isBaseline ? "Baseline" : job.projectName.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Time Horizon Badge */}
            <span className="text-[10px] font-mono text-muted-foreground">
              24-Hour Diurnal Cycle (Extreme Cold Day)
            </span>
          </div>

          {/* Chart Canvas */}
          <div className="h-96 w-full mt-4" style={{ height: "380px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />

                {/* Shaded Comfort Band (18°C - 24°C) */}
                {showComfortBand && (
                  <ReferenceArea
                    y1={isIP ? 64.4 : 18}
                    y2={isIP ? 75.2 : 24}
                    fill="#10b981"
                    fillOpacity={0.08}
                    stroke="#10b981"
                    strokeOpacity={0.25}
                    strokeDasharray="2 2"
                  />
                )}

                {/* 0°C Freezing Line Reference */}
                <ReferenceLine
                  y={isIP ? 32 : 0}
                  stroke="#ef4444"
                  strokeOpacity={0.35}
                  strokeDasharray="4 4"
                  label={{
                    value: isIP ? "32°F Freezing Threshold" : "0°C Freezing Threshold",
                    position: "insideTopLeft",
                    fill: "#ef4444",
                    fontSize: 9,
                    opacity: 0.7,
                  }}
                />

                <XAxis
                  dataKey="timeLabel"
                  stroke="currentColor"
                  strokeOpacity={0.4}
                  fontSize={10}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  stroke="currentColor"
                  strokeOpacity={0.4}
                  fontSize={10}
                  tickLine={false}
                  unit={` ${tempUnit}`}
                  domain={isIP ? [-15, 85] : [-24, 28]}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-2xl text-xs space-y-1.5 min-w-[200px]">
                        <p className="font-bold text-foreground border-b border-border/50 pb-1 flex items-center justify-between">
                          <span>Time: {label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">Diurnal Step</span>
                        </p>
                        {payload.map((entry: any, i: number) => {
                          const isOutdoor = entry.dataKey === "outdoor";
                          const jobMatch = jobs.find((j) => j.id === entry.dataKey);
                          const name = isOutdoor ? "Outdoor Ambient" : jobMatch?.projectName || entry.name;
                          return (
                            <div key={i} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[130px]">
                                <span
                                  className="size-2 rounded-full shrink-0"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="truncate">{name}</span>
                              </span>
                              <strong className="font-mono text-foreground">{entry.value} {tempUnit}</strong>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />

                {/* Outdoor Line */}
                {showOutdoor && (
                  <Line
                    type="monotone"
                    dataKey="outdoor"
                    name="Outdoor Ambient"
                    stroke="#94a3b8"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}

                {/* Candidate Traces */}
                {jobs.map((job, idx) => {
                  const color = TRACE_COLORS[idx % TRACE_COLORS.length];
                  const isVisible = visibleJobs[job.id] !== false;
                  if (!isVisible) return null;

                  return (
                    <Line
                      key={job.id}
                      type="monotone"
                      dataKey={job.id}
                      name={job.projectName}
                      stroke={color.hex}
                      strokeWidth={idx === 0 ? 2 : 2.5}
                      dot={false}
                      activeDot={{ r: 5, stroke: color.hex, strokeWidth: 2 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>
              ✦ Green shaded area indicates ASHRAE 55 Adaptive Comfort Zone ({Math.round(toTemp(18))}–{Math.round(toTemp(24))}{tempUnit}).
            </span>
            <span>
              Red dashed line marks {isIP ? "32°F" : "0°C"} water freezing boundary.
            </span>
          </div>
        </div>

        {/* RIGHT: Compact Authentic KPI Cards (col-span-4) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="micro-label">Key Output Metrics</span>
            <span className="text-[10px] text-muted-foreground">Authentic Sim Data</span>
          </div>

          <div className="space-y-2.5">
            {kpis.map((kpi) => {
              const baselineVal = kpi.getValue(baselineSummary);
              if (baselineVal === undefined || baselineVal === null) return null;

              return (
                <div
                  key={kpi.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-tight">
                        {kpi.label}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                        {kpi.description}
                      </p>
                    </div>
                  </div>

                  {/* Side-by-Side Values & Deltas for Candidates */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40">
                    {/* Baseline */}
                    <div className="bg-secondary/30 rounded-xl p-2.5">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Baseline
                      </div>
                      <div className="text-sm font-mono font-bold text-foreground mt-0.5">
                        {kpi.format(baselineVal)}
                      </div>
                    </div>

                    {/* Candidate 1 (and others) */}
                    {jobs.slice(1, 2).map((cand, candIdx) => {
                      const candSummary = getSummary(cand);
                      const candVal = kpi.getValue(candSummary);
                      if (candVal === undefined || candVal === null) return null;

                      const diff = candVal - baselineVal;
                      const isImprovement = kpi.higherIsBetter ? diff > 0 : diff < 0;
                      const pct = Math.abs(baselineVal) > 0.01 ? Math.round((Math.abs(diff) / Math.abs(baselineVal)) * 100) : 0;

                      return (
                        <div key={cand.id} className="bg-card border border-border/80 rounded-xl p-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                              Alternative 1
                            </span>
                            {pct > 0 && (
                              <span
                                className={`text-[8px] font-extrabold px-1 rounded ${
                                  isImprovement
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {isImprovement ? "▲" : "▼"} {pct}%
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-mono font-bold text-foreground mt-0.5">
                            {kpi.format(candVal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
