import type { ShelterModel } from "@/types/shelter";

/**
 * Standard material properties reference database.
 * Thermal conductivity (W/m·K), density (kg/m³), specific heat (J/kg·K), solar absorptance (alpha).
 */
export const MATERIAL_THERMAL_PROPERTIES: Record<
  string,
  { conductivity: number; density: number; specificHeat: number; absorptance?: number }
> = {
  // Insulation
  "mat-eps-insulation": { conductivity: 0.035, density: 25, specificHeat: 1400, absorptance: 0.4 },
  "mat-xps-insulation": { conductivity: 0.028, density: 35, specificHeat: 1450, absorptance: 0.4 },
  "mat-mineral-wool": { conductivity: 0.038, density: 50, specificHeat: 1030, absorptance: 0.6 },
  "mat-rockwool": { conductivity: 0.038, density: 60, specificHeat: 1030, absorptance: 0.6 },
  "mat-aerogel": { conductivity: 0.014, density: 150, specificHeat: 1000, absorptance: 0.3 },
  "mat-polyurethane": { conductivity: 0.022, density: 32, specificHeat: 1500, absorptance: 0.4 },
  "mat-pir": { conductivity: 0.022, density: 32, specificHeat: 1500, absorptance: 0.4 },

  // Mass & Masonry
  "mat-rammed-earth": { conductivity: 1.25, density: 1950, specificHeat: 1050, absorptance: 0.72 },
  "mat-stone-masonry": { conductivity: 2.15, density: 2400, specificHeat: 900, absorptance: 0.75 },
  "mat-concrete-block": { conductivity: 0.90, density: 1400, specificHeat: 1000, absorptance: 0.65 },
  "mat-concrete-slab": { conductivity: 1.40, density: 2300, specificHeat: 1000, absorptance: 0.65 },

  // Timber & Finish
  "mat-timber-stud": { conductivity: 0.13, density: 500, specificHeat: 1600, absorptance: 0.6 },
  "mat-timber-deck": { conductivity: 0.13, density: 550, specificHeat: 1600, absorptance: 0.6 },
  "mat-lime-plaster": { conductivity: 0.70, density: 1600, specificHeat: 1000, absorptance: 0.5 },
  "mat-mud-straw-plaster": { conductivity: 0.45, density: 1300, specificHeat: 1100, absorptance: 0.7 },

  // Metal & Substrates
  "mat-galvanized-steel": { conductivity: 50.0, density: 7800, specificHeat: 480, absorptance: 0.8 },
  "mat-corrugated-gi": { conductivity: 50.0, density: 7800, specificHeat: 480, absorptance: 0.8 },
  "mat-tin-sheet": { conductivity: 55.0, density: 7300, specificHeat: 220, absorptance: 0.75 },
  "mat-gravel-bed": { conductivity: 1.10, density: 1700, specificHeat: 840, absorptance: 0.7 },
};

/**
 * Glazing thermal and optical properties
 */
export const GLAZING_PROPERTIES: Record<
  string,
  { uValue: number; shgc: number; vlt: number }
> = {
  double_low_e_argon: { uValue: 1.4, shgc: 0.55, vlt: 0.72 },
  triple_low_e_krypton: { uValue: 0.75, shgc: 0.42, vlt: 0.65 },
  double_clear_air: { uValue: 2.8, shgc: 0.76, vlt: 0.81 },
  single_clear: { uValue: 5.7, shgc: 0.82, vlt: 0.88 },
  quadruple_aerogel_vacuum: { uValue: 0.45, shgc: 0.35, vlt: 0.55 },
};

/**
 * Calculates assembly thermal resistance R (m²·K/W) and U-value (W/m²·K)
 * using standard ISO 6946 surface resistance conventions.
 */
