"""Simulation input generators (EnergyPlus IDF/epJSON, OpenStudio OSM, ANSYS journal/mesh)."""

from typing import Dict, Any, Protocol


class ModelGenerator(Protocol):
    """Protocol for translating canonical ShelterModel into engine-specific simulation inputs."""

    def generate(self, shelter: Dict[str, Any], output_path: str) -> str:
        """Generate simulation input file and return its path."""
        ...


class EnergyPlusIDFGenerator:
    """Translates ShelterModel geometry, envelope, and internal gains to EnergyPlus IDF / epJSON."""
    pass


class OpenStudioModelGenerator:
    """Translates ShelterModel to OpenStudio OSM format."""
    pass


class ANSYSJournalGenerator:
    """Translates ShelterModel geometry into ANSYS Fluent journal and boundary condition setup scripts."""
    pass
