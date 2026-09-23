/**
 * Fuel Logistics & Economic Calculation Engine
 * 
 * Computes end-to-end fuel lifecycle cost in alpine/remote environments:
 *   Total Fuel Cost = Fuel Purchase Cost + Transportation Cost + Handling/Storage Cost
 *   Total Energy Cost = Total Fuel Cost + Electricity Cost
 * 
 * CRITICAL MODELING RULES:
 * 1. Do NOT assume all fuel is air-transported. Modes include Road, Air, Mixed, Custom.
 * 2. Do NOT hardcode regional fuel prices as ground truth.
 * 3. All values are explicitly user-configurable and labeled "User-defined / assumed values".
 */

import {
  FuelLogisticsConfig,
  KeroseneBackupConfig,
  CostBreakdownSummary,
} from "./energy-types";

export const DEFAULT_LOGISTICS_CONFIG: FuelLogisticsConfig = {
  fuelSourceLocation: "Strategic Base Supply Depot / Railhead",
  shelterLocation: "High-Altitude Forward Deployment Post",
  transportMode: "road",
  transportDistanceKm: 320, // km round trip or staging distance
  transportCostPerKmPerTrip: 45, // ₹/km for mountain logistics truck
  vehicleCapacityLitres: 1500, // L capacity per trip
  numberOfTrips: 1, // dynamically calculated or calibrated
  loadingUnloadingCostPerTrip: 2500, // ₹ per transit cycle
  storageInfrastructureCostMonthly: 1800, // ₹/month depot maintenance
  handlingDistributionCostPerLitre: 4.5, // ₹/L cold weather decanting & winterized storage
  remoteAreaLogisticsPremiumPct: 20, // 20% surcharge for alpine terrain/passes
  winterLogisticsMultiplier: 1.35, // 1.35x cost during snowbound operational months
};

export const DEFAULT_KEROSENE_CONFIG: KeroseneBackupConfig = {
  heaterEfficiencyPct: 82, // 82% efficiency for sealed flued catalytic/radiant space heater
  specificEnergyKwhPerLitre: 9.8, // 9.8 kWh thermal output per Litre of aviation/grade kerosene
  kerosenePricePerLitre: 68.0, // ₹/L assumed base purchase cost (editable)
  maxAvailableKeroseneL: 300, // 300 L maximum winter fuel cache
  handlingStorageCostPerLitre: 3.5, // ₹/L storage & drum handling
};

export interface LogisticsCalculationInput {
  keroseneLPerMonth: number;
  baselineKeroseneLPerMonth: number;
  electricityKwhPerMonth: number;
  baselineElectricityKwhPerMonth?: number;
  keroseneConfig: KeroseneBackupConfig;
  logisticsConfig: FuelLogisticsConfig;
  electricityTariffPerKwh?: number;
  isWinterSeason?: boolean;
}

/**
 * Calculates monthly transportation and logistics costs for delivered fuel.
 */
export function calculateFuelLogistics(
  litresPerMonth: number,
  config: FuelLogisticsConfig,
  isWinterSeason: boolean = true
) {
  if (litresPerMonth <= 0) {
    return {
      tripsRequired: 0,
      transitCost: 0,
      loadingCost: 0,
      handlingCost: 0,
      storageCost: 0,
      totalLogisticsCost: 0,
      effectiveLogisticsPerLitre: 0,
    };
  }

  // Calculate required trips based on vehicle payload capacity
  const capacity = Math.max(100, config.vehicleCapacityLitres);
  const tripsRequired = Math.max(1, Math.ceil(litresPerMonth / capacity));

  // Base road/air transit costs per trip
  let modeMultiplier = 1.0;
  if (config.transportMode === "air") modeMultiplier = 4.2;
  else if (config.transportMode === "mixed") modeMultiplier = 2.1;
  else if (config.transportMode === "custom") modeMultiplier = 1.0;

  const baseTransitPerTrip = config.transportDistanceKm * config.transportCostPerKmPerTrip * modeMultiplier;
  const terrainMultiplier = 1 + config.remoteAreaLogisticsPremiumPct / 100;
  const seasonalMultiplier = isWinterSeason ? config.winterLogisticsMultiplier : 1.0;

  const totalTransitCost = tripsRequired * baseTransitPerTrip * terrainMultiplier * seasonalMultiplier;
  const totalLoadingCost = tripsRequired * config.loadingUnloadingCostPerTrip * seasonalMultiplier;
  const totalHandlingCost = litresPerMonth * config.handlingDistributionCostPerLitre;
  const totalStorageCost = config.storageInfrastructureCostMonthly;

  const totalLogisticsCost = totalTransitCost + totalLoadingCost + totalHandlingCost + totalStorageCost;
  const effectiveLogisticsPerLitre = litresPerMonth > 0 ? totalLogisticsCost / litresPerMonth : 0;

  return {
    tripsRequired,
    transitCost: Math.round(totalTransitCost),
    loadingCost: Math.round(totalLoadingCost),
    handlingCost: Math.round(totalHandlingCost),
    storageCost: Math.round(totalStorageCost),
    totalLogisticsCost: Math.round(totalLogisticsCost),
    effectiveLogisticsPerLitre: parseFloat(effectiveLogisticsPerLitre.toFixed(2)),
  };
}