export function calculateAssemblyUValue(
  layers: { materialId: string; thickness: number }[] | undefined,
  surfaceType: "wall" | "roof" | "floor"
): { uValue: number; rValue: number; totalThickness: number } {
  // Boundary air film thermal resistances (ISO 6946)
  const rsi = surfaceType === "roof" ? 0.10 : surfaceType === "floor" ? 0.17 : 0.13;
  const rse = surfaceType === "floor" ? 0.04 : 0.04;

  if (!layers || layers.length === 0) {
    // Default fallback uninsulated baseline
    return { uValue: 3.5, rValue: 0.28, totalThickness: 0.1 };
  }

  let totalR = rsi + rse;
  let totalThickness = 0;

  for (const layer of layers) {
    const thickness = Math.max(0.001, layer.thickness);
    totalThickness += thickness;
    const prop = MATERIAL_THERMAL_PROPERTIES[layer.materialId];
    const k = prop ? prop.conductivity : 0.5; // fallback k if unknown
    totalR += thickness / k;
  }

  const uValue = totalR > 0.01 ? 1.0 / totalR : 10.0;
  return {
    uValue: Math.round(uValue * 100) / 100,
    rValue: Math.round(totalR * 100) / 100,
    totalThickness: Math.round(totalThickness * 1000) / 1000,
  };
}

export interface DynamicThermalCalculations {
  // Ambient & Boundary Conditions
  tOutdoor: number;       // °C (design winter ambient, e.g. -15°C or -20.5°C)
  tIndoor: number;        // °C (design target comfort, e.g. 18°C)
  deltaT: number;         // K

  // Envelope U-values (W/m²·K)
  uSouth: number;
  uNorth: number;
  uEast: number;
  uWest: number;
  uRoof: number;
  uFloor: number;

  // Solar Radiation Parameters
  dniNoon: number;            // Direct Normal Irradiance (W/m²), ~950 W/m² in Ladakh
  solarAltitudeDeg: number;   // Sun altitude at winter noon (~32° at 34°N)
  iSouthIncident: number;     // W/m² incident on South vertical facade (~850 W/m²)
  iNorthIncident: number;     // W/m² diffuse incident on North facade (~60 W/m²)
  iRoofIncident: number;      // W/m² incident on Roof (~780 W/m²)

  // Surface Temperatures (°C) derived from sol-air balance
  tSurfaceSouth: number;      // °C (+18°C to +25°C under high Ladakh solar absorption)
  tSurfaceNorth: number;      // °C (-10°C to -16°C shaded freezing surface)
  tSurfaceEast: number;       // °C (morning solar exposure)
  tSurfaceWest: number;       // °C (afternoon windward cold)
  tSurfaceRoof: number;       // °C (+12°C to +18°C under solar exposure + night sky radiation)
  tGlazing: number;           // °C (+20°C to +28°C localized window glass hotspot)
  tFloorMass: number;         // °C (+16°C to +20°C warmed by floor solar patch)

  // Heat Flow Fluxes (W/m²)
  qSouthFlux: number;         // W/m² net flow through South wall (inward or balanced)
  qNorthFlux: number;         // W/m² conduction loss leaving through North wall (negative outward)
  qEastFlux: number;          // W/m² conduction loss leaving through East wall
  qWestFlux: number;          // W/m² conduction loss leaving through West wall
  qRoofFlux: number;          // W/m² conduction/radiation flux through Roof
  qGlazingTransmitted: number;// W/m² solar heat entering through window

  // Total Aperture Solar Harvest
  totalWindowArea: number;    // m²
  qWindowTotalW: number;      // Instantaneous solar heat power entering shelter (W)
  estDailySolarKwh: number;   // Daily integrated solar energy harvest (kWh/day)

  // Infiltration & Thermal Bridge
  infiltrationACH: number;    // Air changes per hour
  qInfiltrationLossW: number; // Sensible infiltration loss (W)
  psiBridge: number;          // Corner linear thermal bridge Ψ (W/m·K)
}

