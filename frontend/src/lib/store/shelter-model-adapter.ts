import { ShelterModel } from "@/types/shelter";
import { ShelterFormValues, defaultShelterFormValues } from "@/features/shelter-editor/schema";

/**
 * Maps 1-indexed 2D wizard step (1 to 13) to 0-indexed 3D stage (0 to 12).
 * Provides exact semantic alignment across all 13 engineering stages.
 */
export function step2dTo3d(step2d: number): number {
  const map: Record<number, number> = {
    1: 0,  // Project -> Stage 0 (Project)
    2: 1,  // Location -> Stage 1 (Location)
    3: 2,  // Geometry -> Stage 2 (Geometry)
    4: 4,  // Walls -> Stage 4 (Walls)
    5: 5,  // Roof -> Stage 5 (Roof)
    6: 6,  // Floor -> Stage 6 (Floor)
    7: 7,  // Windows -> Stage 7 (Windows)
    8: 8,  // Doors -> Stage 8 (Doors)
    9: 10, // Thermal Mass -> Stage 10 (Thermal Mass)
    10: 11,// Ventilation -> Stage 11 (Ventilation)
    11: 12,// Internal Loads -> Stage 12 (Simulation & Targets)
    12: 12,// Design Targets -> Stage 12 (Simulation & Targets)
    13: 12,// Simulation -> Stage 12 (Simulation & Targets)
  };
  return map[step2d] !== undefined ? map[step2d] : Math.max(0, Math.min(12, step2d - 1));
}

/**
 * Maps 0-indexed 3D stage (0 to 12) to 1-indexed 2D wizard step (1 to 13).
 * Provides exact semantic alignment across all 13 engineering stages.
 */
export function step3dTo2d(step3d: number): number {
  const map: Record<number, number> = {
    0: 1,  // Stage 0 (Project) -> Step 1 (Project)
    1: 2,  // Stage 1 (Location) -> Step 2 (Location)
    2: 3,  // Stage 2 (Geometry) -> Step 3 (Geometry)
    3: 3,  // Stage 3 (Orientation) -> Step 3 (Geometry - Orientation slider)
    4: 4,  // Stage 4 (Walls) -> Step 4 (Walls)
    5: 5,  // Stage 5 (Roof) -> Step 5 (Roof)
    6: 6,  // Stage 6 (Floor) -> Step 6 (Floor)
    7: 7,  // Stage 7 (Windows) -> Step 7 (Windows)
    8: 8,  // Stage 8 (Doors) -> Step 8 (Doors)
    9: 7,  // Stage 9 (Shading) -> Step 7 (Windows - Shading overhang)
    10: 9, // Stage 10 (Thermal Mass) -> Step 9 (Thermal Mass)
    11: 10,// Stage 11 (Ventilation) -> Step 10 (Ventilation)
    12: 13,// Stage 12 (Simulation) -> Step 13 (Simulation)
  };
  return map[step3d] !== undefined ? map[step3d] : Math.max(1, Math.min(13, step3d + 1));
}

/**
 * Converts a canonical ShelterModel to react-hook-form ShelterFormValues.
 *
 * ShelterModel nests walls under `envelope.walls`, `envelope.roof`, `envelope.floor`.
 * The Zod form schema uses `envelopeWalls`, `roof`, `floor` as separate top-level keys.
 */
