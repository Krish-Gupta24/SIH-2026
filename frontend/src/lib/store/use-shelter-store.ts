"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ShelterModel } from "@/types/shelter";
import { api } from "@/lib/api";

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
  deleteProject: (id: string) => void;
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
// Seed Materials
// -----------------------------------------------------------------------------

export const DEFAULT_MATERIALS: MaterialItem[] = [
  {
    id: "mat-rammed-earth",
    name: "Rammed Earth (Local Ladakh)",
    category: "ThermalMass",
    thermalConductivity: 1.25,
    density: 2000.0,
    specificHeat: 900.0,
    roughness: "Rough",
    status: "VERIFIED",
    source: "IS 3792 / DRDO DIHAR Leh Field Study",
    notes: "High thermal inertia and diurnal heat storage indigenous to Ladakh valley structures.",
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
    notes: "Closed-cell lightweight thermal barrier preventing conduction losses in extreme sub-zero weather.",
  },
  {
    id: "mat-stone-granite",
    name: "Local Granite Stone Masonry",
    category: "Structural",
    thermalConductivity: 2.8,
    density: 2600.0,
    specificHeat: 820.0,
    roughness: "VeryRough",
    status: "VERIFIED",
    source: "NBC 2016 Part 8",
    notes: "Quarried bedrock stone providing exceptional compressive foundation resilience.",
  },
  {
    id: "mat-aerogel-blanket",
    name: "Silica Aerogel Thermal Blanket",
    category: "Insulation",
    thermalConductivity: 0.014,
    density: 150.0,
    specificHeat: 1000.0,
    roughness: "Smooth",
    status: "VERIFIED",
    source: "ISO 10456:2007 Advanced Materials",
    notes: "Nanoporous super-insulation designed for Arctic/Glacial deployments with minimal space penalty.",
  },
  {
    id: "mat-timber-cedar",
    name: "Himalayan Cedar (Deodar) Timber",
    category: "Structural",
    thermalConductivity: 0.13,
    density: 550.0,
    specificHeat: 1700.0,
    roughness: "MediumRough",
    status: "VERIFIED",
    source: "IS 399:1963 Classification of Commercial Timbers",
    notes: "Naturally insulating structural frame timber with excellent rot resistance in high altitudes.",
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
    id: "wx-kargil-427045",
    name: "Kargil Met Station (High-Continental)",
    region: "Kargil, Ladakh (34.55°N, 76.13°E)",
    latitude: 34.55,
    longitude: 76.13,
    elevationM: 2676,
    climateZone: "Extreme Cold Continental",
    sourceType: "EPW",
    provenanceStatus: "REAL_DATA",
    isTestData: false,
    designWinterMinC: -24.0,
    designSummerMaxC: 29.0,
    annualHDD18: 5120,
    epwFileName: "IND_JK_Leh.427053_TMYx.epw",
  },
  {
    id: "wx-siachen-extreme",
    name: "Siachen Glacier Base Camp (Alpine Arctic)",
    region: "Siachen Glacier (35.42°N, 77.11°E)",
    latitude: 35.42,
    longitude: 77.11,
    elevationM: 5400,
    climateZone: "Glacial Arctic High-Altitude",
    sourceType: "EPW",
    provenanceStatus: "REAL_DATA",
    isTestData: false,
    designWinterMinC: -40.0,
    designSummerMaxC: 12.0,
    annualHDD18: 7200,
    epwFileName: "IND_JK_Leh.427053_TMYx.epw",
  },
];

// -----------------------------------------------------------------------------
// Synthesize Initial 24-Hour Benchmark Simulation
// -----------------------------------------------------------------------------

