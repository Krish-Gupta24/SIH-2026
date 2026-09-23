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
import { Target, TrendingDown } from "lucide-react";
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

  // 2. Prepare Insulation Thickness Sensitivity Curve (aggregated from evaluated sweep candidates)
  const insulationMap = new Map<number, { count: number; totalDemand: number; totalMinTemp: number }>();

  candidates.forEach((c) => {
    const rawThick = c.parameters?.insulation_thickness;
    if (typeof rawThick === "number" && !isNaN(rawThick)) {
      const thickMm = Math.round(rawThick * 1000);
      const cur = insulationMap.get(thickMm) || { count: 0, totalDemand: 0, totalMinTemp: 0 };
      cur.count += 1;
      cur.totalDemand += c.metrics?.heatingDemandKwhM2 ?? 0;
      cur.totalMinTemp += c.metrics?.indoorMinC ?? 0;
      insulationMap.set(thickMm, cur);
    }
  });

  const hasSweepData = insulationMap.size >= 2;

  const insulationSensitivityData = hasSweepData
    ? Array.from(insulationMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([thicknessMm, stats]) => ({
          thicknessMm,
          heatingDemand: Number((stats.totalDemand / stats.count).toFixed(1)),
          minTemp: Number((stats.totalMinTemp / stats.count).toFixed(1)),
        }))
    : [
        // Standard reference baseline (shown only if insulation thickness was not varied in sweep)
        { thicknessMm: 50, heatingDemand: 165.0, minTemp: 3.8 },
        { thicknessMm: 75, heatingDemand: 118.0, minTemp: 9.8 },
        { thicknessMm: 100, heatingDemand: 88.0, minTemp: 13.5 },
        { thicknessMm: 125, heatingDemand: 68.0, minTemp: 15.6 },
        { thicknessMm: 150, heatingDemand: 42.5, minTemp: 18.0 },
        { thicknessMm: 175, heatingDemand: 36.0, minTemp: 18.6 },
        { thicknessMm: 200, heatingDemand: 31.0, minTemp: 19.0 },
        { thicknessMm: 250, heatingDemand: 26.0, minTemp: 19.5 },
      ];

  const maxHeatingDemand = Math.max(100, ...insulationSensitivityData.map((d) => d.heatingDemand * 1.15));
  const minNightTemp = Math.min(0, ...insulationSensitivityData.map((d) => d.minTemp - 2));
  const maxNightTemp = Math.max(24, ...insulationSensitivityData.map((d) => d.minTemp + 2));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Pareto Frontier Scatter Plot */}
      <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="micro-label text-muted-foreground">Frontier Analysis</span>
            <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-foreground border border-border">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <h3 className="font-editorial text-2xl font-medium tracking-tight mt-2 text-foreground">
            Multi-Objective Pareto Frontier
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Visualizing non-dominated design solutions: lower heating demand (left) and higher comfort coverage (top).
          </p>
        </div>

        <div className="h-80 w-full mt-6" style={{ height: "320px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 15, bottom: 15, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
              <XAxis
                type="number"
                dataKey="heatingDemand"
                name="Heating Demand"
                unit=" kWh"
                stroke="currentColor"
                strokeOpacity={0.4}
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="comfortPct"
                name="Comfort Hours"
                unit="%"
                domain={[0, 100]}
                stroke="currentColor"
                strokeOpacity={0.4}
                fontSize={10}
                tickLine={false}
              />
              <ZAxis range={[60, 140]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0]?.payload;
                  return (
                    <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-2xl text-xs space-y-1.5">
                      <div className="font-semibold text-foreground flex items-center justify-between gap-3 border-b border-border/50 pb-1">
                        <span>Candidate {data.id}</span>
                        {data.isPareto && (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30">
                            Pareto Optimal
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Heating Demand:</span>
                        <span className="font-medium text-foreground">{data.heatingDemand} kWh/m²</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Comfort Hours:</span>
                        <span className="font-medium text-emerald-500">{data.comfortPct}%</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Night Minimum:</span>
                        <span className="font-medium text-sky-500">{data.indoorMin}°C</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "14px", fontSize: "11px" }} />

              {/* Non-Pareto Candidates */}
              <Scatter
                name="Feasible Evaluated Designs"
                data={nonParetoPoints}
                fill="#94a3b8"
                opacity={0.5}
              />

              {/* Pareto Optimal Candidates */}
              <Scatter
                name="Pareto Optimal Frontier"
                data={paretoPoints}
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Insulation Thickness Diminishing Returns Curve */}
      <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="micro-label text-muted-foreground">Parametric Sensitivity</span>
            <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-foreground border border-border">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <h3 className="font-editorial text-2xl font-medium tracking-tight mt-2 text-foreground">
            Insulation Diminishing Returns
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {hasSweepData
              ? "Aggregated directly from current sweep candidates across varied insulation thicknesses."
              : "Demonstrating heating load flattening beyond 150mm EPS, identifying the economic knee point (Reference)."}
          </p>
        </div>

        <div className="h-80 w-full mt-6" style={{ height: "320px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={insulationSensitivityData} margin={{ top: 15, right: 15, bottom: 15, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
              <XAxis
                dataKey="thicknessMm"
                stroke="currentColor"
                strokeOpacity={0.4}
                fontSize={10}
                tickLine={false}
                unit="mm"
              />
              <YAxis
                yAxisId="left"
                stroke="#f59e0b"
                strokeOpacity={0.8}
                fontSize={10}
                tickLine={false}
                unit=" kWh"
                domain={[0, Math.ceil(maxHeatingDemand / 20) * 20]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#0284c7"
                strokeOpacity={0.8}
                fontSize={10}
                tickLine={false}
                unit="°C"
                domain={[Math.floor(minNightTemp), Math.ceil(maxNightTemp)]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-2xl text-xs space-y-1.5">
                      <p className="font-semibold text-foreground border-b border-border/50 pb-1">Insulation: {label} mm EPS</p>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}:
                          </span>
                          <span className="font-medium text-foreground">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "14px", fontSize: "11px" }} />

              {/* Sweet spot marker if 150mm is in the dataset */}
              {insulationSensitivityData.some((d) => Math.abs(d.thicknessMm - 150) <= 10) && (
                <ReferenceLine
                  x={150}
                  yAxisId="left"
                  stroke="#8b5cf6"
                  strokeDasharray="4 4"
                  label={{ value: "Sweet Spot (150mm)", fill: "#8b5cf6", fontSize: 10, position: "top" }}
                />
              )}

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="heatingDemand"
                name="Heating Demand (kWh/m²)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#f59e0b" }}
                activeDot={{ r: 6, stroke: "#f59e0b", strokeWidth: 2, fill: "#fff" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="minTemp"
                name="Night Min (°C)"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: 3, fill: "#0284c7" }}
                activeDot={{ r: 6, stroke: "#0284c7", strokeWidth: 2, fill: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
