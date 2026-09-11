"""FastAPI endpoints for weather dataset management, validation, and ingestion."""

import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, Field

from backend.weather.validator import (
    WeatherValidator,
    WeatherValidationResult,
    WeatherClassification,
)
from backend.weather.nasa_power import NASAPowerClient
from backend.weather.converter import CSVWeatherConverter, ManualWeatherGenerator
from backend.core.path_security import sanitize_filename

router = APIRouter()

WEATHER_DIRS = [
    Path("storage/weather").resolve(),
    Path("simulation/weather").resolve(),
]


class NASAPowerRequest(BaseModel):
    """Payload for fetching NASA POWER satellite meteorological data."""
    location_name: str = Field(default="High Altitude Outpost", description="Site or project name")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in degrees")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in degrees")
    elevation_m: float = Field(default=3500.0, ge=0.0, le=8848.0, description="Elevation in meters")
    start_date: str = Field(default="20230101", pattern=r"^\d{8}$", description="Start date (YYYYMMDD)")
    end_date: str = Field(default="20230103", pattern=r"^\d{8}$", description="End date (YYYYMMDD)")


class ManualWeatherRequest(BaseModel):
    """Payload for synthesizing user-defined engineering weather."""
    location_name: str = Field(default="Extreme Cold Wave Design Day")
    latitude: float = Field(default=34.1526, ge=-90.0, le=90.0)
    longitude: float = Field(default=77.5771, ge=-180.0, le=180.0)
    elevation_m: float = Field(default=3500.0, ge=0.0, le=8848.0)
    design_winter_min_c: float = Field(default=-25.0, ge=-70.0, le=20.0)
    design_summer_max_c: float = Field(default=22.0, ge=-10.0, le=50.0)
    diurnal_range_c: float = Field(default=14.0, ge=2.0, le=35.0)
    peak_solar_dni_wm2: float = Field(default=850.0, ge=0.0, le=1400.0)
    wind_speed_ms: float = Field(default=3.5, ge=0.0, le=50.0)
    num_days: int = Field(default=3, ge=1, le=365)


class WeatherValidationRequest(BaseModel):
    """Payload to validate an existing weather dataset against shelter coordinates."""
    weather_file: str = Field(..., description="Filename of weather dataset")
    expected_latitude: Optional[float] = None
    expected_longitude: Optional[float] = None


def find_weather_file(filename: str) -> Optional[Path]:
    """Safely locate weather dataset across allowed storage directories."""
    clean_name = sanitize_filename(filename)
    for wdir in WEATHER_DIRS:
        cand = wdir / clean_name
        if cand.is_file():
            return cand
    return None


CATALOG_REGIONAL_SOURCES: List[Dict[str, Any]] = [
    {
        "id": "wx-leh-airport",
        "name": "Leh Airport Meteorological Station (3500m)",
        "region": "Leh, Ladakh, India",
        "latitude": 34.1526,
        "longitude": 77.5771,
        "elevation_m": 3500.0,
        "climate_zone": "Cold / Extreme Alpine (ASHRAE 8)",
        "source_type": "EPW",
        "status": "REAL_DATA",
        "is_test_data": False,
        "design_winter_min_c": -20.5,
        "design_summer_max_c": 28.0,
        "epw_file": "IND_JK_Leh.420270_ISHRAE.epw",
        "is_valid": True,
    },
    {
        "id": "wx-kargil-outpost",
        "name": "Kargil Outpost Meteorological Station",
        "region": "Kargil, Ladakh, India",
        "latitude": 34.5539,
        "longitude": 76.1311,
        "elevation_m": 2676.0,
        "climate_zone": "Extreme Cold Continental",
        "source_type": "EPW",
        "status": "REAL_DATA",
        "is_test_data": False,
        "design_winter_min_c": -24.0,
        "design_summer_max_c": 29.5,
        "epw_file": "IND_JK_Kargil.epw",
        "is_valid": True,
    },
    {
        "id": "wx-dras-valley",
        "name": "Dras Valley Extreme Meteorological Station",
        "region": "Dras, Ladakh, India",
        "latitude": 34.4294,
        "longitude": 75.7547,
        "elevation_m": 3280.0,
        "climate_zone": "Sub-Arctic Mountain / Extreme Alpine",
        "source_type": "NASA_POWER",
        "status": "REAL_DATA",
        "is_test_data": False,
        "design_winter_min_c": -32.0,
        "design_summer_max_c": 22.0,
        "epw_file": "NASA_POWER_Dras_34.43N_75.76E.epw",
        "is_valid": True,
    },
]


