"""Simulation runner and parser contract test."""

from simulation.validation import SimulationValidator


def test_temperature_bounds_validator():
    """Verify temperature bounds checker flags unreasonable physical values."""
    valid_temps = [-15.0, -10.0, 5.0, 18.0, 21.0]
    is_valid, anomalies = SimulationValidator.check_indoor_temperature_bounds(valid_temps)
    assert is_valid is True
    assert len(anomalies) == 0

    unphysical_temps = [20.0, 150.0]  # Unphysical zone temperature
    is_valid, anomalies = SimulationValidator.check_indoor_temperature_bounds(unphysical_temps)
    assert is_valid is False
    assert len(anomalies) > 0
