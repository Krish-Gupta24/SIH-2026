/**
 * Results Visualization Feature Module
 * Responsible for rendering zone mean air temperatures, PMV/PPD comfort distributions,
 * heating/cooling load duration curves, and surface heat balance sankey diagrams.
 */

export interface HourlyThermalDataPoint {
  timestamp: string;
  outdoorTempC: number;
  indoorTempC: number;
  heatingPowerWatts: number;
  pmv: number;
  ppd: number;
}
