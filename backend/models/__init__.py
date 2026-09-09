"""SQLAlchemy domain entity models registry."""

from backend.core.database import Base
from backend.models.base import BaseEntity, TimestampMixin
from backend.models.user import User
from backend.models.project import Project, ProjectVersion
from backend.models.location import Location
from backend.models.weather import WeatherSource, WeatherDataset
from backend.models.material import Material, Construction, ConstructionLayer
from backend.models.envelope import Wall, Roof, Floor, Window, Door
from backend.models.thermal import ThermalMass, VentilationSetting, InternalLoad
from backend.models.simulation import SimulationRun, SimulationResult
from backend.models.optimization import OptimizationRun, OptimizationCandidate
from backend.models.report import Report

__all__ = [
    "Base",
    "BaseEntity",
    "TimestampMixin",
    "User",
    "Project",
    "ProjectVersion",
    "Location",
    "WeatherSource",
    "WeatherDataset",
    "Material",
    "Construction",
    "ConstructionLayer",
    "Wall",
    "Roof",
    "Floor",
    "Window",
    "Door",
    "ThermalMass",
    "VentilationSetting",
    "InternalLoad",
    "SimulationRun",
    "SimulationResult",
    "OptimizationRun",
    "OptimizationCandidate",
    "Report",
]
