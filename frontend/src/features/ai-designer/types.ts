/**
 * TypeScript type definitions for AI Generative Design Engine.
 */

export interface PhysicalParameters {
  length_m: number;
  width_m: number;
  height_m: number;
  aspect_ratio: number;
  orientation_deg: number;
  wall_insulation_thickness_m: number;
  roof_insulation_thickness_m: number;
  floor_insulation_thickness_m: number;
  wall_construction_type: string;
  roof_construction_type: string;
  floor_construction_type: string;
  glazing_type: string;
  window_wall_ratio_south: number;
  window_wall_ratio_north: number;
  window_wall_ratio_east: number;
  window_wall_ratio_west: number;
  window_width_m: number;
  window_height_m: number;
  airtightness_ach: number;
  thermal_mass_thickness_m: number;
  shading_overhang_depth_m: number;
}

export interface SurrogatePredictions {
  winter_indoor_min_c: number;
  heating_demand_kwh_m2: number;
  annual_discomfort_hours_pct: number;
  envelope_mass_kg: number;
  peak_heating_load_w: number;
  diurnal_swing_c: number;
}

export interface AICandidate {
  candidate_id: string;
  parameters: PhysicalParameters & Record<string, any>;
  surrogate_predictions: SurrogatePredictions & Record<string, number>;
  uncertainty_margin_c: number;
  is_high_uncertainty: boolean;
  objective_values: number[];
  is_physics_verified: boolean;
  verified_physics?: Record<string, number> | null;
  calibration_error?: Record<string, number> | null;
  verification_duration_s?: number | null;
}

export interface OptimizationJobStatus {
  job_id: string;
  status: "QUEUED" | "OPTIMIZING" | "COMPLETED" | "FAILED" | string;
  progress_pct: number;
  current_generation: number;
  total_generations: number;
  evaluations_count: number;
  elapsed_seconds: number;
  candidates_count: number;
  error_message?: string | null;
}

export interface GenerateDesignParams {
  weather_id: string;
  target_indoor_min_c: number;
  max_envelope_mass_kg?: number | null;
  optimization_mode: "BALANCED" | "MINIMUM_HEATING" | "MAXIMUM_COMFORT" | "MINIMUM_MASS";
  population_size: number;
  generations: number;
  occupants: number;
}

export interface SHAPFeatureAttribution {
  feature: string;
  shap_value: number;
  feature_value: any;
  direction: "increases_target" | "decreases_target" | string;
}

export interface SHAPReport {
  candidate_id: string;
  target_name: string;
  predicted_value: number;
  base_value: number;
  top_positive_features: SHAPFeatureAttribution[];
  top_negative_features: SHAPFeatureAttribution[];
  all_attributions: Record<string, number>;
}

export interface ModelStatus {
  is_surrogate_available: boolean;
  model_card?: {
    model_version?: string;
    version?: string | number;
    model_family?: string;
    training_date?: string;
    training_sample_count?: number;
    test_metrics?: Record<string, { r2: number; rmse: number; mae: number }>;
    approval_status?: string;
    input_features?: string[];
    target_variables?: string[];
  };
  message?: string;
}
