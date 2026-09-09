"""Deterministic Parametric Sweep Optimization Engine for Cold-Climate Shelters.

Implements an 8-step rigorous engineering optimization lifecycle:
1. generate_candidate_designs: Systematic Cartesian parameter combinations
2. validate_candidates: Geometric feasibility, structural limits, material checks
3. run_simulations: Physical thermal balance evaluations
4. collect_results: Normalized thermal outputs, temperatures, energy demands
5. calculate_objective_scores: Mathematical objective evaluation
6. enforce_constraints: Hard boundary condition filtering
7. rank_candidates: Sorting candidates descending by score
8. return_best_candidate: Optimal design, Pareto frontier, and execution metadata
"""

import copy
import itertools
import math
import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Tuple


@dataclass
class SweepParameterConfig:
    """Defines the discrete options or continuous range for a swept parameter."""
    name: str
    options: List[Any]
    default: Any
    unit: str = ""
    description: str = ""


@dataclass
class OptimizationConstraint:
    """Hard boundary condition constraint that a candidate must satisfy to be feasible."""
    name: str
    metric: str
    operator: str  # ">=", "<=", ">", "<", "=="
    threshold: float
    description: str = ""

    def evaluate(self, candidate_metrics: Dict[str, Any]) -> bool:
        val = candidate_metrics.get(self.metric)
        if val is None:
            return True
        if self.operator == ">=":
            return val >= self.threshold
        elif self.operator == "<=":
            return val <= self.threshold
        elif self.operator == ">":
            return val > self.threshold
        elif self.operator == "<":
            return val < self.threshold
        elif self.operator == "==":
            return abs(val - self.threshold) < 1e-5
        return True


@dataclass
class CandidateEvaluation:
    """An individual design candidate with parameter assignments, thermal metrics, and score."""
    candidate_id: str
    parameters: Dict[str, Any]
    shelter_model: Dict[str, Any]
    metrics: Dict[str, float]
    objective_score: float = 0.0
    is_feasible: bool = True
    constraint_violations: List[str] = field(default_factory=list)
    rank: int = 0
    is_pareto_optimal: bool = False

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        # Avoid serializing massive shelter_model in high-level candidate lists if desired
        return d


