"""Envelope geometry and fenestration models: Walls, Roofs, Floors, Windows, and Doors."""

from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.models.base import BaseEntity


class Wall(BaseEntity):
    """External vertical surface bounding the shelter thermal zone."""

    __tablename__ = "walls"

    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    construction_id = Column(
        String(36),
        ForeignKey("constructions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    cardinal_direction = Column(String(20), nullable=False, index=True)  # NORTH, SOUTH, EAST, WEST
    azimuth_deg = Column(Float, nullable=False)   # 0 to 360 degrees (0 = North, 90 = East, etc.)
    length = Column(Float, nullable=False)        # meters
    height = Column(Float, nullable=False)        # meters
    solar_absorptance = Column(Float, default=0.7, nullable=False)

    # Relationships
    project_version = relationship("ProjectVersion", back_populates="walls")
    construction = relationship("Construction", back_populates="walls")
    windows = relationship(
        "Window",
        back_populates="wall",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    doors = relationship(
        "Door",
        back_populates="wall",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Roof(BaseEntity):
    """External upper surface bounding the shelter thermal zone."""

    __tablename__ = "roofs"

    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    construction_id = Column(
        String(36),
        ForeignKey("constructions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    roof_type = Column(String(50), default="SHED", nullable=False)  # FLAT, SHED, GABLE, HIP
    slope_deg = Column(Float, default=0.0, nullable=False)          # pitch in degrees
    area = Column(Float, nullable=False)                            # gross surface area in m²
    azimuth_deg = Column(Float, default=0.0, nullable=False)        # slope facing azimuth
    solar_absorptance = Column(Float, default=0.7, nullable=False)

    # Relationships
    project_version = relationship("ProjectVersion", back_populates="roofs")
    construction = relationship("Construction", back_populates="roofs")


class Floor(BaseEntity):
    """Bottom boundary surface in ground or ambient air contact."""

    __tablename__ = "floors"

    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    construction_id = Column(
        String(36),
        ForeignKey("constructions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    area = Column(Float, nullable=False)                          # m²
    perimeter = Column(Float, nullable=False)                     # meters
    floor_elevation = Column(Float, default=0.0, nullable=False)  # meters above surrounding grade
    ground_contact = Column(Boolean, default=True, nullable=False)
    perimeter_insulation_depth = Column(Float, default=0.0, nullable=False)  # meters

    # Relationships
    project_version = relationship("ProjectVersion", back_populates="floors")
    construction = relationship("Construction", back_populates="floors")


class Window(BaseEntity):
    """Glazed sub-surface hosted within a Wall."""

    __tablename__ = "windows"

    wall_id = Column(
        String(36),
        ForeignKey("walls.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(100), nullable=False)
    width = Column(Float, nullable=False)          # meters
    height = Column(Float, nullable=False)         # meters
    sill_height = Column(Float, nullable=False)    # meters above finished floor
    position_x = Column(Float, default=0.0, nullable=False)  # offset from wall origin

    # Thermophysical glazing properties
    glass_u_value = Column(Float, nullable=False)  # W/(m²·K)
    glass_shgc = Column(Float, nullable=False)     # Solar Heat Gain Coefficient (0 to 1)
    glass_vlt = Column(Float, default=0.7, nullable=False)  # Visible light transmittance
    frame_conductance = Column(Float, default=4.5, nullable=False)  # W/(m²·K)
    overhang_depth = Column(Float, default=0.0, nullable=False)     # meters

    # Relationships
    wall = relationship("Wall", back_populates="windows")
    project_version = relationship("ProjectVersion")


class Door(BaseEntity):
    """Opaque or semi-glazed access opening hosted within a Wall."""

    __tablename__ = "doors"

    wall_id = Column(
        String(36),
        ForeignKey("walls.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    construction_id = Column(
        String(36),
        ForeignKey("constructions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name = Column(String(100), nullable=False)
    width = Column(Float, nullable=False)          # meters
    height = Column(Float, nullable=False)         # meters
    position_x = Column(Float, default=0.0, nullable=False)  # offset from wall origin
    u_value = Column(Float, nullable=False)        # W/(m²·K)

    # Relationships
    wall = relationship("Wall", back_populates="doors")
    project_version = relationship("ProjectVersion")
    construction = relationship("Construction")
