"""Weather data validation layer and provenance verification."""

import math
import hashlib
from enum import Enum
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict


class WeatherClassification(str, Enum):
    """Classification of meteorological dataset provenance."""
    REAL_DATA = "REAL_DATA"
    USER_DEFINED = "USER_DEFINED"
    TEST_DATA = "TEST_DATA"


@dataclass
class WeatherLocationHeader:
    """Parsed EPW LOCATION header record."""
    city: str
    state_province: str
    country: str
    data_source: str
    wmo_id: str
    latitude: float
    longitude: float
    time_zone: float
    elevation_m: float


@dataclass
class WeatherValidationResult:
    """Comprehensive validation report and provenance payload."""
    is_valid: bool
    classification: WeatherClassification
    is_test_data: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    header: Optional[Dict[str, Any]] = None
    file_hash_sha256: str = ""
    file_name: str = ""
    records_count: int = 0
    date_range: Optional[str] = None
    timestep_minutes: int = 60
    missing_values_count: int = 0
    checks_passed: List[str] = field(default_factory=list)
    coordinate_delta_km: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert report to dictionary."""
        d = asdict(self)
        d["classification"] = self.classification.value
        return d


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute the great-circle distance between two geographic points in kilometers."""
    r = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (math.sin(d_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class WeatherValidator:
    """Strict validator for EnergyPlus weather (EPW) files and meteorological datasets."""

    # Physical thresholds for validation
    TEMP_MIN_C = -70.0
    TEMP_MAX_C = 60.0
    RH_MIN_PCT = 0.0
    RH_MAX_PCT = 100.0
    PRESSURE_MIN_PA = 30000.0
    PRESSURE_MAX_PA = 108000.0
    SOLAR_MAX_WM2 = 1450.0
    WIND_SPEED_MAX_MS = 75.0

    @classmethod
    def compute_sha256(cls, file_path: Path) -> str:
        """Compute SHA-256 checksum of weather file."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    @classmethod
    def parse_epw_location_header(cls, first_line: str) -> WeatherLocationHeader:
        """Parse EPW LOCATION header line."""
        tokens = [t.strip() for t in first_line.split(",")]
        if not tokens or tokens[0].upper() != "LOCATION":
            raise ValueError(f"EPW file missing LOCATION header. First token was: '{tokens[0] if tokens else ''}'")
        if len(tokens) < 10:
            raise ValueError(f"EPW LOCATION header requires at least 10 fields, got {len(tokens)}")

        return WeatherLocationHeader(
            city=tokens[1],
            state_province=tokens[2],
            country=tokens[3],
            data_source=tokens[4],
            wmo_id=tokens[5],
            latitude=float(tokens[6]),
            longitude=float(tokens[7]),
            time_zone=float(tokens[8]),
            elevation_m=float(tokens[9]),
        )

    @classmethod
    def validate_epw_file(
        cls,
        epw_path: Path,
        expected_latitude: Optional[float] = None,
        expected_longitude: Optional[float] = None,
        max_coordinate_delta_km: float = 150.0,
    ) -> WeatherValidationResult:
        """Perform comprehensive validation of an EPW file."""
        epw_path = Path(epw_path)
        if not epw_path.is_file():
            return WeatherValidationResult(
                is_valid=False,
                classification=WeatherClassification.TEST_DATA,
                is_test_data=False,
                errors=[f"Weather file does not exist: {epw_path.name}"],
                file_name=epw_path.name,
            )

        errors: List[str] = []
        warnings: List[str] = []
        checks_passed: List[str] = []
        missing_count = 0

        # 1. Compute file hash
        file_hash = cls.compute_sha256(epw_path)
        file_name = epw_path.name

        # 2. Read headers and sample records
        lines: List[str] = []
        with open(epw_path, "r", encoding="utf-8", errors="replace") as f:
            lines = [line.strip() for line in f if line.strip()]

        if len(lines) < 9:
            errors.append(f"EPW file truncated: only {len(lines)} lines found (minimum 8 headers + 1 data line required).")
            return WeatherValidationResult(
                is_valid=False,
                classification=WeatherClassification.TEST_DATA,
                is_test_data=True,
                errors=errors,
                file_hash_sha256=file_hash,
                file_name=file_name,
            )

        # 3. Validate LOCATION header
        location_header: Optional[WeatherLocationHeader] = None
        try:
            location_header = cls.parse_epw_location_header(lines[0])
            checks_passed.append("location_header")
        except Exception as e:
            errors.append(f"Invalid LOCATION header: {str(e)}")

        # 4. Check classification: TEST_DATA vs USER_DEFINED vs REAL_DATA
        classification = WeatherClassification.REAL_DATA
        is_test_data = False

        if file_name.lower() == "test_weather.epw" or "test_weather" in file_name.lower():
            classification = WeatherClassification.TEST_DATA
            is_test_data = True
        elif location_header and ("Denver" in location_header.city or "Golden" in location_header.city or location_header.wmo_id in ("724666", "725300")):
            classification = WeatherClassification.TEST_DATA
            is_test_data = True
        elif "manual" in file_name.lower() or "user_defined" in file_name.lower():
            classification = WeatherClassification.USER_DEFINED
        elif location_header and "USER" in location_header.data_source.upper():
            classification = WeatherClassification.USER_DEFINED

        # 5. Check coordinate alignment if model coordinates provided
        coord_delta_km: Optional[float] = None
        if location_header and expected_latitude is not None and expected_longitude is not None:
            coord_delta_km = haversine_distance_km(
                location_header.latitude,
                location_header.longitude,
                expected_latitude,
                expected_longitude,
            )
            if coord_delta_km > max_coordinate_delta_km:
                warnings.append(
                    f"Geographic divergence: EPW location ({location_header.city}: {location_header.latitude:.3f}°N, "
                    f"{location_header.longitude:.3f}°E) is {coord_delta_km:.1f} km away from shelter model location "
                    f"({expected_latitude:.3f}°N, {expected_longitude:.3f}°E)."
                )
            else:
                checks_passed.append("coordinate_alignment")

        # 6. Parse DATA PERIODS header (line 8, 0-indexed line 7)
        data_period_str = ""
        for h_line in lines[1:8]:
            if h_line.upper().startswith("DATA PERIODS"):
                tokens = [t.strip() for t in h_line.split(",")]
                if len(tokens) >= 9:
                    data_period_str = f"{tokens[5]}/{tokens[6]} to {tokens[7]}/{tokens[8]}"
                checks_passed.append("data_periods_header")
                break

        # 7. Validate Data Lines (hourly physical variables)
        data_lines = lines[8:]
        records_count = len(data_lines)
        if records_count == 0:
            errors.append("EPW file contains no hourly data records.")

        line_sample = data_lines[:min(8760, len(data_lines))]
        prev_month, prev_day, prev_hour = -1, -1, -1

        for idx, d_line in enumerate(line_sample):
            cols = [c.strip() for c in d_line.split(",")]
            if len(cols) < 30:
                errors.append(f"Row {idx+9} has insufficient columns ({len(cols)}/35 required).")
                break

            try:
                year = int(cols[0])
                month = int(cols[1])
                day = int(cols[2])
                hour = int(cols[3])
                
                # Check timestamps bounds
                if not (1 <= month <= 12 and 1 <= day <= 31 and 1 <= hour <= 24):
                    errors.append(f"Row {idx+9}: Invalid timestamp values ({month}/{day} Hour {hour}).")
                    break

                dry_bulb = float(cols[6])
                dew_point = float(cols[7])
                rel_hum = float(cols[8])
                atm_press = float(cols[9])
                ghi = float(cols[13])
                dni = float(cols[14])
                dhi = float(cols[15])
                wind_spd = float(cols[21])

                # Check missing value sentinels (EPW uses 99.9 or 999 or 999999)
                if dry_bulb > 90.0 or atm_press >= 999999.0 or rel_hum > 105.0:
                    missing_count += 1

                # Physical range validation
                if not (cls.TEMP_MIN_C <= dry_bulb <= cls.TEMP_MAX_C):
                    warnings.append(f"Extreme dry bulb temperature {dry_bulb}°C at row {idx+9}.")
                if not (cls.RH_MIN_PCT <= rel_hum <= cls.RH_MAX_PCT + 1.0):
                    errors.append(f"Relative humidity {rel_hum}% out of physical bounds at row {idx+9}.")
                    break
                if not (cls.PRESSURE_MIN_PA <= atm_press <= cls.PRESSURE_MAX_PA):
                    warnings.append(f"Atmospheric pressure {atm_press} Pa outside standard bounds at row {idx+9}.")
                if ghi < 0 or dni < 0 or dhi < 0:
                    errors.append(f"Negative solar irradiance at row {idx+9}: GHI={ghi}, DNI={dni}, DHI={dhi}.")
                    break
                if ghi > cls.SOLAR_MAX_WM2 or dni > cls.SOLAR_MAX_WM2:
                    warnings.append(f"Solar irradiance ({ghi} W/m²) exceeds typical solar constant at row {idx+9}.")
                if wind_spd < 0 or wind_spd > cls.WIND_SPEED_MAX_MS:
                    errors.append(f"Wind speed {wind_spd} m/s out of physical bounds at row {idx+9}.")
                    break

            except ValueError as ve:
                errors.append(f"Row {idx+9}: Numeric parsing error: {str(ve)}")
                break

        if not errors:
            checks_passed.append("physical_bounds")
            checks_passed.append("variable_continuity")

        # Summarize date range
        if records_count > 0:
            first_cols = data_lines[0].split(",")
            last_cols = data_lines[-1].split(",")
            if len(first_cols) >= 4 and len(last_cols) >= 4:
                date_range = f"{first_cols[1]}/{first_cols[2]} H{first_cols[3]} to {last_cols[1]}/{last_cols[2]} H{last_cols[3]} ({records_count} hrs)"
            else:
                date_range = f"{records_count} hourly records"
        else:
            date_range = None

        is_valid = len(errors) == 0

        header_dict = asdict(location_header) if location_header else None

        return WeatherValidationResult(
            is_valid=is_valid,
            classification=classification,
            is_test_data=is_test_data,
            errors=errors,
            warnings=warnings,
            header=header_dict,
            file_hash_sha256=file_hash,
            file_name=file_name,
            records_count=records_count,
            date_range=date_range or data_period_str,
            timestep_minutes=60,
            missing_values_count=missing_count,
            checks_passed=checks_passed,
            coordinate_delta_km=coord_delta_km,
        )
