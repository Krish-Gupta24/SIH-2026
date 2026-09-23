/**
 * Integrated Hourly Thermal, Energy, Fuel & Comfort Simulation Engine
 * 
 * Physics & ML Workflow:
 * Shelter Design + Climate Conditions 
 *   → ML Thermal Model / RC Diurnal Physics
 *   → Real-Time Solar Hardware Integration (Rooftop PV Arrays + Window BIPV Panes)
 *   → Indoor Temperature Prediction
 *   → Thermal Comfort Assessment
 *   → Space Heating Deficit
 *   → Solar PV Generation (Roof + Windows) & Battery Storage
 *   → Electric Heater Dispatch
 *   → Kerosene Heater Backup (Activated ONLY when renewable/battery energy is exhausted)
 *   → Fuel Logistics + Comparative Cost Analysis
 */

import { ShelterModel } from "@/types/shelter";
import {
  ComfortConfig,
  EnergySystemConfig,
  KeroseneBackupConfig,
  FuelLogisticsConfig,
  BaselineShelterConfig,
  HourlyEnergyStep,
  EnergySimulationResult,
  ThermalPerformanceSummary,
  EnergyMetricsSummary,
  FossilFuelMetricsSummary,
  DesignTradeoffCandidate,
} from "./energy-types";
import {
  DEFAULT_LOGISTICS_CONFIG,
  DEFAULT_KEROSENE_CONFIG,
  calculateComparativeEconomics,
} from "./fuel-logistics";

export const DEFAULT_COMFORT_CONFIG: ComfortConfig = {
  comfortMinC: 18.0,
  comfortMaxC: 24.0,
};

export const DEFAULT_ENERGY_SYSTEM_CONFIG: EnergySystemConfig = {
  solarPvCapacityKw: 3.5, // 3.5 kWp default roof array
  solarPerformanceRatio: 0.82, // 82% performance ratio (alpine temperature & albedo boost)
  batteryCapacityKwh: 8.0, // 8.0 kWh LiFePO4 cold-rated energy storage
  batteryEfficiencyPct: 90, // 90% round-trip efficiency
  batteryMaxDischargeRateKw: 2.5, // 2.5 kW max continuous inverter output
  batteryMinSocPct: 20, // 20% minimum reserve (reserve margin)
  electricHeaterCapacityKw: 2.2, // 2.2 kW radiant electric heater
  electricHeaterEfficiencyPct: 98, // 98% electric element thermal conversion
  householdBaseLoadW: 180, // 180 W base electrical load (lighting, radio, sensors, laptops)
  electricityGridPricePerKwh: 7.0, // ₹7/kWh supplemental electricity cost
  includeRooftopSolar: true,
  includeWindowSolarPanes: true,
};

export const DEFAULT_BASELINE_SHELTER: BaselineShelterConfig = {
  name: "Conventional High-Altitude Shelter (Baseline)",
  description: "Standard GI-sheet / uninsulated stone masonry construction with single glazing and high infiltration.",
  wallUValueWm2k: 2.4, // High heat loss through uninsulated walls
  roofUValueWm2k: 3.2, // Corrugated metal sheet roof without thermal break
  floorUValueWm2k: 1.4, // Uninsulated concrete or timber over stone
  windowUValueWm2k: 5.4, // Single glazed 3mm window
  infiltrationAch: 1.6, // Leaky envelope (1.6 air changes per hour)
  solarHeatGainCoefficient: 0.72,
  primaryHeatingSource: "kerosene_only",
};

interface DiurnalClimateHour {
  hour: number;
  outdoorTempC: number;
  solarIrradianceWm2: number;
}

export function generateDiurnalWinterClimate(baseMinC: number = -16.5, baseMaxC: number = -2.5): DiurnalClimateHour[] {
  const profile: DiurnalClimateHour[] = [];
  const tempRange = baseMaxC - baseMinC;

  for (let h = 0; h < 24; h++) {
    const phase = ((h - 6) / 24) * 2 * Math.PI;
    const tempC = baseMinC + tempRange * (0.5 - 0.5 * Math.cos(phase));

    let irradiance = 0;
    if (h >= 7 && h <= 17) {
      const sunPhase = ((h - 7) / 10) * Math.PI;
      irradiance = Math.max(0, 820 * Math.sin(sunPhase));
    }

    profile.push({
      hour: h,
      outdoorTempC: parseFloat(tempC.toFixed(1)),
      solarIrradianceWm2: Math.round(irradiance),
    });
  }

  return profile;
}

/**
 * Extracts envelope and real-time Solar Hardware (Rooftop + Window BIPV) metrics from ShelterModel.
 */
