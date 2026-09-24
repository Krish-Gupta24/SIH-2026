/**
 * Canonical ShelterModel domain interface for the frontend application.
 * Matches 1:1 with the backend schema and docs/SHELTER_MODEL.md specification.
 */

export interface ProjectMeta {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  version: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;          // Owner/Author user ID for shelter access control & isolation
  isSystemPreset?: boolean; // True for standard reference baseline shelters visible across all accounts
}

export interface LocationModel {
  latitude: number;            // Degrees North (-90 to +90)
  longitude: number;           // Degrees East (-180 to +180)
  elevation: number;           // Meters above sea level (m)
  region: string;              // E.g. "Leh Ladakh, India"
  climateZone: string;         // E.g. "Cold / Extreme Alpine"
  weatherSource: string;       // EPW file path or identifier
  designTempWinter?: number;   // 99.6% design temp (°C)
  designTempSummer?: number;   // 0.4% design temp (°C)
}

export interface GeometryModel {
  shape: string;               // E.g. "Rectangle"
  length: number;              // Length in meters (m)
  width: number;               // Width in meters (m)
  height: number;              // Height in meters (m)
  orientation: number;         // Building North Axis azimuth (0° = True North aligned, primary solar facade faces True South; rotates clockwise 0°-359°)
  roofType: "Flat" | "Shed" | "Gable";
  roofAngle: number;           // Pitch angle in degrees (°)
  floorElevation: number;      // Floor height above grade (m)
}

export interface LayerModel {
  materialId: string;          // Material identifier (e.g. "mat-eps-insulation")
  name?: string;
  thickness: number;           // Layer thickness in meters (m)
}

export interface AssemblyModel {
  constructionId: string;
  name?: string;
  layers: LayerModel[];
}

export interface RoofSolarPanelsConfig {
  enabled: boolean;
  panelCount: number;             // Number of modules (e.g. 4 to 16)
  panelWattageW: number;          // Rated power per module in Watts (e.g. 400 Wp)
  panelEfficiencyPct: number;     // e.g. 21.5%
  panelAreaM2?: number;           // Total active PV collector area (m²)
  tiltAngleDeg?: number;          // Racking tilt angle relative to horizon (°)
  systemCapacityKw?: number;      // Calculated total rated capacity (kWp)
  coverageRatioPct?: number;      // % of roof area occupied by PV modules
  mountingType?: "FlushMount" | "BallastedRacking" | "UnistrutElevated";
}

export interface WindowSolarPaneConfig {
  enabled: boolean;
  transparencyPct: number;        // Visible light transmittance VLT % (e.g. 20% to 50%)
  powerDensityWpM2: number;       // Peak power density per unit glass area in Wp/m² (e.g. 60 to 120 Wp/m²)
  efficiencyPct: number;          // PV cell efficiency % (e.g. 10% to 15%)
  shgc?: number;                  // Solar heat gain coefficient with BIPV coating (e.g. 0.32)
  uValue?: number;                // Thermal transmittance W/m²K (e.g. 1.2 W/m²K)
  capacityWatts?: number;         // Calculated peak electrical capacity (Watts)
}

export interface RoofAssemblyModel extends AssemblyModel {
  slope: number;               // Pitch angle (°)
  overhang: number;            // Overhang projection (m)
  solarAbsorptance: number;    // Exterior surface solar absorptance (0.0 to 1.0)
  solarPanels?: RoofSolarPanelsConfig;
}

export interface FloorAssemblyModel extends AssemblyModel {
  groundContact: boolean;      // True if slab on grade / ground interface
  perimeterInsulation: boolean;
}

export interface EnvelopeModel {
  walls: {
    north: AssemblyModel;
    south: AssemblyModel;
    east: AssemblyModel;
    west: AssemblyModel;
  };
  roof: RoofAssemblyModel;
  floor: FloorAssemblyModel;
}

