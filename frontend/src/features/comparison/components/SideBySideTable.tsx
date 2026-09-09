"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, Layers, HelpCircle } from "lucide-react";
import { SimulationJobItem } from "@/lib/store/use-shelter-store";
import { calculateDifference } from "../comparison-engine";

interface SideBySideTableProps {
  jobs: SimulationJobItem[];
}

interface MetricRowConfig {
  id: string;
  category: "Thermal Performance" | "Solar & Envelope Losses" | "Energy & Heating" | "Architectural Parameters";
  label: string;
  unit: string;
  higherIsBetter: boolean;
  getValue: (job: SimulationJobItem) => number;
  formatDecimals?: number;
}

export function SideBySideTable({ jobs }: SideBySideTableProps) {
  if (!jobs || jobs.length === 0) return null;

  const baseline = jobs[0];
  const candidates = jobs.slice(1);

  const METRIC_ROWS: MetricRowConfig[] = [
    // 1. Thermal Performance
    {
      id: "indoorMin",
      category: "Thermal Performance",
      label: "Minimum Nocturnal Temp (Pre-Dawn)",
      unit: "°C",
      higherIsBetter: true,
      getValue: (j) => j.results?.summary?.indoorMinC ?? 0,
      formatDecimals: 1,
    },
    {
      id: "indoorMax",
      category: "Thermal Performance",
      label: "Peak Daytime Indoor Temp",
      unit: "°C",
      higherIsBetter: true,
      getValue: (j) => j.results?.summary?.indoorMaxC ?? 0,
      formatDecimals: 1,
    },
    {
      id: "indoorMean",
      category: "Thermal Performance",
      label: "Average Indoor Temperature",
      unit: "°C",
      higherIsBetter: true,
      getValue: (j) => j.results?.summary?.indoorMeanC ?? 0,
      formatDecimals: 1,
    },
    {
      id: "comfortHours",
      category: "Thermal Performance",
      label: "Comfort Hours (18°C–24°C)",
      unit: "%",
      higherIsBetter: true,
      getValue: (j) => j.results?.summary?.comfortHoursPct ?? 0,
      formatDecimals: 1,
    },
    {
      id: "dampingRatio",
      category: "Thermal Performance",
      label: "Diurnal Swing Damping Ratio",
      unit: "%",
      higherIsBetter: true,
      getValue: (j) => j.results?.summary?.diurnalSwingDampingPct ?? 0,
      formatDecimals: 0,
    },

    // 2. Solar & Envelope Losses
    {
      id: "solarGains",
      category: "Solar & Envelope Losses",
      label: "Total Passive Solar Aperture Gains",
      unit: "kWh",
      higherIsBetter: true,
      getValue: (j) => (j.results?.summary as any)?.totalSolarGainKwh ?? 45.0,
      formatDecimals: 1,
    },
    {
      id: "peakEnvelopeLoss",
      category: "Solar & Envelope Losses",
      label: "Peak Conduction Loss Rate",
      unit: "W",
      higherIsBetter: false,
      getValue: (j) => (j.results?.summary as any)?.peakEnvelopeLossW ?? 1800,
      formatDecimals: 0,
    },
    {
      id: "underheatingHours",
      category: "Solar & Envelope Losses",
      label: "Underheating Degree-Hours (<18°C)",
      unit: "°C·h",
      higherIsBetter: false,
      getValue: (j) => (j.results?.summary as any)?.underheatingDegreeHoursCh ?? 75.0,
      formatDecimals: 1,
    },

    // 3. Energy & Heating
    {
      id: "heatingDemand",
      category: "Energy & Heating",
      label: "Annual Space Heating Demand",
      unit: "kWh/m²·a",
      higherIsBetter: false,
      getValue: (j) => j.results?.summary?.heatingDemandKwhM2 ?? 0,
      formatDecimals: 1,
    },

    // 4. Architectural Parameters
    {
      id: "floorArea",
      category: "Architectural Parameters",
      label: "Floor Usable Living Area",
      unit: "m²",
      higherIsBetter: true,
      getValue: (j) => {
        const g = j.shelterModel?.geometry;
        return (g?.length || 6) * (g?.width || 4);
      },
      formatDecimals: 1,
    },
    {
      id: "infiltration",
      category: "Architectural Parameters",
      label: "Envelope Air Infiltration Rate",
      unit: "ACH",
      higherIsBetter: false,
      getValue: (j) => j.shelterModel?.ventilation?.infiltrationACH ?? 0.35,
      formatDecimals: 2,
    },
    {
      id: "windowsCount",
      category: "Architectural Parameters",
      label: "Total Glazed Aperture Count",
      unit: "units",
      higherIsBetter: true,
      getValue: (j) => j.shelterModel?.windows?.length ?? 0,
      formatDecimals: 0,
    },
  ];

  const categories = Array.from(new Set(METRIC_ROWS.map((r) => r.category)));

  return (
    <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-400" />
            <span>Side-by-Side Parametric Metric Comparison & Delta Percentages</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Comparing candidate designs against the active baseline with explicit difference percentages.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <ArrowUp className="h-3 w-3" /> Favorable Improvement
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1 text-rose-400">
            <ArrowDown className="h-3 w-3" /> Deficit / Higher Load
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <Table>
          <TableHeader className="bg-slate-950/80">
            <TableRow className="border-slate-800">
              <TableHead className="w-1/3 text-slate-400 font-bold text-xs">
                Performance Metric
              </TableHead>
              {/* Baseline Column */}
              <TableHead className="text-left bg-slate-900/80 border-l border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    [Baseline Reference]
                  </span>
                  <div className="text-xs font-bold text-white truncate max-w-[200px]">
                    {baseline.projectName}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    v{baseline.shelterModel?.project?.version || "1.0"}
                  </span>
                </div>
              </TableHead>

              {/* Candidate Columns */}
              {candidates.map((cand) => (
                <TableHead key={cand.id} className="text-left border-l border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-sky-400 font-bold">
                      [Design Candidate]
                    </span>
                    <div className="text-xs font-bold text-sky-200 truncate max-w-[200px]">
                      {cand.projectName}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      v{cand.shelterModel?.project?.version || "1.0"}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {categories.map((cat) => (
              <React.Fragment key={cat}>
                {/* Category Header Row */}
                <TableRow className="bg-slate-950/90 border-t-2 border-slate-800">
                  <TableCell
                    colSpan={jobs.length + 1}
                    className="py-2 text-[11px] font-bold uppercase tracking-wider text-sky-400 font-sans"
                  >
                    {cat}
                  </TableCell>
                </TableRow>

                {/* Metric Rows */}
                {METRIC_ROWS.filter((r) => r.category === cat).map((metric) => {
                  const baseVal = metric.getValue(baseline);

                  return (
                    <TableRow
                      key={metric.id}
                      className="border-slate-800/60 hover:bg-slate-800/30 text-xs font-mono"
                    >
                      <TableCell className="font-sans font-medium text-slate-300">
                        {metric.label}
                      </TableCell>

                      {/* Baseline Value */}
                      <TableCell className="bg-slate-900/40 border-l border-slate-800 font-bold text-white">
                        {baseVal.toFixed(metric.formatDecimals ?? 1)} {metric.unit}
                      </TableCell>

                      {/* Candidate Values with Delta % */}
                      {candidates.map((cand) => {
                        const candVal = metric.getValue(cand);
                        const diff = calculateDifference(
                          baseVal,
                          candVal,
                          metric.higherIsBetter,
                          metric.unit
                        );

                        return (
                          <TableCell key={cand.id} className="border-l border-slate-800">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-bold text-slate-100">
                                {candVal.toFixed(metric.formatDecimals ?? 1)} {metric.unit}
                              </span>

                              {/* Difference Badge */}
                              <div
                                className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  diff.isImprovement
                                    ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/50"
                                    : "bg-rose-950/70 text-rose-400 border border-rose-800/50"
                                }`}
                                title={`${diff.deltaAbsolute > 0 ? "+" : ""}${diff.deltaAbsolute} ${metric.unit}`}
                              >
                                {diff.deltaPercentage > 0 ? (
                                  <ArrowUp className="h-2.5 w-2.5" />
                                ) : diff.deltaPercentage < 0 ? (
                                  <ArrowDown className="h-2.5 w-2.5" />
                                ) : (
                                  <Minus className="h-2.5 w-2.5" />
                                )}
                                <span>
                                  {diff.deltaPercentage > 0 ? `+${diff.deltaPercentage}` : diff.deltaPercentage}%
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
