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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SimulationJobItem } from "@/lib/store/use-shelter-store";

interface ComparisonChartsProps {
  jobs: SimulationJobItem[];
}

const TRACE_COLORS = [
  "#38bdf8", // Sky blue (Baseline)
  "#f59e0b", // Amber (Candidate 1)
  "#10b981", // Emerald (Candidate 2)
  "#a855f7", // Purple (Candidate 3)
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
      name: job.projectName.length > 22 ? `${job.projectName.slice(0, 20)}...` : job.projectName,
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
      <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4">
        <div>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-blue-400" />
            <span>Comparative Diurnal Living Zone Temperature Profiles</span>
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Hour-by-hour temperature trajectories comparing passive thermal retention across designs under identical sub-zero alpine weather.
          </p>
        </div>

        <div className="h-80 w-full" style={{ height: "340px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tempChartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="timeLabel"
                stroke="#64748b"
                fontSize={11}
                interval={Math.ceil(tempChartData.length / 10)}
              />
              <YAxis stroke="#64748b" fontSize={11} unit=" °C" domain={[-22, 28]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#090d16",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }} />

              {/* Comfort Band Area */}
              <ReferenceArea y1={18} y2={24} fill="#10b981" fillOpacity={0.07} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} />

              {/* Outdoor Ambient Reference */}
              <Line
                type="monotone"
                dataKey="outdoor"
                name="Outdoor Ambient (°C)"
                stroke="#64748b"
                strokeWidth={1.8}
                strokeDasharray="4 4"
                dot={false}
              />

              {/* Each Design's Indoor Temperature */}
              {jobs.map((job, idx) => (
                <Line
                  key={job.id}
                  type="monotone"
                  dataKey={job.id}
                  name={`${job.projectName} (°C)`}
                  stroke={TRACE_COLORS[idx % TRACE_COLORS.length]}
                  strokeWidth={idx === 0 ? 2 : 2.5}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 2. Space Heating Energy & Comfort Comparison */}
      <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4">
        <div>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <span>Auxiliary Heating Demand (kWh/m²·a) & Comfort Hours (%)</span>
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Evaluating energy reduction efficiency vs total winter comfort coverage across candidates.
          </p>
        </div>

        <div className="h-80 w-full" style={{ height: "340px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryBarData} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-15} textAnchor="end" />
              <YAxis yAxisId="left" stroke="#f59e0b" fontSize={11} unit=" kWh/m²" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} unit=" %" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#090d16",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "15px", fontSize: "11px" }} />

              <Bar
                yAxisId="left"
                dataKey="heatingDemand"
                name="Heating Demand (kWh/m²·a)"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="comfortPct"
                name="Hours in Comfort Band (%)"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
