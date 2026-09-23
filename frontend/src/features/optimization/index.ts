/**
 * Multi-Objective Parametric Optimization Feature Module
 * Deterministic parameter sweeps across 9 thermal design variables with
 * physics-based validation, constraints enforcement, Pareto frontier calculation,
 * and structured 7-section Engineering Recommendation Layer.
 */

export * from "./types";
export * from "./optimization-engine";
export * from "./recommendation-engine";
export * from "./OptimizationView";
export * from "./components/OptimizationSetupCard";
export * from "./components/OptimalCandidateCard";
export * from "./components/RecommendedDesignReportCard";
export * from "./components/ParetoAndSensitivityCharts";
export * from "./components/CandidateRankingsTable";

// Energy, Fuel, Cost & Comfort Optimization Layer
export * from "./energy-types";
export * from "./energy-simulation";
export * from "./fuel-logistics";
export * from "./EnergyOptimizationView";
export * from "./OptimizationPageContainer";
export * from "./components/EnergyDashboardPanel";
export * from "./components/EnergyCharts";
export * from "./components/EnergySetupPanel";
export * from "./components/DesignTradeoffTable";