export function modelToFormValues(model: ShelterModel): ShelterFormValues {
  if (!model) return defaultShelterFormValues;

  return {
    project: {
      id: model.project?.id || model.id || "shelter-proj",
      name: model.project?.name || "Shelter Design",
      description: model.project?.description || "",
      tags: model.project?.tags || [],
      version: model.project?.version || "1.0.0",
    },
    location: {
      latitude: model.location?.latitude ?? 34.1526,
      longitude: model.location?.longitude ?? 77.5771,
      elevation: model.location?.elevation ?? 3500,
      region: model.location?.region || "Leh Ladakh, India",
      climateZone: model.location?.climateZone || "Cold / Extreme Alpine",
      weatherSource: model.location?.weatherSource || "IND_JK_Leh.427053_TMYx.epw",
      designTempWinter: model.location?.designTempWinter ?? -20,
      designTempSummer: model.location?.designTempSummer ?? 28,
    },
    geometry: {
      shape: model.geometry?.shape || "Rectangle",
      length: model.geometry?.length ?? 6.0,
      width: model.geometry?.width ?? 4.0,
      height: model.geometry?.height ?? 3.0,
      orientation: model.geometry?.orientation ?? 0,
      roofType: (model.geometry?.roofType as any) || "Flat",
      roofAngle: model.geometry?.roofAngle ?? 14,
      floorElevation: model.geometry?.floorElevation ?? 0.3,
    },
    // Form schema splits envelope into: envelopeWalls (step 4), roof (step 5), floor (step 6)
    envelopeWalls: {
      north: model.envelope?.walls?.north || defaultShelterFormValues.envelopeWalls.north,
      south: model.envelope?.walls?.south || defaultShelterFormValues.envelopeWalls.south,
      east: model.envelope?.walls?.east || defaultShelterFormValues.envelopeWalls.east,
      west: model.envelope?.walls?.west || defaultShelterFormValues.envelopeWalls.west,
    },
    roof: model.envelope?.roof || defaultShelterFormValues.roof,
    floor: model.envelope?.floor || defaultShelterFormValues.floor,
    windows: Array.isArray(model.windows) ? model.windows : defaultShelterFormValues.windows,
    doors: Array.isArray(model.doors) ? model.doors : defaultShelterFormValues.doors,
    thermalMass: Array.isArray(model.thermalMass) ? model.thermalMass : defaultShelterFormValues.thermalMass,
    ventilation: {
      infiltrationACH: model.ventilation?.infiltrationACH ?? 0.35,
      naturalVentilationEnabled: model.ventilation?.naturalVentilationEnabled ?? true,
      naturalSchedule: (model.ventilation?.naturalSchedule as any) || "TemperatureControlled",
      mechanicalVentilationEnabled: model.ventilation?.mechanicalVentilationEnabled ?? false,
      mechanicalFlowRateLps: model.ventilation?.mechanicalFlowRateLps ?? 15,
      heatRecoveryEfficiency: model.ventilation?.heatRecoveryEfficiency ?? 0.75,
    },
    internalLoads: {
      occupantsCount: model.internalLoads?.occupantsCount ?? 2,
      activityLevelWatts: model.internalLoads?.activityLevelWatts ?? 120,
      lightingPowerDensityWpm2: model.internalLoads?.lightingPowerDensityWpm2 ?? 3.5,
      equipmentPowerWatts: model.internalLoads?.equipmentPowerWatts ?? 110,
      scheduleProfile: (model.internalLoads?.scheduleProfile as any) || "DiurnalOccupied",
    },
    designTargets: {
      comfortTempMinC: model.designTargets?.comfortTempMinC ?? 18,
      comfortTempMaxC: model.designTargets?.comfortTempMaxC ?? 26,
      targetIndoorTempC: model.designTargets?.targetIndoorTempC ?? 21,
      comfortModel: model.designTargets?.comfortModel || "ASHRAE 55 Adaptive Cold Extreme",
      assumptions: model.designTargets?.assumptions || "Clo: 1.5, Met: 1.2, Air: 0.1 m/s",
      applicableConditions: model.designTargets?.applicableConditions || "Unconditioned passive high-altitude shelter",
      maxAnnualHeatingDemandKwhM2: model.designTargets?.maxAnnualHeatingDemandKwhM2 ?? 65,
      targetComfortPercent: model.designTargets?.targetComfortPercent ?? 85,
    },
    simulationSettings: {
      engine: (model.simulationSettings?.engine as any) || "ThermoShelter Core",
      timestepsPerHour: model.simulationSettings?.timestepsPerHour ?? 4,
      runPeriodDays: model.simulationSettings?.runPeriodDays ?? 1,
      startMonth: model.simulationSettings?.startMonth ?? 1,
      startDay: model.simulationSettings?.startDay ?? 15,
      detailedComponentOutputs: model.simulationSettings?.detailedComponentOutputs ?? true,
    },
  };
}

/**
 * Converts ShelterFormValues back into a canonical ShelterModel.
 *
 * Reconstructs the `envelope` nesting from the form's flat `envelopeWalls`, `roof`, `floor` keys,
 * ensuring all unedited faces, windows, and thermal attributes are safely preserved.
 */
