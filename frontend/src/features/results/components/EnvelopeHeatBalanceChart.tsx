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
    <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" />
            <span>Envelope Component Heat Balance (Conduction, Airflow & Solar)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dynamic hourly breakdown of envelope transmission losses (–) through exterior assemblies vs transmitted solar gains (+).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold">
            <ArrowUp className="h-3 w-3" /> Gains (+)
          </span>
          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 font-semibold">
            <ArrowDown className="h-3 w-3" /> Losses (–)
          </span>
        </div>
      </div>

      <div className="h-88 w-full" style={{ height: "350px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
            <XAxis
              dataKey="timeLabel"
              stroke="currentColor"
              strokeOpacity={0.4}
              fontSize={11}
              interval={Math.ceil(chartData.length / 12)}
              tickLine={false}
            />
            <YAxis
              stroke="currentColor"
              strokeOpacity={0.4}
              fontSize={11}
              unit={` ${pUnit}`}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[240px]">
                    <div className="border-b border-border/60 pb-1 font-bold text-foreground flex items-center justify-between">
                      <span>{d.timeLabel}</span>
                      <span className={`font-mono font-bold ${d.netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        Net: {d.netBalance > 0 ? `+${d.netBalance}` : d.netBalance} {pUnit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-yellow-600 dark:text-yellow-400 font-semibold">
                      <span>Solar Aperture Gain (+):</span>
                      <span className="font-mono">+{d.solar} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-rose-500">
                      <span>Walls Conduction:</span>
                      <span className="font-mono">{d.walls} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-purple-500">
                      <span>Roof Conduction:</span>
                      <span className="font-mono">{d.roof} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Floor Slab Heat Loss:</span>
                      <span className="font-mono">{d.floor} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-sky-500">
                      <span>Glazing Conduction:</span>
                      <span className="font-mono">{d.windows} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-amber-500">
                      <span>Doors Conduction:</span>
                      <span className="font-mono">{d.doors} {pUnit}</span>
                    </div>

                    <div className="flex items-center justify-between text-cyan-500">
                      <span>Infiltration Airflow:</span>
                      <span className="font-mono">{d.infiltration} {pUnit}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "11px" }} />
            <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5} />

            {/* Positive Solar Gain Bar */}
            <Bar dataKey="solar" name={`Solar Gain (+${pUnit})`} fill="#eab308" stackId="gain" radius={[4, 4, 0, 0]} />

            {/* Negative Loss Bars stacked together */}
            <Bar dataKey="walls" name={`Walls (${pUnit})`} fill="#f43f5e" stackId="loss" />
            <Bar dataKey="roof" name={`Roof (${pUnit})`} fill="#a855f7" stackId="loss" />
            <Bar dataKey="floor" name={`Floor Slab (${pUnit})`} fill="#10b981" stackId="loss" />
            <Bar dataKey="windows" name={`Windows (${pUnit})`} fill="#0ea5e9" stackId="loss" />
            <Bar dataKey="doors" name={`Doors (${pUnit})`} fill="#f59e0b" stackId="loss" />
            <Bar dataKey="infiltration" name={`Infiltration (${pUnit})`} fill="#06b6d4" stackId="loss" radius={[0, 0, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-muted/20 -mx-7 -mb-7 px-7 py-3 rounded-b-[2rem]">
        <span>
          <strong className="text-foreground">Thermodynamic First-Law Balance:</strong> Sensible heat transmission leaving the conditioned living zone to freezing outdoor ambient is negative (–Q), while transmitted solar radiation entering through glazing is positive (+Q).
        </span>
      </div>
    </div>
  );
}
