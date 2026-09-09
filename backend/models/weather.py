"""Weather sources and climatic datasets models."""

from sqlalchemy import Column, String, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.models.base import BaseEntity


class WeatherSource(BaseEntity):
    """Catalog of weather providers and sources (e.g. EPW file library, NASA POWER API)."""

    __tablename__ = "weather_sources"

    source_type = Column(String(50), nullable=False, index=True)  # EPW, NASA_POWER, SYNTHETIC_DESIGN_DAY
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    provider = Column(String(100), nullable=False)  # ISHRAE, ASHRAE, NASA, ONEBUILDING, USER_UPLOAD

    # Relationships
    datasets = relationship(
        "WeatherDataset",
        back_populates="weather_source",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class WeatherDataset(BaseEntity):
    """Specific weather record, hourly dataset, or validated climate file."""

    __tablename__ = "weather_datasets"

    weather_source_id = Column(
        String(36),
        ForeignKey("weather_sources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    location_name = Column(String(255), nullable=False, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    elevation = Column(Float, nullable=False)  # meters
    climate_zone = Column(String(50), nullable=False, index=True)
    year = Column(Integer, nullable=True)
    file_path = Column(String(512), nullable=True)
    data_hash = Column(String(64), nullable=True)  # SHA-256 for data provenance verification

    # Cached physical indicators
    annual_heating_degree_days = Column(Float, nullable=True)  # HDD 18°C base
    annual_cooling_degree_days = Column(Float, nullable=True)  # CDD 18°C base
    min_dry_bulb_c = Column(Float, nullable=True)
    max_dry_bulb_c = Column(Float, nullable=True)

    # Justified JSON metadata for raw EPW header data
    metadata_json = Column(JSON, nullable=True)

    # Relationships
    weather_source = relationship("WeatherSource", back_populates="datasets")
    locations = relationship("Location", back_populates="weather_dataset")
    simulation_runs = relationship("SimulationRun", back_populates="weather_dataset")
