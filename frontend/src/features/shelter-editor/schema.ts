import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";

export const layerSchema = z.object({
  materialId: z.string().min(1, "Material selection is required"),
  name: z.string().optional(),
  thickness: z.number().gt(0, "Thickness must be greater than 0 m").max(2.0, "Thickness cannot exceed 2.0 m"),
});

export const assemblySchema = z.object({
  constructionId: z.string().min(1, "Construction ID is required"),
  name: z.string().optional(),
  layers: z.array(layerSchema).min(1, "Assembly must have at least one layer"),
});

export const roofAssemblySchema = assemblySchema.extend({
  slope: z.number().min(0, "Roof pitch cannot be negative").max(85, "Roof pitch cannot exceed 85°"),
  overhang: z.number().min(0, "Overhang cannot be negative").max(3.0, "Overhang cannot exceed 3 m"),
  solarAbsorptance: z.number().min(0.0, "Absorptance must be >= 0").max(1.0, "Absorptance must be <= 1"),
});

export const floorAssemblySchema = assemblySchema.extend({
  groundContact: z.boolean(),
  perimeterInsulation: z.boolean(),
});

export const windowSchema = z.object({
  id: z.string().min(1, "Window ID is required"),
  wall: z.enum(["north", "south", "east", "west"]),
  positionX: z.number().min(0, "Position cannot be negative"),
  width: z.number().gt(0, "Width must be > 0 m").max(10.0, "Width exceeds structural limits"),
  height: z.number().gt(0, "Height must be > 0 m").max(5.0, "Height exceeds structural limits"),
  sillHeight: z.number().min(0, "Sill height must be >= 0 m"),
  glazingType: z.enum(["Single_Clear", "Double_LowE_Argon", "Triple_LowE_Krypton"]),
  frameType: z.enum(["Aluminum_ThermalBreak", "UPVC_Insulated", "Wood_HighPerformance"]),
  shadingOverhang: z.number().min(0, "Overhang depth cannot be negative").max(2.5, "Max overhang 2.5 m"),
});

export const doorSchema = z.object({
  id: z.string().min(1, "Door ID is required"),
  wall: z.enum(["north", "south", "east", "west"]),
  positionX: z.number().min(0, "Position cannot be negative"),
  width: z.number().gt(0, "Door width must be > 0 m").max(3.0, "Max door width 3.0 m"),
  height: z.number().gt(0, "Door height must be > 0 m").max(3.5, "Max door height 3.5 m"),
  construction: z.string().min(1, "Construction specification is required"),
  airTightness: z.enum(["Standard", "HighPerformance_Airtight"]),
});

export const thermalMassSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["FloorSlab", "InternalPartition", "InternalExposedMass"]),
  materialId: z.string().min(1, "Material is required"),
  thickness: z.number().gt(0, "Thickness must be > 0 m").max(1.0, "Max thickness 1.0 m"),
  surfaceArea: z.number().gt(0, "Surface area must be > 0 m²").max(500.0, "Area exceeds limits"),
});

