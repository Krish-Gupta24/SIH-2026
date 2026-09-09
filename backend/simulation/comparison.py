"""
Multi-Design Comparison Engine for side-by-side thermal performance analysis.
Calculates absolute/percentage deltas, objective winner evaluations, and enforces
honest, conditional optimality statements ("Best according to [objective] under [constraints]").
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class MetricDifference:
    """Quantitative comparison between baseline and candidate values."""
    baseline_value: float
    candidate_value: float
    delta_absolute: float
    delta_percentage: float
    is_improvement: bool
    unit: str = ""


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


class MultiDesignComparator:
    """Evaluates and ranks multiple design versions across key physical indicators."""

    SUPPORTED_OBJECTIVES = {
        "passive_resilience": {
            "label": "Maximize Passive Nocturnal Resilience",
            "constraints": "Zero Active HVAC, -20°C Alpine Winter",
            "metric": "indoor_min_c",
            "higher_is_better": True,
        },
        "maximize_comfort": {
            "label": "Maximize Adaptive Comfort Band Hours",
            "constraints": "18°C–24°C Comfort Envelope per ASHRAE 55",
            "metric": "comfort_hours_pct",
            "higher_is_better": True,
        },
        "minimize_heat_loss": {
            "label": "Minimize Cumulative Envelope Heat Loss",
            "constraints": "Fixed Floor Area (30m²–50m²)",
            "metric": "envelope_heat_loss_kwh",
            "higher_is_better": False,
        },
        "maximize_solar_gain": {
            "label": "Maximize Useful Passive Solar Harvesting",
            "constraints": "Summer Overheating Ceiling <= 26°C",
            "metric": "solar_gains_kwh",
            "higher_is_better": True,
        },
    }

    @classmethod
    def calculate_delta(
        cls,
        baseline_val: float,
        candidate_val: float,
        higher_is_better: bool,
        unit: str = "",
    ) -> MetricDifference:
        """Compute absolute and percentage differences between designs."""
        delta_abs = round(candidate_val - baseline_val, 2)
        delta_pct = 0.0
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
        )

    @classmethod
    def compare_designs(
        cls,
        designs: List[Dict[str, Any]],
        objective_id: str = "passive_resilience",
        baseline_index: int = 0,
    ) -> MultiDesignComparisonResult:
        """
        Compare a list of design simulation results against a baseline.
        Enforces conditional winner statement:
        'Best according to [objective] under [constraints].'
        """
        if not designs or len(designs) < 2:
            raise ValueError("Comparison requires at least two design candidates.")

        obj_info = cls.SUPPORTED_OBJECTIVES.get(
            objective_id,
            cls.SUPPORTED_OBJECTIVES["passive_resilience"],
        )

        baseline = designs[baseline_index]
        baseline_id = baseline.get("id", f"design_{baseline_index}")
        baseline_name = baseline.get("name", f"Design {baseline_index + 1}")
        baseline_metrics = baseline.get("summary_metrics", {})

        metric_keys = [
            ("indoor_mean_c", "Mean Indoor Temperature", "°C", True),
            ("indoor_min_c", "Minimum Indoor Temperature", "°C", True),
            ("indoor_max_c", "Maximum Indoor Temperature", "°C", False),
            ("comfort_hours_pct", "Hours in Comfort Band", "%", True),
            ("solar_gains_kwh", "Total Solar Heat Gains", "kWh", True),
            ("envelope_heat_loss_kwh", "Cumulative Heat Loss", "kWh", False),
            ("diurnal_swing_c", "Diurnal Temperature Swing", "°C", False),
        ]

        table_rows = []
        for key, label, unit, higher_is_better in metric_keys:
            base_val = baseline_metrics.get(key, 0.0)
            row = {
                "metric_key": key,
                "label": label,
                "unit": unit,
                "baseline_value": base_val,
                "candidates": {},
            }
            for i, d in enumerate(designs):
                cand_id = d.get("id", f"design_{i}")
                cand_val = d.get("summary_metrics", {}).get(key, 0.0)
                diff = cls.calculate_delta(base_val, cand_val, higher_is_better, unit)
                row["candidates"][cand_id] = {
                    "value": cand_val,
                    "delta_absolute": diff.delta_absolute,
                    "delta_percentage": diff.delta_percentage,
                    "is_improvement": diff.is_improvement,
                }
            table_rows.append(row)

        # Evaluate winner according to specified objective
        target_metric = obj_info["metric"]
        higher_better = obj_info["higher_is_better"]

        best_score = float("-inf") if higher_better else float("inf")
        winner_id = baseline_id
        winner_name = baseline_name

        for d in designs:
            did = d.get("id", "unknown")
            dname = d.get("name", did)
            score = d.get("summary_metrics", {}).get(target_metric, 0.0)
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

        winner_statement = (
            f"Selected winner '{winner_name}' ({winner_id}) is best according to "
            f"'{obj_info['label']}' under '{obj_info['constraints']}'. "
            f"This designation is conditionally optimal for the evaluated parameters only, "
            f"and does not constitute universal physical optimality."
        )

        reproducibility = {
            "simulation_engine": baseline.get("engine", "EnergyPlus"),
            "engine_version": baseline.get("engine_version", "24.1.0"),
            "model_version": baseline.get("model_version", "1.0.0"),
            "weather_source": baseline.get("weather_source", "Leh ISHRAE EPW"),
            "simulation_period": baseline.get("simulation_period", "Winter 3-Day Peak Cold"),
            "evaluated_candidates_count": len(designs),
        }

        return MultiDesignComparisonResult(
            baseline_id=baseline_id,
            baseline_name=baseline_name,
            candidates=[{"id": d.get("id"), "name": d.get("name")} for d in designs],
            side_by_side_table=table_rows,
            objective_id=objective_id,
            objective_label=obj_info["label"],
            constraints=obj_info["constraints"],
            winner_id=winner_id,
            winner_name=winner_name,
            winner_statement=winner_statement,
            reproducibility=reproducibility,
        )
