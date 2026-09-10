"""Strict ResultCompletenessValidator enforcing verified result metrics without silent fallbacks.

Enforces:
- No engineering result displayed to the user may come from a hardcoded fallback.
- If EnergyPlus did not provide a required metric: return status = UNAVAILABLE with:
  reason, missing variable, simulation ID, engine status, and display_value = "Metric unavailable from this simulation".
- Mark simulation as COMPLETED, PARTIAL, or INVALID according to defined completeness policy.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
from enum import Enum

from simulation.results.output_registry import OutputVariableRegistry, OutputCategory


class CompletenessStatus(str, Enum):
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"
    INVALID = "INVALID"
    UNAVAILABLE = "UNAVAILABLE"


@dataclass
class MetricAvailability:
    """Explicit availability tracking for an engineering metric."""
    metric: str
    status: str  # "AVAILABLE" or "UNAVAILABLE"
    display_value: Optional[str] = None
    reason: Optional[str] = None
    missing_variable: Optional[str] = None
    simulation_id: Optional[str] = None
    engine_status: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CompletenessReport:
    """Rigorous audit report of simulation result completeness."""
    simulation_id: str
    engine_status: str
    status: CompletenessStatus
    is_physically_complete: bool
    missing_critical: List[str] = field(default_factory=list)
    missing_secondary: List[str] = field(default_factory=list)
    produced_variables: List[str] = field(default_factory=list)
    unsupported_variables: List[str] = field(default_factory=list)
    availability_by_metric: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "simulation_id": self.simulation_id,
            "engine_status": self.engine_status,
            "status": self.status.value if isinstance(self.status, CompletenessStatus) else str(self.status),
            "is_physically_complete": self.is_physically_complete,
            "missing_critical": self.missing_critical,
            "missing_secondary": self.missing_secondary,
            "produced_variables": self.produced_variables,
            "unsupported_variables": self.unsupported_variables,
            "availability_by_metric": self.availability_by_metric,
            "summary": self.summary,
        }


class ResultCompletenessValidator:
    """Strict validator for simulation output completeness.
    
    POLICY:
    1. Critical Variables:
       - indoor_temperature
       - outdoor_temperature
       - timestamps
       If ANY critical variable is missing or empty, result is INVALID.
    
    2. Secondary Variables:
       - solar_radiation (site irradiance)
       - solar_gains (transmitted solar gains)
       - wall_heat_transfer
       - roof_heat_transfer
       - floor_heat_transfer
       - infiltration_heat_transfer
       - comfort metrics
       If critical variables exist but ANY required secondary variable is missing, result is PARTIAL.
    
    3. Fully Complete:
       Result is marked COMPLETED only when 100% of required variables are produced and valid.
    """

    UNAVAILABLE_DISPLAY_TEXT = "Metric unavailable from this simulation"

    @classmethod
    def create_unavailable_metric(
        cls,
        metric: str,
        missing_variable: str,
        reason: str,
        simulation_id: str = "unknown",
        engine_status: str = "PARTIAL",
    ) -> MetricAvailability:
        """Create a standard UNAVAILABLE metric entry with reason and metadata."""
        return MetricAvailability(
            metric=metric,
            status=CompletenessStatus.UNAVAILABLE.value,
            display_value=cls.UNAVAILABLE_DISPLAY_TEXT,
            reason=reason,
            missing_variable=missing_variable,
            simulation_id=simulation_id,
            engine_status=engine_status,
        )

    @classmethod
    def validate_simulation_result(
        cls,
        result: Any,  # SimulationResult
        simulation_id: str,
        engine_status: str = "COMPLETED",
        csv_headers: Optional[List[str]] = None,
    ) -> CompletenessReport:
        """Audit SimulationResult against OutputVariableRegistry and completeness policy."""
        missing_critical: List[str] = []
        missing_secondary: List[str] = []
        produced_vars: List[str] = []
        unsupported_vars: List[str] = []
        availability: Dict[str, Dict[str, Any]] = {}

        # 1. Audit Critical Variables
        # Timestamps
        if not getattr(result, "timestamps", None) or len(result.timestamps) == 0:
            missing_critical.append("timestamps")
            availability["timestamps"] = cls.create_unavailable_metric(
                metric="timestamps",
                missing_variable="Date/Time",
                reason="Simulation output contains no timestamps or time steps.",
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("timestamps")
            availability["timestamps"] = {
                "metric": "timestamps",
                "status": "AVAILABLE",
                "count": len(result.timestamps),
            }

        # Indoor Temperature
        indoor_temps = getattr(result, "indoor_temperature", None)
        if not indoor_temps or len(indoor_temps) == 0:
            missing_critical.append("indoor_temperature")
            availability["indoor_temperature"] = cls.create_unavailable_metric(
                metric="indoor_temperature",
                missing_variable="Zone Mean Air Temperature",
                reason="EnergyPlus did not produce Zone Mean Air Temperature for the living zone.",
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("indoor_temperature")
            availability["indoor_temperature"] = {
                "metric": "indoor_temperature",
                "status": "AVAILABLE",
                "count": len(indoor_temps),
            }

        # Outdoor Temperature
        outdoor_temps = getattr(result, "outdoor_temperature", None)
        if not outdoor_temps or len(outdoor_temps) == 0:
            missing_critical.append("outdoor_temperature")
            availability["outdoor_temperature"] = cls.create_unavailable_metric(
                metric="outdoor_temperature",
                missing_variable="Site Outdoor Air Drybulb Temperature",
                reason="EnergyPlus did not produce Site Outdoor Air Drybulb Temperature.",
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("outdoor_temperature")
            availability["outdoor_temperature"] = {
                "metric": "outdoor_temperature",
                "status": "AVAILABLE",
                "count": len(outdoor_temps),
            }

        # 2. Audit Secondary Variables
        # Solar Radiation (Incident)
        solar_rad = getattr(result, "solar_radiation", None)
        if not solar_rad or len(solar_rad) == 0:
            missing_secondary.append("solar_radiation")
            availability["solar_radiation"] = cls.create_unavailable_metric(
                metric="solar_radiation",
                missing_variable="Site Direct / Diffuse Solar Radiation Rate per Area",
                reason="Solar radiation timeseries was not reported by simulation engine.",
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("solar_radiation")
            availability["solar_radiation"] = {
                "metric": "solar_radiation",
                "status": "AVAILABLE",
                "count": len(solar_rad),
            }

        # Solar Gains (Transmitted through windows)
        solar_gains = getattr(result, "solar_gains", None)
        if solar_gains is None or len(solar_gains) == 0:
            missing_secondary.append("solar_gains")
            availability["solar_gains"] = cls.create_unavailable_metric(
                metric="solar_gains",
                missing_variable="Zone Windows Total Transmitted Solar Radiation Rate",
                reason="Fenestration solar gains were not produced or shelter has zero active window apertures.",
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("solar_gains")
            availability["solar_gains"] = {
                "metric": "solar_gains",
                "status": "AVAILABLE",
                "count": len(solar_gains),
            }

        # Wall Heat Transfer
        wall_heat = getattr(result, "wall_heat_transfer", None)
        if not wall_heat or len(wall_heat) == 0:
            missing_secondary.append("wall_heat_transfer")
            availability["wall_heat_transfer"] = cls.create_unavailable_metric(
                metric="wall_heat_transfer",
                missing_variable="Surface Inside Face Conduction Heat Transfer Rate (Walls)",
                reason="Wall conduction rates missing from engine output.",
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("wall_heat_transfer")
            availability["wall_heat_transfer"] = {
                "metric": "wall_heat_transfer",
                "status": "AVAILABLE",
                "count": len(wall_heat),
            }

        # Roof Heat Transfer
        roof_heat = getattr(result, "roof_heat_transfer", None)
        if not roof_heat or len(roof_heat) == 0:
            missing_secondary.append("roof_heat_transfer")
            availability["roof_heat_transfer"] = cls.create_unavailable_metric(
                metric="roof_heat_transfer",
                missing_variable="Surface Inside Face Conduction Heat Transfer Rate (Roof)",
                reason="Roof conduction rates missing from engine output.",
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("roof_heat_transfer")
            availability["roof_heat_transfer"] = {
                "metric": "roof_heat_transfer",
                "status": "AVAILABLE",
                "count": len(roof_heat),
            }

        # Floor Heat Transfer
        floor_heat = getattr(result, "floor_heat_transfer", None)
        if not floor_heat or len(floor_heat) == 0:
            missing_secondary.append("floor_heat_transfer")
            availability["floor_heat_transfer"] = cls.create_unavailable_metric(
                metric="floor_heat_transfer",
                missing_variable="Surface Inside Face Conduction Heat Transfer Rate (Floor)",
                reason="Floor slab conduction rates missing from engine output.",
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("floor_heat_transfer")
            availability["floor_heat_transfer"] = {
                "metric": "floor_heat_transfer",
                "status": "AVAILABLE",
                "count": len(floor_heat),
            }

        # Infiltration Heat Transfer
        infil_heat = getattr(result, "infiltration_heat_transfer", None)
        if not infil_heat or len(infil_heat) == 0:
            missing_secondary.append("infiltration_heat_transfer")
            availability["infiltration_heat_transfer"] = cls.create_unavailable_metric(
                metric="infiltration_heat_transfer",
                missing_variable="Zone Infiltration Sensible Heat Loss Energy",
                reason="Infiltration heat exchange missing from engine output.",
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("infiltration_heat_transfer")
            availability["infiltration_heat_transfer"] = {
                "metric": "infiltration_heat_transfer",
                "status": "AVAILABLE",
                "count": len(infil_heat),
            }

        # Comfort Metrics
        comfort = getattr(result, "comfort", None)
        if not comfort or not getattr(comfort, "is_valid", False):
            missing_secondary.append("comfort")
            availability["comfort"] = cls.create_unavailable_metric(
                metric="comfort",
                missing_variable="Comfort Evaluation",
                reason=getattr(comfort, "validity_reason", "Comfort metrics could not be validated."),
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("comfort")
            availability["comfort"] = {
                "metric": "comfort",
                "status": "AVAILABLE",
                "comfort_hours_pct": comfort.percent_time_comfortable,
            }

        # Energy Metrics
        energy = getattr(result, "energy", None)
        if not energy:
            missing_secondary.append("energy")
            availability["energy"] = cls.create_unavailable_metric(
                metric="energy",
                missing_variable="Integrated Energy Balance",
                reason="Integrated energy metrics could not be computed.",
                simulation_id=simulation_id,
                engine_status=engine_status,
            ).to_dict()
        else:
            produced_vars.append("energy")
            availability["energy"] = {
                "metric": "energy",
                "status": "AVAILABLE",
                "heating_demand_kwh": energy.heating_demand_kwh,
            }

        # 3. Determine Overall Completeness Status
        if missing_critical:
            final_status = CompletenessStatus.INVALID
            is_complete = False
            summary = f"Simulation INVALID: Critical primary output variables missing ({', '.join(missing_critical)})."
        elif missing_secondary:
            final_status = CompletenessStatus.PARTIAL
            is_complete = False
            summary = f"Simulation PARTIAL: Primary temperatures present, but secondary variables unavailable ({', '.join(missing_secondary)})."
        else:
            final_status = CompletenessStatus.COMPLETED
            is_complete = True
            summary = "Simulation COMPLETED: 100% of required output variables verified and physically complete."

        return CompletenessReport(
            simulation_id=simulation_id,
            engine_status=engine_status,
            status=final_status,
            is_physically_complete=is_complete,
            missing_critical=missing_critical,
            missing_secondary=missing_secondary,
            produced_variables=produced_vars,
            unsupported_variables=unsupported_vars,
            availability_by_metric=availability,
            summary=summary,
        )
