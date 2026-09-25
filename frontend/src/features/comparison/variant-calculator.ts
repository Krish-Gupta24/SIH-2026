/**
 * Shelter Variant Thermal & Logistics Physics Calculator
 * DRDO Problem Statement 26051: Material, Size & Shape Prediction Model
 */

import { MaterialItem } from "@/lib/store/use-shelter-store";
import { ShelterModel } from "@/types/shelter";

export interface ShelterVariant {
  id: string;
  name: string;
  description: string;
  // Dimensions
  length: number; // m
  width: number; // m
  height: number; // m
  // Wall configuration
  wallInsulationMatId: string;
  wallInsulationThicknessMm: number;
  wallMassMatId: string;
  wallMassThicknessMm: number;
  // Roof configuration
  roofInsulationMatId: string;
  roofInsulationThicknessMm: number;
  // Floor configuration
  floorInsulationMatId: string;
  floorInsulationThicknessMm: number;
  // Glazing configuration
  glazingMatId: string;
  windowAreaM2: number;
  // Thermal Battery
  hasPcm: boolean;
  pcmThicknessMm: number;
}

export interface VariantMetrics {
  wallUValue: number; // W/m²·K
  roofUValue: number; // W/m²·K
  floorUValue: number; // W/m²·K
  glazingUValue: number; // W/m²·K
  floorAreaM2: number; // m²
  heatedVolumeM3: number; // m³
  totalEnvelopeLossW: number; // W at design temperature
  estimatedComfortPct: number; // % annual hours 18-24°C
  estimatedFuelDisplacementLiters: number; // Liters kerosene saved/year
  estimatedAnnualCostSavingsInr: number; // ₹ saved/year
  totalEnvelopeWeightKg: number; // kg
  estimatedMaterialCostInr: number; // ₹
  compositeEfficiencyScore: number; // 0 - 100
}

// Material conductivity fallback map
const CONDUCTIVITY_MAP: Record<string, number> = {
  "mat-aerogel-blanket": 0.015,
  "mat-aerogel-spb": 0.017,
  "mat-spray-puf": 0.022,
  "mat-polyurethane-foam": 0.024,
  "mat-xps-insulation": 0.029,
  "mat-eps-insulation": 0.035,
  "mat-wood-fiber-insulation": 0.038,
  "mat-mineral-wool": 0.038,
  "mat-cellulose-dense-pack": 0.039,
  "mat-sheep-wool": 0.039,
  "mat-hemp-fiber-board": 0.040,
  "mat-expanded-cork": 0.040,
  "mat-expanded-perlite": 0.048,
  "mat-calcium-silicate": 0.065,
  "mat-adobe-block": 0.75,
  "mat-rammed-earth": 1.25,
  "mat-concrete-slab": 1.40,
  "mat-sandstone-masonry": 1.60,
  "mat-basalt-stone": 1.90,
  "mat-granite-stone": 2.80,
  "mat-pcm-salt-hydrate": 0.54,
  "mat-pcm-paraffin-23": 0.21,
  // Glazing U-values
  "mat-single-clear-glass": 5.7,
  "mat-double-clear-glass": 2.8,
  "mat-double-low-e": 1.4,
  "mat-triple-low-e-krypton": 0.78,
  "mat-quad-glazing": 0.45,
  "mat-aerogel-translucent": 0.55,
};

// Material density fallback map (kg/m³)
const DENSITY_MAP: Record<string, number> = {
  "mat-aerogel-blanket": 160,
  "mat-aerogel-spb": 180,
  "mat-spray-puf": 35,
  "mat-polyurethane-foam": 32,
  "mat-xps-insulation": 35,
  "mat-eps-insulation": 25,
  "mat-mineral-wool": 60,
  "mat-rammed-earth": 2000,
  "mat-adobe-block": 1850,
  "mat-concrete-slab": 2200,
  "mat-sandstone-masonry": 2300,
  "mat-pcm-salt-hydrate": 1500,
  "mat-pcm-paraffin-23": 900,
};