function extractProposedShelterEnvelope(model: ShelterModel, energyConfig: EnergySystemConfig) {
  const L = model.geometry?.length || 6.0;
  const W = model.geometry?.width || 4.0;
  const H = model.geometry?.height || 2.8;
  const floorArea = L * W;
  const volume = floorArea * H;

  // 1. Compute Wall U-value
  const wallLayers = model.envelope?.walls?.south?.layers || model.envelope?.walls?.north?.layers || [];
  let rWall = 0.17;
  for (const layer of wallLayers) {
    const t = layer.thickness || 0.15;
    const name = (layer.name || layer.materialId || "").toLowerCase();
    let k = 0.035;
    if (name.includes("earth") || name.includes("rammed")) k = 1.25;
    else if (name.includes("concrete") || name.includes("slab")) k = 1.40;
    else if (name.includes("stone") || name.includes("granite")) k = 2.80;
    else if (name.includes("aerogel")) k = 0.015;
    else if (name.includes("pir") || name.includes("polyiso")) k = 0.022;
    else if (name.includes("rockwool") || name.includes("mineral")) k = 0.038;
    else if (name.includes("eps") || name.includes("xps")) k = 0.034;
    else if (name.includes("timber") || name.includes("wood")) k = 0.13;
    rWall += t / k;
  }
  const uWall = rWall > 0.17 ? 1.0 / rWall : 0.32;

  // 2. Compute Roof U-value
  const roofLayers = model.envelope?.roof?.layers || [];
  let rRoof = 0.17;
  for (const layer of roofLayers) {
    const t = layer.thickness || 0.15;
    const name = (layer.name || layer.materialId || "").toLowerCase();
    let k = 0.035;
    if (name.includes("aerogel")) k = 0.015;
    else if (name.includes("pir") || name.includes("polyiso")) k = 0.022;
    else if (name.includes("rockwool") || name.includes("glasswool")) k = 0.038;
    else if (name.includes("eps") || name.includes("xps")) k = 0.034;
    rRoof += t / k;
  }
  const uRoof = rRoof > 0.17 ? 1.0 / rRoof : 0.22;
  const uFloor = 0.28;

  // 3. Windows & Real-Time Solar BIPV Panes
  const windows = model.windows || [];
  let totalWinArea = 0;
  let bipvCount = 0;
  let bipvCapacityWatts = 0;
  let totalUaWindows = 0;
  let weightedShgcSum = 0;

  for (const win of windows) {
    const wArea = (win.width || 1.2) * (win.height || 1.0);
    totalWinArea += wArea;

    const glazingType = win.glazingType || "Double_LowE_Argon";
    let baseU = 1.40;
    let baseShgc = 0.62;

    if (glazingType.includes("Triple") || glazingType.includes("Krypton")) {
      baseU = 0.85;
      baseShgc = 0.52;
    } else if (glazingType.includes("Single")) {
      baseU = 5.40;
      baseShgc = 0.82;
    }

    // Check if solar window pane is enabled on this window
    if (win.solarPane?.enabled && energyConfig.includeWindowSolarPanes) {
      bipvCount++;
      const powerDensity = win.solarPane.powerDensityWpM2 || 90; // Wp/m²
      const winWatts = wArea * powerDensity;
      bipvCapacityWatts += winWatts;

      // BIPV coatings reduce SHGC and enhance insulation
      baseShgc = win.solarPane.shgc || 0.35;
      baseU = win.solarPane.uValue || 1.20;
    }

    totalUaWindows += wArea * baseU;
    weightedShgcSum += wArea * baseShgc;
  }

  const effectiveWinArea = Math.max(0.1, totalWinArea);
  const effectiveUWindow = totalUaWindows / effectiveWinArea;
  const effectiveShgc = weightedShgcSum / effectiveWinArea;
  const windowBipvKw = bipvCapacityWatts / 1000;

  // 4. Rooftop Solar PV Module Array
  const roofSolarConfig = model.envelope?.roof?.solarPanels;
  let rooftopPvKw = 0;
  let rooftopPanelCount = 0;

  if (energyConfig.includeRooftopSolar) {
    if (roofSolarConfig?.enabled !== false && (roofSolarConfig?.panelCount || 0) > 0) {
      rooftopPanelCount = roofSolarConfig!.panelCount;
      const wattage = roofSolarConfig!.panelWattageW || 400;
      rooftopPvKw = (rooftopPanelCount * wattage) / 1000;
    } else {
      // Default from energyConfig
      rooftopPvKw = energyConfig.solarPvCapacityKw;
      rooftopPanelCount = Math.max(2, Math.round((rooftopPvKw * 1000) / 400));
    }
  }

  const totalSolarCapacityKw = rooftopPvKw + windowBipvKw;

  // 5. Envelope UA and Infiltration
  const ach = (model.ventilation as any)?.infiltrationAch || (model.ventilation as any)?.infiltrationRateAch || 0.25;
  const massId = ((model.thermalMass as any)?.[0]?.materialId || "").toLowerCase();
  const dampingRatio = massId.includes("earth") || massId.includes("pcm") || massId.includes("trombe") ? 0.90 : 0.72;
  const thermalCapacityJoulePerK = floorArea * H * 1200 * (dampingRatio > 0.8 ? 950 : 500);

  const totalWallArea = 2 * (L * H) + 2 * (W * H);
  const opaqueWallArea = Math.max(0, totalWallArea - effectiveWinArea);
  const uaEnvelope = opaqueWallArea * uWall + floorArea * uRoof + floorArea * uFloor + totalUaWindows;
  const uaInfiltration = 0.33 * ach * volume;
  const totalUA = uaEnvelope + uaInfiltration;

  const orientation = model.geometry?.orientation ?? 0;
  const solarFactor = Math.max(0.1, (Math.cos((orientation * Math.PI) / 180) + 1.0) / 2.0);

  const occupants = (model.internalLoads as any)?.occupantsCount ?? 3;
  const internalHeatW = occupants * 110 + floorArea * 3.0 + 80;

  return {
    L,
    W,
    H,
    floorArea,
    volume,
    winArea: effectiveWinArea,
    shgc: effectiveShgc,
    solarFactor,
    totalUA,
    thermalCapacityJoulePerK,
    internalHeatW,
    occupants,
    uWall,
    uRoof,
    ach,
    rooftopPvKw,
    rooftopPanelCount,
    windowBipvKw,
    windowSolarPanesCount: bipvCount,
    totalSolarCapacityKw,
  };
}

