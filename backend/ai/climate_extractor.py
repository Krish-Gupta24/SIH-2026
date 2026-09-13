"""Climate feature extraction and provenance validation from EnergyPlus Weather (EPW) files.

Extracts physically meaningful environmental descriptors (temperature statistics,
solar radiation, diurnal ranges, heating degree days, elevation) to serve as
surrogate ML features rather than categorical weather IDs.
"""

from dataclasses import asdict, dataclass
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd


@dataclass(frozen=True)
class ClimateProvenance:
    """Metadata and provenance record for an authenticated weather file."""

    weather_id: str
    filename: str
    location_name: str
    state_province: str
    country: str
    data_source: str
    wmo_number: str
    latitude: float
    longitude: float
    elevation_m: float
    sha256_hash: str
    is_verified_high_altitude: bool
    quarantine_reason: Optional[str] = None


@dataclass(frozen=True)
class PhysicalClimateFeatures:
    """Physical environmental descriptors extracted from EPW for ML surrogate input."""

    latitude: float
    longitude: float
    elevation_m: float
    outdoor_temp_mean_c: float
    outdoor_temp_min_c: float
    outdoor_temp_max_c: float
    outdoor_temp_diurnal_range_c: float
    winter_temp_mean_c: float
    winter_temp_min_c: float
    global_horizontal_solar_mean_w_m2: float
    winter_solar_mean_w_m2: float
    wind_speed_mean_m_s: float
    relative_humidity_mean_pct: float
    heating_degree_days_base18: float

    def to_dict(self) -> Dict[str, float]:
        return asdict(self)

    def to_feature_vector(self) -> List[float]:
        return [
            self.latitude,
            self.longitude,
            self.elevation_m,
            self.outdoor_temp_mean_c,
            self.outdoor_temp_min_c,
            self.outdoor_temp_max_c,
            self.outdoor_temp_diurnal_range_c,
            self.winter_temp_mean_c,
            self.winter_temp_min_c,
            self.global_horizontal_solar_mean_w_m2,
            self.winter_solar_mean_w_m2,
            self.wind_speed_mean_m_s,
            self.relative_humidity_mean_pct,
            self.heating_degree_days_base18,
        ]


