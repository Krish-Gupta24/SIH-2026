import * as THREE from "three";

export interface SolarSite {
  latitudeDeg: number;
  longitudeDeg: number;
  dayOfYear: number;
  timezoneOffsetHours?: number;
}

export interface SunAngles {
  altitudeDeg: number;
  azimuthFromNorthDeg: number;
}

export interface DaylightWindow {
  sunrise: number;
  solarNoon: number;
  sunset: number;
  durationHours: number;
}

export type LandscapeKind = "ladakh" | "desert" | "plains";

export function dayOfYearFromIsoDate(isoDate: string): number {
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return 355;
  return Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000);
}

function timezoneFor(latitudeDeg: number, longitudeDeg: number): number {
  if (latitudeDeg >= 6 && latitudeDeg <= 38 && longitudeDeg >= 68 && longitudeDeg <= 98) return 5.5;
  return Math.round(longitudeDeg / 15);
}

function solarTerms(dayOfYear: number) {
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
  const equationOfTimeMinutes = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declinationRad = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  return { equationOfTimeMinutes, declinationRad };
}

/** Geographic sun position using site coordinates, date and local civil time. */
export function computeSunAngles(site: SolarSite, localHour: number): SunAngles {
  const lat = THREE.MathUtils.degToRad(site.latitudeDeg);
  const timezone = site.timezoneOffsetHours ?? timezoneFor(site.latitudeDeg, site.longitudeDeg);
  const { equationOfTimeMinutes, declinationRad } = solarTerms(site.dayOfYear);
  const trueSolarMinutes = localHour * 60 + equationOfTimeMinutes + 4 * site.longitudeDeg - 60 * timezone;
  const hourAngle = THREE.MathUtils.degToRad(trueSolarMinutes / 4 - 180);
  const sinAltitude = Math.sin(lat) * Math.sin(declinationRad) + Math.cos(lat) * Math.cos(declinationRad) * Math.cos(hourAngle);
  const altitudeRad = Math.asin(THREE.MathUtils.clamp(sinAltitude, -1, 1));
  const azimuthRad = Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declinationRad) * Math.cos(lat));
  return { altitudeDeg: THREE.MathUtils.radToDeg(altitudeRad), azimuthFromNorthDeg: (THREE.MathUtils.radToDeg(azimuthRad) + 540) % 360 };
}

export function daylightWindow(site: SolarSite): DaylightWindow {
  const lat = THREE.MathUtils.degToRad(site.latitudeDeg);
  const timezone = site.timezoneOffsetHours ?? timezoneFor(site.latitudeDeg, site.longitudeDeg);
  const { equationOfTimeMinutes, declinationRad } = solarTerms(site.dayOfYear);
  const cosHourAngle = THREE.MathUtils.clamp((Math.cos(THREE.MathUtils.degToRad(90.833)) / (Math.cos(lat) * Math.cos(declinationRad))) - Math.tan(lat) * Math.tan(declinationRad), -1, 1);
  const halfDayHours = THREE.MathUtils.radToDeg(Math.acos(cosHourAngle)) / 15;
  const solarNoon = (720 - 4 * site.longitudeDeg - equationOfTimeMinutes + timezone * 60) / 60;
  return { sunrise: solarNoon - halfDayHours, solarNoon, sunset: solarNoon + halfDayHours, durationHours: halfDayHours * 2 };
}

/** Scene Y-up: +Z is south at building orientation 0°. */
export function sunPositionGeographic(site: SolarSite, hour: number, distance = 42): [number, number, number] {
  const { altitudeDeg, azimuthFromNorthDeg } = computeSunAngles(site, hour);
  const altRad = THREE.MathUtils.degToRad(Math.max(altitudeDeg, -4));
  const azFromSouthRad = THREE.MathUtils.degToRad(azimuthFromNorthDeg - 180);
  const horizontal = distance * Math.cos(altRad);
  return [horizontal * Math.sin(azFromSouthRad), distance * Math.sin(altRad), horizontal * Math.cos(azFromSouthRad)];
}

export function sunLightIntensity(altitudeDeg: number, visualization: string): number {
  if (altitudeDeg <= 0) return 0.08;
  const base = visualization === "solar" ? 3.8 : 3.2;
  return base * (0.28 + 0.72 * Math.min(1, altitudeDeg / 38));
}

export function ambientIntensityForHour(altitudeDeg: number): number {
  return altitudeDeg <= 0 ? 0.16 : 0.36 + Math.min(0.42, altitudeDeg / 90);
}

/**
 * Returns peak solar noon intensity factor (0–1) for a given location and date,
 * accounting for latitude, season, and elevation above sea level.
 * High-altitude Ladakh sites get 15–22% more intensity due to thinner atmosphere.
 */
export function solarNoonIntensity(
  latitudeDeg: number,
  dayOfYear: number,
  elevationM: number
): number {
  // Declination at this day
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
  const declinationRad = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma);
  const declinationDeg = THREE.MathUtils.radToDeg(declinationRad);
  // Maximum solar altitude at noon
  const maxAltitude = 90 - Math.abs(latitudeDeg - declinationDeg);
  // Cleaner air at altitude = more irradiance (Bouger–Lambert law approximation)
  const elevationBoost = 1 + Math.min(0.22, elevationM / 14000);
  // Latitude penalty for low winter sun
  const altitudeFactor = THREE.MathUtils.clamp(maxAltitude / 90, 0.18, 1);
  return THREE.MathUtils.clamp(altitudeFactor * elevationBoost, 0.18, 1.22);
}

/**
 * Returns a hex color string for the directional sun light and sun disc,
 * accounting for altitude angle (atmospheric path length), elevation, and landscape kind.
 * Mountain sites have crisper white light; desert sites shift warmer at low angles.
 */
export function atmosphericColorTemperature(
  altitudeDeg: number,
  landscapeKind: LandscapeKind,
  elevationM: number
): string {
  const isHighAltitude = elevationM >= 2600;

  // Sunrise / sunset golden
  if (altitudeDeg < 0) {
    return landscapeKind === "desert" ? "#ff7733" : "#ff8855";
  }
  if (altitudeDeg < 5) {
    if (landscapeKind === "desert") return "#ff9944";
    if (landscapeKind === "ladakh") return "#ffaa66";
    return "#ffa855";
  }
  if (altitudeDeg < 15) {
    if (landscapeKind === "desert") return "#ffcc88";
    if (landscapeKind === "ladakh") return "#ffddaa";
    return "#ffcc99";
  }
  // Midday — warm golden amber sunlight (matching the orangish-gold sun)
  if (isHighAltitude) return "#fff4d6"; // crisp warm golden light
  if (landscapeKind === "desert") return "#ffe5b4"; // warm desert noon
  return "#fff0cc"; // gentle warm plains noon
}

/**
 * Returns shadow softness factor (0 = hard crisp, 1 = very soft/diffuse) for a location.
 * Ladakh: very hard shadows (clean high-altitude air).
 * Desert: moderately soft (dust haze diffuses light slightly).
 * Plains: normal.
 */
export function shadowSoftness(landscapeKind: LandscapeKind, elevationM: number): number {
  if (landscapeKind === "ladakh" || elevationM >= 3000) return 0.0; // hard crisp
  if (landscapeKind === "desert") return 0.18;
  return 0.08;
}
