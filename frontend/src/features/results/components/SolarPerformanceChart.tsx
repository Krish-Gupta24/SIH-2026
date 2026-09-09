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

interface SolarPerformanceChartProps {
  timestamps: string[];
  solarRadiation: number[]; // W/m² (Global Horizontal Irradiance)
  solarGains: number[];     // Watts (transmitted solar gains through glazing)
  directNormal?: number[];  // W/m² (DNI)
  unit: UnitSystem;
}

export function SolarPerformanceChart({
  timestamps,
  solarRadiation,
  solarGains,
  directNormal,
  unit,
}: SolarPerformanceChartProps) {
  const fUnit = getFluxUnit(unit);
  const pUnit = getPowerUnit(unit);

  const chartData = timestamps.map((ts, idx) => {
    const rawGhi = solarRadiation[idx] ?? 0;
    const rawGains = solarGains[idx] ?? 0;
    const rawDni = directNormal?.[idx] ?? (rawGhi > 10 ? rawGhi * 1.25 : 0);

    const timeLabel = ts.includes("T")
      ? ts.split("T")[1]?.slice(0, 5) || ts
      : ts.length > 5
      ? ts.slice(-5)
      : ts;

    return {
      index: idx,
      timestamp: ts,
      timeLabel: `H${idx + 1} (${timeLabel})`,
      ghi: Number(convertFlux(rawGhi, unit).toFixed(1)),
      dni: Number(convertFlux(rawDni, unit).toFixed(1)),
      solarGains: Number(convertPower(rawGains, unit).toFixed(1)),
      rawGhi,
      rawGains,
    };
  });

  const maxGhi = Math.max(...chartData.map((d) => d.ghi), 100);
  const maxGains = Math.max(...chartData.map((d) => d.solarGains), 100);

  return (
    <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-400" />
            <span>Solar Radiation & Glazing Heat Gains</span>
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Global solar irradiance available at high elevation vs actual passive solar energy transmitted through glazed apertures.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <span>Solar Irradiance ({fUnit})</span>
          </span>
          <span className="flex items-center gap-1.5 text-yellow-300 font-semibold">
            <span className="h-2.5 w-2.5 rounded-sm bg-yellow-400" />
            <span>Glazing Transmitted Gain ({pUnit})</span>
          </span>
        </div>
      </div>

      <div className="h-80 w-full" style={{ height: "320px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="solarGhiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="solarGainsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={11}
              interval={Math.ceil(chartData.length / 12)}
            />
            {/* Left Axis: Solar Irradiance */}
            <YAxis
              yAxisId="left"
              stroke="#f59e0b"
              fontSize={11}
              unit={` ${fUnit}`}
              domain={[0, Math.ceil(maxGhi * 1.15)]}
            />
            {/* Right Axis: Transmitted Gains */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#eab308"
              fontSize={11}
              unit={` ${pUnit}`}
              domain={[0, Math.ceil(maxGains * 1.15)]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
                    <div className="border-b border-slate-800 pb-1 font-bold text-white">
                      {d.timeLabel}
                    </div>
                    <div className="flex items-center justify-between text-amber-400">
                      <span>Global Horizontal (GHI):</span>
                      <span className="font-mono font-bold">
                        {d.ghi} {fUnit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-orange-400">
                      <span>Direct Normal (DNI):</span>
                      <span className="font-mono font-bold">
                        {d.dni} {fUnit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-yellow-300 font-semibold border-t border-slate-800 pt-1.5">
                      <span>Aperture Heat Gain:</span>
                      <span className="font-mono font-bold">
                        {d.solarGains} {pUnit}
                      </span>
                    </div>
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
