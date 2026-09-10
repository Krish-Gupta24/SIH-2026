import {
  OptimizationObjectiveId,
  OptimizationObjectiveConfig,
  SweptParameterId,
  ParameterOptionItem,
  OptimizationConstraintConfig,
  CandidateResult,
  OptimizationSweepResult,
  CandidateMetrics,
} from "./types";
import { ShelterModel } from "@/types/shelter";

export const OPTIMIZATION_OBJECTIVES: OptimizationObjectiveConfig[] = [
  {
    id: "maximize_comfort",
    label: "Maximize Living Zone Comfort Hours",
    description: "Maximizes the hours zone temperatures stay within the 18°C–24°C comfort band, with nocturnal freeze protection.",
    metricLabel: "Hours in Comfort Band (%)",
    higherIsBetter: true,
  },
  {
    id: "minimize_auxiliary_energy",
    label: "Minimize Space Heating Energy Demand",
    description: "Minimizes annual auxiliary heating demand (kWh/m²·a) by maximizing thermal envelope resistance and passive heat storage.",
    metricLabel: "Heating Demand (kWh/m²·a)",
    higherIsBetter: false,
  },
  {
    id: "minimize_heat_loss",
    label: "Minimize Envelope Conduction & Infiltration Losses",
    description: "Minimizes the overall building heat transfer coefficient (UA) through opaque and glazed surfaces.",
    metricLabel: "Heat Loss Rate UA (W/K)",
    higherIsBetter: false,
  },
  {
    id: "maximize_useful_solar_gain",
    label: "Maximize Useful Passive Solar Aperture Gains",
    description: "Maximizes passive winter solar heat capture through south-facing glazing without causing daytime overheating.",
    metricLabel: "Useful Solar Gain (kWh)",
    higherIsBetter: true,
  },
  {
    id: "minimize_material_cost",
    label: "Minimize Material Cost & Remote Logistics Payload",
    description: "Optimizes thermal retention per unit material cost, minimizing high-altitude transport and payload weight penalties.",
    metricLabel: "Material Cost Index ($)",
    higherIsBetter: false,
  },
];

