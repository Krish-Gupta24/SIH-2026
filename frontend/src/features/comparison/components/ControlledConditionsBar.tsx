"use client";

import React from "react";
import {
  MapPin,
  CloudSnow,
  Clock,
  Box,
  Users,
  CheckCircle2,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { SimulationJobItem } from "@/lib/store/use-shelter-store";

interface ControlledConditionsBarProps {
  jobs: SimulationJobItem[];
}

export function ControlledConditionsBar({ jobs }: ControlledConditionsBarProps) {
  if (!jobs || jobs.length === 0) return null;

  const refJob = jobs[0];
  const model = refJob.shelterModel;
  const location = model?.location;
  const geometry = model?.geometry;
  const internalLoads = model?.internalLoads;

  const locationName = location?.region || refJob.weatherDatasetName || "Leh Ladakh, India";
  const elevation = location?.elevation ?? 3500;
  const weatherFile = (refJob.weatherFile || location?.weatherSource || "IND_JK_Leh.427053_TMYx.epw").replace(/\.epw$/i, "");
  
  const length = geometry?.length ?? 6.0;
  const width = geometry?.width ?? 4.0;
  const height = geometry?.height ?? 2.8;
  const floorArea = Math.round(length * width * 10) / 10;
  const volume = Math.round(length * width * height * 10) / 10;

  const occupants = internalLoads?.occupantsCount ?? 4;
  const activityWatts = (internalLoads as any)?.activityLevelWatts ?? (internalLoads as any)?.activityLevelW ?? 120;
  const lightingWpm2 = (internalLoads as any)?.lightingPowerDensityWpm2 ?? (internalLoads as any)?.lightingPowerDensityWPerM2 ?? 3.5;

  return (
    <div className="rounded-2xl border border-border/80 bg-secondary/30 px-5 py-3.5 shadow-2xs backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        {/* Controlled Experiment Status Tag */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
          </span>
          <div className="leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Controlled Boundary Physics
            </span>
            <span className="font-semibold text-foreground">
              Identical External Forcing Across All Cases
            </span>
          </div>
        </div>

        {/* Controlled Parameter Items */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 lg:flex lg:items-center lg:gap-6 text-[11px] text-muted-foreground">
          {/* Location & Elevation */}
          <div className="flex items-center gap-1.5 min-w-0" title={`Elevation: ${elevation}m`}>
            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              <strong className="text-foreground font-semibold">{locationName.split(",")[0]}</strong> · {elevation.toLocaleString()}m
            </span>
          </div>

          {/* Weather Dataset */}
          <div className="flex items-center gap-1.5 min-w-0" title={`Weather dataset: ${weatherFile}`}>
            <CloudSnow className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate font-mono">
              <strong className="text-foreground font-semibold">{weatherFile.slice(0, 16)}</strong>
            </span>
          </div>

          {/* Geometry Footprint */}
          <div className="flex items-center gap-1.5 min-w-0" title={`Envelope footprint: ${length}m × ${width}m × ${height}m (${volume} m³)`}>
            <Box className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              <strong className="text-foreground font-semibold">{floorArea} m²</strong> · {length}m×{width}m
            </span>
          </div>

          {/* Internal Loads */}
          <div className="flex items-center gap-1.5 min-w-0" title={`Internal loads: ${occupants} occupants @ ${activityWatts}W, ${lightingWpm2} W/m² lighting`}>
            <Users className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              <strong className="text-foreground font-semibold">{occupants} Occupants</strong> · {activityWatts}W
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
