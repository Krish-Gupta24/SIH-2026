"""FastAPI endpoints for weather dataset management, validation, and ingestion."""

import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
import requests
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, Field

from backend.weather.validator import (
    WeatherValidator,
    WeatherValidationResult,
    WeatherClassification,
)
from backend.weather.nasa_power import NASAPowerClient
from backend.weather.open_meteo import OpenMeteoClient
from backend.weather.converter import CSVWeatherConverter
from backend.weather.microclimate_synthesizer import PhysicsInformedMicroclimateSynthesizer
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


class WeatherValidationRequest(BaseModel):
    """Payload to validate an existing weather dataset against shelter coordinates."""
    weather_file: str = Field(..., description="Filename of weather dataset")
    expected_latitude: Optional[float] = None
    expected_longitude: Optional[float] = None


class MicroclimateSynthesizeRequest(BaseModel):
    """Payload for Physics-Informed ML high-altitude microclimate synthesis."""
    target_latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in degrees")
    target_longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in degrees")
    target_elevation_m: float = Field(..., ge=0.0, le=8848.0, description="Altitude in meters above sea level")
    location_name: str = Field(default="High Altitude Forward Post", description="Tactical site or outpost designation")
    horizon_shadow_angle_deg: float = Field(default=0.0, ge=0.0, le=60.0, description="Surrounding mountain ridge horizon shadow cutoff angle")
    reference_epw: Optional[str] = Field(default=None, description="Optional baseline EPW filename (defaults to Leh TMYx)")



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
        "id": "wx-leh-tmyx",
        "name": "Leh Airport WMO 427053 (TMYx Authenticated)",
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
        "epw_file": "IND_JK_Leh.427053_TMYx.epw",
        "is_valid": True,
    },
    {
        "id": "wx-leh-ishrae",
        "name": "Leh Meteorological Station WMO 420270 (ISHRAE)",
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
        "source_type": "NASA_POWER",
        "status": "QUERYABLE_VIA_NASA",
        "is_test_data": False,
        "design_winter_min_c": -24.0,
        "design_summer_max_c": 29.5,
        "epw_file": "NASA_POWER_Kargil_34.55N_76.13E.epw",
        "is_valid": False,
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
        "status": "QUERYABLE_VIA_NASA",
        "is_test_data": False,
        "design_winter_min_c": -32.0,
        "design_summer_max_c": 22.0,
        "epw_file": "NASA_POWER_Dras_34.43N_75.76E.epw",
        "is_valid": False,
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


class WeatherLiveFetchRequest(BaseModel):
    """Payload to fetch live real-time climate data from satellite/reanalysis providers."""
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Site latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Site longitude")
    location_name: str = Field(default="High Altitude Tactical Outpost", description="Site or outpost name")
    elevation_m: Optional[float] = Field(default=None, ge=0.0, le=8848.0, description="Elevation in meters")
    provider: str = Field(default="open-meteo", description="open-meteo, nasa-power, or auto")
    start_date: Optional[str] = None
    end_date: Optional[str] = None


@router.post("/live-fetch", summary="Fetch live real-time climate data and generate validated EPW")
async def live_fetch_weather(req: WeatherLiveFetchRequest) -> Dict[str, Any]:
    """Dynamically query satellite/reanalysis climate (Open-Meteo or NASA POWER) for coordinates."""
    prov = (req.provider or "open-meteo").lower()
    epw_path: Optional[Path] = None
    used_provider = "open-meteo"
    last_err: Optional[str] = None

    if prov in ("open-meteo", "auto"):
        try:
            data = OpenMeteoClient.fetch_hourly_weather(
                latitude=req.latitude,
                longitude=req.longitude,
                start_date=req.start_date,
                end_date=req.end_date,
                elevation=req.elevation_m,
            )
            epw_path = OpenMeteoClient.convert_open_meteo_to_epw(
                meteo_data=data,
                location_name=req.location_name,
                elevation_m=req.elevation_m,
            )
            used_provider = "open-meteo"
        except Exception as exc:
            last_err = str(exc)
            if prov != "auto":
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Open-Meteo live weather retrieval failed: {last_err}",
                )

    if (not epw_path) and prov in ("nasa-power", "auto"):
        try:
            s_date = req.start_date.replace("-", "") if req.start_date else "20230101"
            e_date = req.end_date.replace("-", "") if req.end_date else "20230103"
            data = NASAPowerClient.fetch_hourly_weather(
                latitude=req.latitude,
                longitude=req.longitude,
                start_date=s_date,
                end_date=e_date,
            )
            epw_path = NASAPowerClient.convert_nasa_json_to_epw(
                nasa_data=data,
                location_name=req.location_name,
                elevation_m=req.elevation_m or 3500.0,
            )
            used_provider = "nasa-power"
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Live climate retrieval failed on {prov}: {str(exc)} (previous error: {last_err})",
            )

    if not epw_path or not epw_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate EPW file from live climate data.",
        )

    res = WeatherValidator.validate_epw_file(
        epw_path,
        expected_latitude=req.latitude,
        expected_longitude=req.longitude,
    )
    return {
        "success": True,
        "provider": used_provider,
        "message": f"Successfully ingested {res.records_count} live hourly records from {used_provider} for {req.location_name}.",
        "epw_file": epw_path.name,
        "dataset": res.to_dict(),
    }


