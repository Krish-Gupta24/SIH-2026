import { describe, it, expect } from "vitest";
import {
  getThermalColor,
  calculateThermalMetrics,
  calculateHourlyThermalStep,
} from "./thermal-physics";
import type { ShelterModel } from "@/types/shelter";

describe("Thermal Physics & 24h Timeseries Engine Tests", () => {
  const mockModel: ShelterModel = {
    id: "proj-ladakh-01",
    schemaVersion: "1.0.0",
    project: {
      id: "proj-ladakh-01",
      name: "Ladakh Test Shelter",
      version: "1.0.0",
      tags: ["High-Altitude"],
    },
    location: {
      latitude: 34.15,
      longitude: 77.57,
      elevation: 3500,
      region: "Leh",
      climateZone: "Alpine",
      weatherSource: "ladakh_winter.epw",
      designTempWinter: -20.0,
    },
    geometry: {
      shape: "Rectangle",
      length: 6.0,
      width: 4.0,
      height: 2.8,
      orientation: 0,
      roofType: "Flat",
      roofAngle: 5,
      floorElevation: 0,
    },
    envelope: {
      walls: {
        north: {
          constructionId: "w1",
          layers: [
            { materialId: "mat-rammed-earth", thickness: 0.3 },
            { materialId: "mat-eps-insulation", thickness: 0.1 },
          ],
        },
        south: {
          constructionId: "w1",
          layers: [
            { materialId: "mat-rammed-earth", thickness: 0.3 },
            { materialId: "mat-eps-insulation", thickness: 0.1 },
          ],
        },
        east: {
          constructionId: "w1",
          layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }],
        },
        west: {
          constructionId: "w1",
          layers: [{ materialId: "mat-rammed-earth", thickness: 0.3 }],
        },
      },
      roof: {
        constructionId: "r1",
        slope: 5,
        overhang: 0.3,
        solarAbsorptance: 0.75,
        layers: [{ materialId: "mat-eps-insulation", thickness: 0.15 }],
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
        id: "win-1",
        wall: "south",
        width: 2.0,
        height: 1.5,
        positionX: 1.0,
        sillHeight: 0.8,
        shadingOverhang: 0,
        glazingType: "Double_LowE_Argon",
        frameType: "UPVC_Insulated",
      },
    ],
    doors: [],
    thermalMass: [],
    ventilation: {
      infiltrationACH: 0.35,
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
      comfortTempMinC: 18,
      comfortTempMaxC: 24,
      maxAnnualHeatingDemandKwhM2: 30,
      targetComfortPercent: 85,
    },
    simulationSettings: {
      engine: "EnergyPlus",
      timestepsPerHour: 4,
      runPeriodDays: 1,
      startMonth: 1,
      startDay: 15,
      detailedComponentOutputs: true,
    },
  };

  describe("FLIR Ironbow / Turbo Thermal Color Grading", () => {
    it("assigns cryogenic navy/indigo colors to temperatures <= -18°C", () => {
      const colorCold = getThermalColor(-22);
      expect(colorCold).toBe("#0f172a");
    });

    it("assigns freezing cobalt blue to sub-zero cold (-8°C)", () => {
      const color = getThermalColor(-8);
      expect(color).toBe("#1e40af");
    });

    it("assigns cyan to near-freezing transition (+2°C)", () => {
      const color = getThermalColor(2);
      expect(color).toBe("#06b6d4");
    });

    it("assigns amber/yellow to mild positive temperatures (+8°C)", () => {
      const color = getThermalColor(8);
      expect(color).toBe("#eab308");
    });

    it("assigns hot carmine red to comfortable living temperatures (+20°C)", () => {
      const color = getThermalColor(20);
      expect(color).toBe("#ef4444");
    });

    it("assigns peak solar yellow/white to extreme high surfaces (> +22°C)", () => {
      const color = getThermalColor(25);
      expect(color).toBe("#fef08a");
    });
  });

  describe("ISO 6946 / ISO 10211 Thermal Metrics Calculation", () => {
    it("computes distinct temperatures for south vs north walls due to sol-air solar gain", () => {
      const metrics = calculateThermalMetrics(mockModel);

      // North wall receives diffuse sky only, south wall receives direct high-altitude solar beam
      expect(metrics.tSurfaceSouth).toBeGreaterThan(metrics.tSurfaceNorth);
      expect(metrics.iSouthIncident).toBeGreaterThan(metrics.iNorthIncident);
      expect(metrics.uSouth).toBeGreaterThan(0);
      expect(metrics.psiBridge).toBeGreaterThan(0);
    });

    it("calculates corner thermal bridge linear transmittance Ψ according to insulation level", () => {
      const metrics = calculateThermalMetrics(mockModel);
      expect(metrics.psiBridge).toBeLessThanOrEqual(0.25);
      expect(metrics.psiBridge).toBeGreaterThanOrEqual(0.05);
    });
  });

  describe("24-Hour Diurnal Timeseries Scrubber", () => {
    it("produces realistic nighttime drop and daytime heating using pre-simulation Sol-Air model", () => {
      const nightStep = calculateHourlyThermalStep(mockModel, 2); // 02:00 AM
      const noonStep = calculateHourlyThermalStep(mockModel, 12); // 12:00 PM

      // Noon outdoor and south temperatures must exceed midnight temperatures
      expect(noonStep.outdoorTemp).toBeGreaterThan(nightStep.outdoorTemp);
      expect(noonStep.tSurfaceSouth).toBeGreaterThan(nightStep.tSurfaceSouth);

      // Solar gain is 0 at midnight and positive at noon
      expect(nightStep.solarGainW).toBe(0);
      expect(noonStep.solarGainW).toBeGreaterThan(0);

      // Formatted label
      expect(noonStep.timeLabel).toContain("12:00 PM");
      expect(nightStep.timeLabel).toContain("2:00 AM");
    });

    it("faithfully binds to simulated EnergyPlus hourly arrays when available", () => {
      const mockEnergyPlusHourly = {
        timestamps: Array.from({ length: 24 }, (_, i) => `2026-01-15T${String(i).padStart(2, "0")}:00:00Z`),
        indoorTemp: Array.from({ length: 24 }, (_, i) => (i >= 10 && i <= 16 ? 21.2 : 17.5)),
        outdoorTemp: Array.from({ length: 24 }, (_, i) => -18.0 + (i >= 7 && i <= 17 ? 6.0 : 0.0)),
        solarGains: Array.from({ length: 24 }, (_, i) => (i >= 8 && i <= 16 ? 640 : 0)),
        directNormalIrradiance: Array.from({ length: 24 }, (_, i) => (i >= 8 && i <= 16 ? 920 : 0)),
      };

      const step12 = calculateHourlyThermalStep(mockModel, 12, mockEnergyPlusHourly);
      expect(step12.indoorTemp).toBe(21.2);
      expect(step12.solarGainW).toBe(640);
      expect(step12.dni).toBe(920);

      const step03 = calculateHourlyThermalStep(mockModel, 3, mockEnergyPlusHourly);
      expect(step03.indoorTemp).toBe(17.5);
      expect(step03.solarGainW).toBe(0);
    });
  });
});
