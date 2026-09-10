"""NASA POWER API client for satellite hourly meteorological and solar irradiance retrieval."""

import os
import math
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List
import requests

from backend.weather.validator import WeatherValidator, WeatherValidationResult, WeatherClassification

logger = logging.getLogger("backend.weather.nasa_power")


class NASAPowerClient:
    """Client for querying the NASA POWER hourly point API and generating EnergyPlus EPW files."""

    BASE_URL = os.getenv("NASA_POWER_BASE_URL", "https://power.larc.nasa.gov/api/temporal/hourly/point")
    TIMEOUT_SECONDS = int(os.getenv("NASA_POWER_TIMEOUT_SECONDS", "30"))

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
        # Emissivity of clear sky
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
        start_date: str,  # Format: YYYYMMDD
        end_date: str,    # Format: YYYYMMDD
    ) -> Dict[str, Any]:
        """Query NASA POWER hourly endpoint for given coordinates and date range."""
        params = {
            "parameters": "T2M,RH2M,PS,WS10M,WD10M,ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DNI,ALLSKY_SFC_SW_DIFF",
            "community": "SB",
            "longitude": f"{longitude:.4f}",
            "latitude": f"{latitude:.4f}",
            "start": start_date,
            "end": end_date,
            "format": "JSON",
        }

        try:
            resp = requests.get(cls.BASE_URL, params=params, timeout=cls.TIMEOUT_SECONDS)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.warning(f"NASA POWER API request failed: {exc}. Raising error.")
            raise RuntimeError(f"Failed to fetch satellite weather from NASA POWER API: {str(exc)}") from exc

    @classmethod
    def convert_nasa_json_to_epw(
        cls,
        nasa_data: Dict[str, Any],
        location_name: str,
        elevation_m: float,
        output_dir: Optional[Path] = None,
    ) -> Path:
        """Convert NASA POWER API JSON hourly response into an EnergyPlus EPW file."""
        header_geo = nasa_data.get("geometry", {}).get("coordinates", [0.0, 0.0, elevation_m])
        lon = float(header_geo[0])
        lat = float(header_geo[1])
        elev = float(header_geo[2]) if len(header_geo) > 2 else elevation_m

        # Target output directory
        target_dir = output_dir or (Path("storage/weather").resolve())
        target_dir.mkdir(parents=True, exist_ok=True)

        safe_loc = "".join(c if c.isalnum() else "_" for c in location_name).strip("_")
        epw_filename = f"NASA_POWER_{safe_loc}_{lat:.2f}N_{lon:.2f}E.epw"
        epw_path = target_dir / epw_filename

        properties = nasa_data.get("properties", {}).get("parameter", {})
        t2m = properties.get("T2M", {})
        rh2m = properties.get("RH2M", {})
        ps = properties.get("PS", {})
        ws10m = properties.get("WS10M", {})
        wd10m = properties.get("WD10M", {})
        ghi_map = properties.get("ALLSKY_SFC_SW_DWN", {})
        dni_map = properties.get("ALLSKY_SFC_SW_DNI", {})
        dhi_map = properties.get("ALLSKY_SFC_SW_DIFF", {})

        timestamps = sorted(list(t2m.keys()))
        if not timestamps:
            raise ValueError("NASA POWER response contained no hourly time-series records.")

        # Determine start and end from timestamps (format: YYYYMMDDHH)
        start_ts = timestamps[0]
        end_ts = timestamps[-1]
        start_month = int(start_ts[4:6])
        start_day = int(start_ts[6:8])
        end_month = int(end_ts[4:6])
        end_day = int(end_ts[6:8])

        time_zone = round(lon / 15.0 * 2) / 2  # Approx timezone from longitude

        # Build EPW Header Lines
        lines = [
            f"LOCATION,{location_name},NASA-POWER,IND,NASA POWER Satellite Reanalysis,999999,{lat:.4f},{lon:.4f},{time_zone:.1f},{elev:.1f}",
            "DESIGN CONDITIONS,0",
            "TYPICAL/EXTREME PERIODS,0",
            "GROUND TEMPERATURES,0",
            "HOLIDAYS/DAYLIGHT SAVINGS,No,0,0,0",
            "COMMENTS 1,NASA POWER Satellite Hourly Meteorological Dataset",
            "COMMENTS 2,Generated by SIH 2026 High Altitude Shelter Platform",
            f"DATA PERIODS,1,1,Data,Sunday,{start_month},{start_day},{end_month},{end_day}",
        ]

        for ts in timestamps:
            # Parse timestamp: YYYYMMDDHH
            year = int(ts[0:4])
            month = int(ts[4:6])
            day = int(ts[6:8])
            hour = int(ts[8:10])
            # EnergyPlus hours run 1..24; NASA POWER provides 00..23
            epw_hour = hour + 1

            dry_bulb = float(t2m.get(ts, 0.0))
            rel_hum = max(1.0, min(100.0, float(rh2m.get(ts, 50.0))))
            dew_point = cls.calculate_dew_point(dry_bulb, rel_hum)
            # Pressure in NASA POWER is kPa -> convert to Pa
            press_pa = max(30000.0, min(108000.0, float(ps.get(ts, 101.325)) * 1000.0))
            wind_spd = max(0.0, float(ws10m.get(ts, 1.0)))
            wind_dir = max(0.0, min(360.0, float(wd10m.get(ts, 0.0))))
            ghi = max(0.0, float(ghi_map.get(ts, 0.0)))
            dni = max(0.0, float(dni_map.get(ts, 0.0)))
            dhi = max(0.0, float(dhi_map.get(ts, 0.0)))
            ir_sky = cls.calculate_horizontal_infrared(dry_bulb, dew_point, epw_hour)

            # Extraterrestrial normal estimation
            day_of_year = datetime(year, month, day, tzinfo=timezone.utc).timetuple().tm_yday
            b_val = (2.0 * math.pi * (day_of_year - 1)) / 365.0
            et_normal = round(1367.0 * (1.00011 + 0.034221 * math.cos(b_val) + 0.00128 * math.sin(b_val)))

            # EPW 35-field data row:
            row = [
                str(year),
                str(month),
                str(day),
                str(epw_hour),
                "60",                        # Minute
                "?9?9?9?9E0?9?9?9?9?9?9?9?9", # Quality flags
                f"{dry_bulb:.2f}",           # Dry Bulb {C}
                f"{dew_point:.2f}",          # Dew Point {C}
                f"{rel_hum:.1f}",            # Relative Humidity {%}
                f"{press_pa:.0f}",           # Atmospheric Station Pressure {Pa}
                f"{et_normal}",              # Extraterrestrial Horizontal Radiation {Wh/m2}
                f"{et_normal}",              # Extraterrestrial Direct Normal Radiation {Wh/m2}
                f"{ir_sky:.1f}",             # Horizontal Infrared Radiation Intensity {Wh/m2}
                f"{ghi:.0f}",                # Global Horizontal Radiation {Wh/m2}
                f"{dni:.0f}",                # Direct Normal Radiation {Wh/m2}
                f"{dhi:.0f}",                # Diffuse Horizontal Radiation {Wh/m2}
                "0", "0", "0", "0",          # Illuminance fields
                f"{wind_dir:.0f}",           # Wind Direction {deg}
                f"{wind_spd:.2f}",           # Wind Speed {m/s}
                "5", "5",                    # Sky cover
                "9999", "99999",             # Visibility, Ceiling height
                "0", "0",                    # Weather codes
                "0.0", "0.0",                # Precipitable water, Aerosol
                "0.0", "0",                  # Snow depth, days since
                "0.2",                       # Albedo
                "0.0", "0.0",                # Liquid precipitation
            ]
            lines.append(",".join(row))

        with open(epw_path, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(lines) + "\n")

        return epw_path
