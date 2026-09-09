"""Verified physical materials database and construction assembly catalog."""

from simulation.materials.material import (
    Material,
    MaterialStatus,
    ConstructionLayer,
    Construction,
)
from simulation.materials.database import (
    MaterialDatabase,
    material_db,
    INITIAL_TEST_MATERIALS,
)

__all__ = [
    "Material",
    "MaterialStatus",
    "ConstructionLayer",
    "Construction",
    "MaterialDatabase",
    "material_db",
    "INITIAL_TEST_MATERIALS",
]
