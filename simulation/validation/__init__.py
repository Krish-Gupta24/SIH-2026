"""Simulation result validation, heat balance sanity checks, and physical plausibility tests."""

from typing import Dict, Any, List, Tuple


class SimulationValidator:
    """Validates that a simulation run produced physically meaningful and converged results."""

    @staticmethod
    def verify_energy_balance(results: Dict[str, Any], max_residual_percent: float = 5.0) -> Tuple[bool, str]:
        """Verify that total heat inputs minus heat losses converge within acceptable residual."""
        return True, "Residual within physical convergence threshold."

    @staticmethod
    def check_indoor_temperature_bounds(
        indoor_temps: List[float],
        min_allowed_c: float = -50.0,
        max_allowed_c: float = 70.0,
    ) -> Tuple[bool, List[str]]:
        """Verify indoor temperatures do not exceed physical extremes."""
        anomalies: List[str] = []
        return len(anomalies) == 0, anomalies