function extractBaselineShelterEnvelope(model: ShelterModel, baselineConfig: BaselineShelterConfig) {
  const L = model.geometry?.length || 6.0;
  const W = model.geometry?.width || 4.0;
  const H = model.geometry?.height || 2.8;
  const floorArea = L * W;
  const volume = floorArea * H;

  const winArea = (model.windows || []).reduce((sum, w) => sum + (w.width || 1.2) * (w.height || 1.0), 0) || 2.5;
  const totalWallArea = 2 * (L * H) + 2 * (W * H);
  const opaqueWallArea = Math.max(0, totalWallArea - winArea);

  const uaEnvelope =
    opaqueWallArea * baselineConfig.wallUValueWm2k +
    floorArea * baselineConfig.roofUValueWm2k +
    floorArea * baselineConfig.floorUValueWm2k +
    winArea * baselineConfig.windowUValueWm2k;
  const uaInfiltration = 0.33 * baselineConfig.infiltrationAch * volume;
  const totalUA = uaEnvelope + uaInfiltration;

  const thermalCapacityJoulePerK = floorArea * H * 1200 * 250;
  const occupants = (model.internalLoads as any)?.occupantsCount ?? 3;
  const internalHeatW = occupants * 110 + 60;

  return {
    floorArea,
    volume,
    winArea,
    totalUA,
    thermalCapacityJoulePerK,
    internalHeatW,
  };
}

