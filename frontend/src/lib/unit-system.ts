import { useMemo } from "react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { UnitSystem } from "@/types/simulation";

/**
 * High-accuracy conversion constants between SI and IP engineering units.
 */
export const C_TO_F_FACTOR = 1.8;
export const WATTS_TO_BTU_HR = 3.412141633;
export const W_M2_TO_BTU_HR_FT2 = 0.316998396;
export const KWH_TO_KBTU = 3.412141633;
export const KWH_M2_TO_KBTU_FT2 = 0.316998396;
export const U_SI_TO_IP = 0.1761101838; // W/m²·K -> Btu/(h·ft²·°F)
export const METERS_TO_FEET = 3.280839895;
export const M2_TO_FT2 = 10.7639104;
export const M3_TO_FT3 = 35.3146667;

export function convertTemperature(celsius: number, unit: UnitSystem = "SI"): number {
  if (typeof celsius !== "number" || isNaN(celsius)) return 0;
  if (unit === "IP") {
    return celsius * C_TO_F_FACTOR + 32;
  }
  return celsius;
}

export function convertDeltaTemperature(deltaC: number, unit: UnitSystem = "SI"): number {
  if (typeof deltaC !== "number" || isNaN(deltaC)) return 0;
  if (unit === "IP") {
    return deltaC * C_TO_F_FACTOR;
  }
  return deltaC;
}

export function convertPower(watts: number, unit: UnitSystem = "SI"): number {
  if (typeof watts !== "number" || isNaN(watts)) return 0;
  if (unit === "IP") {
    return watts * WATTS_TO_BTU_HR;
  }
  return watts;
}

export function convertFlux(wPerM2: number, unit: UnitSystem = "SI"): number {
  if (typeof wPerM2 !== "number" || isNaN(wPerM2)) return 0;
  if (unit === "IP") {
    return wPerM2 * W_M2_TO_BTU_HR_FT2;
  }
  return wPerM2;
}

export function convertEnergy(kwh: number, unit: UnitSystem = "SI"): number {
  if (typeof kwh !== "number" || isNaN(kwh)) return 0;
  if (unit === "IP") {
    return kwh * KWH_TO_KBTU;
  }
  return kwh;
}

export function convertEnergyDensity(kwhPerM2: number, unit: UnitSystem = "SI"): number {
  if (typeof kwhPerM2 !== "number" || isNaN(kwhPerM2)) return 0;
  if (unit === "IP") {
    return kwhPerM2 * KWH_M2_TO_KBTU_FT2;
  }
  return kwhPerM2;
}

export function convertUValue(uWm2K: number, unit: UnitSystem = "SI"): number {
  if (typeof uWm2K !== "number" || isNaN(uWm2K)) return 0;
  if (unit === "IP") {
    return uWm2K * U_SI_TO_IP;
  }
  return uWm2K;
}

export function convertLength(meters: number, unit: UnitSystem = "SI"): number {
  if (typeof meters !== "number" || isNaN(meters)) return 0;
  if (unit === "IP") {
    return meters * METERS_TO_FEET;
  }
  return meters;
}

export function convertArea(sqM: number, unit: UnitSystem = "SI"): number {
  if (typeof sqM !== "number" || isNaN(sqM)) return 0;
  if (unit === "IP") {
    return sqM * M2_TO_FT2;
  }
  return sqM;
}

export function convertVolume(m3: number, unit: UnitSystem = "SI"): number {
  if (typeof m3 !== "number" || isNaN(m3)) return 0;
  if (unit === "IP") {
    return m3 * M3_TO_FT3;
  }
  return m3;
}

export function getTemperatureUnit(unit: UnitSystem = "SI"): string {
  return unit === "IP" ? "°F" : "°C";
}

export function getDeltaTemperatureUnit(unit: UnitSystem = "SI"): string {
  return unit === "IP" ? "Δ°F" : "Δ°C";
}

export function getPowerUnit(unit: UnitSystem = "SI"): string {
  return unit === "IP" ? "Btu/h" : "W";
}

export function getFluxUnit(unit: UnitSystem = "SI"): string {
  return unit === "IP" ? "Btu/(h·ft²)" : "W/m²";
}

export function getEnergyUnit(unit: UnitSystem = "SI"): string {
  return unit === "IP" ? "kBTU" : "kWh";
}

export function getEnergyDensityUnit(unit: UnitSystem = "SI"): string {
  return unit === "IP" ? "kBTU/ft²" : "kWh/m²";
}

export function getUValueUnit(unit: UnitSystem = "SI"): string {
  return unit === "IP" ? "Btu/(h·ft²·°F)" : "W/m²·K";
}

export function getLengthUnit(unit: UnitSystem = "SI"): string {
  return unit === "IP" ? "ft" : "m";
}

export function getAreaUnit(unit: UnitSystem = "SI"): string {
  return unit === "IP" ? "ft²" : "m²";
}

