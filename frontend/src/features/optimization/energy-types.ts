/**
 * Types for Thermal, Energy, Fuel, Cost & Comfort Optimization Module.
 * Strict physical units: kW, kWh, Litres (L), Rupees (₹), °C, Hours (h).
 * Includes both Rooftop Solar PV and Window BIPV (Building Integrated Photovoltaic) Panes.
 * All economic & logistics inputs are user-configurable and labeled as model estimates/assumptions.
 */

import { ShelterModel, RoofSolarPanelsConfig, WindowSolarPaneConfig } from "@/types/shelter";

export interface ComfortConfig {
  comfortMinC: number; // e.g. 18°C
  comfortMaxC: number; // e.g. 24°C
}

export interface EnergySystemConfig {
  solarPvCapacityKw: number; // e.g. 3.2 kW (computed from roof PV + window BIPV or manual override)
  solarPerformanceRatio: number; // e.g. 0.82 derating factor (losses, temperature, snow)
  batteryCapacityKwh: number; // e.g. 7.2 kWh
  batteryEfficiencyPct: number; // round-trip efficiency e.g. 88%
  batteryMaxDischargeRateKw: number; // e.g. 2.5 kW
  batteryMinSocPct: number; // minimum depth of discharge limit e.g. 20%
  electricHeaterCapacityKw: number; // e.g. 2.0 kW
  electricHeaterEfficiencyPct: number; // e.g. 98%
  householdBaseLoadW: number; // e.g. 150 W (lighting, communications, medical, separate from space heating)
  electricityGridPricePerKwh: number; // ₹/kWh for any supplemental grid/microgrid power
  includeRooftopSolar: boolean;
  includeWindowSolarPanes: boolean;
}

export interface KeroseneBackupConfig {
  heaterEfficiencyPct: number; // e.g. 82%
  specificEnergyKwhPerLitre: number; // 9.8 kWh/L thermal density
  kerosenePricePerLitre: number; // ₹/L purchase price (user-defined assumption)
  maxAvailableKeroseneL: number; // max storage buffer e.g. 200 L
  handlingStorageCostPerLitre: number; // ₹/L on-site storage/handling
}

export type TransportMode = "road" | "air" | "mixed" | "custom";

export interface FuelLogisticsConfig {
  fuelSourceLocation: string; // e.g. "Regional Supply Depot / Railhead"
  shelterLocation: string; // e.g. "Alpine High-Altitude Outpost"
  transportMode: TransportMode;
  transportDistanceKm: number; // e.g. 420 km
  transportCostPerKmPerTrip: number; // ₹/km
  vehicleCapacityLitres: number; // e.g. 1200 L per vehicle/sortie
  numberOfTrips: number; // calculated or override
  loadingUnloadingCostPerTrip: number; // ₹ per trip
  storageInfrastructureCostMonthly: number; // ₹/month fixed depot maintenance
  handlingDistributionCostPerLitre: number; // ₹/L
  remoteAreaLogisticsPremiumPct: number; // e.g. 25% for high-altitude passes
  winterLogisticsMultiplier: number; // e.g. 1.4x for winter snowbound access
  isUserOverridden?: boolean;
}

export interface BaselineShelterConfig {
  name: string;
  description: string;
  wallUValueWm2k: number; // e.g. 2.2 W/m²K (uninsulated masonry / corrugated iron)
  roofUValueWm2k: number; // e.g. 3.0 W/m²K (uninsulated sheet)
  floorUValueWm2k: number; // e.g. 1.2 W/m²K
  windowUValueWm2k: number; // e.g. 5.6 W/m²K (single glazing)
  infiltrationAch: number; // e.g. 1.5 ACH (leaky conventional tent/shelter)
  solarHeatGainCoefficient: number; // e.g. 0.70
  primaryHeatingSource: "kerosene_only";
}

export interface HourlyEnergyStep {
  hourOfDay: number; // 0-23
  timestamp: string;
  outdoorTempC: number;
  solarIrradianceWm2: number;
  
  // Baseline Shelter
  baselineIndoorTempC: number;
  baselineHeatingDemandKw: number;
  baselineKeroseneHeatKw: number;
  baselineKeroseneConsumedL: number;
  baselineInComfort: boolean;

