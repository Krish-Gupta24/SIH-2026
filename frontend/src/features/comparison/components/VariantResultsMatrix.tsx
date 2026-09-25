"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  TrendingDown,
  ShieldCheck,
  Fuel,
  IndianRupee,
  Layers,
  Thermometer,
  Truck,
  Sparkles,
} from "lucide-react";
import { ShelterVariant, VariantMetrics } from "../variant-calculator";

interface VariantResultsMatrixProps {
  variants: ShelterVariant[];
  metrics: VariantMetrics[];
}

export function VariantResultsMatrix({ variants, metrics }: VariantResultsMatrixProps) {
  if (variants.length === 0 || metrics.length === 0) return null;

  // Compute best values for each metric row
  const minWallU = Math.min(...metrics.map((m) => m.wallUValue));
  const minRoofU = Math.min(...metrics.map((m) => m.roofUValue));
  const minGlazingU = Math.min(...metrics.map((m) => m.glazingUValue));
  const maxComfort = Math.max(...metrics.map((m) => m.estimatedComfortPct));
  const minLoss = Math.min(...metrics.map((m) => m.totalEnvelopeLossW));
  const maxFuelSaved = Math.max(...metrics.map((m) => m.estimatedFuelDisplacementLiters));
  const maxCostSaved = Math.max(...metrics.map((m) => m.estimatedAnnualCostSavingsInr));
  const minWeight = Math.min(...metrics.map((m) => m.totalEnvelopeWeightKg));
  const maxScore = Math.max(...metrics.map((m) => m.compositeEfficiencyScore));

  // Chart data comparing the variants
  const chartData = variants.map((v, i) => {
    const m = metrics[i];
    const letter = String.fromCharCode(65 + i);
    return {
      variant: `Var ${letter}`,
      name: v.name,
      comfortPct: m.estimatedComfortPct,
      wallU: parseFloat((m.wallUValue * 100).toFixed(1)), // scaled for visibility
      fuelSavedHundreds: Math.round(m.estimatedFuelDisplacementLiters / 10),
      score: m.compositeEfficiencyScore,
    };
  });

  return (
    <div className="space-y-6">
      {/* 1. Comparison Matrix Table */}
      <div className="rounded-3xl bg-card border border-border/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>Multi-Variant Physical Performance Matrix</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct physical comparison calculated per ISO 6946 / IS 3792 building science standards.
            </p>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
            ★ Highlighted = Best in Category
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border text-muted-foreground font-semibold">
                <th className="py-3 px-4 min-w-[200px]">Physical Metric</th>
                <th className="py-3 px-3 min-w-[120px]">DRDO Benchmark</th>
                {variants.map((v, idx) => (
                  <th key={v.id} className="py-3 px-4 min-w-[170px]">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <span className="size-5 rounded-md bg-foreground text-background flex items-center justify-center text-[10px]">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="truncate">{v.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {/* Row 1: Wall U-Value */}
              <tr className="hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <span className="size-2 rounded-full bg-sky-500" />
                  Wall U-Value (W/m²·K)
                </td>
                <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">≤ 0.20 W/m²K</td>
                {metrics.map((m, i) => {
                  const isBest = m.wallUValue === minWallU;
                  return (
                    <td key={i} className="py-3 px-4 font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                          isBest
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30"
                            : ""
                        }`}
                      >
                        {m.wallUValue} W/m²K {isBest && "★"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: Roof U-Value */}
              <tr className="hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <span className="size-2 rounded-full bg-indigo-500" />
                  Roof U-Value (W/m²·K)
                </td>
                <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">≤ 0.15 W/m²K</td>
                {metrics.map((m, i) => {
                  const isBest = m.roofUValue === minRoofU;
                  return (
                    <td key={i} className="py-3 px-4 font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                          isBest
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30"
                            : ""
                        }`}
                      >
                        {m.roofUValue} W/m²K {isBest && "★"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: Glazing U-Value */}
              <tr className="hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Solar Glazing U-Value
                </td>
                <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">≤ 1.40 W/m²K</td>
                {metrics.map((m, i) => {
                  const isBest = m.glazingUValue === minGlazingU;
                  return (
                    <td key={i} className="py-3 px-4 font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                          isBest
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30"
                            : ""
                        }`}
                      >
                        {m.glazingUValue} W/m²K {isBest && "★"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Row 4: Annual Thermal Comfort */}
              <tr className="hover:bg-secondary/20 transition-colors bg-secondary/10">
                <td className="py-3 px-4 font-bold flex items-center gap-2">
                  <Thermometer className="size-3.5 text-emerald-500" />
                  Est. Annual Comfort (18–24°C)
                </td>
                <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">≥ 80% Hours</td>
                {metrics.map((m, i) => {
                  const isBest = m.estimatedComfortPct === maxComfort;
                  return (
                    <td key={i} className="py-3 px-4 font-mono text-sm font-bold">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl ${
                          isBest
                            ? "bg-emerald-500 text-black font-black shadow-xs"
                            : "text-foreground bg-secondary"
                        }`}
                      >
                        {m.estimatedComfortPct}% {isBest && "👑"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Row 5: Total Heat Loss at -20°C */}
              <tr className="hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <span className="size-2 rounded-full bg-rose-500" />
                  Peak Envelope Loss at -20°C
                </td>
                <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">≤ 2,500 W</td>
                {metrics.map((m, i) => {
                  const isBest = m.totalEnvelopeLossW === minLoss;
                  return (
                    <td key={i} className="py-3 px-4 font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                          isBest
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30"
                            : ""
                        }`}
                      >
                        {m.totalEnvelopeLossW.toLocaleString()} W {isBest && "★"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Row 6: Annual Kerosene Saved */}
              <tr className="hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <Fuel className="size-3.5 text-amber-500" />
                  Annual Kerosene Displaced
                </td>
                <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">≥ 1,500 L / yr</td>
                {metrics.map((m, i) => {
                  const isBest = m.estimatedFuelDisplacementLiters === maxFuelSaved;
                  return (
                    <td key={i} className="py-3 px-4 font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                          isBest
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30"
                            : ""
                        }`}
                      >
                        +{m.estimatedFuelDisplacementLiters.toLocaleString()} L / yr {isBest && "★"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Row 7: Logistics Cost Saved */}
              <tr className="hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <IndianRupee className="size-3.5 text-amber-500" />
                  Annual Logistics Cost Saved
                </td>
                <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">—</td>
                {metrics.map((m, i) => {
                  const isBest = m.estimatedAnnualCostSavingsInr === maxCostSaved;
                  return (
                    <td key={i} className="py-3 px-4 font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                          isBest
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30"
                            : ""
                        }`}
                      >
                        ₹{(m.estimatedAnnualCostSavingsInr / 100000).toFixed(2)} Lakhs {isBest && "★"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Row 8: Envelope Weight */}
              <tr className="hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-4 font-medium flex items-center gap-2">
                  <Truck className="size-3.5 text-sky-500" />
                  Total Envelope Weight (Airlift)
                </td>
                <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">&lt; 8,000 kg</td>
                {metrics.map((m, i) => {
                  const isBest = m.totalEnvelopeWeightKg === minWeight;
                  return (
                    <td key={i} className="py-3 px-4 font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                          isBest
                            ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/30"
                            : ""
                        }`}
                      >
                        {m.totalEnvelopeWeightKg.toLocaleString()} kg {isBest && "★"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Row 9: Overall Score */}
              <tr className="hover:bg-secondary/20 transition-colors bg-secondary/20">
                <td className="py-3.5 px-4 font-black flex items-center gap-2 text-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  DRDO Efficiency Score
                </td>
                <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">100 Pts Max</td>
                {metrics.map((m, i) => {
                  const isBest = m.compositeEfficiencyScore === maxScore;
                  return (
                    <td key={i} className="py-3.5 px-4 font-mono text-base font-black">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl ${
                          isBest
                            ? "bg-primary text-primary-foreground font-black shadow-xs"
                            : "text-foreground bg-secondary"
                        }`}
                      >
                        {m.compositeEfficiencyScore} / 100 {isBest && "🏆"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Visual Comparison Bar Chart */}
      <div className="rounded-3xl bg-card border border-border/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Thermal Comfort & Efficiency Score Comparison
            </h3>
            <p className="text-xs text-muted-foreground">
              Relative performance across all configured variants.
            </p>
          </div>
        </div>

        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
              <XAxis dataKey="variant" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ opacity: 0.2 }} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ opacity: 0.2 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-2xl border border-border bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-1">
                        <span className="font-bold text-foreground block">{d.name}</span>
                        <div className="flex justify-between gap-4 text-emerald-600 font-mono">
                          <span>Comfort Score:</span>
                          <span className="font-bold">{d.comfortPct}%</span>
                        </div>
                        <div className="flex justify-between gap-4 text-primary font-mono">
                          <span>DRDO Efficiency:</span>
                          <span className="font-bold">{d.score} / 100</span>
                        </div>
                        <div className="flex justify-between gap-4 text-amber-500 font-mono">
                          <span>Fuel Saved:</span>
                          <span className="font-bold">{d.fuelSavedHundreds * 10} L/yr</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
              />
              <Bar dataKey="comfortPct" name="Annual Comfort %" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="score" name="Efficiency Score (100)" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
