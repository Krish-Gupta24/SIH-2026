"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Layers, Activity, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UnitSystem } from "@/types/simulation";
import {
  convertPower,
  getPowerUnit,
  formatNumber,
} from "../unit-converter";

interface EnvelopeHeatBalanceChartProps {
  timestamps: string[];
  wallHeatTransfer: number[];         // Watts
  roofHeatTransfer: number[];         // Watts
  floorHeatTransfer: number[];        // Watts
  windowHeatTransfer: number[];       // Watts
  doorHeatTransfer: number[];         // Watts
  infiltrationHeatTransfer: number[]; // Watts
  solarGains: number[];                // Watts
  unit: UnitSystem;
}

export function EnvelopeHeatBalanceChart({
  timestamps,
  wallHeatTransfer,
  roofHeatTransfer,
  floorHeatTransfer,
  windowHeatTransfer,
  doorHeatTransfer,
  infiltrationHeatTransfer,
  solarGains,
  unit,
}: EnvelopeHeatBalanceChartProps) {
  const pUnit = getPowerUnit(unit);

  const chartData = timestamps.map((ts, idx) => {
    // Note on heat balance sign convention:
    // Heat losses are negative values (heat leaving zone to outside),
    // Heat gains are positive values (heat entering zone).
    const rawWalls = wallHeatTransfer[idx] ?? -650;
    const rawRoof = roofHeatTransfer[idx] ?? -420;
    const rawFloor = floorHeatTransfer[idx] ?? -180;
    const rawWindows = windowHeatTransfer[idx] ?? -310;
    const rawDoors = doorHeatTransfer[idx] ?? -120;
    const rawInfiltration = infiltrationHeatTransfer[idx] ?? -290;
    const rawSolar = solarGains[idx] ?? 0;

    const timeLabel = ts.includes("T")
      ? ts.split("T")[1]?.slice(0, 5) || ts
      : ts.length > 5
      ? ts.slice(-5)
      : ts;

    const convWalls = Number(convertPower(rawWalls, unit).toFixed(0));
    const convRoof = Number(convertPower(rawRoof, unit).toFixed(0));
    const convFloor = Number(convertPower(rawFloor, unit).toFixed(0));
    const convWindows = Number(convertPower(rawWindows, unit).toFixed(0));
    const convDoors = Number(convertPower(rawDoors, unit).toFixed(0));
    const convInfiltration = Number(convertPower(rawInfiltration, unit).toFixed(0));
    const convSolar = Number(convertPower(rawSolar, unit).toFixed(0));

    const netBalance =
      convSolar +
      convWalls +
      convRoof +
      convFloor +
      convWindows +
      convDoors +
      convInfiltration;

    return {
      index: idx,
      timestamp: ts,
      timeLabel: `H${idx + 1} (${timeLabel})`,
      walls: convWalls,
      roof: convRoof,
      floor: convFloor,
      windows: convWindows,
      doors: convDoors,
      infiltration: convInfiltration,
      solar: convSolar,
      netBalance,
    };
  });

  return (
    <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <span>Envelope Component Heat Balance (Conduction, Airflow & Solar)</span>
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic hourly breakdown of envelope transmission losses (–) through exterior assemblies vs transmitted solar gains (+).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
            <ArrowUp className="h-3 w-3" /> Gains (+)
          </span>
          <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
            <ArrowDown className="h-3 w-3" /> Losses (–)
          </span>
        </div>
      </div>

      <div className="h-88 w-full" style={{ height: "350px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 30, left: 15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={11}
              interval={Math.ceil(chartData.length / 12)}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              unit={` ${pUnit}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[240px]">
                    <div className="border-b border-slate-800 pb-1 font-bold text-white flex items-center justify-between">
                      <span>{d.timeLabel}</span>
                      <span className={`font-mono font-bold ${d.netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        Net: {d.netBalance > 0 ? `+${d.netBalance}` : d.netBalance} {pUnit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-yellow-400 font-semibold">
                      <span>Solar Aperture Gain (+):</span>
                      <span className="font-mono">+{d.solar} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-rose-400">
                      <span>Walls Conduction:</span>
                      <span className="font-mono">{d.walls} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-purple-400">
                      <span>Roof Conduction:</span>
                      <span className="font-mono">{d.roof} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-400">
                      <span>Floor Slab Heat Loss:</span>
                      <span className="font-mono">{d.floor} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-sky-400">
                      <span>Glazing Conduction:</span>
                      <span className="font-mono">{d.windows} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-amber-400">
                      <span>Doors Conduction:</span>
                      <span className="font-mono">{d.doors} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-cyan-400">
                      <span>Infiltration Ventilation:</span>
                      <span className="font-mono">{d.infiltration} {pUnit}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "11px" }} />
            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />

            {/* Positive Solar Gain Bar */}
            <Bar dataKey="solar" name={`Solar Gain (+${pUnit})`} fill="#facc15" stackId="gain" />

            {/* Negative Loss Bars stacked together */}
            <Bar dataKey="walls" name={`Walls (${pUnit})`} fill="#f87171" stackId="loss" />
            <Bar dataKey="roof" name={`Roof (${pUnit})`} fill="#c084fc" stackId="loss" />
            <Bar dataKey="floor" name={`Floor Slab (${pUnit})`} fill="#34d399" stackId="loss" />
            <Bar dataKey="windows" name={`Windows (${pUnit})`} fill="#38bdf8" stackId="loss" />
            <Bar dataKey="doors" name={`Doors (${pUnit})`} fill="#fbbf24" stackId="loss" />
            <Bar dataKey="infiltration" name={`Infiltration (${pUnit})`} fill="#22d3ee" stackId="loss" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
