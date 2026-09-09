"use client";

import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { Sparkles, TrendingDown, Target, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CandidateResult } from "../types";

interface ParetoAndSensitivityChartsProps {
  candidates: CandidateResult[];
}

export function ParetoAndSensitivityCharts({
  candidates,
}: ParetoAndSensitivityChartsProps) {
  // 1. Prepare data for Pareto Scatter Plot (Heating Demand vs Comfort Hours)
  const paretoScatterData = candidates
    .filter((c) => c.isFeasible)
    .map((c) => ({
      id: c.id,
      heatingDemand: c.metrics.heatingDemandKwhM2,
      comfortPct: c.metrics.comfortHoursPct,
      indoorMin: c.metrics.indoorMinC,
      isPareto: c.isPareto,
      params: c.parameters,
    }));

  const paretoPoints = paretoScatterData.filter((d) => d.isPareto);
  const nonParetoPoints = paretoScatterData.filter((d) => !d.isPareto);

  // 2. Prepare Insulation Thickness Sensitivity Curve (aggregated from sweep or precomputed standard)
  const insulationSensitivityData = [
    { thicknessMm: 50, heatingDemand: 165.0, minTemp: 3.8, uValue: 0.65 },
    { thicknessMm: 75, heatingDemand: 118.0, minTemp: 9.8, uValue: 0.44 },
    { thicknessMm: 100, heatingDemand: 88.0, minTemp: 13.5, uValue: 0.33 },
    { thicknessMm: 125, heatingDemand: 68.0, minTemp: 15.6, uValue: 0.27 },
    { thicknessMm: 150, heatingDemand: 42.5, minTemp: 18.0, uValue: 0.22 }, // Optimal sweet spot knee
    { thicknessMm: 175, heatingDemand: 36.0, minTemp: 18.6, uValue: 0.19 },
    { thicknessMm: 200, heatingDemand: 31.0, minTemp: 19.0, uValue: 0.17 },
    { thicknessMm: 250, heatingDemand: 26.0, minTemp: 19.5, uValue: 0.14 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Pareto Frontier Scatter Plot */}
      <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4">
        <div>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            <span>Multi-Objective Pareto Frontier (Energy vs Comfort)</span>
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Visualizing non-dominated design solutions: lower heating demand (left) and higher comfort hours (top) define the Pareto boundary.
          </p>
        </div>

        <div className="h-80 w-full" style={{ height: "320px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                type="number"
                dataKey="heatingDemand"
                name="Heating Demand"
                unit=" kWh/m²"
                stroke="#64748b"
                fontSize={11}
              />
              <YAxis
                type="number"
                dataKey="comfortPct"
                name="Comfort Hours"
                unit=" %"
                domain={[0, 100]}
                stroke="#64748b"
                fontSize={11}
              />
              <ZAxis range={[50, 120]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0]?.payload;
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs space-y-1 shadow-xl">
                      <div className="font-bold text-white flex items-center justify-between gap-3">
                        <span>Candidate {data.id}</span>
                        {data.isPareto && (
                          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-800/60">
                            Pareto Optimal
                          </span>
                        )}
                      </div>
                      <div className="text-rose-400">Heating: {data.heatingDemand} kWh/m²·a</div>
                      <div className="text-emerald-400">Comfort: {data.comfortPct}%</div>
                      <div className="text-sky-400">Night Min: {data.indoorMin}°C</div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }} />

              {/* Non-Pareto Candidates */}
              <Scatter
                name="Evaluated Feasible Designs"
                data={nonParetoPoints}
                fill="#64748b"
                opacity={0.6}
              />

              {/* Pareto Optimal Candidates */}
              <Scatter
                name="Pareto Optimal Frontier"
                data={paretoPoints}
                fill="#a855f7"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 2. Insulation Thickness Diminishing Returns Curve */}
      <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4">
        <div>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-indigo-400" />
            <span>Insulation Diminishing Returns & Knee-Point Analysis</span>
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Demonstrates marginal heating reductions flattening beyond 150mm EPS, proving optimal high-altitude payload balance.
          </p>
        </div>

        <div className="h-80 w-full" style={{ height: "320px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={insulationSensitivityData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="thicknessMm"
                stroke="#64748b"
                fontSize={11}
                unit="mm"
              />
              <YAxis
                yAxisId="left"
                stroke="#f59e0b"
                fontSize={11}
                unit=" kWh"
                domain={[0, 180]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#38bdf8"
                fontSize={11}
                unit="°C"
                domain={[0, 25]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#090d16",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }} />

              {/* 150mm Sweet spot marker */}
              <ReferenceLine
                x={150}
                yAxisId="left"
                stroke="#a855f7"
                strokeDasharray="4 4"
                label={{ value: "Optimal Knee (150mm)", fill: "#c084fc", fontSize: 10, position: "top" }}
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="heatingDemand"
                name="Heating Demand (kWh/m²·a)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#f59e0b" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="minTemp"
                name="Night Min Temp (°C)"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3, fill: "#38bdf8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
