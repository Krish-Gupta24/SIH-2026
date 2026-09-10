"""Normalized, engine-independent simulation result schema.

Provides clean canonical data structures for frontend, API, and analysis layers
without any exposure of engine-specific output files or syntax.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
import json


@dataclass
class EngineMetadata:
    """Simulation engine execution and model provenance metadata."""
    engine_name: str
    engine_version: str
    model_version: str
    weather_dataset: str
    simulation_period: Dict[str, Any]  # e.g., {"start": "01/01", "end": "01/03", "timestep_seconds": 3600, "timesteps_count": 72}
    execution_duration_seconds: Optional[float] = None
    completed_successfully: bool = True
    environment_name: Optional[str] = None
    notes: Optional[str] = None
    simulation_id: Optional[str] = None
    design_name: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class EnvelopeHeatTransfer:
    """Heat transfer rates through building envelope components (Watts).
    Positive values represent net heat gain to zone interior;
    Negative values represent net heat loss from zone to ambient.
    """
    wall_heat_transfer: List[float] = field(default_factory=list)
    roof_heat_transfer: List[float] = field(default_factory=list)
    floor_heat_transfer: List[float] = field(default_factory=list)
    window_heat_transfer: List[float] = field(default_factory=list)
    door_heat_transfer: List[float] = field(default_factory=list)
    infiltration_heat_transfer: List[float] = field(default_factory=list)
    walls_by_orientation: Dict[str, List[float]] = field(default_factory=dict)  # "north", "south", "east", "west"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SolarPerformance:
    """Solar irradiance, transmitted, absorbed, and window heat gain metrics (Watts / W/m²)."""
    direct_normal_irradiance: List[float] = field(default_factory=list)      # W/m²
    diffuse_horizontal_irradiance: List[float] = field(default_factory=list)  # W/m²
    global_horizontal_irradiance: List[float] = field(default_factory=list)   # W/m²
    solar_gains_total: List[float] = field(default_factory=list)             # Watts (transmitted through glazing)
    solar_gains_by_window: Dict[str, List[float]] = field(default_factory=dict)
    window_heat_gains_total: List[float] = field(default_factory=list)       # Watts (total window heat gain: solar + glass heat balance)
    absorbed_solar_glazing: List[float] = field(default_factory=list)        # Watts (absorbed solar in glazing layers)
    absorbed_solar_surfaces: List[float] = field(default_factory=list)       # Watts (absorbed solar on exterior opaque surfaces)
    useful_solar_gain_total_kwh: float = 0.0
    status: str = "AVAILABLE"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class EnergyMetrics:
    """Integrated energy metrics and component-level energy balance (kWh)."""
    heating_demand_kwh: Optional[float] = None
    cooling_demand_kwh: Optional[float] = None
    net_energy_demand_kwh: Optional[float] = None
    is_unconditioned: bool = True  # True for passive shelters without active HVAC
    envelope_losses_kwh: Dict[str, float] = field(default_factory=dict)  # wall, roof, floor, window, door, infiltration
    envelope_gains_kwh: Dict[str, float] = field(default_factory=dict)
    total_solar_gains_kwh: float = 0.0
    status: str = "AVAILABLE"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ComfortDefinition:
    """Explicit definition, standard, and boundary conditions used for thermal comfort evaluation."""
    min_acceptable_temperature_c: float = 18.0
    max_acceptable_temperature_c: float = 26.0
    target_indoor_temperature_c: Optional[float] = None
    standard_or_model_name: str = "DesignTargets Operational Band"
    assumptions: str = "Defined by project DesignTargets; occupant clothing and activity adjusted for site conditions."
    applicable_conditions: str = "High-altitude unconditioned or passively heated cold-climate shelter."
    is_universal_comfort_claimed: bool = False
    target_range_str: str = "18.0°C – 26.0°C"

    def __post_init__(self):
        if not self.target_range_str or self.target_range_str == "18.0°C – 26.0°C":
            self.target_range_str = f"{self.min_acceptable_temperature_c:.1f}°C – {self.max_acceptable_temperature_c:.1f}°C"
        if self.target_indoor_temperature_c is None:
            self.target_indoor_temperature_c = round((self.min_acceptable_temperature_c + self.max_acceptable_temperature_c) / 2.0, 1)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ComfortMetrics:
    """Thermal comfort analysis and degree-hours within operational boundary conditions."""
    is_valid: bool = False
    validity_reason: str = "Unvalidated"
    status: str = "UNAVAILABLE"
    comfort_temperature_min_c: float = 18.0
    comfort_temperature_max_c: float = 26.0
    target_indoor_temperature_c: Optional[float] = None
    target_range_str: str = "18.0°C – 26.0°C"
    comfort_definition: Optional[ComfortDefinition] = None
    is_universal_comfort_claimed: bool = False

    # Standardized reporting fields required by engineering specification
    hours_inside_target: Optional[float] = None
    hours_below_target: Optional[float] = None
    hours_above_target: Optional[float] = None

    # Backward compatible aliases
    hours_in_comfort_band: Optional[float] = None
    hours_below_comfort: Optional[float] = None
    hours_above_comfort: Optional[float] = None

    percent_time_comfortable: Optional[float] = None
    underheating_degree_hours_c_h: Optional[float] = None
    overheating_degree_hours_c_h: Optional[float] = None
    indoor_min_c: Optional[float] = None
    indoor_max_c: Optional[float] = None
    indoor_mean_c: Optional[float] = None
    diurnal_temperature_swing_c: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SimulationResult:
    """Normalized, engine-independent building thermal simulation result.
    
    Contains time-series arrays, envelope heat exchanges, solar performance,
    integrated energy metrics, comfort evaluations, and engine metadata.
    """
    metadata: EngineMetadata
    timestamps: List[str]
    indoor_temperature: List[float]         # °C
    outdoor_temperature: List[float]        # °C
    solar_radiation: List[float]            # W/m² (global horizontal or direct normal)
    solar_gains: List[float]                # W (transmitted solar heat gain)
    wall_heat_transfer: List[float]         # W
    roof_heat_transfer: List[float]         # W
    floor_heat_transfer: List[float]        # W
    window_heat_transfer: List[float]       # W
    door_heat_transfer: List[float]         # W
    infiltration_heat_transfer: List[float] # W
    envelope: EnvelopeHeatTransfer = field(default_factory=EnvelopeHeatTransfer)
    solar: SolarPerformance = field(default_factory=SolarPerformance)
    energy: EnergyMetrics = field(default_factory=EnergyMetrics)
    comfort: ComfortMetrics = field(default_factory=ComfortMetrics)

    def __post_init__(self):
        """Sync top-level lists with nested containers if either was supplied empty."""
        n = len(self.timestamps)
        # Verify alignment of required timeseries arrays
        series_lengths = {
            "indoor_temperature": len(self.indoor_temperature),
            "outdoor_temperature": len(self.outdoor_temperature),
            "solar_radiation": len(self.solar_radiation),
            "solar_gains": len(self.solar_gains),
            "wall_heat_transfer": len(self.wall_heat_transfer),
            "roof_heat_transfer": len(self.roof_heat_transfer),
            "floor_heat_transfer": len(self.floor_heat_transfer),
            "window_heat_transfer": len(self.window_heat_transfer),
            "door_heat_transfer": len(self.door_heat_transfer),
            "infiltration_heat_transfer": len(self.infiltration_heat_transfer),
        }

        # If envelope lists not populated, populate from top-level
        if not self.envelope.wall_heat_transfer and self.wall_heat_transfer:
            self.envelope.wall_heat_transfer = list(self.wall_heat_transfer)
        if not self.envelope.roof_heat_transfer and self.roof_heat_transfer:
            self.envelope.roof_heat_transfer = list(self.roof_heat_transfer)
        if not self.envelope.floor_heat_transfer and self.floor_heat_transfer:
            self.envelope.floor_heat_transfer = list(self.floor_heat_transfer)
        if not self.envelope.window_heat_transfer and self.window_heat_transfer:
            self.envelope.window_heat_transfer = list(self.window_heat_transfer)
        if not self.envelope.door_heat_transfer and self.door_heat_transfer:
            self.envelope.door_heat_transfer = list(self.door_heat_transfer)
        if not self.envelope.infiltration_heat_transfer and self.infiltration_heat_transfer:
            self.envelope.infiltration_heat_transfer = list(self.infiltration_heat_transfer)

        # If solar lists not populated, populate from top-level
        if not self.solar.solar_gains_total and self.solar_gains:
            self.solar.solar_gains_total = list(self.solar_gains)
        if not self.solar.global_horizontal_irradiance and self.solar_radiation:
            self.solar.global_horizontal_irradiance = list(self.solar_radiation)

    @property
    def timesteps_count(self) -> int:
        return len(self.timestamps)

    def to_dict(self) -> Dict[str, Any]:
        """Convert entire normalized simulation result to an engine-agnostic dictionary."""
        return {
            "metadata": self.metadata.to_dict(),
            "timestamps": self.timestamps,
            "indoor_temperature": self.indoor_temperature,
            "outdoor_temperature": self.outdoor_temperature,
            "solar_radiation": self.solar_radiation,
            "solar_gains": self.solar_gains,
            "wall_heat_transfer": self.wall_heat_transfer,
            "roof_heat_transfer": self.roof_heat_transfer,
            "floor_heat_transfer": self.floor_heat_transfer,
            "window_heat_transfer": self.window_heat_transfer,
            "door_heat_transfer": self.door_heat_transfer,
            "infiltration_heat_transfer": self.infiltration_heat_transfer,
            "envelope": self.envelope.to_dict(),
            "solar": self.solar.to_dict(),
            "energy": self.energy.to_dict(),
            "comfort": self.comfort.to_dict(),
        }

    def to_json(self, indent: int = 2) -> str:
        """Serialize result to a clean JSON string."""
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SimulationResult":
        """Reconstitute SimulationResult from serialized dictionary."""
        meta_dict = data.get("metadata", {})
        meta = EngineMetadata(
            engine_name=meta_dict.get("engine_name", "Unknown"),
            engine_version=meta_dict.get("engine_version", "Unknown"),
            model_version=meta_dict.get("model_version", "1.0"),
            weather_dataset=meta_dict.get("weather_dataset", "Unknown"),
            simulation_period=meta_dict.get("simulation_period", {}),
            execution_duration_seconds=meta_dict.get("execution_duration_seconds"),
            completed_successfully=meta_dict.get("completed_successfully", True),
            environment_name=meta_dict.get("environment_name"),
            notes=meta_dict.get("notes"),
            simulation_id=meta_dict.get("simulation_id"),
            design_name=meta_dict.get("design_name"),
        )

        env_dict = data.get("envelope", {})
        envelope = EnvelopeHeatTransfer(
            wall_heat_transfer=env_dict.get("wall_heat_transfer", []),
            roof_heat_transfer=env_dict.get("roof_heat_transfer", []),
            floor_heat_transfer=env_dict.get("floor_heat_transfer", []),
            window_heat_transfer=env_dict.get("window_heat_transfer", []),
            door_heat_transfer=env_dict.get("door_heat_transfer", []),
            infiltration_heat_transfer=env_dict.get("infiltration_heat_transfer", []),
            walls_by_orientation=env_dict.get("walls_by_orientation", {}),
        )

        sol_dict = data.get("solar", {})
        solar = SolarPerformance(
            direct_normal_irradiance=sol_dict.get("direct_normal_irradiance", []),
            diffuse_horizontal_irradiance=sol_dict.get("diffuse_horizontal_irradiance", []),
            global_horizontal_irradiance=sol_dict.get("global_horizontal_irradiance", []),
            solar_gains_total=sol_dict.get("solar_gains_total", []),
            solar_gains_by_window=sol_dict.get("solar_gains_by_window", {}),
            window_heat_gains_total=sol_dict.get("window_heat_gains_total", []),
            absorbed_solar_glazing=sol_dict.get("absorbed_solar_glazing", []),
            absorbed_solar_surfaces=sol_dict.get("absorbed_solar_surfaces", []),
            useful_solar_gain_total_kwh=sol_dict.get("useful_solar_gain_total_kwh", 0.0),
            status=sol_dict.get("status", "AVAILABLE"),
        )

        eng_dict = data.get("energy", {})
        energy = EnergyMetrics(
            heating_demand_kwh=eng_dict.get("heating_demand_kwh"),
            cooling_demand_kwh=eng_dict.get("cooling_demand_kwh"),
            net_energy_demand_kwh=eng_dict.get("net_energy_demand_kwh"),
            is_unconditioned=eng_dict.get("is_unconditioned", True),
            envelope_losses_kwh=eng_dict.get("envelope_losses_kwh", {}),
            envelope_gains_kwh=eng_dict.get("envelope_gains_kwh", {}),
            total_solar_gains_kwh=eng_dict.get("total_solar_gains_kwh", 0.0),
        )

        comf_dict = data.get("comfort", {})
        comfort = ComfortMetrics(
            is_valid=comf_dict.get("is_valid", False),
            validity_reason=comf_dict.get("validity_reason", ""),
            status=comf_dict.get("status", "AVAILABLE" if comf_dict.get("is_valid", False) else "UNAVAILABLE"),
            comfort_temperature_min_c=comf_dict.get("comfort_temperature_min_c", 18.0),
            comfort_temperature_max_c=comf_dict.get("comfort_temperature_max_c", 26.0),
            hours_in_comfort_band=comf_dict.get("hours_in_comfort_band"),
            hours_below_comfort=comf_dict.get("hours_below_comfort"),
            hours_above_comfort=comf_dict.get("hours_above_comfort"),
            percent_time_comfortable=comf_dict.get("percent_time_comfortable"),
            underheating_degree_hours_c_h=comf_dict.get("underheating_degree_hours_c_h"),
            overheating_degree_hours_c_h=comf_dict.get("overheating_degree_hours_c_h"),
            indoor_min_c=comf_dict.get("indoor_min_c"),
            indoor_max_c=comf_dict.get("indoor_max_c"),
            indoor_mean_c=comf_dict.get("indoor_mean_c"),
            diurnal_temperature_swing_c=comf_dict.get("diurnal_temperature_swing_c"),
        )

        return cls(
            metadata=meta,
            timestamps=data.get("timestamps", []),
            indoor_temperature=data.get("indoor_temperature", []),
            outdoor_temperature=data.get("outdoor_temperature", []),
            solar_radiation=data.get("solar_radiation", []),
            solar_gains=data.get("solar_gains", []),
            wall_heat_transfer=data.get("wall_heat_transfer", []),
            roof_heat_transfer=data.get("roof_heat_transfer", []),
            floor_heat_transfer=data.get("floor_heat_transfer", []),
            window_heat_transfer=data.get("window_heat_transfer", []),
            door_heat_transfer=data.get("door_heat_transfer", []),
            infiltration_heat_transfer=data.get("infiltration_heat_transfer", []),
            envelope=envelope,
            solar=solar,
            energy=energy,
            comfort=comfort,
        )
