"""Subprocess runners and execution harnesses for simulation engines."""

from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class SimulationProcessResult:
    """Represents the low-level execution outcome of a simulation subprocess."""

    exit_code: int
    duration_seconds: float
    output_directory: str
    stdout: str
    stderr: str
    engine_name: str
    engine_version: str


class EnergyPlusRunner:
    """Executes headless EnergyPlus simulation runs as managed subprocesses."""
    pass


class OpenStudioRunner:
    """Executes OpenStudio CLI workflows."""
    pass


class ANSYSRunner:
    """Executes batch headless ANSYS Fluent/Mechanical solvers."""
    pass