  // Proposed Passive + Solar Shelter
  proposedFreeFloatingTempC: number; // Temp with zero active heating (pure passive)
  solarGeneratedKwh: number;
  rooftopSolarKwh: number;
  windowBipvSolarKwh: number;
  householdElectricityUsedKwh: number;
  excessSolarKwh: number;
  batterySocKwh: number;
  batteryDischargeKwh: number;
  electricHeatingSuppliedKw: number;
  proposedIndoorTempC: number;
  heatingDeficitKw: number;
  keroseneBackupActivated: boolean;
  keroseneHeatSuppliedKw: number;
  keroseneConsumedL: number;
  proposedInComfort: boolean;
}

export interface ThermalPerformanceSummary {
  averageIndoorTempC: number;
  minIndoorTempC: number;
  maxIndoorTempC: number;
  comfortHoursPerDay: number;
  comfortHoursPerMonth: number;
  comfortPercentage: number;
  hoursBelowComfort: number;
  hoursAboveComfort: number;
}

export interface EnergyMetricsSummary {
  totalEnergyRequirementKwhPerDay: number;
  heatingEnergyRequirementKwhPerDay: number;
  solarEnergyGeneratedKwhPerDay: number;
  rooftopSolarKwhPerDay: number;
  windowBipvSolarKwhPerDay: number;
  solarEnergyUsedKwhPerDay: number;
  batteryEnergyUsedKwhPerDay: number;
  electricityUsedForHeatingKwhPerDay: number;
  householdElectricityKwhPerDay: number;
}

export interface FossilFuelMetricsSummary {
  keroseneLPerDay: number;
  keroseneLPerMonth: number;
  baselineKeroseneLPerDay: number;
  baselineKeroseneLPerMonth: number;
  keroseneSavedLPerDay: number;
  keroseneSavedLPerMonth: number;
  keroseneReductionPercentage: number;
}

export interface CostBreakdownSummary {
  fuelPurchaseCostPerMonth: number; // Kerosene Used × Kerosene Price
  transportationCostPerMonth: number;
  handlingStorageCostPerMonth: number;
  totalLogisticsCostPerMonth: number; // Transportation + Handling + Storage
  totalFuelCostPerMonth: number; // Fuel Purchase + Transportation + Handling + Storage
  electricityCostPerMonth: number;
  totalHeatingCostPerMonth: number; // Fuel + Logistics + Heating Electricity
  totalEnergyCostPerMonth: number; // Total Heating Cost + Household Electricity
  dailyTotalCost: number;
  monthlyTotalCost: number;
  
  // Baseline Comparisons
  baselineFuelCostPerMonth: number;
  baselineTotalCostPerMonth: number;
  moneySavedPerDay: number;
  moneySavedPerMonth: number;
  costReductionPercentage: number;
}

export interface EnergySimulationResult {
  runId: string;
  timestamp: string;
  simulationPeriodDays: number;
  shelterModel: ShelterModel;
  comfortConfig: ComfortConfig;
  energyConfig: EnergySystemConfig;
  keroseneConfig: KeroseneBackupConfig;
  logisticsConfig: FuelLogisticsConfig;
  baselineConfig: BaselineShelterConfig;
  hourlyData: HourlyEnergyStep[];
  
  // Real-time Solar Hardware Telemetry
  solarHardware: {
    rooftopPvKw: number;
    rooftopPanelCount: number;
    windowBipvKw: number;
    windowSolarPanesCount: number;
    totalSolarCapacityKw: number;
  };

  // Aggregated Key Performance Metrics
  thermalPerformance: ThermalPerformanceSummary;
  baselineThermalPerformance: ThermalPerformanceSummary;
  energyMetrics: EnergyMetricsSummary;
  fossilFuelMetrics: FossilFuelMetricsSummary;
  costBreakdown: CostBreakdownSummary;
  
  // Design Recommendations
  recommendations: string[];
}

export interface DesignTradeoffCandidate {
  id: string;
  name: string;
  tagline: string;
  isParetoOptimal: boolean;
  isCurrentProposed?: boolean;
  parameters: {
    insulationThicknessMm: number;
    thermalMassType: string;
    wallThicknessM: number;
    windowAreaM2: number;
    orientationDeg: number;
    solarPvKw: number;
    roofPanelsCount: number;
    hasWindowSolarPanes: boolean;
    batteryKwh: number;
    electricHeaterKw: number;
    naturalVentilationAch: number;
  };
  metrics: {
    comfortHoursPerDay: number;
    comfortPct: number;
    energyRequiredKwhPerDay: number;
    solarGeneratedKwhPerDay: number;
    keroseneLPerDay: number;
    keroseneLPerMonth: number;
    totalCostPerDay: number;
    totalCostPerMonth: number;
    keroseneSavingsPct: number;
    costSavingsPct: number;
  };
}