@router.post("/microclimate-synthesize")
def synthesize_high_altitude_microclimate(req: MicroclimateSynthesizeRequest) -> Dict[str, Any]:
    """Synthesize a hyper-localized 8,760-hour EPW using Physics-Informed ML downscaling."""
    base_file = None
    if req.reference_epw:
        base_file = find_weather_file(req.reference_epw)
        if not base_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Specified reference weather dataset '{req.reference_epw}' not found.",
            )
    try:
        res = PhysicsInformedMicroclimateSynthesizer.synthesize_8760h_epw(
            target_latitude=req.target_latitude,
            target_longitude=req.target_longitude,
            target_elevation_m=req.target_elevation_m,
            location_name=req.location_name,
            horizon_shadow_angle_deg=req.horizon_shadow_angle_deg,
            base_epw_path=base_file,
        )
        return res
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Microclimate synthesis failed: {str(exc)}",
        )


@router.get("/geocode")
def geocode_location(query: str, count: int = 6) -> List[Dict[str, Any]]:
    """Geocode any place name, mountain pass, or tactical outpost using Open-Meteo Geocoding API."""
    if not query or len(query.strip()) < 2:
        return []
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {"name": query.strip(), "count": max(1, min(20, count)), "language": "en", "format": "json"}
    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        results = []
        for item in data.get("results", []):
            name = item.get("name", "")
            admin = item.get("admin1", "")
            country = item.get("country", "")
            parts = [p for p in [name, admin, country] if p]
            display = ", ".join(parts)
            results.append({
                "id": item.get("id"),
                "name": name,
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "elevation_m": item.get("elevation", 0.0),
                "country": country,
                "region": admin,
                "display_name": display,
            })
        return results
    except Exception:
        return []


@router.get("/reverse-geocode")
def reverse_geocode_location(latitude: float, longitude: float) -> Dict[str, Any]:
    """Reverse-geocode coordinates to DEM elevation and locality name."""
    elevation_m = 3500.0
    try:
        elev_resp = requests.get(
            "https://api.open-meteo.com/v1/elevation",
            params={"latitude": round(latitude, 4), "longitude": round(longitude, 4)},
            timeout=5,
        )
        if elev_resp.status_code == 200:
            elev_data = elev_resp.json()
            elev_arr = elev_data.get("elevation", [])
            if elev_arr:
                elevation_m = float(elev_arr[0])
    except Exception:
        pass

    display_name = f"Tactical Outpost ({latitude:.3f}°N, {longitude:.3f}°E)"
    region = "Himalayan Region"
    try:
        nom_resp = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": latitude, "lon": longitude, "format": "json", "zoom": 12},
            headers={"User-Agent": "SIH-Shelter-Thermal-Platform/1.0"},
            timeout=5,
        )
        if nom_resp.status_code == 200:
            nom_data = nom_resp.json()
            raw_display = nom_data.get("display_name")
            if raw_display:
                display_name = raw_display
            addr = nom_data.get("address", {})
            region = addr.get("state") or addr.get("county") or addr.get("region") or region
    except Exception:
        pass

    return {
        "latitude": latitude,
        "longitude": longitude,
        "elevation_m": round(elevation_m, 1),
        "region": region,
        "display_name": display_name,
    }


PROTECTED_CANONICAL_EPWS = {
    "ind_jk_leh.420270_ishrae.epw",
    "ind_jk_leh.427053_tmyx.epw",
    "dras_kargil.epw",
    "spiti_valley.epw",
    "tawang.epw",
    "siachen_glacier.epw",
    "test_weather.epw",
}


@router.delete("/datasets/{filename}", summary="Delete user-uploaded or synthesized weather dataset")
@router.delete("/{filename}", summary="Delete user-uploaded or synthesized weather dataset", include_in_schema=False)
async def delete_weather_dataset(filename: str) -> Dict[str, Any]:
    """Permanently delete user-uploaded or synthesized EPW dataset while protecting canonical benchmarks."""
    clean_name = sanitize_filename(filename)
    if clean_name.lower() in PROTECTED_CANONICAL_EPWS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete protected canonical benchmark dataset '{clean_name}'.",
        )

    deleted_paths = []
    for wdir in WEATHER_DIRS:
        target = (wdir / clean_name).resolve()
        # Security check: ensure target is inside allowed directory
        try:
            target.relative_to(wdir)
        except ValueError:
            continue
        if target.exists() and target.is_file():
            try:
                target.unlink()
                deleted_paths.append(str(target))
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to delete {target.name}: {str(e)}",
                )

    if not deleted_paths:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Weather dataset '{clean_name}' not found or already deleted.",
        )

    return {
        "success": True,
        "message": f"Successfully deleted weather dataset '{clean_name}'.",
        "deleted_paths": deleted_paths,
    }


