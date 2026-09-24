"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building,
} from "lucide-react";
import {
  useShelterStore,
  DEFAULT_LADAKH_PROJECT,
  DEFAULT_KARGIL_PROJECT,
  DEFAULT_SPITI_PROJECT,
  DEFAULT_TAWANG_PROJECT,
  DEFAULT_BASELINE_TIN_PROJECT,
} from "@/lib/store/use-shelter-store";
import { ShelterModel } from "@/types/shelter";
import { OpenFreeMapPicker } from "@/features/weather/components/OpenFreeMapPicker";
import { ActionButton } from "@/components/v0/platform-components";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ARCHETYPE_PRESETS = [
  {
    id: "shelter-ladakh-01",
    name: "Leh Ladakh High-Altitude Outpost",
    climate: "Cold Desert Alpine · 3,500m",
    description: "300mm rammed earth Trombe wall + 150mm EPS composite envelope, double Low-E argon solar aperture, 85% HRV.",
    dimensions: "6.0m × 4.0m × 3.0m",
    insulation: "150mm EPS (R=4.54)",
    glazing: "Double Low-E Argon (U=1.4)",
    weatherSource: "IND_JK_Leh.427053_TMYx.epw",
    baseModel: DEFAULT_LADAKH_PROJECT,
    comfortPct: 92,
    icon: "\u2600\uFE0F",
    accent: "emerald",
    tag: "Passive Solar",
    uWall: 0.28,
    highlight: "Trombe Wall",
  },
  {
    id: "shelter-kargil-02",
    name: "Dras-Kargil Extreme Cold Bunkhouse",
    climate: "Sub-Arctic Continental · -35\u00b0C, 3,230m",
    description: "250mm local granite mass core, 120mm PIR & VIP vacuum panels, triple Low-E krypton glazing, permafrost barrier.",
    dimensions: "6.0m × 4.0m × 2.8m",
    insulation: "120mm PIR & VIP (R=6.90)",
    glazing: "Triple Low-E Krypton (U=0.78)",
    weatherSource: "dras_kargil.epw",
    baseModel: DEFAULT_KARGIL_PROJECT,
    comfortPct: 88,
    icon: "\u2744\uFE0F",
    accent: "cyan",
    tag: "VIP Insulation",
    uWall: 0.14,
    highlight: "Granite Core",
  },
  {
    id: "shelter-spiti-03",
    name: "Spiti Valley High-Solar Clerestory",
    climate: "High-Altitude Cold Desert · 3,800m",
    description: "22\u00b0 south high-gain clerestory shed roof, 150mm PIR rigid insulation, PCM Salt Hydrate 21\u00b0C latent thermal panels.",
    dimensions: "6.5m × 4.0m × 3.2m",
    insulation: "150mm PIR Foam (R=6.25)",
    glazing: "Double Low-E Argon (U=1.3)",
    weatherSource: "spiti_valley.epw",
    baseModel: DEFAULT_SPITI_PROJECT,
    comfortPct: 91,
    icon: "\u2728",
    accent: "violet",
    tag: "PCM Storage",
    uWall: 0.16,
    highlight: "Clerestory Roof",
  },
  {
    id: "shelter-tawang-04",
    name: "Tawang Eastern Himalaya Timber Cabin",
    climate: "Montane Temperate Alpine · 3,048m",
    description: "Himalayan Cedar mass timber frame with 160mm hydrophobic rockwool & aerogel blanket, 30\u00b0 snow-shedding gable roof.",
    dimensions: "7.0m × 4.5m × 3.0m",
    insulation: "160mm Mineral Wool + Aerogel (R=5.8)",
    glazing: "Triple Low-E Krypton (U=0.8)",
    weatherSource: "tawang.epw",
    baseModel: DEFAULT_TAWANG_PROJECT,
    comfortPct: 93,
    icon: "\uD83C\uDF32",
    accent: "amber",
    tag: "Mass Timber",
    uWall: 0.17,
    highlight: "Cedar Frame",
  },
  {
    id: "shelter-baseline-tin",
    name: "CGI Tin Barrack (Baseline)",
    climate: "Uninsulated Benchmark · Freezes at -15\u00b0C",
    description: "Standard corrugated galvanized iron with drafty single glazing. Demands continuous Bukhari fuel burning. Reference comparison only.",
    dimensions: "6.0m × 4.0m × 2.6m",
    insulation: "0mm (Uninsulated Bare Sheet)",
    glazing: "Single Clear 4mm (U=5.8)",
    weatherSource: "IND_JK_Leh.427053_TMYx.epw",
    baseModel: DEFAULT_BASELINE_TIN_PROJECT,
    comfortPct: 15,
    icon: "\uD83D\uDD27",
    accent: "rose",
    tag: "Baseline Only",
    uWall: 3.20,
    highlight: "No Insulation",
  },
];


