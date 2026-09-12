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
  tSurfaceRoof: number;       // °C (+12°C to +18°C under solar exposure + night sky radiation)
  tGlazing: number;           // °C (+20°C to +28°C localized window glass hotspot)
  tFloorMass: number;         // °C (+16°C to +20°C warmed by floor solar patch)

  // Heat Flow Fluxes (W/m²)
  qSouthFlux: number;         // W/m² net flow through South wall (inward or balanced)
  qNorthFlux: number;         // W/m² conduction loss leaving through North wall (negative outward)
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
  // cos(theta) = cos(alt) * cos(surface_azimuth - sun_azimuth) = cos(alt) * 1
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
  // Outer surface temperature: T_so = T_sol_air - (U / h_o) * (T_sol_air - T_in)
  const tSurfaceSouth = Math.round((tSolAirSouth - (southRes.uValue / hExterior) * (tSolAirSouth - tIndoor)) * 10) / 10;
  // Conduction heat flux through south wall (positive inward into shelter):
  const qSouthFlux = Math.round(southRes.uValue * (tSolAirSouth - tIndoor));

  // North Wall Sol-Air (shaded):
  const deltaTSolarNorth = (alphaOpaque * iNorthIncident) / hExterior;
  const tSolAirNorth = tOutdoor + deltaTSolarNorth;
  // North outer surface temperature:
  const tSurfaceNorth = Math.round((tSolAirNorth - (northRes.uValue / hExterior) * (tSolAirNorth - tIndoor)) * 10) / 10;
  // North heat loss flux (negative leaving shelter):
  const qNorthFlux = -Math.round(northRes.uValue * deltaT);

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

  // Transmitted solar radiation through glazing: q = I * SHGC
  const qGlazingTransmitted = Math.round(iSouthIncident * glassProps.shgc);
  const qWindowTotalW = Math.round(qGlazingTransmitted * totalWindowArea);
  // Ladakh winter sunshine ~ 7.9 hrs, integrated daily solar harvest:
  const estDailySolarKwh = Math.round((totalWindowArea * glassProps.shgc * 5.2) * 10) / 10;

  // Window surface localized hotspot:
  const tGlazing = Math.round((tOutdoor + (0.22 * iSouthIncident) / 14.0) * 10) / 10;
  const tFloorMass = Math.round(Math.min(22.0, tIndoor + (qWindowTotalW > 400 ? 1.5 : 0.2)) * 10) / 10;

  // 6. Infiltration & Thermal Bridge
  const ach = model.ventilation?.infiltrationACH ?? 0.35;
  // Air density at 3500m elevation: rho ~ 0.86 kg/m³, Cp = 1005 J/kg·K
  const geom = model.geometry;
  const volume = (geom?.length || 6) * (geom?.width || 4) * (geom?.height || 3);
  const rhoCp = 0.86 * 1005; // ~864 J/m³·K
  const qInfiltrationLossW = Math.round((rhoCp * volume * (ach / 3600)) * deltaT);

  // Linear thermal bridge Ψ based on whether continuous insulation is present
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
    tSurfaceRoof,
    tGlazing,
    tFloorMass,
    qSouthFlux,
    qNorthFlux,
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
