/**
 * RC Offline Simulation Module
 * Runs a lightweight RC (Resistance-Capacitance) thermal simulation locally
 * when the backend physics server is unreachable.
 */

import { ShelterModel } from "@/types/shelter";

export interface RCSimulationOptions {
  periodType: string;
  runPeriodDays: number;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  timestep: number;
  isAnnual: boolean;
}

const LEH_MONTHLY_CLIMATE = [
  { month: 1,  tMin: -14.2, tMax: -2.1,  solarFactor: 0.52 },
  { month: 2,  tMin: -11.5, tMax:  1.3,  solarFactor: 0.62 },
  { month: 3,  tMin:  -5.8, tMax:  8.2,  solarFactor: 0.72 },
  { month: 4,  tMin:   0.5, tMax: 14.7,  solarFactor: 0.80 },
  { month: 5,  tMin:   5.3, tMax: 20.1,  solarFactor: 0.85 },
  { month: 6,  tMin:   9.8, tMax: 24.3,  solarFactor: 0.88 },
  { month: 7,  tMin:  13.2, tMax: 27.6,  solarFactor: 0.84 },
  { month: 8,  tMin:  12.5, tMax: 27.0,  solarFactor: 0.83 },
  { month: 9,  tMin:   8.1, tMax: 22.5,  solarFactor: 0.79 },
  { month: 10, tMin:   1.2, tMax: 15.4,  solarFactor: 0.70 },
  { month: 11, tMin:  -7.4, tMax:  5.8,  solarFactor: 0.58 },
  { month: 12, tMin: -12.8, tMax: -1.2,  solarFactor: 0.48 },
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function computeUValue(model: ShelterModel) {
  const wallLayers = model.envelope?.walls?.south?.layers || model.envelope?.walls?.north?.layers || [];
  let rWall = 0.17;
  for (const layer of wallLayers) {
    const t = layer.thickness || 0.15;
    const name = (layer.name || layer.materialId || "").toLowerCase();
    let k = 0.035;
    if (name.includes("earth") || name.includes("rammed")) k = 1.25;
    else if (name.includes("concrete") || name.includes("slab")) k = 1.40;
    else if (name.includes("granite") || name.includes("stone")) k = 2.80;
    else if (name.includes("aerogel")) k = 0.015;
    else if (name.includes("pir") || name.includes("polyiso")) k = 0.022;
    else if (name.includes("rockwool") || name.includes("mineral")) k = 0.038;
    else if (name.includes("timber") || name.includes("cedar")) k = 0.12;
    rWall += t / k;
  }
  const uWall = rWall > 0.17 ? 1.0 / rWall : 0.35;

  const roofLayers = model.envelope?.roof?.layers || [];
  let rRoof = 0.17;
  for (const layer of roofLayers) {
    const t = layer.thickness || 0.15;
    const name = (layer.name || layer.materialId || "").toLowerCase();
    let k = 0.035;
    if (name.includes("aerogel")) k = 0.015;
    else if (name.includes("pir")) k = 0.022;
    rRoof += t / k;
  }
  const uRoof = rRoof > 0.17 ? 1.0 / rRoof : 0.22;

  const windows = model.windows || [];
  let totalWinArea = 0;
  let totalWinUa = 0;
  let totalWinShgc = 0;
  let totalBipvCapacityW = 0;

  for (const w of windows) {
    const wArea = (w.width || 1.2) * (w.height || 1.0);
    totalWinArea += wArea;
    const glazingType = w.glazingType || "Double_LowE_Argon";
    let u = 1.40;
    let s = 0.62;

    if (glazingType.includes("Triple") || glazingType.includes("Krypton")) {
      u = 0.80;
      s = 0.52;
    } else if (glazingType.includes("Single")) {
      u = 5.60;
      s = 0.82;
    }

    if (w.solarPane?.enabled) {
      u = w.solarPane.uValue ?? 1.20;
      s = w.solarPane.shgc ?? 0.35;
      totalBipvCapacityW += wArea * (w.solarPane.powerDensityWpM2 ?? 90);
    }

    totalWinUa += wArea * u;
    totalWinShgc += wArea * s;
  }

  const winArea = Math.max(0.1, totalWinArea);
  const uWindow = totalWinUa / winArea;
  const shgc = totalWinShgc / winArea;

  const roofSolar = model.envelope?.roof?.solarPanels;
  const roofPvCapacityW =
    roofSolar?.enabled !== false && (roofSolar?.panelCount || 0) > 0
      ? (roofSolar!.panelCount || 0) * (roofSolar!.panelWattageW || 400)
      : 0;

  const ach = (model.ventilation as any)?.infiltrationAch || (model.ventilation as any)?.infiltrationRateAch || 0.35;
  return { uWall, uRoof, uWindow, shgc, winArea, ach, totalBipvCapacityW, roofPvCapacityW };
}

export function runOfflineRCSimulation(model: ShelterModel, opts: RCSimulationOptions) {
  const tStart = Date.now();
  const L = model.geometry?.length || 6.0;
  const W = model.geometry?.width || 4.0;
  const H = model.geometry?.height || 3.0;
  const floorArea = L * W;
  const volume = floorArea * H;

  const { uWall, uRoof, uWindow, shgc, winArea, ach, totalBipvCapacityW, roofPvCapacityW } = computeUValue(model);
  const orientation = model.geometry?.orientation ?? 0;
  const solarFactor = Math.max(0.05, (Math.cos((orientation * Math.PI) / 180) + 1.0) / 2.0);

  const totalWallArea = 2 * (L * H) + 2 * (W * H);
  const opaqueWallArea = Math.max(0, totalWallArea - winArea);
  const uaWalls = opaqueWallArea * uWall;
  const uaRoof = floorArea * uRoof;
  const uaFloor = floorArea * 0.28;
  const uaWindows = winArea * uWindow;
  const hInf = 0.33 * ach * volume;
  const uaTotal = uaWalls + uaRoof + uaFloor + uaWindows + hInf;

  const internalHeatW =
    ((model.internalLoads as any)?.occupantsCount ?? 2) * ((model.internalLoads as any)?.activityLevelWatts ?? 120) +
    ((model.internalLoads as any)?.lightingPowerDensityWpm2 ?? 3.5) * floorArea +
    ((model.internalLoads as any)?.equipmentPowerWatts ?? 110);

  const massId = ((model.thermalMass as any)?.[0]?.materialId || "").toLowerCase();
  const dampingRatio = massId.includes("earth") || massId.includes("pcm") ? 0.88 : massId.includes("timber") ? 0.38 : 0.76;
  const thermalCapacity = floorArea * H * 1200 * (dampingRatio > 0.7 ? 800 : 400);

  const simDays = opts.isAnnual ? 365 : Math.min(opts.runPeriodDays, 365);
  const stepsPerHour = opts.timestep || 4;
  const dtH = 1.0 / stepsPerHour;
  const totalSteps = simDays * 24 * stepsPerHour;

  const timestamps: string[] = [];
  const indoorTemps: number[] = [];
  const outdoorTemps: number[] = [];
  const solarGainArr: number[] = [];
  const wallHeatArr: number[] = [];
  const roofHeatArr: number[] = [];

  const startClimate = LEH_MONTHLY_CLIMATE[opts.startMonth - 1];
  let tIndoor = (startClimate.tMin + startClimate.tMax) / 2 + 5;

  for (let step = 0; step < totalSteps; step++) {
    const hourOfYear = step * dtH;
    const dayOfYear = Math.floor(hourOfYear / 24);
    const hourOfDay = hourOfYear % 24;

    let dCount = 0, m = 0;
    for (; m < 12; m++) { dCount += DAYS_IN_MONTH[m]; if (dayOfYear < dCount) break; }
    m = Math.min(11, m);
    const climate = LEH_MONTHLY_CLIMATE[m];

    const tAmb = climate.tMin + (climate.tMax - climate.tMin) * (0.5 + 0.5 * Math.sin((hourOfDay - 6) * Math.PI / 12));
    const solarPeak = 820 * climate.solarFactor;
    const solarIrr = Math.max(0, solarPeak * Math.sin(((hourOfDay - 6) * Math.PI) / 12));
    const solarGainW = winArea * shgc * solarIrr * solarFactor;

    const occSchedule = (hourOfDay >= 20 || hourOfDay < 8) ? 1.0 : 0.4;
    const totalHeatW = internalHeatW * occSchedule + solarGainW;
    const heatBalance = totalHeatW - uaTotal * (tIndoor - tAmb);
    tIndoor = tIndoor + (heatBalance / thermalCapacity) * 3600 * dtH;

    if (step % stepsPerHour === 0) {
      const simulDay = Math.floor(step / (24 * stepsPerHour));
      const simulHour = Math.floor((step / stepsPerHour) % 24);
      const d = new Date(2025, opts.startMonth - 1, opts.startDay, simulHour);
      d.setDate(d.getDate() + simulDay);
      timestamps.push(d.toISOString());
      indoorTemps.push(parseFloat(tIndoor.toFixed(2)));
      outdoorTemps.push(parseFloat(tAmb.toFixed(2)));
      solarGainArr.push(parseFloat((solarGainW / 1000).toFixed(3)));
      wallHeatArr.push(parseFloat((uaWalls * (tIndoor - tAmb) / 1000).toFixed(3)));
      roofHeatArr.push(parseFloat((uaRoof * (tIndoor - tAmb) / 1000).toFixed(3)));
    }
  }

  const nHours = indoorTemps.length;
  const indoorMin = Math.min(...indoorTemps);
  const indoorMax = Math.max(...indoorTemps);
  const indoorMean = indoorTemps.reduce((a, b) => a + b, 0) / nHours;
  const outdoorMin = Math.min(...outdoorTemps);
  const outdoorMax = Math.max(...outdoorTemps);
  const comfortHoursPct = parseFloat(((indoorTemps.filter((t) => t >= 18 && t <= 24).length / nHours) * 100).toFixed(1));
  const underheatingDH = indoorTemps.filter(t => t < 18).reduce((s, t) => s + (18 - t), 0);
  const totalSolarGainKwh = solarGainArr.reduce((a, b) => a + b, 0);
  const hdd18 = outdoorTemps.reduce((s, t) => s + Math.max(0, 18 - t), 0) / 24;
  const annFactor = opts.isAnnual ? 1 : 365 / simDays;
  const heatingDemandKwhM2 = parseFloat(((uaTotal * hdd18 * annFactor * 24) / (1000 * floorArea)).toFixed(1));
  const winterDesign = model.location?.designTempWinter ?? -25;
  const peakEnvelopeLossW = Math.round(uaTotal * (20 - winterDesign));
  const indoorDiurnal = indoorMax - indoorMin;
  const outdoorDiurnal = outdoorMax - outdoorMin;
  const dampingPct = outdoorDiurnal > 0 ? parseFloat(((1 - indoorDiurnal / outdoorDiurnal) * 100).toFixed(1)) : 80;

  return {
    summary: {
      indoorMinC: parseFloat(indoorMin.toFixed(1)),
      indoorMaxC: parseFloat(indoorMax.toFixed(1)),
      indoorMeanC: parseFloat(indoorMean.toFixed(1)),
      outdoorMinC: parseFloat(outdoorMin.toFixed(1)),
      outdoorMaxC: parseFloat(outdoorMax.toFixed(1)),
      comfortHoursPct,
      diurnalSwingDampingPct: Math.max(0, Math.min(100, dampingPct)),
      heatingDemandKwhM2,
      peakEnvelopeLossW,
      totalSolarGainKwh: parseFloat(totalSolarGainKwh.toFixed(1)),
      underheatingDegreeHoursCh: parseFloat(underheatingDH.toFixed(0)),
      usefulSolarHarvestKwh: parseFloat((totalSolarGainKwh * 0.65).toFixed(1)),
    },
    hourly: {
      timestamps,
      indoorTemp: indoorTemps,
      outdoorTemp: outdoorTemps,
      solarGains: solarGainArr,
      wallHeatTransfer: wallHeatArr,
      roofHeatTransfer: roofHeatArr,
    },
    metadata: {
      engineName: "ThermoShelter RC (Offline)",
      engineVersion: "1.0.0",
      weatherDataset: "Leh Synthetic Monthly Statistics",
      executionDurationSeconds: (Date.now() - tStart) / 1000,
      completedSuccessfully: true,
    },
  };
}