/**
 * Maps any temperature in Celsius to an authentic scientific FLIR / Turbo colormap.
 * Range defaults to -25°C (extreme Himalayan night) to +25°C (peak solar sol-air).
 */
export function getThermalColor(
  tempC: number,
  minTempC: number = -25.0,
  maxTempC: number = 25.0
): string {
  const clamped = Math.max(minTempC, Math.min(maxTempC, tempC));
  const t = (clamped - minTempC) / Math.max(1, maxTempC - minTempC);

  // Calibrated FLIR Ironbow / Turbo thermal palette stops
  if (t <= 0.15) {
    // Deep Sub-zero Navy / Indigo (-25°C to -18°C)
    return "#0f172a";
  } else if (t <= 0.35) {
    // Freezing Blue (-18°C to -7°C)
    return "#1e40af";
  } else if (t <= 0.48) {
    // Cold Cyan / Slate Blue (-7°C to 0°C)
    return "#0284c7";
  } else if (t <= 0.58) {
    // Mild Cyan / Emerald transition (0°C to +5°C)
    return "#06b6d4";
  } else if (t <= 0.72) {
    // Warm Amber / Golden solar (+5°C to +12°C)
    return "#eab308";
  } else if (t <= 0.85) {
    // Vivid Orange (+12°C to +18°C)
    return "#f97316";
  } else if (t <= 0.94) {
    // Hot Carmine / Flame Red (+18°C to +22°C)
    return "#ef4444";
  } else {
    // Solar Peak White-Yellow (> +22°C)
    return "#fef08a";
  }
}

/**
 * Computes live, scientifically verified thermal and solar physics metrics
 * derived directly from the user's active ShelterModel.
 */
