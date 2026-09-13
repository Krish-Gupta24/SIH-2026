import { describe, it, expect, beforeEach, vi } from "vitest";
import { useShelterStore, MaterialItem } from "./use-shelter-store";
import { ShelterModel } from "@/types/shelter";

describe("Shelter Zustand Store Unit Tests", () => {
  beforeEach(() => {
    // Mock global fetch for API calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "success", id: "mock-id" }),
      text: async () => JSON.stringify({ status: "success" }),
    } as any);

    // Reset store state
    useShelterStore.setState({
      projects: [],
      deletedProjectIds: [],
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

  it("deletes a project and tracks deletedProjectIds while cascading simulations", async () => {
    const p1: ShelterModel = {
      id: "del-test-1",
      schemaVersion: "1.0.0",
      project: { id: "del-test-1", name: "Shelter To Delete", version: "1.0.0", tags: [] },
      location: { latitude: 34.0, longitude: 77.0, elevation: 3000, region: "Leh", climateZone: "Cold", weatherSource: "test.epw" },
      geometry: { shape: "Rectangle", length: 5, width: 4, height: 3, orientation: 0, roofType: "Flat", roofAngle: 0, floorElevation: 0 },
      envelope: {
        walls: {
          north: { constructionId: "c1", layers: [] },
          south: { constructionId: "c1", layers: [] },
          east: { constructionId: "c1", layers: [] },
          west: { constructionId: "c1", layers: [] },
        },
        roof: { constructionId: "r1", slope: 0, overhang: 0.2, solarAbsorptance: 0.7, layers: [] },
        floor: { constructionId: "f1", groundContact: true, perimeterInsulation: true, layers: [] },
      },
      windows: [],
      doors: [],
      thermalMass: [],
      ventilation: { infiltrationACH: 0.3, naturalVentilationEnabled: false, naturalSchedule: "DayOnly", mechanicalVentilationEnabled: false, mechanicalFlowRateLps: 0, heatRecoveryEfficiency: 0.75 },
      internalLoads: { occupantsCount: 2, activityLevelWatts: 120, lightingPowerDensityWpm2: 3.0, equipmentPowerWatts: 150, scheduleProfile: "Continuous" },
      designTargets: { comfortTempMinC: 18, comfortTempMaxC: 24, maxAnnualHeatingDemandKwhM2: 80, targetComfortPercent: 85 },
      simulationSettings: { engine: "EnergyPlus", timestepsPerHour: 4, runPeriodDays: 3, startMonth: 1, startDay: 1, detailedComponentOutputs: true },
    };

    const p2: ShelterModel = {
      ...p1,
      id: "keep-test-2",
      project: { id: "keep-test-2", name: "Shelter To Keep", version: "1.0.0", tags: [] },
    };

    const store = useShelterStore.getState();
    store.addProject(p1);
    store.addProject(p2);

    // Add simulation linked to p1
    useShelterStore.setState({
      simulations: [
        {
          id: "sim-p1",
          projectId: "del-test-1",
          projectName: "Shelter To Delete",
          weatherDatasetId: "w1",
          weatherDatasetName: "Leh",
          status: "completed",
          engine: "EnergyPlus",
          engineVersion: "24.1.0",
        },
      ],
      comparisonJobIds: ["sim-p1"],
      activeProjectId: "del-test-1",
    });

    expect(useShelterStore.getState().projects.length).toBe(2);
    expect(useShelterStore.getState().simulations.length).toBe(1);

    // Delete p1
    await useShelterStore.getState().deleteProject("del-test-1");

    const afterState = useShelterStore.getState();
    expect(afterState.projects.length).toBe(1);
    expect(afterState.projects[0].id).toBe("keep-test-2");
    expect(afterState.deletedProjectIds).toContain("del-test-1");
    expect(afterState.simulations.length).toBe(0);
    expect(afterState.comparisonJobIds.length).toBe(0);
    expect(afterState.activeProjectId).toBe("keep-test-2");
  });

  it("deletes a weather dataset and re-points activeWeatherId", () => {
    const store = useShelterStore.getState();
    store.resetWeatherDatasetsToDefault();

    const customStation = {
      id: "wx-custom-upload-99",
      name: "Custom Field EPW",
      region: "Custom Post",
      latitude: 34.0,
      longitude: 77.0,
      elevationM: 3800,
      climateZone: "Alpine",
      sourceType: "EPW",
      provenanceStatus: "REAL_DATA",
      isTestData: false,
      designWinterMinC: -25,
      designSummerMaxC: 22,
      annualHDD18: 5200,
      epwFileName: "custom.epw",
    };

    store.addWeatherDataset(customStation);
    expect(useShelterStore.getState().weatherDatasets.some((w) => w.id === "wx-custom-upload-99")).toBe(true);
    expect(useShelterStore.getState().activeWeatherId).toBe("wx-custom-upload-99");

    // Delete custom station
    useShelterStore.getState().deleteWeatherDataset("wx-custom-upload-99");
    const afterDelete = useShelterStore.getState();
    expect(afterDelete.weatherDatasets.some((w) => w.id === "wx-custom-upload-99")).toBe(false);
    expect(afterDelete.activeWeatherId).not.toBe("wx-custom-upload-99");
  });

  it("resets projects to clean demo presets with 4 regional solutions + baseline", () => {
    const store = useShelterStore.getState();
    store.resetProjectsToDefault();

    const currentProjects = useShelterStore.getState().projects;
    expect(currentProjects.length).toBe(5);
    const ids = currentProjects.map((p) => p.id);
    expect(ids).toContain("shelter-ladakh-01");
    expect(ids).toContain("shelter-kargil-02");
    expect(ids).toContain("shelter-spiti-03");
    expect(ids).toContain("shelter-tawang-04");
    expect(ids).toContain("shelter-baseline-tin");
    expect(useShelterStore.getState().activeProjectId).toBe("shelter-ladakh-01");
  });
});

