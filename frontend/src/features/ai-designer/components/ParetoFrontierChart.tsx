"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Target, Layers, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AICandidate } from "../types";

interface ParetoFrontierChartProps {
  candidates: AICandidate[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidate: AICandidate) => void;
}

export function ParetoFrontierChart({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
}: ParetoFrontierChartProps) {
  const [yAxisMetric, setYAxisMetric] = useState<"heating" | "temp">("heating");

  if (!candidates || candidates.length === 0) {
    return null;
  }

  const chartData = candidates.map((c) => ({
    candidate_id: c.candidate_id,
    mass: Math.round(c.surrogate_predictions.envelope_mass_kg || c.parameters.envelope_mass_kg || 4000),
    heating: +(c.surrogate_predictions.heating_demand_kwh_m2 || 0).toFixed(1),
    minTemp: +(c.surrogate_predictions.winter_indoor_min_c || 0).toFixed(1),
    discomfortPct: +(c.surrogate_predictions.annual_discomfort_hours_pct || 0).toFixed(1),
    isVerified: c.is_physics_verified,
    isHighUncertainty: c.is_high_uncertainty,
    candidate: c,
  }));

  const yKey = yAxisMetric === "heating" ? "heating" : "minTemp";
  const yLabel = yAxisMetric === "heating" ? "Annual Heating Demand (kWh/m²·a)" : "Winter Indoor Min Temp (°C)";

  return (
    <Card className="rounded-[2rem] border border-border bg-card/90 backdrop-blur-md p-6 sm:p-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
              <Target className="size-4" />
            </span>
            <h3 className="text-lg font-bold tracking-tight">Non-Dominated Pareto Frontier</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Global trade-off curve across {candidates.length} optimal blueprints. Click any dot to inspect its design.
          </p>
        </div>

        {/* Metric Toggle */}
        <div className="flex items-center rounded-xl border border-border bg-secondary/60 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setYAxisMetric("heating")}
            className={`rounded-lg px-3 py-1 transition-colors ${
              yAxisMetric === "heating"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Heating vs Mass
          </button>
          <button
            type="button"
            onClick={() => setYAxisMetric("temp")}
            className={`rounded-lg px-3 py-1 transition-colors ${
              yAxisMetric === "temp"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Min Temp vs Mass
          </button>
        </div>
      </div>

      {/* Legend & Summary */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-emerald-500 inline-block" />
            <span>EnergyPlus Physics-Verified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-blue-500 inline-block" />
            <span>Surrogate Pareto Candidate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-amber-500 inline-block" />
            <span>High Uncertainty Boundary</span>
          </div>
        </div>

        <span className="font-mono text-[11px]">
          Showing {candidates.length} non-dominated trade-offs
        </span>
      </div>

      {/* Scatter Chart */}
      <div className="mt-6 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
            <XAxis
              type="number"
              dataKey="mass"
              name="Envelope Mass"
              unit=" kg"
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
              tickLine={{ stroke: "rgba(150,150,150,0.3)" }}
              label={{
                value: "Envelope Structural Mass (kg)",
                position: "insideBottom",
                offset: -10,
                fontSize: 11,
                fill: "currentColor",
                opacity: 0.8,
              }}
            />
            <YAxis
              type="number"
              dataKey={yKey}
              name={yLabel}
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
              tickLine={{ stroke: "rgba(150,150,150,0.3)" }}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                offset: 10,
                fontSize: 11,
                fill: "currentColor",
                opacity: 0.8,
              }}
            />
            <ZAxis type="number" dataKey="discomfortPct" range={[60, 200]} name="Discomfort" unit="%" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-border bg-popover p-3 shadow-2xl text-xs space-y-1">
                      <div className="font-bold flex items-center justify-between gap-4 border-b border-border pb-1">
                        <span>Candidate #{data.candidate_id.slice(-6)}</span>
                        {data.isVerified && (
                          <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-500 px-1 py-0">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                        <span className="text-muted-foreground">Envelope Mass:</span>
                        <span className="font-mono font-semibold">{data.mass.toLocaleString()} kg</span>
                        <span className="text-muted-foreground">Heating Demand:</span>
                        <span className="font-mono font-semibold">{data.heating} kWh/m²·a</span>
                        <span className="text-muted-foreground">Winter Min Temp:</span>
                        <span className="font-mono font-semibold">{data.minTemp}°C</span>
                        <span className="text-muted-foreground">Discomfort Hours:</span>
                        <span className="font-mono font-semibold">{data.discomfortPct}%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border">
                        Click dot to load full blueprint & explain attributions
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter
              name="Candidates"
              data={chartData}
              onClick={(entry) => onSelectCandidate(entry.candidate)}
              className="cursor-pointer"
            >
              {chartData.map((entry, index) => {
                const isSelected = entry.candidate_id === selectedCandidateId;
                let fillColor = "#3b82f6"; // default blue
                if (entry.isVerified) fillColor = "#10b981"; // emerald
                if (entry.isHighUncertainty) fillColor = "#f59e0b"; // amber

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fillColor}
                    stroke={isSelected ? "#ffffff" : "transparent"}
                    strokeWidth={isSelected ? 3 : 0}
                    className="transition-all hover:scale-125"
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