export const AVAILABLE_SWEPT_PARAMETERS: ParameterOptionItem[] = [
  {
    id: "orientation",
    label: "Building Azimuth Orientation",
    unit: "°",
    description: "Angle relative to True South solar aperture",
    options: [
      { label: "0° (True South)", value: 0 },
      { label: "15° (South-East)", value: 15 },
      { label: "30° (South-East)", value: 30 },
      { label: "45° (South-East Diagonal)", value: 45 },
      { label: "90° (East/West Facade)", value: 90 },
      { label: "180° (True North)", value: 180 },
    ],
    defaultSelected: true,
  },
  {
    id: "insulation_thickness",
    label: "Opaque Wall Insulation Thickness",
    unit: "m",
    description: "Thickness of exterior insulation layer",
    options: [
      { label: "50 mm (Standard Baseline)", value: 0.05 },
      { label: "100 mm (Moderate)", value: 0.10 },
      { label: "150 mm (Engineered Sweet Spot)", value: 0.15 },
      { label: "200 mm (Heavy Thermal Barrier)", value: 0.20 },
      { label: "250 mm (Super-Insulated)", value: 0.25 },
    ],
    defaultSelected: true,
  },
  {
    id: "wall_construction",
    label: "Wall Envelope Assembly",
    description: "Structural and thermal core material layers",
    options: [
      { label: "Standard EPS Wall (Lightweight)", value: "Standard_EPS_Wall" },
      { label: "Rammed Earth + EPS (High Mass)", value: "Rammed_Earth_EPS_Composite" },
      { label: "Local Granite Stone Masonry", value: "Granite_Stone_Masonry" },
      { label: "Aerogel Vacuum SuperWall", value: "Aerogel_Blanket_SuperWall" },
    ],
    defaultSelected: true,
  },
  {
    id: "roof_construction",
    label: "Roof Assembly",
    description: "Ceiling thermal barrier and exterior pitch",
    options: [
      { label: "Uninsulated Corrugated Sheet", value: "Uninsulated_Sheet_Roof" },
      { label: "Insulated Heavy Metal Roof", value: "Insulated_Heavy_Metal_Roof" },
      { label: "Aerogel Pitched Roof (15°)", value: "Aerogel_Insulated_Pitched_Roof" },
    ],
    defaultSelected: false,
  },
  {
    id: "window_area",
    label: "Window Aperture Area",
    unit: "m²",
    description: "Total glazed fenestration surface area",
    options: [
      { label: "1.4 m² (10% WWR)", value: 1.4 },
      { label: "2.8 m² (20% WWR - Standard)", value: 2.8 },
      { label: "4.2 m² (30% WWR - High Solar)", value: 4.2 },
      { label: "5.6 m² (40% WWR - Max Aperture)", value: 5.6 },
    ],
    defaultSelected: true,
  },
  {
    id: "glazing_type",
    label: "Glazing & Cavity Specification",
    description: "Glass panes, low-E coatings, and gas fill",
    options: [
      { label: "Single Clear (U=5.6, SHGC=0.82)", value: "Single_Clear" },
      { label: "Double Low-E Argon (U=1.4, SHGC=0.62)", value: "Double_LowE_Argon" },
      { label: "Triple Low-E Krypton (U=0.8, SHGC=0.52)", value: "Triple_LowE_Krypton" },
    ],
    defaultSelected: true,
  },
  {
    id: "window_placement",
    label: "Window Facade Placement",
    description: "Solar orientation concentration",
    options: [
      { label: "South-Dominant (Peak Winter Solar)", value: "south_dominant" },
      { label: "East/West Distributed", value: "east_west_distributed" },
    ],
    defaultSelected: false,
  },
  {
    id: "thermal_mass",
    label: "Internal Thermal Mass Strategy",
    description: "Heat retention capacitance and damping",
    options: [
      { label: "Lightweight Timber (Low Inertia)", value: "lightweight_timber" },
      { label: "Concrete Floor Slab (Medium)", value: "medium_concrete_slab" },
      { label: "High Mass Rammed Earth + PCM", value: "high_mass_rammed_earth_pcm" },
    ],
    defaultSelected: false,
  },
  {
    id: "ventilation",
    label: "Air Infiltration & Leakage Rate",
    unit: "ACH",
    description: "Envelope airtightness and air changes per hour",
    options: [
      { label: "0.18 ACH (Airtight + HRV)", value: 0.18 },
      { label: "0.35 ACH (High-Performance Seal)", value: 0.35 },
      { label: "0.60 ACH (Standard Construction)", value: 0.60 },
      { label: "1.20 ACH (Leaky Baseline Tent)", value: 1.20 },
    ],
    defaultSelected: false,
  },
];

export const DEFAULT_OPTIMIZATION_CONSTRAINTS: OptimizationConstraintConfig[] = [
  {
    id: "c-min-temp",
    name: "Survival Minimum Nighttime Temperature",
    metric: "indoorMinC",
    operator: ">=",
    threshold: 8.0,
    unit: "°C",
    description: "Living zone air must not dip below 8°C under extreme pre-dawn cold.",
    enabled: true,
  },
  {
    id: "c-max-thickness",
    name: "Maximum Allowable Wall Thickness",
    metric: "wallThicknessM",
    operator: "<=",
    threshold: 0.45,
    unit: "m",
    description: "Wall assembly cannot exceed 0.45m for transport logistics and usable footprint.",
    enabled: true,
  },
  {
    id: "c-max-wwr",
    name: "Structural Window-to-Wall Limit",
    metric: "wwrPct",
    operator: "<=",
    threshold: 40.0,
    unit: "%",
    description: "Glazing aperture cannot exceed 40% of host facade for seismic integrity.",
    enabled: true,
  },
];