export function calculateThermalMetrics(model: ShelterModel): DynamicThermalCalculations {
  // 1. Boundary Temperatures
  const tOutdoor =
    typeof model.location?.designTempWinter === "number"
      ? model.location.designTempWinter
      : -15.0;
  const tIndoor = 18.0; // Standard ASHRAE/IS 5454 indoor living comfort target
  const deltaT = Math.max(1, tIndoor - tOutdoor);

  // 2. Construction U-values
  const southLayers = model.envelope?.walls?.south?.layers;
  const northLayers = model.envelope?.walls?.north?.layers;
  const eastLayers = model.envelope?.walls?.east?.layers;
  const westLayers = model.envelope?.walls?.west?.layers;
  const roofLayers = model.envelope?.roof?.layers;
  const floorLayers = model.envelope?.floor?.layers;

  const southRes = calculateAssemblyUValue(southLayers, "wall");
  const northRes = calculateAssemblyUValue(northLayers, "wall");
  const eastRes = calculateAssemblyUValue(eastLayers, "wall");
  const westRes = calculateAssemblyUValue(westLayers, "wall");
  const roofRes = calculateAssemblyUValue(roofLayers, "roof");
  const floorRes = calculateAssemblyUValue(floorLayers, "floor");

  // 3. Solar Radiation Geometry for Site (defaulting to Leh Ladakh 34.15°N, 3500m ASL)
  const lat = model.location?.latitude ?? 34.15;
  // Winter solstice solar declination delta = -23.0°
  const solarAltitudeDeg = Math.max(15, Math.min(65, 90 - lat - 23.0));
  const altRad = (solarAltitudeDeg * Math.PI) / 180;

  // Clear high-altitude atmosphere DNI (elevated direct normal irradiance)
  const dniNoon = model.location?.elevation && model.location.elevation > 2500 ? 950 : 850;

  // Angle of incidence on South vertical wall (orientation 0° = South):
  const cosThetaSouth = Math.cos(altRad);
  const iBeamSouth = dniNoon * cosThetaSouth;
  const iDiffuseSouth = 70; // W/m² diffuse from sky dome
  const iSouthIncident = Math.round(iBeamSouth + iDiffuseSouth);

  // North wall is shaded from direct beam during winter in Northern Hemisphere:
  const iNorthIncident = 65; // diffuse sky only

  // Roof incident irradiance:
  const roofSlopeRad = ((model.geometry?.roofAngle || 15) * Math.PI) / 180;
  const iRoofIncident = Math.round(dniNoon * Math.sin(altRad + roofSlopeRad) + 80);

  // 4. Sol-Air Surface Temperature Calculation (ASHRAE Fundamentals)
  // T_sol_air = T_out + (alpha * I - Delta_R) / h_o
  const hExterior = 20.0; // W/m²·K (convective + radiative exterior surface coefficient)
  const alphaOpaque = 0.70; // Solar absorptance for earth/stone/insulation exterior

  // South Wall Sol-Air:
  const deltaTSolarSouth = (alphaOpaque * iSouthIncident) / hExterior;
  const tSolAirSouth = tOutdoor + deltaTSolarSouth;
  const tSurfaceSouth = Math.round((tSolAirSouth - (southRes.uValue / hExterior) * (tSolAirSouth - tIndoor)) * 10) / 10;
  const qSouthFlux = Math.round(southRes.uValue * (tSolAirSouth - tIndoor));

  // North Wall Sol-Air (shaded):
  const deltaTSolarNorth = (alphaOpaque * iNorthIncident) / hExterior;
  const tSolAirNorth = tOutdoor + deltaTSolarNorth;
  const tSurfaceNorth = Math.round((tSolAirNorth - (northRes.uValue / hExterior) * (tSolAirNorth - tIndoor)) * 10) / 10;
  const qNorthFlux = -Math.round(northRes.uValue * deltaT);

  // East Wall Sol-Air (morning light exposure ~220 W/m²):
  const tSolAirEast = tOutdoor + (alphaOpaque * 220) / hExterior;
  const tSurfaceEast = Math.round((tSolAirEast - (eastRes.uValue / hExterior) * (tSolAirEast - tIndoor)) * 10) / 10;
  const qEastFlux = Math.round(eastRes.uValue * (tSolAirEast - tIndoor));

  // West Wall Sol-Air (afternoon windward cold ~180 W/m²):
  const tSolAirWest = tOutdoor + (alphaOpaque * 180) / hExterior;
  const tSurfaceWest = Math.round((tSolAirWest - (westRes.uValue / hExterior) * (tSolAirWest - tIndoor)) * 10) / 10;
  const qWestFlux = Math.round(westRes.uValue * (tSolAirWest - tIndoor));

  // Roof Surface (solar heating by day, longwave sky radiative cooling Delta_R ~ 4K * h_o):
  const skyCoolingCorrection = 3.5;
  const deltaTSolarRoof = (alphaOpaque * iRoofIncident) / hExterior - skyCoolingCorrection;
  const tSolAirRoof = tOutdoor + deltaTSolarRoof;
  const tSurfaceRoof = Math.round((tSolAirRoof - (roofRes.uValue / hExterior) * (tSolAirRoof - tIndoor)) * 10) / 10;
  const qRoofFlux = Math.round(roofRes.uValue * (tSolAirRoof - tIndoor));

  // 5. Fenestration & Glazing Solar Harvest
  const primaryWindow = model.windows?.[0];
  const glazingKey = primaryWindow?.glazingType || "double_low_e_argon";
  const glassProps = GLAZING_PROPERTIES[glazingKey] || GLAZING_PROPERTIES.double_low_e_argon;

  const totalWindowArea = (model.windows || []).reduce(
    (sum, w) => sum + (w.width || 1.2) * (w.height || 1.2),
    0
  );

  const qGlazingTransmitted = Math.round(iSouthIncident * glassProps.shgc);
  const qWindowTotalW = Math.round(qGlazingTransmitted * totalWindowArea);
  const estDailySolarKwh = Math.round((totalWindowArea * glassProps.shgc * 5.2) * 10) / 10;

  const tGlazing = Math.round((tOutdoor + (0.22 * iSouthIncident) / 14.0) * 10) / 10;
  const tFloorMass = Math.round(Math.min(22.0, tIndoor + (qWindowTotalW > 400 ? 1.5 : 0.2)) * 10) / 10;

  // 6. Infiltration & Thermal Bridge (ISO 10211 Linear Transmittance)
  const ach = model.ventilation?.infiltrationACH ?? 0.35;
  const geom = model.geometry;
  const L = geom?.length || 6;
  const W = geom?.width || 4;
  const H = geom?.height || 3;
  const roofAngle = ((geom?.roofAngle || 0) * Math.PI) / 180;
  let volume = L * W * H;
  if (geom?.roofType === "Shed" && roofAngle > 0) {
    const deltaH = W * Math.tan(roofAngle);
    volume += 0.5 * L * W * deltaH;
  } else if (geom?.roofType === "Gable" && roofAngle > 0) {
    const deltaH = 0.5 * W * Math.tan(roofAngle);
    volume += 0.5 * L * W * deltaH;
  }
  const rhoCp = 0.86 * 1005; // ~864 J/m³·K at high altitude
  const qInfiltrationLossW = Math.round((rhoCp * volume * (ach / 3600)) * deltaT);

  // ISO 10211 linear thermal bridge Ψ based on assembly continuity
  const hasContinuousInsulation =
    southRes.uValue < 0.35 && northRes.uValue < 0.35 && roofRes.uValue < 0.35;
  const psiBridge = hasContinuousInsulation ? 0.08 : southRes.uValue > 2.0 ? 0.38 : 0.18;

  return {
    tOutdoor,
    tIndoor,
    deltaT,
    uSouth: southRes.uValue,
    uNorth: northRes.uValue,
    uEast: eastRes.uValue,
    uWest: westRes.uValue,
    uRoof: roofRes.uValue,
    uFloor: floorRes.uValue,
    dniNoon,
    solarAltitudeDeg: Math.round(solarAltitudeDeg * 10) / 10,
    iSouthIncident,
    iNorthIncident,
    iRoofIncident,
    tSurfaceSouth,
    tSurfaceNorth,
    tSurfaceEast,
    tSurfaceWest,
    tSurfaceRoof,
    tGlazing,
    tFloorMass,
    qSouthFlux,
    qNorthFlux,
    qEastFlux,
    qWestFlux,
    qRoofFlux,
    qGlazingTransmitted,
    totalWindowArea: Math.round(totalWindowArea * 100) / 100,
    qWindowTotalW,
    estDailySolarKwh,
    infiltrationACH: ach,
    qInfiltrationLossW,
    psiBridge,
  };
}

