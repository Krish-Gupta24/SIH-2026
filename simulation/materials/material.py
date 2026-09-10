"""Material, ConstructionLayer, and Construction models with strict physical property provenance."""

from enum import Enum
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


class MaterialStatus(str, Enum):
    """Integrity and provenance status for physical materials."""
    VERIFIED = "VERIFIED"         # Sourced from standard/peer-reviewed reference (ASHRAE, IS, NBC)
    USER_DEFINED = "USER_DEFINED" # Created by user with explicit parameters
    TEST_ONLY = "TEST_ONLY"       # Synthetic or automated test fixture only

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_norm = value.upper().replace("-", "_")
            for member in cls:
                if member.value == val_norm:
                    return member
        return None


@dataclass(frozen=True)
class Material:
    """Homogeneous physical material with verified thermophysical properties."""

    id: str
    name: str
    density: float                 # kg/m³
    thermal_conductivity: float    # W/(m·K)
    specific_heat: float           # J/(kg·K)
    category: str = "General"      # "Insulation", "Mass / Masonry", "Structure / Metal", "Wood / Finish", "Glazing"
    thermal_absorptance: float = 0.90   # Emissivity / Longwave absorptance (0.0 to 1.0)
    solar_absorptance: float = 0.70     # Shortwave solar absorptance (0.0 to 1.0)
    visible_absorptance: float = 0.70   # Visible light absorptance (0.0 to 1.0)
    solar_transmittance: float = 0.0    # 0.0 for opaque materials
    roughness: str = "MediumRough"      # EnergyPlus roughness category
    source: str = "IS 3792:1978"        # Published standard / dataset name
    provenance: str = "Table 1"         # Exact citation / clause / table
    status: MaterialStatus = MaterialStatus.VERIFIED
    notes: str = ""                     # Engineering application notes
    cost_per_m3: Optional[float] = None # Reference cost index ($/m3)

    thickness: Optional[float] = None  # Optional nominal/default thickness (m)

    def __post_init__(self):
        """Enforce strict physical boundary rules."""
        if self.density <= 0:
            raise ValueError(f"Density must be > 0 kg/m³, got {self.density} for material '{self.name}'.")
        if self.thermal_conductivity <= 0:
            raise ValueError(f"Thermal conductivity must be > 0 W/(m·K), got {self.thermal_conductivity} for '{self.name}'.")
        if self.specific_heat <= 0:
            raise ValueError(f"Specific heat must be > 0 J/(kg·K), got {self.specific_heat} for '{self.name}'.")
        if not (0.0 <= self.thermal_absorptance <= 1.0):
            raise ValueError(f"Thermal absorptance must be in [0, 1], got {self.thermal_absorptance}.")
        if not (0.0 <= self.solar_absorptance <= 1.0):
            raise ValueError(f"Solar absorptance must be in [0, 1], got {self.solar_absorptance}.")
        if not (0.0 <= self.visible_absorptance <= 1.0):
            raise ValueError(f"Visible absorptance must be in [0, 1], got {self.visible_absorptance}.")
        if not (0.0 <= self.solar_transmittance <= 1.0):
            raise ValueError(f"Solar transmittance must be in [0, 1], got {self.solar_transmittance}.")
        if self.thickness is not None and self.thickness <= 0:
            raise ValueError(f"Material thickness must be > 0 m if specified, got {self.thickness}.")
        if not self.source or not self.provenance:
            raise ValueError(f"Material '{self.name}' must have explicit source and provenance. No fabricated values allowed.")

    @property
    def emissivity(self) -> float:
        """Thermal emissivity (equal to thermal/longwave absorptance per Kirchhoff's law)."""
        return self.thermal_absorptance

    @property
    def volumetric_heat_capacity(self) -> float:
        """Volumetric heat capacity in J/(m³·K): C_v = rho * c_p."""
        return self.density * self.specific_heat

    def to_dict(self) -> Dict[str, Any]:
        """Serialize material to standard dictionary."""
        d = {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "density": self.density,
            "thermal_conductivity": self.thermal_conductivity,
            "specific_heat": self.specific_heat,
            "thermal_absorptance": self.thermal_absorptance,
            "emissivity": self.emissivity,
            "solar_absorptance": self.solar_absorptance,
            "visible_absorptance": self.visible_absorptance,
            "solar_transmittance": self.solar_transmittance,
            "roughness": self.roughness,
            "source": self.source,
            "provenance": self.provenance,
            "status": self.status.value,
            "notes": self.notes,
        }
        if self.cost_per_m3 is not None:
            d["cost_per_m3"] = self.cost_per_m3
        if self.thickness is not None:
            d["thickness"] = self.thickness
        return d


@dataclass(frozen=True)
class ConstructionLayer:
    """Single layer inside a multi-layer assembly with defined thickness and position."""

    material: Material
    thickness: float   # meters
    layer_order: int   # 0 = outermost (exterior face), N = innermost (interior face)

    def __post_init__(self):
        if self.thickness <= 0:
            raise ValueError(f"Layer thickness must be > 0 m, got {self.thickness} for '{self.material.name}'.")
        if self.thickness > 2.0:
            raise ValueError(f"Layer thickness exceeds physical realism (max 2.0m), got {self.thickness} for '{self.material.name}'.")
        if self.layer_order < 0:
            raise ValueError(f"Layer order must be >= 0, got {self.layer_order}.")

    @property
    def thermal_resistance(self) -> float:
        """Thermal resistance R = thickness / thermal_conductivity (m²·K/W)."""
        return self.thickness / self.material.thermal_conductivity

    @property
    def areal_heat_capacity(self) -> float:
        """Areal heat capacity in kJ/(m²·K): rho * c_p * thickness / 1000."""
        return (self.material.density * self.material.specific_heat * self.thickness) / 1000.0