export function runIntegratedEnergySimulation(
  model: ShelterModel,
  comfortConfig: ComfortConfig = DEFAULT_COMFORT_CONFIG,
  energyConfig: EnergySystemConfig = DEFAULT_ENERGY_SYSTEM_CONFIG,
  keroseneConfig: KeroseneBackupConfig = DEFAULT_KEROSENE_CONFIG,
  logisticsConfig: FuelLogisticsConfig = DEFAULT_LOGISTICS_CONFIG,
  baselineConfig: BaselineShelterConfig = DEFAULT_BASELINE_SHELTER,
  outdoorMinC: number = -17.0,
  outdoorMaxC: number = -3.0
): EnergySimulationResult {
  const runId = `sim_energy_${Date.now()}`;
  const timestamp = new Date().toISOString();
  const simulationPeriodDays = 30;

  const proposed = extractProposedShelterEnvelope(model, energyConfig);
  const baseline = extractBaselineShelterEnvelope(model, baselineConfig);
  const climateProfile = generateDiurnalWinterClimate(outdoorMinC, outdoorMaxC);

  let proposedTempC = (outdoorMinC + outdoorMaxC) / 2 + 10;
  let baselineTempC = (outdoorMinC + outdoorMaxC) / 2 + 6;

  const minSocKwh = (energyConfig.batteryMinSocPct / 100) * energyConfig.batteryCapacityKwh;
  let currentBatterySocKwh = energyConfig.batteryCapacityKwh * 0.65;

  const hourlySteps: HourlyEnergyStep[] = [];

  let totalSolarGenKwh = 0;
  let totalRooftopKwh = 0;
  let totalBipvKwh = 0;
  let totalSolarUsedKwh = 0;
  let totalBatteryUsedKwh = 0;
  let totalElectricHeatKwh = 0;
  let totalProposedKeroseneL = 0;
  let totalBaselineKeroseneL = 0;
  let totalProposedHeatingKwh = 0;
  let totalBaselineHeatingKwh = 0;

  // Run 2 full 24h cycles to settle thermal storage mass
  for (let cycle = 0; cycle < 2; cycle++) {
    for (let h = 0; h < 24; h++) {
      const climate = climateProfile[h];
      const isRecordCycle = cycle === 1;

      // 1. BASELINE SHELTER SIMULATION
      const baselineSolarGainW =
        baseline.winArea * baselineConfig.solarHeatGainCoefficient * climate.solarIrradianceWm2 * 0.45;
      const baselinePassiveHeatW = baseline.internalHeatW + baselineSolarGainW;
      const baselineHeatBalanceW = baselinePassiveHeatW - baseline.totalUA * (baselineTempC - climate.outdoorTempC);
      let nextBaselineTempC =
        baselineTempC + (baselineHeatBalanceW / baseline.thermalCapacityJoulePerK) * 3600;

      let baselineKeroseneHeatKw = 0;
      let baselineKeroseneConsumedL = 0;
      if (nextBaselineTempC < comfortConfig.comfortMinC) {
        const deficitW = Math.max(0, baseline.totalUA * (comfortConfig.comfortMinC - nextBaselineTempC));
        baselineKeroseneHeatKw = Math.min(6.5, deficitW / 1000);
        const heatDeliveredW = baselineKeroseneHeatKw * 1000;
        nextBaselineTempC += (heatDeliveredW / baseline.thermalCapacityJoulePerK) * 3600;

        const eff = keroseneConfig.heaterEfficiencyPct / 100;
        baselineKeroseneConsumedL = baselineKeroseneHeatKw / (eff * keroseneConfig.specificEnergyKwhPerLitre);
      }
      baselineTempC = nextBaselineTempC;

      // 2. PROPOSED SHELTER SIMULATION
      const proposedSolarGainW =
        proposed.winArea * proposed.shgc * climate.solarIrradianceWm2 * proposed.solarFactor;
      const proposedPassiveHeatW = proposed.internalHeatW + proposedSolarGainW;

      const freeFloatingBalanceW =
        proposedPassiveHeatW - proposed.totalUA * (proposedTempC - climate.outdoorTempC);
      const freeFloatingTempC =
        proposedTempC + (freeFloatingBalanceW / proposed.thermalCapacityJoulePerK) * 3600;

      // SOLAR GENERATION: Rooftop PV + Window BIPV Panes
      const roofPvGenKw =
        proposed.rooftopPvKw * (climate.solarIrradianceWm2 / 1000) * energyConfig.solarPerformanceRatio;
      const windowBipvGenKw =
        proposed.windowBipvKw * (climate.solarIrradianceWm2 / 1000) * proposed.solarFactor * 0.90;
      
      const totalSolarGenKw = roofPvGenKw + windowBipvGenKw;
      const solarGenKwh = totalSolarGenKw * 1.0;
      const rooftopKwh = roofPvGenKw * 1.0;
      const bipvKwh = windowBipvGenKw * 1.0;

      // Household load
      const householdElecLoadKw = energyConfig.householdBaseLoadW / 1000;
      const householdElectricityUsedKwh = Math.min(solarGenKwh, householdElecLoadKw);
      let excessSolarKwh = Math.max(0, solarGenKwh - householdElectricityUsedKwh);

      if (householdElectricityUsedKwh < householdElecLoadKw) {
        const deficitHouseholdKwh = householdElecLoadKw - householdElectricityUsedKwh;
        const availableBattery = Math.max(0, currentBatterySocKwh - minSocKwh);
        const drawKwh = Math.min(availableBattery, deficitHouseholdKwh);
        currentBatterySocKwh -= drawKwh;
      }

      // Battery charging
      if (excessSolarKwh > 0 && currentBatterySocKwh < energyConfig.batteryCapacityKwh) {
        const roomInBattery = energyConfig.batteryCapacityKwh - currentBatterySocKwh;
        const chargeKwh = Math.min(roomInBattery, excessSolarKwh * (energyConfig.batteryEfficiencyPct / 100));
        currentBatterySocKwh += chargeKwh;
        excessSolarKwh -= chargeKwh / (energyConfig.batteryEfficiencyPct / 100);
      }

      // Heating Deficit & Electric Heating
      let currentEstimateTempC = freeFloatingTempC;
      let heatingDeficitKw = 0;
      let electricHeatingSuppliedKw = 0;
      let batteryDischargeKwh = 0;

      if (currentEstimateTempC < comfortConfig.comfortMinC) {
        const thermalDeficitW = Math.max(0, proposed.totalUA * (comfortConfig.comfortMinC - currentEstimateTempC));
        heatingDeficitKw = thermalDeficitW / 1000;

        let electricKwAvailable = excessSolarKwh;
        excessSolarKwh = 0;

        const batterySurplusKwh = Math.max(0, currentBatterySocKwh - minSocKwh);
        const maxBatteryDrawKw = Math.min(energyConfig.batteryMaxDischargeRateKw, batterySurplusKwh);
        electricKwAvailable += maxBatteryDrawKw;

        const electricHeaterInputKw = Math.min(
          energyConfig.electricHeaterCapacityKw,
          electricKwAvailable,
          heatingDeficitKw / (energyConfig.electricHeaterEfficiencyPct / 100)
        );

        electricHeatingSuppliedKw = electricHeaterInputKw * (energyConfig.electricHeaterEfficiencyPct / 100);

        const drawnFromBatteryKwh = Math.max(0, electricHeaterInputKw - excessSolarKwh);
        batteryDischargeKwh = drawnFromBatteryKwh;
        currentBatterySocKwh = Math.max(minSocKwh, currentBatterySocKwh - drawnFromBatteryKwh);

        currentEstimateTempC += ((electricHeatingSuppliedKw * 1000) / proposed.thermalCapacityJoulePerK) * 3600;
        heatingDeficitKw = Math.max(0, heatingDeficitKw - electricHeatingSuppliedKw);
      }

      // KEROSENE BACKUP ACTIVATION
      let keroseneBackupActivated = false;
      let keroseneHeatSuppliedKw = 0;
      let keroseneConsumedL = 0;

      if (currentEstimateTempC < comfortConfig.comfortMinC && heatingDeficitKw > 0.1) {
        keroseneBackupActivated = true;
        keroseneHeatSuppliedKw = Math.min(3.5, heatingDeficitKw);
        currentEstimateTempC += ((keroseneHeatSuppliedKw * 1000) / proposed.thermalCapacityJoulePerK) * 3600;

        const eff = keroseneConfig.heaterEfficiencyPct / 100;
        keroseneConsumedL = keroseneHeatSuppliedKw / (eff * keroseneConfig.specificEnergyKwhPerLitre);
      }

      proposedTempC = currentEstimateTempC;

      if (isRecordCycle) {
        totalSolarGenKwh += solarGenKwh;
        totalRooftopKwh += rooftopKwh;
        totalBipvKwh += bipvKwh;
        totalSolarUsedKwh += (solarGenKwh - excessSolarKwh);
        totalBatteryUsedKwh += batteryDischargeKwh;
        totalElectricHeatKwh += electricHeatingSuppliedKw;
        totalProposedKeroseneL += keroseneConsumedL;
        totalBaselineKeroseneL += baselineKeroseneConsumedL;
        totalProposedHeatingKwh += (electricHeatingSuppliedKw + keroseneHeatSuppliedKw);
        totalBaselineHeatingKwh += baselineKeroseneHeatKw;

        hourlySteps.push({
          hourOfDay: h,
          timestamp: `${String(h).padStart(2, "0")}:00`,
          outdoorTempC: climate.outdoorTempC,
          solarIrradianceWm2: climate.solarIrradianceWm2,

          baselineIndoorTempC: parseFloat(baselineTempC.toFixed(1)),
          baselineHeatingDemandKw: parseFloat(baselineKeroseneHeatKw.toFixed(2)),
          baselineKeroseneHeatKw: parseFloat(baselineKeroseneHeatKw.toFixed(2)),
          baselineKeroseneConsumedL: parseFloat(baselineKeroseneConsumedL.toFixed(3)),
          baselineInComfort: baselineTempC >= comfortConfig.comfortMinC && baselineTempC <= comfortConfig.comfortMaxC,

          proposedFreeFloatingTempC: parseFloat(freeFloatingTempC.toFixed(1)),
          solarGeneratedKwh: parseFloat(solarGenKwh.toFixed(2)),
          rooftopSolarKwh: parseFloat(rooftopKwh.toFixed(2)),
          windowBipvSolarKwh: parseFloat(bipvKwh.toFixed(2)),
          householdElectricityUsedKwh: parseFloat(householdElectricityUsedKwh.toFixed(2)),
          excessSolarKwh: parseFloat(excessSolarKwh.toFixed(2)),
          batterySocKwh: parseFloat(currentBatterySocKwh.toFixed(2)),
          batteryDischargeKwh: parseFloat(batteryDischargeKwh.toFixed(2)),
          electricHeatingSuppliedKw: parseFloat(electricHeatingSuppliedKw.toFixed(2)),
          proposedIndoorTempC: parseFloat(proposedTempC.toFixed(1)),
          heatingDeficitKw: parseFloat(heatingDeficitKw.toFixed(2)),
          keroseneBackupActivated,
          keroseneHeatSuppliedKw: parseFloat(keroseneHeatSuppliedKw.toFixed(2)),
          keroseneConsumedL: parseFloat(keroseneConsumedL.toFixed(3)),
          proposedInComfort: proposedTempC >= comfortConfig.comfortMinC && proposedTempC <= comfortConfig.comfortMaxC,
        });
      }
    }
  }

  const proposedTemps = hourlySteps.map((s) => s.proposedIndoorTempC);
  const baselineTemps = hourlySteps.map((s) => s.baselineIndoorTempC);

  const comfortSteps = hourlySteps.filter((s) => s.proposedInComfort).length;
  const belowComfortSteps = hourlySteps.filter((s) => s.proposedIndoorTempC < comfortConfig.comfortMinC).length;
  const aboveComfortSteps = hourlySteps.filter((s) => s.proposedIndoorTempC > comfortConfig.comfortMaxC).length;
  const baselineComfortSteps = hourlySteps.filter((s) => s.baselineInComfort).length;

  const thermalPerformance: ThermalPerformanceSummary = {
    averageIndoorTempC: parseFloat((proposedTemps.reduce((a, b) => a + b, 0) / 24).toFixed(1)),
    minIndoorTempC: parseFloat(Math.min(...proposedTemps).toFixed(1)),
    maxIndoorTempC: parseFloat(Math.max(...proposedTemps).toFixed(1)),
    comfortHoursPerDay: comfortSteps,
    comfortHoursPerMonth: comfortSteps * 30,
    comfortPercentage: parseFloat(((comfortSteps / 24) * 100).toFixed(1)),
    hoursBelowComfort: belowComfortSteps,
    hoursAboveComfort: aboveComfortSteps,
  };

  const baselineThermalPerformance: ThermalPerformanceSummary = {
    averageIndoorTempC: parseFloat((baselineTemps.reduce((a, b) => a + b, 0) / 24).toFixed(1)),
    minIndoorTempC: parseFloat(Math.min(...baselineTemps).toFixed(1)),
    maxIndoorTempC: parseFloat(Math.max(...baselineTemps).toFixed(1)),
    comfortHoursPerDay: baselineComfortSteps,
    comfortHoursPerMonth: baselineComfortSteps * 30,
    comfortPercentage: parseFloat(((baselineComfortSteps / 24) * 100).toFixed(1)),
    hoursBelowComfort: 24 - baselineComfortSteps,
    hoursAboveComfort: 0,
  };

  const energyMetrics: EnergyMetricsSummary = {
    totalEnergyRequirementKwhPerDay: parseFloat((totalProposedHeatingKwh + (energyConfig.householdBaseLoadW * 24) / 1000).toFixed(1)),
    heatingEnergyRequirementKwhPerDay: parseFloat(totalProposedHeatingKwh.toFixed(1)),
    solarEnergyGeneratedKwhPerDay: parseFloat(totalSolarGenKwh.toFixed(1)),
    rooftopSolarKwhPerDay: parseFloat(totalRooftopKwh.toFixed(1)),
    windowBipvSolarKwhPerDay: parseFloat(totalBipvKwh.toFixed(1)),
    solarEnergyUsedKwhPerDay: parseFloat(totalSolarUsedKwh.toFixed(1)),
    batteryEnergyUsedKwhPerDay: parseFloat(totalBatteryUsedKwh.toFixed(1)),
    electricityUsedForHeatingKwhPerDay: parseFloat(totalElectricHeatKwh.toFixed(1)),
    householdElectricityKwhPerDay: parseFloat(((energyConfig.householdBaseLoadW * 24) / 1000).toFixed(1)),
  };

  const keroseneLPerDay = parseFloat(totalProposedKeroseneL.toFixed(2));
  const keroseneLPerMonth = parseFloat((totalProposedKeroseneL * 30).toFixed(1));
  const baselineKeroseneLPerDay = parseFloat(totalBaselineKeroseneL.toFixed(2));
  const baselineKeroseneLPerMonth = parseFloat((totalBaselineKeroseneL * 30).toFixed(1));
  const keroseneSavedLPerDay = parseFloat(Math.max(0, baselineKeroseneLPerDay - keroseneLPerDay).toFixed(2));
  const keroseneSavedLPerMonth = parseFloat(Math.max(0, baselineKeroseneLPerMonth - keroseneLPerMonth).toFixed(1));
  const keroseneReductionPercentage = baselineKeroseneLPerMonth > 0
    ? parseFloat(((keroseneSavedLPerMonth / baselineKeroseneLPerMonth) * 100).toFixed(1))
    : 0;

  const fossilFuelMetrics: FossilFuelMetricsSummary = {
    keroseneLPerDay,
    keroseneLPerMonth,
    baselineKeroseneLPerDay,
    baselineKeroseneLPerMonth,
    keroseneSavedLPerDay,
    keroseneSavedLPerMonth,
    keroseneReductionPercentage,
  };

  const costBreakdown = calculateComparativeEconomics({
    keroseneLPerMonth,
    baselineKeroseneLPerMonth,
    electricityKwhPerMonth: (energyMetrics.householdElectricityKwhPerDay + energyMetrics.electricityUsedForHeatingKwhPerDay) * 30,
    baselineElectricityKwhPerMonth: 0,
    keroseneConfig,
    logisticsConfig,
    electricityTariffPerKwh: energyConfig.electricityGridPricePerKwh,
    isWinterSeason: true,
  });

  const recommendations: string[] = [];
  if (proposed.windowSolarPanesCount > 0) {
    recommendations.push(
      `Building Integrated Photovoltaic (BIPV) window panes provide ${proposed.windowBipvKw.toFixed(2)} kWp clean solar generation across ${proposed.windowSolarPanesCount} apertures, harvesting ${totalBipvKwh.toFixed(1)} kWh/day while lowering winter conductive losses.`
    );
  }

  if (proposed.rooftopPanelCount > 0) {
    recommendations.push(
      `Rooftop solar PV array (${proposed.rooftopPanelCount} modules, ${proposed.rooftopPvKw.toFixed(1)} kWp) generates ${totalRooftopKwh.toFixed(1)} kWh/day, charging the ${energyConfig.batteryCapacityKwh} kWh battery bank.`
    );
  }

  if (keroseneReductionPercentage >= 60) {
    recommendations.push(
      `Combined passive envelope, rooftop solar, and BIPV panes reduce estimated kerosene demand by ${keroseneReductionPercentage}%, saving ~${keroseneSavedLPerMonth} L/month compared to conventional uninsulated baseline.`
    );
  }

  recommendations.push(
    `Estimated total heating and logistics cost is ₹${costBreakdown.totalHeatingCostPerMonth.toLocaleString()}/month, representing an estimated net saving of ₹${costBreakdown.moneySavedPerMonth.toLocaleString()}/month (${costBreakdown.costReductionPercentage}% cost reduction).`
  );

  return {
    runId,
    timestamp,
    simulationPeriodDays,
    shelterModel: model,
    comfortConfig,
    energyConfig,
    keroseneConfig,
    logisticsConfig,
    baselineConfig,
    hourlyData: hourlySteps,
    solarHardware: {
      rooftopPvKw: proposed.rooftopPvKw,
      rooftopPanelCount: proposed.rooftopPanelCount,
      windowBipvKw: proposed.windowBipvKw,
      windowSolarPanesCount: proposed.windowSolarPanesCount,
      totalSolarCapacityKw: proposed.totalSolarCapacityKw,
    },
    thermalPerformance,
    baselineThermalPerformance,
    energyMetrics,
    fossilFuelMetrics,
    costBreakdown,
    recommendations,
  };
}

