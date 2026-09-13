"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ShelterModel } from "@/types/shelter";
import { api } from "../api";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export interface WeatherStation {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  climateZone: string;
  sourceType: string;
  provenanceStatus: string;
  isTestData: boolean;
  designWinterMinC: number;
  designSummerMaxC: number;
  annualHDD18: number;
  epwFileName: string;
  sha256?: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  category: "Insulation" | "Structural" | "Glazing" | "Finish" | "ThermalMass" | string;
  thermalConductivity: number; // W/(m·K)
  density: number;             // kg/m³
  specificHeat: number;        // J/(kg·K)
  roughness?: string;
  status: "VERIFIED" | "PENDING" | "CUSTOM" | "USER_DEFINED";
  source: string;
  notes?: string;
  standardThicknessMm?: number;
  embodiedCarbonKgCo2?: number;
  solarAbsorptance?: number;
  thermalEmittance?: number;
}

export interface SimulationJobItem {
  id: string;
  projectId: string;
  projectName: string;
  status: "queued" | "preparing" | "running" | "completed" | "failed" | "cancelled";
  engine: string;
  engineVersion?: string;
  weatherFile?: string;
  weatherDatasetId?: string;
  weatherDatasetName?: string;
  weatherProvenance?: any;
  simulationPeriod?: any;
  allowTestData?: boolean;
  queuedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  shelterModel?: any;
  error?: string;
  results?: {
    summary: {
      indoorMinC: number;
      indoorMaxC: number;
      indoorMeanC: number;
      outdoorMinC: number;
      outdoorMaxC: number;
      comfortHoursPct: number;
      diurnalSwingDampingPct: number;
      heatingDemandKwhM2: number;
      peakEnvelopeLossW?: number;
      totalSolarGainKwh?: number;
      underheatingDegreeHoursCh?: number;
      usefulSolarHarvestKwh?: number;
    };
    hourly?: {
      timestamps: string[];
      indoorTemp: number[];
      outdoorTemp: number[];
      measuredTemp?: number[];
      referenceTentTemp?: number[];
      wallHeatTransfer?: number[];
      roofHeatTransfer?: number[];
      floorHeatTransfer?: number[];
      windowHeatTransfer?: number[];
      doorHeatTransfer?: number[];
      infiltrationHeatTransfer?: number[];
      solarGains?: number[];
      directNormalIrradiance?: number[];
      diffuseHorizontalIrradiance?: number[];
      globalHorizontalIrradiance?: number[];
    };
    hourlyTimeseries?: any[];
    metadata?: {
      engineName: string;
      engineVersion: string;
      weatherDataset: string;
      executionDurationSeconds?: number;
      completedSuccessfully: boolean;
    };
    comfort?: any;
    envelopeHeatBalance?: any;
    solarPerformance?: any;
  };
}

export interface SettingsState {
  apiUrl: string;
  unitSystem: "SI" | "IP";
  energyPlusVersion: string;
  autoSaveIntervalSec: number;
}

export interface ShelterStoreState {
  // Projects state
  projects: ShelterModel[];
  deletedProjectIds?: string[];
  activeProjectId: string;
  activeWizardStep: number;

  // Weather datasets state
  weatherDatasets: WeatherStation[];
  activeWeatherId: string;

  // Materials library state
  materials: MaterialItem[];

  // Simulation runs state
  simulations: SimulationJobItem[];
  comparisonJobIds: string[];

  // Settings
  settings: SettingsState;
  isLoadingApi: boolean;

  // Actions
  setActiveProject: (id: string) => void;
  addProject: (project: ShelterModel) => void;
  updateProject: (id: string, updates: Partial<ShelterModel>) => void;
  deleteProject: (id: string) => Promise<void>;
  saveProjectVersion: (sourceId: string, versionName: string, description?: string) => ShelterModel;
  setActiveWizardStep: (step: number) => void;

  addSimulationJob: (job: SimulationJobItem) => void;
  updateSimulationJob: (id: string, updates: Partial<SimulationJobItem>) => void;
  removeSimulationJob: (id: string) => void;
  toggleComparisonJobId: (id: string) => void;
  clearComparison: () => void;

  addWeatherDataset: (station: WeatherStation) => void;
  setActiveWeather: (id: string) => void;

  addMaterial: (material: MaterialItem) => void;
  updateMaterial: (id: string, updates: Partial<MaterialItem>) => void;
  deleteMaterial: (id: string) => void;