@router.get("", summary="List all available weather sources and validated climate datasets")
@router.get("/", summary="List all available weather sources and validated climate datasets", include_in_schema=False)
@router.get("/sources", summary="List all available weather sources and validated climate datasets")
@router.get("/datasets", summary="List all available weather sources and validated climate datasets")
async def list_weather_sources() -> List[Dict[str, Any]]:
    """Scan and return all validated EPW weather files and registered meteorological sources."""
    sources: List[Dict[str, Any]] = list(CATALOG_REGIONAL_SOURCES)
    seen_hashes = set()

    for wdir in WEATHER_DIRS:
        if not wdir.exists():
            continue
        for epw_file in wdir.glob("*.epw"):
            try:
                res = WeatherValidator.validate_epw_file(epw_file)
                h = res.file_hash_sha256
                if h in seen_hashes:
                    continue
                seen_hashes.add(h)

                loc = res.header or {}
                sources.append({
                    "id": f"wx-{res.file_hash_sha256[:8]}",
                    "name": loc.get("city") or epw_file.stem,
                    "region": f"{loc.get('state_province', '')}, {loc.get('country', '')}".strip(", "),
                    "latitude": loc.get("latitude", 0.0),
                    "longitude": loc.get("longitude", 0.0),
                    "elevation_m": loc.get("elevation_m", 0.0),
                    "climate_zone": "Alpine Cold (ASHRAE 8)" if loc.get("elevation_m", 0) > 2500 else "Standard",
                    "source_type": res.classification.value,
                    "status": res.classification.value,
                    "is_test_data": res.is_test_data,
                    "epw_file": epw_file.name,
                    "date_range": res.date_range,
                    "records_count": res.records_count,
                    "sha256": res.file_hash_sha256,
                    "is_valid": res.is_valid,
                })
            except Exception:
                continue

    return sources


@router.post("/validate", summary="Validate weather dataset and verify coordinate consistency")
async def validate_weather(req: WeatherValidationRequest) -> Dict[str, Any]:
    """Perform deep physical and spatial validation on an EPW dataset."""
    epw_path = find_weather_file(req.weather_file)
    if not epw_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Weather file not found: {req.weather_file}. Silent fallback to test weather is strictly prohibited.",
        )

    res = WeatherValidator.validate_epw_file(
        epw_path,
        expected_latitude=req.expected_latitude,
        expected_longitude=req.expected_longitude,
    )
    return res.to_dict()


@router.post("/upload/epw", summary="Upload and validate a new EPW weather dataset")
async def upload_epw_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Accept user EPW upload, validate headers and physics, and store in storage/weather."""
    if not file.filename or not file.filename.lower().endswith(".epw"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have an .epw extension.",
        )

    clean_name = sanitize_filename(file.filename)
    target_dir = Path("storage/weather").resolve()
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / clean_name

    with open(target_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    res = WeatherValidator.validate_epw_file(target_path)
    if not res.is_valid:
        # Remove corrupted upload
        try:
            target_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Uploaded EPW file failed validation checks.", "errors": res.errors},
        )

    return {
        "success": True,
        "message": f"Successfully validated and registered EPW weather file: {clean_name}",
        "dataset": res.to_dict(),
    }


@router.post("/upload/csv", summary="Upload CSV station data and convert to EPW")
async def upload_csv_file(
    file: UploadFile = File(...),
    location_name: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    elevation_m: float = Form(...),
) -> Dict[str, Any]:
    """Convert tabular meteorological station logger CSV to standard EPW."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a .csv extension.",
        )

    content_bytes = await file.read()
    csv_str = content_bytes.decode("utf-8", errors="replace")

    try:
        epw_path = CSVWeatherConverter.convert_csv_to_epw(
            csv_content=csv_str,
            location_name=location_name,
            latitude=latitude,
            longitude=longitude,
            elevation_m=elevation_m,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"CSV conversion failed: {str(exc)}",
        )

    res = WeatherValidator.validate_epw_file(epw_path, expected_latitude=latitude, expected_longitude=longitude)
    return {
        "success": True,
        "message": f"CSV converted and validated as {epw_path.name}",
        "dataset": res.to_dict(),
    }


@router.post("/nasa-power", summary="Query NASA POWER hourly satellite climate data")
async def fetch_nasa_power_weather(req: NASAPowerRequest) -> Dict[str, Any]:
    """Fetch live satellite hourly data from NASA POWER and generate compliant EPW file."""
    try:
        data = NASAPowerClient.fetch_hourly_weather(
            latitude=req.latitude,
            longitude=req.longitude,
            start_date=req.start_date,
            end_date=req.end_date,
        )
        epw_path = NASAPowerClient.convert_nasa_json_to_epw(
            nasa_data=data,
            location_name=req.location_name,
            elevation_m=req.elevation_m,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"NASA POWER API retrieval failed: {str(exc)}",
        )

    res = WeatherValidator.validate_epw_file(
        epw_path,
        expected_latitude=req.latitude,
        expected_longitude=req.longitude,
    )
    return {
        "success": True,
        "message": f"Retrieved {res.records_count} hourly records from NASA POWER.",
        "dataset": res.to_dict(),
    }


@router.post("/manual", summary="Generate user-defined engineering design weather")
async def generate_manual_weather(req: ManualWeatherRequest) -> Dict[str, Any]:
    """Synthesize physics-consistent multi-day EPW file tagged explicitly as USER_DEFINED."""
    try:
        epw_path = ManualWeatherGenerator.generate_custom_weather(
            location_name=req.location_name,
            latitude=req.latitude,
            longitude=req.longitude,
            elevation_m=req.elevation_m,
            design_winter_min_c=req.design_winter_min_c,
            design_summer_max_c=req.design_summer_max_c,
            diurnal_range_c=req.diurnal_range_c,
            peak_solar_dni_wm2=req.peak_solar_dni_wm2,
            wind_speed_ms=req.wind_speed_ms,
            num_days=req.num_days,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Manual weather generation failed: {str(exc)}",
        )

    res = WeatherValidator.validate_epw_file(epw_path, expected_latitude=req.latitude, expected_longitude=req.longitude)
    return {
        "success": True,
        "message": f"Generated user-defined weather dataset {epw_path.name}",
        "dataset": res.to_dict(),
    }
