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
  getValue: (job: SimulationJobItem) => number | null;
  formatDecimals?: number;
}

export function SideBySideTable({ jobs }: SideBySideTableProps) {
  if (!jobs || jobs.length === 0) return null;

  const baseline = jobs[0];
  const candidates = jobs.slice(1);

  const weatherNames = jobs.map((j) => j.weatherDatasetName || "Leh WMO 427053 EPW");
  const sameWeather = new Set(weatherNames).size <= 1;

  const engines = jobs.map((j) => j.engine || "EnergyPlus");
  const sameEngine = new Set(engines).size <= 1;

  const METRIC_ROWS: MetricRowConfig[] = [
    // 1. Thermal Performance
    {
      id: "indoorMin",
      category: "Thermal Performance",
      label: "Minimum Nocturnal Temp (Pre-Dawn)",
      unit: "°C",
      higherIsBetter: true,
      getValue: (j) => j.results?.summary?.indoorMinC ?? null,
      formatDecimals: 1,
    },
    {
      id: "indoorMax",
      category: "Thermal Performance",
      label: "Peak Daytime Indoor Temp",
      unit: "°C",
      higherIsBetter: true,
      getValue: (j) => j.results?.summary?.indoorMaxC ?? null,
      formatDecimals: 1,
    },
    {
      id: "indoorMean",
      category: "Thermal Performance",
      label: "Average Indoor Temperature",
      unit: "°C",
      higherIsBetter: true,
      getValue: (j) => j.results?.summary?.indoorMeanC ?? null,
      formatDecimals: 1,
    },
    {
      id: "comfortHours",
      category: "Thermal Performance",
      label: "Comfort Hours (18°C–24°C)",
      unit: "%",
      higherIsBetter: true,
      getValue: (j) => j.results?.summary?.comfortHoursPct ?? null,
      formatDecimals: 1,
    },
    {
      id: "dampingRatio",
      category: "Thermal Performance",
      label: "Diurnal Swing Damping Ratio",
      unit: "%",
      higherIsBetter: true,
      getValue: (j) => j.results?.summary?.diurnalSwingDampingPct ?? null,
      formatDecimals: 0,
    },

    // 2. Solar & Envelope Losses
    {
      id: "solarGains",
      category: "Solar & Envelope Losses",
      label: "Total Passive Solar Aperture Gains",
      unit: "kWh",
      higherIsBetter: true,
      getValue: (j) => (j.results?.summary as any)?.totalSolarGainKwh ?? null,
      formatDecimals: 1,
    },
    {
      id: "peakEnvelopeLoss",
      category: "Solar & Envelope Losses",
      label: "Peak Conduction Loss Rate",
      unit: "W",
      higherIsBetter: false,
      getValue: (j) => (j.results?.summary as any)?.peakEnvelopeLossW ?? null,
      formatDecimals: 0,
    },
    {
      id: "underheatingHours",
      category: "Solar & Envelope Losses",
      label: "Underheating Degree-Hours (<18°C)",
      unit: "°C·h",
      higherIsBetter: false,
      getValue: (j) => (j.results?.summary as any)?.underheatingDegreeHoursCh ?? null,
      formatDecimals: 1,
    },

    // 3. Energy & Heating
    {
      id: "heatingDemand",
      category: "Energy & Heating",
      label: "Annual Space Heating Demand",
      unit: "kWh/m²·a",
      higherIsBetter: false,
      getValue: (j) => j.results?.summary?.heatingDemandKwhM2 ?? null,
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
        return g ? (g.length || 6) * (g.width || 4) : null;
      },
      formatDecimals: 1,
    },
    {
      id: "infiltration",
      category: "Architectural Parameters",
      label: "Envelope Air Infiltration Rate",
      unit: "ACH",
      higherIsBetter: false,
      getValue: (j) => j.shelterModel?.ventilation?.infiltrationACH ?? null,
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
    <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="micro-label text-muted-foreground">Parametric Synthesis</span>
          </div>
          <h3 className="font-medium tracking-tight text-xl mt-1 text-foreground">
            Side-by-Side Parametric Metric Comparison & Delta Percentages
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparing candidate designs against the active baseline with explicit difference percentages.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-500 font-semibold">
            <ArrowUp className="h-3 w-3" /> Favorable
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="flex items-center gap-1 text-rose-500 font-semibold">
            <ArrowDown className="h-3 w-3" /> Deficit
          </span>
        </div>
      </div>

      {!sameWeather && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400">
          <strong>Weather Divergence Warning:</strong> Comparisons across different weather datasets ({Array.from(new Set(weatherNames)).join(", ")}). Direct thermal comparison is influenced by differing ambient solar and temperature profiles.
        </div>
      )}
      {!sameEngine && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400">
          <strong>Engine Equivalence Warning:</strong> Disparate simulation engines detected ({Array.from(new Set(engines)).join(", ")}). RC network approximations are NOT equivalent to full EnergyPlus physical simulations.
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader className="bg-secondary/40">
            <TableRow className="border-border">
              <TableHead className="w-1/3 text-muted-foreground font-semibold text-xs">
                Performance Metric
              </TableHead>
              {/* Baseline Column */}
              <TableHead className="text-left bg-secondary/70 border-l border-border">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    [Baseline Reference]
                  </span>
                  <div className="text-xs font-bold text-foreground truncate max-w-[200px]">
                    {baseline.projectName}
                  </div>
                  <div className="flex flex-wrap gap-1 text-[9px] text-muted-foreground font-mono mt-0.5">
                    <span className="px-1.5 py-0.5 bg-background/80 rounded border border-border">ID: {baseline.id.slice(0, 8)}</span>
                    <span className="px-1.5 py-0.5 bg-background/80 rounded border border-border">{baseline.engine || "EnergyPlus"}</span>
                    <span className="px-1.5 py-0.5 bg-background/80 rounded border border-border">{baseline.weatherDatasetName || "Leh EPW"}</span>
                  </div>
                </div>
              </TableHead>

              {/* Candidate Columns */}
              {candidates.map((cand) => (
                <TableHead key={cand.id} className="text-left border-l border-border">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-sky-500 font-bold">
                      [Design Candidate]
                    </span>
                    <div className="text-xs font-bold text-foreground truncate max-w-[200px]">
                      {cand.projectName}
                    </div>
                    <div className="flex flex-wrap gap-1 text-[9px] text-muted-foreground font-mono mt-0.5">
                      <span className="px-1.5 py-0.5 bg-background/80 rounded border border-border">ID: {cand.id.slice(0, 8)}</span>
                      <span className="px-1.5 py-0.5 bg-background/80 rounded border border-border">{cand.engine || "EnergyPlus"}</span>
                      <span className="px-1.5 py-0.5 bg-background/80 rounded border border-border">{cand.weatherDatasetName || "Leh EPW"}</span>
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {categories.map((cat) => (
              <React.Fragment key={cat}>
                {/* Category Header Row */}
                <TableRow className="bg-secondary/20 border-t border-border">
                  <TableCell
                    colSpan={jobs.length + 1}
                    className="py-2.5 text-[11px] font-bold uppercase tracking-wider text-sky-500 font-sans"
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
                      className="border-border hover:bg-muted/40 text-xs font-mono"
                    >
                      <TableCell className="font-sans font-medium text-foreground">
                        {metric.label}
                      </TableCell>

                      {/* Baseline Value */}
                      <TableCell className="bg-secondary/40 border-l border-border font-bold text-foreground">
                        {baseVal !== null ? (
                          `${baseVal.toFixed(metric.formatDecimals ?? 1)} ${metric.unit}`
                        ) : (
                          <span className="text-muted-foreground italic text-[10px]">
                            Unavailable
                          </span>
                        )}
                      </TableCell>

                      {/* Candidate Values with Delta % */}
                      {candidates.map((cand) => {
                        const candVal = metric.getValue(cand);
                        if (candVal === null) {
                          return (
                            <TableCell key={cand.id} className="border-l border-border">
                              <span className="text-muted-foreground italic text-[10px]">
                                Unavailable
                              </span>
                            </TableCell>
                          );
                        }

                        if (baseVal === null) {
                          return (
                            <TableCell key={cand.id} className="border-l border-border">
                              <span className="font-bold text-foreground">
                                {candVal.toFixed(metric.formatDecimals ?? 1)} ${metric.unit}
                              </span>
                            </TableCell>
                          );
                        }

                        const diff = calculateDifference(
                          baseVal,
                          candVal,
                          metric.higherIsBetter,
                          metric.unit
                        );

                        return (
                          <TableCell key={cand.id} className="border-l border-border">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-bold text-foreground">
                                {candVal.toFixed(metric.formatDecimals ?? 1)} {metric.unit}
                              </span>

                              {/* Difference Badge */}
                              <div
                                className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  diff.isImprovement
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
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
    </div>
  );
}
