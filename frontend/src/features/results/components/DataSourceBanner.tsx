"use client";

import React from "react";
import { Activity, Radio, BookmarkCheck, Info, Check, Eye } from "lucide-react";
import { DataTraceVisibility } from "@/types/simulation";
import { Badge } from "@/components/ui/badge";

interface DataSourceBannerProps {
  visibility: DataTraceVisibility;
  onToggle: (key: keyof DataTraceVisibility) => void;
  engineName?: string;
  engineVersion?: string;
  fieldSiteName?: string;
  benchmarkStandard?: string;
}

export function DataSourceBanner({
  visibility,
  onToggle,
  engineName = "EnergyPlus",
  engineVersion = "24.1.0",
  fieldSiteName = "Ladakh High-Altitude Field Sensor Array (3,500m)",
  benchmarkStandard = "ASHRAE 55 / IS 15865 Baseline",
}: DataSourceBannerProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white uppercase tracking-wider">
                Multi-Source Verification System
              </span>
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-mono text-sky-400 border border-sky-500/20">
                Physics + Telemetry
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Strictly distinguishing numerical simulation predictions, calibrated in-situ field measurements, and design reference thresholds.
            </p>
          </div>
        </div>

        {/* Trace Visibility Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Simulated Data */}
          <button
            type="button"
            onClick={() => onToggle("simulated")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              visibility.simulated
                ? "bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-sm"
                : "bg-slate-950 border-slate-800 text-slate-500 opacity-60"
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
            <span>Simulated</span>
            <span className="text-[10px] text-sky-400/70 font-mono">({engineName} v{engineVersion})</span>
          </button>

          {/* 2. Measured Data */}
          <button
            type="button"
            onClick={() => onToggle("measured")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              visibility.measured
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm"
                : "bg-slate-950 border-slate-800 text-slate-500 opacity-60"
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span>Measured</span>
            <span className="text-[10px] text-emerald-400/70 font-mono">(Field Sensors)</span>
          </button>

          {/* 3. Reference Data */}
          <button
            type="button"
            onClick={() => onToggle("reference")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              visibility.reference
                ? "bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-sm"
                : "bg-slate-950 border-slate-800 text-slate-500 opacity-60"
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
            <span>Reference</span>
            <span className="text-[10px] text-purple-400/70 font-mono">(ASHRAE / Tent)</span>
          </button>
        </div>
      </div>

        {/* Trace Legend Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-[11px]">
        <div className="flex items-start gap-2 text-slate-300">
          <div className="w-4 h-0.5 bg-sky-400 mt-2 shrink-0 rounded" />
          <div>
            <span className="font-semibold text-sky-300">Simulated Data:</span> Direct output of thermal balance differential equations solved by {engineName} for geometry, envelope layers, infiltration, and internal loads.
          </div>
        </div>

        <div className="flex items-start gap-2 text-slate-300">
          <div className="w-4 h-0.5 border-t border-dashed border-emerald-400 mt-2 shrink-0" />
          <div>
            <span className="font-semibold text-emerald-300">Measured Telemetry:</span> Empirical temperature data collected from calibrated 4-wire RTD thermal sensors and pyranometer at {fieldSiteName}.
          </div>
        </div>

        <div className="flex items-start gap-2 text-slate-300">
          <div className="w-4 h-2 bg-purple-500/30 border border-purple-400/60 mt-1 shrink-0 rounded-sm" />
          <div>
            <span className="font-semibold text-purple-300">Reference Benchmark:</span> Uninsulated canvas shelter baseline and standard comfort envelope (18°C–24°C) per {benchmarkStandard}.
          </div>
        </div>
      </div>
    </div>
  );
}
