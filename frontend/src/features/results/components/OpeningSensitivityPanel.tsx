"use client";

import React, { useState, useMemo } from "react";
import {
  Sun,
  Maximize2,
  Sliders,
  Thermometer,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";

interface OpeningSensitivityPanelProps {
  initialWWR?: number;
  initialSouthAreaM2?: number;
  southWallAreaM2?: number;
  glazingUFactor?: number;
  glazingSHGC?: number;
  locationName?: string;
  designWinterMinC?: number;
}

export function OpeningSensitivityPanel({
  initialWWR = 18,
  initialSouthAreaM2 = 3.6,
  southWallAreaM2 = 16.8,
  glazingUFactor = 1.4,
  glazingSHGC = 0.62,
  locationName = "Ladakh (3,500m ASL)",
  designWinterMinC = -20.5,
}: OpeningSensitivityPanelProps) {
  const [southGlazingArea, setSouthGlazingArea] = useState<number>(initialSouthAreaM2);

  // Physics calculation tied to active shelter geometry and glazing specifications
  // Direct solar irradiance harvest vs conductive nocturnal thermal escape
  const metrics = useMemo(() => {
    const dailySolarHarvestKwh = Number((southGlazingArea * 4.8 * glazingSHGC).toFixed(1));
    const deltaTNight = Math.max(15, Math.abs(16 - designWinterMinC)); // Nighttime indoor-outdoor gradient
    const nighttimeConductiveLossKwh = Number(((southGlazingArea * glazingUFactor * deltaTNight * 14.0) / 1000).toFixed(1));
    const netThermalGainKwh = Number((dailySolarHarvestKwh - nighttimeConductiveLossKwh).toFixed(1));

    // Optimal aperture range: 15% to 25% of the host south facade
    const optMinArea = Number((0.15 * southWallAreaM2).toFixed(1));
    const optMaxArea = Number((0.26 * southWallAreaM2).toFixed(1));

    let predictedMinTempC = 4.2;
    if (southGlazingArea < optMinArea) {
      predictedMinTempC = 2.0 + (southGlazingArea / optMinArea) * 2.2;
    } else if (southGlazingArea <= optMaxArea) {
      predictedMinTempC = 4.2 + ((southGlazingArea - optMinArea) / (optMaxArea - optMinArea)) * 4.5;
    } else {
      predictedMinTempC = 8.7 - ((southGlazingArea - optMaxArea) / (southWallAreaM2 * 0.2)) * 3.8;
    }

    const isOptimal = southGlazingArea >= optMinArea && southGlazingArea <= optMaxArea;
    const isUndersized = southGlazingArea < optMinArea;
    const isOversized = southGlazingArea > optMaxArea;

    return {
      dailySolarHarvestKwh,
      nighttimeConductiveLossKwh,
      netThermalGainKwh,
      predictedMinTempC: Number(predictedMinTempC.toFixed(1)),
      optMinArea,
      optMaxArea,
      isOptimal,
      isUndersized,
      isOversized,
    };
  }, [southGlazingArea, southWallAreaM2, glazingUFactor, glazingSHGC, designWinterMinC]);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20">
              DRDO PS 26051 Requirement
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              Passive Aperture Sensitivity Study
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2 mt-1.5">
            <Sliders className="h-4 w-4 text-amber-500" />
            <span>Effect of Openings on Thermal Outcome</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluate how opening area size balances direct daytime solar radiation harvest vs nighttime conductive heat escape.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
              metrics.isOptimal
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : metrics.isUndersized
                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
            }`}
          >
            <Sparkles className="size-3.5" />
            {metrics.isOptimal
              ? "Optimal Solar Aperture"
              : metrics.isUndersized
              ? "Insufficient Solar Intake"
              : "Over-Glazed (Night Heat Loss)"}
          </span>
        </div>
      </div>

      {/* Slider Control Area */}
      <div className="space-y-4 rounded-2xl bg-muted/30 border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Maximize2 className="size-3.5 text-primary" />
              <span>South-Facing Glazing Opening Area:</span>
            </label>
            <p className="text-[11px] text-muted-foreground">
              Direct-gain aperture facing solar azimuth (180° South).
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-xl font-bold text-primary">
              {southGlazingArea.toFixed(1)} m²
            </span>
            <span className="text-[11px] text-muted-foreground block">
              (~{((southGlazingArea / southWallAreaM2) * 100).toFixed(0)}% WWR)
            </span>
          </div>
        </div>

        <input
          type="range"
          min="1.0"
          max="8.0"
          step="0.2"
          value={southGlazingArea}
          onChange={(e) => setSouthGlazingArea(parseFloat(e.target.value))}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
        />

        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>1.0 m² (Minimal)</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">3.0–4.5 m² (Recommended Sweet Spot)</span>
          <span>8.0 m² (High Loss)</span>
        </div>
      </div>

      {/* Calculated Dynamic KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Sun className="size-3.5 text-amber-500" />
            <span>Daytime Solar Harvest</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
            +{metrics.dailySolarHarvestKwh} kWh/day
          </div>
          <div className="text-[10px] text-muted-foreground">Direct passive thermal collection</div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <ShieldAlert className="size-3.5 text-rose-500" />
            <span>Night Glazing Conduction</span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
            −{metrics.nighttimeConductiveLossKwh} kWh/night
          </div>
          <div className="text-[10px] text-muted-foreground">Escape through U=1.4 window frame</div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3.5 text-emerald-500" />
            <span>Net 24h Thermal Balance</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {metrics.netThermalGainKwh >= 0 ? `+${metrics.netThermalGainKwh}` : metrics.netThermalGainKwh} kWh
          </div>
          <div className="text-[10px] text-muted-foreground">Daily net energy advantage</div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Thermometer className="size-3.5 text-sky-500" />
            <span>Predicted Min Indoor Temp</span>
          </div>
          <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
            +{metrics.predictedMinTempC}°C
          </div>
          <div className="text-[10px] text-muted-foreground">During peak 05:00 pre-dawn freeze</div>
        </div>
      </div>
    </div>
  );
}
