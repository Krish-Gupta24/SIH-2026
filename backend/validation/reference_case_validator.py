"""
Reference-Case Validation Engine for High-Altitude Shelter Simulations.

Implements the 5-stage validation pipeline:
1. Reference Data Ingestion (CSV / tabular logger files)
2. Timestamp Mapping (monotonic datetime normalization)
3. Unit Alignment (Celsius, Watts, Wh/m², Pascals)
4. Timezone Alignment (local standard time vs UTC)
5. Statistical Error Evaluation (MAE, RMSE, MBE, R² only when variance > 0)

Strict Zero-Fabrication Policy:
- If no reference data exists, NEVER manufacture synthetic accuracy metrics.
- Returns status "NOT_PROVIDED" with message "Validation data not provided."
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime, timezone
import math
import io
import re
import pandas as pd


@dataclass
class AlignedObservation:
    """A single aligned timestep comparing simulated vs measured reference value."""
    timestamp: str
    simulated_value: float
    reference_value: float
    residual: float               # reference - simulated
    absolute_error: float         # |reference - simulated|
    squared_error: float          # (reference - simulated)^2


@dataclass
class ValidationMetrics:
    """Rigorous statistical error metrics calculated against empirical reference data."""
    sample_count: int
    mae: float                    # Mean Absolute Error
    rmse: float                   # Root Mean Square Error
    mbe: Optional[float] = None   # Mean Bias Error (where appropriate)
    r_squared: Optional[float] = None  # R² (only where reference variance > 0)
    metric_name: str = "Temperature"
    unit: str = "°C"
    reference_mean: float = 0.0
    simulated_mean: float = 0.0
    max_absolute_error: float = 0.0
    min_absolute_error: float = 0.0
    r_squared_applicable: bool = True
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ReferenceValidationResult:
    """Comprehensive validation result comparing simulation outputs to empirical reference logs."""
    status: str                   # "COMPLETED", "NOT_PROVIDED", "INSUFFICIENT_DATA", "ERROR"
    message: str
    reference_data_available: bool
    metric_name: str = "indoor_temperature"
    unit: str = "°C"
    metrics: Optional[ValidationMetrics] = None
    aligned_series: List[AlignedObservation] = field(default_factory=list)
    dataset_metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        return d


class ReferenceCaseValidator:
    """
    Validates building thermal simulation outputs against empirical reference data.
    Enforces honest engineering: refuses to generate synthetic accuracy metrics when
    reference data is missing.
    """

    SUPPORTED_METRICS = {
        "indoor_temperature": {
            "label": "Zone Indoor Temperature",
            "unit": "°C",
            "aliases": ["indoor_temp", "t_indoor", "tint", "zone_temp", "indoor_temperature_c", "dry_bulb_indoor", "indoor_temp_c"],
            "mbe_appropriate": True,
        },
        "outdoor_temperature": {
            "label": "Ambient Outdoor Temperature",
            "unit": "°C",
            "aliases": ["outdoor_temp", "t_outdoor", "text", "dry_bulb", "outdoor_temp_c", "ambient_temp", "tout"],
            "mbe_appropriate": True,
        },
        "solar_radiation": {
            "label": "Global / Direct Solar Radiation",
            "unit": "W/m²",
            "aliases": ["ghi", "dni", "solar", "solar_radiation_wm2", "pyranometer", "solar_flux", "irradiance"],
            "mbe_appropriate": True,
        },
        "heat_flux": {
            "label": "Envelope Surface Heat Flux",
            "unit": "W/m²",
            "aliases": ["heat_flux", "heatflux", "q_flux", "flux_wm2", "envelope_flux"],
            "mbe_appropriate": True,
        },
    }

    @classmethod
    def ingest_reference_csv(
        cls,
        csv_content: Union[str, bytes],
        target_metric: str = "indoor_temperature",
        source_unit: Optional[str] = None,
        source_tz_offset_hours: float = 5.5,  # Default Indian Standard Time (UTC+5.5) for Ladakh
        target_tz_offset_hours: float = 5.5,
    ) -> Tuple[List[datetime], List[float], Dict[str, Any]]:
        """
        Parse raw CSV reference logger stream, map timestamps, align units, and shift timezones.
        """
        if isinstance(csv_content, bytes):
            csv_text = csv_content.decode("utf-8", errors="replace")
        else:
            csv_text = str(csv_content)

        if not csv_text.strip():
            raise ValueError("Provided reference CSV content is empty.")

        df = pd.read_csv(io.StringIO(csv_text))
        if df.empty:
            raise ValueError("Reference CSV contains no data rows.")

        # Normalize column names
        df.columns = [c.strip().lower() for c in df.columns]

        # 1. Identify Timestamp Column
        time_col = None
        for col in ["timestamp", "datetime", "date_time", "time", "date", "ts", "epoch"]:
            if col in df.columns:
                time_col = col
                break

        if not time_col:
            # Check for multi-column dates (year, month, day, hour)
            if all(k in df.columns for k in ["year", "month", "day", "hour"]):
                minute = df["minute"] if "minute" in df.columns else 0
                df["timestamp"] = pd.to_datetime({
                    "year": df["year"],
                    "month": df["month"],
                    "day": df["day"],
                    "hour": df["hour"],
                    "minute": minute,
                })
                time_col = "timestamp"
            else:
                raise ValueError(
                    f"Could not identify a timestamp column in reference CSV. Found columns: {list(df.columns)}"
                )

        # Parse timestamps into datetime objects
        parsed_times = pd.to_datetime(df[time_col], errors="coerce")
        valid_time_mask = ~parsed_times.isna()
        df = df[valid_time_mask].copy()
        parsed_times = parsed_times[valid_time_mask]

        if len(df) == 0:
            raise ValueError("All timestamp rows failed to parse in reference CSV.")

        # 2. Timezone Alignment
        tz_delta_hours = target_tz_offset_hours - source_tz_offset_hours
        if abs(tz_delta_hours) > 1e-4:
            parsed_times = parsed_times + pd.to_timedelta(tz_delta_hours, unit="h")

        # 3. Identify Target Metric Column
        aliases = cls.SUPPORTED_METRICS.get(target_metric, {}).get("aliases", [target_metric])
        metric_col = None
        for alias in aliases:
            if alias in df.columns:
                metric_col = alias
                break

        if not metric_col:
            # Try numeric columns excluding the time column
            numeric_cols = [c for c in df.columns if c != time_col and pd.api.types.is_numeric_dtype(df[c])]
            if len(numeric_cols) == 1:
                metric_col = numeric_cols[0]
            else:
                raise ValueError(
                    f"Could not match target metric '{target_metric}' in reference CSV. "
                    f"Searched for aliases {aliases}. Available columns: {list(df.columns)}"
                )

        raw_values = pd.to_numeric(df[metric_col], errors="coerce")
        valid_data_mask = ~raw_values.isna()
        df = df[valid_data_mask]
        parsed_times = parsed_times[valid_data_mask]
        values = raw_values[valid_data_mask].values.astype(float)

        # 4. Unit Alignment
        unit_meta = source_unit or "auto"
        if unit_meta.lower() in ("f", "fahrenheit", "°f"):
            # Convert Fahrenheit to Celsius: (°F - 32) * 5/9
            values = (values - 32.0) * (5.0 / 9.0)
            unit_meta = "°C (Converted from °F)"
        elif unit_meta.lower() in ("kw/m2", "kw/m²"):
            # Convert kW/m² to W/m²
            values = values * 1000.0
            unit_meta = "W/m² (Converted from kW/m²)"
        elif unit_meta.lower() in ("k", "kelvin"):
            values = values - 273.15
            unit_meta = "°C (Converted from K)"

        meta = {
            "source_column": metric_col,
            "time_column": time_col,
            "rows_read": len(values),
            "unit_applied": unit_meta,
            "tz_shift_hours": tz_delta_hours,
        }

        return parsed_times.tolist(), values.tolist(), meta

    @classmethod
    def calculate_metrics(
        cls,
        simulated_values: List[float],
        reference_values: List[float],
        metric_name: str = "indoor_temperature",
        unit: str = "°C",
    ) -> ValidationMetrics:
        """
        Compute statistical validation metrics (MAE, RMSE, MBE, R²).
        Enforces that R² is computed ONLY when reference variance is non-zero.
        """
        n = len(simulated_values)
        if n == 0 or n != len(reference_values):
            raise ValueError(f"Length mismatch or empty series: sim={n}, ref={len(reference_values)}")

        # Residuals = y - y_hat (reference - simulated)
        diffs = [y - y_hat for y, y_hat in zip(reference_values, simulated_values)]
        abs_diffs = [abs(d) for d in diffs]
        sq_diffs = [d * d for d in diffs]

        # 1. MAE = (1/n) * sum(|y - y_hat|)
        mae = sum(abs_diffs) / n

        # 2. RMSE = sqrt((1/n) * sum((y - y_hat)^2))
        rmse = math.sqrt(sum(sq_diffs) / n)

        # 3. MBE = (1/n) * sum(y - y_hat)
        # Positive MBE means simulated underpredicts measured reference
        mbe = sum(diffs) / n

        ref_mean = sum(reference_values) / n
        sim_mean = sum(simulated_values) / n

        # 4. R² (Coefficient of Determination)
        # Evaluated ONLY when reference variance is strictly greater than zero
        var_ref = sum((y - ref_mean) ** 2 for y in reference_values)
        var_sim = sum((y_hat - sim_mean) ** 2 for y_hat in simulated_values)

        r2: Optional[float] = None
        r2_applicable = True
        notes = None

        if var_ref < 1e-8:
            # Constant reference values (zero variance): R² is mathematically undefined / non-applicable
            r2 = None
            r2_applicable = False
            notes = "R² is not mathematically defined for constant reference measurements (zero reference variance)."
        elif var_sim < 1e-8:
            r2 = 0.0
            r2_applicable = True
            notes = "Simulated values are constant; R² = 0.0."
        else:
            cov = sum((y - ref_mean) * (y_hat - sim_mean) for y, y_hat in zip(reference_values, simulated_values))
            r = cov / math.sqrt(var_ref * var_sim)
            r2 = round(max(0.0, min(1.0, r * r)), 4)

        return ValidationMetrics(
            sample_count=n,
            mae=round(mae, 3),
            rmse=round(rmse, 3),
            mbe=round(mbe, 3),
            r_squared=r2,
            metric_name=metric_name,
            unit=unit,
            reference_mean=round(ref_mean, 2),
            simulated_mean=round(sim_mean, 2),
            max_absolute_error=round(max(abs_diffs), 3),
            min_absolute_error=round(min(abs_diffs), 3),
            r_squared_applicable=r2_applicable,
            notes=notes,
        )

    @classmethod
    def validate_simulation(
        cls,
        simulated_timestamps: List[str],
        simulated_values: List[float],
        reference_csv_content: Optional[Union[str, bytes]] = None,
        target_metric: str = "indoor_temperature",
        source_unit: Optional[str] = None,
        source_tz_offset_hours: float = 5.5,
        target_tz_offset_hours: float = 5.5,
    ) -> ReferenceValidationResult:
        """
        Complete reference validation entry point.
        Strict Zero-Fabrication: If reference_csv_content is None or empty, returns:
        'Validation data not provided.' with zero fabricated metrics.
        """
        # --- ZERO-FABRICATION GUARD ---
        if not reference_csv_content or (isinstance(reference_csv_content, str) and not reference_csv_content.strip()):
            return ReferenceValidationResult(
                status="NOT_PROVIDED",
                message="Validation data not provided.",
                reference_data_available=False,
                metric_name=target_metric,
                metrics=None,
                aligned_series=[],
                dataset_metadata={},
            )

        if not simulated_values or len(simulated_values) == 0:
            return ReferenceValidationResult(
                status="ERROR",
                message="Simulated timeseries is empty. Cannot perform reference validation.",
                reference_data_available=True,
                metric_name=target_metric,
                metrics=None,
            )

        # Ingest and normalize reference data
        try:
            ref_times, ref_vals, meta = cls.ingest_reference_csv(
                csv_content=reference_csv_content,
                target_metric=target_metric,
                source_unit=source_unit,
                source_tz_offset_hours=source_tz_offset_hours,
                target_tz_offset_hours=target_tz_offset_hours,
            )
        except Exception as e:
            return ReferenceValidationResult(
                status="ERROR",
                message=f"Failed to ingest reference dataset: {str(e)}",
                reference_data_available=False,
                metric_name=target_metric,
                metrics=None,
            )

        # Map and align timestamps between simulation and reference
        aligned_pairs: List[AlignedObservation] = []
        n_sim = len(simulated_values)

        # Build simulated timestamp list / index
        sim_dt_list = []
        for ts in simulated_timestamps:
            try:
                # Handle common formats: ISO, date-time, or simple sequential indices
                dt = pd.to_datetime(ts)
                sim_dt_list.append(dt)
            except Exception:
                sim_dt_list.append(None)

        # Direct pairing: if timestamp strings can be aligned or sequential indexing
        if len(ref_vals) == n_sim:
            for idx in range(n_sim):
                y = float(ref_vals[idx])
                y_hat = float(simulated_values[idx])
                ts_str = str(simulated_timestamps[idx])
                d = y - y_hat
                aligned_pairs.append(
                    AlignedObservation(
                        timestamp=ts_str,
                        simulated_value=round(y_hat, 2),
                        reference_value=round(y, 2),
                        residual=round(d, 3),
                        absolute_error=round(abs(d), 3),
                        squared_error=round(d * d, 4),
                    )
                )
        else:
            # Temporal nearest-neighbor matching if timestamp arrays differ in length
            ref_df = pd.DataFrame({"ref_val": ref_vals}, index=pd.DatetimeIndex(ref_times))
            ref_df = ref_df.sort_index()

            for idx, s_val in enumerate(simulated_values):
                s_dt = sim_dt_list[idx]
                if s_dt is None:
                    continue
                # Nearest reference observation within 90 minutes
                sub = ref_df.iloc[ref_df.index.get_indexer([s_dt], method="nearest")]
                if not sub.empty:
                    nearest_time = sub.index[0]
                    if abs((nearest_time - s_dt).total_seconds()) <= 5400:  # within 1.5h
                        y = float(sub["ref_val"].iloc[0])
                        y_hat = float(s_val)
                        d = y - y_hat
                        aligned_pairs.append(
                            AlignedObservation(
                                timestamp=str(simulated_timestamps[idx]),
                                simulated_value=round(y_hat, 2),
                                reference_value=round(y, 2),
                                residual=round(d, 3),
                                absolute_error=round(abs(d), 3),
                                squared_error=round(d * d, 4),
                            )
                        )

        if len(aligned_pairs) < 3:
            return ReferenceValidationResult(
                status="INSUFFICIENT_DATA",
                message=f"Insufficient overlapping timestamps between simulation and reference (found {len(aligned_pairs)}, minimum 3 required).",
                reference_data_available=True,
                metric_name=target_metric,
                metrics=None,
                aligned_series=aligned_pairs,
                dataset_metadata=meta,
            )

        sim_matched = [p.simulated_value for p in aligned_pairs]
        ref_matched = [p.reference_value for p in aligned_pairs]

        unit_str = cls.SUPPORTED_METRICS.get(target_metric, {}).get("unit", "°C")
        metrics = cls.calculate_metrics(
            simulated_values=sim_matched,
            reference_values=ref_matched,
            metric_name=target_metric,
            unit=unit_str,
        )

        return ReferenceValidationResult(
            status="COMPLETED",
            message=f"Successfully validated against {len(aligned_pairs)} empirical reference observations. MAE = {metrics.mae}{unit_str}, RMSE = {metrics.rmse}{unit_str}.",
            reference_data_available=True,
            metric_name=target_metric,
            unit=unit_str,
            metrics=metrics,
            aligned_series=aligned_pairs,
            dataset_metadata=meta,
        )
