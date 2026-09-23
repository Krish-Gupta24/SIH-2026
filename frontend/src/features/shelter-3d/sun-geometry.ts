import * as THREE from "three";

export interface SunAngles {
  altitudeDeg: number;
  azimuthFromNorthDeg: number;
}

/**
 * Simplified solar position for Leh-style high-latitude sites (winter design day).
 * Azimuth: 0° = North, 90° = East, 180° = South (standard surveying).
 */
export function computeSunAngles(
  latitudeDeg: number,
  hour: number,
  dayOfYear = 355
): SunAngles {
  const lat = THREE.MathUtils.degToRad(latitudeDeg);
  const decl =
    THREE.MathUtils.degToRad(23.44) *
    Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
  const hourAngle = THREE.MathUtils.degToRad((hour - 12) * 15);

  const sinAlt =
    Math.sin(lat) * Math.sin(decl) +
    Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  const altitudeDeg = THREE.MathUtils.radToDeg(
    Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  );

  const cosAlt = Math.cos(Math.asin(Math.max(-1, Math.min(1, sinAlt))));
  let azimuthFromNorthDeg = 180;
  if (cosAlt > 1e-4) {
    const cosAz =
      (Math.sin(decl) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * cosAlt);
    const az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
    azimuthFromNorthDeg = THREE.MathUtils.radToDeg(hour >= 12 ? az : -az);
    if (azimuthFromNorthDeg < 0) azimuthFromNorthDeg += 360;
  }

  return { altitudeDeg, azimuthFromNorthDeg };
}

/** Scene Y-up: +Z is south at building orientation 0°. */
export function sunPositionGeographic(
  latitudeDeg: number,
  hour: number,
  distance = 42
): [number, number, number] {
  const { altitudeDeg, azimuthFromNorthDeg } = computeSunAngles(latitudeDeg, hour);
  if (altitudeDeg <= -2) {
    return [0, distance * 0.15, -distance];
  }

  const altRad = THREE.MathUtils.degToRad(altitudeDeg);
  const azFromSouthRad = THREE.MathUtils.degToRad(azimuthFromNorthDeg - 180);
  const horizontal = distance * Math.cos(altRad);
  const x = horizontal * Math.sin(azFromSouthRad);
  const z = horizontal * Math.cos(azFromSouthRad);
  const y = distance * Math.sin(altRad);
  return [x, y, z];
}

export function sunLightIntensity(altitudeDeg: number, visualization: string): number {
  if (altitudeDeg <= 0) return 0.12;
  const dayFactor = Math.min(1, altitudeDeg / 35);
  const base = visualization === "solar" ? 2.4 : 1.85;
  return base * (0.35 + 0.65 * dayFactor);
}

export function ambientIntensityForHour(hour: number, altitudeDeg: number): number {
  if (altitudeDeg <= 0) return 0.22;
  const noonish = hour >= 8 && hour <= 16 ? 1 : 0.75;
  return 0.45 + 0.35 * noonish;
}
