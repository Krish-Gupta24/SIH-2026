"""Geographic and climatic location model."""

from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.models.base import BaseEntity


class Location(BaseEntity):
    """Geographic coordinates, altitude, and climatic classification for a project version."""

    __tablename__ = "locations"

    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    weather_dataset_id = Column(
        String(36),
        ForeignKey("weather_datasets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    region = Column(String(100), nullable=False)
    climate_zone = Column(String(50), nullable=False, index=True)
    latitude = Column(Float, nullable=False)   # degrees North (-90 to +90)
    longitude = Column(Float, nullable=False)  # degrees East (-180 to +180)
    elevation = Column(Float, nullable=False)  # meters above sea level

    # Relationships
    project_version = relationship("ProjectVersion", back_populates="location")
    weather_dataset = relationship("WeatherDataset", back_populates="locations")
