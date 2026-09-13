"""Data quality assurance and verification for EnergyPlus simulation outputs.

Guarantees that only mathematically and physically valid simulation pairs
are admitted into versioned datasets for surrogate ML training.
"""

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd


@dataclass
class QualityCheckResult:
    is_valid: bool
    rejection_reasons: List[str]
    cleaned_metrics: Optional[Dict[str, float]] = None


class EnergyPlusQualityGate:
    """Validates raw simulation outputs before admission to dataset."""

    @classmethod
    def validate_simulation_result(
        cls,
        sim_result: Any,
        is_winter_period: bool = True,
    ) -> QualityCheckResult:
        """Audits normalized simulation result object or dictionary.

        Checks:
        - Returncode / execution success
        - Severe / fatal error count
        - Physical feasibility of thermal targets
        """
        reasons: List[str] = []

        # 1. Success verification
        success = getattr(sim_result, "success", None)
        if success is None and isinstance(sim_result, dict):
            success = sim_result.get("success", False)

        if not success:
            err = getattr(sim_result, "error", None) or (sim_result.get("error") if isinstance(sim_result, dict) else "Unknown error")
            return QualityCheckResult(is_valid=False, rejection_reasons=[f"Simulation execution failed: {err}"])

        # 2. Extract metrics from normalized_results or summary
        if isinstance(sim_result, dict):
            # Check thermal_performance hierarchy
            tp = sim_result.get("thermal_performance", {})
            indoor_t = tp.get("indoor_temperature", {})
            comf = tp.get("comfort", {})
            energy = sim_result.get("energy", {})

            t_min = indoor_t.get("min_c", sim_result.get("summary", {}).get("min_temperature"))
            t_mean = indoor_t.get("mean_c", sim_result.get("summary", {}).get("mean_temperature"))
            heating = energy.get("heating_demand_kwh_m2", energy.get("total_heating_kwh_m2", sim_result.get("summary", {}).get("heating_demand_kwh_m2", 0.0)))
            comfort = comf.get("percent_time_comfortable", sim_result.get("summary", {}).get("comfort_hours_pct", 0.0))
        elif hasattr(sim_result, "comfort"):
            t_min = getattr(sim_result.comfort, "indoor_min_c", None)
            t_mean = getattr(sim_result.comfort, "indoor_mean_c", None)
            comfort = getattr(sim_result.comfort, "percent_time_comfortable", 0.0)
            energy = getattr(sim_result, "energy", None)
            heating = getattr(energy, "heating_demand_kwh_m2", 0.0) if energy else 0.0
        else:
            t_min = None
            t_mean = None
            heating = 0.0
        # Check indoor minimum temperature bounds
        if t_min is None:
            reasons.append("Missing indoor minimum temperature metric")
        elif not (-55.0 <= float(t_min) <= 45.0):
            reasons.append(f"Indoor min temperature ({t_min}°C) outside physical bounds [-55, 45]")

        # Check indoor mean temperature bounds
        if t_mean is None:
            reasons.append("Missing indoor mean temperature metric")
        elif not (-45.0 <= float(t_mean) <= 50.0):
            reasons.append(f"Indoor mean temperature ({t_mean}°C) outside physical bounds [-45, 50]")

        if heating is not None:
            try:
                h_val = float(heating)
                if h_val < 0.0 or h_val > 5000.0 or np.isnan(h_val) or np.isinf(h_val):
                    reasons.append(f"Heating demand ({h_val} kWh/m2) outside physical bounds [0, 5000]")
            except (ValueError, TypeError):
                reasons.append(f"Invalid heating demand value: {heating}")

        # Comfort percentage (0 - 100)
        if comfort is not None:
            try:
                c_val = float(comfort)
                if c_val < 0.0 or c_val > 100.0 or np.isnan(c_val) or np.isinf(c_val):
                    reasons.append(f"Comfort hours percentage ({c_val}%) outside [0, 100]")
            except (ValueError, TypeError):
                reasons.append(f"Invalid comfort percentage value: {comfort}")

        is_valid = len(reasons) == 0

        cleaned = None
        if is_valid:
            if is_winter_period:
                cleaned = {
                    "winter_indoor_min_c": round(float(t_min), 2),
                    "winter_indoor_mean_c": round(float(t_mean), 2),
                    "winter_heating_demand_kwh_m2": round(float(heating), 2) if heating is not None else 0.0,
                    "winter_comfort_hours_pct": round(float(comfort), 2) if comfort is not None else 0.0,
                }
            else:
                cleaned = {
                    "annual_heating_demand_kwh_m2": round(float(heating), 2) if heating is not None else 0.0,
                    "annual_comfort_hours_pct": round(float(comfort), 2) if comfort is not None else 0.0,
                    "indoor_min_c": round(float(t_min), 2),
                    "indoor_mean_c": round(float(t_mean), 2),
                }

        return QualityCheckResult(
            is_valid=is_valid,
            rejection_reasons=reasons,
            cleaned_metrics=cleaned,
        )


class DatasetQualityAuditor:
    """Generates a comprehensive statistical and quality report on a DataFrame dataset."""

    @classmethod
    def audit_dataset(cls, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculates dataset health, missing values, duplicates, and feature distributions."""
        total_rows = len(df)
        if total_rows == 0:
            return {"total_rows": 0, "status": "EMPTY"}

        # 1. Null / NaN counts
        null_counts = df.isnull().sum().to_dict()
        has_nulls = any(v > 0 for v in null_counts.values())

        # 2. Duplicate detection
        duplicate_rows = int(df.duplicated(subset=["length", "width", "height", "orientation", "weather_id"]).sum()) if "weather_id" in df.columns else 0

        # 3. Categorical distribution counts
        cat_counts = {}
        for col in ["wall_construction", "roof_construction", "glazing_type", "thermal_mass_type", "weather_id"]:
            if col in df.columns:
                cat_counts[col] = df[col].value_counts().to_dict()

        # 4. Target distribution summaries
        target_stats = {}
        target_cols = [c for c in df.columns if any(k in c for k in ("indoor_", "heating_", "comfort_", "heat_loss_"))]
        for t_col in target_cols:
            series = pd.to_numeric(df[t_col], errors="coerce").dropna()
            if not series.empty:
                target_stats[t_col] = {
                    "count": int(series.count()),
                    "mean": round(float(series.mean()), 3),
                    "std": round(float(series.std()), 3),
                    "min": round(float(series.min()), 3),
                    "p25": round(float(series.quantile(0.25)), 3),
                    "median": round(float(series.median()), 3),
                    "p75": round(float(series.quantile(0.75)), 3),
                    "max": round(float(series.max()), 3),
                }

        return {
            "total_rows": total_rows,
            "has_nulls": has_nulls,
            "null_counts": {k: int(v) for k, v in null_counts.items() if v > 0},
            "duplicate_rows": duplicate_rows,
            "categorical_distribution": cat_counts,
            "target_statistics": target_stats,
            "status": "HEALTHY" if not has_nulls and duplicate_rows == 0 else "WARNINGS_DETECTED",
        }
