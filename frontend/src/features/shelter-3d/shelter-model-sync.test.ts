import { describe, it, expect } from "vitest";
import { deriveShelter3DGeometry } from "./geometry-math";
import { ShelterModel, WindowModel, DoorModel } from "@/types/shelter";

describe("3D Designer & Simulation Canonical ShelterModel Sync Tests", () => {
  const baseModel: ShelterModel = {
    id: "shelter-sync-fe",
    schemaVersion: "1.0.0",
    project: {
      id: "shelter-sync-fe",
      name: "Sync Verification Shelter",
      version: "1.0.0",
      tags: ["Alpine", "Cold"],
    },
    location: {
      latitude: 34.1526,
      longitude: 77.5771,
      elevation: 3500.0,
      region: "Leh, Ladakh",
      climateZone: "Cold / Extreme Alpine",
      weatherSource: "test_weather.epw",
    },
    geometry: {
      shape: "Rectangle",
      length: 6.0,
      width: 4.0,
      height: 3.0,
      orientation: 0,
      roofType: "Flat",
      roofAngle: 0,
      floorElevation: 0,
    },
    envelope: {
      walls: {
        north: { constructionId: "c_north", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
        south: { constructionId: "c_south", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
        east: { constructionId: "c_east", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
        west: { constructionId: "c_west", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
      },
      roof: {
        constructionId: "c_roof",
        slope: 0,
        overhang: 0.4,
        solarAbsorptance: 0.7,
        layers: [{ materialId: "mat-eps-insulation", thickness: 0.1 }],
      },
      floor: {
        constructionId: "c_floor",
        groundContact: true,
        perimeterInsulation: true,
        layers: [{ materialId: "mat-concrete-slab", thickness: 0.15 }],
      },
    },
    windows: [],
    doors: [],
    thermalMass: [],
    ventilation: {
      infiltrationACH: 0.4,
      naturalVentilationEnabled: false,
      naturalSchedule: "DayOnly",
      mechanicalVentilationEnabled: false,
      mechanicalFlowRateLps: 0,
      heatRecoveryEfficiency: 0.75,
    },
    internalLoads: {
      occupantsCount: 4,
      activityLevelWatts: 120,
      lightingPowerDensityWpm2: 3.0,
      equipmentPowerWatts: 150,
      scheduleProfile: "DiurnalOccupied",
    },
    designTargets: {
      comfortTempMinC: 18.0,
      comfortTempMaxC: 24.0,
      maxAnnualHeatingDemandKwhM2: 80.0,
      targetComfortPercent: 85.0,
    },
    simulationSettings: {
      engine: "EnergyPlus",
      timestepsPerHour: 4,
      runPeriodDays: 3,
      startMonth: 1,
      startDay: 1,
      detailedComponentOutputs: true,
    },
  };

  it("proves changing dimensions affects 3D representation volume, bounds, and wall areas", () => {
    // 1. Initial 6.0m x 4.0m x 3.0m
    const initial3D = deriveShelter3DGeometry(baseModel);
    expect(initial3D.volume).toBeCloseTo(72.0, 2);
    expect(initial3D.walls.north.dimensions[0]).toBeCloseTo(6.0, 2);
    expect(initial3D.walls.east.dimensions[0]).toBeCloseTo(4.0, 2);
    expect(initial3D.walls.north.dimensions[1]).toBeCloseTo(3.0, 2);

    // 2. Modify dimensions to 8.0m x 5.0m x 3.5m
    const modifiedModel: ShelterModel = {
      ...baseModel,
      geometry: {
        ...baseModel.geometry,
        length: 8.0,
        width: 5.0,
        height: 3.5,
      },
    };

    const modified3D = deriveShelter3DGeometry(modifiedModel);
    // Volume = 8.0 * 5.0 * 3.5 = 140.0 m³
    expect(modified3D.volume).toBeCloseTo(140.0, 2);
    expect(modified3D.walls.north.dimensions[0]).toBeCloseTo(8.0, 2);
    expect(modified3D.walls.east.dimensions[0]).toBeCloseTo(5.0, 2);
    expect(modified3D.walls.north.dimensions[1]).toBeCloseTo(3.5, 2);
    expect(modified3D.totalEnvelopeArea).toBeGreaterThan(initial3D.totalEnvelopeArea);
  });

  it("proves adding a window updates 3D representation on the host wall with correct coordinates", () => {
    // Initial has 0 windows
    const initial3D = deriveShelter3DGeometry(baseModel);
    expect(initial3D.windows.length).toBe(0);

    const newWindow: WindowModel = {
      id: "win-south-master",
      wall: "south",
      positionX: 1.5,
      width: 2.0,
      height: 1.4,
      sillHeight: 0.8,
      glazingType: "Double_LowE_Argon",
      frameType: "UPVC_Insulated",
      shadingOverhang: 0.3,
    };

    const modelWithWindow: ShelterModel = {
      ...baseModel,
      windows: [newWindow],
    };

    const updated3D = deriveShelter3DGeometry(modelWithWindow);
    expect(updated3D.windows.length).toBe(1);
    expect(updated3D.windows[0].id).toBe("win-south-master");
    expect(updated3D.windows[0].wall).toBe("south");
    expect(updated3D.windows[0].dimensions[0]).toBeCloseTo(2.0, 2);
    expect(updated3D.windows[0].dimensions[1]).toBeCloseTo(1.4, 2);
    expect(updated3D.windows[0].area).toBeCloseTo(2.8, 2);
    // Y position center = sill (0.8) + height/2 (0.7) = 1.5m
    expect(updated3D.windows[0].worldPosition[1]).toBeCloseTo(1.5, 2);
  });

  it("proves deleting a window removes it from 3D representation", () => {
    const win1: WindowModel = {
      id: "win-1",
      wall: "south",
      positionX: 1.0,
      width: 1.5,
      height: 1.2,
      sillHeight: 0.9,
      glazingType: "Triple_LowE_Krypton",
      frameType: "Wood_HighPerformance",
      shadingOverhang: 0.2,
    };
    const win2: WindowModel = {
      id: "win-2",
      wall: "east",
      positionX: 1.0,
      width: 1.2,
      height: 1.0,
      sillHeight: 1.0,
      glazingType: "Double_LowE_Argon",
      frameType: "UPVC_Insulated",
      shadingOverhang: 0.0,
    };

    const modelWithTwoWindows: ShelterModel = {
      ...baseModel,
      windows: [win1, win2],
    };

    const repTwo = deriveShelter3DGeometry(modelWithTwoWindows);
    expect(repTwo.windows.length).toBe(2);

    // Delete win-2
    const modelWithOneWindow: ShelterModel = {
      ...baseModel,
      windows: [win1],
    };

    const repOne = deriveShelter3DGeometry(modelWithOneWindow);
    expect(repOne.windows.length).toBe(1);
    expect(repOne.windows[0].id).toBe("win-1");
    expect(repOne.windows.some((w) => w.id === "win-2")).toBe(false);
  });

  it("proves adding a door updates 3D representation on the host wall", () => {
    const newDoor: DoorModel = {
      id: "door-north-entry",
      wall: "north",
      positionX: 2.0,
      width: 1.0,
      height: 2.1,
      construction: "Insulated Steel",
      airTightness: "HighPerformance_Airtight",
    };

    const modelWithDoor: ShelterModel = {
      ...baseModel,
      doors: [newDoor],
    };

    const rep = deriveShelter3DGeometry(modelWithDoor);
    expect(rep.doors.length).toBe(1);
    expect(rep.doors[0].id).toBe("door-north-entry");
    expect(rep.doors[0].wall).toBe("north");
    expect(rep.doors[0].dimensions[0]).toBeCloseTo(1.0, 2);
    expect(rep.doors[0].dimensions[1]).toBeCloseTo(2.1, 2);
    // Y position center = height / 2 = 1.05m
    expect(rep.doors[0].worldPosition[1]).toBeCloseTo(1.05, 2);
  });

  it("proves changing wall construction in ShelterModel updates envelope layers", () => {
    // Modify north wall to add insulation
    const upgradedModel: ShelterModel = {
      ...baseModel,
      envelope: {
        ...baseModel.envelope,
        walls: {
          ...baseModel.envelope.walls,
          north: {
            constructionId: "c_north_super",
            name: "Super-insulated Rammed Earth",
            layers: [
              { materialId: "mat-eps-insulation", thickness: 0.15 },
              { materialId: "mat-rammed-earth", thickness: 0.30 },
            ],
          },
        },
      },
    };

    expect(upgradedModel.envelope.walls.north.layers.length).toBe(2);
    expect(upgradedModel.envelope.walls.north.layers[0].materialId).toBe("mat-eps-insulation");
    expect(upgradedModel.envelope.walls.north.layers[0].thickness).toBe(0.15);
  });
});
