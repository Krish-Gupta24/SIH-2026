"use client";

import React, { useState, useMemo } from "react";
import {
  Sun,
  Moon,
  Maximize2,
  Sliders,
  Thermometer,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Info,
  Scale,
  CheckCircle2,
  AlertTriangle,
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
  initialSouthAreaM2 = 3.8,
  southWallAreaM2 = 16.8,
  glazingUFactor = 1.4,
  glazingSHGC = 0.62,
  locationName = "Ladakh (3,500m ASL)",
  designWinterMinC = -20.5,
}: OpeningSensitivityPanelProps) {
  const [southGlazingArea, setSouthGlazingArea] = useState<number>(initialSouthAreaM2);

  // Physics calculation tied to shelter geometry and glazing specifications
  // Balances direct daytime solar intake against nocturnal transmission loss
  const metrics = useMemo(() => {
    const dailySolarHarvestKwh = Number((southGlazingArea * 4.8 * glazingSHGC).toFixed(1));
    const deltaTNight = Math.max(15, Math.abs(16 - designWinterMinC)); // Nocturnal temperature gradient
    const nighttimeConductiveLossKwh = Number(((southGlazingArea * glazingUFactor * deltaTNight * 14.0) / 1000).toFixed(1));
    const netThermalGainKwh = Number((dailySolarHarvestKwh - nighttimeConductiveLossKwh).toFixed(1));

    // Recommended sweet spot range: 18% to 26% of south wall
    const optMinArea = Number((0.18 * southWallAreaM2).toFixed(1));
    const optMaxArea = Number((0.27 * southWallAreaM2).toFixed(1));

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
    const wwrPct = Math.round((southGlazingArea / southWallAreaM2) * 100);

    return {
      dailySolarHarvestKwh,
      nighttimeConductiveLossKwh,
      netThermalGainKwh,
      predictedMinTempC: Number(predictedMinTempC.toFixed(0)),
      optMinArea,
      optMaxArea,
      isOptimal,
      isUndersized,
      isOversized,
      wwrPct,
    };
  }, [southGlazingArea, southWallAreaM2, glazingUFactor, glazingSHGC, designWinterMinC]);

  // Presets for quick user switching
  const presets = [
    { label: "Minimal Window", value: 1.5, desc: "Low heat gain" },
    { label: "Recommended Sweet Spot", value: 3.8, desc: "Best balance", isRecommended: true },
    { label: "Large Glazing", value: 6.0, desc: "High night loss" },
  ];

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
      {/* Friendly Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Passive Solar Balance
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mt-1">
            <Sliders className="h-4 w-4 text-amber-500" />
            <span>Window Size & Thermal Comfort Guide</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            South-facing windows gather free daytime solar heating, but cold glass leaks heat at night. Use the slider below to find your shelter&apos;s ideal window area.
          </p>
        </div>

        {/* Clear Status Chip */}
        <div className="shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
              metrics.isOptimal
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : metrics.isUndersized
                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
            }`}
          >
            {metrics.isOptimal ? (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Optimal Solar Aperture (Sweet Spot)</span>
              </>
            ) : metrics.isUndersized ? (
              <>
                <Info className="size-3.5 text-sky-500" />
                <span>Undersized (Needs More Sun Harvest)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="size-3.5 text-rose-500" />
                <span>Oversized (Excessive Night Heat Escape)</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Interactive Controls & Presets */}
      <div className="space-y-4 rounded-2xl bg-secondary/30 border border-border p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label htmlFor="glazing-area-slider" className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Maximize2 className="size-3.5 text-primary" />
              <span>South-Facing Window Area:</span>
            </label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Direct-gain glass oriented towards midday winter sun (180° South).
            </p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-foreground">
              {southGlazingArea.toFixed(1)} m²
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              (~{metrics.wwrPct}% of south wall)
            </span>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-2 pt-1">
          <input
            id="glazing-area-slider"
            type="range"
            min="1.0"
            max="8.0"
            step="0.2"
            value={southGlazingArea}
            onChange={(e) => setSouthGlazingArea(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          <div className="flex justify-between text-[11px] text-muted-foreground font-medium pt-1">
            <span>1.0 m² (Minimal)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Sparkles className="size-3" />
              3.0–4.5 m² (Recommended Sweet Spot)
            </span>
            <span>8.0 m² (High Loss)</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">Quick Presets:</span>
          {presets.map((preset) => {
            const isSelected = Math.abs(southGlazingArea - preset.value) < 0.15;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSouthGlazingArea(preset.value)}
                className={`text-xs px-3 py-1 rounded-full border transition cursor-pointer font-medium flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-foreground text-background border-foreground shadow-xs font-bold"
                    : "bg-card text-foreground hover:bg-secondary border-border"
                }`}
              >
                <span>{preset.label} ({preset.value} m²)</span>
                {preset.isRecommended && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? "bg-emerald-500 text-white" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"}`}>
                    Ideal
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Energy Balance Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
            <Scale className="size-3.5 text-primary" />
            <span>24-Hour Thermal Tradeoff</span>
          </span>
          <span className="font-mono text-xs font-bold text-foreground">
            Daily Gain: <strong className="text-emerald-600 dark:text-emerald-400">+{metrics.netThermalGainKwh} kWh</strong>
          </span>
        </div>

        {/* Proportional Comparison Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full bg-secondary overflow-hidden flex">
            <div
              style={{
                width: `${Math.min(100, Math.max(10, (metrics.dailySolarHarvestKwh / (metrics.dailySolarHarvestKwh + metrics.nighttimeConductiveLossKwh)) * 100))}%`,
              }}
              className="bg-amber-500 transition-all duration-300"
              title={`Day Sun Harvest: +${metrics.dailySolarHarvestKwh} kWh`}
            />
            <div
              style={{
                width: `${Math.min(100, Math.max(10, (metrics.nighttimeConductiveLossKwh / (metrics.dailySolarHarvestKwh + metrics.nighttimeConductiveLossKwh)) * 100))}%`,
              }}
              className="bg-sky-500 transition-all duration-300"
              title={`Night Loss: −${metrics.nighttimeConductiveLossKwh} kWh`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
              <Sun className="size-3" />
              Day Solar Harvest: +{metrics.dailySolarHarvestKwh} kWh
            </span>
            <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold">
              <Moon className="size-3" />
              Night Loss: −{metrics.nighttimeConductiveLossKwh} kWh
            </span>
          </div>
        </div>
      </div>

      {/* 4 Clean, Plain-English Result Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Solar Harvest */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sun className="size-3.5 text-amber-500" />
            <span>Daytime Solar Harvest</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            +{metrics.dailySolarHarvestKwh} <span className="text-xs font-normal text-muted-foreground">kWh/day</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Direct passive heat gathered from daytime sunlight.
          </div>
        </div>

        {/* Card 2: Night Glazing Escape */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Moon className="size-3.5 text-sky-500" />
            <span>Night Heat Escape</span>
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
            −{metrics.nighttimeConductiveLossKwh} <span className="text-xs font-normal text-muted-foreground">kWh/night</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Conducted outward through the glass during sub-zero night.
          </div>
        </div>

        {/* Card 3: Net Thermal Balance */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-emerald-500" />
            <span>Net 24h Thermal Balance</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${metrics.netThermalGainKwh >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {metrics.netThermalGainKwh >= 0 ? `+${metrics.netThermalGainKwh}` : metrics.netThermalGainKwh} <span className="text-xs font-normal text-muted-foreground">kWh/day</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Net surplus energy retained indoors over a full 24h cycle.
          </div>
        </div>

        {/* Card 4: Predicted Night Min */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Thermometer className="size-3.5 text-emerald-500" />
            <span>Predicted Min Indoor Temp</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            +{metrics.predictedMinTempC}°C
          </div>
          <div className="text-[11px] text-muted-foreground">
            Protected indoor low during 05:00 pre-dawn freeze.
          </div>
        </div>
      </div>

      {/* Practical Recommendation Callout */}
      <div className={`rounded-xl border p-4 text-xs leading-relaxed flex items-start gap-3 ${
        metrics.isOptimal
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200"
          : metrics.isUndersized
          ? "border-sky-500/30 bg-sky-500/5 text-sky-900 dark:text-sky-200"
          : "border-rose-500/30 bg-rose-500/5 text-rose-900 dark:text-rose-200"
      }`}>
        <div className="mt-0.5 shrink-0">
          {metrics.isOptimal ? (
            <CheckCircle2 className="size-4 text-emerald-500" />
          ) : metrics.isUndersized ? (
            <Info className="size-4 text-sky-500" />
          ) : (
            <AlertTriangle className="size-4 text-rose-500" />
          )}
        </div>
        <div>
          <strong className="block font-semibold mb-0.5">
            {metrics.isOptimal
              ? "Optimal Configuration Achieved"
              : metrics.isUndersized
              ? "Design Tip: Window is Undersized"
              : "Design Caution: Window is Oversized"}
          </strong>
          {metrics.isOptimal && (
            <span>
              At <strong>{southGlazingArea.toFixed(1)} m²</strong>, daytime solar warming outpaces nighttime heat escape by <strong>+{metrics.netThermalGainKwh} kWh/day</strong>. The shelter maintains a comfortable <strong>+{metrics.predictedMinTempC}°C</strong> pre-dawn minimum without requiring extra heating fuel.
            </span>
          )}
          {metrics.isUndersized && (
            <span>
              At <strong>{southGlazingArea.toFixed(1)} m²</strong>, the window is too small to harvest sufficient solar energy during the day. Consider increasing south glazing to <strong>3.0 – 4.5 m²</strong> to add +4 to +6 kWh of free natural warmth.
            </span>
          )}
          {metrics.isOversized && (
            <span>
              At <strong>{southGlazingArea.toFixed(1)} m²</strong>, the large glass surface leaks significant heat during the 14-hour alpine freeze (<strong>−{metrics.nighttimeConductiveLossKwh} kWh</strong>), eroding pre-dawn indoor comfort.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
