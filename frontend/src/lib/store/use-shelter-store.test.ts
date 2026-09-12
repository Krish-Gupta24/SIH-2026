import { describe, it, expect, beforeEach } from "vitest";
import { useShelterStore, MaterialItem } from "./use-shelter-store";
import { ShelterModel } from "@/types/shelter";

describe("Shelter Zustand Store Unit Tests", () => {
  beforeEach(() => {
    // Reset store state
    useShelterStore.setState({
      projects: [],
      activeProjectId: "",
      simulations: [],
      comparisonJobIds: [],
    });
  });

  it("adds and retrieves a shelter project", () => {
    const testModel: ShelterModel = {
      id: "test-proj-1",
      schemaVersion: "1.0.0",
      project: { id: "test-proj-1", name: "Alpine Test", version: "1.0.0", tags: [] },
      location: { latitude: 34.15, longitude: 77.57, elevation: 3500, region: "Leh", climateZone: "Alpine", weatherSource: "test.epw" },
      geometry: { shape: "Rectangle", length: 6, width: 4, height: 3, orientation: 0, roofType: "Flat", roofAngle: 0, floorElevation: 0 },
      envelope: {
        walls: {
          north: { constructionId: "c1", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
          south: { constructionId: "c1", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
          east: { constructionId: "c1", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
          west: { constructionId: "c1", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
        },
        roof: { constructionId: "r1", slope: 0, overhang: 0.2, solarAbsorptance: 0.7, layers: [{ materialId: "mat-eps-insulation", thickness: 0.1 }] },
        floor: { constructionId: "f1", groundContact: true, perimeterInsulation: true, layers: [{ materialId: "mat-concrete-slab", thickness: 0.15 }] },
      },
      windows: [],
      doors: [],
      thermalMass: [],
      ventilation: { infiltrationACH: 0.3, naturalVentilationEnabled: false, naturalSchedule: "DayOnly", mechanicalVentilationEnabled: false, mechanicalFlowRateLps: 0, heatRecoveryEfficiency: 0.75 },
      internalLoads: { occupantsCount: 2, activityLevelWatts: 120, lightingPowerDensityWpm2: 3.0, equipmentPowerWatts: 150, scheduleProfile: "Continuous" },
      designTargets: { comfortTempMinC: 18, comfortTempMaxC: 24, maxAnnualHeatingDemandKwhM2: 80, targetComfortPercent: 85 },
      simulationSettings: { engine: "EnergyPlus", timestepsPerHour: 4, runPeriodDays: 3, startMonth: 1, startDay: 1, detailedComponentOutputs: true },
    };

    useShelterStore.getState().addProject(testModel);
    expect(useShelterStore.getState().projects.length).toBe(1);
    expect(useShelterStore.getState().projects[0].project.name).toBe("Alpine Test");
    expect(useShelterStore.getState().activeProjectId).toBe("test-proj-1");
  });

  it("manages comparison job IDs toggle correctly", () => {
    const store = useShelterStore.getState();
    store.toggleComparisonJobId("job-alpha");
    expect(useShelterStore.getState().comparisonJobIds).toContain("job-alpha");

    store.toggleComparisonJobId("job-beta");
    expect(useShelterStore.getState().comparisonJobIds.length).toBe(2);

    store.toggleComparisonJobId("job-alpha");
    expect(useShelterStore.getState().comparisonJobIds).not.toContain("job-alpha");
    expect(useShelterStore.getState().comparisonJobIds.length).toBe(1);

    store.clearComparison();
    expect(useShelterStore.getState().comparisonJobIds.length).toBe(0);
  });

  it("adds and updates custom material items", () => {
    const newMaterial: MaterialItem = {
      id: "mat-custom-aerogel",
      name: "Aerogel Blanket",
      category: "Insulation",
      thermalConductivity: 0.015,
      density: 150.0,
      specificHeat: 1000.0,
      standardThicknessMm: 20,
      status: "CUSTOM",
      source: "User Specification",
    };

    useShelterStore.getState().addMaterial(newMaterial);
    const found = useShelterStore.getState().materials.find((m) => m.id === "mat-custom-aerogel");
    expect(found).toBeDefined();
    expect(found?.thermalConductivity).toBe(0.015);

    useShelterStore.getState().updateMaterial("mat-custom-aerogel", { thermalConductivity: 0.014 });
    const updated = useShelterStore.getState().materials.find((m) => m.id === "mat-custom-aerogel");
    expect(updated?.thermalConductivity).toBe(0.014);
  });
});