function evaluateCandidateThermodynamics(
  model: ShelterModel,
  params: Record<string, any>
): CandidateMetrics {
  const L = model.geometry.length || 6.0;
  const W = model.geometry.width || 4.0;
  const H = model.geometry.height || 2.8;
  const floorArea = L * W;
  const volume = floorArea * H;

  // 1. Orientation solar factor
  const orientation = params.orientation ?? model.geometry.orientation ?? 0;
  const solarRad = Math.cos((orientation * Math.PI) / 180);
  const solarFactor = Math.max(0.2, (solarRad + 1.0) / 2.0);

  // 2. Wall U-value
  const insThickness = params.insulation_thickness ?? 0.15;
  const wallConstruction = params.wall_construction ?? "Standard_EPS_Wall";

  let kIns = 0.035;
  let massThickness = 0.05;
  let materialCostFactor = 1.0;

  if (wallConstruction === "Aerogel_Blanket_SuperWall") {
    kIns = 0.015;
    massThickness = 0.20;
    materialCostFactor = 2.4;
  } else if (wallConstruction === "Rammed_Earth_EPS_Composite") {
    kIns = 0.035;
    massThickness = 0.30;
    materialCostFactor = 1.2;
  } else if (wallConstruction === "Granite_Stone_Masonry") {
    kIns = 0.035;
    massThickness = 0.35;
    materialCostFactor = 1.3;
  }

  const rIns = insThickness / kIns;
  const rMass = massThickness / 1.10;
  const uWall = 1.0 / (rIns + rMass + 0.17);
  const totalWallThickness = insThickness + massThickness;

  // 3. Roof U-value
  const roofConst = params.roof_construction ?? "Insulated_Heavy_Metal_Roof";
  const uRoof = roofConst === "Aerogel_Insulated_Pitched_Roof" ? 0.14 : roofConst === "Insulated_Heavy_Metal_Roof" ? 0.22 : 1.85;

  // 4. Glazing U-value & SHGC
  const glazing = params.glazing_type ?? "Double_LowE_Argon";
  let uWindow = 1.40;
  let shgc = 0.62;
  let costGlazing = 140;

  if (glazing === "Triple_LowE_Krypton") {
    uWindow = 0.80;
    shgc = 0.52;
    costGlazing = 220;
  } else if (glazing === "Single_Clear") {
    uWindow = 5.60;
    shgc = 0.82;
    costGlazing = 50;
  }

  const winArea = params.window_area ?? 2.8;
  const winPlacement = params.window_placement ?? "south_dominant";
  const placementBonus = winPlacement === "south_dominant" ? 1.15 : 0.85;

  const totalWallArea = 2 * (L * H) + 2 * (W * H);
  const opaqueWallArea = totalWallArea - winArea;
  const wwr = (winArea / totalWallArea) * 100.0;

  // 5. Infiltration
  const ach = params.ventilation ?? 0.35;
  const hInf = 0.33 * ach * volume;

  // 6. Overall UA
  const uaWalls = opaqueWallArea * uWall;
  const uaRoof = floorArea * uRoof;
  const uaFloor = floorArea * 0.28;
  const uaWindows = winArea * uWindow;
  const uaTotal = uaWalls + uaRoof + uaFloor + uaWindows + hInf;

  // 7. Thermal mass damping
  const massMode = params.thermal_mass ?? "medium_concrete_slab";
  let dampingRatio = 76.0;
  if (massMode === "high_mass_rammed_earth_pcm") dampingRatio = 88.0;
  if (massMode === "lightweight_timber") dampingRatio = 38.0;

  // 8. Diurnal temperature balance with internal casual load (~450W continuous)
  const tAmbientMin = -18.0;
  const tAmbientMean = -11.0;
  const tAmbientMax = -4.0;
  const solarPeak = 780.0;
  const internalHeatW = 450.0;

  const solarKwhDay = winArea * shgc * (solarPeak / 1000.0) * 5.2 * solarFactor * placementBonus;
  const solarAvgW = (solarKwhDay * 1000.0) / 24.0;
  const totalHeatW = internalHeatW + solarAvgW;

  const passiveDeltaT = totalHeatW / Math.max(18.0, uaTotal);
  const indoorMeanC = tAmbientMean + passiveDeltaT;

  const diurnalSwingC = (tAmbientMax - tAmbientMin) * (1.0 - dampingRatio / 100.0);
  const indoorMinC = indoorMeanC - diurnalSwingC / 2.0;
  const indoorMaxC = indoorMeanC + diurnalSwingC / 2.0;

  // Comfort hours %
  let comfortPct = 0;
  if (indoorMinC >= 18.0 && indoorMaxC <= 24.0) {
    comfortPct = 100.0;
  } else if (indoorMaxC < 18.0) {
    const deficit = 18.0 - indoorMaxC;
    comfortPct = Math.max(0.0, 75.0 - deficit * 8.0);
  } else if (indoorMinC > 24.0) {
    const excess = indoorMinC - 24.0;
    comfortPct = Math.max(0.0, 75.0 - excess * 10.0);
  } else {
    const overlap = Math.min(24.0, indoorMaxC) - Math.max(18.0, indoorMinC);
    const span = Math.max(1.0, indoorMaxC - indoorMinC);
    comfortPct = Math.min(100.0, Math.max(10.0, (overlap / span) * 100.0));
  }

  // Annual space heating demand
  const hdd18 = 5200.0;
  const annualLossKwh = (uaTotal * hdd18 * 24.0) / 1000.0;
  const solarOffsetKwh = Math.min(annualLossKwh * 0.75, (solarKwhDay + (internalHeatW * 24.0) / 1000.0) * 180.0);
  const netHeatingKwh = Math.max(0.0, annualLossKwh - solarOffsetKwh);
  const heatingDemandKwhM2 = netHeatingKwh / floorArea;

  const peakHeatLossW = uaTotal * (20.0 - -25.0);

  // Material cost
  const insVol = opaqueWallArea * insThickness;
  const costIns = insVol * 120.0 * materialCostFactor;
  const costGlazingTotal = winArea * costGlazing;
  const totalCost = costIns + costGlazingTotal + (roofConst === "Aerogel_Insulated_Pitched_Roof" ? 1500 : 600);

  return {
    indoorMinC: Number(indoorMinC.toFixed(2)),
    indoorMaxC: Number(indoorMaxC.toFixed(2)),
    indoorMeanC: Number(indoorMeanC.toFixed(2)),
    diurnalSwingC: Number(diurnalSwingC.toFixed(2)),
    comfortHoursPct: Number(comfortPct.toFixed(1)),
    heatingDemandKwhM2: Number(heatingDemandKwhM2.toFixed(1)),
    peakHeatLossW: Math.round(peakHeatLossW),
    totalSolarGainKwh: Number((solarKwhDay * 3.0).toFixed(1)),
    totalHeatLossUA: Number(uaTotal.toFixed(1)),
    wallThicknessM: Number(totalWallThickness.toFixed(3)),
    wwrPct: Number(wwr.toFixed(1)),
    dampingRatioPct: dampingRatio,
    materialCostUsd: Math.round(totalCost),
  };
}

