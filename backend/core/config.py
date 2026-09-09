"""Core configuration and settings module for the backend application."""

import os
from typing import List, Union
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
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # Simulation Engines
    ENERGYPLUS_DIR: str = r"C:\EnergyPlusV24-1-0"
    ENERGYPLUS_EXE: str = r"C:\EnergyPlusV24-1-0\energyplus.exe"
    OPENSTUDIO_EXE: str = r"C:\openstudio-3.7.0\bin\openstudio.exe"
    ANSYS_DIR: str = r"C:\Program Files\ANSYS Inc\v241"
    SIMULATION_TEMP_DIR: str = "./storage/simulations"
    SIMULATION_TIMEOUT_SECONDS: int = 600

    # Weather
    NASA_POWER_BASE_URL: str = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    WEATHER_CACHE_DIR: str = "./storage/weather"

    # Storage
    STORAGE_ROOT: str = "./storage"
    REPORTS_DIR: str = "./storage/reports"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
