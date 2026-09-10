import { SimulationJobItem } from "@/lib/store/use-shelter-store";
import { ShelterModel } from "@/types/shelter";

export type ComparisonObjectiveId =
  | "passive-resilience"
  | "minimize-energy"
  | "maximize-comfort"
  | "balanced-optimum";

export interface ComparisonObjective {
  id: ComparisonObjectiveId;
  title: string;
  shortLabel: string;
  description: string;
  constraintDescription: string;
  primaryMetric: string;
  higherIsBetter: boolean;
}

export interface MetricDifference {
  baselineValue: number;
  candidateValue: number;
  deltaAbsolute: number;
  deltaPercentage: number;
  isImprovement: boolean;
  unit: string;
}

export interface WinnerEvaluationResult {
  winnerJobId: string;
  winnerName: string;
  objectiveId: ComparisonObjectiveId;
  objectiveTitle: string;
  constraintDescription: string;
  statementText: string;
  marginOfVictory: string;
  score: number;
  rationalePoints: string[];
  scoresByJobId: Record<string, number>;
}

export interface ReproducibilityManifest {
  manifestId: string;
  generatedAt: string;
  engineName: string;
  engineVersion: string;
  weatherDatasetName: string;
  weatherStationId: string;
  elevationM: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  simulationSettings: {
    timestepsPerHour: number;
    runPeriodDays: number;
    startMonth: number;
    startDay: number;
    solverTolerance: string;
  };
  modelsCompared: {
    jobId: string;
    projectId: string;
    projectName: string;
    version: string;
    dimensions: string;
    floorAreaM2: number;
    volumeM3: number;
    wallUValueApprox: number | string | null;
    infiltrationACH: number | string | null;
  }[];
}