export function formValuesToModel(
  values: ShelterFormValues,
  baseModel?: ShelterModel
): ShelterModel {
  const base = baseModel || ({} as ShelterModel);

  return {
    ...base,
    id: values.project?.id || base.id || "shelter-model",
    schemaVersion: base.schemaVersion || "1.0.0",
    project: {
      id: values.project?.id || base.id || "shelter-model",
      name: values.project?.name || base.project?.name || "Shelter Model",
      description: values.project?.description ?? base.project?.description ?? "",
      tags: values.project?.tags || base.project?.tags || [],
      version: values.project?.version || base.project?.version || "1.0.0",
      createdAt: base.project?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    location: {
      ...base.location,
      ...values.location,
    },
    geometry: {
      ...base.geometry,
      ...values.geometry,
    },
    envelope: {
      walls: {
        north: values.envelopeWalls?.north || base.envelope?.walls?.north,
        south: values.envelopeWalls?.south || base.envelope?.walls?.south,
        east: values.envelopeWalls?.east || base.envelope?.walls?.east,
        west: values.envelopeWalls?.west || base.envelope?.walls?.west,
      },
      roof: values.roof || base.envelope?.roof,
      floor: values.floor || base.envelope?.floor,
    },
    windows: values.windows !== undefined ? values.windows : (base.windows || []),
    doors: values.doors !== undefined ? values.doors : (base.doors || []),
    thermalMass: values.thermalMass !== undefined ? values.thermalMass : (base.thermalMass || []),
    ventilation: {
      ...base.ventilation,
      ...values.ventilation,
    },
    internalLoads: {
      ...base.internalLoads,
      ...values.internalLoads,
    },
    designTargets: {
      ...base.designTargets,
      ...values.designTargets,
    },
    simulationSettings: {
      ...base.simulationSettings,
      ...values.simulationSettings,
    },
  };
}

/**
 * Converts ShelterFormValues into the backend simulation API payload shape.
 *
 * The IDF generator accepts multiple field name patterns via fallback chains:
 * - Windows: shelter.windows[] OR shelter.openings.windows[]
 * - Walls: shelter.envelope.walls.{north,...} OR shelter.envelopeWalls.{north,...}
 * - Ventilation: shelter.ventilation.infiltrationACH (camelCase supported)
 * - ThermalMass: shelter.thermalMass (camelCase supported)
 *
 * This function provides BOTH paths for maximum compatibility.
 */
export function toBackendPayload(values: ShelterFormValues): Record<string, any> {
  const floorArea = (values.geometry?.length ?? 6) * (values.geometry?.width ?? 4);
  const occupants = values.internalLoads?.occupantsCount ?? 2;
  const activityW = values.internalLoads?.activityLevelWatts ?? 120;
  const lightingWpm2 = values.internalLoads?.lightingPowerDensityWpm2 ?? 3;
  const equipmentW = values.internalLoads?.equipmentPowerWatts ?? 150;

  const designTargetsObj = {
    ...values.designTargets,
    comfortTargetMinC: values.designTargets?.comfortTempMinC ?? 18,
    comfortTargetMaxC: values.designTargets?.comfortTempMaxC ?? 26,
    targetIndoorTempC: values.designTargets?.targetIndoorTempC ?? 21,
    comfortTempMinC: values.designTargets?.comfortTempMinC ?? 18,
    comfortTempMaxC: values.designTargets?.comfortTempMaxC ?? 26,
    targetComfortPercent: values.designTargets?.targetComfortPercent ?? 85,
    comfort_temp_min_c: values.designTargets?.comfortTempMinC ?? 18,
    comfort_temp_max_c: values.designTargets?.comfortTempMaxC ?? 26,
    target_indoor_temp_c: values.designTargets?.targetIndoorTempC ?? 21,
    target_comfort_percent: values.designTargets?.targetComfortPercent ?? 85,
  };

  const simulationSettingsObj = {
    ...values.simulationSettings,
    runPeriodDays: values.simulationSettings?.runPeriodDays ?? 1,
    run_period_days: values.simulationSettings?.runPeriodDays ?? 1,
    startMonth: values.simulationSettings?.startMonth ?? 1,
    start_month: values.simulationSettings?.startMonth ?? 1,
    startDay: values.simulationSettings?.startDay ?? 15,
    start_day: values.simulationSettings?.startDay ?? 15,
    timestepsPerHour: values.simulationSettings?.timestepsPerHour ?? 4,
    timesteps_per_hour: values.simulationSettings?.timestepsPerHour ?? 4,
  };

  const internalLoadsObj = {
    ...values.internalLoads,
    occupancy: {
      peopleCount: occupants,
      sensibleGainWattsPerPerson: activityW,
      totalWatts: occupants * activityW,
    },
    lighting: {
      totalWatts: lightingWpm2 * floorArea,
      powerDensityWpm2: lightingWpm2,
    },
    equipment: {
      totalWatts: equipmentW,
    },
    occupantsCount: occupants,
    activityLevelWatts: activityW,
    lightingPowerDensityWpm2: lightingWpm2,
    equipmentPowerWatts: equipmentW,
  };

  return {
    id: values.project?.id || "shelter-model",
    project: values.project,
    location: values.location,
    geometry: {
      ...values.geometry,
      roof_type: values.geometry?.roofType,
      roof_angle: values.geometry?.roofAngle,
      floorArea: floorArea,
      volume: floorArea * (values.geometry?.height ?? 3),
    },
    envelope: {
      walls: values.envelopeWalls,
      roof: values.roof,
      floor: values.floor,
    },
    envelopeWalls: values.envelopeWalls,
    windows: values.windows || [],
    doors: values.doors || [],
    openings: {
      windows: values.windows || [],
      doors: values.doors || [],
    },
    thermalMass: values.thermalMass || [],
    thermal_mass: values.thermalMass || [],
    ventilation: values.ventilation,
    internalLoads: internalLoadsObj,
    internal_loads: internalLoadsObj,
    designTargets: designTargetsObj,
    design_targets: designTargetsObj,
    simulationSettings: simulationSettingsObj,
    simulation_settings: simulationSettingsObj,
  };
}
