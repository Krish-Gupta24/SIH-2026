/**
 * Canonical simulation result types for the frontend.
 * Matches 1:1 with backend simulation/results/result.py schema.
 */

export interface EngineMetadata {
  engineName: string;
  engineVersion: string;
  modelVersion: string;
  weatherDataset: string;
  simulationPeriod: {
    start: string;
    end: string;
    timestepSeconds: number;
    timestepsCount: number;
  };
  executionDurationSeconds?: number;
  completedSuccessfully: boolean;
  environmentName?: string;
  notes?: string;
}

export interface EnvelopeHeatTransfer {
  wallHeatTransfer: number[];         // Watts (conduction through walls)
  roofHeatTransfer: number[];         // Watts
  floorHeatTransfer: number[];        // Watts
  windowHeatTransfer: number[];       // Watts
  doorHeatTransfer: number[];         // Watts
  infiltrationHeatTransfer: number[]; // Watts
  wallsByOrientation?: {
    north?: number[];
    south?: number[];
    east?: number[];
    west?: number[];
  };
}

export interface SolarPerformance {
  directNormalIrradiance: number[];      // W/m²
  diffuseHorizontalIrradiance: number[];  // W/m²
  globalHorizontalIrradiance: number[];   // W/m²
  solarGainsTotal: number[];             // Watts (transmitted through glazing)
  solarGainsByWindow?: Record<string, number[]>;
}

export interface EnergyMetrics {
  heatingDemandKwh?: number;
  coolingDemandKwh?: number;
  netEnergyDemandKwh?: number;
  isUnconditioned: boolean;
  envelopeLossesKwh: Record<string, number>;
  envelopeGainsKwh: Record<string, number>;
  totalSolarGainsKwh: number;
}

export interface ComfortDefinitionModel {
  minAcceptableTemperatureC: number;
  maxAcceptableTemperatureC: number;
  targetIndoorTemperatureC?: number;
  standardOrModelName: string;
  assumptions: string;
  applicableConditions: string;
  isUniversalComfortClaimed: boolean;
  targetRangeStr: string;
}

export interface ComfortMetrics {
  isValid: boolean;
  validityReason: string;
  status?: string;
  comfortTemperatureMinC: number;
  comfortTemperatureMaxC: number;
  targetIndoorTemperatureC?: number;
  targetRangeStr?: string;
  comfortDefinition?: ComfortDefinitionModel;
  isUniversalComfortClaimed?: boolean;

  hoursInsideTarget?: number;
  hoursBelowTarget?: number;
  hoursAboveTarget?: number;

  hoursInComfortBand: number;
  hoursBelowComfort: number;
  hoursAboveComfort: number;
  percentTimeComfortable: number;
  underheatingDegreeHoursCh: number;
  overheatingDegreeHoursCh: number;
  indoorMinC: number;
  indoorMaxC: number;
  indoorMeanC: number;
  diurnalTemperatureSwingC: number;
}

export interface SimulationResultPayload {
  metadata: EngineMetadata;
  timestamps: string[];
  indoorTemperature: number[];         // °C
  outdoorTemperature: number[];        // °C
  solarRadiation: number[];            // W/m²
  solarGains: number[];                // Watts
  wallHeatTransfer: number[];          // Watts
  roofHeatTransfer: number[];          // Watts
  floorHeatTransfer: number[];         // Watts
  windowHeatTransfer: number[];        // Watts
  doorHeatTransfer: number[];          // Watts
  infiltrationHeatTransfer: number[];  // Watts
  envelope: EnvelopeHeatTransfer;
  solar: SolarPerformance;
  energy: EnergyMetrics;
  comfort: ComfortMetrics;
  warnings?: string[];
  errors?: string[];
}

export type UnitSystem = "SI" | "IP";

export type DataSourceType = "simulated" | "measured" | "reference";

export interface DataTraceVisibility {
  simulated: boolean;
  measured: boolean;
  reference: boolean;
}

export type TimeRangeOption = "full" | "day1" | "day2" | "day3" | "extremeCold";

export type AggregationMode = "hourly" | "daily";