function computeObjectiveScore(
  objective: OptimizationObjectiveId,
  metrics: CandidateMetrics
): number {
  switch (objective) {
    case "maximize_comfort":
      return Number((metrics.comfortHoursPct * 1.0 + (metrics.indoorMinC - 10.0) * 2.0).toFixed(2));
    case "minimize_auxiliary_energy":
      return Number(Math.max(0.0, 250.0 - metrics.heatingDemandKwhM2 * 1.2).toFixed(2));
    case "minimize_heat_loss":
      return Number(Math.max(0.0, 300.0 - metrics.totalHeatLossUA * 2.5).toFixed(2));
    case "maximize_useful_solar_gain": {
      const overheatingPenalty = Math.max(0.0, metrics.indoorMaxC - 25.0) * 15.0;
      return Number((metrics.totalSolarGainKwh * 2.5 - overheatingPenalty).toFixed(2));
    }
    case "minimize_material_cost":
      return Number(Math.max(0.0, 1000.0 - (metrics.materialCostUsd * 0.2 + metrics.heatingDemandKwhM2 * 2.5)).toFixed(2));
    default:
      return metrics.comfortHoursPct;
  }
}

export function runClientParameterSweep(
  model: ShelterModel,
  selectedParameters: SweptParameterId[],
  objective: OptimizationObjectiveId,
  constraints: OptimizationConstraintConfig[],
  maxCandidates: number = 100
): OptimizationSweepResult {
  const startTime = Date.now();
  const runId = `opt-sweep-${Date.now().toString().slice(-6)}`;

  // 1. Cartesian combinations
  const sweptConfigs = AVAILABLE_SWEPT_PARAMETERS.filter((p) =>
    selectedParameters.includes(p.id)
  );

  const optionLists = sweptConfigs.map((c) => c.options.map((o) => ({ [c.id]: o.value })));

  let combinations: Record<string, any>[] = [{}];
  for (const list of optionLists) {
    const next: Record<string, any>[] = [];
    for (const prefix of combinations) {
      for (const item of list) {
        next.push({ ...prefix, ...item });
      }
    }
    combinations = next;
  }

  // Stride sampling if combinations exceed limit
  let sampledCombinations = combinations;
  if (combinations.length > maxCandidates) {
    const step = Math.ceil(combinations.length / maxCandidates);
    sampledCombinations = combinations.filter((_, idx) => idx % step === 0).slice(0, maxCandidates);
  }

  const evaluated: CandidateResult[] = [];
  let validCount = 0;
  let feasibleCount = 0;

  for (let idx = 0; idx < sampledCombinations.length; idx++) {
    const params = sampledCombinations[idx];
    validCount++;

    const metrics = evaluateCandidateThermodynamics(model, params);
    let score = computeObjectiveScore(objective, metrics);

    // Enforce constraints
    const violations: string[] = [];
    let isFeasible = true;

    for (const c of constraints.filter((c) => c.enabled)) {
      const val = (metrics as any)[c.metric];
      if (val !== undefined) {
        if (c.operator === ">=" && val < c.threshold) {
          isFeasible = false;
          violations.push(`${c.name}: ${val}${c.unit} < ${c.threshold}${c.unit}`);
        } else if (c.operator === "<=" && val > c.threshold) {
          isFeasible = false;
          violations.push(`${c.name}: ${val}${c.unit} > ${c.threshold}${c.unit}`);
        }
      }
    }

    if (isFeasible) {
      feasibleCount++;
    } else {
      score -= 1000.0; // Penalty
    }

    evaluated.push({
      id: `cand-${String(idx + 1).padStart(3, "0")}`,
      rank: 0,
      simulationId: `sim-rc-${String(idx + 1).padStart(3, "0")}`,
      engineVersion: "RC Model (Client Approximation)",
      weatherDataset: model.location?.region || "Local Design Baseline",
      status: "COMPLETED",
      parameters: params,
      metrics,
      objectiveScore: score,
      isFeasible,
      violations,
      isPareto: false,
    });
  }

  // Rank: feasible first, then descending score
  evaluated.sort((a, b) => {
    if (a.isFeasible && !b.isFeasible) return -1;
    if (!a.isFeasible && b.isFeasible) return 1;
    return b.objectiveScore - a.objectiveScore;
  });

  evaluated.forEach((c, i) => {
    c.rank = i + 1;
  });

  // Identify Pareto frontier (Comfort Hours vs Heating Demand)
  const feasible = evaluated.filter((c) => c.isFeasible);
  for (const c1 of feasible) {
    let dominated = false;
    for (const c2 of feasible) {
      if (c1 === c2) continue;
      if (
        c2.metrics.comfortHoursPct >= c1.metrics.comfortHoursPct &&
        c2.metrics.heatingDemandKwhM2 <= c1.metrics.heatingDemandKwhM2 &&
        (c2.metrics.comfortHoursPct > c1.metrics.comfortHoursPct ||
          c2.metrics.heatingDemandKwhM2 < c1.metrics.heatingDemandKwhM2)
      ) {
        dominated = true;
        break;
      }
    }
    c1.isPareto = !dominated;
  }

  const durationSec = (Date.now() - startTime) / 1000;
  const bestCandidate = evaluated[0] || null;

  const objConfig = OPTIMIZATION_OBJECTIVES.find((o) => o.id === objective);

  return {
    runId,
    timestamp: new Date().toISOString(),
    algorithm: "Deterministic Parameter Sweep (RC Approximation)",
    engineVersion: "RC Model (Client Preview)",
    objective,
    objectiveTitle: objConfig?.label || "Maximize Comfort",
    baseProjectId: model.id,
    weatherDataset: model.location?.region || "Leh Airport Station (3500m)",
    totalGenerated: combinations.length,
    validCount,
    feasibleCount,
    failedCount: 0,
    executionDurationSec: Number(durationSec.toFixed(2)),
    parametersSwept: selectedParameters,
    bestCandidate,
    rankedCandidates: evaluated,
    paretoCandidates: evaluated.filter((c) => c.isPareto),
  };
}