export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const { addProject, setActiveProject, setActiveWeather, weatherDatasets } = useShelterStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Project Identity
  const [projectName, setProjectName] = useState("High-Altitude Defense Shelter Outpost");
  const [projectId, setProjectId] = useState(() => `shelter-${Date.now().toString().slice(-8)}`);
  const [description, setDescription] = useState(
    "High-altitude forward operating shelter engineered for extreme cold climate and low air density."
  );

  // Step 2: Location via OpenFreeMap
  const [latitude, setLatitude] = useState(34.1526);
  const [longitude, setLongitude] = useState(77.5771);
  const [elevation, setElevation] = useState(3500.0);
  const [locationName, setLocationName] = useState("Leh, Ladakh, India");
  const [weatherSource, setWeatherSource] = useState<string | null>(null);

  // Step 3: Archetype Choice
  const [selectedArchetype, setSelectedArchetype] = useState(ARCHETYPE_PRESETS[0].id);

  if (!isOpen) return null;

  const handleLocationSelected = (loc: {
    latitude: number;
    longitude: number;
    elevation: number;
    locality: string;
    region: string;
  }) => {
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setElevation(loc.elevation);
    setLocationName(loc.locality);

    // Automatic regional weather mapping based on proximity
    if (Math.abs(loc.latitude - 34.43) < 0.8 && Math.abs(loc.longitude - 75.75) < 1.0) {
      setWeatherSource("dras_kargil.epw");
    } else if (Math.abs(loc.latitude - 32.25) < 0.8 && Math.abs(loc.longitude - 78.03) < 1.0) {
      setWeatherSource("spiti_valley.epw");
    } else if (Math.abs(loc.latitude - 27.59) < 1.0 && Math.abs(loc.longitude - 91.87) < 1.5) {
      setWeatherSource("tawang.epw");
    } else if (Math.abs(loc.latitude - 34.15) < 0.8 && Math.abs(loc.longitude - 77.58) < 1.0) {
      setWeatherSource("IND_JK_Leh.427053_TMYx.epw");
    }
  };

  const handleEpwGenerated = (epwFile: string) => {
    setWeatherSource(epwFile);
  };

  const handleCreateProject = () => {
    const archetype = ARCHETYPE_PRESETS.find((a) => a.id === selectedArchetype) || ARCHETYPE_PRESETS[0];
    const base = archetype.baseModel;
    const finalWeather = weatherSource || archetype.weatherSource;
    const clonedBase = JSON.parse(JSON.stringify(base));

    const newModel: ShelterModel = {
      ...clonedBase,
      id: projectId,
      project: {
        ...clonedBase.project,
        id: projectId,
        name: projectName,
        description,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      location: {
        ...clonedBase.location,
        latitude,
        longitude,
        elevation,
        region: locationName,
        weatherSource: finalWeather,
      },
    };

    addProject(newModel);
    setActiveProject(projectId);

    // Synchronize active weather station in the global store
    const matched = weatherDatasets.find((w) => w.epwFileName === finalWeather);
    if (matched) {
      setActiveWeather(matched.id);
    }

    onClose();
    router.push("/designer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-[2rem] border border-border bg-card shadow-2xl overflow-hidden my-6 text-foreground">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-7 py-5 bg-white">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6E818F]">
              Onboarding Protocol · Project Initialization
            </span>
            <h2 className="font-editorial text-2xl font-medium tracking-tight text-foreground mt-0.5">
              Initialize New Shelter Project
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Spatial coordinate acquisition, microclimate downscaling, and certified thermal baselines.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#6E818F] hover:bg-[#CBDCE6]/40 hover:text-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex items-center gap-2 border-b border-border bg-secondary/15 px-7 py-3 text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold transition ${step === 1
              ? "bg-black text-white shadow-sm"
              : "text-[#6E818F] hover:text-black hover:bg-white"
              }`}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">1</span>
            <span>Identity & Scope</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold transition ${step === 2
              ? "bg-black text-white shadow-sm"
              : "text-[#6E818F] hover:text-black hover:bg-white"
              }`}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">2</span>
            <span>Map Coordinates</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold transition ${step === 3
              ? "bg-black text-white shadow-sm"
              : "text-[#6E818F] hover:text-black hover:bg-white"
              }`}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">3</span>
            <span>Thermal Archetype</span>
          </button>
        </div>

        {/* Step Content */}
        <div className="p-7 max-h-[68vh] overflow-y-auto space-y-6">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E818F]">
                  Project Designation / Outpost Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Siachen Glacier Northern Outpost Pod"
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-black focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E818F]">
                  Shelter Model ID (Canonical DB Key)
                </label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-4 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-black focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E818F]">
                  Mission Context & Operational Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-black focus:bg-white focus:outline-none transition"
                />
              </div>

              <div className="rounded-2xl border border-border bg-[#CBDCE6]/25 p-4 text-xs text-muted-foreground space-y-1">
                <div className="font-bold text-foreground">Zero Guesswork Onboarding:</div>
                <p>
                  In the next step, you do not need to memorize or calculate raw GPS degrees. Simply search any Himalayan outpost or click on the map to pin exact coordinates and altitude.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: OPENFREEMAP LOCATION */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-black" />
                  Tactical Geographic Positioning
                </h3>
              </div>

              <OpenFreeMapPicker
                initialLatitude={latitude}
                initialLongitude={longitude}
                initialElevation={elevation}
                initialLocationName={locationName}
                onLocationChange={handleLocationSelected}
                onEpwGenerated={handleEpwGenerated}
                height="370px"
              />

              {/* Weather Source Dataset Summary */}
              <div className="rounded-2xl border border-border bg-secondary/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Active Weather Dataset:</span>{" "}
                  <span className="font-mono font-bold text-foreground">{weatherSource?.replace(/\.epw$/i, "")}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Altitude: <span className="font-bold text-foreground">{Math.round(elevation)}m</span> · Locality:{" "}
                  <span className="font-bold text-foreground">{locationName.split(",")[0]}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: THERMAL ARCHETYPE */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Building className="h-4 w-4 text-black" />
                  Select Baseline Cold-Climate Archetype
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pre-configured envelope assemblies designed for extreme high-altitude conditions. Each archetype copies its structural blueprint into your new project.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ARCHETYPE_PRESETS.map((arch) => {
                  const isSelected = selectedArchetype === arch.id;
                  const accentClasses: Record<string, { bar: string; badge: string; ring: string }> = {
                    emerald: { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300", ring: "ring-emerald-500" },
                    cyan: { bar: "bg-cyan-500", badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300", ring: "ring-cyan-500" },
                    violet: { bar: "bg-violet-500", badge: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300", ring: "ring-violet-500" },
                    amber: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300", ring: "ring-amber-500" },
                    rose: { bar: "bg-rose-400", badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300", ring: "ring-rose-400" },
                  };
                  const ac = accentClasses[arch.accent] || accentClasses.emerald;
                  const comfortColor =
                    arch.comfortPct >= 85 ? "text-emerald-700 dark:text-emerald-300" :
                      arch.comfortPct >= 50 ? "text-amber-700 dark:text-amber-300" :
                        "text-rose-600 dark:text-rose-400";

                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => setSelectedArchetype(arch.id)}
                      className={`rounded-2xl border text-left transition-all overflow-hidden flex flex-col group ${isSelected
                        ? `border-black ring-2 ${ac.ring} bg-white dark:bg-slate-900 shadow-md`
                        : "border-border bg-white dark:bg-slate-900/60 hover:border-black/30 hover:shadow-sm"
                        }`}
                    >
                      {/* Color accent top bar */}
                      <div className={`h-1.5 w-full ${ac.bar}`} />

                      <div className="p-4 flex flex-col gap-3 flex-1">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl leading-none">{arch.icon}</span>
                            <div>
                              <div className="text-xs font-bold text-foreground leading-tight">{arch.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{arch.climate}</div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-black flex-shrink-0 mt-0.5" />}
                        </div>

                        {/* Comfort + Tag badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${ac.badge}`}>
                            {arch.tag}
                          </span>
                          <span className={`inline-flex items-center rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-bold ${comfortColor}`}>
                            {arch.comfortPct}% Comfort
                          </span>
                          <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            U={arch.uWall} W/m²K
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{arch.description}</p>

                        {/* Stats grid */}
                        <div className="mt-auto pt-2.5 border-t border-border grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                          <div className="text-muted-foreground">Size: <span className="font-semibold text-foreground">{arch.dimensions}</span></div>
                          <div className="text-muted-foreground">✦ <span className="font-semibold text-foreground">{arch.highlight}</span></div>
                          <div className="text-muted-foreground">Insulation: <span className="font-mono font-semibold text-foreground">{arch.insulation.split(" ")[0]}</span></div>
                          <div className="text-muted-foreground">Glazing: <span className="font-mono font-semibold text-foreground">{arch.glazing.split("(")[0].trim()}</span></div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">Note:</span> Selecting an archetype copies its complete envelope blueprint into your new project. You can customize every parameter in the 13-step designer after creation.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-border px-7 py-4 bg-white">
          <div>
            {step > 1 ? (
              <ActionButton
                tone="secondary"
                onClick={() => setStep((s) => (s - 1) as any)}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </ActionButton>
            ) : (
              <ActionButton tone="quiet" onClick={onClose}>
                Cancel
              </ActionButton>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <ActionButton
                tone="primary"
                onClick={() => setStep((s) => (s + 1) as any)}
              >
                Next Step <ArrowRight className="h-3.5 w-3.5" />
              </ActionButton>
            ) : (
              <ActionButton
                tone="primary"
                onClick={handleCreateProject}
              >
                <CheckCircle2 className="h-4 w-4" /> Initialize Shelter Project
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
