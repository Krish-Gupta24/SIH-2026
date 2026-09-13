import { ShelterModel } from "@/types/shelter";
import { ShelterFormValues, defaultShelterFormValues } from "@/features/shelter-editor/schema";

/**
 * Maps 1-indexed 2D wizard step (1 to 13) to 0-indexed 3D stage (0 to 12).
 */
export function step2dTo3d(step2d: number): number {
  return Math.max(0, Math.min(12, step2d - 1));
}

/**
 * Maps 0-indexed 3D stage (0 to 12) to 1-indexed 2D wizard step (1 to 13).
 */
export function step3dTo2d(step3d: number): number {
  return Math.max(1, Math.min(13, step3d + 1));
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
    windows: model.windows && model.windows.length > 0 ? model.windows : defaultShelterFormValues.windows,
    doors: model.doors && model.doors.length > 0 ? model.doors : defaultShelterFormValues.doors,
    thermalMass: model.thermalMass || defaultShelterFormValues.thermalMass,
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
      engine: (model.simulationSettings?.engine as any) || "EnergyPlus",
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
 * Reconstructs the `envelope` nesting from the form's flat `envelopeWalls`, `roof`, `floor` keys.
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
      name: values.project?.name || "Shelter Model",
      description: values.project?.description || "",
      tags: values.project?.tags || [],
      version: values.project?.version || "1.0.0",
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
      walls: values.envelopeWalls || base.envelope?.walls,
      roof: values.roof || base.envelope?.roof,
      floor: values.floor || base.envelope?.floor,
    },
    windows: values.windows || [],
    doors: values.doors || [],
    thermalMass: values.thermalMass || [],
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