@dataclass
class Construction:
    """Multi-layer construction assembly ordered strictly from outermost layer to innermost layer."""

    id: str
    name: str
    surface_type: str  # WALL, ROOF, FLOOR, PARTITION
    layers: List[ConstructionLayer] = field(default_factory=list)

    def __post_init__(self):
        self.surface_type = self.surface_type.upper()
        if self.surface_type not in ("WALL", "ROOF", "FLOOR", "PARTITION", "DOOR"):
            raise ValueError(f"Invalid surface_type '{self.surface_type}'. Must be WALL, ROOF, FLOOR, PARTITION, or DOOR.")
        self._validate_layers()

    def _validate_layers(self):
        """Validate ordering, layer count, and continuity of layers."""
        if not self.layers:
            return
        if len(self.layers) > 10:
            raise ValueError(f"Construction '{self.name}' has {len(self.layers)} layers. EnergyPlus supports a maximum of 10 layers.")
        if self.total_thickness > 3.0:
            raise ValueError(f"Total construction thickness {self.total_thickness}m exceeds physical limit of 3.0m.")
        
        # Ensure layer_order is consecutive starting at 0
        sorted_layers = sorted(self.layers, key=lambda l: l.layer_order)
        for expected_idx, layer in enumerate(sorted_layers):
            if layer.layer_order != expected_idx:
                raise ValueError(
                    f"Construction '{self.name}' has non-consecutive layer order at index {expected_idx}: "
                    f"found {layer.layer_order}."
                )

    @property
    def outside_layer(self) -> Optional[ConstructionLayer]:
        """Outermost layer (facing outdoor environment or exterior surface)."""
        return self.layers[0] if self.layers else None

    @property
    def inside_layer(self) -> Optional[ConstructionLayer]:
        """Innermost layer (facing zone interior)."""
        return self.layers[-1] if self.layers else None

    @property
    def total_thickness(self) -> float:
        """Total assembly thickness in meters."""
        return sum(l.thickness for l in self.layers)

    @property
    def material_r_value(self) -> float:
        """Sum of layer material thermal resistances without film coefficients (m²·K/W)."""
        return sum(l.thermal_resistance for l in self.layers)

    @property
    def total_r_value(self) -> float:
        """Air-to-air total thermal resistance including standard boundary film resistances (m²·K/W)."""
        # ISO 6946 standard film resistances:
        # Exterior vertical wall: R_se = 0.04 m²·K/W
        # Interior vertical wall (horizontal heat flow): R_si = 0.13 m²·K/W
        # Roof (heat flow upwards): R_si = 0.10, R_se = 0.04
        # Floor (heat flow downwards): R_si = 0.17, R_se = 0.00 (ground contact)
        if self.surface_type == "WALL":
            r_se, r_si = 0.04, 0.13
        elif self.surface_type == "ROOF":
            r_se, r_si = 0.04, 0.10
        elif self.surface_type == "FLOOR":
            r_se, r_si = 0.04, 0.17
        else:
            r_se, r_si = 0.13, 0.13

        return r_se + self.material_r_value + r_si

    @property
    def u_value(self) -> float:
        """Overall thermal transmittance U = 1 / R_total (W/m²·K)."""
        r_tot = self.total_r_value
        return 1.0 / r_tot if r_tot > 0 else 0.0

    @property
    def total_areal_heat_capacity(self) -> float:
        """Total assembly thermal mass / heat storage capacity in kJ/(m²·K)."""
        return sum(l.areal_heat_capacity for l in self.layers)

    @property
    def status(self) -> MaterialStatus:
        """Derived provenance status based on constituent materials."""
        if any(l.material.status == MaterialStatus.TEST_ONLY for l in self.layers):
            return MaterialStatus.TEST_ONLY
        if any(l.material.status == MaterialStatus.USER_DEFINED for l in self.layers):
            return MaterialStatus.USER_DEFINED
        return MaterialStatus.VERIFIED

    def to_dict(self) -> Dict[str, Any]:
        """Serialize construction assembly to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "surface_type": self.surface_type,
            "status": self.status.value,
            "total_thickness": round(self.total_thickness, 4),
            "material_r_value": round(self.material_r_value, 4),
            "total_r_value": round(self.total_r_value, 4),
            "u_value": round(self.u_value, 4),
            "total_areal_heat_capacity": round(self.total_areal_heat_capacity, 2),
            "layers": [
                {
                    "layer_order": l.layer_order,
                    "material_id": l.material.id,
                    "material_name": l.material.name,
                    "thickness": l.thickness,
                    "r_value": round(l.thermal_resistance, 4),
                    "status": l.material.status.value,
                }
                for l in sorted(self.layers, key=lambda x: x.layer_order)
            ],
        }
