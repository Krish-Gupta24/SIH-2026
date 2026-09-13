"use client";

import React from "react";
import {
  Sparkles,
  Sliders,
  Shield,
  Flame,
  Feather,
  Compass,
  Users,
  MapPin,
  Cpu,
  Layers,
  ThermometerSnowflake,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GenerateDesignParams, ModelStatus } from "../types";

interface MissionRequirementsFormProps {
  params: GenerateDesignParams;
  onChange: (updates: Partial<GenerateDesignParams>) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  modelStatus: ModelStatus | null;
}

const HIGH_ALTITUDE_STATIONS = [
  {
    id: "leh_ladakh_tmyx",
    name: "Leh, Ladakh (TMYx / ISHRAE)",
    elevation: "3,500 m",
    designMin: "-25.0°C",
    climate: "Cold Alpine / High Solar",
  },
  {
    id: "dras_extreme_cold",
    name: "Dras, Kargil (Gateway to Ladakh)",
    elevation: "3,280 m",
    designMin: "-35.0°C",
    climate: "Severe Sub-Zero / Gale Winds",
  },
  {
    id: "spiti_valley_alpine",
    name: "Kaza, Spiti Valley",
    elevation: "3,800 m",
    designMin: "-28.0°C",
    climate: "High Alpine Semi-Arid",
  },
  {
    id: "tawang_high_altitude",
    name: "Tawang Outpost, Arunachal",
    elevation: "3,048 m",
    designMin: "-15.0°C",
    climate: "Montane Wet / Heavy Snow",
  },
  {
    id: "siachen_glacier_extreme",
    name: "Siachen Glacier Outpost",
    elevation: "5,400 m",
    designMin: "-45.0°C",
    climate: "Polar Glacial / High UV",
  },
];

const STRATEGY_MODES: Array<{
  id: GenerateDesignParams["optimization_mode"];
  label: string;
  icon: any;
  description: string;
}> = [
  {
    id: "BALANCED",
    label: "Balanced Resilience",
    icon: Shield,
    description: "Equally minimizes annual heating demand, discomfort hours, and envelope deployment mass.",
  },
  {
    id: "MINIMUM_HEATING",
    label: "Zero Fuel / Min Heating",
    icon: Flame,
    description: "Prioritizes maximum thermal conservation and passive solar aperture to minimize diesel fuel logistics.",
  },
  {
    id: "MAXIMUM_COMFORT",
    label: "Maximum Comfort Hours",
    icon: ThermometerSnowflake,
    description: "Stabilizes indoor temperatures within the operative comfort band throughout extreme night troughs.",
  },
  {
    id: "MINIMUM_MASS",
    label: "Ultralight Transport",
    icon: Feather,
    description: "Prioritizes aerogel and vacuum insulation panels to allow rapid helicopter-lift deployment.",
  },
];