class EPWClimateExtractor:
    """Parser and feature extractor for EnergyPlus EPW files with high-altitude verification."""

    QUARANTINED_FILES = {
        "test_weather.epw": "Denver Colorado TMY3 file quarantined from high-altitude Himalayan models",
    }

    # Canonical verified station mapping for ThermoShelter
    VERIFIED_STATIONS = {
        "IND_JK_Leh.427053_TMYx.epw": "leh_ladakh_tmyx",
        "IND_JK_Leh.420270_ISHRAE.epw": "leh_ladakh_ishrae",
        "dras_kargil.epw": "dras_kargil",
        "spiti_valley.epw": "spiti_valley",
        "tawang.epw": "tawang",
        "siachen_glacier.epw": "siachen_glacier",
        "MICROCLIMATE_Siachen_Glacier_Outpost_5400m_8760h.epw": "siachen_glacier_duplicate",
    }

    @classmethod
    def compute_sha256(cls, file_path: Path) -> str:
        with open(file_path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()

    @classmethod
    def extract_provenance(cls, file_path: Path) -> ClimateProvenance:
        """Parses the LOCATION line and builds provenance metadata."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Weather file not found: {path}")

        sha256 = cls.compute_sha256(path)
        filename = path.name

        with open(path, "r", encoding="latin1") as f:
            header_line = f.readline().strip()

        if not header_line.startswith("LOCATION"):
            raise ValueError(f"Invalid EPW file header (missing LOCATION): {header_line}")

        parts = [p.strip() for p in header_line.split(",")]
        # Standard EPW LOCATION: LOCATION,City,State,Country,Source,WMO,Lat,Lon,TZ,Elev
        city = parts[1] if len(parts) > 1 else "Unknown"
        state = parts[2] if len(parts) > 2 else "Unknown"
        country = parts[3] if len(parts) > 3 else "Unknown"
        source = parts[4] if len(parts) > 4 else "Unknown"
        wmo = parts[5] if len(parts) > 5 else "999999"
        lat = float(parts[6]) if len(parts) > 6 else 0.0
        lon = float(parts[7]) if len(parts) > 7 else 0.0
        elev = float(parts[9]) if len(parts) > 9 else 0.0

        is_quarantined = filename in cls.QUARANTINED_FILES
        quarantine_reason = cls.QUARANTINED_FILES.get(filename)

        weather_id = cls.VERIFIED_STATIONS.get(filename, Path(filename).stem.lower())

        return ClimateProvenance(
            weather_id=weather_id,
            filename=filename,
            location_name=city,
            state_province=state,
            country=country,
            data_source=source,
            wmo_number=wmo,
            latitude=lat,
            longitude=lon,
            elevation_m=elev,
            sha256_hash=sha256,
            is_verified_high_altitude=not is_quarantined and elev >= 2500.0,
            quarantine_reason=quarantine_reason,
        )

    @classmethod
    def extract_features(cls, file_path: Path) -> Tuple[PhysicalClimateFeatures, ClimateProvenance]:
        """Extracts complete physical climate feature set and provenance from an EPW file."""
        provenance = cls.extract_provenance(file_path)

        if not provenance.is_verified_high_altitude and provenance.quarantine_reason:
            raise ValueError(
                f"Cannot extract features for quarantined weather file {provenance.filename}: "
                f"{provenance.quarantine_reason}"
            )

        # Standard EPW columns: Year(0), Month(1), Day(2), Hour(3), Minute(4), ...
        # Dry Bulb Temp: Col 6 (°C)
        # Dew Point Temp: Col 7 (°C)
        # Relative Humidity: Col 8 (%)
        # Atmospheric Pressure: Col 9 (Pa)
        # Global Horizontal Radiation: Col 13 (Wh/m²)
        # Direct Normal Radiation: Col 14 (Wh/m²)
        # Wind Direction: Col 20 (deg)
        # Wind Speed: Col 21 (m/s)
        col_names = [
            "year", "month", "day", "hour", "minute", "data_source_flags",
            "dry_bulb_c", "dew_point_c", "rel_humidity", "pressure_pa",
            "extraterrestrial_horiz", "extraterrestrial_direct", "infrared_horiz",
            "global_horiz_rad", "direct_normal_rad", "diffuse_horiz_rad",
            "global_horiz_illum", "direct_normal_illum", "diffuse_horiz_illum",
            "zenith_illum", "wind_direction_deg", "wind_speed_m_s",
        ]

        df = pd.read_csv(
            file_path,
            skiprows=8,
            header=None,
            usecols=range(len(col_names)),
            names=col_names,
            encoding="latin1",
        )

        # 1. Temperature Statistics
        t_mean = float(df["dry_bulb_c"].mean())
        t_min = float(df["dry_bulb_c"].min())
        t_max = float(df["dry_bulb_c"].max())

        # Diurnal range: Mean of daily (max - min)
        daily_t = df.groupby(["month", "day"])["dry_bulb_c"]
        diurnal_range = float((daily_t.max() - daily_t.min()).mean())

        # Winter subset (Dec = 12, Jan = 1, Feb = 2)
        winter_mask = df["month"].isin([12, 1, 2])
        df_winter = df[winter_mask]
        winter_t_mean = float(df_winter["dry_bulb_c"].mean()) if not df_winter.empty else t_mean
        winter_t_min = float(df_winter["dry_bulb_c"].min()) if not df_winter.empty else t_min

        # 2. Solar Radiation Statistics (Wh/m² per hour == average W/m²)
        solar_mean = float(df["global_horiz_rad"].mean())
        winter_solar_mean = float(df_winter["global_horiz_rad"].mean()) if not df_winter.empty else solar_mean

        # 3. Wind & Humidity
        wind_mean = float(df["wind_speed_m_s"].mean())
        rh_mean = float(df["rel_humidity"].mean())

        # 4. Heating Degree Days base 18°C: sum(max(0, 18 - daily_mean))
        daily_means = daily_t.mean()
        hdd18 = float((18.0 - daily_means).clip(lower=0.0).sum())

        features = PhysicalClimateFeatures(
            latitude=provenance.latitude,
            longitude=provenance.longitude,
            elevation_m=provenance.elevation_m,
            outdoor_temp_mean_c=round(t_mean, 2),
            outdoor_temp_min_c=round(t_min, 2),
            outdoor_temp_max_c=round(t_max, 2),
            outdoor_temp_diurnal_range_c=round(diurnal_range, 2),
            winter_temp_mean_c=round(winter_t_mean, 2),
            winter_temp_min_c=round(winter_t_min, 2),
            global_horizontal_solar_mean_w_m2=round(solar_mean, 2),
            winter_solar_mean_w_m2=round(winter_solar_mean, 2),
            wind_speed_mean_m_s=round(wind_mean, 2),
            relative_humidity_mean_pct=round(rh_mean, 2),
            heating_degree_days_base18=round(hdd18, 1),
        )

        return features, provenance