export const shelterFormSchema = z.object({
  // STEP 1: Project
  project: z.object({
    id: z.string().min(1, "Project ID is required"),
    name: z.string().min(2, "Project name must be at least 2 characters").max(100, "Max 100 characters"),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    version: z.string().default("1.0.0"),
  }),

  // STEP 2: Location / Climate
  location: z.object({
    latitude: z.number().min(-90).max(90, "Latitude must be in [-90, +90]"),
    longitude: z.number().min(-180).max(180, "Longitude must be in [-180, +180]"),
    elevation: z.number().min(-500).max(9000, "Elevation must be in [-500, 9000] m"),
    region: z.string().min(2, "Region name is required"),
    climateZone: z.string().min(2, "Climate zone is required"),
    weatherSource: z.string().min(1, "Weather source dataset is required"),
    designTempWinter: z.number().optional(),
    designTempSummer: z.number().optional(),
  }),

  // STEP 3: Geometry
  geometry: z.object({
    shape: z.string().default("Rectangle"),
    length: z.number().gt(0.5, "Length must be > 0.5 m").max(100.0, "Length exceeds 100 m"),
    width: z.number().gt(0.5, "Width must be > 0.5 m").max(100.0, "Width exceeds 100 m"),
    height: z.number().gt(1.0, "Wall height must be > 1.0 m").max(20.0, "Height exceeds 20 m"),
    orientation: z.number().min(0).lt(360, "Orientation must be between 0° and 359°"),
    roofType: z.enum(["Flat", "Shed", "Gable"]),
    roofAngle: z.number().min(0, "Roof angle must be >= 0°").max(80, "Roof angle must be <= 80°"),
    floorElevation: z.number().min(0, "Floor elevation must be >= 0 m").max(5.0, "Max elevation 5 m"),
  }),

  // STEP 4: Walls
  envelopeWalls: z.object({
    north: assemblySchema,
    south: assemblySchema,
    east: assemblySchema,
    west: assemblySchema,
  }),

  // STEP 5: Roof
  roof: roofAssemblySchema,

  // STEP 6: Floor
  floor: floorAssemblySchema,

  // STEP 7: Windows
  windows: z.array(windowSchema).default([]),

  // STEP 8: Doors
  doors: z.array(doorSchema).default([]),

  // STEP 9: Thermal Mass
  thermalMass: z.array(thermalMassSchema).default([]),

  // STEP 10: Ventilation
  ventilation: z.object({
    infiltrationACH: z.number().min(0.01, "ACH must be > 0.01").max(15.0, "ACH cannot exceed 15 1/h"),
    naturalVentilationEnabled: z.boolean().default(false),
    naturalSchedule: z.enum(["Always", "DayOnly", "NightPurge", "TemperatureControlled"]).default("DayOnly"),
    mechanicalVentilationEnabled: z.boolean().default(false),
    mechanicalFlowRateLps: z.number().min(0).max(500, "Max flow 500 L/s").default(0),
    heatRecoveryEfficiency: z.number().min(0).max(1.0, "Efficiency in [0.0, 1.0]").default(0.75),
  }),

  // STEP 11: Internal Conditions
  internalLoads: z.object({
    occupantsCount: z.number().min(0, "Occupants cannot be negative").max(100, "Max 100 people"),
    activityLevelWatts: z.number().min(50, "Min 50 W/person").max(500, "Max 500 W/person").default(120),
    lightingPowerDensityWpm2: z.number().min(0).max(50, "Max lighting 50 W/m²").default(3.0),
    equipmentPowerWatts: z.number().min(0).max(10000, "Max equipment 10 kW").default(150),
    scheduleProfile: z.enum(["Continuous", "DiurnalOccupied", "Intermittent"]).default("DiurnalOccupied"),
  }),

  // STEP 12: Design Targets
  designTargets: z.object({
    comfortTempMinC: z.number().min(-10).max(25, "Min comfort must be in [-10, 25] °C").default(18.0),
    comfortTempMaxC: z.number().min(15).max(35, "Max comfort must be in [15, 35] °C").default(26.0),
    targetIndoorTempC: z.number().min(-10).max(35, "Target must be in [-10, 35] °C").default(22.0),
    comfortModel: z.string().default("DesignTargets Operational Band"),
    assumptions: z.string().default("Defined by project DesignTargets; occupant clothing and activity adjusted for site conditions."),
    applicableConditions: z.string().default("High-altitude unconditioned or passively heated cold-climate shelter."),
    maxAnnualHeatingDemandKwhM2: z.number().min(0).max(500, "Limit in [0, 500] kWh/m²").default(120.0),
    targetComfortPercent: z.number().min(0).max(100, "Percentage in [0, 100] %").default(85.0),
  }).refine((data) => data.comfortTempMinC < data.comfortTempMaxC, {
    message: "Minimum comfort temperature must be less than maximum comfort temperature",
    path: ["comfortTempMinC"],
  }),

  // STEP 13: Simulation Settings
  simulationSettings: z.object({
    engine: z.enum(["ThermoShelter Core", "OpenStudio", "ANSYS"]).default("ThermoShelter Core"),
    timestepsPerHour: z.number().min(1).max(60).default(4),
    runPeriodDays: z.number().min(1).max(365).default(3),
    startMonth: z.number().min(1).max(12).default(1),
    startDay: z.number().min(1).max(31).default(1),
    detailedComponentOutputs: z.boolean().default(true),
  }),
});

export type ShelterFormValues = z.infer<typeof shelterFormSchema>;
export type ShelterFormReturn = UseFormReturn<ShelterFormValues, any, any>;

