"""Backend simulation orchestration, worker task dispatcher, and adapter bridge."""

from typing import Protocol, Dict, Any


class SimulationEngineAdapter(Protocol):
    """Abstract protocol for all simulation engine adapters."""

    def run_simulation(self, shelter_model: Dict[str, Any], weather_path: str) -> Dict[str, Any]:
        """Execute simulation run and return raw result summary."""
        ...
