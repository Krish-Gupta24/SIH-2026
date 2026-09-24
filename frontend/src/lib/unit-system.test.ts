import { describe, it, expect } from "vitest";
import {
  convertTemperature,
  convertDeltaTemperature,
  convertUValue,
  convertEnergyDensity,
  convertLength,
  convertArea,
  convertVolume,
  convertPower,
  convertFlux,
  getTemperatureUnit,
  getDeltaTemperatureUnit,
  getUValueUnit,
  getEnergyDensityUnit,
  getLengthUnit,
  getAreaUnit,
  getVolumeUnit,
  getPowerUnit,
  getFluxUnit,
  formatUnitNumber,
} from "./unit-system";

describe("unit-system universal converters", () => {
  describe("Temperature (°C <-> °F)", () => {
    it("leaves SI untouched", () => {
      expect(convertTemperature(0, "SI")).toBe(0);
      expect(convertTemperature(-20, "SI")).toBe(-20);
      expect(convertTemperature(21, "SI")).toBe(21);
    });

    it("converts Celsius to Fahrenheit for IP", () => {
      expect(convertTemperature(0, "IP")).toBe(32);
      expect(convertTemperature(100, "IP")).toBe(212);
      expect(convertTemperature(-40, "IP")).toBe(-40);
      expect(convertTemperature(20, "IP")).toBe(68);
    });

    it("correctly converts temperature delta (no +32 offset)", () => {
      expect(convertDeltaTemperature(10, "SI")).toBe(10);
      expect(convertDeltaTemperature(10, "IP")).toBe(18);
      expect(convertDeltaTemperature(1, "IP")).toBe(1.8);
    });
  });

  describe("U-Value (W/m²·K <-> Btu/(h·ft²·°F))", () => {
    it("converts W/m²·K to imperial U-value", () => {
      expect(convertUValue(1.0, "SI")).toBe(1.0);
      const ipU = convertUValue(1.0, "IP");
      expect(ipU).toBeCloseTo(0.1761, 3);
      // Standard Passive house 0.28 W/m²·K
      expect(convertUValue(0.28, "IP")).toBeCloseTo(0.0493, 3);
    });
  });

  describe("Energy Density (kWh/m² <-> kBTU/ft²)", () => {
    it("converts kWh/m² to kBTU/ft²", () => {
      expect(convertEnergyDensity(100, "SI")).toBe(100);
      expect(convertEnergyDensity(100, "IP")).toBeCloseTo(31.6998, 2);
    });
  });

  describe("Geometry & Spatial Conversions", () => {
    it("converts meters to feet", () => {
      expect(convertLength(1, "SI")).toBe(1);
      expect(convertLength(1, "IP")).toBeCloseTo(3.28084, 4);
      expect(convertLength(6, "IP")).toBeCloseTo(19.685, 2);
    });

    it("converts m² to ft²", () => {
      expect(convertArea(1, "SI")).toBe(1);
      expect(convertArea(1, "IP")).toBeCloseTo(10.7639, 3);
      expect(convertArea(24, "IP")).toBeCloseTo(258.334, 1);
    });

    it("converts m³ to ft³", () => {
      expect(convertVolume(1, "SI")).toBe(1);
      expect(convertVolume(1, "IP")).toBeCloseTo(35.3147, 3);
    });
  });

  describe("Power & Heat Flux", () => {
    it("converts Watts to Btu/h", () => {
      expect(convertPower(1000, "SI")).toBe(1000);
      expect(convertPower(1000, "IP")).toBeCloseTo(3412.14, 1);
    });

    it("converts W/m² to Btu/(h·ft²)", () => {
      expect(convertFlux(100, "SI")).toBe(100);
      expect(convertFlux(100, "IP")).toBeCloseTo(31.7, 1);
    });
  });

  describe("Unit Labels", () => {
    it("returns correct labels for SI and IP", () => {
      expect(getTemperatureUnit("SI")).toBe("°C");
      expect(getTemperatureUnit("IP")).toBe("°F");

      expect(getDeltaTemperatureUnit("SI")).toBe("Δ°C");
      expect(getDeltaTemperatureUnit("IP")).toBe("Δ°F");

      expect(getUValueUnit("SI")).toBe("W/m²·K");
      expect(getUValueUnit("IP")).toBe("Btu/(h·ft²·°F)");

      expect(getEnergyDensityUnit("SI")).toBe("kWh/m²");
      expect(getEnergyDensityUnit("IP")).toBe("kBTU/ft²");

      expect(getLengthUnit("SI")).toBe("m");
      expect(getLengthUnit("IP")).toBe("ft");

      expect(getAreaUnit("SI")).toBe("m²");
      expect(getAreaUnit("IP")).toBe("ft²");

      expect(getVolumeUnit("SI")).toBe("m³");
      expect(getVolumeUnit("IP")).toBe("ft³");

      expect(getPowerUnit("SI")).toBe("W");
      expect(getPowerUnit("IP")).toBe("Btu/h");

      expect(getFluxUnit("SI")).toBe("W/m²");
      expect(getFluxUnit("IP")).toBe("Btu/(h·ft²)");
    });
  });

  describe("formatUnitNumber", () => {
    it("formats numbers with fixed decimals", () => {
      expect(formatUnitNumber(23.456, 1)).toBe("23.5");
      expect(formatUnitNumber(23.456, 2)).toBe("23.46");
      expect(formatUnitNumber(null)).toBe("—");
      expect(formatUnitNumber(undefined)).toBe("—");
      expect(formatUnitNumber(NaN)).toBe("—");
    });
  });
});
