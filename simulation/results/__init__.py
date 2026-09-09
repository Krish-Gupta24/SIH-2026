"""Normalized simulation results, metrics calculators, and engine-independent parsers."""

from simulation.results.result import (
    EngineMetadata,
    EnvelopeHeatTransfer,
    SolarPerformance,
    EnergyMetrics,
    ComfortMetrics,
    SimulationResult,
)
from simulation.results.metrics import MetricCalculator
from simulation.results.parser import ResultParser, EnergyPlusResultParser

__all__ = [
    "EngineMetadata",
    "EnvelopeHeatTransfer",
    "SolarPerformance",
    "EnergyMetrics",
    "ComfortMetrics",
    "SimulationResult",
    "MetricCalculator",
    "ResultParser",
    "EnergyPlusResultParser",
]
