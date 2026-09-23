import { describe, it, expect } from "vitest";
import {
  runIntegratedEnergySimulation,
  DEFAULT_ENERGY_SYSTEM_CONFIG,
  DEFAULT_COMFORT_CONFIG,
  DEFAULT_BASELINE_SHELTER,
} from "./energy-simulation";
import { DEFAULT_KEROSENE_CONFIG, DEFAULT_LOGISTICS_CONFIG } from "./fuel-logistics";
import type { ShelterModel } from "@/types/shelter";
import { DEFAULT_LADAKH_PROJECT } from "@/lib/store/use-shelter-store";

describe("Integrated Energy & Solar Advisory Simulation Tests", () => {
  const baseMockModel: ShelterModel = {
    ...DEFAULT_LADAKH_PROJECT,
    envelope: {
      ...DEFAULT_LADAKH_PROJECT.envelope,
      roof: {
        ...DEFAULT_LADAKH_PROJECT.envelope.roof,
        solarPanels: {
          enabled: false,
          panelCount: 6,
          panelWattageW: 400,
          panelEfficiencyPct: 21.5,
          tiltAngleDeg: 45,
          mountingType: "UnistrutElevated",
        },
      },
    },
  };

  it("calculates 0 kWp and generates solarOpportunityAdvisory when solar is disabled", () => {
    const disabledModel: ShelterModel = {
      ...baseMockModel,
      envelope: {
        ...baseMockModel.envelope,
        roof: {
          ...baseMockModel.envelope.roof,
          solarPanels: {
            enabled: false,
            panelCount: 6,
            panelWattageW: 400,
            panelEfficiencyPct: 21.5,
            tiltAngleDeg: 45,
            mountingType: "UnistrutElevated",
          },
        },
      },
    };

    const result = runIntegratedEnergySimulation(
      disabledModel,
      DEFAULT_COMFORT_CONFIG,
      DEFAULT_ENERGY_SYSTEM_CONFIG,
      DEFAULT_KEROSENE_CONFIG,
      DEFAULT_LOGISTICS_CONFIG,
      DEFAULT_BASELINE_SHELTER,
      -18,
      -2
    );

    // Rooftop solar must be strictly 0
    expect(result.solarHardware.rooftopPvKw).toBe(0);
    expect(result.solarHardware.rooftopPanelCount).toBe(0);

    // Advisory must be active and suggest clean solar addition
    expect(result.solarOpportunityAdvisory).toBeDefined();
    expect(result.solarOpportunityAdvisory?.isSolarInstalled).toBe(false);
    expect(result.solarOpportunityAdvisory?.recommendedKw).toBeGreaterThan(0);
    expect(result.solarOpportunityAdvisory?.estMonthlyKeroseneSavedL).toBeGreaterThan(0);
    expect(result.solarOpportunityAdvisory?.estAnnualCostSavingsInr).toBeGreaterThan(0);
    expect(result.solarOpportunityAdvisory?.estPaybackYears).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.includes("Solar Upgrade Opportunity"))).toBe(true);
  });

  it("calculates active solar generation when solar panels are enabled", () => {
    const enabledModel: ShelterModel = {
      ...baseMockModel,
      envelope: {
        ...baseMockModel.envelope,
        roof: {
          ...baseMockModel.envelope.roof,
          solarPanels: {
            enabled: true,
            panelCount: 6,
            panelWattageW: 400,
            panelEfficiencyPct: 21.5,
            tiltAngleDeg: 45,
            mountingType: "UnistrutElevated",
          },
        },
      },
    };

    const result = runIntegratedEnergySimulation(
      enabledModel,
      DEFAULT_COMFORT_CONFIG,
      DEFAULT_ENERGY_SYSTEM_CONFIG,
      DEFAULT_KEROSENE_CONFIG,
      DEFAULT_LOGISTICS_CONFIG,
      DEFAULT_BASELINE_SHELTER,
      -18,
      -2
    );

    // Active rooftop generation
    expect(result.solarHardware.rooftopPvKw).toBe(2.4); // 6 * 400W = 2.4 kWp
    expect(result.solarHardware.rooftopPanelCount).toBe(6);
    expect(result.solarOpportunityAdvisory?.isSolarInstalled).toBe(true);
    expect(result.energyMetrics.solarEnergyGeneratedKwhPerDay).toBeGreaterThan(0);
  });
});
