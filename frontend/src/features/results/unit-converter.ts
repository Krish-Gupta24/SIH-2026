import { UnitSystem } from "@/types/simulation";

/**
 * High-accuracy conversion constants between SI and IP engineering units.
 */
const C_TO_F_FACTOR = 1.8;
const WATTS_TO_BTU_HR = 3.412141633;
const W_M2_TO_BTU_HR_FT2 = 0.316998396;
const KWH_TO_KBTU = 3.412141633;
const KWH_M2_TO_KBTU_FT2 = 0.316998396;

export function convertTemperature(celsius: number, unit: UnitSystem): number {
  if (unit === "IP") {
    return celsius * C_TO_F_FACTOR + 32;
  }
  return celsius;
}

export function convertPower(watts: number, unit: UnitSystem): number {
  if (unit === "IP") {
    return watts * WATTS_TO_BTU_HR;
  }
  return watts;
}

export function convertFlux(wPerM2: number, unit: UnitSystem): number {
  if (unit === "IP") {
    return wPerM2 * W_M2_TO_BTU_HR_FT2;
  }
  return wPerM2;
}

export function convertEnergy(kwh: number, unit: UnitSystem): number {
  if (unit === "IP") {
    return kwh * KWH_TO_KBTU;
  }
  return kwh;
}

export function convertEnergyDensity(kwhPerM2: number, unit: UnitSystem): number {
  if (unit === "IP") {
    return kwhPerM2 * KWH_M2_TO_KBTU_FT2;
  }
  return kwhPerM2;
}

export function getTemperatureUnit(unit: UnitSystem): string {
  return unit === "IP" ? "°F" : "°C";
}

export function getPowerUnit(unit: UnitSystem): string {
  return unit === "IP" ? "Btu/h" : "W";
}

export function getFluxUnit(unit: UnitSystem): string {
  return unit === "IP" ? "Btu/(h·ft²)" : "W/m²";
}

export function getEnergyUnit(unit: UnitSystem): string {
  return unit === "IP" ? "kBTU" : "kWh";
}

export function getEnergyDensityUnit(unit: UnitSystem): string {
  return unit === "IP" ? "kBTU/ft²" : "kWh/m²";
}

export function formatNumber(val: number, decimals: number = 1): string {
  if (isNaN(val) || val === null || val === undefined) return "—";
  return val.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
