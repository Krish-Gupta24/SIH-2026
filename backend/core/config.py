"""Core configuration and settings module for the backend application."""

import os
from typing import List, Union, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "default-insecure-secret-key-change-in-production"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Area-Specific Shelter Thermal Simulation Platform"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/shelter_thermal_db"

    # Redis & Celery
    ENABLE_CELERY: bool = False
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # Simulation Engines
    ENERGYPLUS_DIR: str = r"C:\EnergyPlusV24-1-0"
    ENERGYPLUS_EXE: str = r"C:\EnergyPlusV24-1-0\energyplus.exe"
    OPENSTUDIO_EXE: str = r"C:\openstudio-3.7.0\bin\openstudio.exe"  # Reserved for future extension; primary solver is EnergyPlus 24.1.0
    ANSYS_DIR: str = r"C:\Program Files\ANSYS Inc\v241"
    ANSYS_FLUENT_EXE: Optional[str] = None
    ANSYSLMD_LICENSE_FILE: Optional[str] = None
    SIMULATION_TEMP_DIR: str = "./storage/simulations"
    SIMULATION_TIMEOUT_SECONDS: int = 600

    # Weather
    NASA_POWER_BASE_URL: str = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    OPEN_METEO_API_KEY: Optional[str] = None
    WEATHER_CACHE_DIR: str = "./storage/weather"

    # Storage
    STORAGE_ROOT: str = "./storage"
    REPORTS_DIR: str = "./storage/reports"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Security & Resource Throttling
    MAX_CONCURRENT_SIMULATIONS: int = 4
    MAX_SIMULATION_TIMEOUT_SECONDS: int = 1800
    MAX_REQUEST_BODY_BYTES: int = 15 * 1024 * 1024  # 15 MB
    RATE_LIMIT_SIMULATION_PER_MINUTE: int = 15
    RATE_LIMIT_GENERAL_PER_MINUTE: int = 60

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_clean = v.strip()
            if v_clean == "*":
                return ["*"]
            if v_clean.startswith("["):
                import json
                try:
                    return json.loads(v_clean)
                except Exception:
                    pass
            return [i.strip() for i in v_clean.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_production_secret(cls, v: str, info) -> str:
        """Enforce strong, non-default secret key when running in production."""
        # Check environment from values if available
        env = os.environ.get("ENVIRONMENT", "development").lower()
        if env == "production":
            if "default-insecure" in v or len(v) < 32:
                raise ValueError(
                    "SECURITY CRITICAL: Default or weak SECRET_KEY detected in production environment. "
                    "You must supply a cryptographically secure 32+ character SECRET_KEY."
                )
        return v


settings = Settings()

