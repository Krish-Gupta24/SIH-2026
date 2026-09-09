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
  orientation: number;         // Primary solar facade azimuth (0° = True South solar alignment, clockwise rotation towards West)
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

export interface RoofAssemblyModel extends AssemblyModel {
  slope: number;               // Pitch angle (°)
  overhang: number;            // Overhang projection (m)
  solarAbsorptance: number;    // Exterior surface solar absorptance (0.0 to 1.0)
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
}

export interface DesignTargetsModel {
  comfortTempMinC: number;     // Lower comfort boundary (°C), default 18°C
  comfortTempMaxC: number;     // Upper comfort boundary (°C), default 26°C
  maxAnnualHeatingDemandKwhM2: number; // Performance target limit (kWh/m²·a)
  targetComfortPercent: number; // Minimum acceptable hours in comfort band (%)
}

export interface SimulationSettingsModel {
  engine: "EnergyPlus" | "OpenStudio" | "ANSYS";
  timestepsPerHour: number;    // Timesteps per hour (1 to 60)
  runPeriodDays: number;       // Number of days to simulate (1 to 365)
  startMonth: number;          // Start month (1 to 12)
  startDay: number;            // Start day (1 to 31)
  detailedComponentOutputs: boolean;
}

export interface ShelterModel {
  id: string;
  schemaVersion: string;
  project: ProjectMeta;
  location: LocationModel;
  geometry: GeometryModel;
  envelope: EnvelopeModel;
  windows: WindowModel[];
  doors: DoorModel[];
  thermalMass: ThermalMassElement[];
  ventilation: VentilationModel;
  internalLoads: InternalLoadsModel;
  designTargets: DesignTargetsModel;
  simulationSettings: SimulationSettingsModel;
}
