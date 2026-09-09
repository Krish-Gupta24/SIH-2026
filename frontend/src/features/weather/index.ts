/**
 * Climate & Weather Feature Module
 * Responsible for geographic location selection (Ladakh, Kashmir, Western Plains, etc.),
 * elevation adjustments, EPW file dropzone, and NASA POWER live satellite queries.
 */

export interface LocationClimateConfig {
  latitude: number;
  longitude: number;
  elevation: number;
  region: string;
  climateZone: string;
  weatherSourceType: "EPW" | "NASA_POWER";
}