// Material estimated cost per m³ (₹)
const COST_PER_M3_MAP: Record<string, number> = {
  "mat-aerogel-blanket": 180000,
  "mat-aerogel-spb": 220000,
  "mat-spray-puf": 14000,
  "mat-polyurethane-foam": 16000,
  "mat-xps-insulation": 12000,
  "mat-eps-insulation": 6500,
  "mat-mineral-wool": 8000,
  "mat-hemp-fiber-board": 15000,
  "mat-wood-fiber-insulation": 13000,
  "mat-rammed-earth": 2500,
  "mat-adobe-block": 3500,
  "mat-concrete-slab": 7500,
  "mat-pcm-salt-hydrate": 65000,
  "mat-pcm-paraffin-23": 85000,
};

export function calculateVariantMetrics(
  variant: ShelterVariant,
  materialsList: MaterialItem[] = [],
  outdoorMinC: number = -20
): VariantMetrics {
  const getK = (matId: string, fallback: number = 0.04): number => {
    const mat = materialsList.find((m) => m.id === matId);
    if (mat && mat.thermalConductivity > 0) return mat.thermalConductivity;
    return CONDUCTIVITY_MAP[matId] ?? fallback;
  };

  const getDensity = (matId: string, fallback: number = 50): number => {
    const mat = materialsList.find((m) => m.id === matId);
    if (mat && mat.density > 0) return mat.density;
    return DENSITY_MAP[matId] ?? fallback;
  };

  const getCostM3 = (matId: string, fallback: number = 8000): number => {
    return COST_PER_M3_MAP[matId] ?? fallback;
  };

  // Dimensions
  const L = variant.length;
  const W = variant.width;
  const H = variant.height;
  const floorArea = L * W;
  const volume = floorArea * H;
  const perimeter = 2 * (L + W);
  const grossWallArea = perimeter * H;
  const netWallArea = Math.max(10, grossWallArea - variant.windowAreaM2);
  const roofArea = floorArea * 1.05; // 5% pitch allowance

  // 1. Wall U-Value: ISO 6946 (R_si = 0.13, R_se = 0.04)
  const kWallIns = getK(variant.wallInsulationMatId, 0.035);
  const rWallIns = (variant.wallInsulationThicknessMm / 1000) / kWallIns;
  const kWallMass = getK(variant.wallMassMatId, 1.25);
  const rWallMass = (variant.wallMassThicknessMm / 1000) / kWallMass;
  const rWallTotal = 0.13 + rWallIns + rWallMass + 0.04;
  const wallU = parseFloat((1 / rWallTotal).toFixed(3));

  // 2. Roof U-Value: ISO 6946 (R_si = 0.10, R_se = 0.04)
  const kRoofIns = getK(variant.roofInsulationMatId, 0.035);
  const rRoofIns = (variant.roofInsulationThicknessMm / 1000) / kRoofIns;
  const rRoofTotal = 0.10 + rRoofIns + 0.04;
  const roofU = parseFloat((1 / rRoofTotal).toFixed(3));

  // 3. Floor U-Value: Ground slab (R_si = 0.17, R_g = 0.45)
  const kFloorIns = getK(variant.floorInsulationMatId, 0.029);
  const rFloorIns = (variant.floorInsulationThicknessMm / 1000) / kFloorIns;
  const rFloorTotal = 0.17 + rFloorIns + 0.45;
  const floorU = parseFloat((1 / rFloorTotal).toFixed(3));

  // 4. Glazing U-Value
  let glazingU = CONDUCTIVITY_MAP[variant.glazingMatId] ?? 1.4;
  if (variant.glazingMatId.includes("triple")) glazingU = 0.78;
  if (variant.glazingMatId.includes("quad")) glazingU = 0.45;
  if (variant.glazingMatId.includes("double-low-e")) glazingU = 1.4;
  if (variant.glazingMatId.includes("single")) glazingU = 5.7;

  // 5. Total Steady-State Heat Loss at Outdoor Design Temp
  const deltaT = 20 - outdoorMinC; // Target 20°C indoors
  const qWall = netWallArea * wallU * deltaT;
  const qRoof = roofArea * roofU * deltaT;
  const qFloor = floorArea * floorU * deltaT;
  const qWindow = variant.windowAreaM2 * glazingU * deltaT;
  const qInfiltration = 0.25 * volume * 0.83 * 1005 * deltaT / 3600; // 0.25 ACH at 3500m
  const totalLossW = Math.round(qWall + qRoof + qFloor + qWindow + qInfiltration);

  // 6. Estimated Autonomous Comfort Percentage (0 - 100%)
  // Baseline tin shed is ~12-18% comfort. Super-insulated with Trombe + PCM reaches 95%+.
  let comfortScore = 80;
  // Wall U effect
  if (wallU <= 0.18) comfortScore += 7;
  else if (wallU <= 0.25) comfortScore += 4;
  else if (wallU > 0.45) comfortScore -= 12;

  // Roof U effect
  if (roofU <= 0.14) comfortScore += 6;
  else if (roofU <= 0.22) comfortScore += 3;
  else if (roofU > 0.40) comfortScore -= 10;

  // Glazing effect
  if (glazingU <= 0.8) comfortScore += 5;
  else if (glazingU <= 1.4) comfortScore += 2;
  else if (glazingU > 2.5) comfortScore -= 8;

  // Thermal Mass & PCM
  if (variant.wallMassThicknessMm >= 250) comfortScore += 4;
  if (variant.hasPcm) comfortScore += 4;

  const estimatedComfortPct = Math.min(97, Math.max(25, comfortScore));

  // 7. Estimated Kerosene Fuel Displacement (vs 540 L/mo uninsulated baseline)
  const baselineLitresYear = 540 * 6; // 6 winter months
  const fuelSavingsFraction = (estimatedComfortPct - 20) / 80;
  const estimatedFuelDisplacementLiters = Math.round(baselineLitresYear * fuelSavingsFraction);
  const estimatedAnnualCostSavingsInr = estimatedFuelDisplacementLiters * 185; // ₹185/L delivered

  // 8. Total Envelope Weight Calculation (kg) - critical for military high-altitude airlift
  const wallInsVol = netWallArea * (variant.wallInsulationThicknessMm / 1000);
  const wallMassVol = netWallArea * (variant.wallMassThicknessMm / 1000);
  const roofInsVol = roofArea * (variant.roofInsulationThicknessMm / 1000);
  const floorInsVol = floorArea * (variant.floorInsulationThicknessMm / 1000);

  const weightWallIns = wallInsVol * getDensity(variant.wallInsulationMatId, 28);
  const weightWallMass = wallMassVol * getDensity(variant.wallMassMatId, 1850);
  const weightRoofIns = roofInsVol * getDensity(variant.roofInsulationMatId, 28);
  const weightFloorIns = floorInsVol * getDensity(variant.floorInsulationMatId, 35);
  const weightGlazing = variant.windowAreaM2 * 25; // ~25kg/m² glass
  const weightStructuralSkin = (grossWallArea + roofArea) * 12; // metal / timber skins

  const totalEnvelopeWeightKg = Math.round(
    weightWallIns + weightWallMass + weightRoofIns + weightFloorIns + weightGlazing + weightStructuralSkin
  );

  // 9. Estimated Material Construction Cost (₹)
  const costWallIns = wallInsVol * getCostM3(variant.wallInsulationMatId, 7000);
  const costWallMass = wallMassVol * getCostM3(variant.wallMassMatId, 2500);
  const costRoofIns = roofInsVol * getCostM3(variant.roofInsulationMatId, 7000);
  const costFloorIns = floorInsVol * getCostM3(variant.floorInsulationMatId, 12000);
  const costGlazing = variant.windowAreaM2 * (glazingU <= 0.8 ? 9500 : 4500);
  const costPcm = variant.hasPcm ? floorArea * 0.4 * (variant.pcmThicknessMm / 1000) * 75000 : 0;
  const estimatedMaterialCostInr = Math.round(
    costWallIns + costWallMass + costRoofIns + costFloorIns + costGlazing + costPcm + 85000 // base structural frame
  );

  // 10. Composite Score (Balanced thermal comfort, lightweight portability, cost effectiveness)
  const comfortComponent = (estimatedComfortPct / 100) * 50; // 50 pts
  const thermalEfficiencyComponent = Math.max(0, (0.5 - wallU) / 0.5) * 25; // 25 pts
  const weightPenalty = Math.min(25, (totalEnvelopeWeightKg / 12000) * 25);
  const compositeEfficiencyScore = Math.min(
    100,
    Math.round(comfortComponent + thermalEfficiencyComponent + (25 - weightPenalty * 0.4))
  );

  return {
    wallUValue: wallU,
    roofUValue: roofU,
    floorUValue: floorU,
    glazingUValue: glazingU,
    floorAreaM2: parseFloat(floorArea.toFixed(1)),
    heatedVolumeM3: parseFloat(volume.toFixed(1)),
    totalEnvelopeLossW: totalLossW,
    estimatedComfortPct,
    estimatedFuelDisplacementLiters,
    estimatedAnnualCostSavingsInr,
    totalEnvelopeWeightKg,
    estimatedMaterialCostInr,
    compositeEfficiencyScore,
  };
}