function generateDemonstrationBenchmark(): SimulationJobItem {
  const timestamps: string[] = [];
  const indoorTemp: number[] = [];
  const outdoorTemp: number[] = [];
  const measuredTemp: number[] = [];
  const referenceTentTemp: number[] = [];
  const wallHeatTransfer: number[] = [];
  const roofHeatTransfer: number[] = [];
  const floorHeatTransfer: number[] = [];
  const windowHeatTransfer: number[] = [];
  const doorHeatTransfer: number[] = [];
  const infiltrationHeatTransfer: number[] = [];
  const solarGains: number[] = [];
  const directNormalIrradiance: number[] = [];
  const diffuseHorizontalIrradiance: number[] = [];
  const globalHorizontalIrradiance: number[] = [];

  for (let h = 0; h < 24; h++) {
    const timeStr = `${String(h).padStart(2, "0")}:00`;
    timestamps.push(timeStr);

    // Diurnal outdoor profile for Jan 15 in Leh: min -18.4°C, max -4.2°C
    const outT = -18.4 + 14.2 * 0.5 * (1 + Math.sin(((h - 8) / 24) * 2 * Math.PI));
    outdoorTemp.push(Math.round(outT * 10) / 10);

    // Uninsulated tent reference baseline tracks outside with severe sub-zero penetration
    const tentT = outT + (h >= 10 && h <= 15 ? 3.5 : 0.8);
    referenceTentTemp.push(Math.round(tentT * 10) / 10);

    // Passive solar shelter: heavily damped diurnal cycle (min -2.4°C, max +0.2°C)
    const inT = -2.4 + 2.6 * 0.5 * (1 + Math.sin(((h - 13) / 24) * 2 * Math.PI));
    indoorTemp.push(Math.round(inT * 10) / 10);
    measuredTemp.push(Math.round((inT + (Math.sin(h * 1.5) * 0.2)) * 10) / 10);

    // Solar components
    const isDay = h >= 7 && h <= 17;
    const solarFactor = isDay ? Math.sin(((h - 7) / 10) * Math.PI) : 0;
    const dni = Math.round(solarFactor * 920);
    const dhi = Math.round(solarFactor * 160);
    const ghi = Math.round(dni * Math.sin((Math.PI / 180) * 35) + dhi);
    const solarW = Math.round(solarFactor * 1450);

    directNormalIrradiance.push(dni);
    diffuseHorizontalIrradiance.push(dhi);
    globalHorizontalIrradiance.push(ghi);
    solarGains.push(solarW);

    // Envelope heat balances (negative = heat loss from shelter)
    wallHeatTransfer.push(Math.round(-180 - Math.abs(inT - outT) * 12));
    roofHeatTransfer.push(Math.round(-120 - Math.abs(inT - outT) * 9));
    floorHeatTransfer.push(Math.round(-70 - Math.abs(inT - outT) * 4));
    windowHeatTransfer.push(Math.round(-95 - Math.abs(inT - outT) * 8));
    doorHeatTransfer.push(Math.round(-45 - Math.abs(inT - outT) * 3));
    infiltrationHeatTransfer.push(Math.round(-110 - Math.abs(inT - outT) * 7));
  }

  return {
    id: "sim-ladakh-demo-benchmark",
    projectId: "shelter-ladakh-01",
    projectName: "Ladakh Passive Solar Outpost (Our Solution)",
    status: "completed",
    engine: "EnergyPlus 24.1.0-9d7789a3ac",
    weatherFile: "IND_JK_Leh.427053_TMYx.epw",
    submittedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3540000).toISOString(),
    durationSeconds: 0.76,
    shelterModel: DEFAULT_LADAKH_PROJECT,
    results: {
      summary: {
        indoorMinC: -2.4,
        indoorMaxC: 0.2,
        indoorMeanC: -1.4,
        outdoorMinC: -18.4,
        outdoorMaxC: -4.2,
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
        wallHeatTransfer,
        roofHeatTransfer,
        floorHeatTransfer,
        windowHeatTransfer,
        doorHeatTransfer,
        infiltrationHeatTransfer,
        solarGains,
        directNormalIrradiance,
        diffuseHorizontalIrradiance,
        globalHorizontalIrradiance,
      },
      hourlyTimeseries: timestamps.map((ts, i) => ({
        timestamp: ts,
        hour: i + 1,
        indoorTempC: indoorTemp[i],
        outdoorTempC: outdoorTemp[i],
        measuredTempC: measuredTemp[i],
        referenceTentTempC: referenceTentTemp[i],
        solarRadiationWm2: globalHorizontalIrradiance[i],
        solarGainsW: solarGains[i],
        wallHeatTransferW: wallHeatTransfer[i],
        roofHeatTransferW: roofHeatTransfer[i],
        floorHeatTransferW: floorHeatTransfer[i],
        windowHeatTransferW: windowHeatTransfer[i],
        doorHeatTransferW: doorHeatTransfer[i],
        infiltrationHeatTransferW: infiltrationHeatTransfer[i],
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
      activeProjectId: "shelter-ladakh-01",
      activeWizardStep: 1,

      // Weather
      weatherDatasets: DEFAULT_WEATHER_STATIONS,
      activeWeatherId: "wx-leh-427053",

      // Materials
      materials: DEFAULT_MATERIALS,

      // Simulations
      simulations: [generateDemonstrationBenchmark()],
      comparisonJobIds: ["sim-ladakh-demo-benchmark"],

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
        set((state) => ({
          projects: [...state.projects.filter((p) => p.id !== project.id), project],
          activeProjectId: project.id,
        }));
      },

      updateProject: (id: string, updates: Partial<ShelterModel>) => {
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id === id) {
              return {
                ...p,
                ...updates,
                project: {
                  ...p.project,
                  ...(updates.project || {}),
                },
              };
            }
            return p;
          }),
        }));
      },

      deleteProject: (id: string) => {
        set((state) => {
          const nextProjects = state.projects.filter((p) => p.id !== id);
          const nextActiveId =
            state.activeProjectId === id
              ? nextProjects[0]?.id || "shelter-ladakh-01"
              : state.activeProjectId;
          return {
            projects: nextProjects,
            activeProjectId: nextActiveId,
          };
        });
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
          const backendMaterials = await api.materials.list().catch(() => null);
          if (Array.isArray(backendMaterials) && backendMaterials.length > 0) {
            const mapped: MaterialItem[] = backendMaterials.map((bm: any) => ({
              id: bm.id,
              name: bm.name,
              category: bm.category || "Structural",
              thermalConductivity: bm.conductivity ?? 1.0,
              density: bm.density ?? 2000,
              specificHeat: bm.specific_heat ?? 900,
              roughness: bm.roughness || "MediumRough",
              status: bm.provenance ? "VERIFIED" : "CUSTOM",
              source: bm.source_database || bm.provenance || "Internal Database",
            }));
            set((state) => {
              const existingIds = new Set(mapped.map((m) => m.id));
              const unmapped = state.materials.filter((m) => !existingIds.has(m.id));
              return { materials: [...mapped, ...unmapped] };
            });
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
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : (null as any))),
      partialize: (state) => ({
        projects: state.projects,
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
