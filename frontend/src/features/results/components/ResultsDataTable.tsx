"use client";

import React, { useState, useMemo } from "react";
import { Download, Filter, Calendar, Layers, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  unit: UnitSystem;
}

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
  unit,
}: ResultsDataTableProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>("full");
  const [aggregation, setAggregation] = useState<AggregationMode>("hourly");
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
        // Sub-sample coldest 24 hours
        return Array.from({ length: Math.min(24, total) }, (_, i) => i);
      case "full":
      default:
        return Array.from({ length: total }, (_, i) => i);
    }
  }, [timestamps, timeRange]);

  // 2. Build Hourly Records
  const hourlyRows = useMemo(() => {
    return filteredIndices.map((idx) => {
      const ts = timestamps[idx] || `Hour ${idx + 1}`;
      const inT = indoorTemp[idx] ?? 0;
      const outT = outdoorTemp[idx] ?? 0;
      const deltaT = inT - outT;
      const ghi = solarRadiation[idx] ?? 0;
      const sg = solarGains[idx] ?? 0;
      const wall = wallHeatTransfer[idx] ?? 0;
      const roof = roofHeatTransfer[idx] ?? 0;
      const floor = floorHeatTransfer[idx] ?? 0;
      const win = windowHeatTransfer[idx] ?? 0;
      const door = doorHeatTransfer[idx] ?? 0;
      const inf = infiltrationHeatTransfer[idx] ?? 0;
      const net = sg + wall + roof + floor + win + door + inf;

      return {
        id: `h-${idx}`,
        label: `Hour ${idx + 1}`,
        timestamp: ts,
        indoor: convertTemperature(inT, unit),
        outdoor: convertTemperature(outT, unit),
        delta: inT - outT,
        radiation: convertFlux(ghi, unit),
        solarGain: convertPower(sg, unit),
        wallLoss: convertPower(wall, unit),
        roofLoss: convertPower(roof, unit),
        floorLoss: convertPower(floor, unit),
        winLoss: convertPower(win, unit),
        doorLoss: convertPower(door, unit),
        infLoss: convertPower(inf, unit),
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
    wallHeatTransfer,
    roofHeatTransfer,
    floorHeatTransfer,
    windowHeatTransfer,
    doorHeatTransfer,
    infiltrationHeatTransfer,
    unit,
  ]);

  // 3. Build Daily Aggregates if Aggregation Mode is Daily
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
      const wallLosses = daySlice.map((i) => wallHeatTransfer[i] ?? 0);

      const inMin = Math.min(...inTemps);
      const inMax = Math.max(...inTemps);
      const inMean = inTemps.reduce((a, b) => a + b, 0) / inTemps.length;
      const outMin = Math.min(...outTemps);
      const outMax = Math.max(...outTemps);
      const outMean = outTemps.reduce((a, b) => a + b, 0) / outTemps.length;

      const dailySolarKwh = sGains.reduce((a, b) => a + b, 0) / 1000;
      const dailyWallKwh = Math.abs(wallLosses.reduce((a, b) => a + b, 0)) / 1000;

      days.push({
        id: `day-${d + 1}`,
        label: `Day ${d + 1} Daily Summary`,
        timestamp: `Day ${d + 1} (24h Aggregate)`,
        indoorMin: convertTemperature(inMin, unit),
        indoorMax: convertTemperature(inMax, unit),
        indoorMean: convertTemperature(inMean, unit),
        outdoorMin: convertTemperature(outMin, unit),
        outdoorMax: convertTemperature(outMax, unit),
        outdoorMean: convertTemperature(outMean, unit),
        dailySolarKwh,
        dailyWallKwh,
      });
    }
    return days;
  }, [aggregation, filteredIndices, indoorTemp, outdoorTemp, solarGains, wallHeatTransfer, unit]);

  // Pagination for hourly
  const totalPages = Math.ceil(hourlyRows.length / rowsPerPage) || 1;
  const paginatedHourlyRows = hourlyRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Export to CSV handler
  const handleExportCsv = () => {
    const headers = [
      "Hour",
      "Timestamp",
      `Indoor_Temp_${tUnit}`,
      `Outdoor_Temp_${tUnit}`,
      `Delta_Temp_${tUnit}`,
      `Solar_Irradiance_${fUnit}`,
      `Solar_Gain_${pUnit}`,
      `Wall_Loss_${pUnit}`,
      `Roof_Loss_${pUnit}`,
      `Floor_Loss_${pUnit}`,
      `Window_Loss_${pUnit}`,
      `Door_Loss_${pUnit}`,
      `Infiltration_Loss_${pUnit}`,
      `Net_Balance_${pUnit}`,
    ];

    const rows = hourlyRows.map((r) => [
      r.label,
      r.timestamp,
      r.indoor.toFixed(2),
      r.outdoor.toFixed(2),
      r.delta.toFixed(2),
      r.radiation.toFixed(1),
      r.solarGain.toFixed(1),
      r.wallLoss.toFixed(1),
      r.roofLoss.toFixed(1),
      r.floorLoss.toFixed(1),
      r.winLoss.toFixed(1),
      r.doorLoss.toFixed(1),
      r.infLoss.toFixed(1),
      r.netBalance.toFixed(1),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shelter_simulation_results_${timeRange}_${unit}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4">
      {/* Top Table Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-400" />
            <span>Detailed Timestep & Aggregation Engineering Table</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Exportable tabular records across all heat balance paths and zone temperatures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
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
                onClick={() => {
                  setTimeRange(item.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  timeRange === item.id
                    ? "bg-sky-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Aggregation Mode Selector */}
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setAggregation("hourly")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                aggregation === "hourly"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Hourly Timesteps
            </button>
            <button
              onClick={() => setAggregation("daily")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                aggregation === "daily"
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Daily Aggregates
            </button>
          </div>

          {/* CSV Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 gap-1.5 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Table Content */}
      {aggregation === "hourly" ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <Table>
            <TableHeader className="bg-slate-950/80">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 font-bold text-[11px]">Timestep</TableHead>
                <TableHead className="text-sky-400 font-bold text-[11px]">Indoor ({tUnit})</TableHead>
                <TableHead className="text-slate-400 font-bold text-[11px]">Outdoor ({tUnit})</TableHead>
                <TableHead className="text-emerald-400 font-bold text-[11px]">ΔT Lift</TableHead>
                <TableHead className="text-amber-400 font-bold text-[11px]">GHI ({fUnit})</TableHead>
                <TableHead className="text-yellow-400 font-bold text-[11px]">Solar Gain ({pUnit})</TableHead>
                <TableHead className="text-red-400 font-bold text-[11px]">Walls ({pUnit})</TableHead>
                <TableHead className="text-purple-400 font-bold text-[11px]">Roof ({pUnit})</TableHead>
                <TableHead className="text-sky-300 font-bold text-[11px]">Windows ({pUnit})</TableHead>
                <TableHead className="text-cyan-400 font-bold text-[11px]">Infiltration ({pUnit})</TableHead>
                <TableHead className="text-slate-300 font-bold text-[11px]">Net Heat Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedHourlyRows.map((row) => (
                <TableRow key={row.id} className="border-slate-800/60 hover:bg-slate-800/40 text-xs font-mono">
                  <TableCell className="font-semibold text-slate-300">{row.label}</TableCell>
                  <TableCell className="font-bold text-sky-400">{formatNumber(row.indoor, 1)}</TableCell>
                  <TableCell className="text-slate-400">{formatNumber(row.outdoor, 1)}</TableCell>
                  <TableCell className="text-emerald-400 font-semibold">+{formatNumber(row.delta, 1)}</TableCell>
                  <TableCell className="text-amber-400">{formatNumber(row.radiation, 0)}</TableCell>
                  <TableCell className="text-yellow-400 font-semibold">+{formatNumber(row.solarGain, 0)}</TableCell>
                  <TableCell className="text-red-400">{formatNumber(row.wallLoss, 0)}</TableCell>
                  <TableCell className="text-purple-400">{formatNumber(row.roofLoss, 0)}</TableCell>
                  <TableCell className="text-sky-300">{formatNumber(row.winLoss, 0)}</TableCell>
                  <TableCell className="text-cyan-400">{formatNumber(row.infLoss, 0)}</TableCell>
                  <TableCell className={`font-bold ${row.netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {row.netBalance > 0 ? `+${formatNumber(row.netBalance, 0)}` : formatNumber(row.netBalance, 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Daily Aggregated Table */
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <Table>
            <TableHeader className="bg-slate-950/80">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 font-bold text-[11px]">Period</TableHead>
                <TableHead className="text-sky-400 font-bold text-[11px]">Indoor Min ({tUnit})</TableHead>
                <TableHead className="text-amber-400 font-bold text-[11px]">Indoor Max ({tUnit})</TableHead>
                <TableHead className="text-white font-bold text-[11px]">Indoor Mean ({tUnit})</TableHead>
                <TableHead className="text-slate-400 font-bold text-[11px]">Outdoor Min ({tUnit})</TableHead>
                <TableHead className="text-slate-400 font-bold text-[11px]">Outdoor Max ({tUnit})</TableHead>
                <TableHead className="text-yellow-400 font-bold text-[11px]">Daily Solar Gain (kWh)</TableHead>
                <TableHead className="text-red-400 font-bold text-[11px]">Daily Wall Loss (kWh)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyRows.map((row) => (
                <TableRow key={row.id} className="border-slate-800/60 hover:bg-slate-800/40 text-xs font-mono">
                  <TableCell className="font-semibold text-slate-200">{row.label}</TableCell>
                  <TableCell className="font-bold text-blue-400">{formatNumber(row.indoorMin, 1)}</TableCell>
                  <TableCell className="font-bold text-amber-400">{formatNumber(row.indoorMax, 1)}</TableCell>
                  <TableCell className="text-white">{formatNumber(row.indoorMean, 1)}</TableCell>
                  <TableCell className="text-slate-400">{formatNumber(row.outdoorMin, 1)}</TableCell>
                  <TableCell className="text-slate-400">{formatNumber(row.outdoorMax, 1)}</TableCell>
                  <TableCell className="text-yellow-400 font-semibold">{formatNumber(row.dailySolarKwh, 1)}</TableCell>
                  <TableCell className="text-red-400">{formatNumber(row.dailyWallKwh, 1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls for Hourly */}
      {aggregation === "hourly" && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
          <span>
            Showing {(page - 1) * rowsPerPage + 1}–
            {Math.min(page * rowsPerPage, hourlyRows.length)} of {hourlyRows.length} hours
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 text-xs"
            >
              Previous
            </Button>
            <span className="px-2 font-mono text-slate-300">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2.5 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
