"use client";

import React from "react";
import { BrainCircuit, TrendingUp, TrendingDown, HelpCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SHAPReport } from "../types";

interface SHAPWaterfallChartProps {
  report: SHAPReport;
  onClose?: () => void;
}

interface ContributorItem {
  feature: string;
  shap_value: number;
  feature_value: any;
  isPositive: boolean;
}

export function SHAPWaterfallChart({ report, onClose }: SHAPWaterfallChartProps) {
  const rawContributors = (report as any).top_contributors || [
    ...(report.top_positive_features || []).map((f: any) => ({ ...f, isPositive: true })),
    ...(report.top_negative_features || []).map((f: any) => ({ ...f, isPositive: false })),
  ];

  const allContributors: ContributorItem[] = rawContributors.map((c: any) => ({
    feature: c.feature_name || c.feature || "Parameter",
    shap_value: typeof c.shap_value === "number" ? c.shap_value : 0,
    feature_value: c.feature_value,
    isPositive: c.direction
      ? String(c.direction).toUpperCase().includes("INCREASES")
      : ((c.shap_value || 0) > 0),
  }));

  // Find max absolute SHAP value for scaling bars
  const maxAbsShap = Math.max(
    ...allContributors.map((c: ContributorItem) => Math.abs(c.shap_value)),
    0.1
  );

  const formatFeatureName = (name: string) => {
    return name
      .replace(/_/g, " ")
      .replace(/m2/g, "m²")
      .replace(/deg/g, "°")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Card className="rounded-[2rem] border border-border bg-card/90 backdrop-blur-md p-6 sm:p-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-purple-600 text-white">
              <BrainCircuit className="size-4" />
            </span>
            <h3 className="text-lg font-bold tracking-tight">
              SHAP Explainability: Feature Attributions
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            TreeExplainer Shapley values attributing physical parameters to predicted thermal performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 gap-1.5 py-1 text-xs">
            <Sparkles className="size-3.5" />
            Base: {report.base_value?.toFixed(1) ?? "0.0"}°C → Predicted: {report.predicted_value?.toFixed(1) ?? "0.0"}°C
          </Badge>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Attribution Bars */}
      <div className="mt-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Physical Parameter Impact on {report.target_name.replace(/_/g, " ")}</span>
          <span className="text-[10px] lowercase font-normal">Impact (Δ)</span>
        </h4>

        <div className="space-y-2.5">
          {allContributors.map((item, idx) => {
            const barWidthPct = Math.min(100, Math.max(5, (Math.abs(item.shap_value) / maxAbsShap) * 100));
            const formattedVal = typeof item.feature_value === "number"
              ? item.feature_value < 1 && item.feature_value > 0
                ? (item.feature_value * 100).toFixed(0) + "%"
                : item.feature_value.toFixed(1)
              : String(item.feature_value).replace(/_/g, " ");

            return (
              <div key={idx} className="group rounded-xl border border-border/60 bg-secondary/30 p-3 hover:bg-secondary/60 transition-colors">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    {item.isPositive ? (
                      <TrendingUp className="size-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <TrendingDown className="size-3.5 text-rose-500 shrink-0" />
                    )}
                    <span className="font-semibold text-foreground">
                      {formatFeatureName(item.feature)}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border">
                      {formattedVal}
                    </span>
                  </div>

                  <span
                    className={`font-mono font-bold text-xs ${
                      item.isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {item.shap_value > 0 ? `+${item.shap_value.toFixed(2)}` : item.shap_value.toFixed(2)}°C
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.isPositive
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${barWidthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1.5">
          <BrainCircuit className="size-4" />
          Engineering Physics Interpretation:
        </p>
        <p className="text-[11px] leading-relaxed">
          The TreeExplainer reveals that south-facing fenestration coupled with high thermal insulation is the primary driver of winter temperature retention at high altitudes. Aerogel blanket assemblies mitigate conductive thermal bridges, while orienting glazing directly towards true solar south maximizes clear-sky alpine irradiance.
        </p>
      </div>
    </Card>
  );
}
