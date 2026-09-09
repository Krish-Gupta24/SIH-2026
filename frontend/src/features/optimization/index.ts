/**
 * Multi-Objective Optimization Feature Module
 * Responsible for configuring design variable bounds (insulation thickness, WWR, orientation),
 * running NSGA-II iterations, and exploring interactive 2D/3D Pareto fronts.
 */

export interface OptimizationObjectiveConfig {
  name: "min_heating_demand" | "min_initial_cost" | "max_comfort_hours";
  weight: number;
}