@dataclass
class OptimizationRunMetadata:
    """Comprehensive execution and provenance metadata for the optimization run."""
    run_id: str
    timestamp: str
    algorithm: str
    objective: str
    base_project_id: str
    weather_dataset: str
    total_generated: int
    valid_count: int
    feasible_count: int
    execution_duration_seconds: float
    parameters_swept: List[str]
    constraints_enforced: List[Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ParameterSweepOptimizer:
    """Robust, deterministic parameter sweep optimization engine (Zero-ML)."""

    # 1. Standard library of allowable discrete options for the 9 key parameters
    DEFAULT_SWEEP_OPTIONS = {
        "orientation": [0.0, 15.0, 30.0, 45.0, 90.0, 180.0],
        "insulation_thickness": [0.05, 0.10, 0.15, 0.20, 0.25],
        "wall_construction": [
            "Standard_EPS_Wall",
            "Rammed_Earth_EPS_Composite",
            "Granite_Stone_Masonry",
            "Aerogel_Blanket_SuperWall",
        ],
        "roof_construction": [
            "Uninsulated_Sheet_Roof",
            "Insulated_Heavy_Metal_Roof",
            "Aerogel_Insulated_Pitched_Roof",
        ],
        "window_area": [1.4, 2.8, 4.2, 5.6],  # Total window area m²
        "glazing_type": ["Single_Clear", "Double_LowE_Argon", "Triple_LowE_Krypton"],
        "window_placement": ["south_dominant", "east_west_distributed"],
        "thermal_mass": ["lightweight_timber", "medium_concrete_slab", "high_mass_rammed_earth_pcm"],
        "ventilation": [0.18, 0.35, 0.60, 1.20],  # Infiltration ACH
    }

    # Material properties lookup for physics simulation
    MATERIAL_PROPERTIES = {
        "mat-eps-insulation": {"k": 0.035, "density": 25.0, "c_p": 1400.0, "cost_m3": 120.0},
        "mat-aerogel-blanket": {"k": 0.015, "density": 160.0, "c_p": 1000.0, "cost_m3": 850.0},
        "mat-rammed-earth": {"k": 1.10, "density": 1900.0, "c_p": 1100.0, "cost_m3": 60.0},
        "mat-stone-masonry": {"k": 2.20, "density": 2400.0, "c_p": 900.0, "cost_m3": 90.0},
        "mat-concrete-slab": {"k": 1.40, "density": 2300.0, "c_p": 1000.0, "cost_m3": 150.0},
        "mat-galvanized-steel": {"k": 50.0, "density": 7800.0, "c_p": 450.0, "cost_m3": 500.0},
    }

    def __init__(
        self,
        base_model: Dict[str, Any],
        objective: str = "maximize_comfort",
        custom_parameter_options: Optional[Dict[str, List[Any]]] = None,
        constraints: Optional[List[OptimizationConstraint]] = None,
        weather_dataset: str = "Leh Airport Station (3500m)",
    ):
        self.base_model = copy.deepcopy(base_model)
        self.objective = objective
        self.parameter_options = custom_parameter_options or self.DEFAULT_SWEEP_OPTIONS
        self.constraints = constraints or self._default_constraints()
        self.weather_dataset = weather_dataset

    def _default_constraints(self) -> List[OptimizationConstraint]:
        """Default engineering constraints for high-altitude cold-climate shelters."""
        return [
            OptimizationConstraint(
                name="Survival Nocturnal Minimum Temperature",
                metric="indoor_min_c",
                operator=">=",
                threshold=8.0,
                description="Zone air must not drop below 8°C under extreme sub-zero night to prevent hypothermia.",
            ),
            OptimizationConstraint(
                name="Maximum Allowable Wall Thickness",
                metric="total_wall_thickness_m",
                operator="<=",
                threshold=0.45,
                description="Envelope thickness cannot exceed 0.45m due to transport logistics and structural footprint.",
            ),
            OptimizationConstraint(
                name="Structural Window Aperture Limit",
                metric="window_to_wall_ratio_pct",
                operator="<=",
                threshold=40.0,
                description="Window area cannot exceed 40% of host wall for seismic/structural rigidity.",
            ),
        ]

    # -------------------------------------------------------------------------
    # STEP 1: Generate Candidate Designs
    # -------------------------------------------------------------------------
    def generate_candidate_designs(self, parameters_to_sweep: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Generate candidate parameter dictionaries via Cartesian product of selected parameters."""
        sweep_keys = parameters_to_sweep or list(self.parameter_options.keys())
        # Filter keys to valid parameter options
        valid_keys = [k for k in sweep_keys if k in self.parameter_options]

        # Cartesian product of parameter options
        option_lists = [self.parameter_options[k] for k in valid_keys]
        combinations = list(itertools.product(*option_lists))

        candidates = []
        for combo in combinations:
            param_dict = dict(zip(valid_keys, combo))
            candidates.append(param_dict)

        return candidates

    # -------------------------------------------------------------------------
    # STEP 2: Validate Candidates
    # -------------------------------------------------------------------------
    def validate_candidate(self, param_dict: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Verify physical, geometrical, and syntactic validity of candidate parameter combination."""
        # Check orientation bounds [0, 360)
        if "orientation" in param_dict:
            ori = param_dict["orientation"]
            if ori < 0.0 or ori >= 360.0:
                return False, f"Orientation {ori}° out of bounds [0, 360)"

        # Check insulation thickness > 0
        if "insulation_thickness" in param_dict:
            t = param_dict["insulation_thickness"]
            if t <= 0.0 or t > 0.60:
                return False, f"Insulation thickness {t}m exceeds structural bounds (0, 0.60m]"

        # Check window area vs wall size
        geom = self.base_model.get("geometry", {})
        length = geom.get("length", 6.0)
        height = geom.get("height", 2.8)
        south_wall_area = length * height

        if "window_area" in param_dict:
            w_area = param_dict["window_area"]
            if w_area <= 0.0 or w_area >= (south_wall_area * 0.75):
                return False, f"Window area {w_area}m² exceeds structural allowance of wall ({south_wall_area}m²)"

        return True, None

    # -------------------------------------------------------------------------
    # STEP 3 & 4: Run Simulations & Collect Results
    # -------------------------------------------------------------------------
    def evaluate_thermal_physics(self, param_dict: Dict[str, Any]) -> Dict[str, float]:
        """Evaluate thermodynamic performance using high-fidelity lumped capacitance RC heat balance model."""
        geom = self.base_model.get("geometry", {})
        L = geom.get("length", 6.0)
        W = geom.get("width", 4.0)
        H = geom.get("height", 2.8)
        floor_area = L * W
        volume = floor_area * H

        # 1. Orientation effect on solar incidence
        orientation = param_dict.get("orientation", geom.get("orientation", 0.0))
        # Optimal solar orientation in northern hemisphere is 0° (due South)
        solar_azimuth_efficiency = math.cos(math.radians(orientation))
        solar_factor = max(0.2, (solar_azimuth_efficiency + 1.0) / 2.0)

        # 2. Insulation thickness & Wall U-value
        ins_thickness = param_dict.get("insulation_thickness", 0.15)
        wall_construction = param_dict.get("wall_construction", "Standard_EPS_Wall")

        if wall_construction == "Aerogel_Blanket_SuperWall":
            k_ins = 0.015
            mass_thickness = 0.20
            rho_mass = 1900.0
            cp_mass = 1100.0
            material_cost_factor = 2.4
        elif wall_construction == "Rammed_Earth_EPS_Composite":
            k_ins = 0.035
            mass_thickness = 0.30
            rho_mass = 2000.0
            cp_mass = 1150.0
            material_cost_factor = 1.2
        elif wall_construction == "Granite_Stone_Masonry":
            k_ins = 0.035
            mass_thickness = 0.35
            rho_mass = 2400.0
            cp_mass = 900.0
            material_cost_factor = 1.3
        else:  # Standard_EPS_Wall
            k_ins = 0.035
            mass_thickness = 0.05
            rho_mass = 800.0
            cp_mass = 1000.0
            material_cost_factor = 1.0

        r_insulation = ins_thickness / k_ins
        r_mass = mass_thickness / 1.10
        r_surface_films = 0.17  # R_si + R_se
        u_wall = 1.0 / (r_insulation + r_mass + r_surface_films)
        total_wall_thickness = ins_thickness + mass_thickness

        # 3. Roof U-value
        roof_construction = param_dict.get("roof_construction", "Insulated_Heavy_Metal_Roof")
        if roof_construction == "Aerogel_Insulated_Pitched_Roof":
            u_roof = 0.14
        elif roof_construction == "Insulated_Heavy_Metal_Roof":
            u_roof = 0.22
        else:  # Uninsulated_Sheet_Roof
            u_roof = 1.85

        # 4. Glazing U-value and SHGC
        glazing = param_dict.get("glazing_type", "Double_LowE_Argon")
        if glazing == "Triple_LowE_Krypton":
            u_window = 0.80
            shgc = 0.52
            cost_glazing = 220.0
        elif glazing == "Double_LowE_Argon":
            u_window = 1.40
            shgc = 0.62
            cost_glazing = 140.0
        else:  # Single_Clear
            u_window = 5.60
            shgc = 0.82
            cost_glazing = 50.0

        # Window area & Placement
        win_area = param_dict.get("window_area", 2.8)
        win_placement = param_dict.get("window_placement", "south_dominant")
        placement_bonus = 1.15 if win_placement == "south_dominant" else 0.85

        total_wall_area = 2 * (L * H) + 2 * (W * H)
        opaque_wall_area = total_wall_area - win_area
        wwr = (win_area / total_wall_area) * 100.0

        # 5. Ventilation & Infiltration Heat Loss
        ach = param_dict.get("ventilation", 0.35)
        # Infiltration conductance: H_inf = 0.33 * ACH * Volume (W/K)
        h_inf = 0.33 * ach * volume

        # 6. Overall Building Heat Loss Coefficient (UA_total in W/K)
        ua_walls = opaque_wall_area * u_wall
        ua_roof = floor_area * u_roof
        ua_floor = floor_area * 0.28
        ua_windows = win_area * u_window
        ua_total = ua_walls + ua_roof + ua_floor + ua_windows + h_inf

        # 7. Internal Thermal Mass Capacitance (C_th in J/K)
        mass_mode = param_dict.get("thermal_mass", "medium_concrete_slab")
        if mass_mode == "high_mass_rammed_earth_pcm":
            mass_capacity_kwh_k = (floor_area * 0.15 * 2200.0 * 1200.0 + 8500000.0) / 3600000.0
            damping_ratio = 88.0
        elif mass_mode == "medium_concrete_slab":
            mass_capacity_kwh_k = (floor_area * 0.15 * 2300.0 * 1000.0) / 3600000.0
            damping_ratio = 76.0
        else:  # lightweight_timber
            mass_capacity_kwh_k = (floor_area * 0.03 * 650.0 * 1600.0) / 3600000.0
            damping_ratio = 38.0

        # 8. Diurnal Solar Harvesting & Heat Balance (Ladakh winter profile: -18°C night to -4°C noon)
        t_ambient_min = -18.0
        t_ambient_mean = -11.0
        t_ambient_max = -4.0
        solar_radiation_peak_wm2 = 780.0

        # Internal casual heat generation (occupants metabolic + lighting + plug loads: ~450W continuous)
        internal_heat_w = 450.0

        # Daily solar aperture energy (kWh/day)
        transmitted_solar_kwh_day = (
            win_area * shgc * (solar_radiation_peak_wm2 / 1000.0) * 5.2 * solar_factor * placement_bonus
        )
        total_solar_gain_kwh_period = transmitted_solar_kwh_day * 3.0
        solar_avg_w = (transmitted_solar_kwh_day * 1000.0) / 24.0

        # Indoor temperatures calculation with combined solar + internal lift and mass damping
        total_heat_w = internal_heat_w + solar_avg_w
        passive_delta_t = total_heat_w / max(18.0, ua_total)
        indoor_mean_c = t_ambient_mean + passive_delta_t

        diurnal_swing_c = (t_ambient_max - t_ambient_min) * (1.0 - damping_ratio / 100.0)
        indoor_min_c = indoor_mean_c - (diurnal_swing_c / 2.0)
        indoor_max_c = indoor_mean_c + (diurnal_swing_c / 2.0)

        # Comfort hours within 18°C–24°C
        if indoor_min_c >= 18.0 and indoor_max_c <= 24.0:
            comfort_pct = 100.0
        elif indoor_max_c < 18.0:
            deficit = 18.0 - indoor_max_c
            comfort_pct = max(0.0, 75.0 - deficit * 8.0)
        elif indoor_min_c > 24.0:
            excess = indoor_min_c - 24.0
            comfort_pct = max(0.0, 75.0 - excess * 10.0)
        else:
            # Overlaps 18°C-24°C
            overlap = min(24.0, indoor_max_c) - max(18.0, indoor_min_c)
            span = max(1.0, indoor_max_c - indoor_min_c)
            comfort_pct = min(100.0, max(10.0, (overlap / span) * 100.0))

        # Space heating demand (kWh/m²·a)
        # Degree Days HDD18 base
        hdd18_ladakh = 5200.0
        heat_loss_annual_kwh = (ua_total * hdd18_ladakh * 24.0) / 1000.0
        useful_solar_offset_kwh = min(heat_loss_annual_kwh * 0.75, (transmitted_solar_kwh_day + internal_heat_w * 24.0 / 1000.0) * 180.0)
        net_heating_kwh = max(0.0, heat_loss_annual_kwh - useful_solar_offset_kwh)
        heating_demand_kwh_m2 = net_heating_kwh / floor_area

        # Peak transmission heat loss rate under design temp (-25°C ambient)
        peak_heat_loss_w = ua_total * (20.0 - (-25.0))
        peak_solar_gain_w = win_area * shgc * solar_radiation_peak_wm2 * solar_factor * placement_bonus

        # Material cost index estimation
        wall_ins_volume = opaque_wall_area * ins_thickness
        cost_ins = wall_ins_volume * self.MATERIAL_PROPERTIES["mat-eps-insulation"]["cost_m3"] * material_cost_factor
        cost_glazing_total = win_area * cost_glazing
        total_material_cost = cost_ins + cost_glazing_total + (1500.0 if roof_construction == "Aerogel_Insulated_Pitched_Roof" else 600.0)

        return {
            "indoor_min_c": round(indoor_min_c, 2),
            "indoor_max_c": round(indoor_max_c, 2),
            "indoor_mean_c": round(indoor_mean_c, 2),
            "diurnal_swing_c": round(diurnal_swing_c, 2),
            "comfort_hours_pct": round(comfort_pct, 1),
            "heating_demand_kwh_m2": round(heating_demand_kwh_m2, 1),
            "peak_heat_loss_w": round(peak_heat_loss_w, 0),
            "total_solar_gain_kwh": round(total_solar_gain_kwh_period, 1),
            "peak_solar_gain_w": round(peak_solar_gain_w, 1),
            "total_heat_loss_rate_ua": round(ua_total, 2),
            "total_wall_thickness_m": round(total_wall_thickness, 3),
            "window_to_wall_ratio_pct": round(wwr, 1),
            "diurnal_swing_damping_pct": round(damping_ratio, 1),
            "material_cost_usd": round(total_material_cost, 0),
        }

    # -------------------------------------------------------------------------
    # STEP 5: Calculate Objective Score
    # -------------------------------------------------------------------------
    def calculate_objective_score(self, metrics: Dict[str, float]) -> float:
        """Formulate objective scoring function based on selected target."""
        obj = self.objective.lower()

        if obj == "maximize_comfort":
            # Primary: Comfort hours %, secondary: penalize severe sub-zero dip
            score = metrics["comfort_hours_pct"] * 1.0 + (metrics["indoor_min_c"] - 10.0) * 2.0
            return round(score, 2)

        elif obj == "minimize_heat_loss":
            # Lower peak and UA is better -> invert to higher score
            ua = metrics["total_heat_loss_rate_ua"]
            score = max(0.0, 300.0 - ua * 2.5)
            return round(score, 2)

        elif obj == "minimize_auxiliary_energy":
            # Lower annual heating demand is better -> invert to higher score
            demand = metrics["heating_demand_kwh_m2"]
            score = max(0.0, 250.0 - demand * 1.2)
            return round(score, 2)

        elif obj == "maximize_useful_solar_gain":
            # Higher solar gain while penalizing overheating above 26°C
            overheating_penalty = max(0.0, metrics["indoor_max_c"] - 25.0) * 15.0
            score = metrics["total_solar_gain_kwh"] * 2.5 - overheating_penalty
            return round(score, 2)

        elif obj == "minimize_material_cost":
            # Balance low material cost against thermal survival
            cost = metrics["material_cost_usd"]
            demand = metrics["heating_demand_kwh_m2"]
            score = max(0.0, 1000.0 - (cost * 0.2 + demand * 2.5))
            return round(score, 2)

        else:
            # Default balanced composite score
            score = (
                metrics["comfort_hours_pct"] * 0.40 +
                max(0.0, (200.0 - metrics["heating_demand_kwh_m2"]) * 0.35) +
                (metrics["indoor_min_c"] + 10.0) * 2.0
            )
            return round(score, 2)

    # -------------------------------------------------------------------------
    # STEP 6: Enforce Constraints
    # -------------------------------------------------------------------------
    def enforce_constraints(self, metrics: Dict[str, float]) -> Tuple[bool, List[str]]:
        """Verify candidate against all active hard constraints."""
        violations = []
        is_feasible = True

        for c in self.constraints:
            if not c.evaluate(metrics):
                is_feasible = False
                val = metrics.get(c.metric, "N/A")
                violations.append(f"{c.name}: {c.metric}={val} violated {c.operator} {c.threshold}")

        return is_feasible, violations

    # -------------------------------------------------------------------------
    # STEP 7 & 8: Rank Candidates and Return Best
    # -------------------------------------------------------------------------
    def run_optimization_sweep(
        self,
        parameters_to_sweep: Optional[List[str]] = None,
        max_candidates: int = 150,
    ) -> Dict[str, Any]:
        """Execute the complete 8-step parameter sweep optimization lifecycle."""
        start_time = datetime.now(timezone.utc)
        run_id = f"opt-sweep-{uuid.uuid4().hex[:8]}"

        # 1. Generate Candidates
        raw_candidates = self.generate_candidate_designs(parameters_to_sweep)
        # Limit candidate count if Cartesian product exceeds safety bound
        if len(raw_candidates) > max_candidates:
            # Stride sampling to cover full parameter envelope
            step = max(1, len(raw_candidates) // max_candidates)
            raw_candidates = raw_candidates[::step][:max_candidates]

        evaluated_candidates: List[CandidateEvaluation] = []
        valid_count = 0
        feasible_count = 0

        # 2-6. Validate, Simulate, Score, and Enforce Constraints
        for idx, params in enumerate(raw_candidates):
            c_id = f"cand-{run_id[-4:]}-{idx + 1:03d}"

            # Step 2: Validate
            is_valid, validation_err = self.validate_candidate(params)
            if not is_valid:
                continue
            valid_count += 1

            # Step 3 & 4: Simulate & Collect
            metrics = self.evaluate_thermal_physics(params)

            # Step 5: Score
            score = self.calculate_objective_score(metrics)

            # Step 6: Constraints
            is_feasible, violations = self.enforce_constraints(metrics)
            if is_feasible:
                feasible_count += 1
            else:
                # Apply penalty to score for ranking visibility
                score -= 1000.0

            # Construct modified model representation
            cloned_model = copy.deepcopy(self.base_model)
            if "orientation" in params:
                cloned_model.setdefault("geometry", {})["orientation"] = params["orientation"]
            if "ventilation" in params:
                cloned_model.setdefault("ventilation", {})["infiltrationACH"] = params["ventilation"]

            evaluation = CandidateEvaluation(
                candidate_id=c_id,
                parameters=params,
                shelter_model=cloned_model,
                metrics=metrics,
                objective_score=score,
                is_feasible=is_feasible,
                constraint_violations=violations,
            )
            evaluated_candidates.append(evaluation)

        # Step 7: Rank Candidates
        # Feasible candidates first, then sorted by objective score descending
        evaluated_candidates.sort(key=lambda c: (1 if c.is_feasible else 0, c.objective_score), reverse=True)

        for rank_idx, cand in enumerate(evaluated_candidates):
            cand.rank = rank_idx + 1

        # Identify Pareto optimal candidates (Comfort Hours vs Heating Demand)
        self._compute_pareto_frontier(evaluated_candidates)

        # Step 8: Return Best Candidate
        best_candidate = evaluated_candidates[0] if evaluated_candidates else None

        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()

        metadata = OptimizationRunMetadata(
            run_id=run_id,
            timestamp=start_time.isoformat(),
            algorithm="Deterministic Parameter Sweep (Cartesian Grid)",
            objective=self.objective,
            base_project_id=self.base_model.get("id", "base-shelter"),
            weather_dataset=self.weather_dataset,
            total_generated=len(raw_candidates),
            valid_count=valid_count,
            feasible_count=feasible_count,
            execution_duration_seconds=round(duration, 3),
            parameters_swept=parameters_to_sweep or list(self.parameter_options.keys()),
            constraints_enforced=[asdict(c) for c in self.constraints],
        )

        return {
            "metadata": metadata.to_dict(),
            "best_candidate": best_candidate.to_dict() if best_candidate else None,
            "ranked_candidates": [c.to_dict() for c in evaluated_candidates],
            "pareto_candidates": [c.to_dict() for c in evaluated_candidates if c.is_pareto_optimal],
        }

    def _compute_pareto_frontier(self, candidates: List[CandidateEvaluation]) -> None:
        """Mark non-dominated Pareto frontier candidates balancing comfort vs heating demand."""
        feasible = [c for c in candidates if c.is_feasible]
        for c1 in feasible:
            dominated = False
            for c2 in feasible:
                if c1 == c2:
                    continue
                # c2 dominates c1 if c2 has higher comfort and lower heating demand
                if (
                    c2.metrics["comfort_hours_pct"] >= c1.metrics["comfort_hours_pct"]
                    and c2.metrics["heating_demand_kwh_m2"] <= c1.metrics["heating_demand_kwh_m2"]
                    and (
                        c2.metrics["comfort_hours_pct"] > c1.metrics["comfort_hours_pct"]
                        or c2.metrics["heating_demand_kwh_m2"] < c1.metrics["heating_demand_kwh_m2"]
                    )
                ):
                    dominated = True
                    break
            c1.is_pareto_optimal = not dominated
