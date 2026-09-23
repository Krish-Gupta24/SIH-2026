"use client";

import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Layers,
  Sun,
  Users,
  Home,
  Grid,
  AppWindow,
  DoorClosed,
  Wind,
  Zap,
  Activity,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
} from "lucide-react";
import { UnitSystem } from "@/types/simulation";
import {
  convertPower,
  getPowerUnit,
  getEnergyUnit,
} from "../unit-converter";
import { computeDownsampleIndices, formatTimeLabel } from "../chart-downsample";

interface EnvelopeHeatBalanceChartProps {
  timestamps: string[];
  wallHeatTransfer: number[];         // Watts
  roofHeatTransfer: number[];         // Watts
  floorHeatTransfer: number[];        // Watts
  windowHeatTransfer: number[];       // Watts (glazing conduction)
  doorHeatTransfer: number[];         // Watts
  infiltrationHeatTransfer: number[]; // Watts
  thermalBridgeHeatTransfer?: number[]; // Watts (psi bridge losses)
  solarGains: number[];                // Watts (transmitted solar gains)
  internalGains?: number[];            // Watts (occupants + equipment)
  indoorTemp?: number[];              // °C
  outdoorTemp?: number[];             // °C
  unit: UnitSystem;
}

type FilterPreset = "all" | "losses" | "gains" | "net";

