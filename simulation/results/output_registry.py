"""Centralized Output Variable Registry for EnergyPlus and RC simulation engines.

Maps canonical engineering metrics to:
- EnergyPlus exact output variable names
- Units of measurement
- Reporting frequency
- Internal parser keys
- Physical concept classification
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Union
from enum import Enum
from pathlib import Path


class OutputCategory(str, Enum):
    SOLAR = "SOLAR"
    TEMPERATURE = "TEMPERATURE"
    ENVELOPE = "ENVELOPE"
    INFILTRATION = "INFILTRATION"
    COMFORT = "COMFORT"
    ENERGY = "ENERGY"


@dataclass(frozen=True)
class OutputVariableSpec:
    """Rigorous specification for an engine output variable."""
    metric: str
    ep_variable_name: str
    unit: str
    frequency: str
    parser_key: str
    category: OutputCategory
    concept: str
    is_required: bool = True
    applies_to: str = "*"  # "*" or specific component type like "Window", "Zone", "Surface"
    description: str = ""


class OutputVariableRegistry:
    """Central registry of all verified EnergyPlus output variables."""

    _VARIABLES: List[OutputVariableSpec] = [
        # =====================================================================
        # 1. SOLAR RADIATION CONCEPTS
        # =====================================================================
        # 1.1 Incident Solar Radiation
        OutputVariableSpec(
            metric="site_direct_solar_radiation",
            ep_variable_name="Site Direct Solar Radiation Rate per Area",
            unit="W/m2",
            frequency="Hourly",
            parser_key="solar_direct_normal_irradiance",
            category=OutputCategory.SOLAR,
            concept="incident solar radiation",
            is_required=True,
            description="Direct normal solar irradiance beam component incident at ground site",
        ),
        OutputVariableSpec(
            metric="site_diffuse_solar_radiation",
            ep_variable_name="Site Diffuse Solar Radiation Rate per Area",
            unit="W/m2",
            frequency="Hourly",
            parser_key="solar_diffuse_horizontal_irradiance",
            category=OutputCategory.SOLAR,
            concept="incident solar radiation",
            is_required=True,
            description="Diffuse horizontal solar irradiance component from sky dome",
        ),
        OutputVariableSpec(
            metric="surface_incident_solar_radiation",
            ep_variable_name="Surface Outside Face Incident Solar Radiation Rate per Area",
            unit="W/m2",
            frequency="Hourly",
            parser_key="surface_incident_solar_radiation",
            category=OutputCategory.SOLAR,
            concept="incident solar radiation",
            is_required=False,
            description="Total beam plus diffuse solar irradiance incident on each exterior surface",
        ),

        # 1.2 Transmitted Solar Radiation
        OutputVariableSpec(
            metric="surface_window_transmitted_solar_rate",
            ep_variable_name="Surface Window Transmitted Solar Radiation Rate",
            unit="W",
            frequency="Hourly",
            parser_key="solar_gains_by_window",
            category=OutputCategory.SOLAR,
            concept="transmitted solar radiation where supported",
            is_required=True,
            description="Instantaneous rate of transmitted beam and diffuse solar radiation through specific window glazing",
        ),
        OutputVariableSpec(
            metric="surface_window_transmitted_solar_energy",
            ep_variable_name="Surface Window Transmitted Solar Radiation Energy",
            unit="J",
            frequency="Hourly",
            parser_key="solar_gains_total_energy_j",
            category=OutputCategory.SOLAR,
            concept="transmitted solar radiation (total useful solar gain)",
            is_required=True,
            description="Cumulative integrated solar heat energy transmitted into zone across timestep",
        ),

        # 1.3 Absorbed Solar Gains
        OutputVariableSpec(
            metric="surface_outside_face_solar_absorption_rate",
            ep_variable_name="Surface Outside Face Solar Radiation Heat Gain Rate",
            unit="W",
            frequency="Hourly",
            parser_key="opaque_surface_absorbed_solar_rate",
            category=OutputCategory.SOLAR,
            concept="absorbed solar gains where supported",
            is_required=False,
            description="Solar radiation absorbed at the outside face of opaque exterior surfaces",
        ),
        OutputVariableSpec(
            metric="window_glazing_absorbed_solar_rate",
            ep_variable_name="Surface Window Total Glazing Layers Absorbed Solar Radiation Rate",
            unit="W",
            frequency="Hourly",
            parser_key="window_glazing_absorbed_solar_rate",
            category=OutputCategory.SOLAR,
            concept="absorbed solar gains where supported",
            is_required=False,
            description="Total solar radiation absorbed across all glass and gas layers in window assembly",
        ),
        OutputVariableSpec(
            metric="surface_inside_face_solar_radiation_gain_rate",
            ep_variable_name="Surface Inside Face Solar Radiation Heat Gain Rate",
            unit="W",
            frequency="Hourly",
            parser_key="surface_inside_face_solar_heat_gain_rate",
            category=OutputCategory.SOLAR,
            concept="absorbed solar gains where supported",
            is_required=False,
            description="Solar radiation transmitted through windows and absorbed by interior zone surfaces",
        ),

        # 1.4 Solar Heat Gain Through Windows (Conduction + Radiation)
        OutputVariableSpec(
            metric="zone_windows_total_heat_gain_rate",
            ep_variable_name="Zone Windows Total Heat Gain Rate",
            unit="W",
            frequency="Hourly",
            parser_key="window_total_heat_gain_rate",
            category=OutputCategory.SOLAR,
            concept="solar heat gain through windows",
            is_required=True,
            description="Total net heat gain into zone via windows, including transmitted solar and glass conduction",
        ),
        OutputVariableSpec(
            metric="zone_windows_total_heat_loss_rate",
            ep_variable_name="Zone Windows Total Heat Loss Rate",
            unit="W",
            frequency="Hourly",
            parser_key="window_total_heat_loss_rate",
            category=OutputCategory.SOLAR,
            concept="solar heat gain through windows",
            is_required=True,
            description="Total heat loss rate from zone out through windows to cold exterior",
        ),

        # =====================================================================
        # 2. TEMPERATURE & THERMAL PERFORMANCE
        # =====================================================================
        OutputVariableSpec(
            metric="indoor_temperature",
            ep_variable_name="Zone Mean Air Temperature",
            unit="C",
            frequency="Hourly",
            parser_key="indoor_temperature",
            category=OutputCategory.TEMPERATURE,
            concept="indoor air temperature",
            is_required=True,
            description="Volume-averaged indoor zone air temperature",
        ),
        OutputVariableSpec(
            metric="outdoor_temperature",
            ep_variable_name="Site Outdoor Air Drybulb Temperature",
            unit="C",
            frequency="Hourly",
            parser_key="outdoor_temperature",
            category=OutputCategory.TEMPERATURE,
            concept="outdoor ambient temperature",
            is_required=True,
            description="Exterior dry-bulb air temperature from weather dataset",
        ),

        # =====================================================================
        # 3. ENVELOPE HEAT CONDUCTION & STORAGE
        # =====================================================================
        OutputVariableSpec(
            metric="surface_inside_conduction_rate",
            ep_variable_name="Surface Inside Face Conduction Heat Transfer Rate",
            unit="W",
            frequency="Hourly",
            parser_key="surface_inside_conduction_rate",
            category=OutputCategory.ENVELOPE,
            concept="envelope heat conduction",
            is_required=True,
            description="Conduction heat transfer rate at inside face of opaque/transparent surfaces",
        ),
        OutputVariableSpec(
            metric="surface_outside_conduction_rate",
            ep_variable_name="Surface Outside Face Conduction Heat Transfer Rate",
            unit="W",
            frequency="Hourly",
            parser_key="surface_outside_conduction_rate",
            category=OutputCategory.ENVELOPE,
            concept="envelope heat conduction",
            is_required=False,
            description="Conduction heat transfer rate at outside face of envelope surfaces",
        ),

        # =====================================================================
        # 4. INFILTRATION & AIR LEAKAGE
        # =====================================================================
        OutputVariableSpec(
            metric="zone_infiltration_sensible_loss_energy",
            ep_variable_name="Zone Infiltration Sensible Heat Loss Energy",
            unit="J",
            frequency="Hourly",
            parser_key="infiltration_loss_energy",
            category=OutputCategory.INFILTRATION,
            concept="air infiltration sensible heat loss",
            is_required=True,
            description="Sensible heat energy loss resulting from cold air infiltrating building envelope",
        ),
        OutputVariableSpec(
            metric="zone_infiltration_sensible_gain_energy",
            ep_variable_name="Zone Infiltration Sensible Heat Gain Energy",
            unit="J",
            frequency="Hourly",
            parser_key="infiltration_gain_energy",
            category=OutputCategory.INFILTRATION,
            concept="air infiltration sensible heat gain",
            is_required=True,
            description="Sensible heat energy gain resulting from warmer outdoor air entering zone",
        ),
        OutputVariableSpec(
            metric="zone_infiltration_ach",
            ep_variable_name="Zone Infiltration Air Change Rate",
            unit="ach",
            frequency="Hourly",
            parser_key="infiltration_ach",
            category=OutputCategory.INFILTRATION,
            concept="air infiltration volume flow",
            is_required=True,
            description="Infiltration air changes per hour for zone",
        ),
        OutputVariableSpec(
            metric="zone_infiltration_flow_rate",
            ep_variable_name="Zone Infiltration Current Density Volume Flow Rate",
            unit="m3/s",
            frequency="Hourly",
            parser_key="infiltration_m3_s",
            category=OutputCategory.INFILTRATION,
            concept="air infiltration volume flow",
            is_required=True,
            description="Infiltration volumetric flow rate at current zone air density",
        ),
    ]

    @classmethod
    def get_all(cls) -> List[OutputVariableSpec]:
        """Return all registered output variable specifications."""
        return list(cls._VARIABLES)

    @classmethod
    def get_by_category(cls, category: OutputCategory) -> List[OutputVariableSpec]:
        """Return variable specs filtered by category."""
        return [v for v in cls._VARIABLES if v.category == category]

    @classmethod
    def get_by_concept(cls, concept_substring: str) -> List[OutputVariableSpec]:
        """Return variable specs matching a specific physical concept."""
        sub = concept_substring.lower()
        return [v for v in cls._VARIABLES if sub in v.concept.lower()]

    @classmethod
    def get_solar_variables(cls) -> List[OutputVariableSpec]:
        """Return all solar-related output variable specifications."""
        return cls.get_by_category(OutputCategory.SOLAR)

    @classmethod
    def get_required_variables(cls) -> List[OutputVariableSpec]:
        """Return output variable specs marked as mandatory."""
        return [v for v in cls._VARIABLES if v.is_required]

    @classmethod
    def get_idf_output_lines(cls) -> List[str]:
        """Generate deduplicated EnergyPlus IDF Output:Variable statements."""
        lines = []
        seen = set()
        for spec in cls._VARIABLES:
            stmt = f"Output:Variable, {spec.applies_to}, {spec.ep_variable_name}, {spec.frequency};"
            if stmt not in seen:
                seen.add(stmt)
                lines.append(stmt)
        return lines

    @classmethod
    def get_mapping_table(cls) -> List[Dict[str, str]]:
        """Return tabular metric -> ep_variable -> unit -> frequency -> parser_key mapping."""
        return [
            {
                "metric": v.metric,
                "ep_variable": v.ep_variable_name,
                "unit": v.unit,
                "frequency": v.frequency,
                "parser_key": v.parser_key,
                "concept": v.concept,
                "is_required": str(v.is_required),
            }
            for v in cls._VARIABLES
        ]

    @classmethod
    def audit_output_directory(cls, output_dir: Union[str, Path]) -> Dict[str, Any]:
        """Audit EnergyPlus simulation artifacts in output_dir against registered variables.
        
        Inspects:
        - eplusout.rdd (supported variables in installed EnergyPlus version)
        - eplusout.csv (actually produced variables)
        
        Returns dict with produced, missing, unsupported, and concept status.
        """
        import csv
        from pathlib import Path

        out_path = Path(output_dir)
        rdd_file = out_path / "eplusout.rdd"
        csv_file = out_path / "eplusout.csv"

        supported_in_rdd = set()
        if rdd_file.exists():
            with open(rdd_file, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    if "," in line:
                        parts = line.split(",")
                        if len(parts) >= 3:
                            var_and_unit = parts[2].strip()
                            var_name = var_and_unit.split("[")[0].strip()
                            supported_in_rdd.add(var_name.lower())

        produced_headers: List[str] = []
        if csv_file.exists():
            with open(csv_file, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                produced_headers = next(reader, [])

        produced_headers_clean = [h.strip() for h in produced_headers]

        produced = []
        missing = []
        unsupported = []

        for spec in cls._VARIABLES:
            var_lower = spec.ep_variable_name.lower()
            is_supported = (var_lower in supported_in_rdd) if supported_in_rdd else True
            is_produced = any(var_lower in h.lower() for h in produced_headers_clean)

            info = {
                "metric": spec.metric,
                "ep_variable_name": spec.ep_variable_name,
                "unit": spec.unit,
                "frequency": spec.frequency,
                "parser_key": spec.parser_key,
                "category": spec.category.value,
                "concept": spec.concept,
                "is_required": spec.is_required,
            }

            if is_produced:
                produced.append(info)
            elif is_supported:
                missing.append(info)
            else:
                unsupported.append(info)

        # 5 Required Solar Concepts breakdown
        solar_concepts = [
            "incident solar radiation",
            "transmitted solar radiation where supported",
            "absorbed solar gains where supported",
            "solar heat gain through windows",
            "total useful solar gain",
        ]

        concepts_status = {}
        for sc in solar_concepts:
            sc_specs = cls.get_by_concept(sc)
            sc_produced = [s.metric for s in sc_specs if any(p["metric"] == s.metric for p in produced)]
            sc_missing = [s.metric for s in sc_specs if any(m["metric"] == s.metric for m in missing)]
            sc_unsupported = [s.metric for s in sc_specs if any(u["metric"] == s.metric for u in unsupported)]
            concepts_status[sc] = {
                "total_registered": len(sc_specs),
                "produced_count": len(sc_produced),
                "produced_metrics": sc_produced,
                "missing_metrics": sc_missing,
                "unsupported_metrics": sc_unsupported,
                "all_produced": len(sc_produced) == len(sc_specs),
            }

        return {
            "output_directory": str(out_path),
            "total_registered": len(cls._VARIABLES),
            "produced_count": len(produced),
            "missing_count": len(missing),
            "unsupported_count": len(unsupported),
            "produced": produced,
            "missing": missing,
            "unsupported": unsupported,
            "solar_concepts": concepts_status,
            "all_required_produced": len([m for m in missing if m["is_required"]]) == 0,
        }
