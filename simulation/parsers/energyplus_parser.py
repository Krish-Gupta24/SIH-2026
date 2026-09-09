"""Parser for EnergyPlus simulation outputs (eplusout.err, eplusout.csv, eplusout.eso)."""

import csv
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple


class EnergyPlusOutputParser:
    """Parses EnergyPlus error logs, time-series CSV outputs, and thermal performance metrics."""

    @staticmethod
    def parse_error_file(err_path: str) -> Dict[str, Any]:
        """Parse EnergyPlus eplusout.err to extract version, warnings, severe errors, and fatal status."""
        p = Path(err_path)
        if not p.exists():
            return {
                "file_exists": False,
                "completed_successfully": False,
                "fatal_error": True,
                "warnings": [],
                "severe_errors": ["Error file not generated."],
                "error_summary": "Missing error file",
            }

        with open(p, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        lines = content.splitlines()
        version_line = ""
        warnings: List[str] = []
        severe_errors: List[str] = []
        fatal_errors: List[str] = []
        summary_line = ""

        for line in lines:
            trimmed = line.strip()
            if "Program Version,EnergyPlus" in trimmed:
                version_line = trimmed
            elif "** Warning **" in trimmed:
                warnings.append(trimmed)
            elif "** Severe  **" in trimmed:
                severe_errors.append(trimmed)
            elif "**  Fatal  **" in trimmed:
                fatal_errors.append(trimmed)
            elif "EnergyPlus Completed" in trimmed or "EnergyPlus Terminated" in trimmed:
                summary_line = trimmed

        completed_successfully = (
            "EnergyPlus Completed Successfully" in summary_line
            and len(fatal_errors) == 0
            and len(severe_errors) == 0
        )

        return {
            "file_exists": True,
            "version_header": version_line,
            "completed_successfully": completed_successfully,
            "fatal_error": len(fatal_errors) > 0,
            "severe_error_count": len(severe_errors),
            "warning_count": len(warnings),
            "warnings": warnings,
            "severe_errors": severe_errors,
            "fatal_errors": fatal_errors,
            "summary_line": summary_line,
        }

    @staticmethod
    def parse_csv_results(csv_path: str) -> Dict[str, Any]:
        """Parse eplusout.csv to extract indoor temperature, solar radiation, and heat transfer rates."""
        p = Path(csv_path)
        if not p.exists():
            return {"file_exists": False}

        with open(p, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        if not rows:
            return {"file_exists": True, "data_rows": 0}

        headers = list(rows[0].keys())

        # Match columns dynamically
        zone_temp_col = None
        outdoor_temp_col = None
        direct_solar_col = None
        diffuse_solar_col = None
        window_solar_col = None
        conduction_in_cols = []
        conduction_out_cols = []

        for h in headers:
            h_lower = h.lower()
            if "zone mean air temperature" in h_lower:
                zone_temp_col = h
            elif "site outdoor air drybulb temperature" in h_lower:
                outdoor_temp_col = h
            elif "site direct solar radiation" in h_lower:
                direct_solar_col = h
            elif "site diffuse solar radiation" in h_lower:
                diffuse_solar_col = h
            elif "transmitted solar radiation" in h_lower or "window" in h_lower and "solar" in h_lower:
                window_solar_col = h
            elif "inside face conduction" in h_lower:
                conduction_in_cols.append(h)
            elif "outside face conduction" in h_lower:
                conduction_out_cols.append(h)

        # Extract time-series values
        zone_temps: List[float] = []
        outdoor_temps: List[float] = []
        solar_transmitted: List[float] = []
        hourly_records: List[Dict[str, Any]] = []

        for r in rows:
            dt = r.get("Date/Time", "").strip()

            def to_float(val: Optional[str]) -> float:
                try:
                    return float(val.strip()) if val else 0.0
                except (ValueError, AttributeError):
                    return 0.0

            z_temp = to_float(r.get(zone_temp_col)) if zone_temp_col else 0.0
            o_temp = to_float(r.get(outdoor_temp_col)) if outdoor_temp_col else 0.0
            sol_trans = to_float(r.get(window_solar_col)) if window_solar_col else 0.0

            # Sum conduction
            cond_in = sum(to_float(r.get(c)) for c in conduction_in_cols)
            cond_out = sum(to_float(r.get(c)) for c in conduction_out_cols)

            zone_temps.append(z_temp)
            outdoor_temps.append(o_temp)
            solar_transmitted.append(sol_trans)

            hourly_records.append({
                "datetime": dt,
                "zone_temp_c": round(z_temp, 2),
                "outdoor_temp_c": round(o_temp, 2),
                "solar_transmitted_w": round(sol_trans, 2),
                "total_inside_conduction_w": round(cond_in, 2),
                "total_outside_conduction_w": round(cond_out, 2),
            })

        # Calculate summary metrics
        min_temp = min(zone_temps) if zone_temps else 0.0
        max_temp = max(zone_temps) if zone_temps else 0.0
        mean_temp = sum(zone_temps) / len(zone_temps) if zone_temps else 0.0

        min_outdoor = min(outdoor_temps) if outdoor_temps else 0.0
        max_outdoor = max(outdoor_temps) if outdoor_temps else 0.0
        mean_outdoor = sum(outdoor_temps) / len(outdoor_temps) if outdoor_temps else 0.0

        total_solar_kwh = sum(solar_transmitted) / 1000.0  # Hourly W -> kWh

        return {
            "file_exists": True,
            "timesteps_count": len(rows),
            "indoor_temperature": {
                "min_c": round(min_temp, 2),
                "max_c": round(max_temp, 2),
                "mean_c": round(mean_temp, 2),
            },
            "outdoor_temperature": {
                "min_c": round(min_outdoor, 2),
                "max_c": round(max_outdoor, 2),
                "mean_c": round(mean_outdoor, 2),
            },
            "solar_radiation": {
                "total_window_transmitted_kwh": round(total_solar_kwh, 3),
                "peak_transmitted_solar_w": round(max(solar_transmitted) if solar_transmitted else 0.0, 2),
            },
            "hourly_timeseries": hourly_records,
        }
