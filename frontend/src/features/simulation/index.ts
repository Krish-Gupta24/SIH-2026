/**
 * Simulation Feature Module
 * Responsible for engine selection (ThermoShelter Core, OpenStudio, ANSYS),
 * simulation run parameter configuration, job progress monitoring, and log streaming.
 */

export type SimulationEngine = "ThermoShelter Core" | "OpenStudio" | "ANSYS";

export interface SimulationJobConfig {
  shelterId: string;
  engine: SimulationEngine;
  weatherFile: string;
  timestepsPerHour: number;
}