export interface WindowModel {
  id: string;
  wall: "north" | "south" | "east" | "west";
  positionX: number;           // Distance from left wall corner (m)
  width: number;               // Window width (m)
  height: number;              // Window height (m)
  sillHeight: number;          // Height from floor to bottom of window (m)
  glazingType: "Single_Clear" | "Double_LowE_Argon" | "Triple_LowE_Krypton";
  frameType: "Aluminum_ThermalBreak" | "UPVC_Insulated" | "Wood_HighPerformance";
  shadingOverhang: number;     // Depth of external shading overhang (m)
  solarPane?: WindowSolarPaneConfig;
}

export interface DoorModel {
  id: string;
  wall: "north" | "south" | "east" | "west";
  positionX: number;           // Distance from left wall corner (m)
  width: number;               // Door width (m)
  height: number;              // Door height (m)
  construction: string;        // E.g. "Insulated Timber Door (U=1.4)"
  airTightness: "Standard" | "HighPerformance_Airtight";
}

export interface ThermalMassElement {
  id: string;
  name: string;
  type: "FloorSlab" | "InternalPartition" | "InternalExposedMass";
  materialId: string;
  thickness: number;           // Thickness in meters (m)
  surfaceArea: number;         // Exposed surface area (m²)
}

export interface VentilationModel {
  infiltrationACH: number;     // Air changes per hour at ambient pressure (1/h)
  naturalVentilationEnabled: boolean;
  naturalSchedule: "Always" | "DayOnly" | "NightPurge" | "TemperatureControlled";
  mechanicalVentilationEnabled: boolean;
  mechanicalFlowRateLps: number; // Mechanical flow rate (L/s)
  heatRecoveryEfficiency: number; // HRV/ERV sensible recovery efficiency (0.0 to 1.0)
}

export interface InternalLoadsModel {
  occupantsCount: number;      // Number of people
  activityLevelWatts: number;  // Metabolic heat gain (W/person)
  lightingPowerDensityWpm2: number; // Lighting density (W/m²)
  equipmentPowerWatts: number; // Plug load equipment total (W)
  scheduleProfile: "Continuous" | "DiurnalOccupied" | "Intermittent";
  occupancy?: {
    peopleCount: number;
    sensibleGainWattsPerPerson: number;
    totalWatts: number;
  };
  lighting?: {
    totalWatts: number;
    powerDensityWpm2?: number;
  };
  equipment?: {
    totalWatts: number;
  };
}

export interface DesignTargetsModel {
  comfortTempMinC: number;     // Lower comfort boundary (°C), default 18°C
  comfortTempMaxC: number;     // Upper comfort boundary (°C), default 26°C
  comfortTargetMinC?: number;  // Canonical backend alias
  comfortTargetMaxC?: number;  // Canonical backend alias
  targetIndoorTempC?: number;  // Target indoor operative temperature (°C), default 21°C
  comfortModel?: string;       // Formal standard or model name (e.g. ASHRAE 55 Adaptive)
  assumptions?: string;        // Comfort assumptions (clothing clo, metabolic rate, air speed)
  applicableConditions?: string; // Applicable operational conditions
  maxAnnualHeatingDemandKwhM2: number; // Performance target limit (kWh/m²·a)
  targetComfortPercent: number; // Minimum acceptable hours in comfort band (%)
}

export interface SimulationSettingsModel {
  engine: "ThermoShelter Core" | "OpenStudio" | "ANSYS";
  timestepsPerHour: number;    // Timesteps per hour (1 to 60)
  runPeriodDays: number;       // Number of days to simulate (1 to 365)
  startMonth: number;          // Start month (1 to 12)
  startDay: number;            // Start day (1 to 31)
  detailedComponentOutputs: boolean;
}

export interface ShelterModel {
  id: string;
  name?: string;
  userId?: string;
  isSystemPreset?: boolean;
  schemaVersion: string;
  project: ProjectMeta;
  location: LocationModel;
  geometry: GeometryModel;
  envelope: EnvelopeModel;
  envelopeWalls?: EnvelopeModel["walls"]; // Top-level fallback alias for backend compatibility
  windows: WindowModel[];
  doors: DoorModel[];
  openings?: {
    windows: WindowModel[];
    doors: DoorModel[];
  };
  thermalMass: ThermalMassElement[];
  ventilation: VentilationModel;
  internalLoads: InternalLoadsModel;
  designTargets: DesignTargetsModel;
  simulationSettings: SimulationSettingsModel;
}

