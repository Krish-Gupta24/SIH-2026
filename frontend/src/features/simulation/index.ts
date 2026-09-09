/**
 * Simulation Feature Module
 * Responsible for engine selection (EnergyPlus, OpenStudio, ANSYS),
 * simulation run parameter configuration, job progress monitoring, and log streaming.
 */

export type SimulationEngine = "EnergyPlus" | "OpenStudio" | "ANSYS";

export interface SimulationJobConfig {
  shelterId: string;
  engine: SimulationEngine;
  weatherFile: string;
  timestepsPerHour: number;
}
