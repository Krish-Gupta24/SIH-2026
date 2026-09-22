"""
Multi-Design Comparison Engine for side-by-side thermal performance analysis.

Operates strictly on completed SimulationResult objects (or serialized results of completed runs).
Calculates absolute and percentage deltas, enforces honest engine equivalence and weather consistency checks,
and enforces conditional optimality statements ("Best according to [objective] under [constraints]").
"""

from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, field, asdict

from simulation.results.result import SimulationResult


@dataclass
class MetricDifference:
    """Quantitative comparison between baseline and candidate values."""
    baseline_value: Optional[float] = None
    candidate_value: Optional[float] = None
    delta_absolute: Optional[float] = None
    delta_percentage: Optional[float] = None
    is_improvement: Optional[bool] = None
    unit: str = ""
    status: str = "COMPLETED"
    display_value: Optional[str] = None
    reason: Optional[str] = None


@dataclass
class DesignComparisonMetadata:
    """Standardized metadata record for a compared design."""
    design_id: str
    design_name: str
    simulation_id: str
    weather_dataset: str
    engine_name: str
    engine_version: str
    simulation_period: str
    is_rc_approximation: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class MultiDesignComparisonResult:
    """Comprehensive comparison analysis between multiple simulation designs."""
    baseline_id: str
    baseline_name: str
    candidates: List[Dict[str, Any]]
    side_by_side_table: List[Dict[str, Any]]
    objective_id: str
    objective_label: str
    constraints: str
    winner_id: str
    winner_name: str
    winner_statement: str
    reproducibility: Dict[str, Any]
    same_weather: bool = True
    weather_warning: Optional[str] = None
    same_engine: bool = True
    engine_warning: Optional[str] = None
    metadata_summary: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class MultiDesignComparator:
    """Evaluates and ranks multiple design versions across key physical indicators."""

    SUPPORTED_OBJECTIVES = {
        "passive_resilience": {
            "label": "Maximize Passive Nocturnal Resilience",
            "constraints": "Zero Active HVAC, Alpine Sub-Zero Ambient",
            "metric": "indoor_min_c",
            "higher_is_better": True,
        },
        "maximize_comfort": {
            "label": "Maximize Living Zone Comfort Hours",
            "constraints": "18°C–24°C Comfort Envelope",
            "metric": "comfort_hours_pct",
            "higher_is_better": True,
        },
        "minimize_heat_loss": {
            "label": "Minimize Cumulative Envelope Heat Loss",
            "constraints": "Fixed Envelope Boundary",
            "metric": "envelope_heat_loss_kwh",
            "higher_is_better": False,
        },
        "maximize_solar_gain": {
            "label": "Maximize Useful Passive Solar Harvesting",
            "constraints": "Summer Overheating Ceiling <= 26°C",
            "metric": "solar_gains_kwh",
            "higher_is_better": True,
        },
        "minimize_energy": {
            "label": "Minimize Space Heating Energy Demand",
            "constraints": "Target Living Zone Comfort Standards",
            "metric": "heating_demand_kwh_m2",
            "higher_is_better": False,
        },
    }

    @classmethod
    def calculate_delta(
        cls,
        baseline_val: Optional[float],
        candidate_val: Optional[float],
        higher_is_better: bool,
        unit: str = "",
    ) -> MetricDifference:
        """
        Compute absolute and percentage differences between designs.
        Guards against division-by-zero: delta_percentage is None when baseline_val == 0.
        """
        if baseline_val is None or candidate_val is None:
            missing_party = "Baseline" if baseline_val is None else "Candidate"
            if baseline_val is None and candidate_val is None:
                missing_party = "Both baseline and candidate"
            return MetricDifference(
                baseline_value=baseline_val,
                candidate_value=candidate_val,
                delta_absolute=None,
                delta_percentage=None,
                is_improvement=None,
                unit=unit,
                status="UNAVAILABLE",
                display_value="Metric unavailable from this simulation",
                reason=f"{missing_party} metric was not provided by simulation results",
            )

        delta_abs = round(candidate_val - baseline_val, 2)
        delta_pct: Optional[float] = None
        if abs(baseline_val) > 1e-4:
            delta_pct = round(((candidate_val - baseline_val) / abs(baseline_val)) * 100, 1)

        is_improvement = (delta_abs > 0) if higher_is_better else (delta_abs < 0)

        return MetricDifference(
            baseline_value=baseline_val,
            candidate_value=candidate_val,
            delta_absolute=delta_abs,
            delta_percentage=delta_pct,
            is_improvement=is_improvement,
            unit=unit,
            status="COMPLETED",
            display_value=f"{candidate_val} {unit}".strip(),
        )

    @classmethod
    def _normalize_design_entry(cls, d: Union[SimulationResult, Dict[str, Any]], index: int) -> Dict[str, Any]:
        """Convert a SimulationResult object or result dictionary into a standard comparison record."""
        if isinstance(d, SimulationResult):
            meta = d.metadata
            period_dict = meta.simulation_period if isinstance(meta.simulation_period, dict) else {}
            period_str = f"{period_dict.get('run_period_days', period_dict.get('timesteps_count', 'N/A'))} days" if period_dict else "Run Period"
            
            # Extract metrics from SimulationResult
            indoor_mean = round(sum(d.indoor_temperature) / max(1, len(d.indoor_temperature)), 1) if d.indoor_temperature else None
            indoor_min = round(min(d.indoor_temperature), 1) if d.indoor_temperature else None
            indoor_max = round(max(d.indoor_temperature), 1) if d.indoor_temperature else None
            comfort_pct = d.comfort.percent_time_comfortable if d.comfort else None
            if comfort_pct is None and d.comfort and d.comfort.hours_inside_target is not None and len(d.timestamps) > 0:
                comfort_pct = round((d.comfort.hours_inside_target / len(d.timestamps)) * 100.0, 1)

            solar_kwh = round(d.solar.useful_solar_gain_total_kwh, 1) if d.solar else None
            if (solar_kwh is None or solar_kwh == 0.0) and d.solar_gains:
                solar_kwh = round(sum(d.solar_gains) / 1000.0, 1)

            # Cumulative heat loss
            heat_loss_kwh = None
            if d.envelope and d.envelope.wall_heat_transfer:
                total_loss_w = sum(abs(v) for v in d.envelope.wall_heat_transfer if v < 0)
                if d.envelope.roof_heat_transfer:
                    total_loss_w += sum(abs(v) for v in d.envelope.roof_heat_transfer if v < 0)
                if d.envelope.window_heat_transfer:
                    total_loss_w += sum(abs(v) for v in d.envelope.window_heat_transfer if v < 0)
                heat_loss_kwh = round(total_loss_w / 1000.0, 1)
            elif d.energy and d.energy.envelope_losses_kwh:
                heat_loss_kwh = round(sum(d.energy.envelope_losses_kwh.values()), 1)

            heating_kwh = d.energy.heating_demand_kwh if d.energy else None

            sim_id = meta.simulation_id or f"sim-{index:03d}"
            d_name = meta.design_name or f"Design {index + 1}"
            engine_str = meta.engine_name
            engine_ver = meta.engine_version
            weather_str = meta.weather_dataset

            return {
                "id": sim_id,
                "name": d_name,
                "simulation_id": sim_id,
                "design": d_name,
                "weather": weather_str,
                "engine": f"{engine_str} {engine_ver}".strip(),
                "engine_name": engine_str,
                "engine_version": engine_ver,
                "period": period_str,
                "is_rc_approximation": "rc" in engine_str.lower(),
                "summary_metrics": {
                    "indoor_mean_c": indoor_mean,
                    "indoor_min_c": indoor_min,
                    "indoor_max_c": indoor_max,
                    "comfort_hours_pct": comfort_pct,
                    "solar_gains_kwh": solar_kwh,
                    "envelope_heat_loss_kwh": heat_loss_kwh,
                    "heating_demand_kwh_m2": heating_kwh,
                    "heating_demand_kwh": heating_kwh,
                }
            }

        # Dict input handling
        d_dict = dict(d)
        sim_id = d_dict.get("simulation_id", d_dict.get("id", f"design_{index}"))
        d_name = d_dict.get("design_name", d_dict.get("name", f"Design {index + 1}"))
        weather_str = d_dict.get("weather_dataset", d_dict.get("weather", d_dict.get("weather_source", "Unknown Weather")))
        engine_str = d_dict.get("engine_name", d_dict.get("engine", "ThermoShelter Core"))
        if engine_str == "EnergyPlus":
            engine_str = "ThermoShelter Core"
        engine_ver = d_dict.get("engine_version", "3.0.0")
        period_str = str(d_dict.get("period", d_dict.get("simulation_period", "Run Period")))

        # Extract nested summary metrics
        metrics = d_dict.get("summary_metrics", d_dict.get("metrics", {}))
        if "results" in d_dict and isinstance(d_dict["results"], dict) and "summary" in d_dict["results"]:
            s = d_dict["results"]["summary"]
            metrics = {
                "indoor_mean_c": s.get("indoorMeanC", metrics.get("indoor_mean_c")),
                "indoor_min_c": s.get("indoorMinC", metrics.get("indoor_min_c")),
                "indoor_max_c": s.get("indoorMaxC", metrics.get("indoor_max_c")),
                "comfort_hours_pct": s.get("comfortHoursPct", metrics.get("comfort_hours_pct")),
                "solar_gains_kwh": s.get("totalSolarGainKwh", metrics.get("solar_gains_kwh")),
                "envelope_heat_loss_kwh": s.get("peakEnvelopeLossW", metrics.get("envelope_heat_loss_kwh")),
                "heating_demand_kwh_m2": s.get("heatingDemandKwhM2", metrics.get("heating_demand_kwh_m2")),
            }

        is_rc = "rc" in str(engine_str).lower() or d_dict.get("is_rc_approximation", False)

        return {
            "id": sim_id,
            "name": d_name,
            "simulation_id": sim_id,
            "design": d_name,
            "weather": weather_str,
            "engine": f"{engine_str} {engine_ver}".strip() if engine_ver not in str(engine_str) else str(engine_str),
            "engine_name": str(engine_str),
            "engine_version": str(engine_ver),
            "period": period_str,
            "is_rc_approximation": is_rc,
            "summary_metrics": metrics,
        }

    @classmethod
    def compare_designs(
        cls,
        designs: List[Union[SimulationResult, Dict[str, Any]]],
        objective_id: str = "passive_resilience",
        baseline_index: int = 0,
    ) -> MultiDesignComparisonResult:
        """
        Compare a list of design simulation results against a baseline.
        Shows all 12 mandatory items:
        1. Design, 2. Simulation ID, 3. Weather, 4. Engine, 5. Period,
        6. Average indoor temp, 7. Minimum temp, 8. Maximum temp,
        9. Comfort, 10. Solar gain, 11. Heat loss, 12. Energy.
        """
        if not designs or len(designs) < 2:
            raise ValueError("Comparison requires at least two design candidates.")

        normalized_designs = [cls._normalize_design_entry(d, i) for i, d in enumerate(designs)]

        obj_info = cls.SUPPORTED_OBJECTIVES.get(
            objective_id,
            cls.SUPPORTED_OBJECTIVES["passive_resilience"],
        )

        baseline = normalized_designs[baseline_index]
        baseline_id = baseline["id"]
        baseline_name = baseline["name"]
        baseline_metrics = baseline.get("summary_metrics", {})

        # --- 1. Weather Parity Check ---
        weather_sources = list({d["weather"] for d in normalized_designs if d.get("weather")})
        same_weather = len(weather_sources) <= 1
        weather_warning = None
        if not same_weather:
            weather_warning = (
                f"Different weather datasets used across candidates ({', '.join(weather_sources)}). "
                "Direct thermal comparison is influenced by differing ambient solar and temperature boundary conditions."
            )

        # --- 2. Engine Equivalence Check ---
        engines = list({d["engine_name"] for d in normalized_designs if d.get("engine_name")})
        has_rc = any(d.get("is_rc_approximation", False) for d in normalized_designs)
        has_ep = any("energyplus" in d.get("engine_name", "").lower() for d in normalized_designs)
        same_engine = len(engines) <= 1 and not (has_rc and has_ep)
        engine_warning = None
        if not same_engine or (has_rc and has_ep):
            engine_warning = (
                "Comparing disparate simulation engines (e.g. ThermoShelter Core physical simulation vs RC approximation). "
                "Results are NOT directly equivalent due to differing thermodynamic modeling fidelities."
            )

        # --- 3. Build Side-By-Side Performance Table ---
        metric_keys = [
            ("indoor_mean_c", "Average Indoor Temperature", "°C", True),
            ("indoor_min_c", "Minimum Temperature (Pre-Dawn)", "°C", True),
            ("indoor_max_c", "Maximum Temperature (Peak Sun)", "°C", False),
            ("comfort_hours_pct", "Comfort Hours in Target Band", "%", True),
            ("solar_gains_kwh", "Solar Gain Harvest", "kWh", True),
            ("envelope_heat_loss_kwh", "Envelope Heat Loss", "kWh", False),
            ("heating_demand_kwh_m2", "Heating Energy Demand", "kWh/m²", False),
        ]

        table_rows = []
        for key, label, unit, higher_is_better in metric_keys:
            base_val = baseline_metrics.get(key)
            row = {
                "metric_key": key,
                "label": label,
                "unit": unit,
                "baseline_value": base_val,
                "baseline_status": "COMPLETED" if base_val is not None else "UNAVAILABLE",
                "baseline_display_value": f"{base_val} {unit}".strip() if base_val is not None else "Metric unavailable from this simulation",
                "candidates": {},
            }
            for d in normalized_designs:
                cand_id = d["id"]
                cand_val = d.get("summary_metrics", {}).get(key)
                diff = cls.calculate_delta(base_val, cand_val, higher_is_better, unit)
                row["candidates"][cand_id] = {
                    "value": cand_val,
                    "status": diff.status,
                    "display_value": diff.display_value,
                    "reason": diff.reason,
                    "delta_absolute": diff.delta_absolute,
                    "delta_percentage": diff.delta_percentage,
                    "is_improvement": diff.is_improvement,
                }
            table_rows.append(row)

        # --- 4. Evaluate Objective Winner ---
        target_metric = obj_info["metric"]
        higher_better = obj_info["higher_is_better"]

        best_score = float("-inf") if higher_better else float("inf")
        winner_id = baseline_id
        winner_name = baseline_name
        valid_winner_found = False

        for d in normalized_designs:
            did = d["id"]
            dname = d["name"]
            score = d.get("summary_metrics", {}).get(target_metric)
            if score is None:
                continue
            valid_winner_found = True
            if higher_better:
                if score > best_score:
                    best_score = score
                    winner_id = did
                    winner_name = dname
            else:
                if score < best_score:
                    best_score = score
                    winner_id = did
                    winner_name = dname

        if not valid_winner_found:
            winner_statement = (
                f"Objective metric '{obj_info['label']}' is unavailable from candidate simulations. "
                f"No comparative ranking could be established."
            )
        else:
            winner_statement = (
                f"Selected winner '{winner_name}' ({winner_id}) is best according to "
                f"'{obj_info['label']}' under '{obj_info['constraints']}'. "
                f"This designation is conditionally optimal for the evaluated parameters only, "
                f"and does not constitute universal physical optimality."
            )

        metadata_summary = [
            {
                "design": d["name"],
                "simulation_id": d["id"],
                "weather": d["weather"],
                "engine": d["engine"],
                "period": d["period"],
                "is_rc_approximation": d["is_rc_approximation"],
            }
            for d in normalized_designs
        ]

        reproducibility = {
            "simulation_engine": baseline["engine"],
            "weather_source": baseline["weather"],
            "simulation_period": baseline["period"],
            "evaluated_candidates_count": len(normalized_designs),
            "same_weather": same_weather,
            "same_engine": same_engine,
        }

        return MultiDesignComparisonResult(
            baseline_id=baseline_id,
            baseline_name=baseline_name,
            candidates=[{"id": d["id"], "name": d["name"]} for d in normalized_designs],
            side_by_side_table=table_rows,
            objective_id=objective_id,
            objective_label=obj_info["label"],
            constraints=obj_info["constraints"],
            winner_id=winner_id,
            winner_name=winner_name,
            winner_statement=winner_statement,
            reproducibility=reproducibility,
            same_weather=same_weather,
            weather_warning=weather_warning,
            same_engine=same_engine,
            engine_warning=engine_warning,
            metadata_summary=metadata_summary,
        )
