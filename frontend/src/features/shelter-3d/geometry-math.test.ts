import { describe, it, expect } from "vitest";
import {
  deriveShelter3DGeometry,
  findNextAvailableOpeningPosition,
  clampOpeningPlacement,
  alignToStandardHeader,
  distributeOpeningsEvenly,
} from "./geometry-math";
import { ShelterModel } from "@/types/shelter";

describe("Shelter 3D Geometry Math Unit Tests", () => {
  const sampleModel: ShelterModel = {
    id: "proj-01",
    schemaVersion: "1.0.0",
    project: {
      id: "proj-01",
      name: "Standard Shelter",
      version: "1.0.0",
      tags: ["Alpine"],
    },
    location: {
      latitude: 34.15,
      longitude: 77.57,
      elevation: 3500,
      region: "Leh",
      climateZone: "Alpine",
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
        north: { constructionId: "c1", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
        south: { constructionId: "c1", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
        east: { constructionId: "c1", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
        west: { constructionId: "c1", layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }] },
      },
      roof: {
        constructionId: "r1",
        slope: 0,
        overhang: 0.2,
        solarAbsorptance: 0.7,
        layers: [{ materialId: "mat-eps-insulation", thickness: 0.1 }],
      },
      floor: {
        constructionId: "f1",
        groundContact: true,
        perimeterInsulation: true,
        layers: [{ materialId: "mat-concrete-slab", thickness: 0.15 }],
      },
    },
    windows: [
      {
        id: "win-south-01",
        wall: "south",
        positionX: 1.5,
        width: 1.5,
        height: 1.2,
        sillHeight: 0.9,
        glazingType: "Double_LowE_Argon",
        frameType: "UPVC_Insulated",
        shadingOverhang: 0.3,
      },
    ],
    doors: [
      {
        id: "door-north-01",
        wall: "north",
        positionX: 2.0,
        width: 1.0,
        height: 2.1,
        construction: "Insulated Steel",
        airTightness: "HighPerformance_Airtight",
      },
    ],
    thermalMass: [
      {
        id: "tm-floor",
        name: "Floor Mass",
        type: "FloorSlab",
        materialId: "mat-concrete-slab",
        thickness: 0.15,
        surfaceArea: 24.0,
      },
    ],
    ventilation: {
      infiltrationACH: 0.3,
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

  it("calculates correct spatial volume and envelope surface area", () => {
    const rep = deriveShelter3DGeometry(sampleModel);
    // 6.0 * 4.0 * 3.0 = 72.0 m³
    expect(rep.volume).toBeCloseTo(72.0, 1);
    expect(rep.totalEnvelopeArea).toBeGreaterThan(0);
  });

  it("derives all 4 cardinal wall representations with correct dimensions", () => {
    const rep = deriveShelter3DGeometry(sampleModel);
    expect(rep.walls.north).toBeDefined();
    expect(rep.walls.south).toBeDefined();
    expect(rep.walls.east).toBeDefined();
    expect(rep.walls.west).toBeDefined();

    // North & South walls span length L (6.0m)
    expect(rep.walls.north.dimensions[0]).toBeCloseTo(6.0, 1);
    expect(rep.walls.north.dimensions[1]).toBeCloseTo(3.0, 1);

    // East & West walls span width W (4.0m)
    expect(rep.walls.east.dimensions[0]).toBeCloseTo(4.0, 1);
    expect(rep.walls.east.dimensions[1]).toBeCloseTo(3.0, 1);
  });

  it("correctly places windows and doors on their host walls", () => {
    const rep = deriveShelter3DGeometry(sampleModel);
    expect(rep.windows.length).toBe(1);
    expect(rep.windows[0].id).toBe("win-south-01");
    expect(rep.windows[0].wall).toBe("south");
    expect(rep.windows[0].dimensions[0]).toBeCloseTo(1.5, 1);
    expect(rep.windows[0].dimensions[1]).toBeCloseTo(1.2, 1);

    expect(rep.doors.length).toBe(1);
    expect(rep.doors[0].id).toBe("door-north-01");
    expect(rep.doors[0].wall).toBe("north");
    expect(rep.doors[0].dimensions[0]).toBeCloseTo(1.0, 1);
    expect(rep.doors[0].dimensions[1]).toBeCloseTo(2.1, 1);
  });

  it("finds clean, non-overlapping positions for sequential openings", () => {
    const wallLength = 6.0;

    // First window placed on empty wall
    const pos1 = findNextAvailableOpeningPosition(wallLength, [], 1.6);
    expect(pos1).toBeGreaterThanOrEqual(0.35);
    expect(pos1 + 1.6).toBeLessThanOrEqual(wallLength - 0.35);

    // Second window placed on wall with existing window at pos1
    const pos2 = findNextAvailableOpeningPosition(wallLength, [{ positionX: 1.0, width: 1.6 }], 1.6);
    // Should not overlap [1.0, 2.6]
    expect(pos2 >= 2.6 + 0.35 || pos2 + 1.6 <= 1.0).toBe(true);

    // Clamping keeps apertures strictly inside wall boundaries
    const clamped = clampOpeningPlacement(wallLength, 3.0, 10.0, 2.0, 1.0, 1.2, false);
    expect(clamped.positionX + clamped.width).toBeLessThanOrEqual(wallLength);
  });

  it("aligns window lintel header to standard 2.10m datum", () => {
    const aligned = alignToStandardHeader(3.0, 1.2, 2.1);
    expect(aligned.height).toBe(1.2);
    expect(aligned.sillHeight).toBeCloseTo(0.9, 2);
    expect(aligned.sillHeight + aligned.height).toBeCloseTo(2.1, 2);
  });

  it("evenly distributes multiple openings along a wall", () => {
    const openings = [
      { id: "w1", width: 1.2 },
      { id: "w2", width: 1.2 },
    ];
    const distributed = distributeOpeningsEvenly(6.0, openings);
    expect(distributed.length).toBe(2);
    // 6.0m wall with two 1.2m windows: remaining space = 3.6m / 3 gaps = 1.2m gap
    expect(distributed[0].positionX).toBeCloseTo(1.2, 1);
    expect(distributed[1].positionX).toBeCloseTo(3.6, 1);
  });
});

