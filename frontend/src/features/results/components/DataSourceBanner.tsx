"use client";

import React from "react";
import { Radio, Info, Check, Eye } from "lucide-react";
import { DataTraceVisibility } from "@/types/simulation";
import { Status } from "@/components/v0/platform-components";

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
  engineName = "ThermoShelter Solver",
  engineVersion = "24.1.0",
  fieldSiteName = "High-Altitude Outpost Profile (3,500m)",
  benchmarkStandard = "ASHRAE 55 / IS 15865 Baseline",
}: DataSourceBannerProps) {
  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-foreground shrink-0">
            <Radio className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label">Multi-Source Telemetry System</span>
              <Status strong>Physics + Calibrated Margin</Status>
            </div>
            <p className="text-xs text-[#536772] mt-0.5">
              Strictly distinguishing numerical simulation predictions, empirical calibration bounds, and design reference standards.
            </p>
          </div>
        </div>

        {/* Trace Visibility Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Simulated Data */}
          <button
            type="button"
            onClick={() => onToggle("simulated")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              visibility.simulated
                ? "bg-black text-white shadow-sm"
                : "border border-border bg-card text-[#6E818F] hover:text-black"
            }`}
          >
            <span className={`size-2 rounded-full ${visibility.simulated ? "bg-white" : "bg-[#6E818F]"}`} />
            <span>Simulated</span>
            <span className="text-[10px] opacity-70 font-mono">({(!engineName || engineName.toLowerCase().includes("energyplus")) ? "ThermoShelter Core" : engineName} v{engineVersion || "3.0.0"})</span>
          </button>

          {/* 2. Calibrated Margin Data */}
          <button
            type="button"
            onClick={() => onToggle("measured")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              visibility.measured
                ? "bg-black text-white shadow-sm"
                : "border border-border bg-card text-[#6E818F] hover:text-black"
            }`}
          >
            <span className={`size-2 rounded-full ${visibility.measured ? "bg-[#CBDCE6]" : "bg-[#6E818F]"}`} />
            <span>Calibrated</span>
            <span className="text-[10px] opacity-70 font-mono">(±0.5°C Margin)</span>
          </button>

          {/* 3. Reference Data */}
          <button
            type="button"
            onClick={() => onToggle("reference")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              visibility.reference
                ? "bg-black text-white shadow-sm"
                : "border border-border bg-card text-[#6E818F] hover:text-black"
            }`}
          >
            <span className={`size-2 rounded-full ${visibility.reference ? "bg-white" : "bg-[#6E818F]"}`} />
            <span>Reference</span>
            <span className="text-[10px] opacity-70 font-mono">(ASHRAE)</span>
          </button>
        </div>
      </div>

      {/* Trace Legend Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
        <div className="flex items-start gap-2.5 text-[#536772]">
          <div className="w-3.5 h-1 bg-black mt-2 shrink-0 rounded-full" />
          <div>
            <span className="font-semibold text-foreground">Continuous Physics Simulation: </span>
            <span>ThermoShelter transient sub-hourly numerical heat balance.</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5 text-[#536772]">
          <div className="w-3.5 h-1 bg-[#6E818F] mt-2 shrink-0 rounded-full" />
          <div>
            <span className="font-semibold text-foreground">Calibration Margin: </span>
            <span>Uncertainty envelope based on standard physical sensor tolerance for {fieldSiteName}.</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5 text-[#536772]">
          <div className="w-3.5 h-1 bg-[#CBDCE6] mt-2 shrink-0 rounded-full border border-black/10" />
          <div>
            <span className="font-semibold text-foreground">Standard Baseline: </span>
            <span>Thresholds defined by {benchmarkStandard}.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
