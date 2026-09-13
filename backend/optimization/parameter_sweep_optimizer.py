"""Deterministic Parametric Sweep Optimization Engine for Cold-Climate Shelters.

Implements the rigorous EnergyPlus-backed engineering optimization lifecycle:
1. BASE SHELTER MODEL: Ingest active project geometry, materials, weather, design targets
2. GENERATE CANDIDATE: Systematic Cartesian parameter combinations (20-50 candidates)
3. VALIDATE CANDIDATE: OpeningValidator, VentilationValidator, ThermalMassValidator, structural limits
4. GENERATE ENERGYPLUS MODEL: Compiles valid IDF with active material_db and glazing_db
5. RUN ENERGYPLUS: Executes EnergyPlus in isolated working directory via EnergyPlusRunner
6. PARSE RESULTS: Extracts physical temperatures, comfort hours against DesignTargets, energy & solar gains
7. CALCULATE OBJECTIVE: Evaluates objective functions on verified physical outputs
8. APPLY CONSTRAINTS: Hard boundary condition filtering
9. RANK CANDIDATE: Sorts candidates descending by score and computes Pareto frontier
"""

import copy
import itertools
import math
import os
import shutil
import tempfile
import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from simulation.materials.database import material_db
from simulation.materials.glazing import glazing_db
from simulation.runners.engine import EnergyPlusEngine
from simulation.runners.energyplus_runner import EnergyPlusRunner
from simulation.results.metrics import parse_comfort_definition
from simulation.validation.opening_validator import OpeningValidator
from simulation.validation.ventilation_validator import VentilationValidator
from simulation.validation.thermal_mass_validator import ThermalMassValidator


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
        if not candidate_metrics:
            return False
        val = candidate_metrics.get(self.metric)
        if val is None:
            return True
        try:
            val_f = float(val)
        except (ValueError, TypeError):
            return False

        if self.operator == ">=":
            return val_f >= self.threshold
        elif self.operator == "<=":
            return val_f <= self.threshold
        elif self.operator == ">":
            return val_f > self.threshold
        elif self.operator == "<":
            return val_f < self.threshold
        elif self.operator == "==":
            return abs(val_f - self.threshold) < 1e-5
        return True


@dataclass
class CandidateEvaluation:
    """An individual design candidate with parameter assignments, physical simulation metrics, and score."""
    candidate_id: str
    simulation_id: str
    status: str  # "COMPLETED" or "FAILED"
    engine_version: str
    weather_dataset: str
    parameters: Dict[str, Any]
    shelter_model: Dict[str, Any]
    metrics: Dict[str, Any]  # Real simulation metrics if COMPLETED, empty dict if FAILED
    objective_score: float = 0.0
    is_feasible: bool = True
    constraints: List[str] = field(default_factory=list)
    constraint_violations: List[str] = field(default_factory=list)
    rank: int = 0
    is_pareto_optimal: bool = False
    failure_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidate_id": self.candidate_id,
            "simulation_id": self.simulation_id,
            "status": self.status,
            "engine_version": self.engine_version,
            "weather_dataset": self.weather_dataset,
            "parameters": self.parameters,
            "shelter_model": self.shelter_model,
            "metrics": self.metrics,
            "objective_score": self.objective_score,
            "score": self.objective_score,
            "is_feasible": self.is_feasible,
            "constraints": self.constraints,
            "constraint_violations": self.constraint_violations,
            "rank": self.rank,
            "is_pareto_optimal": self.is_pareto_optimal,
            "failure_reason": self.failure_reason,
        }