export async function runBackendEnergyPlusSweep(
  model: ShelterModel,
  selectedParameters: SweptParameterId[],
  objective: OptimizationObjectiveId,
  constraints: OptimizationConstraintConfig[],
  maxCandidates: number = 25,
  runPeriodDays: number = 3
): Promise<OptimizationSweepResult> {
  const payload = {
    shelter_model: model,
    objective,
    parameters_to_sweep: selectedParameters,
    constraints: constraints.filter((c) => c.enabled).map((c) => ({
      name: c.name,
      metric:
        c.metric === "indoorMinC"
          ? "indoor_min_c"
          : c.metric === "wallThicknessM"
          ? "total_wall_thickness_m"
          : c.metric === "wwrPct"
          ? "window_to_wall_ratio_pct"
          : "comfort_hours_pct",
      operator: c.operator,
      threshold: c.threshold,
      description: c.description,
    })),
    max_candidates: maxCandidates,
    run_period_days: runPeriodDays,
  };

  const response = await fetch("/api/v1/optimization/sweep", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`EnergyPlus optimization sweep failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const meta = data.metadata || {};

  const ranked: CandidateResult[] = (data.ranked_candidates || []).map((c: any) => ({
    id: c.candidate_id,
    rank: c.rank,
    simulationId: c.simulation_id,
    engineVersion: c.engine_version || meta.engine_version || "EnergyPlus v24.1.0",
    weatherDataset: c.weather_dataset || meta.weather_dataset,
    status: c.status || "COMPLETED",
    parameters: c.parameters,
    metrics: {
      indoorMinC: c.metrics?.indoor_min_c ?? 0,
      indoorMaxC: c.metrics?.indoor_max_c ?? 0,
      indoorMeanC: c.metrics?.indoor_mean_c ?? 0,
      diurnalSwingC: c.metrics?.diurnal_swing_c ?? 0,
      comfortHoursPct: c.metrics?.comfort_hours_pct ?? 0,
      heatingDemandKwhM2: c.metrics?.heating_demand_kwh_m2 ?? 0,
      peakHeatLossW: c.metrics?.peak_heat_loss_w ?? 0,
      totalSolarGainKwh: c.metrics?.total_solar_gain_kwh ?? 0,
      totalHeatLossUA: c.metrics?.total_heat_loss_rate_ua ?? 0,
      wallThicknessM: c.metrics?.total_wall_thickness_m ?? 0,
      wwrPct: c.metrics?.window_to_wall_ratio_pct ?? 0,
      dampingRatioPct: c.metrics?.diurnal_swing_damping_pct ?? 0,
      materialCostUsd: c.metrics?.material_cost_usd ?? 0,
    },
    objectiveScore: c.objective_score ?? 0,
    isFeasible: c.is_feasible ?? false,
    violations: c.constraint_violations || [],
    isPareto: c.is_pareto_optimal || false,
  }));

  const best = ranked[0] || null;

  return {
    runId: meta.run_id || `opt-${Date.now()}`,
    timestamp: meta.timestamp || new Date().toISOString(),
    algorithm: meta.algorithm || "Deterministic Parameter Sweep (EnergyPlus Physical Simulation)",
    engineVersion: meta.engine_version || "24.1.0",
    objective,
    objectiveTitle: OPTIMIZATION_OBJECTIVES.find((o) => o.id === objective)?.label || "Maximize Comfort",
    baseProjectId: meta.base_project_id || model.id,
    weatherDataset: meta.weather_dataset || "Weather EPW",
    totalGenerated: meta.total_generated || ranked.length,
    validCount: meta.valid_count || ranked.length,
    feasibleCount: meta.feasible_count || ranked.filter((r) => r.isFeasible).length,
    failedCount: meta.failed_count || ranked.filter((r) => r.status === "FAILED").length,
    executionDurationSec: meta.execution_duration_seconds || 0,
    parametersSwept: selectedParameters,
    bestCandidate: best,
    rankedCandidates: ranked,
    paretoCandidates: ranked.filter((r) => r.isPareto),
  };
}
