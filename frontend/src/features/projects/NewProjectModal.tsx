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
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { OpenFreeMapPicker } from "@/features/weather/components/OpenFreeMapPicker";
import { ActionButton } from "@/components/v0/platform-components";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ARCHETYPE_PRESETS = [
  {
    id: "preset-siachen-aerogel",
    name: "Siachen Glacial Aerogel Pod (5400m)",
    climate: "Extreme Alpine Glacial (-50°C)",
    description: "Vacuum insulated glazing, 200mm aerogel core envelope, passive solar thermal mass buffer floor.",
    dimensions: "6.0m × 3.5m × 2.8m",
    insulation: "200mm Aerogel (R=14.2)",
    glazing: "Triple Low-E Argon (U=0.78)",
    weatherSource: "IND_JK_Leh.427053_TMYx.epw",
  },
  {
    id: "preset-leh-outpost",
    name: "Leh High-Altitude Passive Solar (3500m)",
    climate: "Cold Desert Alpine",
    description: "Stabilized rammed earth thermal flywheel with south-facing solar gain fenestration.",
    dimensions: "6.0m × 4.0m × 3.0m",
    insulation: "150mm EPS (R=4.54)",
    glazing: "Double Low-E (U=1.4)",
    weatherSource: "IND_JK_Leh.427053_TMYx.epw",
  },
  {
    id: "preset-dras-arctic",
    name: "Dras Sub-Arctic Defense Post (3280m)",
    climate: "Sub-Arctic Continental (-35°C)",
    description: "High-density thermal mass floor slab, airtight vestibule air-lock door, quad-layer thermal envelope.",
    dimensions: "7.0m × 4.5m × 2.8m",
    insulation: "200mm XPS (R=6.90)",
    glazing: "Triple Glazed Argon (U=0.8)",
    weatherSource: "dras_kargil.epw",
  },
  {
    id: "preset-custom",
    name: "Custom Blank Parametric Archetype",
    climate: "User-Defined Extreme Climate",
    description: "Start from a clean slate and configure all 13 envelope and HVAC steps manually in the designer.",
    dimensions: "6.0m × 4.0m × 2.8m",
    insulation: "100mm XPS Baseline",
    glazing: "Double Clear (U=2.6)",
    weatherSource: "IND_JK_Leh.427053_TMYx.epw",
  },
];

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const { addProject, setActiveProject } = useShelterStore();

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
  const [weatherSource, setWeatherSource] = useState("IND_JK_Leh.427053_TMYx.epw");

  // Step 3: Archetype Choice
  const [selectedArchetype, setSelectedArchetype] = useState(ARCHETYPE_PRESETS[0].id);

  if (!isOpen) return null;

  const handleLocationChange = (loc: {
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
  };

  const handleEpwGenerated = (epwFile: string) => {
    setWeatherSource(epwFile);
  };

  const handleCreateProject = () => {
    const archetype = ARCHETYPE_PRESETS.find((a) => a.id === selectedArchetype) || ARCHETYPE_PRESETS[0];

    const newModel: any = {
      id: projectId,
      project: {
        id: projectId,
        name: projectName,
        description,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        tags: ["high-altitude", "defense", locationName.split(",")[0].toLowerCase().trim()],
      },
      location: {
        latitude,
        longitude,
        elevation,
        region: locationName,
        climateZone: elevation > 4500 ? "Extreme Cold Alpine (ASHRAE 8)" : "Cold / Sub-Arctic",
        weatherSource: weatherSource || archetype.weatherSource,
        designTempWinter: elevation > 4500 ? -35.0 : -20.0,
        designTempSummer: 22.0,
      },
      geometry: {
        lengthM: 6.0,
        widthM: 4.0,
        wallHeightM: 2.8,
        orientationDeg: 0,
        roofType: "shed",
        roofPitchDeg: 15.0,
        overhangM: 0.5,
        foundationType: "slab_on_grade",
        permafrostProtection: elevation > 4000,
        internalPartitionsCount: 1,
      },
      walls: {
        constructionType: "mass_composite",
        exteriorFinish: "weather_resistant_render",
        structuralCore: "stabilized_rammed_earth",
        structuralThicknessMm: 200,
        insulationMaterial: selectedArchetype.includes("aerogel") ? "aerogel_blanket" : "extruded_polystyrene",
        insulationThicknessMm: selectedArchetype.includes("aerogel") ? 200 : 150,
        interiorFinish: "gypsum_board",
        cavityAirGapMm: 25,
      },
      roof: {
        roofCovering: "standing_seam_metal",
        insulationMaterial: "extruded_polystyrene",
        insulationThicknessMm: 200,
        ceilingFinish: "gypsum_board",
        snowLoadDesignKnM2: elevation > 4000 ? 5.0 : 3.5,
        solarReflectanceRooftop: 0.3,
      },
      floor: {
        slabThicknessMm: 150,
        subSlabInsulationMaterial: "extruded_polystyrene",
        subSlabInsulationThicknessMm: 150,
        perimeterInsulationDepthM: 1.0,
        finishedFloorType: "insulated_timber_deck",
      },
      windows: {
        glazingType: selectedArchetype.includes("aerogel") ? "triple_low_e_argon" : "double_low_e_argon",
        frameType: "thermally_broken_upvc",
        windowToWallRatioSouth: 0.25,
        windowToWallRatioNorth: 0.05,
        windowToWallRatioEast: 0.1,
        windowToWallRatioWest: 0.1,
        shadingType: "automated_insulated_shutter",
        overhangDepthM: 0.4,
      },
      doors: {
        doorsCount: 1,
        doorType: "insulated_steel",
        doorAreaM2: 2.1,
        airlockVestibule: true,
        weatherStrippingQuality: "high_performance_military",
      },
      thermalMass: {
        internalMassType: "phase_change_material",
        massSurfaceAreaM2: 25.0,
        massThicknessMm: 30,
        trombeWall: true,
        trombeWallAreaM2: 8.0,
      },
      ventilation: {
        infiltrationRateAch: 0.08,
        mechanicalVentilation: true,
        heatRecoveryEfficiency: 0.85,
        minimumFreshAirLpsPerPerson: 10,
        ventilationControlStrategy: "demand_controlled_co2",
      },
      internalLoads: {
        occupantsCount: 4,
        activityLevelW: 120,
        lightingPowerDensityWPerM2: 5,
        equipmentPowerDensityWPerM2: 3,
      },
      designTargets: {
        comfortTempMinC: 18,
        comfortTempMaxC: 24,
        targetComfortPercent: 85,
        maxAnnualHeatingDemandKwhM2: 35,
      },
      simulationSettings: {
        engine: "EnergyPlus",
        simulationType: "Annual",
        timestepsPerHour: 4,
        solarDistribution: "FullInteriorAndExterior",
        terrainType: "Country",
      },
    };

    addProject(newModel);
    setActiveProject(projectId);
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
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold transition ${
              step === 1
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
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold transition ${
              step === 2
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
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold transition ${
              step === 3
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
                  Tactical Geographic Positioning (OpenFreeMap)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Search any mountain post or click on the map. Coordinates, DEM altitude, and barometric pressure are auto-calculated in real time.
                </p>
              </div>

              <OpenFreeMapPicker
                initialLatitude={latitude}
                initialLongitude={longitude}
                initialElevation={elevation}
                initialLocationName={locationName}
                onLocationChange={handleLocationChange}
                onEpwGenerated={handleEpwGenerated}
                height="370px"
              />

              {/* Weather Source Dataset Summary */}
              <div className="rounded-2xl border border-border bg-secondary/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Active Weather Dataset:</span>{" "}
                  <span className="font-mono font-bold text-foreground">{weatherSource}</span>
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
                  Pre-configured envelope assemblies designed for extreme high-altitude thermal retention.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {ARCHETYPE_PRESETS.map((arch) => (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => setSelectedArchetype(arch.id)}
                    className={`rounded-2xl border p-4 text-left transition flex flex-col justify-between ${
                      selectedArchetype === arch.id
                        ? "border-black ring-1 ring-black bg-[#CBDCE6]/25 shadow-sm"
                        : "border-border bg-white hover:border-black/30 hover:bg-[#CBDCE6]/10"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{arch.name}</span>
                        {selectedArchetype === arch.id && (
                          <CheckCircle2 className="h-4 w-4 text-black flex-shrink-0" />
                        )}
                      </div>
                      <span className="inline-block mt-1 text-[10px] font-semibold text-[#536772]">
                        {arch.climate}
                      </span>
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{arch.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                      <div>
                        Size: <span className="font-mono font-semibold text-foreground">{arch.dimensions}</span>
                      </div>
                      <div>
                        Insulation: <span className="font-mono font-semibold text-foreground">{arch.insulation}</span>
                      </div>
                    </div>
                  </button>
                ))}
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