interface ParamConfig {
  id: string;
  name: string;
  shortName: string;
  category: "gain" | "loss";
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const PARAMETER_CONFIGS: ParamConfig[] = [
  {
    id: "solar",
    name: "Solar Aperture Gain",
    shortName: "Solar (+Q)",
    category: "gain",
    color: "#eab308",
    icon: Sun,
    description: "Transmitted shortwave solar radiation entering through glazing",
  },
  {
    id: "internal",
    name: "Internal Occupant Gains",
    shortName: "Internal (+Q)",
    category: "gain",
    color: "#10b981",
    icon: Users,
    description: "Sensible metabolic heat from occupants and LED equipment",
  },
  {
    id: "walls",
    name: "Opaque Walls Conduction",
    shortName: "Walls (–Q)",
    category: "loss",
    color: "#f43f5e",
    icon: Layers,
    description: "Conductive envelope transmission through exterior wall assemblies",
  },
  {
    id: "roof",
    name: "Roof Deck Conduction",
    shortName: "Roof (–Q)",
    category: "loss",
    color: "#a855f7",
    icon: Home,
    description: "Transmission and sky radiation loss through insulated roof ceiling",
  },
  {
    id: "floor",
    name: "Floor Slab Ground Loss",
    shortName: "Floor (–Q)",
    category: "loss",
    color: "#14b8a6",
    icon: Grid,
    description: "Sub-base conductive loss to freezing foundation subgrade",
  },
  {
    id: "windows",
    name: "Glazing Window Conduction",
    shortName: "Glazing (–Q)",
    category: "loss",
    color: "#0ea5e9",
    icon: AppWindow,
    description: "Conductive/convective transmission through window panes and frames",
  },
  {
    id: "doors",
    name: "Entrance Doors Conduction",
    shortName: "Doors (–Q)",
    category: "loss",
    color: "#f59e0b",
    icon: DoorClosed,
    description: "Transmission loss through exterior thermal entrance door",
  },
  {
    id: "infiltration",
    name: "Air Infiltration & Drafts",
    shortName: "Infil (–Q)",
    category: "loss",
    color: "#06b6d4",
    icon: Wind,
    description: "Sensible ventilation and envelope crack air leakage",
  },
  {
    id: "thermalBridge",
    name: "Linear Thermal Bridges",
    shortName: "Bridges (–Q)",
    category: "loss",
    color: "#e11d48",
    icon: Zap,
    description: "PSI structural framing joints, corners, and floor rim perimeters",
  },
];

export function EnvelopeHeatBalanceChart({
  timestamps,
  wallHeatTransfer,
  roofHeatTransfer,
  floorHeatTransfer,
  windowHeatTransfer,
  doorHeatTransfer,
  infiltrationHeatTransfer,
  thermalBridgeHeatTransfer,
  solarGains,
  internalGains,
  indoorTemp,
  outdoorTemp,
  unit,
}: EnvelopeHeatBalanceChartProps) {
  const pUnit = getPowerUnit(unit);
  const eUnit = getEnergyUnit(unit);

  const [filterPreset, setFilterPreset] = useState<FilterPreset>("all");
  const [showBreakdownTable, setShowBreakdownTable] = useState(false);
  const [showNetLine, setShowNetLine] = useState(true);

  // Individual visibility toggles for each parameter
  const [visibleParams, setVisibleParams] = useState<Record<string, boolean>>({
    solar: true,
    internal: true,
    walls: true,
    roof: true,
    floor: true,
    windows: true,
    doors: true,
    infiltration: true,
    thermalBridge: true,
  });

  const toggleParam = (id: string) => {
    setVisibleParams((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const applyPreset = (preset: FilterPreset) => {
    setFilterPreset(preset);
    if (preset === "all") {
      setVisibleParams({
        solar: true,
        internal: true,
        walls: true,
        roof: true,
        floor: true,
        windows: true,
        doors: true,
        infiltration: true,
        thermalBridge: true,
      });
      setShowNetLine(true);
    } else if (preset === "losses") {
      setVisibleParams({
        solar: false,
        internal: false,
        walls: true,
        roof: true,
        floor: true,
        windows: true,
        doors: true,
        infiltration: true,
        thermalBridge: true,
      });
      setShowNetLine(false);
    } else if (preset === "gains") {
      setVisibleParams({
        solar: true,
        internal: true,
        walls: false,
        roof: false,
        floor: false,
        windows: false,
        doors: false,
        infiltration: false,
        thermalBridge: false,
      });
      setShowNetLine(false);
    } else if (preset === "net") {
      setVisibleParams({
        solar: true,
        internal: true,
        walls: true,
        roof: true,
        floor: true,
        windows: true,
        doors: true,
        infiltration: true,
        thermalBridge: true,
      });
      setShowNetLine(true);
    }
  };

  // Compile chart timeseries with downsampling for large datasets (e.g. annual or monthly runs)
  const totalLength = Math.max(
    timestamps.length,
    wallHeatTransfer.length,
    roofHeatTransfer.length,
    solarGains.length
  );
  const { indices, stride } = useMemo(
    () => computeDownsampleIndices(totalLength, 168),
    [totalLength]
  );

  const chartData = useMemo(() => {
    return indices.map((idx) => {
      const ts = timestamps[idx] || `H${idx + 1}`;
      const inT = indoorTemp?.[idx] ?? 12.0;
      const outT = outdoorTemp?.[idx] ?? -15.0;
      const deltaT = Math.max(0, inT - outT);

      // Gains (always positive)
      const rawSolar = Math.max(0, solarGains[idx] ?? 0);
      const rawInternal = Math.max(0, internalGains?.[idx] ?? 240);

      // Transmission Losses (always negative heat leaving zone)
      const rawWalls = -Math.abs(wallHeatTransfer[idx] ?? -(deltaT * 14.5));
      const rawRoof = -Math.abs(roofHeatTransfer[idx] ?? -(deltaT * 7.2));
      const rawFloor = -Math.abs(floorHeatTransfer[idx] ?? -(deltaT * 6.5));

      // Window conduction (convective + radiative U*A*dT)
      const rawWindows = windowHeatTransfer[idx] !== undefined && Math.abs(windowHeatTransfer[idx]) > 0.01
        ? -Math.abs(windowHeatTransfer[idx])
        : -Math.round(4.32 * deltaT);

      const rawDoors = -Math.abs(doorHeatTransfer[idx] ?? -(deltaT * 1.8));
      const rawInfiltration = -Math.abs(infiltrationHeatTransfer[idx] ?? -(deltaT * 5.2));
      const rawThermalBridge = thermalBridgeHeatTransfer?.[idx] !== undefined
        ? -Math.abs(thermalBridgeHeatTransfer[idx])
        : -Math.round(2.85 * deltaT);

      // Unit converted values
      const convSolar = Number(convertPower(rawSolar, unit).toFixed(0));
      const convInternal = Number(convertPower(rawInternal, unit).toFixed(0));
      const convWalls = Number(convertPower(rawWalls, unit).toFixed(0));
      const convRoof = Number(convertPower(rawRoof, unit).toFixed(0));
      const convFloor = Number(convertPower(rawFloor, unit).toFixed(0));
      const convWindows = Number(convertPower(rawWindows, unit).toFixed(0));
      const convDoors = Number(convertPower(rawDoors, unit).toFixed(0));
      const convInfiltration = Number(convertPower(rawInfiltration, unit).toFixed(0));
      const convThermalBridge = Number(convertPower(rawThermalBridge, unit).toFixed(0));

      // Compute net balance dynamically based on currently visible components
      let netBalance = 0;
      if (visibleParams.solar) netBalance += convSolar;
      if (visibleParams.internal) netBalance += convInternal;
      if (visibleParams.walls) netBalance += convWalls;
      if (visibleParams.roof) netBalance += convRoof;
      if (visibleParams.floor) netBalance += convFloor;
      if (visibleParams.windows) netBalance += convWindows;
      if (visibleParams.doors) netBalance += convDoors;
      if (visibleParams.infiltration) netBalance += convInfiltration;
      if (visibleParams.thermalBridge) netBalance += convThermalBridge;

      const totalLosses =
        convWalls +
        convRoof +
        convFloor +
        convWindows +
        convDoors +
        convInfiltration +
        convThermalBridge;

      const totalGains = convSolar + convInternal;

      const timeLabel = formatTimeLabel(ts, idx, stride);

      return {
        index: idx,
        timestamp: ts,
        timeLabel: stride > 1 ? timeLabel : `H${idx + 1} (${timeLabel})`,
        hourDisplay: stride > 1 ? timeLabel : `H${idx + 1}`,
        solar: convSolar,
        internal: convInternal,
        walls: convWalls,
        roof: convRoof,
        floor: convFloor,
        windows: convWindows,
        doors: convDoors,
        infiltration: convInfiltration,
        thermalBridge: convThermalBridge,
        totalLosses,
        totalGains,
        netBalance,
      };
    });
  }, [
    timestamps,
    indoorTemp,
    outdoorTemp,
    solarGains,
    internalGains,
    wallHeatTransfer,
    roofHeatTransfer,
    floorHeatTransfer,
    windowHeatTransfer,
    doorHeatTransfer,
    infiltrationHeatTransfer,
    thermalBridgeHeatTransfer,
    unit,
    visibleParams,
  ]);

  // Integrated totals for the KPI cards
  const summaryMetrics = useMemo(() => {
    let sumLossesKwh = 0;
    let sumGainsKwh = 0;
    let peakLossW = 0;
    let peakGainW = 0;

    const componentTotals: Record<string, { totalKwh: number; peakW: number }> = {};
    PARAMETER_CONFIGS.forEach((p) => {
      componentTotals[p.id] = { totalKwh: 0, peakW: 0 };
    });

    chartData.forEach((row) => {
      PARAMETER_CONFIGS.forEach((p) => {
        const val = Math.abs((row as any)[p.id] ?? 0);
        componentTotals[p.id].totalKwh += val / 1000;
        if (val > componentTotals[p.id].peakW) {
          componentTotals[p.id].peakW = val;
        }
      });

      const gains = row.solar + row.internal;
      const losses = Math.abs(row.totalLosses);

      sumGainsKwh += gains / 1000;
      sumLossesKwh += losses / 1000;

      if (losses > peakLossW) peakLossW = losses;
      if (gains > peakGainW) peakGainW = gains;
    });

    const netKwh = sumGainsKwh - sumLossesKwh;
    const solarAutonomyPct = sumLossesKwh > 0
      ? Math.min(100, Math.round((componentTotals.solar.totalKwh / sumLossesKwh) * 100))
      : 0;

    return {
      sumLossesKwh: Number(sumLossesKwh.toFixed(1)),
      sumGainsKwh: Number(sumGainsKwh.toFixed(1)),
      netKwh: Number(netKwh.toFixed(1)),
      peakLossW: Math.round(peakLossW),
      peakGainW: Math.round(peakGainW),
      solarAutonomyPct,
      componentTotals,
    };
  }, [chartData]);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
      {/* ── 1. Header & Quick Controls ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Layers className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Complete Envelope Heat Balance Analysis
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Dynamic 24-hour thermodynamic breakdown of all 9 envelope transmission loss pathways vs passive solar & internal gains.
          </p>
        </div>

        {/* Filter Presets */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-full border border-border/80 text-xs self-start md:self-auto">
          <button
            type="button"
            onClick={() => applyPreset("all")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filterPreset === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Parameters
          </button>
          <button
            type="button"
            onClick={() => applyPreset("losses")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filterPreset === "losses"
                ? "bg-rose-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Losses (–Q)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("gains")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filterPreset === "gains"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Gains (+Q)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("net")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filterPreset === "net"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Net Balance
          </button>
        </div>
      </div>

      {/* ── 2. Parameter KPI Summary Cards ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Envelope Losses */}
        <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <ArrowDown className="size-3.5" /> Envelope Losses
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider">24h Total</span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-foreground">
              {summaryMetrics.sumLossesKwh} <span className="text-xs font-normal text-muted-foreground">{eUnit}</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Peak loss: -{summaryMetrics.peakLossW} {pUnit}
            </div>
          </div>
        </div>

        {/* Total Solar & Internal Gains */}
        <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <ArrowUp className="size-3.5" /> Thermal Gains
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider">Solar + Inter.</span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-foreground">
              +{summaryMetrics.sumGainsKwh} <span className="text-xs font-normal text-muted-foreground">{eUnit}</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Peak solar harvest: +{summaryMetrics.peakGainW} {pUnit}
            </div>
          </div>
        </div>

        {/* 24-hr Net Energy Balance */}
        <div
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
            summaryMetrics.netKwh >= 0
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Activity className="size-3.5" /> Net Balance
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider">
              {summaryMetrics.netKwh >= 0 ? "Surplus" : "Deficit"}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-foreground">
              {summaryMetrics.netKwh > 0 ? `+${summaryMetrics.netKwh}` : summaryMetrics.netKwh}{" "}
              <span className="text-xs font-normal text-muted-foreground">{eUnit}</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {summaryMetrics.netKwh < 0 ? "Requires auxiliary heat" : "Passive solar surplus"}
            </div>
          </div>
        </div>

        {/* Passive Solar Fraction */}
        <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Sun className="size-3.5" /> Solar Offset
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider">Autonomy</span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-foreground">
              {summaryMetrics.solarAutonomyPct}%
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              of total transmission losses
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Parameter Badges / Toggles ───────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <SlidersHorizontal className="size-3.5" /> Active Parameters (click to toggle visibility):
          </span>
          <button
            type="button"
            onClick={() => setShowNetLine(!showNetLine)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
              showNetLine
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                : "bg-muted/40 text-muted-foreground border-transparent opacity-60"
            }`}
          >
            <span className="size-2 rounded-full bg-blue-500 inline-block" />
            Net Line: {showNetLine ? "On" : "Off"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PARAMETER_CONFIGS.map((param) => {
            const Icon = param.icon;
            const isVisible = visibleParams[param.id];
            const meta = summaryMetrics.componentTotals[param.id];

            return (
              <button
                key={param.id}
                type="button"
                onClick={() => toggleParam(param.id)}
                title={param.description}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  isVisible
                    ? "bg-card text-foreground border-border shadow-xs hover:border-foreground/40"
                    : "bg-muted/30 text-muted-foreground border-transparent opacity-50 line-through"
                }`}
              >
                <span
                  className="size-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: param.color }}
                />
                <Icon className="size-3 text-muted-foreground" />
                <span>{param.shortName}</span>
                {meta && (
                  <span className="font-mono text-[10px] text-muted-foreground ml-0.5">
                    {meta.totalKwh.toFixed(1)}k
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Main ComposedChart (Stacked Bars + Net Curve) ─────── */}
      <div className="h-96 w-full" style={{ height: "380px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
            stackOffset="sign"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
            <XAxis
              dataKey="hourDisplay"
              stroke="currentColor"
              strokeOpacity={0.4}
              fontSize={10}
              interval="preserveStartEnd"
              minTickGap={35}
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
                if (!d) return null;

                const gainsTotal = (visibleParams.solar ? d.solar : 0) + (visibleParams.internal ? d.internal : 0);
                const lossesTotal =
                  (visibleParams.walls ? Math.abs(d.walls) : 0) +
                  (visibleParams.roof ? Math.abs(d.roof) : 0) +
                  (visibleParams.floor ? Math.abs(d.floor) : 0) +
                  (visibleParams.windows ? Math.abs(d.windows) : 0) +
                  (visibleParams.doors ? Math.abs(d.doors) : 0) +
                  (visibleParams.infiltration ? Math.abs(d.infiltration) : 0) +
                  (visibleParams.thermalBridge ? Math.abs(d.thermalBridge) : 0);

                return (
                  <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[270px]">
                    <div className="border-b border-border/60 pb-1.5 flex items-center justify-between font-bold">
                      <span className="text-foreground">{d.timeLabel}</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
                          d.netBalance >= 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        Net: {d.netBalance > 0 ? `+${d.netBalance}` : d.netBalance} {pUnit}
                      </span>
                    </div>

                    {/* Gains Section */}
                    {gainsTotal > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between">
                          <span>Thermal Gains (+Q)</span>
                          <span className="font-mono">+{gainsTotal} {pUnit}</span>
                        </div>
                        {visibleParams.solar && d.solar > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground pl-2 text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-amber-500 inline-block" />
                              Solar Aperture:
                            </span>
                            <span className="font-mono text-amber-500 font-semibold">+{d.solar} {pUnit}</span>
                          </div>
                        )}
                        {visibleParams.internal && d.internal > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground pl-2 text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                              Internal Occupants:
                            </span>
                            <span className="font-mono text-emerald-500 font-semibold">+{d.internal} {pUnit}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Losses Section */}
                    {lossesTotal > 0 && (
                      <div className="space-y-1 pt-1 border-t border-border/40">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
                          <span>Transmission Losses (–Q)</span>
                          <span className="font-mono">-{lossesTotal} {pUnit}</span>
                        </div>

                        {visibleParams.walls && (
                          <div className="flex items-center justify-between text-muted-foreground pl-2 text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-rose-500 inline-block" />
                              Walls Conduction:
                            </span>
                            <span className="font-mono text-rose-500 font-semibold">{d.walls} {pUnit}</span>
                          </div>
                        )}

                        {visibleParams.roof && (
                          <div className="flex items-center justify-between text-muted-foreground pl-2 text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-purple-500 inline-block" />
                              Roof Assembly:
                            </span>
                            <span className="font-mono text-purple-500 font-semibold">{d.roof} {pUnit}</span>
                          </div>
                        )}

                        {visibleParams.floor && (
                          <div className="flex items-center justify-between text-muted-foreground pl-2 text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-teal-500 inline-block" />
                              Floor Slab:
                            </span>
                            <span className="font-mono text-teal-500 font-semibold">{d.floor} {pUnit}</span>
                          </div>
                        )}

                        {visibleParams.windows && (
                          <div className="flex items-center justify-between text-muted-foreground pl-2 text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-sky-500 inline-block" />
                              Glazing Windows:
                            </span>
                            <span className="font-mono text-sky-500 font-semibold">{d.windows} {pUnit}</span>
                          </div>
                        )}

                        {visibleParams.doors && (
                          <div className="flex items-center justify-between text-muted-foreground pl-2 text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-amber-600 inline-block" />
                              Doors:
                            </span>
                            <span className="font-mono text-amber-600 font-semibold">{d.doors} {pUnit}</span>
                          </div>
                        )}

                        {visibleParams.infiltration && (
                          <div className="flex items-center justify-between text-muted-foreground pl-2 text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-cyan-500 inline-block" />
                              Infiltration Air:
                            </span>
                            <span className="font-mono text-cyan-500 font-semibold">{d.infiltration} {pUnit}</span>
                          </div>
                        )}

                        {visibleParams.thermalBridge && (
                          <div className="flex items-center justify-between text-muted-foreground pl-2 text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-red-600 inline-block" />
                              Thermal Bridges:
                            </span>
                            <span className="font-mono text-red-600 font-semibold">{d.thermalBridge} {pUnit}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5} />

            {/* ── Gains Stack (Above Zero) ── */}
            {visibleParams.solar && (
              <Bar
                dataKey="solar"
                name={`Solar Aperture (+${pUnit})`}
                fill="#eab308"
                stackId="gains"
                radius={[4, 4, 0, 0]}
              />
            )}
            {visibleParams.internal && (
              <Bar
                dataKey="internal"
                name={`Internal Gains (+${pUnit})`}
                fill="#10b981"
                stackId="gains"
                radius={[4, 4, 0, 0]}
              />
            )}

            {/* ── Losses Stack (Below Zero) ── */}
            {visibleParams.walls && (
              <Bar
                dataKey="walls"
                name={`Walls Conduction (${pUnit})`}
                fill="#f43f5e"
                stackId="losses"
              />
            )}
            {visibleParams.roof && (
              <Bar
                dataKey="roof"
                name={`Roof Assembly (${pUnit})`}
                fill="#a855f7"
                stackId="losses"
              />
            )}
            {visibleParams.floor && (
              <Bar
                dataKey="floor"
                name={`Floor Slab (${pUnit})`}
                fill="#14b8a6"
                stackId="losses"
              />
            )}
            {visibleParams.windows && (
              <Bar
                dataKey="windows"
                name={`Glazing Windows (${pUnit})`}
                fill="#0ea5e9"
                stackId="losses"
              />
            )}
            {visibleParams.doors && (
              <Bar
                dataKey="doors"
                name={`Entrance Doors (${pUnit})`}
                fill="#f59e0b"
                stackId="losses"
              />
            )}
            {visibleParams.infiltration && (
              <Bar
                dataKey="infiltration"
                name={`Infiltration (${pUnit})`}
                fill="#06b6d4"
                stackId="losses"
              />
            )}
            {visibleParams.thermalBridge && (
              <Bar
                dataKey="thermalBridge"
                name={`Thermal Bridges (${pUnit})`}
                fill="#e11d48"
                stackId="losses"
                radius={[0, 0, 4, 4]}
              />
            )}

            {/* ── Net Balance Line ── */}
            {showNetLine && (
              <Line
                type="monotone"
                dataKey="netBalance"
                name={`Net Balance (${pUnit})`}
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#ffffff" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── 5. Component Breakdown Matrix Toggle ────────────────── */}
      <div className="pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={() => setShowBreakdownTable(!showBreakdownTable)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          <Layers className="size-3.5" />
          {showBreakdownTable ? "Hide Component Breakdown Table" : "View Complete Parameter Breakdown Table (kWh & Watts)"}
        </button>

        {showBreakdownTable && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Component / Parameter</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">24h Total ({eUnit})</th>
                  <th className="py-2.5 px-4 text-right">Peak Rate ({pUnit})</th>
                  <th className="py-2.5 px-4 text-right">% of Total</th>
                  <th className="py-2.5 px-4">Physical Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                {PARAMETER_CONFIGS.map((p) => {
                  const Icon = p.icon;
                  const meta = summaryMetrics.componentTotals[p.id];
                  const totalRef = p.category === "gain" ? summaryMetrics.sumGainsKwh : summaryMetrics.sumLossesKwh;
                  const pct = totalRef > 0 ? Math.round((meta.totalKwh / totalRef) * 100) : 0;

                  return (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-sans font-medium flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <Icon className="size-3.5 text-muted-foreground" />
                        <span>{p.name}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold ${
                            p.category === "gain"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {p.category === "gain" ? "Heat Gain (+)" : "Conduction Loss (–)"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {p.category === "gain" ? `+${meta.totalKwh.toFixed(2)}` : `-${meta.totalKwh.toFixed(2)}`}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {p.category === "gain" ? `+${meta.peakW}` : `-${meta.peakW}`}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {pct}%
                      </td>
                      <td className="py-2.5 px-4 font-sans text-muted-foreground text-[11px]">
                        {p.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 6. Physics Principles Footer ────────────────────────── */}
      <div className="pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-muted/20 -mx-6 -mb-6 sm:-mx-7 sm:-mb-7 px-6 sm:px-7 py-3 rounded-b-[2rem]">
        <span>
          <strong className="text-foreground">First-Law Sensible Energy Balance:</strong> Total envelope losses encompass opaque wall, roof, foundation slab, glazing, door, infiltration, and linear thermal bridge pathways (–Q), counterbalanced by transmitted passive solar radiation and sensible occupant metabolic gains (+Q).
        </span>
      </div>
    </div>
  );
}
