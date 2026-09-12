"""Material and multi-layer construction assembly models."""

# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Text, Float, Boolean, Integer, ForeignKey, UniqueConstraint, Index
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from backend.models.base import BaseEntity


class Material(BaseEntity):
    """Homogeneous physical material with verified thermophysical properties."""

    __tablename__ = "materials"

    name = Column(String(255), nullable=False, index=True)
    conductivity = Column(Float, nullable=False)          # W/(m·K)
    density = Column(Float, nullable=False)               # kg/m³
    specific_heat = Column(Float, nullable=False)         # J/(kg·K)
    roughness = Column(String(50), default="MediumRough", nullable=False)
    thermal_absorptance = Column(Float, default=0.9, nullable=False)
    solar_absorptance = Column(Float, default=0.7, nullable=False)
    visible_absorptance = Column(Float, default=0.7, nullable=False)

    # Provenance tracking (mandatory non-fabrication rule)
    provenance = Column(String(255), nullable=False)
    source_database = Column(String(100), nullable=False, index=True)
    is_user_defined = Column(Boolean, default=False, nullable=False, index=True)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    creator = relationship("User", back_populates="custom_materials")
    construction_layers = relationship("ConstructionLayer", back_populates="material")
    thermal_masses = relationship("ThermalMass", back_populates="material")


class Construction(BaseEntity):
    """Multi-layer construction assembly (wall, roof, floor, or internal partition)."""

    __tablename__ = "constructions"

    name = Column(String(255), nullable=False, index=True)
    surface_type = Column(String(50), nullable=False, index=True)  # WALL, ROOF, FLOOR, PARTITION
    description = Column(Text, nullable=True)

    # Pre-calculated thermophysical characteristics (derived from layers)
    u_value_calculated = Column(Float, nullable=True)  # W/(m²·K)
    r_value_calculated = Column(Float, nullable=True)  # (m²·K)/W
    total_thickness = Column(Float, nullable=True)     # meters

    # Relationships
    layers = relationship(
        "ConstructionLayer",
        back_populates="construction",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ConstructionLayer.layer_order",
    )
    walls = relationship("Wall", back_populates="construction")
    roofs = relationship("Roof", back_populates="construction")
    floors = relationship("Floor", back_populates="construction")


class ConstructionLayer(BaseEntity):
    """Single layer inside a multi-layer construction assembly with defined thickness and position."""

    __tablename__ = "construction_layers"

    construction_id = Column(
        String(36),
        ForeignKey("constructions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    material_id = Column(
        String(36),
        ForeignKey("materials.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    layer_order = Column(Integer, nullable=False)  # 0 = outermost (exterior), N = innermost (interior)
    thickness = Column(Float, nullable=False)      # meters

    # Constraints
    __table_args__ = (
        UniqueConstraint("construction_id", "layer_order", name="uq_construction_layer_order"),
    )

    # Relationships
    construction = relationship("Construction", back_populates="layers")
    material = relationship("Material", back_populates="construction_layers")


# Alias for backward-compatibility
MaterialEntity = Material