export function generateDefaultVariants(activeShelter?: ShelterModel | null): ShelterVariant[] {
  const geom = activeShelter?.geometry || { length: 6, width: 4, height: 2.8 };

  return [
    {
      id: "var-a-baseline",
      name: "Variant A: Standard Army Spec",
      description: "Baseline standard 100mm EPS wall, double glazing, no thermal mass battery.",
      length: geom.length || 6,
      width: geom.width || 4,
      height: geom.height || 2.8,
      wallInsulationMatId: "mat-eps-insulation",
      wallInsulationThicknessMm: 100,
      wallMassMatId: "mat-concrete-slab",
      wallMassThicknessMm: 100,
      roofInsulationMatId: "mat-eps-insulation",
      roofInsulationThicknessMm: 150,
      floorInsulationMatId: "mat-eps-insulation",
      floorInsulationThicknessMm: 75,
      glazingMatId: "mat-double-clear-glass",
      windowAreaM2: 2.8,
      hasPcm: false,
      pcmThicknessMm: 0,
    },
    {
      id: "var-b-aerogel-pir",
      name: "Variant B: High-Density Polyurethane (PIR) & Adobe",
      description: "Thicker 150mm PIR envelope with 250mm local compressed earth block mass.",
      length: geom.length || 6,
      width: geom.width || 4,
      height: geom.height || 2.8,
      wallInsulationMatId: "mat-polyurethane-foam",
      wallInsulationThicknessMm: 150,
      wallMassMatId: "mat-adobe-block",
      wallMassThicknessMm: 230,
      roofInsulationMatId: "mat-polyurethane-foam",
      roofInsulationThicknessMm: 200,
      floorInsulationMatId: "mat-xps-insulation",
      floorInsulationThicknessMm: 100,
      glazingMatId: "mat-double-low-e",
      windowAreaM2: 3.4,
      hasPcm: false,
      pcmThicknessMm: 0,
    },
    {
      id: "var-c-passive-champion",
      name: "Variant C: Peak Passive Solar (Ladakh Champion)",
      description: "200mm continuous EPS, 300mm rammed-earth Trombe wall, Triple Low-E Krypton, and 21°C PCM.",
      length: geom.length || 6,
      width: geom.width || 4,
      height: geom.height || 2.8,
      wallInsulationMatId: "mat-eps-insulation",
      wallInsulationThicknessMm: 200,
      wallMassMatId: "mat-rammed-earth",
      wallMassThicknessMm: 300,
      roofInsulationMatId: "mat-eps-insulation",
      roofInsulationThicknessMm: 250,
      floorInsulationMatId: "mat-xps-insulation",
      floorInsulationThicknessMm: 150,
      glazingMatId: "mat-triple-low-e-krypton",
      windowAreaM2: 4.2,
      hasPcm: true,
      pcmThicknessMm: 20,
    },
  ];
}