/**
 * Calculates complete comparative economic breakdown between Baseline and Proposed shelter.
 */
export function calculateComparativeEconomics(
  input: LogisticsCalculationInput
): CostBreakdownSummary {
  const {
    keroseneLPerMonth,
    baselineKeroseneLPerMonth,
    electricityKwhPerMonth,
    baselineElectricityKwhPerMonth = 0,
    keroseneConfig,
    logisticsConfig,
    electricityTariffPerKwh = 6.5, // ₹/kWh average microgrid/grid cost
    isWinterSeason = true,
  } = input;

  // 1. Proposed Shelter Fuel Costs
  const proposedFuelPurchase = keroseneLPerMonth * keroseneConfig.kerosenePricePerLitre;
  const proposedLogistics = calculateFuelLogistics(keroseneLPerMonth, logisticsConfig, isWinterSeason);
  const proposedHandlingStorage = proposedLogistics.handlingCost + proposedLogistics.storageCost;
  const proposedTotalFuelCost = proposedFuelPurchase + proposedLogistics.totalLogisticsCost;

  // 2. Proposed Shelter Electricity Costs
  const proposedElectricityCost = electricityKwhPerMonth * electricityTariffPerKwh;
  const proposedTotalEnergyCost = proposedTotalFuelCost + proposedElectricityCost;

  // 3. Baseline Conventional Shelter Costs (100% Kerosene reliant)
  const baselineFuelPurchase = baselineKeroseneLPerMonth * keroseneConfig.kerosenePricePerLitre;
  const baselineLogistics = calculateFuelLogistics(baselineKeroseneLPerMonth, logisticsConfig, isWinterSeason);
  const baselineTotalFuelCost = baselineFuelPurchase + baselineLogistics.totalLogisticsCost;
  const baselineElectricityCost = baselineElectricityKwhPerMonth * electricityTariffPerKwh;
  const baselineTotalCost = baselineTotalFuelCost + baselineElectricityCost;

  // 4. Savings Calculations
  const monthlyMoneySaved = Math.max(0, baselineTotalCost - proposedTotalEnergyCost);
  const dailyMoneySaved = monthlyMoneySaved / 30;
  const costReductionPercentage = baselineTotalCost > 0 
    ? parseFloat(((monthlyMoneySaved / baselineTotalCost) * 100).toFixed(1)) 
    : 0;

  return {
    fuelPurchaseCostPerMonth: Math.round(proposedFuelPurchase),
    transportationCostPerMonth: Math.round(proposedLogistics.transitCost + proposedLogistics.loadingCost),
    handlingStorageCostPerMonth: Math.round(proposedHandlingStorage),
    totalLogisticsCostPerMonth: Math.round(proposedLogistics.totalLogisticsCost),
    totalFuelCostPerMonth: Math.round(proposedTotalFuelCost),
    electricityCostPerMonth: Math.round(proposedElectricityCost),
    totalHeatingCostPerMonth: Math.round(proposedTotalFuelCost + proposedElectricityCost * 0.85),
    totalEnergyCostPerMonth: Math.round(proposedTotalEnergyCost),
    dailyTotalCost: Math.round(proposedTotalEnergyCost / 30),
    monthlyTotalCost: Math.round(proposedTotalEnergyCost),

    baselineFuelCostPerMonth: Math.round(baselineTotalFuelCost),
    baselineTotalCostPerMonth: Math.round(baselineTotalCost),
    moneySavedPerDay: Math.round(dailyMoneySaved),
    moneySavedPerMonth: Math.round(monthlyMoneySaved),
    costReductionPercentage,
  };
}
