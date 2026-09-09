/**
 * Types for the Parametric Optimization Studio, Parameter Sweep Engine,
 * and Engineering Recommendation Layer.
 */

export type OptimizationObjectiveId =
  | "maximize_comfort"
  | "minimize_heat_loss"
  | "minimize_auxiliary_energy"
  | "maximize_useful_solar_gain"
  | "minimize_material_cost";

export interface OptimizationObjectiveConfig {
  id: OptimizationObjectiveId;
  label: string;
  description: string;
  metricLabel: string;
  higherIsBetter: boolean;
}

export type SweptParameterId =
  | "orientation"
  | "insulation_thickness"
  | "wall_construction"
  | "roof_construction"
  | "window_area"
  | "glazing_type"
  | "window_placement"
  | "thermal_mass"
  | "ventilation";

export interface ParameterOptionItem {
  id: SweptParameterId;
  label: string;
  unit?: string;
  description: string;
  options: { label: string; value: any }[];
  defaultSelected: boolean;
}

export interface OptimizationConstraintConfig {
  id: string;
  name: string;
  metric: "indoorMinC" | "wallThicknessM" | "wwrPct" | "comfortHoursPct";
  operator: ">=" | "<=";
  threshold: number;
  unit: string;
  description: string;
  enabled: boolean;
}

export interface CandidateMetrics {
  indoorMinC: number;
  indoorMaxC: number;
  indoorMeanC: number;
  diurnalSwingC: number;
  comfortHoursPct: number;
  heatingDemandKwhM2: number;
  peakHeatLossW: number;
  totalSolarGainKwh: number;
  totalHeatLossUA: number;
  wallThicknessM: number;
  wwrPct: number;
  dampingRatioPct: number;
  materialCostUsd: number;
}

export interface CandidateResult {
  id: string;
  rank: number;
  parameters: Record<string, any>;
  metrics: CandidateMetrics;
  objectiveScore: number;
  isFeasible: boolean;
  violations: string[];
  isPareto: boolean;
}

export interface OptimizationSweepResult {
  runId: string;
  timestamp: string;
  algorithm: string;
  objective: OptimizationObjectiveId;
  objectiveTitle: string;
  baseProjectId: string;
  weatherDataset: string;
  totalGenerated: number;
  validCount: number;
  feasibleCount: number;
  executionDurationSec: number;
  parametersSwept: SweptParameterId[];
  bestCandidate: CandidateResult;
  rankedCandidates: CandidateResult[];
  paretoCandidates: CandidateResult[];
}

// ---------------------------------------------------------------------------
// Recommendation Layer Types (RECOMMENDED DESIGN 7-Section Architecture)
// ---------------------------------------------------------------------------

export interface LocationSpecification {
  region: string;
  elevationM: number;
  latitude: number;
  longitude: number;
  climateZone: string;
  designWinterMinC: number;
  weatherDataset: string;
}

export interface DimensionSpecification {
  lengthM: number;
  widthM: number;
  heightM: number;
  floorAreaM2: number;
  internalVolumeM3: number;
  aspectRatio: number;
}

export interface OrientationSpecification {
  azimuthDegrees: number;
  cardinalFacing: string;
  solarApertureDescription: string;
}

export interface WallSystemSpecification {
  assemblyName: string;
  insulationMaterial: string;
  insulationThicknessM: number;
  totalThicknessM: number;
  uValueWm2k: number;
  rValueM2kw: number;
  layerSummary: string;
}

export interface RoofSystemSpecification {
  assemblyName: string;
  slopeDegrees: number;
  overhangM: number;
  uValueWm2k: number;
  insulationSummary: string;
}

export interface FloorSystemSpecification {
  assemblyName: string;
  groundContact: boolean;
  perimeterInsulation: boolean;
  uValueWm2k: number;
  description: string;
}

export interface WindowsSpecification {
  windowCount: number;
  totalAreaM2: number;
  windowToWallRatioPct: number;
  glazingType: string;
  uValueWm2k: number;
  shgc: number;
  frameType: string;
  distribution: string;
}

export interface DoorsSpecification {
  doorCount: number;
  construction: string;
  uValueWm2k: number;
  airtightnessRating: string;
}

export interface ThermalMassSpecification {
  strategyName: string;
  primaryMaterial: string;
  effectiveThicknessM: number;
  heatCapacitanceKjM2k: number;
  diurnalDampingPct: number;
}

export interface VentilationSpecification {
  designAch: number;
  airtightnessCategory: string;
  heatRecoveryType: string;
  envelopeSealRating: string;
}

export interface SelectedConfiguration {
  location: LocationSpecification;
  dimensions: DimensionSpecification;
  orientation: OrientationSpecification;
  wallSystem: WallSystemSpecification;
  roofSystem: RoofSystemSpecification;
  floor: FloorSystemSpecification;
  windows: WindowsSpecification;
  doors: DoorsSpecification;
  thermalMass: ThermalMassSpecification;
  ventilation: VentilationSpecification;
}

export interface IndoorTemperatureMetrics {
  indoorMinC: number;
  indoorMaxC: number;
  indoorMeanC: number;
  diurnalSwingC: number;
  freezePreventionMarginC: number;
}

export interface ComfortMetrics {
  comfortHoursPct: number;
  standardApplied: string;
  operativeComfortBand: string;
  thermalStabilityRating: string;
}

export interface SolarGainMetrics {
  totalSolarGainKwh: number;
  peakSolarGainW: number;
  usefulApertureFractionPct: number;
  overheatingRisk: string;
}

export interface HeatLossMetrics {
  totalHeatLossUaWK: number;
  peakEnvelopeLossW: number;
  infiltrationLossW: number;
  envelopeLossFractionPct: number;
  infiltrationLossFractionPct: number;
}

export interface EnergyMetrics {
  heatingDemandKwhM2: number;
  peakHeatingPowerKw: number;
  baselineReductionPct: number;
  annualAuxiliaryHeatingKwh: number;
}

export interface PerformanceSummary {
  indoorTemperatureMetrics: IndoorTemperatureMetrics;
  comfort: ComfortMetrics;
  solarGains: SolarGainMetrics;
  heatLoss: HeatLossMetrics;
  energy: EnergyMetrics;
}

export interface ConstraintAuditItem {
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  actualValue: number;
  unit: string;
  passed: boolean;
  safetyMargin: string;
}

export interface CandidateSpaceSummary {
  totalGenerated: number;
  validEvaluated: number;
  feasibleCount: number;
  parametersSwept: SweptParameterId[];
  searchAlgorithm: string;
  gridResolutionNotes: string;
}

export interface ReasonForSelectionSummary {
  summary: string;
  tradeOffResolutions: { tradeOff: string; resolution: string }[];
  rejectionRationale: string;
  achievedObjectiveScore: number;
}

export interface LimitationsSummary {
  nonUniversalOptimalityDeclaration: string;
  boundaries: { category: string; description: string }[];
  validationRecommendation: string;
}

export interface RecommendationReport {
  reportId: string;
  timestamp: string;
  conditionalTitle: string;
  objective: {
    id: OptimizationObjectiveId;
    label: string;
    description: string;
    metricLabel: string;
    higherIsBetter: boolean;
    achievedScore: number;
  };
  constraints: ConstraintAuditItem[];
  candidateSpace: CandidateSpaceSummary;
  selectedConfiguration: SelectedConfiguration;
  performance: PerformanceSummary;
  reasonForSelection: ReasonForSelectionSummary;
  limitations: LimitationsSummary;
}
