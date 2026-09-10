"""Engine-independent ResultParser interface and EnergyPlusResultParser implementation."""

from abc import ABC, abstractmethod
import csv
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union

from simulation.results.result import (
    EngineMetadata,
    EnvelopeHeatTransfer,
    SolarPerformance,
    EnergyMetrics,
    ComfortMetrics,
    SimulationResult,
)
from simulation.results.metrics import MetricCalculator
from simulation.parsers.energyplus_parser import EnergyPlusOutputParser


class ResultParser(ABC):
    """Abstract base class for parsing simulation engine outputs into normalized SimulationResult objects."""

    @abstractmethod
    def parse(
        self,
        output_source: Union[str, Path, Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SimulationResult:
        """Parse raw simulation output into a canonical SimulationResult.
        
        Args:
            output_source: Path to output directory, file, or in-memory dictionary.
            metadata: Optional execution and model metadata.
        """
        pass


class EnergyPlusResultParser(ResultParser):
    """Parses EnergyPlus simulation artifacts (eplusout.csv, eplusout.err) into normalized SimulationResult."""

    def __init__(self, metric_calculator: Optional[MetricCalculator] = None):
        self.calculator = metric_calculator or MetricCalculator()

    @staticmethod
    def _clean_float(val: Any) -> float:
        """Safely convert strings or numbers to float, defaulting to 0.0."""
        if val is None:
            return 0.0
        try:
            return float(str(val).strip())
        except (ValueError, TypeError):
            return 0.0

    def parse(
        self,
        output_source: Union[str, Path, Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SimulationResult:
        """Parse EnergyPlus outputs from a directory path or explicit file paths dictionary."""
        meta_input = metadata or {}

        # Resolve paths
        csv_path: Optional[Path] = None
        err_path: Optional[Path] = None

        if isinstance(output_source, (str, Path)):
            src_path = Path(output_source)
            if src_path.is_dir():
                csv_path = src_path / "eplusout.csv"
                err_path = src_path / "eplusout.err"
            elif src_path.is_file() and src_path.suffix.lower() == ".csv":
                csv_path = src_path
                err_path = src_path.parent / "eplusout.err"
        elif isinstance(output_source, dict):
            if "csv_path" in output_source:
                csv_path = Path(output_source["csv_path"])
            if "err_path" in output_source:
                err_path = Path(output_source["err_path"])

        # Parse error file for engine metadata, errors, warnings, and weather location
        error_info: Dict[str, Any] = {}
        weather_from_err = None
        if err_path and err_path.exists():
            error_info = EnergyPlusOutputParser.parse_error_file(str(err_path))
            # Scan warnings for Weather File Location
            for warn in error_info.get("warnings", []):
                if "Weather File Location=" in warn:
                    weather_from_err = warn.split("Weather File Location=")[-1].strip()

        # Build EngineMetadata
        version_header = error_info.get("version_header", "")
        detected_engine = meta_input.get("engine_name", "EnergyPlus")
        detected_version = meta_input.get("engine_version")
        if not detected_version and version_header:
            parts = version_header.split(",")
            for p in parts:
                p_clean = p.strip()
                if p_clean.startswith("Version "):
                    detected_version = p_clean.replace("Version ", "").strip()
                    break
            if not detected_version and len(parts) > 1:
                detected_version = parts[1].strip()

        weather_dataset = (
            meta_input.get("weather_dataset")
            or weather_from_err
            or "Unknown"
        )

        # Check CSV existence
        if not csv_path or not csv_path.exists():
            return self._empty_result(
                meta_input=meta_input,
                detected_engine=detected_engine,
                detected_version=detected_version or "Unknown",
                weather_dataset=weather_dataset,
                completed_successfully=False,
                notes=f"Missing or non-existent CSV output file: {csv_path}",
            )

        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            raw_reader = csv.DictReader(f)
            # Strip trailing/leading whitespaces from header keys
            if raw_reader.fieldnames:
                raw_reader.fieldnames = [fn.strip() for fn in raw_reader.fieldnames]
            
            # Clean each row keys
            rows = []
            for r in raw_reader:
                cleaned_row = {k.strip(): v for k, v in r.items() if k is not None}
                if any(cleaned_row.values()):
                    rows.append(cleaned_row)

        if not rows:
            return self._empty_result(
                meta_input=meta_input,
                detected_engine=detected_engine,
                detected_version=detected_version or "Unknown",
                weather_dataset=weather_dataset,
                completed_successfully=False,
                notes="CSV output file contains no data rows.",
            )

        headers = list(rows[0].keys())

        # Map columns dynamically
        indoor_temp_col = None
        outdoor_temp_col = None
        direct_solar_col = None
        diffuse_solar_col = None
        zone_windows_trans_solar_col = None
        zone_windows_trans_energy_col = None
        zone_windows_heat_gain_col = None
        window_trans_solar_cols: List[str] = []
        window_heat_gain_cols: List[str] = []
        glazing_absorbed_solar_cols: List[str] = []
        opaque_absorbed_solar_cols: List[str] = []
        surface_incident_solar_cols: List[str] = []
        
        wall_cols: Dict[str, List[str]] = {"north": [], "south": [], "east": [], "west": [], "other": []}
        roof_cols: List[str] = []
        floor_cols: List[str] = []
        window_cond_cols: List[str] = []
        door_cond_cols: List[str] = []
        
        # Infiltration columns
        infil_rate_cols: List[str] = []
        infil_loss_energy_cols: List[str] = []
        infil_gain_energy_cols: List[str] = []

        for h in headers:
            h_lower = h.lower()

            # Temperatures
            if "zone mean air temperature" in h_lower:
                indoor_temp_col = h
            elif "site outdoor air drybulb temperature" in h_lower:
                outdoor_temp_col = h

            # Solar radiation concepts:
            # 1. Incident solar radiation
            elif "site direct solar radiation" in h_lower:
                direct_solar_col = h
            elif "site diffuse solar radiation" in h_lower:
                diffuse_solar_col = h
            elif "surface outside face incident solar radiation rate per area" in h_lower:
                surface_incident_solar_cols.append(h)

            # 2. Transmitted solar radiation
            elif "zone windows total transmitted solar radiation rate" in h_lower:
                zone_windows_trans_solar_col = h
            elif "zone windows total transmitted solar radiation energy" in h_lower:
                zone_windows_trans_energy_col = h
            elif "surface window transmitted solar radiation rate" in h_lower or "window transmitted solar" in h_lower:
                window_trans_solar_cols.append(h)

            # 3. Absorbed solar gains
            elif "surface window total glazing layers absorbed solar radiation rate" in h_lower:
                glazing_absorbed_solar_cols.append(h)
            elif "surface outside face solar radiation heat gain rate" in h_lower:
                opaque_absorbed_solar_cols.append(h)

            # 4. Solar heat gain through windows
            elif "zone windows total heat gain rate" in h_lower:
                zone_windows_heat_gain_col = h
            elif "surface window heat gain rate" in h_lower:
                window_heat_gain_cols.append(h)

            # Infiltration
            elif "zone infiltration sensible heat loss energy" in h_lower or "zone infiltration total heat loss energy" in h_lower:
                infil_loss_energy_cols.append(h)
            elif "zone infiltration sensible heat gain energy" in h_lower:
                infil_gain_energy_cols.append(h)
            elif "zone infiltration sensible heat loss rate" in h_lower:
                infil_rate_cols.append(h)

            # Surface inside face conduction heat transfer
            elif "surface inside face conduction heat transfer rate" in h_lower:
                surf_name = h.split(":")[0].strip().upper()

                if "ROOF" in surf_name:
                    roof_cols.append(h)
                elif "FLOOR" in surf_name:
                    floor_cols.append(h)
                elif "WINDOW" in surf_name or "GLAZ" in surf_name or "FENESTRATION" in surf_name:
                    window_cond_cols.append(h)
                elif "DOOR" in surf_name:
                    door_cond_cols.append(h)
                elif "WALL" in surf_name or any(d in surf_name for d in ("NORTH", "SOUTH", "EAST", "WEST")):
                    if "NORTH" in surf_name:
                        wall_cols["north"].append(h)
                    elif "SOUTH" in surf_name:
                        wall_cols["south"].append(h)
                    elif "EAST" in surf_name:
                        wall_cols["east"].append(h)
                    elif "WEST" in surf_name:
                        wall_cols["west"].append(h)
                    else:
                        wall_cols["other"].append(h)
                else:
                    wall_cols["other"].append(h)

        # Extract time-series data without injecting fake zero fallbacks
        timestamps: List[str] = []
        indoor_temps: List[float] = []
        outdoor_temps: List[float] = []
        direct_solars: List[float] = []
        diffuse_solars: List[float] = []
        global_solars: List[float] = []
        solar_gains_total: List[float] = []
        solar_gains_by_win: Dict[str, List[float]] = {c.split(":")[0].strip(): [] for c in window_trans_solar_cols}
        window_heat_gains_total: List[float] = []
        glazing_absorbed_solars: List[float] = []
        opaque_absorbed_solars: List[float] = []

        wall_total: List[float] = []
        walls_by_orient: Dict[str, List[float]] = {"north": [], "south": [], "east": [], "west": []}
        roof_total: List[float] = []
        floor_total: List[float] = []
        window_total: List[float] = []
        door_total: List[float] = []
        infil_total: List[float] = []

        timestep_hours = meta_input.get("timestep_hours", 1.0)
        timestep_seconds = timestep_hours * 3600.0

        for r in rows:
            dt = r.get("Date/Time", "").strip()
            timestamps.append(dt)

            # Temperatures: Only populate if verified column exists
            if indoor_temp_col:
                indoor_temps.append(round(self._clean_float(r.get(indoor_temp_col)), 2))
            if outdoor_temp_col:
                outdoor_temps.append(round(self._clean_float(r.get(outdoor_temp_col)), 2))

            # Incident Solar Radiation
            if direct_solar_col:
                direct_solars.append(round(self._clean_float(r.get(direct_solar_col)), 2))
            if diffuse_solar_col:
                diffuse_solars.append(round(self._clean_float(r.get(diffuse_solar_col)), 2))
            if direct_solar_col or diffuse_solar_col:
                s_dir = self._clean_float(r.get(direct_solar_col)) if direct_solar_col else 0.0
                s_diff = self._clean_float(r.get(diffuse_solar_col)) if diffuse_solar_col else 0.0
                global_solars.append(round(s_dir + s_diff, 2))

            # Transmitted Solar Gains
            if zone_windows_trans_solar_col:
                step_trans = self._clean_float(r.get(zone_windows_trans_solar_col))
                solar_gains_total.append(round(step_trans, 2))
            elif window_trans_solar_cols:
                step_solar_gain = 0.0
                for w_col in window_trans_solar_cols:
                    w_val = self._clean_float(r.get(w_col))
                    step_solar_gain += w_val
                    w_name = w_col.split(":")[0].strip()
                    solar_gains_by_win[w_name].append(round(w_val, 2))
                solar_gains_total.append(round(step_solar_gain, 2))
            else:
                solar_gains_total.append(0.0)

            # Window Total Heat Gain (Transmitted solar + Conduction)
            if zone_windows_heat_gain_col:
                window_heat_gains_total.append(round(self._clean_float(r.get(zone_windows_heat_gain_col)), 2))
            elif window_heat_gain_cols:
                w_heat_step = sum(self._clean_float(r.get(c)) for c in window_heat_gain_cols)
                window_heat_gains_total.append(round(w_heat_step, 2))

            # Absorbed Solar Gains
            if glazing_absorbed_solar_cols:
                glaz_abs = sum(self._clean_float(r.get(c)) for c in glazing_absorbed_solar_cols)
                glazing_absorbed_solars.append(round(glaz_abs, 2))
            if opaque_absorbed_solar_cols:
                opq_abs = sum(self._clean_float(r.get(c)) for c in opaque_absorbed_solar_cols)
                opaque_absorbed_solars.append(round(opq_abs, 2))

            # Envelope conduction
            has_wall_cols = any(wall_cols.values())
            if has_wall_cols:
                n_val = sum(self._clean_float(r.get(c)) for c in wall_cols["north"])
                s_val = sum(self._clean_float(r.get(c)) for c in wall_cols["south"])
                e_val = sum(self._clean_float(r.get(c)) for c in wall_cols["east"])
                w_val = sum(self._clean_float(r.get(c)) for c in wall_cols["west"])
                other_val = sum(self._clean_float(r.get(c)) for c in wall_cols["other"])
                w_tot = n_val + s_val + e_val + w_val + other_val

                walls_by_orient["north"].append(round(n_val, 2))
                walls_by_orient["south"].append(round(s_val, 2))
                walls_by_orient["east"].append(round(e_val, 2))
                walls_by_orient["west"].append(round(w_val, 2))
                wall_total.append(round(w_tot, 2))

            # Roof & Floor
            if roof_cols:
                r_tot = sum(self._clean_float(r.get(c)) for c in roof_cols)
                roof_total.append(round(r_tot, 2))

            if floor_cols:
                f_tot = sum(self._clean_float(r.get(c)) for c in floor_cols)
                floor_total.append(round(f_tot, 2))

            # Window & Door conduction
            if window_cond_cols:
                win_tot = sum(self._clean_float(r.get(c)) for c in window_cond_cols)
                window_total.append(round(win_tot, 2))
            else:
                window_total.append(0.0)

            if door_cond_cols:
                door_tot = sum(self._clean_float(r.get(c)) for c in door_cond_cols)
                door_total.append(round(door_tot, 2))
            else:
                door_total.append(0.0)

            # Infiltration heat transfer (Watts)
            if infil_loss_energy_cols or infil_gain_energy_cols:
                loss_j = sum(self._clean_float(r.get(c)) for c in infil_loss_energy_cols)
                gain_j = sum(self._clean_float(r.get(c)) for c in infil_gain_energy_cols)
                step_infil_w = (gain_j - loss_j) / timestep_seconds
                infil_total.append(round(step_infil_w, 2))
            elif infil_rate_cols:
                step_infil_w = -sum(self._clean_float(r.get(c)) for c in infil_rate_cols)
                infil_total.append(round(step_infil_w, 2))
            else:
                infil_total.append(0.0)

        # Compute structured metrics using MetricCalculator
        energy_metrics = self.calculator.calculate_energy_metrics(
            wall_heat_transfer=wall_total,
            roof_heat_transfer=roof_total,
            floor_heat_transfer=floor_total,
            window_heat_transfer=window_total,
            door_heat_transfer=door_total,
            infiltration_heat_transfer=infil_total,
            solar_gains=solar_gains_total,
            timestep_hours=timestep_hours,
            is_unconditioned=meta_input.get("is_unconditioned", True),
        )

        # Resolve comfort definition
        comf_def = meta_input.get("comfort_definition")
        if comf_def is None and "shelter_model" in meta_input:
            from simulation.results.metrics import parse_comfort_definition
            comf_def = parse_comfort_definition(meta_input["shelter_model"])

        comfort_metrics = self.calculator.calculate_comfort_metrics(
            indoor_temps=indoor_temps,
            outdoor_temps=outdoor_temps,
            timestep_hours=timestep_hours,
            comfort_temperature_min_c=meta_input.get("comfort_min_c", 18.0),
            comfort_temperature_max_c=meta_input.get("comfort_max_c", 26.0),
            target_indoor_temperature_c=meta_input.get("target_temp_c"),
            comfort_definition=comf_def,
            standard_or_model_name=meta_input.get("comfort_model_name"),
            assumptions=meta_input.get("comfort_assumptions"),
            applicable_conditions=meta_input.get("comfort_applicable_conditions"),
        )

        # Integrated useful solar gain (kWh)
        useful_solar_kwh = self.calculator.integrate_power_to_energy_kwh(solar_gains_total, timestep_hours)

        # Assemble engine metadata
        simulation_period = {
            "start": timestamps[0] if timestamps else "",
            "end": timestamps[-1] if timestamps else "",
            "timestep_seconds": int(timestep_seconds),
            "timesteps_count": len(timestamps),
        }

        metadata_obj = EngineMetadata(
            engine_name=detected_engine,
            engine_version=detected_version or meta_input.get("engine_version", "24.1.0"),
            model_version=meta_input.get("model_version", "1.0"),
            weather_dataset=weather_dataset,
            simulation_period=simulation_period,
            execution_duration_seconds=meta_input.get("execution_duration_seconds"),
            completed_successfully=error_info.get("completed_successfully", True),
            environment_name=meta_input.get("environment_name"),
            notes=meta_input.get("notes"),
        )

        envelope_obj = EnvelopeHeatTransfer(
            wall_heat_transfer=wall_total,
            roof_heat_transfer=roof_total,
            floor_heat_transfer=floor_total,
            window_heat_transfer=window_total,
            door_heat_transfer=door_total,
            infiltration_heat_transfer=infil_total,
            walls_by_orientation=walls_by_orient,
        )

        solar_obj = SolarPerformance(
            direct_normal_irradiance=direct_solars,
            diffuse_horizontal_irradiance=diffuse_solars,
            global_horizontal_irradiance=global_solars,
            solar_gains_total=solar_gains_total,
            solar_gains_by_window=solar_gains_by_win,
            window_heat_gains_total=window_heat_gains_total,
            absorbed_solar_glazing=glazing_absorbed_solars,
            absorbed_solar_surfaces=opaque_absorbed_solars,
            useful_solar_gain_total_kwh=useful_solar_kwh,
            status="AVAILABLE" if (solar_gains_total or global_solars) else "UNAVAILABLE",
        )

        return SimulationResult(
            metadata=metadata_obj,
            timestamps=timestamps,
            indoor_temperature=indoor_temps,
            outdoor_temperature=outdoor_temps,
            solar_radiation=global_solars,
            solar_gains=solar_gains_total,
            wall_heat_transfer=wall_total,
            roof_heat_transfer=roof_total,
            floor_heat_transfer=floor_total,
            window_heat_transfer=window_total,
            door_heat_transfer=door_total,
            infiltration_heat_transfer=infil_total,
            envelope=envelope_obj,
            solar=solar_obj,
            energy=energy_metrics,
            comfort=comfort_metrics,
        )

    def _empty_result(
        self,
        meta_input: Dict[str, Any],
        detected_engine: str,
        detected_version: str,
        weather_dataset: str,
        completed_successfully: bool,
        notes: str,
    ) -> SimulationResult:
        """Create empty/failed SimulationResult placeholder."""
        meta = EngineMetadata(
            engine_name=detected_engine,
            engine_version=detected_version,
            model_version=meta_input.get("model_version", "1.0"),
            weather_dataset=weather_dataset,
            simulation_period={"start": "", "end": "", "timestep_seconds": 3600, "timesteps_count": 0},
            execution_duration_seconds=meta_input.get("execution_duration_seconds"),
            completed_successfully=completed_successfully,
            notes=notes,
        )
        comf_def = meta_input.get("comfort_definition")
        min_c = meta_input.get("comfort_min_c", 18.0)
        max_c = meta_input.get("comfort_max_c", 26.0)
        tgt_c = meta_input.get("target_temp_c")
        if comf_def:
            min_c = comf_def.min_acceptable_temperature_c
            max_c = comf_def.max_acceptable_temperature_c
            tgt_c = comf_def.target_indoor_temperature_c

        return SimulationResult(
            metadata=meta,
            timestamps=[],
            indoor_temperature=[],
            outdoor_temperature=[],
            solar_radiation=[],
            solar_gains=[],
            wall_heat_transfer=[],
            roof_heat_transfer=[],
            floor_heat_transfer=[],
            window_heat_transfer=[],
            door_heat_transfer=[],
            infiltration_heat_transfer=[],
            envelope=EnvelopeHeatTransfer(),
            solar=SolarPerformance(),
            energy=EnergyMetrics(),
            comfort=ComfortMetrics(
                is_valid=False,
                validity_reason=notes,
                status="UNAVAILABLE",
                comfort_temperature_min_c=min_c,
                comfort_temperature_max_c=max_c,
                target_indoor_temperature_c=tgt_c,
                target_range_str=f"{min_c:.1f}°C – {max_c:.1f}°C",
                comfort_definition=comf_def,
            ),
        )
