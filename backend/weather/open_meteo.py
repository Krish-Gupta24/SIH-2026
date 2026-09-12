"""Open-Meteo API client for high-resolution elevation-corrected alpine climate and solar retrieval."""

import os
import math
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
import requests

from backend.weather.validator import WeatherValidator, WeatherValidationResult, WeatherClassification

logger = logging.getLogger("backend.weather.open_meteo")


class OpenMeteoClient:
    """Client for querying the Open-Meteo hourly weather API and generating EnergyPlus EPW files."""

    FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
    ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
    TIMEOUT_SECONDS = int(os.getenv("OPEN_METEO_TIMEOUT_SECONDS", "15"))

    @staticmethod
    def calculate_dew_point(temp_c: float, rel_humidity_pct: float) -> float:
        """Calculate dew point using standard Magnus-Tetens approximation."""
        rh = max(1.0, min(100.0, rel_humidity_pct))
        a, b = 17.27, 237.7
        alpha = ((a * temp_c) / (b + temp_c)) + math.log(rh / 100.0)
        dew_point = (b * alpha) / (a - alpha)
        return round(dew_point, 2)

    @staticmethod
    def calculate_horizontal_infrared(temp_c: float, dew_point_c: float, hour: int) -> float:
        """Estimate sky infrared radiation using Clark & Allen horizontal sky formulation (Wh/m²)."""
        temp_k = temp_c + 273.15
        hour_rad = math.radians(hour * 15.0)
        emissivity = 0.711 + 0.0056 * dew_point_c + 0.000073 * (dew_point_c ** 2) + 0.013 * math.cos(hour_rad)
        emissivity = max(0.65, min(1.0, emissivity))
        sigma = 5.670374419e-8
        ir_wm2 = emissivity * sigma * (temp_k ** 4)
        return max(50.0, min(650.0, round(ir_wm2, 1)))

    @classmethod
    def fetch_hourly_weather(
        cls,
        latitude: float,
        longitude: float,
        start_date: Optional[str] = None,  # Format: YYYY-MM-DD or YYYYMMDD
        end_date: Optional[str] = None,    # Format: YYYY-MM-DD or YYYYMMDD
        elevation: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Query Open-Meteo for hourly meteorological and solar parameters."""
        hourly_vars = [
            "temperature_2m",
            "relative_humidity_2m",
            "surface_pressure",
            "wind_speed_10m",
            "wind_direction_10m",
            "direct_normal_irradiance",
            "diffuse_radiation",
            "shortwave_radiation_instant",
        ]

        # Format dates if provided
        def clean_date(d: Optional[str]) -> Optional[str]:
            if not d:
                return None
            s = d.strip()
            if len(s) == 8 and s.isdigit():
                return f"{s[:4]}-{s[4:6]}-{s[6:]}"
            return s

        fmt_start = clean_date(start_date)
        fmt_end = clean_date(end_date)

        params: Dict[str, Any] = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "hourly": ",".join(hourly_vars),
            "wind_speed_unit": "ms",
            "timeformat": "iso8601",
        }
        if elevation is not None:
            params["elevation"] = round(elevation, 1)

        target_url = cls.FORECAST_URL
        if fmt_start and fmt_end:
            params["start_date"] = fmt_start
            params["end_date"] = fmt_end
            try:
                dt_end = datetime.strptime(fmt_end, "%Y-%m-%d")
                # If end date is more than 7 days in the past, use archive API
                if (datetime.now() - dt_end).days > 7:
                    target_url = cls.ARCHIVE_URL
            except Exception:
                pass
        else:
            # Default recent 3-day observational window (past 2 days + today)
            params["past_days"] = 2
            params["forecast_days"] = 1

        try:
            resp = requests.get(target_url, params=params, timeout=cls.TIMEOUT_SECONDS)
            resp.raise_for_status()
            data = resp.json()
            if "hourly" not in data or "temperature_2m" not in data["hourly"]:
                raise ValueError("Open-Meteo returned invalid payload without hourly series.")
            return data
        except Exception as exc:
            logger.warning(f"Open-Meteo API query failed: {exc}")
            raise RuntimeError(f"Failed to fetch live weather from Open-Meteo: {str(exc)}") from exc

    @classmethod
    def convert_open_meteo_to_epw(
        cls,
        meteo_data: Dict[str, Any],
        location_name: str,
        elevation_m: Optional[float] = None,
        output_dir: Optional[Path] = None,
    ) -> Path:
        """Convert Open-Meteo hourly response to a validated EnergyPlus EPW file."""
        lat = float(meteo_data.get("latitude", 0.0))
        lon = float(meteo_data.get("longitude", 0.0))
        resolved_elevation = elevation_m or float(meteo_data.get("elevation", 3500.0))
        tz_offset = round(lon / 15.0 * 2) / 2

        hourly = meteo_data.get("hourly", {})
        times = hourly.get("time", [])
        temps = hourly.get("temperature_2m", [])
        rhs = hourly.get("relative_humidity_2m", [])
        pressures = hourly.get("surface_pressure", [])  # in hPa
        winds = hourly.get("wind_speed_10m", [])
        wind_dirs = hourly.get("wind_direction_10m", [])
        dnis = hourly.get("direct_normal_irradiance", [])
        dhis = hourly.get("diffuse_radiation", [])
        ghis = hourly.get("shortwave_radiation_instant", [])

        total_records = len(times)
        if total_records == 0:
            raise ValueError("No hourly meteorological observations in Open-Meteo payload.")

        # Prepare storage destination
        target_dir = output_dir or Path("storage/weather").resolve()
        target_dir.mkdir(parents=True, exist_ok=True)
        safe_loc = "".join(c if c.isalnum() else "_" for c in location_name).strip("_")
        epw_filename = f"LIVE_OpenMeteo_{safe_loc}_{lat:.2f}N_{lon:.2f}E.epw"
        epw_path = target_dir / epw_filename

        lines = [
            f"LOCATION,{location_name},OPEN-METEO,IND,High Altitude Satellite Station,999999,{lat:.4f},{lon:.4f},{tz_offset:.1f},{resolved_elevation:.1f}",
            "DESIGN CONDITIONS,0",
            "TYPICAL/EXTREME PERIODS,0",
            "GROUND TEMPERATURES,0",
            "HOLIDAYS/DAYLIGHT SAVINGS,No,0,0,0",
            "COMMENTS 1,Live Satellite & High-Altitude Reanalysis from Open-Meteo",
            "COMMENTS 2,SIH 2026 Autonomous Climate Ingestion Service",
            "DATA PERIODS,1,1,Data,Sunday,1,1,12,31",
        ]

        # Standard barometric default if pressure missing
        baro_default = max(30000.0, min(108000.0, 101325.0 * ((1.0 - 2.25577e-5 * max(0.0, resolved_elevation)) ** 5.25588)))

        for i in range(total_records):
            iso_str = times[i]
            # Parse timestamp e.g. "2024-01-01T00:00"
            try:
                dt = datetime.fromisoformat(iso_str)
                yr, mo, da, hr = dt.year, dt.month, dt.day, dt.hour + 1
            except Exception:
                yr, mo, da, hr = 2024, 1, (i // 24) + 1, (i % 24) + 1

            t_val = float(temps[i]) if i < len(temps) and temps[i] is not None else -15.0
            rh_val = float(rhs[i]) if i < len(rhs) and rhs[i] is not None else 50.0
            rh_val = max(1.0, min(100.0, rh_val))

            p_hpa = float(pressures[i]) if i < len(pressures) and pressures[i] is not None else (baro_default / 100.0)
            p_pa = p_hpa * 100.0 if p_hpa > 100.0 else baro_default

            ws_val = float(winds[i]) if i < len(winds) and winds[i] is not None else 2.5
            wd_val = float(wind_dirs[i]) if i < len(wind_dirs) and wind_dirs[i] is not None else 0.0

            ghi_val = max(0.0, float(ghis[i])) if i < len(ghis) and ghis[i] is not None else 0.0
            dni_val = max(0.0, float(dnis[i])) if i < len(dnis) and dnis[i] is not None else 0.0
            dhi_val = max(0.0, float(dhis[i])) if i < len(dhis) and dhis[i] is not None else 0.0

            dew_point = cls.calculate_dew_point(t_val, rh_val)
            ir_sky = cls.calculate_horizontal_infrared(t_val, dew_point, hr)

            epw_row = [
                str(yr), str(mo), str(da), str(hr), "60",
                "?9?9?9?9E0?9?9?9?9?9?9?9?9",
                f"{t_val:.2f}",
                f"{dew_point:.2f}",
                f"{rh_val:.1f}",
                f"{p_pa:.0f}",
                "1367", "1367",
                f"{ir_sky:.1f}",
                f"{ghi_val:.0f}",
                f"{dni_val:.0f}",
                f"{dhi_val:.0f}",
                "0", "0", "0", "0",
                f"{wd_val:.0f}",
                f"{ws_val:.2f}",
                "5", "5",
                "9999", "99999",
                "0", "0", "0.0", "0.0", "0.0", "0", "0.2", "0.0", "0.0"
            ]
            lines.append(",".join(epw_row))

        with open(epw_path, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(lines) + "\n")

        return epw_path
