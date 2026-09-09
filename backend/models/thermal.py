"""Thermal mass, ventilation, and internal heat gain models."""

from sqlalchemy import Column, String, Float, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from backend.models.base import BaseEntity


class ThermalMass(BaseEntity):
    """Internal thermal storage capacitance (e.g. internal stone wall, water drum, Trombe storage)."""

    __tablename__ = "thermal_masses"

    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    material_id = Column(
        String(36),
        ForeignKey("materials.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name = Column(String(100), nullable=False)
    surface_area = Column(Float, nullable=False)      # m²
    thickness = Column(Float, nullable=False)         # meters
    exposed_fraction = Column(Float, default=1.0, nullable=False)  # fraction of surface in contact with zone air

    # Relationships
    project_version = relationship("ProjectVersion", back_populates="thermal_masses")
    material = relationship("Material", back_populates="thermal_masses")


class VentilationSetting(BaseEntity):
    """Air exchange rates, infiltration baseline, and heat recovery parameters."""

    __tablename__ = "ventilation_settings"

    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    air_changes_per_hour_infiltration = Column(Float, default=0.5, nullable=False)  # ACH at natural pressure
    natural_ventilation_ach = Column(Float, default=0.0, nullable=False)            # ACH
    mechanical_ventilation_ach = Column(Float, default=0.0, nullable=False)         # ACH
    heat_recovery_efficiency = Column(Float, default=0.0, nullable=False)           # 0.0 to 1.0 sensible recovery
    night_flushing_enabled = Column(Boolean, default=False, nullable=False)

    # Relationships
    project_version = relationship("ProjectVersion", back_populates="ventilation_settings")


class InternalLoad(BaseEntity):
    """Sensible and latent heat gains from occupants, lighting, and internal plug loads."""

    __tablename__ = "internal_loads"

    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    occupant_count = Column(Integer, default=2, nullable=False)
    occupant_heat_gain_w = Column(Float, default=115.0, nullable=False)       # Watts/person sensible+latent
    lighting_power_density_w_per_m2 = Column(Float, default=3.0, nullable=False)  # W/m²
    equipment_power_density_w_per_m2 = Column(Float, default=2.0, nullable=False) # W/m²
    schedule_profile_type = Column(String(50), default="CONTINUOUS_OCCUPANCY", nullable=False)

    # Relationships
    project_version = relationship("ProjectVersion", back_populates="internal_loads")
