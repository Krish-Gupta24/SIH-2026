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