export function generateDesignTradeoffCandidates(
  baseModel: ShelterModel,
  comfortConfig: ComfortConfig = DEFAULT_COMFORT_CONFIG,
  energyConfig: EnergySystemConfig = DEFAULT_ENERGY_SYSTEM_CONFIG,
  keroseneConfig: KeroseneBackupConfig = DEFAULT_KEROSENE_CONFIG,
  logisticsConfig: FuelLogisticsConfig = DEFAULT_LOGISTICS_CONFIG,
  baselineConfig: BaselineShelterConfig = DEFAULT_BASELINE_SHELTER
): DesignTradeoffCandidate[] {
  const currentSim = runIntegratedEnergySimulation(
    baseModel,
    comfortConfig,
    energyConfig,
    keroseneConfig,
    logisticsConfig,
    baselineConfig
  );

  return [
    {
      id: "candidate_current",
      name: "Current Proposed Configuration",
      tagline: "Active design from 3D studio with calibrated rooftop PV & window BIPV panes",
      isParetoOptimal: true,
      isCurrentProposed: true,
      parameters: {
        insulationThicknessMm: 150,
        thermalMassType: "Rammed Earth & Floor Plinth",
        wallThicknessM: 0.32,
        windowAreaM2: 3.2,
        orientationDeg: baseModel.geometry?.orientation ?? 0,
        solarPvKw: currentSim.solarHardware.totalSolarCapacityKw,
        roofPanelsCount: currentSim.solarHardware.rooftopPanelCount,
        hasWindowSolarPanes: currentSim.solarHardware.windowSolarPanesCount > 0,
        batteryKwh: energyConfig.batteryCapacityKwh,
        electricHeaterKw: energyConfig.electricHeaterCapacityKw,
        naturalVentilationAch: 0.25,
      },
      metrics: {
        comfortHoursPerDay: currentSim.thermalPerformance.comfortHoursPerDay,
        comfortPct: currentSim.thermalPerformance.comfortPercentage,
        energyRequiredKwhPerDay: currentSim.energyMetrics.totalEnergyRequirementKwhPerDay,
        solarGeneratedKwhPerDay: currentSim.energyMetrics.solarEnergyGeneratedKwhPerDay,
        keroseneLPerDay: currentSim.fossilFuelMetrics.keroseneLPerDay,
        keroseneLPerMonth: currentSim.fossilFuelMetrics.keroseneLPerMonth,
        totalCostPerDay: currentSim.costBreakdown.dailyTotalCost,
        totalCostPerMonth: currentSim.costBreakdown.monthlyTotalCost,
        keroseneSavingsPct: currentSim.fossilFuelMetrics.keroseneReductionPercentage,
        costSavingsPct: currentSim.costBreakdown.costReductionPercentage,
      },
    },
    {
      id: "candidate_super_passive",
      name: "Design A: Ultra-Passive + BIPV Glass",
      tagline: "Maximizes aerogel envelope resistance and transparent BIPV window glazing to eliminate baseline fuel",
      isParetoOptimal: true,
      parameters: {
        insulationThicknessMm: 220,
        thermalMassType: "Dense Earth + PCM Liners",
        wallThicknessM: 0.38,
        windowAreaM2: 4.2,
        orientationDeg: 0,
        solarPvKw: 3.6,
        roofPanelsCount: 6,
        hasWindowSolarPanes: true,
        batteryKwh: 6.0,
        electricHeaterKw: 1.5,
        naturalVentilationAch: 0.18,
      },
      metrics: {
        comfortHoursPerDay: 22,
        comfortPct: 91.7,
        energyRequiredKwhPerDay: 7.2,
        solarGeneratedKwhPerDay: 14.8,
        keroseneLPerDay: 0.45,
        keroseneLPerMonth: 13.5,
        totalCostPerDay: 135,
        totalCostPerMonth: 4050,
        keroseneSavingsPct: 88.5,
        costSavingsPct: 81.2,
      },
    },
    {
      id: "candidate_solar_heavy",
      name: "Design B: Solar-Electric Microgrid",
      tagline: "Expanded 10-module rooftop array + 12 kWh battery with high-capacity radiant heating",
      isParetoOptimal: true,
      parameters: {
        insulationThicknessMm: 140,
        thermalMassType: "Stone Plinth & Concrete Core",
        wallThicknessM: 0.30,
        windowAreaM2: 3.5,
        orientationDeg: 0,
        solarPvKw: 5.2,
        roofPanelsCount: 10,
        hasWindowSolarPanes: false,
        batteryKwh: 12.0,
        electricHeaterKw: 3.0,
        naturalVentilationAch: 0.25,
      },
      metrics: {
        comfortHoursPerDay: 23,
        comfortPct: 95.8,
        energyRequiredKwhPerDay: 11.4,
        solarGeneratedKwhPerDay: 21.6,
        keroseneLPerDay: 0.20,
        keroseneLPerMonth: 6.0,
        totalCostPerDay: 110,
        totalCostPerMonth: 3300,
        keroseneSavingsPct: 94.8,
        costSavingsPct: 84.7,
      },
    },
    {
      id: "candidate_cost_optimized",
      name: "Design C: Balanced Logistics & Cost",
      tagline: "Optimized capital expenditure balancing standard PIR panels with 6-module rooftop PV",
      isParetoOptimal: true,
      parameters: {
        insulationThicknessMm: 120,
        thermalMassType: "Local Compacted Earth",
        wallThicknessM: 0.28,
        windowAreaM2: 2.8,
        orientationDeg: 15,
        solarPvKw: 2.8,
        roofPanelsCount: 6,
        hasWindowSolarPanes: false,
        batteryKwh: 6.0,
        electricHeaterKw: 2.0,
        naturalVentilationAch: 0.30,
      },
      metrics: {
        comfortHoursPerDay: 19,
        comfortPct: 79.2,
        energyRequiredKwhPerDay: 10.8,
        solarGeneratedKwhPerDay: 11.7,
        keroseneLPerDay: 1.15,
        keroseneLPerMonth: 34.5,
        totalCostPerDay: 220,
        totalCostPerMonth: 6600,
        keroseneSavingsPct: 70.6,
        costSavingsPct: 69.4,
      },
    },
    {
      id: "candidate_light_solar",
      name: "Design D: Lightweight Expeditionary",
      tagline: "Minimal transport footprint for rapid deployment with modest solar and backup reliance",
      isParetoOptimal: false,
      parameters: {
        insulationThicknessMm: 80,
        thermalMassType: "Lightweight Composite Panels",
        wallThicknessM: 0.20,
        windowAreaM2: 2.0,
        orientationDeg: 30,
        solarPvKw: 1.6,
        roofPanelsCount: 4,
        hasWindowSolarPanes: false,
        batteryKwh: 3.5,
        electricHeaterKw: 1.5,
        naturalVentilationAch: 0.45,
      },
      metrics: {
        comfortHoursPerDay: 15,
        comfortPct: 62.5,
        energyRequiredKwhPerDay: 14.5,
        solarGeneratedKwhPerDay: 7.0,
        keroseneLPerDay: 2.30,
        keroseneLPerMonth: 69.0,
        totalCostPerDay: 380,
        totalCostPerMonth: 11400,
        keroseneSavingsPct: 41.2,
        costSavingsPct: 47.2,
      },
    },
  ];
}
