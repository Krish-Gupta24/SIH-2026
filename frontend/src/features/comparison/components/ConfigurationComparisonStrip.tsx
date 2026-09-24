"use client";

import React from "react";
import {
  ShieldCheck,
  Plus,
  X,
  Sliders,
  Sparkles,
  Thermometer,
  Layers,
  Wind,
  CheckCircle2,
  Box,
} from "lucide-react";
import { SimulationJobItem } from "@/lib/store/use-shelter-store";
import { ShelterModel } from "@/types/shelter";

interface ConfigurationComparisonStripProps {
  comparedJobs: SimulationJobItem[];
  allCompletedJobs: SimulationJobItem[];
  onToggleJob: (jobId: string) => void;
  onSetBaseline?: (jobId: string) => void;
}

export const TRACE_COLORS = [
  { name: "Sky Blue", hex: "#0284c7", bg: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500/40", border: "border-sky-500/30" },
  { name: "Emerald", hex: "#10b981", bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/40", border: "border-emerald-500/30" },
  { name: "Amber", hex: "#f59e0b", bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/40", border: "border-amber-500/30" },
  { name: "Purple", hex: "#8b5cf6", bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500/40", border: "border-purple-500/30" },
];

export function ConfigurationComparisonStrip({
  comparedJobs,
  allCompletedJobs,
  onToggleJob,
}: ConfigurationComparisonStripProps) {
  const availableToAdd = allCompletedJobs.filter(
    (j) => !comparedJobs.some((cj) => cj.id === j.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="micro-label">Tested Configurations</span>
          <h2 className="text-sm font-bold text-foreground">
            Configuration Comparison Strip ({comparedJobs.length} active · max 4)
          </h2>
        </div>
        <span className="text-[11px] text-muted-foreground">
          First card is the Baseline Reference
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {comparedJobs.map((job, index) => {
          const isBaseline = index === 0;
          const color = TRACE_COLORS[index % TRACE_COLORS.length];
          const model: ShelterModel | undefined = job.shelterModel;
          const walls = model?.envelope?.walls;
          const roof = model?.envelope?.roof;
          const windows = model?.windows;
          const ventilation = model?.ventilation;

          // Wall summary
          const northWall = walls?.north;
          const southWall = walls?.south;
          const wallLayersCount = (northWall?.layers?.length || 0) + (southWall?.layers?.length || 0);
          const wallDesc =
            northWall?.name?.includes("Rammed")
              ? "300mm Rammed Earth + 150mm EPS"
              : northWall?.name?.includes("VIP") || northWall?.name?.includes("Granite")
              ? "250mm Granite + VIP/PIR Vacuum"
              : northWall?.name?.includes("Timber")
              ? "Cedar Timber + Aerogel/Rockwool"
              : "Uninsulated Bare CGI Metal Sheet";

          // Roof summary
          const roofDesc =
            roof?.name?.includes("EPS") || roof?.name?.includes("Sandwich")
              ? "200mm EPS Composite Standing Seam"
              : roof?.name?.includes("PIR")
              ? "150mm Rigid PIR Clerestory"
              : roof?.name?.includes("Mineral")
              ? "160mm Rockwool + Timber"
              : "Uninsulated Corrugated Steel";

          // Glazing summary
          const firstWin = Array.isArray(windows) && windows.length > 0 ? windows[0] : null;
          const glazingType =
            (firstWin as any)?.glazingType ||
            (model?.id?.includes("tin") ? "Single Clear 4mm (U=5.8)" : "Double Low-E Argon (U=1.4)");

          // Infiltration
          const ach = ventilation?.infiltrationACH ?? (model?.id?.includes("tin") ? 1.8 : 0.25);
          const hrv = ventilation?.heatRecoveryEfficiency
            ? `${Math.round(ventilation.heatRecoveryEfficiency * 100)}% HRV`
            : "No HRV";

          const summary = job.results?.summary;

          return (
            <div
              key={job.id}
              className={`relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs transition-all ${
                isBaseline ? "border-foreground/30 ring-1 ring-border" : "border-border"
              }`}
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 left-5 right-5 h-1 rounded-b-full"
                style={{ backgroundColor: color.hex }}
              />

              <div>
                {/* Header: Badge & Remove */}
                <div className="flex items-start justify-between gap-2 pt-1 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isBaseline
                          ? "bg-foreground text-background"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {isBaseline ? "Baseline Ref" : `Alternative ${index}`}
                    </span>
                  </div>

                  {comparedJobs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onToggleJob(job.id)}
                      className="size-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Remove from comparison"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Configuration Name */}
                <h3 className="text-sm font-bold text-foreground leading-snug">
                  {job.projectName}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                  {job.id}
                </p>

                {/* Envelope Specifications Summary */}
                <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-[11px]">
                  <div className="flex items-start gap-2">
                    <Layers className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="leading-tight truncate">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                        Wall Core
                      </span>
                      <span className="font-semibold text-foreground truncate block">
                        {wallDesc}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Box className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="leading-tight truncate">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                        Roof Envelope
                      </span>
                      <span className="font-semibold text-foreground truncate block">
                        {roofDesc}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Wind className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="leading-tight truncate">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                        Ventilation & Glazing
                      </span>
                      <span className="font-semibold text-foreground truncate block">
                        {ach} ACH ({hrv}) · {glazingType.split(" ")[0]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Thermal Summary Strip */}
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Comfort:</span>
                  <strong className="text-foreground font-mono">
                    {summary?.comfortHoursPct !== undefined ? `${summary.comfortHoursPct}%` : "—"}
                  </strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Demand:</span>
                  <strong className="text-foreground font-mono">
                    {summary?.heatingDemandKwhM2 !== undefined ? `${summary.heatingDemandKwhM2}` : "—"}
                  </strong>
                  <span className="text-[9px] text-muted-foreground">kWh/m²</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Candidate Slot if < 4 */}
        {comparedJobs.length < 4 && availableToAdd.length > 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/10 p-5 flex flex-col justify-between items-center text-center">
            <div className="my-auto space-y-2">
              <div className="size-10 rounded-full border border-border bg-card flex items-center justify-center mx-auto text-muted-foreground">
                <Plus className="size-4" />
              </div>
              <h4 className="text-xs font-bold text-foreground">Add Comparison Case</h4>
              <p className="text-[10px] text-muted-foreground max-w-[180px]">
                Select another stored simulation to compare side-by-side.
              </p>
            </div>

            <div className="w-full mt-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onToggleJob(e.target.value);
                  }
                }}
                defaultValue=""
                className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="" disabled>
                  + Select case ({availableToAdd.length} available)
                </option>
                {availableToAdd.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.projectName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