export const defaultShelterFormValues: ShelterFormValues = {
  project: {
    id: "shelter-ladakh-01",
    name: "Ladakh High-Altitude Outpost Shelter",
    description: "Cold-climate high-altitude insulated shelter designed for extreme temperature swings in Leh, Ladakh.",
    tags: ["High-Altitude", "Extreme-Cold", "Passive-Solar", "Rammed-Earth"],
    version: "1.0.0",
  },
  location: {
    latitude: 34.1526,
    longitude: 77.5771,
    elevation: 3500.0,
    region: "Leh Ladakh, India",
    climateZone: "Cold / Extreme Alpine",
    weatherSource: "IND_JK_Leh.427053_TMYx.epw",
    designTempWinter: -20.0,
    designTempSummer: 28.0,
  },
  geometry: {
    shape: "Rectangle",
    length: 6.0,
    width: 4.0,
    height: 3.0,
    orientation: 0.0,
    roofType: "Flat",
    roofAngle: 0.0,
    floorElevation: 0.3,
  },
  envelopeWalls: {
    north: {
      constructionId: "const-north-insulated-rammed-earth",
      name: "North Insulated Rammed Earth Wall",
      layers: [
        { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.15 },
        { materialId: "mat-rammed-earth", name: "Stabilized Rammed Earth", thickness: 0.30 },
      ],
    },
    south: {
      constructionId: "const-south-insulated-rammed-earth",
      name: "South Passive Solar Absorbing Wall",
      layers: [
        { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.15 },
        { materialId: "mat-rammed-earth", name: "Stabilized Rammed Earth", thickness: 0.30 },
      ],
    },
    east: {
      constructionId: "const-east-insulated-wall",
      name: "East Protected Wall",
      layers: [
        { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.12 },
        { materialId: "mat-stone-masonry", name: "Local Granite Masonry", thickness: 0.25 },
      ],
    },
    west: {
      constructionId: "const-west-insulated-wall",
      name: "West Windward Wall",
      layers: [
        { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.15 },
        { materialId: "mat-stone-masonry", name: "Local Granite Masonry", thickness: 0.25 },
      ],
    },
  },
  roof: {
    constructionId: "const-insulated-metal-roof",
    name: "Insulated Heavy Metal Roof",
    slope: 0.0,
    overhang: 0.6,
    solarAbsorptance: 0.7,
    layers: [
      { materialId: "mat-galvanized-steel", name: "Galvanized Corrugated Steel", thickness: 0.005 },
      { materialId: "mat-eps-insulation", name: "Rigid EPS Insulation", thickness: 0.15 },
      { materialId: "mat-timber-deck", name: "Pine Wood Ceiling Deck", thickness: 0.025 },
    ],
  },
  floor: {
    constructionId: "const-insulated-concrete-floor",
    name: "Insulated Ground Slab with Thermal Mass",
    groundContact: true,
    perimeterInsulation: true,
    layers: [
      { materialId: "mat-concrete-slab", name: "Heavy Concrete Floor Slab", thickness: 0.15 },
      { materialId: "mat-xps-insulation", name: "Extruded Polystyrene Sub-Slab", thickness: 0.10 },
      { materialId: "mat-gravel-bed", name: "Crushed Stone Hardcore Sub-base", thickness: 0.15 },
    ],
  },
  windows: [
    {
      id: "win-south-01",
      wall: "south",
      positionX: 1.0,
      width: 1.8,
      height: 1.4,
      sillHeight: 0.9,
      glazingType: "Double_LowE_Argon",
      frameType: "UPVC_Insulated",
      shadingOverhang: 0.5,
    },
    {
      id: "win-south-02",
      wall: "south",
      positionX: 3.5,
      width: 1.8,
      height: 1.4,
      sillHeight: 0.9,
      glazingType: "Double_LowE_Argon",
      frameType: "UPVC_Insulated",
      shadingOverhang: 0.5,
    },
  ],
  doors: [
    {
      id: "door-east-01",
      wall: "east",
      positionX: 1.5,
      width: 0.95,
      height: 2.1,
      construction: "Airtight Thermal Break Insulated Timber Door (U=1.2)",
      airTightness: "HighPerformance_Airtight",
    },
  ],
  thermalMass: [
    {
      id: "tmass-slab-01",
      name: "High-Density Exposed Concrete Slab",
      type: "FloorSlab",
      materialId: "mat-concrete-slab",
      thickness: 0.15,
      surfaceArea: 24.0,
    },
  ],
  ventilation: {
    infiltrationACH: 0.35,
    naturalVentilationEnabled: true,
    naturalSchedule: "DayOnly",
    mechanicalVentilationEnabled: false,
    mechanicalFlowRateLps: 15.0,
    heatRecoveryEfficiency: 0.75,
  },
  internalLoads: {
    occupantsCount: 4,
    activityLevelWatts: 115,
    lightingPowerDensityWpm2: 2.8,
    equipmentPowerWatts: 180,
    scheduleProfile: "DiurnalOccupied",
  },
  designTargets: {
    comfortTempMinC: 18.0,
    comfortTempMaxC: 26.0,
    targetIndoorTempC: 22.0,
    comfortModel: "DesignTargets Operational Band",
    assumptions: "Defined by project DesignTargets; occupant clothing and activity adjusted for site conditions.",
    applicableConditions: "High-altitude unconditioned or passively heated cold-climate shelter.",
    maxAnnualHeatingDemandKwhM2: 110.0,
    targetComfortPercent: 80.0,
  },
  simulationSettings: {
    engine: "ThermoShelter Core",
    timestepsPerHour: 4,
    runPeriodDays: 3,
    startMonth: 1,
    startDay: 1,
    detailedComponentOutputs: true,
  },
};
