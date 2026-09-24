import { describe, it, expect } from "vitest";
import {
  calculateDifference,
  evaluateObjectiveWinner,
  COMPARISON_OBJECTIVES,
} from "./comparison-engine";
import { SimulationJobItem } from "@/lib/store/use-shelter-store";

describe("Comparison Engine Unit Tests", () => {
  describe("calculateDifference", () => {
    it("correctly calculates absolute and percentage improvement for higherIsBetter metrics", () => {
      const diff = calculateDifference(10.0, 15.0, true, "°C");
      expect(diff.baselineValue).toBe(10.0);
      expect(diff.candidateValue).toBe(15.0);
      expect(diff.deltaAbsolute).toBe(5.0);
      expect(diff.deltaPercentage).toBe(50.0);
      expect(diff.isImprovement).toBe(true);
      expect(diff.unit).toBe("°C");
    });

    it("correctly flags deterioration for higherIsBetter metrics", () => {
      const diff = calculateDifference(20.0, 15.0, true, "%");
      expect(diff.deltaAbsolute).toBe(-5.0);
      expect(diff.deltaPercentage).toBe(-25.0);
      expect(diff.isImprovement).toBe(false);
    });

    it("correctly calculates improvement when lower is better (e.g. heating demand)", () => {
      const diff = calculateDifference(100.0, 60.0, false, "kWh/m²");
      expect(diff.deltaAbsolute).toBe(-40.0);
      expect(diff.deltaPercentage).toBe(-40.0);
      expect(diff.isImprovement).toBe(true);
    });

    it("correctly handles baseline near zero without NaN", () => {
      const diff = calculateDifference(0.0, 5.0, true, "W");
      expect(diff.deltaPercentage).toBe(0);
      expect(diff.deltaAbsolute).toBe(5.0);
      expect(Number.isFinite(diff.deltaPercentage)).toBe(true);
    });
  });

  describe("evaluateObjectiveWinner", () => {
    const mockJobs: SimulationJobItem[] = [
      {
        id: "job-1",
        projectId: "p1",
        projectName: "Baseline",
        shelterModel: {} as any,
        weatherDatasetId: "leh",
        weatherDatasetName: "Leh EPW",
        engine: "ThermoShelter Core",
        engineVersion: "3.0.0",
        status: "completed",
        queuedAt: "2026-09-09T00:00:00Z",
        results: {
          summary: {
            indoorMinC: -2.0,
            indoorMaxC: 18.0,
            indoorMeanC: 8.0,
            outdoorMinC: -15.0,
            outdoorMaxC: 5.0,
            comfortHoursPct: 45.0,
            diurnalSwingDampingPct: 60.0,
            heatingDemandKwhM2: 120.0,
          },
          hourlyTimeseries: [],
        },
      },
      {
        id: "job-2",
        projectId: "p1",
        projectName: "Optimized Triple Glazed",
        shelterModel: {} as any,
        weatherDatasetId: "leh",
        weatherDatasetName: "Leh EPW",
        engine: "ThermoShelter Core",
        engineVersion: "3.0.0",
        status: "completed",
        queuedAt: "2026-09-09T00:00:00Z",
        results: {
          summary: {
            indoorMinC: 5.0,
            indoorMaxC: 22.0,
            indoorMeanC: 14.0,
            outdoorMinC: -15.0,
            outdoorMaxC: 5.0,
            comfortHoursPct: 82.0,
            diurnalSwingDampingPct: 78.0,
            heatingDemandKwhM2: 45.0,
          },
          hourlyTimeseries: [],
        },
      },
    ];

    it("evaluates passive-resilience winner based on higher minimum temperature", () => {
      const evaluation = evaluateObjectiveWinner(mockJobs, "passive-resilience");
      expect(evaluation.winnerJobId).toBe("job-2");
      expect(evaluation.scoresByJobId["job-2"]).toBeGreaterThan(evaluation.scoresByJobId["job-1"]);
      expect(evaluation.statementText).toContain("Best according to");
    });

    it("evaluates minimize-energy winner based on lower heating demand", () => {
      const evaluation = evaluateObjectiveWinner(mockJobs, "minimize-energy");
      expect(evaluation.winnerJobId).toBe("job-2");
      expect(evaluation.scoresByJobId["job-2"]).toBeGreaterThan(evaluation.scoresByJobId["job-1"]);
    });

    it("evaluates maximize-comfort winner based on comfort percentage", () => {
      const evaluation = evaluateObjectiveWinner(mockJobs, "maximize-comfort");
      expect(evaluation.winnerJobId).toBe("job-2");
    });

    it("evaluates balanced-optimum composite score", () => {
      const evaluation = evaluateObjectiveWinner(mockJobs, "balanced-optimum");
      expect(evaluation.winnerJobId).toBe("job-2");
      expect(evaluation.rationalePoints.length).toBeGreaterThan(0);
      expect(evaluation.scoresByJobId["job-2"]).toBeGreaterThan(evaluation.scoresByJobId["job-1"]);
    });

    it("includes required objective metadata", () => {
      expect(COMPARISON_OBJECTIVES.length).toBeGreaterThanOrEqual(4);
      const objIds = COMPARISON_OBJECTIVES.map((o) => o.id);
      expect(objIds).toContain("passive-resilience");
      expect(objIds).toContain("minimize-energy");
      expect(objIds).toContain("maximize-comfort");
      expect(objIds).toContain("balanced-optimum");
    });
  });
});