@dataclass
class OptimizationRunMetadata:
    """Comprehensive execution and provenance metadata for the optimization run."""
    run_id: str
    timestamp: str
    algorithm: str
    objective: str
    base_project_id: str
    weather_dataset: str
    engine_version: str
    total_generated: int
    valid_count: int
    feasible_count: int
    failed_count: int
    execution_duration_seconds: float
    parameters_swept: List[str]
    constraints_enforced: List[Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ParameterSweepOptimizer:
    """Robust, deterministic parameter sweep optimization engine powered by EnergyPlus simulations."""

    # 1. Standard library of allowable discrete options for the 9 key parameters
    DEFAULT_SWEEP_OPTIONS = {
        "orientation": [0.0, 45.0, 90.0, 180.0],
        "insulation_thickness": [0.05, 0.10, 0.15, 0.20],
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
        "window_area": [1.4, 2.8, 4.2],  # Total window area m²
        "glazing_type": ["Single_Clear", "Double_LowE_Argon", "Triple_LowE_Krypton"],
        "window_placement": ["south_dominant", "east_west_distributed"],
        "thermal_mass": ["lightweight_timber", "medium_concrete_slab", "high_mass_rammed_earth_pcm"],
        "ventilation": [0.18, 0.35, 0.60],  # Infiltration ACH
    }

    @property
    def MATERIAL_PROPERTIES(self) -> Dict[str, Dict[str, Any]]:
        """Dynamic lookup backed exclusively by canonical material_db (Zero duplication)."""
        return {
            m.id: {
                "k": m.thermal_conductivity,
                "density": m.density,
                "c_p": m.specific_heat,
                "cost_m3": m.cost_per_m3 if m.cost_per_m3 is not None else 100.0,
            }
            for m in material_db.list_materials()
        }

    def __init__(
        self,
        base_model: Dict[str, Any],
        objective: str = "maximize_comfort",
        custom_parameter_options: Optional[Dict[str, List[Any]]] = None,
        constraints: Optional[List[OptimizationConstraint]] = None,
        weather_dataset: Optional[str] = None,
        weather_file_path: Optional[str] = None,
        executable_path: Optional[str] = None,
        run_period_days: int = 3,
    ):
        self.base_model = copy.deepcopy(base_model)
        self.objective = objective
        self.parameter_options = custom_parameter_options or self.DEFAULT_SWEEP_OPTIONS
        self.constraints = constraints or self._default_constraints()
        self.run_period_days = max(1, min(14, run_period_days))

        # Runner resolution
        self.runner = EnergyPlusRunner(custom_executable_path=executable_path)
        self.engine_version = self.runner.detected_version or "24.1.0"

        # Resolve weather file path from active project or canonical weather repository
        resolved_weather = self._resolve_weather_file(weather_file_path)
        self.weather_file_path = resolved_weather
        self.weather_dataset = (
            weather_dataset
            or self.base_model.get("location", {}).get("weather_source")
            or self.base_model.get("location", {}).get("region")
            or Path(resolved_weather).name
        )

    def _resolve_weather_file(self, explicit_path: Optional[str]) -> str:
        """Resolve valid EPW weather file from explicit input, base model, or authentic regional TMYx default."""
        if explicit_path and Path(explicit_path).is_file():
            return str(Path(explicit_path).resolve())

        # Check base model location
        loc = self.base_model.get("location", {})
        wf_name = loc.get("weather_file") or loc.get("weather_source")
        if wf_name:
            for cand_dir in [Path("."), Path("storage/weather"), Path("simulation/weather")]:
                cand = cand_dir / wf_name
                if cand.is_file():
                    return str(cand.resolve())

        # Priority 1: High-Altitude Authenticated Leh TMYx Dataset
        for default_name in [
            "IND_JK_Leh.427053_TMYx.epw",
            "IND_JK_Leh.420270_ISHRAE.epw",
        ]:
            for cand_dir in [Path("storage/weather"), Path("simulation/weather")]:
                cand = cand_dir / default_name
                if cand.is_file():
                    return str(cand.resolve())

        # Priority 2: Any non-test EPW in storage/weather or simulation/weather
        for cand_dir in [Path("storage/weather"), Path("simulation/weather")]:
            if cand_dir.exists():
                epws = [f for f in cand_dir.glob("*.epw") if "test" not in f.name.lower()]
                if epws:
                    return str(epws[0].resolve())

        # Priority 3: Fallback to existing EPW in simulation/weather
        cand_fallback = Path("simulation/weather/IND_JK_Leh.427053_TMYx.epw")
        if cand_fallback.is_file():
            return str(cand_fallback.resolve())

        return str(Path("simulation/weather/IND_JK_Leh.427053_TMYx.epw").resolve())


    def _default_constraints(self) -> List[OptimizationConstraint]:
        """Default engineering constraints for high-altitude cold-climate shelters."""
        # Derive target minimum temperature from project DesignTargets if defined
        comfort_def = parse_comfort_definition(self.base_model)
        target_min = comfort_def.min_acceptable_temperature_c if comfort_def else 8.0

        return [
            OptimizationConstraint(
                name="Survival Nocturnal Minimum Temperature",
                metric="indoor_min_c",
                operator=">=",
                threshold=-10.0,
                description="Zone air must sustain passive thermal barrier above -10°C under extreme sub-zero (-30°C) winter nights.",
            ),
            OptimizationConstraint(
                name="Maximum Allowable Wall Thickness",
                metric="total_wall_thickness_m",
                operator="<=",
                threshold=0.55,
                description="Envelope thickness cannot exceed 0.55m due to transport logistics and structural footprint.",
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
        valid_keys = [k for k in sweep_keys if k in self.parameter_options]

        option_lists = [self.parameter_options[k] for k in valid_keys]
        combinations = list(itertools.product(*option_lists))

        candidates = []
        for combo in combinations:
            param_dict = dict(zip(valid_keys, combo))
            candidates.append(param_dict)

        return candidates

    # -------------------------------------------------------------------------
    # STEP 2: Mutate & Validate Candidate ShelterModel
    # -------------------------------------------------------------------------
    def create_candidate_shelter_model(
        self,
        base_model: Dict[str, Any],
        param_dict: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Mutate base shelter model representation across all 9 optimization parameters."""
        model = copy.deepcopy(base_model)
        geom = model.setdefault("geometry", {})

        # 1. Orientation
        if "orientation" in param_dict:
            geom["orientation"] = float(param_dict["orientation"])

        # 2 & 3. Insulation thickness & Wall Construction
        ins_thickness = float(param_dict.get("insulation_thickness", 0.15))
        wall_type = param_dict.get("wall_construction", "Standard_EPS_Wall")

        if wall_type == "Aerogel_Blanket_SuperWall":
            wall_layers = [
                {"material": "mat-aerogel-blanket", "thickness": ins_thickness},
                {"material": "mat-rammed-earth", "thickness": 0.20},
                {"material": "mat-mud-plaster", "thickness": 0.02},
            ]
        elif wall_type == "Rammed_Earth_EPS_Composite":
            wall_layers = [
                {"material": "mat-eps-insulation", "thickness": ins_thickness},
                {"material": "mat-rammed-earth", "thickness": 0.30},
                {"material": "mat-mud-plaster", "thickness": 0.025},
            ]
        elif wall_type == "Granite_Stone_Masonry":
            wall_layers = [
                {"material": "mat-eps-insulation", "thickness": ins_thickness},
                {"material": "mat-granite-stone", "thickness": 0.35},
                {"material": "mat-mud-plaster", "thickness": 0.025},
            ]
        else:  # Standard_EPS_Wall
            wall_layers = [
                {"material": "mat-eps-insulation", "thickness": ins_thickness},
                {"material": "mat-mud-plaster", "thickness": 0.05},
            ]

        model.setdefault("envelope", {})["walls"] = {
            "id": f"wall-{wall_type.lower()}",
            "name": wall_type.replace("_", " "),
            "construction_id": f"wall-{wall_type.lower()}",
            "surface_type": "WALL",
            "solar_absorptance": 0.7,
            "layers": wall_layers,
        }

        # 4. Roof Construction
        roof_type = param_dict.get("roof_construction", "Insulated_Heavy_Metal_Roof")
        if roof_type == "Aerogel_Insulated_Pitched_Roof":
            roof_layers = [
                {"material": "mat-galvanized-steel", "thickness": 0.005},
                {"material": "mat-aerogel-blanket", "thickness": 0.05},
                {"material": "mat-himalayan-timber", "thickness": 0.02},
            ]
        elif roof_type == "Insulated_Heavy_Metal_Roof":
            roof_layers = [
                {"material": "mat-galvanized-steel", "thickness": 0.005},
                {"material": "mat-eps-insulation", "thickness": 0.12},
                {"material": "mat-himalayan-timber", "thickness": 0.02},
            ]
        else:  # Uninsulated_Sheet_Roof
            roof_layers = [
                {"material": "mat-galvanized-steel", "thickness": 0.005},
            ]

        model["envelope"]["roof"] = {
            "id": f"roof-{roof_type.lower()}",
            "name": roof_type.replace("_", " "),
            "construction_id": f"roof-{roof_type.lower()}",
            "surface_type": "ROOF",
            "solar_absorptance": 0.6,
            "layers": roof_layers,
        }

        # Ensure floor exists
        if "floor" not in model["envelope"]:
            model["envelope"]["floor"] = {
                "construction_id": "floor-concrete-slab",
                "surface_type": "FLOOR",
                "layers": [{"material": "mat-concrete-slab", "thickness": 0.15}],
                "ground_contact": True,
            }

        # 5, 6 & 7. Window Area, Glazing, & Window Placement
        length = float(geom.get("length", 6.0))
        width = float(geom.get("width", 4.0))
        height = float(geom.get("height", 2.8))

        win_area = float(param_dict.get("window_area", 2.8))
        glazing_key = str(param_dict.get("glazing_type") or param_dict.get("glazing") or "Double_LowE_Argon")
        glaze_def = glazing_db.get_glazing(glazing_key)
        placement = str(param_dict.get("window_placement", "south_dominant")).lower()

        windows: List[Dict[str, Any]] = []
        if placement == "south_dominant":
            h_win = min(1.5, max(0.6, height - 1.0))
            w_win = round(win_area / h_win, 2)
            max_w = length - 0.6
            if w_win > max_w:
                w_split = round(w_win / 2.0, 2)
                windows.append({
                    "id": "win-south-01",
                    "wall": "SOUTH",
                    "width": w_split,
                    "height": h_win,
                    "sill_height": 0.8,
                    "position_x": 0.3,
                    "glass_u_value": glaze_def.u_value,
                    "glass_shgc": glaze_def.shgc,
                    "glass_vlt": glaze_def.vlt,
                    "glazing_id": glaze_def.id,
                })
                windows.append({
                    "id": "win-south-02",
                    "wall": "SOUTH",
                    "width": w_split,
                    "height": h_win,
                    "sill_height": 0.8,
                    "position_x": round(length - w_split - 0.3, 2),
                    "glass_u_value": glaze_def.u_value,
                    "glass_shgc": glaze_def.shgc,
                    "glass_vlt": glaze_def.visible_transmittance,
                    "glazing_id": glaze_def.id,
                })
            else:
                pos_x = round(max(0.2, (length - w_win) / 2.0), 2)
                windows.append({
                    "id": "win-south-01",
                    "wall": "SOUTH",
                    "width": w_win,
                    "height": h_win,
                    "sill_height": 0.8,
                    "position_x": pos_x,
                    "glass_u_value": glaze_def.u_value,
                    "glass_shgc": glaze_def.shgc,
                    "glass_vlt": glaze_def.visible_transmittance,
                    "glazing_id": glaze_def.id,
                })
        else:  # East/West distributed
            half_area = win_area / 2.0
            h_win = min(1.2, max(0.6, height - 1.0))
            w_win = round(half_area / h_win, 2)
            pos_x = round(max(0.2, (width - w_win) / 2.0), 2)
            windows.append({
                "id": "win-east-01",
                "wall": "EAST",
                "width": w_win,
                "height": h_win,
                "sill_height": 0.8,
                "position_x": pos_x,
                "glass_u_value": glaze_def.u_value,
                "glass_shgc": glaze_def.shgc,
                "glass_vlt": glaze_def.visible_transmittance,
                "glazing_id": glaze_def.id,
            })
            windows.append({
                "id": "win-west-01",
                "wall": "WEST",
                "width": w_win,
                "height": h_win,
                "sill_height": 0.8,
                "position_x": pos_x,
                "glass_u_value": glaze_def.u_value,
                "glass_shgc": glaze_def.shgc,
                "glass_vlt": glaze_def.visible_transmittance,
                "glazing_id": glaze_def.id,
            })

        model["envelope"]["windows"] = windows
        model["windows"] = windows

        # 8. Thermal Mass
        mass_val = str(param_dict.get("thermal_mass", "medium_concrete_slab"))
        model["thermal_mass"] = mass_val
        model["thermalMass"] = mass_val

        # 9. Ventilation
        ach_val = float(param_dict.get("ventilation", 0.35))
        vent_dict = model.setdefault("ventilation", {})
        vent_dict["infiltrationACH"] = ach_val
        vent_dict["infiltration_ach"] = ach_val
        vent_dict["air_changes_per_hour"] = ach_val

        return model

    def validate_candidate(self, param_dict: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Verify physical, geometrical, and syntactic validity of candidate parameter combination."""
        if "orientation" in param_dict:
            ori = param_dict["orientation"]
            if ori < 0.0 or ori >= 360.0:
                return False, f"Orientation {ori}° out of bounds [0, 360)"

        if "insulation_thickness" in param_dict:
            t = param_dict["insulation_thickness"]
            if t <= 0.0 or t > 0.60:
                return False, f"Insulation thickness {t}m exceeds structural bounds (0, 0.60m]"

        geom = self.base_model.get("geometry", {})
        length = float(geom.get("length", 6.0))
        height = float(geom.get("height", 2.8))
        south_wall_area = length * height

        if "window_area" in param_dict:
            w_area = float(param_dict["window_area"])
            if w_area <= 0.0 or w_area >= (south_wall_area * 0.75):
                return False, f"Window area {w_area}m² exceeds structural allowance of wall ({south_wall_area}m²)"

        return True, None

    def validate_candidate_model(
        self,
        candidate_model: Dict[str, Any],
        param_dict: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        """Validate mutated candidate model through canonical opening, ventilation, and thermal mass validators."""
        is_p_valid, p_err = self.validate_candidate(param_dict)
        if not is_p_valid:
            return False, p_err

        geom = candidate_model.get("geometry", {})
        windows = candidate_model.get("envelope", {}).get("windows", [])
        doors = candidate_model.get("envelope", {}).get("doors", [])

        if windows or doors:
            is_open_valid, open_errors = OpeningValidator.validate_openings(windows, doors, geom)
            if not is_open_valid:
                return False, f"Opening validation error: {'; '.join(open_errors)}"

        is_vent_valid, vent_errors = VentilationValidator.validate_ventilation(candidate_model)
        if not is_vent_valid:
            return False, f"Ventilation validation error: {'; '.join(vent_errors)}"

        is_tm_valid, tm_errors = ThermalMassValidator.validate_thermal_mass(candidate_model)
        if not is_tm_valid:
            return False, f"Thermal mass validation error: {'; '.join(tm_errors)}"

        return True, None

    # -------------------------------------------------------------------------
    # STEP 3 & 4: EnergyPlus Model Generation, Simulation, & Output Parsing
    # -------------------------------------------------------------------------
    def evaluate_candidate_energyplus(
        self,
        candidate_model: Dict[str, Any],
        candidate_id: str,
        simulation_id: str,
        param_dict: Dict[str, Any],
    ) -> Tuple[str, Dict[str, Any], Optional[str]]:
        """Execute physical EnergyPlus simulation and extract normalized metrics.

        Returns (status, metrics, failure_reason).
        If EnergyPlus fails: returns ('FAILED', {}, reason). Zero fabricated metrics.
        """
        if not self.runner.is_available:
            return "FAILED", {}, "EnergyPlus executable not found or not available on host system."

        epw_path = Path(self.weather_file_path).resolve()
        if not epw_path.is_file():
            return "FAILED", {}, f"Weather file not found at: {self.weather_file_path}"

        temp_dir = tempfile.mkdtemp(prefix=f"opt_{candidate_id}_")
        try:
            engine = EnergyPlusEngine(executable_path=self.runner.executable_path)

            engine.prepare_model(
                shelter_model=candidate_model,
                weather_file_path=str(epw_path),
                output_dir=temp_dir,
                run_period_days=self.run_period_days,
            )

            res = engine.run_simulation(timeout_seconds=180)

            if not res.get("success", False) or res.get("status") == "FAILED":
                errs = res.get("errors", ["Simulation terminated prematurely with fatal or severe errors."])
                fail_msg = "; ".join(str(e) for e in errs[:3])
                return "FAILED", {}, fail_msg

            comfort = res.get("comfort", {})
            energy = res.get("energy", {})
            solar = res.get("solar", {})

            indoor_min_c = comfort.get("indoor_min_c")
            indoor_max_c = comfort.get("indoor_max_c")
            indoor_mean_c = comfort.get("indoor_mean_c")
            diurnal_swing_c = comfort.get("diurnal_temperature_swing_c")
            comfort_pct = float(comfort.get("percent_time_comfortable", 0.0))
            hours_inside = float(comfort.get("hours_inside_target", 0.0))
            hours_below = float(comfort.get("hours_below_target", 0.0))
            hours_above = float(comfort.get("hours_above_target", 0.0))

            env_losses = energy.get("envelope_losses_kwh", {})
            wall_loss = float(env_losses.get("wall", 0.0))
            roof_loss = float(env_losses.get("roof", 0.0))
            floor_loss = float(env_losses.get("floor", 0.0))
            win_loss = float(env_losses.get("window", 0.0))
            inf_loss = float(env_losses.get("infiltration", 0.0))
            total_loss_kwh = wall_loss + roof_loss + floor_loss + win_loss + inf_loss

            total_solar_gain_kwh = float(energy.get("total_solar_gains_kwh", 0.0))
            solar_ts = solar.get("solar_gains_total", [])
            peak_solar_gain_w = float(max(solar_ts)) if solar_ts else 0.0

            geom = candidate_model.get("geometry", {})
            floor_area = float(geom.get("length", 6.0)) * float(geom.get("width", 4.0))

            heating_kwh = energy.get("heating_demand_kwh")
            if heating_kwh is None:
                underheat_dh = float(comfort.get("underheating_degree_hours_c_h", 0.0))
                hours_sim = max(1.0, float(self.run_period_days * 24.0))
                avg_heat_loss_rate_w = (total_loss_kwh * 1000.0) / hours_sim
                heating_kwh = (avg_heat_loss_rate_w * underheat_dh) / 1000.0 if underheat_dh > 0 else 0.0

            heating_demand_kwh_m2 = float(heating_kwh) / max(1.0, floor_area)

            ins_th = float(param_dict.get("insulation_thickness", 0.15))
            wall_type = str(param_dict.get("wall_construction", "Standard_EPS_Wall"))
            mass_th = (
                0.20 if "Aerogel" in wall_type
                else (0.30 if "Rammed" in wall_type
                else (0.35 if "Granite" in wall_type else 0.05))
            )
            total_wall_thickness = round(ins_th + mass_th, 3)

            L = float(geom.get("length", 6.0))
            W = float(geom.get("width", 4.0))
            H = float(geom.get("height", 2.8))
            total_wall_area = 2 * (L * H) + 2 * (W * H)
            windows_list = candidate_model.get("envelope", {}).get("windows", [])
            win_area_sum = sum(float(w.get("width", 0)) * float(w.get("height", 0)) for w in windows_list)
            wwr = round((win_area_sum / max(1.0, total_wall_area)) * 100.0, 1)

            glazing_key = str(param_dict.get("glazing_type") or param_dict.get("glazing") or "Double_LowE_Argon")
            glaze_def = glazing_db.get_glazing(glazing_key)
            cost_glaze = win_area_sum * glaze_def.cost_per_m2
            cost_ins = (total_wall_area - win_area_sum) * ins_th * 120.0
            cost_mass = (total_wall_area - win_area_sum) * mass_th * 75.0
            cost_roof = (
                1500.0 if param_dict.get("roof_construction") == "Aerogel_Insulated_Pitched_Roof"
                else (750.0 if param_dict.get("roof_construction") == "Insulated_Heavy_Metal_Roof" else 300.0)
            )
            total_cost = cost_glaze + cost_ins + cost_mass + cost_roof

            sim_hours = max(1.0, self.run_period_days * 24.0)
            avg_indoor = indoor_mean_c if indoor_mean_c is not None else 10.0
            outdoor_mean = -10.0
            delta_t = max(2.0, abs(avg_indoor - outdoor_mean))
            ua_equiv = (total_loss_kwh * 1000.0) / (sim_hours * delta_t)

            metrics = {
                "indoor_min_c": round(indoor_min_c, 2) if indoor_min_c is not None else 0.0,
                "indoor_max_c": round(indoor_max_c, 2) if indoor_max_c is not None else 0.0,
                "indoor_mean_c": round(indoor_mean_c, 2) if indoor_mean_c is not None else 0.0,
                "diurnal_swing_c": round(diurnal_swing_c, 2) if diurnal_swing_c is not None else 0.0,
                "comfort_hours_pct": round(comfort_pct, 1),
                "hours_inside_target": round(hours_inside, 1),
                "hours_below_target": round(hours_below, 1),
                "hours_above_target": round(hours_above, 1),
                "total_solar_gain_kwh": round(total_solar_gain_kwh, 2),
                "peak_solar_gain_w": round(peak_solar_gain_w, 1),
                "total_heat_loss_kwh": round(total_loss_kwh, 2),
                "total_heat_loss_rate_ua": round(ua_equiv, 2),
                "peak_heat_loss_w": round(max(wall_loss, roof_loss, floor_loss, inf_loss) * 1000.0, 1),
                "heating_demand_kwh_m2": round(heating_demand_kwh_m2, 1),
                "total_wall_thickness_m": total_wall_thickness,
                "window_to_wall_ratio_pct": wwr,
                "material_cost_usd": round(total_cost, 0),
                "total_material_cost": round(total_cost, 0),
            }

            return "COMPLETED", metrics, None

        except Exception as e:
            return "FAILED", {}, f"Simulation exception: {str(e)}"
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # STEP 5: Calculate Objective Score
    # -------------------------------------------------------------------------
    def calculate_objective_score(self, metrics: Dict[str, Any]) -> float:
        """Formulate objective scoring function based on selected target."""
        if not metrics:
            return -999999.0

        obj = self.objective.lower()

        if obj == "maximize_comfort":
            score = float(metrics.get("comfort_hours_pct", 0.0)) * 1.0 + (float(metrics.get("indoor_min_c", 0.0)) - 10.0) * 2.0
            return round(score, 2)

        elif obj == "minimize_heat_loss":
            loss = float(metrics.get("total_heat_loss_rate_ua", metrics.get("total_heat_loss_kwh", 50.0)))
            score = max(0.0, 400.0 - loss * 2.5)
            return round(score, 2)

        elif obj == "minimize_auxiliary_energy":
            demand = float(metrics.get("heating_demand_kwh_m2", 50.0))
            score = max(0.0, 300.0 - demand * 1.5)
            return round(score, 2)

        elif obj == "maximize_useful_solar_gain":
            gain = float(metrics.get("total_solar_gain_kwh", 0.0))
            overheating_penalty = max(0.0, float(metrics.get("indoor_max_c", 0.0)) - 25.0) * 15.0
            score = gain * 3.0 - overheating_penalty
            return round(score, 2)

        elif obj == "minimize_material_cost":
            cost = float(metrics.get("material_cost_usd", 1000.0))
            demand = float(metrics.get("heating_demand_kwh_m2", 50.0))
            score = max(0.0, 1500.0 - (cost * 0.15 + demand * 2.5))
            return round(score, 2)

        else:
            score = (
                float(metrics.get("comfort_hours_pct", 0.0)) * 0.40
                + max(0.0, (200.0 - float(metrics.get("heating_demand_kwh_m2", 50.0))) * 0.35)
                + (float(metrics.get("indoor_min_c", 0.0)) + 10.0) * 2.0
            )
            return round(score, 2)

    # -------------------------------------------------------------------------
    # STEP 6: Enforce Constraints
    # -------------------------------------------------------------------------
    def enforce_constraints(self, metrics: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Verify candidate against all active hard constraints.

        Returns (is_feasible, violations).
        """
        if not metrics:
            return False, ["No simulation metrics available (Simulation Failed)"]

        violations = []
        is_feasible = True

        for c in self.constraints:
            passed = c.evaluate(metrics)
            if not passed:
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
        max_candidates: int = 25,
    ) -> Dict[str, Any]:
        """Execute the complete EnergyPlus-backed candidate evaluation optimization lifecycle."""
        start_time = datetime.now(timezone.utc)
        run_id = f"opt-sweep-{uuid.uuid4().hex[:8]}"

        safety_budget = max(2, min(100, max_candidates))

        # 1. Generate Candidates
        raw_candidates = self.generate_candidate_designs(parameters_to_sweep)
        if len(raw_candidates) > safety_budget:
            step = max(1, len(raw_candidates) // safety_budget)
            raw_candidates = raw_candidates[::step][:safety_budget]

        evaluated_candidates: List[CandidateEvaluation] = []
        valid_count = 0
        feasible_count = 0
        failed_count = 0

        def process_candidate(item: Tuple[int, Dict[str, Any]]) -> Tuple[CandidateEvaluation, bool, bool]:
            idx, params = item
            c_id = f"cand-{run_id[-4:]}-{idx + 1:03d}"
            sim_id = f"sim-{run_id[-4:]}-{idx + 1:03d}"

            # Step 2: Mutate base model into candidate ShelterModel
            candidate_model = self.create_candidate_shelter_model(self.base_model, params)
            is_valid, val_err = self.validate_candidate_model(candidate_model, params)

            if not is_valid:
                eval_fail = CandidateEvaluation(
                    candidate_id=c_id,
                    simulation_id=sim_id,
                    status="FAILED",
                    engine_version=self.engine_version,
                    weather_dataset=self.weather_dataset,
                    parameters=params,
                    shelter_model=candidate_model,
                    metrics={},  # Do not invent candidate metrics
                    objective_score=-999999.0,
                    is_feasible=False,
                    constraints=[],
                    constraint_violations=[val_err or "Geometric/syntactic validation failed"],
                    failure_reason=val_err,
                )
                return eval_fail, False, False

            # Step 3, 4, 5 & 6: Run EnergyPlus, Parse Results, Score, & Enforce Constraints
            status, metrics, fail_reason = self.evaluate_candidate_energyplus(
                candidate_model=candidate_model,
                candidate_id=c_id,
                simulation_id=sim_id,
                param_dict=params,
            )

            if status == "FAILED":
                eval_fail = CandidateEvaluation(
                    candidate_id=c_id,
                    simulation_id=sim_id,
                    status="FAILED",
                    engine_version=self.engine_version,
                    weather_dataset=self.weather_dataset,
                    parameters=params,
                    shelter_model=candidate_model,
                    metrics={},
                    objective_score=-999999.0,
                    is_feasible=False,
                    constraints=[],
                    constraint_violations=[fail_reason or "EnergyPlus simulation failed"],
                    failure_reason=fail_reason,
                )
                return eval_fail, False, True

            score = self.calculate_objective_score(metrics)
            is_feasible, violations = self.enforce_constraints(metrics)
            if not is_feasible:
                score -= 1000.0

            constraint_list = [f"{c.name}: {c.metric} {c.operator} {c.threshold}" for c in self.constraints]

            eval_success = CandidateEvaluation(
                candidate_id=c_id,
                simulation_id=sim_id,
                status="COMPLETED",
                engine_version=self.engine_version,
                weather_dataset=self.weather_dataset,
                parameters=params,
                shelter_model=candidate_model,
                metrics=metrics,
                objective_score=score,
                is_feasible=is_feasible,
                constraints=constraint_list,
                constraint_violations=violations,
                failure_reason=None,
            )
            return eval_success, is_feasible, True

        import os
        from concurrent.futures import ThreadPoolExecutor

        max_workers = min(os.cpu_count() or 4, 4)
        indexed_candidates = list(enumerate(raw_candidates))

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            candidate_results = list(executor.map(process_candidate, indexed_candidates))

        for evaluation, is_feasible, is_valid in candidate_results:
            if is_valid:
                valid_count += 1
            else:
                failed_count += 1
            if is_feasible:
                feasible_count += 1
            evaluated_candidates.append(evaluation)

        # Step 7: Rank Candidates
        # Feasible completed candidates first, then infeasible completed, then failed
        evaluated_candidates.sort(
            key=lambda c: (
                2 if (c.status == "COMPLETED" and c.is_feasible)
                else (1 if c.status == "COMPLETED" else 0),
                c.objective_score,
            ),
            reverse=True,
        )

        for rank_idx, cand in enumerate(evaluated_candidates):
            cand.rank = rank_idx + 1

        self._compute_pareto_frontier(evaluated_candidates)

        best_candidate = evaluated_candidates[0] if evaluated_candidates else None

        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()

        metadata = OptimizationRunMetadata(
            run_id=run_id,
            timestamp=start_time.isoformat(),
            algorithm="Deterministic Parameter Sweep (EnergyPlus Physical Simulation)",
            objective=self.objective,
            base_project_id=self.base_model.get("id", "base-shelter"),
            weather_dataset=self.weather_dataset,
            engine_version=self.engine_version,
            total_generated=len(raw_candidates),
            valid_count=valid_count,
            feasible_count=feasible_count,
            failed_count=failed_count,
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
        feasible = [c for c in candidates if c.status == "COMPLETED" and c.is_feasible and c.metrics]
        for c1 in feasible:
            dominated = False
            for c2 in feasible:
                if c1 == c2:
                    continue
                c1_comf = c1.metrics.get("comfort_hours_pct", 0.0)
                c2_comf = c2.metrics.get("comfort_hours_pct", 0.0)
                c1_heat = c1.metrics.get("heating_demand_kwh_m2", 999.0)
                c2_heat = c2.metrics.get("heating_demand_kwh_m2", 999.0)
                if (
                    c2_comf >= c1_comf
                    and c2_heat <= c1_heat
                    and (c2_comf > c1_comf or c2_heat < c1_heat)
                ):
                    dominated = True
                    break
            c1.is_pareto_optimal = not dominated

    # -------------------------------------------------------------------------
    # Auxiliary RC calculation (kept for standalone unit tests; not used in production)
    # -------------------------------------------------------------------------
    def evaluate_thermal_physics(self, param_dict: Dict[str, Any]) -> Dict[str, float]:
        """Auxiliary lumped RC approximation for fast unit testing. NOT used in production optimization."""
        geom = self.base_model.get("geometry", {})
        L = float(geom.get("length", 6.0))
        W = float(geom.get("width", 4.0))
        H = float(geom.get("height", 2.8))
        floor_area = L * W
        volume = floor_area * H

        orientation = float(param_dict.get("orientation", geom.get("orientation", 0.0)))
        solar_azimuth_efficiency = math.cos(math.radians(orientation))
        solar_factor = max(0.2, (solar_azimuth_efficiency + 1.0) / 2.0)

        ins_thickness = float(param_dict.get("insulation_thickness", 0.15))
        wall_construction = str(param_dict.get("wall_construction", "Standard_EPS_Wall"))

        if wall_construction == "Aerogel_Blanket_SuperWall":
            ins_mat = material_db.get("mat-aerogel-blanket")
            mass_mat = material_db.get("mat-rammed-earth")
            mass_thickness = 0.20
        elif wall_construction == "Rammed_Earth_EPS_Composite":
            ins_mat = material_db.get("mat-eps-insulation")
            mass_mat = material_db.get("mat-rammed-earth")
            mass_thickness = 0.30
        elif wall_construction == "Granite_Stone_Masonry":
            ins_mat = material_db.get("mat-eps-insulation")
            mass_mat = material_db.get("mat-granite-stone")
            mass_thickness = 0.35
        else:
            ins_mat = material_db.get("mat-eps-insulation")
            mass_mat = material_db.get("mat-mud-plaster") or material_db.get("mat-rammed-earth")
            mass_thickness = 0.05

        k_ins = ins_mat.thermal_conductivity if ins_mat else 0.035
        k_mass = mass_mat.thermal_conductivity if mass_mat else 1.25
        cost_ins_unit = ins_mat.cost_per_m3 if (ins_mat and ins_mat.cost_per_m3 is not None) else 120.0
        cost_mass_unit = mass_mat.cost_per_m3 if (mass_mat and mass_mat.cost_per_m3 is not None) else 60.0

        r_insulation = ins_thickness / k_ins
        r_mass = mass_thickness / k_mass
        r_surface_films = 0.17
        u_wall = 1.0 / (r_insulation + r_mass + r_surface_films)
        total_wall_thickness = ins_thickness + mass_thickness

        roof_construction = str(param_dict.get("roof_construction", "Insulated_Heavy_Metal_Roof"))
        if roof_construction == "Aerogel_Insulated_Pitched_Roof":
            u_roof = 0.14
        elif roof_construction == "Insulated_Heavy_Metal_Roof":
            u_roof = 0.22
        else:
            u_roof = 1.85

        glazing_key = str(param_dict.get("glazing_type") or param_dict.get("glazing") or "Double_LowE_Argon")
        glaze_def = glazing_db.get_glazing(glazing_key)
        u_window = glaze_def.u_value
        shgc = glaze_def.shgc
        cost_glazing = glaze_def.cost_per_m2

        win_area = float(param_dict.get("window_area", 2.8))
        win_placement = str(param_dict.get("window_placement", "south_dominant"))
        placement_bonus = 1.15 if win_placement == "south_dominant" else 0.85

        total_wall_area = 2 * (L * H) + 2 * (W * H)
        opaque_wall_area = total_wall_area - win_area
        wwr = (win_area / total_wall_area) * 100.0

        ach = float(param_dict.get("ventilation", 0.35))
        h_inf = 0.33 * ach * volume

        ua_walls = opaque_wall_area * u_wall
        ua_roof = floor_area * u_roof
        ua_floor = floor_area * 0.28
        ua_windows = win_area * u_window
        ua_total = ua_walls + ua_roof + ua_floor + ua_windows + h_inf

        mass_mode = str(param_dict.get("thermal_mass", "medium_concrete_slab"))
        if mass_mode == "high_mass_rammed_earth_pcm":
            damping_ratio = 88.0
        elif mass_mode == "medium_concrete_slab":
            damping_ratio = 76.0
        else:
            damping_ratio = 38.0

        loc = self.base_model.get("location", {})
        t_ambient_min = float(loc.get("winter_min_c", -15.0))
        t_ambient_mean = float(loc.get("winter_mean_c", -8.0))
        t_ambient_max = float(loc.get("winter_max_c", -2.0))
        solar_radiation_peak_wm2 = float(loc.get("peak_solar_wm2", 750.0))
        hdd_base = float(loc.get("heating_degree_days", 4500.0))

        internal_heat_w = 450.0
        transmitted_solar_kwh_day = (
            win_area * shgc * (solar_radiation_peak_wm2 / 1000.0) * 5.2 * solar_factor * placement_bonus
        )
        total_solar_gain_kwh_period = transmitted_solar_kwh_day * 3.0
        solar_avg_w = (transmitted_solar_kwh_day * 1000.0) / 24.0

        total_heat_w = internal_heat_w + solar_avg_w
        passive_delta_t = total_heat_w / max(18.0, ua_total)
        indoor_mean_c = t_ambient_mean + passive_delta_t

        diurnal_swing_c = (t_ambient_max - t_ambient_min) * (1.0 - damping_ratio / 100.0)
        indoor_min_c = indoor_mean_c - (diurnal_swing_c / 2.0)
        indoor_max_c = indoor_mean_c + (diurnal_swing_c / 2.0)

        comf_def = parse_comfort_definition(self.base_model)
        target_min = comf_def.min_acceptable_temperature_c if comf_def else 18.0
        target_max = comf_def.max_acceptable_temperature_c if comf_def else 24.0

        if indoor_min_c >= target_min and indoor_max_c <= target_max:
            comfort_pct = 100.0
        elif indoor_max_c < target_min:
            deficit = target_min - indoor_max_c
            comfort_pct = max(0.0, 75.0 - deficit * 8.0)
        elif indoor_min_c > target_max:
            excess = indoor_min_c - target_max
            comfort_pct = max(0.0, 75.0 - excess * 10.0)
        else:
            overlap = min(target_max, indoor_max_c) - max(target_min, indoor_min_c)
            span = max(1.0, indoor_max_c - indoor_min_c)
            comfort_pct = min(100.0, max(10.0, (overlap / span) * 100.0))

        heat_loss_annual_kwh = (ua_total * hdd_base * 24.0) / 1000.0
        useful_solar_offset_kwh = min(
            heat_loss_annual_kwh * 0.75,
            (transmitted_solar_kwh_day + internal_heat_w * 24.0 / 1000.0) * 180.0,
        )
        net_heating_kwh = max(0.0, heat_loss_annual_kwh - useful_solar_offset_kwh)
        heating_demand_kwh_m2 = net_heating_kwh / floor_area

        peak_heat_loss_w = ua_total * (target_min - t_ambient_min)
        peak_solar_gain_w = win_area * shgc * solar_radiation_peak_wm2 * solar_factor * placement_bonus

        wall_ins_volume = opaque_wall_area * ins_thickness
        wall_mass_volume = opaque_wall_area * mass_thickness
        cost_ins = wall_ins_volume * cost_ins_unit
        cost_mass = wall_mass_volume * cost_mass_unit
        cost_glazing_total = win_area * cost_glazing
        total_material_cost = cost_ins + cost_mass + cost_glazing_total + (
            1500.0 if roof_construction == "Aerogel_Insulated_Pitched_Roof" else 600.0
        )

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
            "total_material_cost": round(total_material_cost, 0),
        }
