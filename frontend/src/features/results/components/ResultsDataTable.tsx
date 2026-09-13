"use client";

import React, { useState, useMemo } from "react";
import {
  Download,
  Table as TableIcon,
  Layers,
  Thermometer,
  Sun,
  Flame,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { UnitSystem, TimeRangeOption, AggregationMode } from "@/types/simulation";
import {
  convertTemperature,
  convertPower,
  convertFlux,
  getTemperatureUnit,
  getPowerUnit,
  getFluxUnit,
  formatNumber,
} from "../unit-converter";

interface ResultsDataTableProps {
  timestamps: string[];
  indoorTemp: number[];
  outdoorTemp: number[];
  solarRadiation: number[];
  solarGains: number[];
  wallHeatTransfer: number[];
  roofHeatTransfer: number[];
  floorHeatTransfer: number[];
  windowHeatTransfer: number[];
  doorHeatTransfer: number[];
  infiltrationHeatTransfer: number[];
  thermalBridgeHeatTransfer?: number[];
  internalGains?: number[];
  unit: UnitSystem;
}

type ColumnView = "all" | "temps" | "envelope" | "summary";

export function ResultsDataTable({
  timestamps,
  indoorTemp,
  outdoorTemp,
  solarRadiation,
  solarGains,
  wallHeatTransfer,
  roofHeatTransfer,
  floorHeatTransfer,
  windowHeatTransfer,
  doorHeatTransfer,
  infiltrationHeatTransfer,
  thermalBridgeHeatTransfer,
  internalGains,
  unit,
}: ResultsDataTableProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>("full");
  const [aggregation, setAggregation] = useState<AggregationMode>("hourly");
  const [columnView, setColumnView] = useState<ColumnView>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 24;

  const tUnit = getTemperatureUnit(unit);
  const pUnit = getPowerUnit(unit);
  const fUnit = getFluxUnit(unit);

  // 1. Filter by Time Range
  const filteredIndices = useMemo(() => {
    const total = timestamps.length;
    switch (timeRange) {
      case "day1":
        return Array.from({ length: Math.min(24, total) }, (_, i) => i);
      case "day2":
        return Array.from({ length: Math.min(24, Math.max(0, total - 24)) }, (_, i) => i + 24);
      case "day3":
        return Array.from({ length: Math.min(24, Math.max(0, total - 48)) }, (_, i) => i + 48);
      case "extremeCold":
        return Array.from({ length: Math.min(24, total) }, (_, i) => i);
      case "full":
      default:
        return Array.from({ length: total }, (_, i) => i);
    }
  }, [timestamps, timeRange]);

  // 2. Build Hourly Records with clean conversions
  const hourlyRows = useMemo(() => {
    return filteredIndices.map((idx) => {
      const ts = timestamps[idx] || `Hour ${idx + 1}`;
      const inT = indoorTemp[idx] ?? 0;
      const outT = outdoorTemp[idx] ?? 0;
      const deltaT = inT - outT;
      const ghi = solarRadiation[idx] ?? 0;
      const sg = Math.max(0, solarGains[idx] ?? 0);
      const ig = internalGains?.[idx] ?? 240;

      // Transmission losses (negative)
      const wall = -Math.abs(wallHeatTransfer[idx] ?? 0);
      const roof = -Math.abs(roofHeatTransfer[idx] ?? 0);
      const floor = -Math.abs(floorHeatTransfer[idx] ?? 0);
      const win = -Math.abs(windowHeatTransfer[idx] ?? 0);
      const door = -Math.abs(doorHeatTransfer[idx] ?? 0);
      const inf = -Math.abs(infiltrationHeatTransfer[idx] ?? 0);
      const bridge = -Math.abs(thermalBridgeHeatTransfer?.[idx] ?? Math.round(2.85 * Math.max(0, deltaT)));

      const totalLoss = wall + roof + floor + win + door + inf + bridge;
      const totalGain = sg + ig;
      const net = totalGain + totalLoss;

      const timeLabel = ts.includes("T")
        ? ts.split("T")[1]?.slice(0, 5) || ts
        : ts.length > 5
        ? ts.slice(-5)
        : ts;

      return {
        id: `h-${idx}`,
        hourNumber: idx + 1,
        label: `H${idx + 1} (${timeLabel})`,
        timeOnly: timeLabel,
        timestamp: ts,
        indoor: convertTemperature(inT, unit),
        outdoor: convertTemperature(outT, unit),
        delta: deltaT,
        radiation: convertFlux(ghi, unit),
        solarGain: convertPower(sg, unit),
        internalGain: convertPower(ig, unit),
        wallLoss: convertPower(wall, unit),
        roofLoss: convertPower(roof, unit),
        floorLoss: convertPower(floor, unit),
        winLoss: convertPower(win, unit),
        doorLoss: convertPower(door, unit),
        infLoss: convertPower(inf, unit),
        bridgeLoss: convertPower(bridge, unit),
        totalLoss: convertPower(totalLoss, unit),
        netBalance: convertPower(net, unit),
      };
    });
  }, [
    filteredIndices,
    timestamps,
    indoorTemp,
    outdoorTemp,
    solarRadiation,
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
  ]);

  // 3. Search & Filter
  const displayedHourlyRows = useMemo(() => {
    if (!searchQuery.trim()) return hourlyRows;
    const q = searchQuery.toLowerCase();
    return hourlyRows.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.timestamp.toLowerCase().includes(q)
    );
  }, [hourlyRows, searchQuery]);

  // 4. Build Daily Aggregates
  const dailyRows = useMemo(() => {
    if (aggregation !== "daily") return [];
    const daysCount = Math.ceil(filteredIndices.length / 24) || 1;
    const days = [];

    for (let d = 0; d < daysCount; d++) {
      const daySlice = filteredIndices.slice(d * 24, (d + 1) * 24);
      if (!daySlice.length) continue;

      const inTemps = daySlice.map((i) => indoorTemp[i] ?? 0);
      const outTemps = daySlice.map((i) => outdoorTemp[i] ?? 0);
      const sGains = daySlice.map((i) => solarGains[i] ?? 0);
      const wallLosses = daySlice.map((i) => Math.abs(wallHeatTransfer[i] ?? 0));
      const totalLosses = daySlice.map((i) => {
        return (
          Math.abs(wallHeatTransfer[i] ?? 0) +
          Math.abs(roofHeatTransfer[i] ?? 0) +
          Math.abs(floorHeatTransfer[i] ?? 0) +
          Math.abs(windowHeatTransfer[i] ?? 0) +
          Math.abs(doorHeatTransfer[i] ?? 0) +
          Math.abs(infiltrationHeatTransfer[i] ?? 0)
        );
      });

      const inMin = Math.min(...inTemps);
      const inMax = Math.max(...inTemps);
      const inMean = inTemps.reduce((a, b) => a + b, 0) / inTemps.length;
      const outMin = Math.min(...outTemps);
      const outMax = Math.max(...outTemps);
      const outMean = outTemps.reduce((a, b) => a + b, 0) / outTemps.length;

      const dailySolarKwh = sGains.reduce((a, b) => a + b, 0) / 1000;
      const dailyWallKwh = wallLosses.reduce((a, b) => a + b, 0) / 1000;
      const dailyTotalLossKwh = totalLosses.reduce((a, b) => a + b, 0) / 1000;
      const netDailyKwh = dailySolarKwh - dailyTotalLossKwh;

      days.push({
        id: `day-${d + 1}`,
        label: `Day ${d + 1} Daily Summary`,
        timestamp: `Day ${d + 1} (24-Hour Diurnal Cycle)`,
        indoorMin: convertTemperature(inMin, unit),
        indoorMax: convertTemperature(inMax, unit),
        indoorMean: convertTemperature(inMean, unit),
        outdoorMin: convertTemperature(outMin, unit),
        outdoorMax: convertTemperature(outMax, unit),
        outdoorMean: convertTemperature(outMean, unit),
        dailySolarKwh: Number(dailySolarKwh.toFixed(2)),
        dailyWallKwh: Number(dailyWallKwh.toFixed(2)),
        dailyTotalLossKwh: Number(dailyTotalLossKwh.toFixed(2)),
        netDailyKwh: Number(netDailyKwh.toFixed(2)),
      });
    }
    return days;
  }, [
    aggregation,
    filteredIndices,
    indoorTemp,
    outdoorTemp,
    solarGains,
    wallHeatTransfer,
    roofHeatTransfer,
    floorHeatTransfer,
    windowHeatTransfer,
    doorHeatTransfer,
    infiltrationHeatTransfer,
    unit,
  ]);

  // 5. Pagination
  const totalPages = Math.ceil(displayedHourlyRows.length / rowsPerPage) || 1;
  const paginatedRows = displayedHourlyRows.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // 6. CSV Export Handler
  const handleExportCsv = () => {
    const headers = [
      "Timestep",
      "Timestamp",
      `Indoor_Temp_${tUnit}`,
      `Outdoor_Temp_${tUnit}`,
      `Delta_Temp_${tUnit}`,
      `Solar_Irradiance_${fUnit}`,
      `Solar_Aperture_Gain_${pUnit}`,
      `Internal_Gains_${pUnit}`,
      `Wall_Conduction_${pUnit}`,
      `Roof_Conduction_${pUnit}`,
      `Floor_Slab_Loss_${pUnit}`,
      `Window_Glazing_Loss_${pUnit}`,
      `Door_Loss_${pUnit}`,
      `Infiltration_Loss_${pUnit}`,
      `Thermal_Bridge_Loss_${pUnit}`,
      `Total_Envelope_Loss_${pUnit}`,
      `Net_Heat_Balance_${pUnit}`,
    ];

    const rows = hourlyRows.map((r) => [
      `"${r.label}"`,
      `"${r.timestamp}"`,
      r.indoor.toFixed(2),
      r.outdoor.toFixed(2),
      r.delta.toFixed(2),
      r.radiation.toFixed(1),
      r.solarGain.toFixed(1),
      r.internalGain.toFixed(1),
      r.wallLoss.toFixed(1),
      r.roofLoss.toFixed(1),
      r.floorLoss.toFixed(1),
      r.winLoss.toFixed(1),
      r.doorLoss.toFixed(1),
      r.infLoss.toFixed(1),
      r.bridgeLoss.toFixed(1),
      r.totalLoss.toFixed(1),
      r.netBalance.toFixed(1),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shelter_engineering_table_${timeRange}_${unit}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick statistics
  const stats = useMemo(() => {
    if (!hourlyRows.length) return null;
    const inTemps = hourlyRows.map((r) => r.indoor);
    const outTemps = hourlyRows.map((r) => r.outdoor);
    const solars = hourlyRows.map((r) => r.solarGain);
    const losses = hourlyRows.map((r) => Math.abs(r.totalLoss));

    return {
      peakIndoor: Math.max(...inTemps),
      minIndoor: Math.min(...inTemps),
      peakOutdoor: Math.max(...outTemps),
      minOutdoor: Math.min(...outTemps),
      peakSolar: Math.max(...solars),
      peakLoss: Math.max(...losses),
      totalRows: hourlyRows.length,
    };
  }, [hourlyRows]);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
      {/* ── 1. Header & Controls ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <TableIcon className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Engineering Data Records & Time-Series Ledger
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Complete hourly and daily telemetry across all 9 heat balance components, solar aperture radiation, and ambient air temperatures.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── 2. Filter & View Preset Toolbar ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-2xl bg-muted/30 border border-border/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Pills */}
          <div className="flex items-center rounded-full bg-muted/60 p-1 border border-border text-xs">
            {(
              [
                { id: "full", label: "Full Run" },
                { id: "day1", label: "Day 1" },
                { id: "day2", label: "Day 2" },
                { id: "day3", label: "Day 3" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTimeRange(item.id);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  timeRange === item.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Aggregation Pills */}
          <div className="flex items-center rounded-full bg-muted/60 p-1 border border-border text-xs">
            <button
              type="button"
              onClick={() => {
                setAggregation("hourly");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                aggregation === "hourly"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hourly Timesteps
            </button>
            <button
              type="button"
              onClick={() => {
                setAggregation("daily");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                aggregation === "daily"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daily Aggregates
            </button>
          </div>
        </div>

        {/* Column Channel Presets (Hourly Mode) */}
        {aggregation === "hourly" && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground text-[11px] font-medium hidden md:inline">Channels:</span>
            <div className="flex items-center rounded-full bg-muted/60 p-1 border border-border">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "temps", label: "Temps" },
                  { id: "envelope", label: "Envelope" },
                  { id: "summary", label: "Net" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setColumnView(preset.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    columnView === preset.id
                      ? "bg-card text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Quick Telemetry Micro-Cards ───────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Indoor Air Range
              </div>
              <div className="text-sm font-mono font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                {stats.minIndoor.toFixed(1)}° to {stats.peakIndoor.toFixed(1)} {tUnit}
              </div>
            </div>
            <Thermometer className="size-4 text-sky-500 opacity-60" />
          </div>

          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Outdoor Ambient
              </div>
              <div className="text-sm font-mono font-bold text-muted-foreground mt-0.5">
                {stats.minOutdoor.toFixed(1)}° to {stats.peakOutdoor.toFixed(1)} {tUnit}
              </div>
            </div>
            <Flame className="size-4 text-rose-500 opacity-60" />
          </div>

          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Peak Solar Gain
              </div>
              <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                +{stats.peakSolar} {pUnit}
              </div>
            </div>
            <Sun className="size-4 text-amber-500 opacity-60" />
          </div>

          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Peak Transmission Loss
              </div>
              <div className="text-sm font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                -{stats.peakLoss} {pUnit}
              </div>
            </div>
            <ArrowDown className="size-4 text-rose-500 opacity-60" />
          </div>
        </div>
      )}

      {/* ── 4. Main Data Table ───────────────────────────────────── */}
      {aggregation === "hourly" ? (
        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold text-[11px] tracking-wider uppercase">
                <tr>
                  <th className="py-3 px-3.5 sticky left-0 bg-muted/80 backdrop-blur-xs z-10">Timestep</th>
                  
                  {/* Temperatures */}
                  {(columnView === "all" || columnView === "temps" || columnView === "summary") && (
                    <>
                      <th className="py-3 px-3 text-right">Indoor ({tUnit})</th>
                      <th className="py-3 px-3 text-right">Outdoor ({tUnit})</th>
                      <th className="py-3 px-3 text-right">ΔT Lift</th>
                    </>
                  )}

                  {/* Solar */}
                  {(columnView === "all" || columnView === "temps") && (
                    <>
                      <th className="py-3 px-3 text-right">GHI ({fUnit})</th>
                      <th className="py-3 px-3 text-right">Solar Gain ({pUnit})</th>
                    </>
                  )}

                  {/* Envelope Losses */}
                  {(columnView === "all" || columnView === "envelope") && (
                    <>
                      <th className="py-3 px-3 text-right">Walls ({pUnit})</th>
                      <th className="py-3 px-3 text-right">Roof ({pUnit})</th>
                      <th className="py-3 px-3 text-right">Floor ({pUnit})</th>
                      <th className="py-3 px-3 text-right">Glazing ({pUnit})</th>
                      <th className="py-3 px-3 text-right">Doors ({pUnit})</th>
                      <th className="py-3 px-3 text-right">Infiltration ({pUnit})</th>
                      <th className="py-3 px-3 text-right">Bridges ({pUnit})</th>
                    </>
                  )}

                  {/* Net Summary */}
                  {(columnView === "all" || columnView === "summary") && (
                    <>
                      <th className="py-3 px-3 text-right">Total Losses ({pUnit})</th>
                      <th className="py-3 px-3.5 text-right font-bold">Net Balance</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-[12px]">
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3.5 font-sans font-medium text-foreground whitespace-nowrap sticky left-0 bg-card z-10">
                      {row.label}
                    </td>

                    {/* Temperatures */}
                    {(columnView === "all" || columnView === "temps" || columnView === "summary") && (
                      <>
                        <td className="py-2.5 px-3 text-right font-semibold text-sky-600 dark:text-sky-400">
                          {row.indoor.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">
                          {row.outdoor.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          +{row.delta.toFixed(1)}
                        </td>
                      </>
                    )}

                    {/* Solar */}
                    {(columnView === "all" || columnView === "temps") && (
                      <>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">
                          {row.radiation.toFixed(0)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                          {row.solarGain > 0 ? `+${row.solarGain.toFixed(0)}` : "0"}
                        </td>
                      </>
                    )}

                    {/* Envelope Losses */}
                    {(columnView === "all" || columnView === "envelope") && (
                      <>
                        <td className="py-2.5 px-3 text-right text-rose-500">
                          {row.wallLoss.toFixed(0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-purple-500">
                          {row.roofLoss.toFixed(0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-teal-600 dark:text-teal-400">
                          {row.floorLoss.toFixed(0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-sky-500">
                          {row.winLoss.toFixed(0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-500">
                          {row.doorLoss.toFixed(0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-cyan-600 dark:text-cyan-400">
                          {row.infLoss.toFixed(0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-red-600 dark:text-red-400">
                          {row.bridgeLoss.toFixed(0)}
                        </td>
                      </>
                    )}

                    {/* Net Summary */}
                    {(columnView === "all" || columnView === "summary") && (
                      <>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                          {row.totalLoss.toFixed(0)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              row.netBalance >= 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {row.netBalance > 0 ? `+${row.netBalance.toFixed(0)}` : row.netBalance.toFixed(0)} {pUnit}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Daily Summary Table ─────────────────────────────────── */
        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold text-[11px] tracking-wider uppercase">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-3 text-right">Indoor Min ({tUnit})</th>
                  <th className="py-3 px-3 text-right">Indoor Max ({tUnit})</th>
                  <th className="py-3 px-3 text-right">Indoor Mean ({tUnit})</th>
                  <th className="py-3 px-3 text-right">Outdoor Min ({tUnit})</th>
                  <th className="py-3 px-3 text-right">Outdoor Max ({tUnit})</th>
                  <th className="py-3 px-3 text-right">Daily Solar Gain (kWh)</th>
                  <th className="py-3 px-3 text-right">Total Losses (kWh)</th>
                  <th className="py-3 px-4 text-right font-bold">Daily Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-[12px]">
                {dailyRows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-foreground">
                      {row.label}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-sky-600 dark:text-sky-400">
                      {row.indoorMin.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                      {row.indoorMax.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground font-semibold">
                      {row.indoorMean.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">
                      {row.outdoorMin.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">
                      {row.outdoorMax.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                      +{row.dailySolarKwh.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                      -{row.dailyTotalLossKwh.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          row.netDailyKwh >= 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {row.netDailyKwh > 0 ? `+${row.netDailyKwh.toFixed(1)}` : row.netDailyKwh.toFixed(1)} kWh
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. Pagination & Footer ───────────────────────────────── */}
      {aggregation === "hourly" && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * rowsPerPage + 1}–
            {Math.min(page * rowsPerPage, displayedHourlyRows.length)} of {displayedHourlyRows.length} hourly timesteps
          </span>
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border bg-card text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer text-xs font-medium"
            >
              <ChevronLeft className="size-3.5" /> Previous
            </button>
            <span className="px-2 font-mono text-foreground font-semibold text-xs">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border bg-card text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer text-xs font-medium"
            >
              Next <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
