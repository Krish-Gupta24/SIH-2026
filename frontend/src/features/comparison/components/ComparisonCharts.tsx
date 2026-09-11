"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Thermometer, Zap, Layers } from "lucide-react";
import { SimulationJobItem } from "@/lib/store/use-shelter-store";

interface ComparisonChartsProps {
  jobs: SimulationJobItem[];
}

const TRACE_COLORS = [
  "#0284c7", // Sky blue (Baseline)
  "#f59e0b", // Amber (Candidate 1)
  "#10b981", // Emerald (Candidate 2)
  "#8b5cf6", // Purple (Candidate 3)
];

export function ComparisonCharts({ jobs }: ComparisonChartsProps) {
  if (!jobs || jobs.length === 0) return null;

  // Build merged timeseries data for line chart
  const referenceSeries = jobs[0]?.results?.hourlyTimeseries || [];

  const tempChartData = referenceSeries.map((ref, idx) => {
    const timeLabel = ref.timestamp?.includes("T")
      ? ref.timestamp.split("T")[1]?.slice(0, 5) || `H${ref.hour}`
      : `H${ref.hour}`;

    const point: Record<string, any> = {
      index: idx,
      timeLabel: `H${idx + 1} (${timeLabel})`,
      outdoor: ref.outdoorTempC,
    };

    jobs.forEach((job) => {
      const match = job.results?.hourlyTimeseries?.[idx];
      point[job.id] = match ? match.indoorTempC : undefined;
    });

    return point;
  });

  // Build summary bar data for heating demand and peak loss
  const summaryBarData = jobs.map((job) => {
    const s = job.results?.summary;
    return {
      name: job.projectName.length > 20 ? `${job.projectName.slice(0, 18)}...` : job.projectName,
      fullName: job.projectName,
      heatingDemand: s?.heatingDemandKwhM2 || 0,
      peakLoss: (s as any)?.peakEnvelopeLossW || 1500,
      comfortPct: s?.comfortHoursPct || 0,
      indoorMin: s?.indoorMinC || 0,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Multi-Design Temperature Curve Overlay */}
      <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="micro-label text-muted-foreground">Comparative Trajectories</span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
              <Thermometer className="h-4 w-4" />
            </div>
          </div>
          <h3 className="font-medium tracking-tight text-xl mt-2 text-foreground">
            Diurnal Living Zone Profiles
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Hour-by-hour temperature curves comparing passive thermal retention across candidates under sub-zero conditions.
          </p>
        </div>

        <div className="h-80 w-full mt-6" style={{ height: "340px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tempChartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
              <XAxis
                dataKey="timeLabel"
                stroke="currentColor"
                strokeOpacity={0.4}
                fontSize={10}
                tickLine={false}
                interval={Math.ceil(tempChartData.length / 8)}
              />
              <YAxis
                stroke="currentColor"
                strokeOpacity={0.4}
                fontSize={10}
                tickLine={false}
                unit="°C"
                domain={[-22, 28]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-2xl text-xs space-y-1.5">
                      <p className="font-semibold text-foreground border-b border-border/50 pb-1">{label}</p>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}:
                          </span>
                          <span className="font-medium text-foreground">{typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}°C</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "14px", fontSize: "11px" }} />

              {/* Comfort Band Area */}
              <ReferenceArea y1={18} y2={24} fill="#10b981" fillOpacity={0.08} label={{ value: "Comfort Band (18–24°C)", position: "insideTopRight", fill: "#10b981", fontSize: 10 }} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "0°C Freeze Point", fill: "#ef4444", fontSize: 9 }} />

              {/* Outdoor Ambient Reference */}
              <Line
                type="monotone"
                dataKey="outdoor"
                name="Ambient Temp"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />

              {/* Each Design's Indoor Temperature */}
              {jobs.map((job, idx) => (
                <Line
                  key={job.id}
                  type="monotone"
                  dataKey={job.id}
                  name={job.projectName}
                  stroke={TRACE_COLORS[idx % TRACE_COLORS.length]}
                  strokeWidth={idx === 0 ? 2 : 2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 6, stroke: TRACE_COLORS[idx % TRACE_COLORS.length], strokeWidth: 2, fill: "#fff" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Space Heating Energy & Comfort Comparison */}
      <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="micro-label text-muted-foreground">Performance Trade-offs</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <h3 className="font-medium tracking-tight text-xl mt-2 text-foreground">
            Heating Demand & Comfort Hours
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Evaluating heating load reductions (kWh/m²·a) vs total comfort band coverage (%) across cases.
          </p>
        </div>

        <div className="h-80 w-full mt-6" style={{ height: "340px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryBarData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
              <XAxis dataKey="name" stroke="currentColor" strokeOpacity={0.4} fontSize={10} tickLine={false} interval={0} angle={-10} textAnchor="end" />
              <YAxis yAxisId="left" stroke="#f59e0b" strokeOpacity={0.8} fontSize={10} tickLine={false} unit=" kWh" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" strokeOpacity={0.8} fontSize={10} tickLine={false} unit=" %" domain={[0, 100]} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-2xl text-xs space-y-1.5">
                      <p className="font-semibold text-foreground border-b border-border/50 pb-1">{label}</p>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}:
                          </span>
                          <span className="font-medium text-foreground">
                            {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
                            {entry.dataKey === "comfortPct" ? "%" : " kWh/m²"}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "14px", fontSize: "11px" }} />

              <Bar
                yAxisId="left"
                dataKey="heatingDemand"
                name="Heating Demand (kWh/m²)"
                fill="#f59e0b"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="comfortPct"
                name="Comfort Band (%)"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