export function getVolumeUnit(unit: UnitSystem = "SI"): string {
  return unit === "IP" ? "ft³" : "m³";
}

export function formatUnitNumber(val: number | null | undefined, decimals: number = 1): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return val.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Reactive React hook that binds to active project workspace settings
 */
export function useUnitSystem() {
  const settings = useShelterStore((state) => state.settings);
  const updateSettings = useShelterStore((state) => state.updateSettings);
  const unit: UnitSystem = settings.unitSystem || "SI";
  const isIP = unit === "IP";

  return useMemo(
    () => ({
      unit,
      isIP,
      setUnitSystem: (sys: UnitSystem) => updateSettings({ unitSystem: sys }),

      // Formatters
      formatTemp: (celsius: number, decimals: number = 1) =>
        `${formatUnitNumber(convertTemperature(celsius, unit), decimals)} ${getTemperatureUnit(unit)}`,
      formatTempVal: (celsius: number, decimals: number = 1) =>
        formatUnitNumber(convertTemperature(celsius, unit), decimals),
      formatDeltaTemp: (deltaC: number, decimals: number = 1) =>
        `${formatUnitNumber(convertDeltaTemperature(deltaC, unit), decimals)} ${getDeltaTemperatureUnit(unit)}`,
      formatDeltaTempVal: (deltaC: number, decimals: number = 1) =>
        formatUnitNumber(convertDeltaTemperature(deltaC, unit), decimals),

      formatEnergyDensity: (kwhM2: number, decimals: number = 1) =>
        `${formatUnitNumber(convertEnergyDensity(kwhM2, unit), decimals)} ${getEnergyDensityUnit(unit)}`,
      formatEnergyDensityVal: (kwhM2: number, decimals: number = 1) =>
        formatUnitNumber(convertEnergyDensity(kwhM2, unit), decimals),

      formatUValue: (uWm2K: number, decimals: number = 2) =>
        `${formatUnitNumber(convertUValue(uWm2K, unit), decimals)} ${getUValueUnit(unit)}`,
      formatUValueVal: (uWm2K: number, decimals: number = 2) =>
        formatUnitNumber(convertUValue(uWm2K, unit), decimals),

      formatLength: (meters: number, decimals: number = 1) =>
        `${formatUnitNumber(convertLength(meters, unit), decimals)} ${getLengthUnit(unit)}`,
      formatLengthVal: (meters: number, decimals: number = 1) =>
        formatUnitNumber(convertLength(meters, unit), decimals),

      formatArea: (sqM: number, decimals: number = 1) =>
        `${formatUnitNumber(convertArea(sqM, unit), decimals)} ${getAreaUnit(unit)}`,
      formatAreaVal: (sqM: number, decimals: number = 1) =>
        formatUnitNumber(convertArea(sqM, unit), decimals),

      formatPower: (w: number, decimals: number = 1) =>
        `${formatUnitNumber(convertPower(w, unit), decimals)} ${getPowerUnit(unit)}`,
      formatPowerVal: (w: number, decimals: number = 1) =>
        formatUnitNumber(convertPower(w, unit), decimals),

      formatFlux: (flux: number, decimals: number = 1) =>
        `${formatUnitNumber(convertFlux(flux, unit), decimals)} ${getFluxUnit(unit)}`,
      formatFluxVal: (flux: number, decimals: number = 1) =>
        formatUnitNumber(convertFlux(flux, unit), decimals),

      formatUnitNumber,
      formatNumber: formatUnitNumber,

      // Label units
      tempUnit: getTemperatureUnit(unit),
      deltaTempUnit: getDeltaTemperatureUnit(unit),
      powerUnit: getPowerUnit(unit),
      fluxUnit: getFluxUnit(unit),
      energyUnit: getEnergyUnit(unit),
      energyDensityUnit: getEnergyDensityUnit(unit),
      uValueUnit: getUValueUnit(unit),
      lengthUnit: getLengthUnit(unit),
      areaUnit: getAreaUnit(unit),
      volumeUnit: getVolumeUnit(unit),

      // Raw converters
      toTemp: (c: number) => convertTemperature(c, unit),
      toDeltaTemp: (dt: number) => convertDeltaTemperature(dt, unit),
      toPower: (w: number) => convertPower(w, unit),
      toFlux: (flux: number) => convertFlux(flux, unit),
      toEnergy: (kwh: number) => convertEnergy(kwh, unit),
      toEnergyDensity: (kwhM2: number) => convertEnergyDensity(kwhM2, unit),
      toUValue: (u: number) => convertUValue(u, unit),
      toLength: (m: number) => convertLength(m, unit),
      toArea: (m2: number) => convertArea(m2, unit),
      toVolume: (m3: number) => convertVolume(m3, unit),
    }),
    [unit, isIP, updateSettings]
  );
}