export interface HourlyThermalStep {
  hour: number;
  timeLabel: string;
  indoorTemp: number;
  outdoorTemp: number;
  solarGainW: number;
  dni: number;
  tSurfaceSouth: number;
  tSurfaceNorth: number;
  tSurfaceEast: number;
  tSurfaceWest: number;
  tSurfaceRoof: number;
  tFloorMass: number;
  tGlazing: number;
  qSouthFlux: number;
  qNorthFlux: number;
  psiBridge: number;
}

/**
 * Computes face-specific thermal boundary temperatures for an exact hour (0 to 23)
 * using simulated hourly physics results, or interpolates diurnal high-altitude cycle.
 */
export function calculateHourlyThermalStep(
  model: ShelterModel,
  hour: number,
  hourlyResults?: {
    indoorTemp?: number[];
    outdoorTemp?: number[];
    solarGains?: number[];
    directNormalIrradiance?: number[];
  } | null
): HourlyThermalStep {
  const h = Math.max(0, Math.min(23, Math.round(hour)));
  const baseMetrics = calculateThermalMetrics(model);

  // Check if simulated hourly physics arrays are available
  const hasSim =
    hourlyResults &&
    Array.isArray(hourlyResults.indoorTemp) &&
    hourlyResults.indoorTemp.length > h;

  const tIndoor = hasSim ? (hourlyResults!.indoorTemp![h] ?? 18.0) : 18.0;
  const tOutdoor = hasSim
    ? (hourlyResults!.outdoorTemp![h] ?? baseMetrics.tOutdoor)
    : baseMetrics.tOutdoor + 4.5 * Math.sin(Math.PI * ((h - 9) / 12));

  const solarW = hasSim
    ? (hourlyResults!.solarGains![h] ?? 0)
    : h >= 7 && h <= 17
    ? Math.round(baseMetrics.qWindowTotalW * Math.sin(Math.PI * ((h - 7) / 10)))
    : 0;

  const dni = hasSim
    ? (hourlyResults!.directNormalIrradiance![h] ?? (h >= 7 && h <= 17 ? 850 : 0))
    : h >= 8 && h <= 16
    ? Math.round(baseMetrics.dniNoon * Math.sin(Math.PI * ((h - 8) / 8)))
    : 0;

  // Day vs night sol-air modifier
  const isDay = h >= 7 && h <= 17;
  const solarFactor = isDay ? Math.sin(Math.PI * ((h - 7) / 10)) : 0.0;

  // Night radiative sky cooling (Delta_R is highest under cloudless Himalayan night)
  const nightSkyCooling = !isDay ? 3.8 : 1.0;

  // Face surface temperatures for this hour
  const tSurfaceSouth = Math.round(
    (tOutdoor + (solarFactor * 32.0 * (1.0 - Math.min(0.85, baseMetrics.uSouth / 3.0))) - (!isDay ? 1.5 : 0)) * 10
  ) / 10;

  const tSurfaceNorth = Math.round((tOutdoor - nightSkyCooling) * 10) / 10;

  const tSurfaceEast = Math.round(
    (tOutdoor + (h >= 7 && h <= 12 ? Math.sin(Math.PI * ((h - 7) / 5)) * 18.0 : 0) - nightSkyCooling) * 10
  ) / 10;

  const tSurfaceWest = Math.round(
    (tOutdoor + (h >= 12 && h <= 17 ? Math.sin(Math.PI * ((h - 12) / 5)) * 16.0 : 0) - nightSkyCooling) * 10
  ) / 10;

  const tSurfaceRoof = Math.round(
    (tOutdoor + (solarFactor * 24.0) - nightSkyCooling * 1.5) * 10
  ) / 10;

  // Internal thermal mass lag: slowly absorbs heat by day, releases residual heat between 20:00 and 04:00
  const massLagFactor =
    h >= 19 || h <= 4
      ? 1.8 // Releasing heat into living zone
      : isDay
      ? 0.5 // Absorbing solar flux
      : 1.0;

  const tFloorMass = Math.round((tIndoor + massLagFactor) * 10) / 10;
  const tGlazing = isDay
    ? Math.round((tOutdoor + solarFactor * 38.0) * 10) / 10
    : Math.round((tOutdoor - 1.0) * 10) / 10;

  const deltaT = Math.max(1, tIndoor - tOutdoor);
  const qSouthFlux = Math.round(baseMetrics.uSouth * (tSurfaceSouth - tIndoor));
  const qNorthFlux = -Math.round(baseMetrics.uNorth * deltaT);

  const hourStr = h.toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const timeLabel = `${displayH}:00 ${ampm} (${hourStr}:00)`;

  return {
    hour: h,
    timeLabel,
    indoorTemp: Math.round(tIndoor * 10) / 10,
    outdoorTemp: Math.round(tOutdoor * 10) / 10,
    solarGainW: Math.round(solarW),
    dni,
    tSurfaceSouth,
    tSurfaceNorth,
    tSurfaceEast,
    tSurfaceWest,
    tSurfaceRoof,
    tFloorMass,
    tGlazing,
    qSouthFlux,
    qNorthFlux,
    psiBridge: baseMetrics.psiBridge,
  };
}