export function MissionRequirementsForm({
  params,
  onChange,
  onSubmit,
  isGenerating,
  modelStatus,
}: MissionRequirementsFormProps) {
  const isSurrogateReady = modelStatus?.is_surrogate_available ?? false;

  return (
    <Card className="rounded-[2rem] border border-border bg-card/90 backdrop-blur-md p-6 sm:p-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
              <Sparkles className="size-4" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Mission & Deployment Targets</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Inverse generative optimization: Define physical goals, and the AI algorithm generates optimal shelter blueprints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSurrogateReady ? (
            <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] py-1">
              <Cpu className="size-3.5" />
              Surrogate ML Active ({modelStatus?.model_card?.model_version || "v1.0"})
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] py-1">
              <Layers className="size-3.5" />
              Forward Physics Mode
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* 1. Deployment Site Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            1. High-Altitude Station & Microclimate
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {HIGH_ALTITUDE_STATIONS.map((station) => {
              const isSelected = params.weather_id === station.id;
              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => onChange({ weather_id: station.id })}
                  className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? "border-foreground bg-secondary/80 shadow-md ring-1 ring-foreground/20"
                      : "border-border bg-background/50 hover:bg-secondary/40 hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{station.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {station.elevation}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Design: {station.designMin}</span>
                    <span className="truncate max-w-[120px]">{station.climate}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Target Minimum Indoor Temperature */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ThermometerSnowflake className="size-3.5" />
                2. Target Min Indoor Temperature
              </label>
              <span className="text-sm font-bold text-foreground font-mono bg-secondary px-2.5 py-0.5 rounded-md border border-border">
                {params.target_indoor_min_c.toFixed(1)}°C
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="20"
              step="0.5"
              value={params.target_indoor_min_c}
              onChange={(e) => onChange({ target_indoor_min_c: parseFloat(e.target.value) })}
              className="w-full accent-foreground cursor-pointer h-2 bg-secondary rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>+5.0°C (Emergency survival)</span>
              <span>+12.0°C (Standard unheated)</span>
              <span>+20.0°C (Standard comfort)</span>
            </div>
          </div>

          {/* 3. Envelope Mass Constraint */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Feather className="size-3.5" />
                3. Max Deployment Mass Constraint
              </label>
              <span className="text-sm font-bold text-foreground font-mono bg-secondary px-2.5 py-0.5 rounded-md border border-border">
                {params.max_envelope_mass_kg ? `${params.max_envelope_mass_kg.toLocaleString()} kg` : "Unconstrained"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1000"
                max="25000"
                step="500"
                disabled={params.max_envelope_mass_kg === null}
                value={params.max_envelope_mass_kg || 10000}
                onChange={(e) => onChange({ max_envelope_mass_kg: parseFloat(e.target.value) })}
                className="w-full accent-foreground cursor-pointer h-2 bg-secondary rounded-lg disabled:opacity-30"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    max_envelope_mass_kg: params.max_envelope_mass_kg === null ? 8000 : null,
                  })
                }
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
                  params.max_envelope_mass_kg === null
                    ? "bg-foreground text-background border-foreground"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {params.max_envelope_mass_kg === null ? "Any Mass" : "Limit Mass"}
              </button>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>1,000 kg (Airlift)</span>
              <span>8,000 kg (Truckable)</span>
              <span>25,000 kg (Permanent Base)</span>
            </div>
          </div>
        </div>

        {/* 4. Strategic Optimization Mode */}
        <div className="pt-2 border-t border-border">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sliders className="size-3.5" />
            4. Strategic Multi-Objective Profile
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STRATEGY_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = params.optimization_mode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChange({ optimization_mode: mode.id })}
                  className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? "border-foreground bg-secondary/80 shadow-md ring-1 ring-foreground/20"
                      : "border-border bg-background/50 hover:bg-secondary/40 hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg ${isSelected ? "bg-black text-white dark:bg-white dark:text-black" : "bg-secondary text-foreground"}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className="text-xs font-bold">{mode.label}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Occupants & Genetic Algorithm Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Users className="size-3.5" />
              Occupant Count
            </label>
            <select
              value={params.occupants}
              onChange={(e) => onChange({ occupants: parseInt(e.target.value, 10) })}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="2">2 Soldiers (Patrol Post)</option>
              <option value="4">4 Soldiers (Standard Bunker)</option>
              <option value="8">8 Soldiers (Platoon Shelter)</option>
              <option value="12">12 Soldiers (Barracks / Command)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Compass className="size-3.5" />
              Population Size (N_pop)
            </label>
            <select
              value={params.population_size}
              onChange={(e) => onChange({ population_size: parseInt(e.target.value, 10) })}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="50">50 candidates (Fast Search)</option>
              <option value="100">100 candidates (Recommended)</option>
              <option value="150">150 candidates (Deep Space)</option>
              <option value="200">200 candidates (High Diversity)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Cpu className="size-3.5" />
              Generations (N_gen)
            </label>
            <select
              value={params.generations}
              onChange={(e) => onChange({ generations: parseInt(e.target.value, 10) })}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="20">20 generations (~1,000 evaluations)</option>
              <option value="40">40 generations (~4,000 evaluations)</option>
              <option value="60">60 generations (~6,000 evaluations)</option>
              <option value="80">80 generations (~8,000 evaluations)</option>
            </select>
          </div>
        </div>

        {/* 6. Execution Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-ping" />
            <span>
              Evaluates{" "}
              <strong className="text-foreground">
                {(params.population_size * params.generations).toLocaleString()}
              </strong>{" "}
              designs across 21 parameters in ~3.5 seconds.
            </span>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={onSubmit}
            disabled={isGenerating}
            className="w-full sm:w-auto px-8 py-6 rounded-2xl bg-foreground text-background font-bold text-sm shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="size-4 border-2 border-background/20 border-t-background rounded-full animate-spin" />
                Optimizing Candidate Space...
              </>
            ) : (
              <>
                <Sparkles className="size-4 text-emerald-400" />
                Execute AI Generative Design
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