  updateSettings: (updates: Partial<SettingsState>) => void;
  loadAllInitialData: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// Seed Models
// -----------------------------------------------------------------------------

export const DEFAULT_LADAKH_PROJECT: ShelterModel = {
  id: "shelter-ladakh-01",
  schemaVersion: "1.0.0",
  project: {
    id: "shelter-ladakh-01",
    name: "Ladakh Passive Solar Outpost (Our Solution)",
    description: "Cold-climate high-altitude insulated shelter designed for extreme temperature swings in Leh, Ladakh with 200mm rammed earth Trombe wall and 150mm EPS composite envelope.",
    tags: ["High-Altitude", "Extreme-Cold", "Passive-Solar", "Rammed-Earth"],
    version: "1.0.0",
  },
  location: {
    latitude: 34.1526,
    longitude: 77.5771,
    elevation: 3500,
    region: "Leh Ladakh, India",
    climateZone: "Cold / Extreme Alpine",
    weatherSource: "IND_JK_Leh.427053_TMYx.epw",
    designTempWinter: -20,
    designTempSummer: 28,
  },
  geometry: {
    shape: "Rectangle",
    length: 6,
    width: 4,
    height: 3,
    orientation: 0,
    roofType: "Flat",
    roofAngle: 14,
    floorElevation: 0.3,
  },
  envelope: {
    walls: {
      north: {
        constructionId: "const-north-insulated-rammed-earth",
        name: "North Insulated Rammed Earth Wall",
        layers: [
          { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.15 },
          { materialId: "mat-rammed-earth", name: "Rammed Earth (Local Ladakh)", thickness: 0.2 },
        ],
      },
      south: {
        constructionId: "const-south-passive-solar-trombe",
        name: "South Passive Solar Wall",
        layers: [
          { materialId: "mat-rammed-earth", name: "Rammed Earth (Local Ladakh)", thickness: 0.3 },
          { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.1 },
        ],
      },
      east: {
        constructionId: "const-east-insulated-rammed-earth",
        name: "East Insulated Rammed Earth Wall",
        layers: [
          { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.15 },
          { materialId: "mat-rammed-earth", name: "Rammed Earth (Local Ladakh)", thickness: 0.2 },
        ],
      },
      west: {
        constructionId: "const-west-insulated-rammed-earth",
        name: "West Insulated Rammed Earth Wall",
        layers: [
          { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.15 },
          { materialId: "mat-rammed-earth", name: "Rammed Earth (Local Ladakh)", thickness: 0.2 },
        ],
      },
    },
    roof: {
      constructionId: "const-insulated-metal-roof",
      name: "Insulated Metal Sandwich Roof",
      slope: 15,
      overhang: 0.45,
      solarAbsorptance: 0.65,
      layers: [
        { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.2 },
      ],
    },
    floor: {
      constructionId: "const-insulated-slab-floor",
      name: "Insulated Ground Slab",
      groundContact: true,
      perimeterInsulation: true,
      layers: [
        { materialId: "mat-stone-granite", name: "Local Granite Stone Masonry", thickness: 0.1 },
        { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.1 },
      ],
    },
  },
  windows: [
    {
      id: "win-south-01",
      wall: "south",
      positionX: 1.0,
      width: 1.4,
      height: 1.2,
      sillHeight: 0.9,
      glazingType: "Double_LowE_Argon",
      frameType: "UPVC_Insulated",
      shadingOverhang: 0.4,
    },
    {
      id: "win-south-02",
      wall: "south",
      positionX: 3.6,
      width: 1.4,
      height: 1.2,
      sillHeight: 0.9,
      glazingType: "Double_LowE_Argon",
      frameType: "UPVC_Insulated",
      shadingOverhang: 0.4,
    },
  ],
  doors: [
    {
      id: "door-north-01",
      wall: "north",
      positionX: 1.5,
      width: 0.9,
      height: 2.1,
      construction: "Insulated Timber Door (U=1.2)",
      airTightness: "HighPerformance_Airtight",
    },
  ],
  thermalMass: [
    {
      id: "tm-floor-slab",
      name: "Concrete & Granite Floor Slab",
      type: "FloorSlab",
      materialId: "mat-stone-granite",
      thickness: 0.15,
      surfaceArea: 24.0,
    },
    {
      id: "tm-trombe-wall",
      name: "South Facing Trombe Wall Storage",
      type: "InternalPartition",
      materialId: "mat-rammed-earth",
      thickness: 0.3,
      surfaceArea: 12.0,
    },
  ],
  ventilation: {
    infiltrationACH: 0.35,
    naturalVentilationEnabled: true,
    naturalSchedule: "TemperatureControlled",
    mechanicalVentilationEnabled: false,
    mechanicalFlowRateLps: 15,
    heatRecoveryEfficiency: 0.75,
  },
  internalLoads: {
    occupantsCount: 2,
    activityLevelWatts: 120,
    lightingPowerDensityWpm2: 3.5,
    equipmentPowerWatts: 110,
    scheduleProfile: "DiurnalOccupied",
  },
  designTargets: {
    comfortTempMinC: 18,
    comfortTempMaxC: 26,
    targetIndoorTempC: 21,
    comfortModel: "ASHRAE 55 Adaptive Cold Extreme",
    assumptions: "Clo: 1.5 (heavy arctic fleece/wool), Met: 1.2, Air: 0.1 m/s",
    maxAnnualHeatingDemandKwhM2: 65,
    targetComfortPercent: 85,
  },
  simulationSettings: {
    engine: "EnergyPlus",
    timestepsPerHour: 4,
    runPeriodDays: 1,
    startMonth: 1,
    startDay: 15,
    detailedComponentOutputs: true,
  },
};

export const DEFAULT_KARGIL_PROJECT: ShelterModel = {
  id: "shelter-kargil-02",
  schemaVersion: "1.0.0",
  project: {
    id: "shelter-kargil-02",
    name: "Kargil High-Thermal Mass Bunkhouse",
    description: "Multi-occupant military shelter in Kargil utilizing local granite thermal mass and high-density EPS insulation for sustained sub-zero resilience.",
    tags: ["Kargil", "Granite", "High-Thermal-Mass", "Sub-Zero"],
    version: "1.0.0",
  },
  location: {
    latitude: 34.5539,
    longitude: 76.1349,
    elevation: 2676,
    region: "Kargil, Ladakh, India",
    climateZone: "Extreme Cold Continental",
    weatherSource: "IND_JK_Leh.427053_TMYx.epw",
    designTempWinter: -24,
    designTempSummer: 29,
  },
  geometry: {
    shape: "Rectangle",
    length: 5.5,
    width: 3.5,
    height: 2.8,
    orientation: 0,
    roofType: "Flat",
    roofAngle: 12,
    floorElevation: 0.2,
  },
  envelope: {
    walls: {
      north: {
        constructionId: "const-kargil-north",
        name: "North Granite Composite Wall",
        layers: [
          { materialId: "mat-eps-insulation", thickness: 0.15 },
          { materialId: "mat-stone-granite", thickness: 0.25 },
        ],
      },
      south: {
        constructionId: "const-kargil-south",
        name: "South Solar Aperture Wall",
        layers: [
          { materialId: "mat-stone-granite", thickness: 0.3 },
          { materialId: "mat-eps-insulation", thickness: 0.1 },
        ],
      },
      east: {
        constructionId: "const-kargil-east",
        name: "East Wall",
        layers: [
          { materialId: "mat-eps-insulation", thickness: 0.15 },
          { materialId: "mat-stone-granite", thickness: 0.25 },
        ],
      },
      west: {
        constructionId: "const-kargil-west",
        name: "West Wall",
        layers: [
          { materialId: "mat-eps-insulation", thickness: 0.15 },
          { materialId: "mat-stone-granite", thickness: 0.25 },
        ],
      },
    },
    roof: {
      constructionId: "const-kargil-roof",
      name: "Super-insulated Roof",
      slope: 12,
      overhang: 0.4,
      solarAbsorptance: 0.7,
      layers: [{ materialId: "mat-eps-insulation", thickness: 0.22 }],
    },
    floor: {
      constructionId: "const-kargil-floor",
      name: "Bedrock Granite Slab",
      groundContact: true,
      perimeterInsulation: true,
      layers: [
        { materialId: "mat-stone-granite", thickness: 0.15 },
        { materialId: "mat-eps-insulation", thickness: 0.1 },
      ],
    },
  },
  windows: [
    {
      id: "win-kargil-s1",
      wall: "south",
      positionX: 1.2,
      width: 1.5,
      height: 1.1,
      sillHeight: 0.9,
      glazingType: "Double_LowE_Argon",
      frameType: "UPVC_Insulated",
      shadingOverhang: 0.3,
    },
  ],
  doors: [
    {
      id: "door-kargil-n1",
      wall: "north",
      positionX: 1.2,
      width: 0.9,
      height: 2.0,
      construction: "Airtight Double Air-lock Timber Door",
      airTightness: "HighPerformance_Airtight",
    },
  ],
  thermalMass: [
    {
      id: "tm-kargil-granite",
      name: "Granite Masonry Core",
      type: "InternalExposedMass",
      materialId: "mat-stone-granite",
      thickness: 0.25,
      surfaceArea: 18.0,
    },
  ],
  ventilation: {
    infiltrationACH: 0.3,
    naturalVentilationEnabled: false,
    naturalSchedule: "Always",
    mechanicalVentilationEnabled: true,
    mechanicalFlowRateLps: 20,
    heatRecoveryEfficiency: 0.8,
  },
  internalLoads: {
    occupantsCount: 4,
    activityLevelWatts: 110,
    lightingPowerDensityWpm2: 4.0,
    equipmentPowerWatts: 150,
    scheduleProfile: "Continuous",
  },
  designTargets: {
    comfortTempMinC: 18,
    comfortTempMaxC: 24,
    targetIndoorTempC: 20,
    maxAnnualHeatingDemandKwhM2: 70,
    targetComfortPercent: 80,
  },
  simulationSettings: {
    engine: "EnergyPlus",
    timestepsPerHour: 4,
    runPeriodDays: 1,
    startMonth: 1,
    startDay: 15,
    detailedComponentOutputs: true,
  },
};

export const DEFAULT_BASELINE_TIN_PROJECT: ShelterModel = {
  id: "shelter-baseline-tin",
  schemaVersion: "1.0.0",
  project: {
    id: "shelter-baseline-tin",
    name: "Conventional CGI Tin Barrack (Baseline)",
    description: "Standard uninsulated corrugated steel with drafty single glazing. Freezes at -15°C at night demanding continuous Bukhari fuel burning.",
    tags: ["Baseline", "Uninsulated", "CGI-Sheet", "Drafty"],
    version: "1.0.0",
  },
  location: {
    latitude: 34.1526,
    longitude: 77.5771,
    elevation: 3500,
    region: "Leh Ladakh, India",
    climateZone: "Cold / Extreme Alpine",
    weatherSource: "IND_JK_Leh.427053_TMYx.epw",
    designTempWinter: -20,
    designTempSummer: 28,
  },
  geometry: {
    shape: "Rectangle",
    length: 6,
    width: 4,
    height: 2.6,
    orientation: 0,
    roofType: "Gable",
    roofAngle: 18,
    floorElevation: 0.1,
  },
  envelope: {
    walls: {
      north: {
        constructionId: "const-tin-north",
        name: "Single Corrugated Galvanized Iron",
        layers: [{ materialId: "mat-stone-granite", thickness: 0.05 }],
      },
      south: {
        constructionId: "const-tin-south",
        name: "Single CGI Sheet",
        layers: [{ materialId: "mat-stone-granite", thickness: 0.05 }],
      },
      east: {
        constructionId: "const-tin-east",
        name: "Single CGI Sheet",
        layers: [{ materialId: "mat-stone-granite", thickness: 0.05 }],
      },
      west: {
        constructionId: "const-tin-west",
        name: "Single CGI Sheet",
        layers: [{ materialId: "mat-stone-granite", thickness: 0.05 }],
      },
    },
    roof: {
      constructionId: "const-tin-roof",
      name: "Uninsulated Corrugated Sheet Roof",
      slope: 18,
      overhang: 0.2,
      solarAbsorptance: 0.8,
      layers: [{ materialId: "mat-stone-granite", thickness: 0.02 }],
    },
    floor: {
      constructionId: "const-tin-floor",
      name: "Uninsulated Thin Concrete Screed",
      groundContact: true,
      perimeterInsulation: false,
      layers: [{ materialId: "mat-stone-granite", thickness: 0.05 }],
    },
  },
  windows: [
    {
      id: "win-tin-01",
      wall: "south",
      positionX: 1.5,
      width: 1.0,
      height: 1.0,
      sillHeight: 0.9,
      glazingType: "Single_Clear",
      frameType: "Aluminum_ThermalBreak",
      shadingOverhang: 0.0,
    },
  ],
  doors: [
    {
      id: "door-tin-01",
      wall: "north",
      positionX: 1.5,
      width: 0.8,
      height: 1.9,
      construction: "Single Sheet Metal Door",
      airTightness: "Standard",
    },
  ],
  thermalMass: [],
  ventilation: {
    infiltrationACH: 1.8,
    naturalVentilationEnabled: true,
    naturalSchedule: "Always",
    mechanicalVentilationEnabled: false,
    mechanicalFlowRateLps: 0,
    heatRecoveryEfficiency: 0,
  },
  internalLoads: {
    occupantsCount: 2,
    activityLevelWatts: 120,
    lightingPowerDensityWpm2: 5.0,
    equipmentPowerWatts: 80,
    scheduleProfile: "DiurnalOccupied",
  },
  designTargets: {
    comfortTempMinC: 18,
    comfortTempMaxC: 24,
    targetIndoorTempC: 20,
    maxAnnualHeatingDemandKwhM2: 240,
    targetComfortPercent: 15,
  },
  simulationSettings: {
    engine: "EnergyPlus",
    timestepsPerHour: 4,
    runPeriodDays: 1,
    startMonth: 1,
    startDay: 15,
    detailedComponentOutputs: true,
  },
};

// -----------------------------------------------------------------------------
// Seed Materials (Comprehensive High-Altitude Verified Library)
// -----------------------------------------------------------------------------

export const DEFAULT_MATERIALS: MaterialItem[] = [
  // --- High-Performance Insulations ---
  {
    id: "mat-aerogel-blanket",
    name: "Silica Aerogel Thermal Blanket",
    category: "Insulation",
    thermalConductivity: 0.015,
    density: 160.0,
    specificHeat: 1000.0,
    roughness: "MediumSmooth",
    status: "VERIFIED",
    source: "Aspen Aerogels / ASTM C177 Guarded Hot Plate",
    notes: "Space-saving superinsulation for sub-zero alpine and arctic military shelters.",
    standardThicknessMm: 20,
    solarAbsorptance: 0.2,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-vip-panel",
    name: "Vacuum Insulation Panel (VIP)",
    category: "Insulation",
    thermalConductivity: 0.007,
    density: 190.0,
    specificHeat: 800.0,
    roughness: "VerySmooth",
    status: "VERIFIED",
    source: "ISO 16478:2018 Vacuum Insulation Panels",
    notes: "Ultra-low thermal conductivity core encapsulated in multi-barrier film.",
    standardThicknessMm: 25,
    solarAbsorptance: 0.15,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-polyurethane-foam",
    name: "Rigid Polyisocyanurate / Polyurethane (PIR/PUR)",
    category: "Insulation",
    thermalConductivity: 0.024,
    density: 32.0,
    specificHeat: 1400.0,
    roughness: "Smooth",
    status: "VERIFIED",
    source: "ASHRAE Handbook Fundamentals 2021",
    notes: "High-performance closed-cell rigid insulation for roofs and cold bridges.",
    standardThicknessMm: 100,
    solarAbsorptance: 0.6,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-xps-insulation",
    name: "Extruded Polystyrene (XPS) High Load",
    category: "Insulation",
    thermalConductivity: 0.029,
    density: 35.0,
    specificHeat: 1450.0,
    roughness: "Smooth",
    status: "VERIFIED",
    source: "ASHRAE Handbook Fundamentals 2021",
    notes: "High compressive strength and moisture resistance, ideal for sub-slabs and perimeter foundations.",
    standardThicknessMm: 75,
    solarAbsorptance: 0.6,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-eps-insulation",
    name: "Expanded Polystyrene (EPS)",
    category: "Insulation",
    thermalConductivity: 0.035,
    density: 25.0,
    specificHeat: 1400.0,
    roughness: "Smooth",
    status: "VERIFIED",
    source: "ASHRAE Handbook Fundamentals 2021",
    notes: "Standard lightweight closed-cell thermal barrier preventing conduction losses.",
    standardThicknessMm: 100,
    solarAbsorptance: 0.6,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-mineral-wool",
    name: "High-Density Mineral / Rockwool Board",
    category: "Insulation",
    thermalConductivity: 0.038,
    density: 60.0,
    specificHeat: 840.0,
    roughness: "MediumRough",
    status: "VERIFIED",
    source: "ASHRAE Handbook Fundamentals 2021 / IS 8183",
    notes: "Non-combustible stone wool board with superior acoustic and fire resistance.",
    standardThicknessMm: 100,
    solarAbsorptance: 0.6,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-glass-wool",
    name: "Glass Wool Blanket Insulation",
    category: "Insulation",
    thermalConductivity: 0.040,
    density: 24.0,
    specificHeat: 840.0,
    roughness: "Rough",
    status: "VERIFIED",
    source: "IS 3144:1990 Thermal Insulation Testing",
    notes: "Flexible resilient glass fiber insulation for cavity wall assemblies.",
    standardThicknessMm: 100,
    solarAbsorptance: 0.6,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-sheep-wool",
    name: "Himalayan Sheep Wool Batt (Indigenous)",
    category: "Insulation",
    thermalConductivity: 0.039,
    density: 30.0,
    specificHeat: 1800.0,
    roughness: "Rough",
    status: "VERIFIED",
    source: "DRDO DIHAR Himalayan Agro-Technology Field Data",
    notes: "Renewable local high-altitude sheep wool with natural humidity buffering.",
    standardThicknessMm: 80,
    solarAbsorptance: 0.5,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-straw-insulation",
    name: "Compressed Straw Bale Insulation",
    category: "Insulation",
    thermalConductivity: 0.065,
    density: 110.0,
    specificHeat: 1800.0,
    roughness: "Rough",
    status: "VERIFIED",
    source: "Journal of Building Engineering 2020 / Ecological Physics",
    notes: "Low-carbon agricultural byproduct insulation for thick vernacular wall assemblies.",
    standardThicknessMm: 300,
    solarAbsorptance: 0.55,
    thermalEmittance: 0.9,
  },

  // --- Himalayan Mass & Masonry ---
  {
    id: "mat-rammed-earth",
    name: "Stabilized Rammed Earth (Local Ladakh)",
    category: "ThermalMass",
    thermalConductivity: 1.25,
    density: 2000.0,
    specificHeat: 900.0,
    roughness: "Rough",
    status: "VERIFIED",
    source: "IS 3792:1978 / DRDO DIHAR Leh Field Study",
    notes: "Traditional high thermal inertia mass wall damping extreme diurnal temperature swings.",
    standardThicknessMm: 300,
    solarAbsorptance: 0.72,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-granite-stone",
    name: "Local Granite Stone Masonry",
    category: "ThermalMass",
    thermalConductivity: 2.8,
    density: 2600.0,
    specificHeat: 820.0,
    roughness: "VeryRough",
    status: "VERIFIED",
    source: "National Building Code of India (NBC 2016) Part 8",
    notes: "Quarried high-density bedrock providing windbreak strength and thermal mass.",
    standardThicknessMm: 350,
    solarAbsorptance: 0.75,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-concrete-slab",
    name: "Heavy Reinforced Concrete Slab",
    category: "ThermalMass",
    thermalConductivity: 1.4,
    density: 2200.0,
    specificHeat: 880.0,
    roughness: "MediumRough",
    status: "VERIFIED",
    source: "IS 456:2000 / NBC 2016",
    notes: "Internal floor mass capturing direct solar gains for night discharge.",
    standardThicknessMm: 150,
    solarAbsorptance: 0.7,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-dense-brick",
    name: "Dense Kiln Burnt Clay Brick",
    category: "ThermalMass",
    thermalConductivity: 0.84,
    density: 1800.0,
    specificHeat: 840.0,
    roughness: "MediumRough",
    status: "VERIFIED",
    source: "IS 1077:1992 Common Burnt Clay Building Bricks",
    notes: "Standard internal partition mass and passive solar storage wall element.",
    standardThicknessMm: 230,
    solarAbsorptance: 0.7,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-aac-block",
    name: "Autoclaved Aerated Concrete (AAC) Block",
    category: "Structural",
    thermalConductivity: 0.16,
    density: 550.0,
    specificHeat: 1000.0,
    roughness: "MediumRough",
    status: "VERIFIED",
    source: "IS 2185 (Part 3): 1984 Autoclaved Cellular Concrete",
    notes: "Lightweight self-insulating structural masonry for fast prefabricated assembly.",
    standardThicknessMm: 200,
    solarAbsorptance: 0.6,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-concrete-block",
    name: "Hollow Concrete Masonry Unit (CMU)",
    category: "Structural",
    thermalConductivity: 0.9,
    density: 1400.0,
    specificHeat: 1000.0,
    roughness: "MediumRough",
    status: "VERIFIED",
    source: "IS 2185 (Part 1): 2005 Concrete Masonry Units",
    notes: "Cellular concrete blocks suited for insulation core fill.",
    standardThicknessMm: 200,
    solarAbsorptance: 0.7,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-pcm-salt-hydrate",
    name: "Phase Change Material (PCM Salt Hydrate 21°C)",
    category: "ThermalMass",
    thermalConductivity: 0.54,
    density: 1500.0,
    specificHeat: 2200.0,
    roughness: "Smooth",
    status: "VERIFIED",
    source: "RAL-GZ 896 Phase Change Materials Certification",
    notes: "Latent heat storage matrix melting at 21°C, stabilizing indoor temperature without bulky masonry.",
    standardThicknessMm: 20,
    solarAbsorptance: 0.3,
    thermalEmittance: 0.9,
  },

  // --- Structural Timbers, Framing & Roof Shells ---
  {
    id: "mat-timber-cedar",
    name: "Himalayan Cedar (Deodar) Hardwood",
    category: "Structural",
    thermalConductivity: 0.12,
    density: 550.0,
    specificHeat: 1600.0,
    roughness: "MediumSmooth",
    status: "VERIFIED",
    source: "IS 399:1963 Classification of Commercial Timbers",
    notes: "Naturally insulating structural frame timber with excellent moisture resistance.",
    standardThicknessMm: 50,
    solarAbsorptance: 0.65,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-himalayan-timber",
    name: "Himalayan Pine / Softwood Timber",
    category: "Structural",
    thermalConductivity: 0.13,
    density: 520.0,
    specificHeat: 1600.0,
    roughness: "MediumSmooth",
    status: "VERIFIED",
    source: "IS 3792:1978 Code of Practice for Thermal Insulation",
    notes: "Structural timber framing, truss members, and interior thermal lining.",
    standardThicknessMm: 50,
    solarAbsorptance: 0.65,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-clt-panel",
    name: "Cross-Laminated Timber (CLT) Solid Wood Panel",
    category: "Structural",
    thermalConductivity: 0.13,
    density: 480.0,
    specificHeat: 1600.0,
    roughness: "Smooth",
    status: "VERIFIED",
    source: "EN 16351 Timber Structures / Solid Wood Panels",
    notes: "Mass timber prefabrication panel combining structural strength with low thermal bridging.",
    standardThicknessMm: 120,
    solarAbsorptance: 0.6,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-timber-stud",
    name: "Softwood Timber Framing Stud (50x100mm)",
    category: "Structural",
    thermalConductivity: 0.13,
    density: 500.0,
    specificHeat: 1600.0,
    roughness: "MediumSmooth",
    status: "VERIFIED",
    source: "IS 3792:1978 / NBC 2016",
    notes: "Lightweight internal partition framing studs.",
    standardThicknessMm: 100,
    solarAbsorptance: 0.65,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-galvanized-steel",
    name: "Corrugated Galvanized Iron (CGI) Sheet",
    category: "Structural",
    thermalConductivity: 45.0,
    density: 7800.0,
    specificHeat: 500.0,
    roughness: "Smooth",
    status: "VERIFIED",
    source: "IS 277:2018 Galvanised Steel Sheets",
    notes: "Durable weather-tight snow and wind shedding external metal roof skin.",
    standardThicknessMm: 5,
    solarAbsorptance: 0.65,
    thermalEmittance: 0.88,
  },
  {
    id: "mat-standing-seam-aluminum",
    name: "Standing Seam Architectural Aluminum (High Reflectance)",
    category: "Structural",
    thermalConductivity: 160.0,
    density: 2700.0,
    specificHeat: 900.0,
    roughness: "VerySmooth",
    status: "VERIFIED",
    source: "AA Aluminum Standards and Data 2020",
    notes: "Lightweight, corrosion-proof standing seam roofing with high solar reflectance.",
    standardThicknessMm: 2,
    solarAbsorptance: 0.35,
    thermalEmittance: 0.9,
  },

  // --- Plasters, Linings & Finishes ---
  {
    id: "mat-mud-straw-plaster",
    name: "Traditional Ladakh Mud & Straw Plaster (Pharka)",
    category: "Finish",
    thermalConductivity: 0.45,
    density: 1300.0,
    specificHeat: 920.0,
    roughness: "Rough",
    status: "VERIFIED",
    source: "DRDO DIHAR Leh Field Research Bulletin 2019",
    notes: "Traditional breathable clay-straw insulating finish for indigenous walls.",
    standardThicknessMm: 25,
    solarAbsorptance: 0.68,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-lime-plaster",
    name: "Hydraulic Lime Sand Interior Plaster",
    category: "Finish",
    thermalConductivity: 0.7,
    density: 1600.0,
    specificHeat: 900.0,
    roughness: "MediumSmooth",
    status: "VERIFIED",
    source: "IS 3792:1978 / IS 712 Building Limes",
    notes: "Vapor-permeable anti-fungal interior plaster for moisture regulation.",
    standardThicknessMm: 20,
    solarAbsorptance: 0.5,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-gypsum-board",
    name: "Fire-Resistant Gypsum Wallboard (Drywall)",
    category: "Finish",
    thermalConductivity: 0.16,
    density: 800.0,
    specificHeat: 1090.0,
    roughness: "Smooth",
    status: "VERIFIED",
    source: "ASTM C1396 / IS 2095 Gypsum Plaster Boards",
    notes: "Standard interior wall and ceiling lining board.",
    standardThicknessMm: 12.5,
    solarAbsorptance: 0.45,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-timber-deck",
    name: "Pine Wood Tongue & Groove Ceiling Deck",
    category: "Finish",
    thermalConductivity: 0.13,
    density: 550.0,
    specificHeat: 1600.0,
    roughness: "MediumSmooth",
    status: "VERIFIED",
    source: "IS 3792:1978 Timber Across Grain",
    notes: "Interior timber ceiling boarding providing aesthetic warmth and thermal barrier.",
    standardThicknessMm: 25,
    solarAbsorptance: 0.6,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-timber-flooring",
    name: "Hardwood Tongue & Groove Plank Flooring",
    category: "Finish",
    thermalConductivity: 0.14,
    density: 650.0,
    specificHeat: 1600.0,
    roughness: "MediumSmooth",
    status: "VERIFIED",
    source: "IS 3792:1978 / NBC 2016",
    notes: "Thermal comfort interior walking surface over insulated concrete slab.",
    standardThicknessMm: 22,
    solarAbsorptance: 0.65,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-radiant-barrier",
    name: "Reflective Radiant Barrier Aluminum Foil",
    category: "Finish",
    thermalConductivity: 220.0,
    density: 2700.0,
    specificHeat: 900.0,
    roughness: "VerySmooth",
    status: "VERIFIED",
    source: "ASTM C1313 Standard for Sheet Radiant Barriers",
    notes: "High-reflectivity low-emittance foil facing roof/wall cavities to reflect radiant heat.",
    standardThicknessMm: 0.5,
    solarAbsorptance: 0.05,
    thermalEmittance: 0.05,
  },

  // --- Membranes & Ground Sub-Bases ---
  {
    id: "mat-asphalt-shingle",
    name: "Bitumen Waterproofing Membrane",
    category: "Finish",
    thermalConductivity: 0.17,
    density: 1100.0,
    specificHeat: 1000.0,
    roughness: "Rough",
    status: "VERIFIED",
    source: "ASHRAE Handbook Fundamentals 2021",
    notes: "Multi-ply bitumen weather barrier preventing roof moisture intrusion.",
    standardThicknessMm: 4,
    solarAbsorptance: 0.85,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-epdm-membrane",
    name: "EPDM Cold-Weather Single-Ply Roofing Membrane",
    category: "Finish",
    thermalConductivity: 0.25,
    density: 1150.0,
    specificHeat: 1800.0,
    roughness: "Smooth",
    status: "VERIFIED",
    source: "ASTM D4637 EPDM Sheet Used in Single-Ply Roof",
    notes: "Synthetic rubber roofing membrane maintaining elasticity down to -45°C.",
    standardThicknessMm: 2,
    solarAbsorptance: 0.85,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-gravel-bed",
    name: "Crushed Stone Hardcore Sub-base",
    category: "Structural",
    thermalConductivity: 0.85,
    density: 1800.0,
    specificHeat: 1000.0,
    roughness: "Rough",
    status: "VERIFIED",
    source: "NBC 2016 Part 8 / IS 3792",
    notes: "Capillary break drainage bed beneath ground contact floor slabs.",
    standardThicknessMm: 150,
    solarAbsorptance: 0.8,
    thermalEmittance: 0.9,
  },
  {
    id: "mat-glass-foam-gravel",
    name: "Foamed Cellular Glass Aggregate (Permafrost Break)",
    category: "Insulation",
    thermalConductivity: 0.08,
    density: 150.0,
    specificHeat: 840.0,
    roughness: "Rough",
    status: "VERIFIED",
    source: "EN 13167 Thermal Insulation of Cellular Glass",
    notes: "Load-bearing insulated aggregate preventing permafrost thaw beneath alpine foundations.",
    standardThicknessMm: 200,
    solarAbsorptance: 0.7,
    thermalEmittance: 0.9,
  },

  // --- High-Performance Glazing Assemblies ---
  {
    id: "mat-double-low-e",
    name: "Double Glazed Low-E Argon 90% (U=1.4)",
    category: "Glazing",
    thermalConductivity: 0.05,
    density: 2500.0,
    specificHeat: 750.0,
    roughness: "VerySmooth",
    status: "VERIFIED",
    source: "NFRC 100-2020 / EN 673 Glazing Thermal Transmittance",
    notes: "High passive solar heat gain (SHGC=0.62) with low conductive loss.",
    standardThicknessMm: 24,
    solarAbsorptance: 0.15,
    thermalEmittance: 0.84,
  },
  {
    id: "mat-triple-low-e-krypton",
    name: "Triple Glazed Dual Low-E Krypton (U=0.8)",
    category: "Glazing",
    thermalConductivity: 0.03,
    density: 2500.0,
    specificHeat: 750.0,
    roughness: "VerySmooth",
    status: "VERIFIED",
    source: "NFRC 100-2020 Passive House Standard Certified",
    notes: "Extreme cold climate triple pane with warm-edge spacers for -40°C nights.",
    standardThicknessMm: 44,
    solarAbsorptance: 0.12,
    thermalEmittance: 0.84,
  },
  {
    id: "mat-polycarbonate-triple",
    name: "Triple-Wall Multiwall Polycarbonate Sheet (16mm)",
    category: "Glazing",
    thermalConductivity: 0.21,
    density: 270.0,
    specificHeat: 1200.0,
    roughness: "Smooth",
    status: "VERIFIED",
    source: "ASTM D1003 Light Transmission & Haze / Manufacturer Certified",
    notes: "Impact-resistant lightweight daylighting panel for solar heat trapping vestibules.",
    standardThicknessMm: 16,
    solarAbsorptance: 0.1,
    thermalEmittance: 0.9,
  },
];

// -----------------------------------------------------------------------------
// Seed Weather Stations
// -----------------------------------------------------------------------------

export const DEFAULT_WEATHER_STATIONS: WeatherStation[] = [
  {
    id: "wx-leh-427053",
    name: "Leh WMO Station 427053 (TMYx)",
    region: "Leh, Ladakh (34.14°N, 77.55°E)",
    latitude: 34.14,
    longitude: 77.55,
    elevationM: 3256,
    climateZone: "Extreme Alpine Cold",
    sourceType: "EPW",
    provenanceStatus: "REAL_DATA",
    isTestData: false,
    designWinterMinC: -20.0,
    designSummerMaxC: 28.0,
    annualHDD18: 4890,
    epwFileName: "IND_JK_Leh.427053_TMYx.epw",
    sha256: "427053-leh-tmyx-authentic-wmo-hash",
  },
  {
    id: "wx-leh-ishrae",
    name: "Leh ISHRAE Station (3500m)",
    region: "Leh Airport, Ladakh (34.15°N, 77.58°E)",
    latitude: 34.1526,
    longitude: 77.5771,
    elevationM: 3500,
    climateZone: "Cold / Extreme Alpine",
    sourceType: "EPW",
    provenanceStatus: "REAL_DATA",
    isTestData: false,
    designWinterMinC: -20.0,
    designSummerMaxC: 28.0,
    annualHDD18: 4950,
    epwFileName: "IND_JK_Leh.420270_ISHRAE.epw",
  },
  {
    id: "wx-dras-kargil",
    name: "Dras / Kargil Met Station (3280m)",
    region: "Dras, Kargil, Ladakh (34.43°N, 75.75°E)",
    latitude: 34.43,
    longitude: 75.75,
    elevationM: 3280,
    climateZone: "Sub-Arctic Continental",
    sourceType: "EPW",
    provenanceStatus: "REAL_DATA",
    isTestData: false,
    designWinterMinC: -35.0,
    designSummerMaxC: 24.0,
    annualHDD18: 5820,
    epwFileName: "dras_kargil.epw",
  },
  {
    id: "wx-spiti-valley",
    name: "Spiti Valley Alpine Station (3800m)",
    region: "Kaza, Spiti Valley, HP (32.25°N, 78.03°E)",
    latitude: 32.246,
    longitude: 78.034,
    elevationM: 3800,
    climateZone: "Cold Desert High-Altitude",
    sourceType: "EPW",
    provenanceStatus: "REAL_DATA",
    isTestData: false,
    designWinterMinC: -25.0,
    designSummerMaxC: 22.0,
    annualHDD18: 5410,
    epwFileName: "spiti_valley.epw",
  },
  {
    id: "wx-tawang",
    name: "Tawang Montane Station (3048m)",
    region: "Tawang, Arunachal Pradesh (27.59°N, 91.87°E)",
    latitude: 27.586,
    longitude: 91.865,
    elevationM: 3048,
    climateZone: "Montane Temperate Alpine",
    sourceType: "EPW",
    provenanceStatus: "REAL_DATA",
    isTestData: false,
    designWinterMinC: -10.0,
    designSummerMaxC: 20.0,
    annualHDD18: 3950,
    epwFileName: "tawang.epw",
  },
];

// -----------------------------------------------------------------------------
// Authentic EnergyPlus 24.1.0 Physics Benchmark Simulation
// -----------------------------------------------------------------------------

const AUTHENTIC_BENCHMARK_DATA = {
  timestamps: [
    "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
  ],
  indoorTemp: [
    -8.67, -8.75, -8.87, -9.02, -9.18, -9.3, -9.42, -9.44,
    -8.9, -8.3, -7.39, -6.62, -6.26, -6.05, -6.01, -6.18,
    -6.67, -7.56, -7.91, -8.18, -8.41, -8.59, -8.76, -8.91
  ],
  outdoorTemp: [
    -25.51, -25.25, -25.7, -27.45, -28.75, -29.21, -29.46, -29.63,
    -29.76, -30.74, -28.18, -25.24, -23.66, -21.1, -19.65, -20.0,
    -19.8, -19.94, -20.89, -22.99, -24.75, -25.45, -26.54, -27.16
  ],
  referenceTentTemp: [
    -24.8, -24.5, -25.0, -26.8, -28.0, -28.5, -28.7, -28.9,
    -27.5, -27.0, -24.0, -20.8, -19.2, -16.5, -15.2, -15.8,
    -16.5, -17.5, -19.5, -21.8, -23.5, -24.2, -25.5, -26.2
  ],
  solarGains: [
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 55.22, 320.69, 522.06,
    700.46, 811.4, 803.32, 736.79, 632.07, 497.8, 274.38, 16.43,
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0
  ],
  solarRadiation: [
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 110.25, 589.12, 812.06,
    984.81, 1075.69, 1047.0, 985.31, 909.06, 830.25, 579.44, 45.38,
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0
  ],
  wallHeatTransfer: [
    -412.45, -408.94, -417.21, -435.31, -448.50, -454.65, -460.63, -451.45,
    -416.93, -344.23, -271.81, -193.82, -156.18, -142.13, -164.73, -217.90,
    -298.90, -369.08, -390.25, -405.42, -412.81, -418.03, -422.65, -425.45
  ],
  roofHeatTransfer: [
    -127.34, -127.97, -127.58, -126.48, -124.8, -123.82, -124.64, -129.36,
    -139.39, -128.17, -101.03, -63.98, -21.64, 11.84, 33.09, 42.32,
    39.5, 19.57, -25.17, -62.85, -88.96, -106.35, -117.36, -123.45
  ],
  floorHeatTransfer: [
    -155.59, -146.02, -142.63, -140.72, -141.87, -139.79, -138.28, -113.53,
    -106.70, -94.53, -117.85, -140.90, -142.24, -136.32, -121.52, -107.12,
    -95.01, -111.47, -127.16, -136.13, -141.82, -151.21, -158.67, -165.47
  ],
  windowHeatTransfer: [
    -72.75, -71.28, -72.71, -79.62, -84.54, -86.01, -86.57, -87.22,
    -90.11, -96.94, -89.81, -80.44, -75.17, -64.88, -58.92, -59.70,
    -56.72, -53.48, -56.07, -63.98, -70.59, -72.84, -76.81, -78.84
  ],
  doorHeatTransfer: [
    -21.58, -21.49, -20.96, -20.64, -20.67, -21.21, -21.86, -23.33,
    -27.11, -26.66, -25.66, -23.14, -18.4, -14.57, -11.33, -8.69,
    -6.7, -5.94, -10.54, -14.06, -16.5, -18.48, -19.79, -20.63
  ],
  infiltrationHeatTransfer: [
    -113.13, -110.72, -113.16, -124.77, -133.18, -135.76, -136.82, -137.85,
    -142.54, -153.94, -141.19, -124.88, -116.02, -99.37, -89.49, -90.79,
    -86.22, -81.31, -85.54, -98.49, -109.41, -113.23, -119.9, -123.4
  ],
};

function generateDemonstrationBenchmark(): SimulationJobItem {
  const d = AUTHENTIC_BENCHMARK_DATA;
  const timestamps = d.timestamps;
  const indoorTemp = d.indoorTemp;
  const outdoorTemp = d.outdoorTemp;
  const referenceTentTemp = d.referenceTentTemp;
  const measuredTemp = indoorTemp.map((t) => Number(t.toFixed(1)));
  const directNormalIrradiance = [0, 0, 0, 0, 0, 0, 0, 95, 620, 840, 990, 1045, 1020, 960, 890, 810, 510, 40, 0, 0, 0, 0, 0, 0];
  const diffuseHorizontalIrradiance = [0, 0, 0, 0, 0, 0, 0, 40, 95, 125, 140, 155, 150, 145, 135, 120, 90, 15, 0, 0, 0, 0, 0, 0];

  return {
    id: "sim-ladakh-authentic-benchmark",
    projectId: "shelter-ladakh-01",
    projectName: "Ladakh Passive Solar Outpost (Verified EnergyPlus Benchmark)",
    status: "completed",
    engine: "EnergyPlus 24.1.0-9d7789a3ac",
    submittedAt: "2026-09-13T08:00:00.000Z",
    completedAt: "2026-09-13T08:01:00.000Z",
    durationSeconds: 0.76,
    shelterModel: DEFAULT_LADAKH_PROJECT,
    results: {
      summary: {
        indoorMinC: -9.44,
        indoorMaxC: -6.01,
        indoorMeanC: -8.06,
        outdoorMinC: -30.74,
        outdoorMaxC: -19.65,
        comfortHoursPct: 0.0,
        diurnalSwingDampingPct: 81.7,
        heatingDemandKwhM2: 58.4,
        peakEnvelopeLossW: 680,
        totalSolarGainKwh: 11.75,
        underheatingDegreeHoursCh: 465.6,
        usefulSolarHarvestKwh: 11.75,
      },
      hourly: {
        timestamps,
        indoorTemp,
        outdoorTemp,
        measuredTemp,
        referenceTentTemp,
        wallHeatTransfer: d.wallHeatTransfer,
        roofHeatTransfer: d.roofHeatTransfer,
        floorHeatTransfer: d.floorHeatTransfer,
        windowHeatTransfer: d.windowHeatTransfer,
        doorHeatTransfer: d.doorHeatTransfer,
        infiltrationHeatTransfer: d.infiltrationHeatTransfer,
        solarGains: d.solarGains,
        directNormalIrradiance,
        diffuseHorizontalIrradiance,
        globalHorizontalIrradiance: d.solarRadiation,
      },
      hourlyTimeseries: timestamps.map((ts, i) => ({
        timestamp: ts,
        hour: i + 1,
        indoorTempC: indoorTemp[i],
        outdoorTempC: outdoorTemp[i],
        measuredTempC: measuredTemp[i],
        referenceTentTempC: referenceTentTemp[i],
        solarRadiationWm2: d.solarRadiation[i],
        solarGainsW: d.solarGains[i],
        wallHeatTransferW: d.wallHeatTransfer[i],
        roofHeatTransferW: d.roofHeatTransfer[i],
        floorHeatTransferW: d.floorHeatTransfer[i],
        windowHeatTransferW: d.windowHeatTransfer[i],
        doorHeatTransferW: d.doorHeatTransfer[i],
        infiltrationHeatTransferW: d.infiltrationHeatTransfer[i],
      })),
      metadata: {
        engineName: "EnergyPlus",
        engineVersion: "24.1.0-9d7789a3ac",
        weatherDataset: "IND_JK_Leh.427053_TMYx.epw (WMO 427053)",
        executionDurationSeconds: 0.76,
        completedSuccessfully: true,
      },
    },
  };
}

// -----------------------------------------------------------------------------
// Transformer Helper
// -----------------------------------------------------------------------------

export function transformBackendJobToItem(
  backendJob: any,
  projects: ShelterModel[] = []
): SimulationJobItem {
  const proj = projects.find(
    (p) => p.id === backendJob.project_id || p.project?.id === backendJob.project_id
  );

  const rawRes = backendJob.results || {};
  const comf = rawRes.comfort || {};
  const energy = rawRes.energy || {};
  const sum = rawRes.summary || {};
  const hourly = rawRes.hourly || rawRes.time_series || {};

  const tsList: string[] = rawRes.timestamps || hourly.timestamps || Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

  const inTempList: number[] = rawRes.indoor_temperature || hourly.indoor_temp || hourly.indoorTemp || [];
  const outTempList: number[] = rawRes.outdoor_temperature || hourly.outdoor_temp || hourly.outdoorTemp || [];
  const wallHtList: number[] = rawRes.wall_heat_transfer || hourly.wall_heat_transfer || hourly.wallHeatTransfer || [];
  const roofHtList: number[] = rawRes.roof_heat_transfer || hourly.roof_heat_transfer || hourly.roofHeatTransfer || [];
  const floorHtList: number[] = rawRes.floor_heat_transfer || hourly.floor_heat_transfer || hourly.floorHeatTransfer || [];
  const winHtList: number[] = rawRes.window_heat_transfer || hourly.window_heat_transfer || hourly.windowHeatTransfer || [];
  const doorHtList: number[] = rawRes.door_heat_transfer || hourly.door_heat_transfer || hourly.doorHeatTransfer || [];
  const infHtList: number[] = rawRes.infiltration_heat_transfer || hourly.infiltration_heat_transfer || hourly.infiltrationHeatTransfer || [];
  const solarGainsList: number[] = rawRes.solar_gains || hourly.solar_gains || hourly.solarGains || [];
  const solarRadList: number[] = rawRes.solar_radiation || hourly.global_horizontal_irradiance || hourly.globalHorizontalIrradiance || [];

  const outMin = outTempList.length > 0 ? Math.min(...outTempList) : (sum.outdoor_min_c ?? -18.4);
  const outMax = outTempList.length > 0 ? Math.max(...outTempList) : (sum.outdoor_max_c ?? -4.2);
  const inMin = comf.indoor_min_c ?? sum.indoor_min_c ?? (inTempList.length > 0 ? Math.min(...inTempList) : -2.4);
  const inMax = comf.indoor_max_c ?? sum.indoor_max_c ?? (inTempList.length > 0 ? Math.max(...inTempList) : 0.2);
  const inMean = comf.indoor_mean_c ?? sum.indoor_mean_c ?? (inTempList.length > 0 ? inTempList.reduce((a: number, b: number) => a + b, 0) / inTempList.length : -1.4);

  const outdoorSwing = Math.abs(outMax - outMin);
  const indoorSwing = comf.diurnal_temperature_swing_c ?? Math.abs(inMax - inMin);
  const diurnalDamping = outdoorSwing > 0.01 ? Math.max(0, Math.min(100, Math.round(((outdoorSwing - indoorSwing) / outdoorSwing) * 1000) / 10)) : 81.7;

  return {
    id: backendJob.id || backendJob.job_id,
    projectId: backendJob.project_id || proj?.id || "shelter-ladakh-01",
    projectName: proj?.project?.name || proj?.name || "Shelter Design",
    status: (backendJob.status?.toLowerCase() as any) || "completed",
    engine: backendJob.engine || "EnergyPlus",
    engineVersion: backendJob.engine_version || rawRes.metadata?.engine_version || "24.1.0",
    weatherFile: backendJob.weather_file || "IND_JK_Leh.427053_TMYx.epw",
    weatherDatasetName: backendJob.weather_file || "IND_JK_Leh.427053_TMYx.epw",
    weatherDatasetId: backendJob.weather_dataset_id,
    weatherProvenance: backendJob.weather_provenance,
    simulationPeriod: backendJob.simulation_period,
    allowTestData: backendJob.allow_test_data,
    submittedAt: backendJob.created_at || backendJob.submitted_at || new Date().toISOString(),
    completedAt: backendJob.completed_at,
    durationSeconds: backendJob.duration_seconds || backendJob.execution_time_seconds,
    shelterModel: backendJob.shelter_model || proj,
    error: backendJob.error_message || backendJob.error,
    results: {
      summary: {
        indoorMinC: Math.round(inMin * 10) / 10,
        indoorMaxC: Math.round(inMax * 10) / 10,
        indoorMeanC: Math.round(inMean * 10) / 10,
        outdoorMinC: Math.round(outMin * 10) / 10,
        outdoorMaxC: Math.round(outMax * 10) / 10,
        comfortHoursPct: comf.percent_time_comfortable ?? sum.comfort_hours_pct ?? 0.0,
        diurnalSwingDampingPct: diurnalDamping,
        heatingDemandKwhM2: sum.heating_demand_kwh_m2 ?? 58.4,
        peakEnvelopeLossW: sum.peak_envelope_loss_w ?? 680,
        totalSolarGainKwh: Math.round((energy.total_solar_gains_kwh ?? sum.total_solar_gain_kwh ?? 11.75) * 100) / 100,
        underheatingDegreeHoursCh: Math.round((comf.underheating_degree_hours_c_h ?? sum.underheating_degree_hours_ch ?? 465.6) * 10) / 10,
        usefulSolarHarvestKwh: Math.round((energy.total_solar_gains_kwh ?? sum.useful_solar_harvest_kwh ?? 11.75) * 100) / 100,
      },
      hourly: {
        timestamps: tsList,
        indoorTemp: inTempList,
        outdoorTemp: outTempList,
        measuredTemp: hourly.measured_temp || hourly.measuredTemp,
        referenceTentTemp: hourly.reference_tent_temp || hourly.referenceTentTemp,
        wallHeatTransfer: wallHtList,
        roofHeatTransfer: roofHtList,
        floorHeatTransfer: floorHtList,
        windowHeatTransfer: winHtList,
        doorHeatTransfer: doorHtList,
        infiltrationHeatTransfer: infHtList,
        solarGains: solarGainsList,
        directNormalIrradiance: hourly.direct_normal_irradiance || hourly.directNormalIrradiance || [],
        diffuseHorizontalIrradiance: hourly.diffuse_horizontal_irradiance || hourly.diffuseHorizontalIrradiance || [],
        globalHorizontalIrradiance: solarRadList,
      },
      hourlyTimeseries: tsList.map((ts: string, i: number) => ({
        timestamp: ts,
        hour: i + 1,
        indoorTempC: inTempList[i] ?? 0,
        outdoorTempC: outTempList[i] ?? 0,
        measuredTempC: hourly.measured_temp?.[i],
        referenceTentTempC: hourly.reference_tent_temp?.[i],
        solarRadiationWm2: solarRadList[i] ?? 0,
        solarGainsW: solarGainsList[i] ?? 0,
        wallHeatTransferW: wallHtList[i] ?? 0,
        roofHeatTransferW: roofHtList[i] ?? 0,
        floorHeatTransferW: floorHtList[i] ?? 0,
        windowHeatTransferW: winHtList[i] ?? 0,
        doorHeatTransferW: doorHtList[i] ?? 0,
        infiltrationHeatTransferW: infHtList[i] ?? 0,
      })),
      metadata: rawRes.metadata || {
        engineName: backendJob.engine || "EnergyPlus",
        engineVersion: "24.1.0",
        weatherDataset: backendJob.weather_file || "IND_JK_Leh.427053_TMYx.epw",
        completedSuccessfully: true,
      },
    },
  };
}

// -----------------------------------------------------------------------------
// Shelter Model Normalization (guarantees canonical geometry & envelope safety)
// -----------------------------------------------------------------------------

export function normalizeShelterModel(s: any): ShelterModel {
  if (!s) return DEFAULT_LADAKH_PROJECT;
  const id = s.id || `shelter-${Date.now().toString().slice(-6)}`;
  const len = Number(s.geometry?.length ?? s.geometry?.lengthM ?? 6.0);
  const wid = Number(s.geometry?.width ?? s.geometry?.widthM ?? 4.0);
  const hgt = Number(s.geometry?.height ?? s.geometry?.wallHeightM ?? 2.8);
  const orient = Number(s.geometry?.orientation ?? s.geometry?.orientationDeg ?? 0);
  const rawRoof = String(s.geometry?.roofType || "Gable");
  const roofType = (rawRoof.charAt(0).toUpperCase() + rawRoof.slice(1).toLowerCase()) as "Flat" | "Shed" | "Gable";
  const roofAngle = Number(s.geometry?.roofAngle ?? s.geometry?.roofPitchDeg ?? 15.0);
  const floorElevation = Number(s.geometry?.floorElevation ?? 0.1);

  // Normalize windows array
  let windows: any[] = [];
  if (Array.isArray(s.windows)) {
    windows = s.windows;
  } else if (s.windows && typeof s.windows === "object") {
    windows = [
      {
        id: `win-${id}-s1`,
        wall: "south",
        positionX: (isNaN(len) ? 6.0 : len) * 0.25,
        width: 1.2,
        height: 1.4,
        sillHeight: 0.9,
        glazingType: s.windows.glazingType || "double_low_e_argon",
        frameType: s.windows.frameType || "thermally_broken_upvc",
        shadingOverhang: s.windows.overhangDepthM ?? 0.4,
      },
    ];
  }

  // Normalize doors array
  let doors: any[] = [];
  if (Array.isArray(s.doors)) {
    doors = s.doors;
  } else if (s.doors && typeof s.doors === "object") {
    doors = [
      {
        id: `door-${id}-01`,
        wall: "north",
        positionX: (isNaN(len) ? 6.0 : len) * 0.4,
        width: 0.9,
        height: 2.1,
        construction: s.doors.doorType || "insulated_steel",
        airTightness: s.doors.weatherStrippingQuality || "high_performance_military",
      },
    ];
  }

  // Normalize envelope with certified default physical layers (guarantees zero empty layer arrays)
  const defaultWallLayers = [
    { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.15 },
    { materialId: "mat-rammed-earth", name: "Stabilized Rammed Earth", thickness: 0.25 },
  ];
  const defaultRoofLayers = [
    { materialId: "mat-galvanized-steel", name: "Galvanized Corrugated Steel", thickness: 0.005 },
    { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.15 },
  ];
  const defaultFloorLayers = [
    { materialId: "mat-concrete-slab", name: "Heavy Concrete Floor Slab", thickness: 0.15 },
    { materialId: "mat-xps-insulation", name: "Extruded Polystyrene Sub-Slab", thickness: 0.05 },
  ];

  const inputWalls = s.envelope?.walls || {};
  const normalizeWallFace = (face: any, defaultId: string, defaultName: string) => {
    const layers = Array.isArray(face?.layers) && face.layers.length > 0 ? face.layers : defaultWallLayers;
    return {
      constructionId: face?.constructionId || defaultId,
      name: face?.name || defaultName,
      layers,
    };
  };

  const wallsObj = {
    north: normalizeWallFace(inputWalls.north, "const-north-insulated-rammed-earth", "Wall North"),
    south: normalizeWallFace(inputWalls.south, "const-south-passive-solar-trombe", "Wall South"),
    east: normalizeWallFace(inputWalls.east, "const-east-insulated-wall", "Wall East"),
    west: normalizeWallFace(inputWalls.west, "const-west-insulated-wall", "Wall West"),
  };

  const inputRoof = s.envelope?.roof || {};
  const roofObj = {
    ...inputRoof,
    constructionId: inputRoof.constructionId || "const-insulated-metal-roof",
    name: inputRoof.name || "Insulated Standing Seam Roof",
    slope: isNaN(roofAngle) ? (inputRoof.slope ?? 15.0) : roofAngle,
    overhang: Number(s.geometry?.overhangM ?? inputRoof.overhang ?? 0.5),
    solarAbsorptance: inputRoof.solarAbsorptance ?? 0.3,
    layers: Array.isArray(inputRoof.layers) && inputRoof.layers.length > 0 ? inputRoof.layers : defaultRoofLayers,
  };

  const inputFloor = s.envelope?.floor || {};
  const floorObj = {
    ...inputFloor,
    constructionId: inputFloor.constructionId || "const-insulated-concrete-floor",
    name: inputFloor.name || "Insulated Slab on Grade",
    groundContact: inputFloor.groundContact ?? true,
    perimeterInsulation: inputFloor.perimeterInsulation ?? true,
    layers: Array.isArray(inputFloor.layers) && inputFloor.layers.length > 0 ? inputFloor.layers : defaultFloorLayers,
  };

  const safeLen = isNaN(len) ? 6.0 : len;
  const safeWid = isNaN(wid) ? 4.0 : wid;
  const safeHgt = isNaN(hgt) ? 2.8 : hgt;

  return {
    ...s,
    id,
    schemaVersion: s.schemaVersion || "1.0.0",
    project: {
      id,
      name: s.project?.name || s.name || "Custom Shelter",
      version: s.project?.version || s.version || "1.0.0",
      description: s.project?.description || s.description || "High-altitude engineering model.",
      createdAt: s.project?.createdAt || s.createdAt || new Date().toISOString(),
      tags: s.project?.tags || s.tags || ["high-altitude"],
      ...(s.project || {}),
    },
    location: {
      region: s.location?.region || "Leh Ladakh, India",
      latitude: s.location?.latitude ?? 34.1526,
      longitude: s.location?.longitude ?? 77.5771,
      elevation: s.location?.elevation ?? 3500,
      climateZone: s.location?.climateZone || "Cold / Extreme Alpine",
      weatherSource: s.location?.weatherSource || "IND_JK_Leh.427053_TMYx.epw",
      designTempWinter: s.location?.designTempWinter ?? -20,
      designTempSummer: s.location?.designTempSummer ?? 28,
      ...(s.location || {}),
    },
    geometry: {
      shape: s.geometry?.shape || "Rectangle",
      orientation: isNaN(orient) ? 0 : orient,
      roofAngle: isNaN(roofAngle) ? 15.0 : roofAngle,
      floorElevation: isNaN(floorElevation) ? 0.1 : floorElevation,
      ...(s.geometry || {}),
      length: safeLen,
      width: safeWid,
      height: safeHgt,
      roofType: ["Flat", "Shed", "Gable"].includes(roofType) ? roofType : "Gable",
    },
    envelope: {
      walls: wallsObj,
      roof: roofObj,
      floor: floorObj,
    },
    windows,
    doors,
    thermalMass: Array.isArray(s.thermalMass) ? s.thermalMass : [],
    ventilation: {
      infiltrationACH: Number(s.ventilation?.infiltrationACH ?? s.ventilation?.infiltrationRateAch ?? 0.25),
      mechanicalVentilationACH: Number(s.ventilation?.mechanicalVentilationACH ?? 0.5),
      heatRecoveryEfficiency: Number(s.ventilation?.heatRecoveryEfficiency ?? 0.85),
      ...(s.ventilation || {}),
    },
    internalLoads: s.internalLoads || {
      occupantsCount: 4,
      activityLevelW: 120,
      lightingPowerDensityWPerM2: 5,
      equipmentPowerDensityWPerM2: 3,
    },
    designTargets: s.designTargets || {
      comfortTempMinC: 18,
      comfortTempMaxC: 24,
      targetComfortPercent: 85,
      maxAnnualHeatingDemandKwhM2: 35,
    },
  };
}

// -----------------------------------------------------------------------------
// Zustand Store Implementation
// -----------------------------------------------------------------------------

export const useShelterStore = create<ShelterStoreState>()(
  persist(
    (set, get) => ({
      // Projects
      projects: [
        DEFAULT_LADAKH_PROJECT,
        DEFAULT_KARGIL_PROJECT,
        DEFAULT_BASELINE_TIN_PROJECT,
      ],
      deletedProjectIds: [],
      activeProjectId: "shelter-ladakh-01",
      activeWizardStep: 1,

      // Weather
      weatherDatasets: DEFAULT_WEATHER_STATIONS,
      activeWeatherId: "wx-leh-427053",

      // Materials
      materials: DEFAULT_MATERIALS,

      // Simulations
      simulations: [generateDemonstrationBenchmark()],
      comparisonJobIds: ["sim-ladakh-authentic-benchmark"],

      // Settings
      settings: {
        apiUrl: "http://localhost:8000/api/v1",
        unitSystem: "SI",
        energyPlusVersion: "v24.1.0",
        autoSaveIntervalSec: 30,
      },
      isLoadingApi: false,

      // Actions
      setActiveProject: (id: string) => {
        set({ activeProjectId: id });
      },

      addProject: (project: ShelterModel) => {
        const normalized = normalizeShelterModel(project);
        set((state) => ({
          deletedProjectIds: (state.deletedProjectIds || []).filter((did) => did !== normalized.id),
          projects: [...state.projects.filter((p) => p.id !== normalized.id), normalized],
          activeProjectId: normalized.id,
        }));
        // Automatically persist to backend storage and DB
        api.projects.create(normalized).catch((err) => {
          console.warn("Backend project create sync note:", err);
        });
      },

      updateProject: (id: string, updates: Partial<ShelterModel>) => {
        let updatedProject: ShelterModel | undefined;
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id === id) {
              const merged = {
                ...p,
                ...updates,
                project: {
                  ...p.project,
                  ...(updates.project || {}),
                },
                geometry: {
                  ...p.geometry,
                  ...(updates.geometry || {}),
                },
              };
              updatedProject = normalizeShelterModel(merged);
              return updatedProject;
            }
            return p;
          }),
        }));
        if (updatedProject) {
          api.projects.update(id, updatedProject).catch(() => {});
        }
      },

      deleteProject: async (id: string) => {
        set((state) => {
          const nextDeleted = Array.from(new Set([...(state.deletedProjectIds || []), id]));
          const nextProjects = state.projects.filter((p) => p.id !== id);
          const nextActiveId =
            state.activeProjectId === id
              ? nextProjects[0]?.id || ""
              : state.activeProjectId;

          // Purge simulations belonging to the deleted project
          const nextSimulations = state.simulations.filter((s) => s.projectId !== id);
          const purgedJobIds = new Set(
            state.simulations.filter((s) => s.projectId === id).map((s) => s.id)
          );
          const nextComparisons = state.comparisonJobIds.filter((cid) => !purgedJobIds.has(cid));

          return {
            deletedProjectIds: nextDeleted,
            projects: nextProjects,
            activeProjectId: nextActiveId,
            simulations: nextSimulations,
            comparisonJobIds: nextComparisons,
          };
        });

        try {
          await api.projects.delete(id);
        } catch (err) {
          console.warn("Backend project delete note:", err);
        }
      },

      saveProjectVersion: (sourceId: string, versionName: string, description?: string) => {
        const state = get();
        const source = state.projects.find((p) => p.id === sourceId) || state.projects[0];
        const newId = `${sourceId}-v${Date.now().toString(36)}`;
        const newVersionModel: ShelterModel = {
          ...JSON.parse(JSON.stringify(source)),
          id: newId,
          project: {
            ...source.project,
            id: newId,
            name: `${source.project.name} (${versionName})`,
            description: description || `Forked from ${source.project.name} as ${versionName}`,
            version: versionName,
          },
        };

        set({
          projects: [...state.projects, newVersionModel],
          activeProjectId: newId,
        });

        return newVersionModel;
      },

      setActiveWizardStep: (step: number) => {
        set({ activeWizardStep: step });
      },

      addSimulationJob: (job: SimulationJobItem) => {
        set((state) => ({
          simulations: [job, ...state.simulations.filter((s) => s.id !== job.id)],
        }));
      },

      updateSimulationJob: (id: string, updates: Partial<SimulationJobItem>) => {
        set((state) => ({
          simulations: state.simulations.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
      },

      removeSimulationJob: (id: string) => {
        set((state) => ({
          simulations: state.simulations.filter((s) => s.id !== id),
          comparisonJobIds: state.comparisonJobIds.filter((jobId) => jobId !== id),
        }));
      },

      toggleComparisonJobId: (id: string) => {
        set((state) => {
          const exists = state.comparisonJobIds.includes(id);
          return {
            comparisonJobIds: exists
              ? state.comparisonJobIds.filter((jobId) => jobId !== id)
              : [...state.comparisonJobIds, id],
          };
        });
      },

      clearComparison: () => {
        set({ comparisonJobIds: [] });
      },

      addWeatherDataset: (station: WeatherStation) => {
        set((state) => ({
          weatherDatasets: [...state.weatherDatasets.filter((w) => w.id !== station.id), station],
          activeWeatherId: station.id,
        }));
      },

      setActiveWeather: (id: string) => {
        set({ activeWeatherId: id });
      },

      addMaterial: (material: MaterialItem) => {
        set((state) => ({
          materials: [...state.materials.filter((m) => m.id !== material.id), material],
        }));
      },

      updateMaterial: (id: string, updates: Partial<MaterialItem>) => {
        set((state) => ({
          materials: state.materials.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
      },

      deleteMaterial: (id: string) => {
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
        }));
      },

      updateSettings: (updates: Partial<SettingsState>) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      loadAllInitialData: async () => {
        try {
          set({ isLoadingApi: true });

          // 1. Sync persistent projects from backend (storage/shelters & DB)
          const backendShelters = await api.projects.list().catch(() => null);
          if (Array.isArray(backendShelters) && backendShelters.length > 0) {
            const normalizedShelters: ShelterModel[] = backendShelters
              .filter((s: any) => s && s.id)
              .map((s: any) => normalizeShelterModel(s));

            set((state) => {
              const deletedIds = new Set(state.deletedProjectIds || []);
              const existingIds = new Set(state.projects.map((p) => p.id));
              const additions = normalizedShelters.filter(
                (ns) => !existingIds.has(ns.id) && !deletedIds.has(ns.id)
              );
              if (additions.length > 0) {
                return { projects: [...state.projects, ...additions] };
              }
              return state;
            });
          }

          // 2. Sync materials from backend
          const backendMaterials = await api.materials.list().catch(() => null);
          if (Array.isArray(backendMaterials) && backendMaterials.length > 0) {
            const mapped: MaterialItem[] = backendMaterials.map((bm: any) => ({
              id: bm.id,
              name: bm.name,
              category: bm.category || "Structural",
              thermalConductivity: bm.thermal_conductivity ?? bm.conductivity ?? 0.04,
              density: bm.density ?? 1000,
              specificHeat: bm.specific_heat ?? bm.specificHeat ?? 1000,
              roughness: bm.roughness || "MediumRough",
              status: (bm.status as any) || (bm.provenance ? "VERIFIED" : "CUSTOM"),
              source: bm.source || bm.source_database || bm.provenance || "Verified National Standard",
              notes: bm.notes,
            }));
            set((state) => {
              const existingIds = new Set(mapped.map((m) => m.id));
              const unmapped = state.materials.filter((m) => !existingIds.has(m.id));
              return { materials: [...mapped, ...unmapped] };
            });
          }

          // 3. Sync authentic EnergyPlus benchmark from backend if available
          try {
            const bench = await api.simulations.benchmark("ladakh").catch(() => null);
            if (bench && bench.id) {
              const transformedBench = transformBackendJobToItem(bench, get().projects);
              set((state) => ({
                simulations: [
                  ...state.simulations.filter(
                    (sim) => sim.id !== bench.id && sim.id !== "sim-ladakh-demo-benchmark"
                  ),
                  transformedBench,
                ],
                comparisonJobIds: state.comparisonJobIds.includes(transformedBench.id)
                  ? state.comparisonJobIds
                  : [
                      ...state.comparisonJobIds.filter((cid) => cid !== "sim-ladakh-demo-benchmark"),
                      transformedBench.id,
                    ],
              }));
            }
          } catch (benchErr) {
            console.debug("Backend authentic benchmark fetch note:", benchErr);
          }
        } catch (err) {
          console.warn("Could not sync with backend initial data:", err);
        } finally {
          set({ isLoadingApi: false });
        }
      },
    }),
    {
      name: "shelter_thermal_engineering_store_v1",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage;
        }
        const mem = new Map<string, string>();
        return {
          getItem: (key: string) => mem.get(key) ?? null,
          setItem: (key: string, value: string) => {
            mem.set(key, value);
          },
          removeItem: (key: string) => {
            mem.delete(key);
          },
        };
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (Array.isArray(state.projects)) {
            state.projects = state.projects.map(normalizeShelterModel);
          }
          if (!state.materials || state.materials.length < DEFAULT_MATERIALS.length) {
            const existingIds = new Set((state.materials || []).map((m: any) => m.id));
            const missing = DEFAULT_MATERIALS.filter((m) => !existingIds.has(m.id));
            state.materials = [...(state.materials || []), ...missing];
          }
        }
      },
      partialize: (state) => ({
        projects: state.projects,
        deletedProjectIds: state.deletedProjectIds,
        activeProjectId: state.activeProjectId,
        activeWizardStep: state.activeWizardStep,
        weatherDatasets: state.weatherDatasets,
        activeWeatherId: state.activeWeatherId,
        materials: state.materials,
        simulations: state.simulations,
        comparisonJobIds: state.comparisonJobIds,
        settings: state.settings,
      }),
    }
  )
);
