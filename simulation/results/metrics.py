"""MetricCalculator for computing thermal statistics, energy integrals, and comfort degree-hours."""

import math
from typing import List, Dict, Any, Optional, Tuple

from simulation.results.result import EnergyMetrics, ComfortMetrics, ComfortDefinition


def parse_comfort_definition(
    shelter_model: Optional[Dict[str, Any]] = None,
    design_targets: Optional[Dict[str, Any]] = None,
) -> ComfortDefinition:
    """Extract and validate comfort criteria from a ShelterModel or DesignTargets dict."""
    targets = design_targets or {}
    if not targets and shelter_model:
        targets = (
            shelter_model.get("design_targets")
            or shelter_model.get("designTargets")
            or {}
        )

    comfort_cfg = targets.get("comfort") if isinstance(targets.get("comfort"), dict) else {}

    # Extract min temp
    min_t = (
        comfort_cfg.get("target_indoor_temp_min")
        or targets.get("comfortTempMinC")
        or targets.get("comfort_temp_min_c")
        or targets.get("min_acceptable_temperature_c")
        or 18.0
    )
    # Extract max temp
    max_t = (
        comfort_cfg.get("target_indoor_temp_max")
        or targets.get("comfortTempMaxC")
        or targets.get("comfort_temp_max_c")
        or targets.get("max_acceptable_temperature_c")
        or 26.0
    )
    # Extract target indoor temp
    target_t = (
        comfort_cfg.get("target_indoor_temp")
        or targets.get("targetIndoorTempC")
        or targets.get("target_indoor_temp_c")
        or targets.get("target_temp_c")
        or None
    )
    # Extract model / standard name
    model_name = (
        comfort_cfg.get("model")
        or targets.get("comfortModel")
        or targets.get("comfort_model")
        or targets.get("standard_or_model_name")
        or "DesignTargets Operational Band"
    )
    # Extract assumptions
    assumptions = (
        comfort_cfg.get("assumptions")
        or targets.get("assumptions")
        or "Defined by project DesignTargets; occupant clothing and activity adjusted for site conditions."
    )
    # Extract applicable conditions
    app_cond = (
        comfort_cfg.get("applicable_conditions")
        or targets.get("applicableConditions")
        or targets.get("applicable_conditions")
        or "High-altitude unconditioned or passively heated cold-climate shelter."
    )

    try:
        min_t_float = float(min_t)
        max_t_float = float(max_t)
        target_t_float = float(target_t) if target_t is not None else round((min_t_float + max_t_float) / 2.0, 1)
    except (ValueError, TypeError):
        min_t_float = 18.0
        max_t_float = 26.0
        target_t_float = 22.0

    if min_t_float >= max_t_float:
        max_t_float = min_t_float + 2.0

    return ComfortDefinition(
        min_acceptable_temperature_c=round(min_t_float, 2),
        max_acceptable_temperature_c=round(max_t_float, 2),
        target_indoor_temperature_c=round(target_t_float, 2),
        standard_or_model_name=str(model_name),
        assumptions=str(assumptions),
        applicable_conditions=str(app_cond),
        is_universal_comfort_claimed=False,
        target_range_str=f"{min_t_float:.1f}°C – {max_t_float:.1f}°C",
    )


class MetricCalculator:
    """Calculates thermal statistics, numerical energy integrals, and comfort metrics from normalized timeseries."""

    @staticmethod
    def calculate_temperature_stats(series: List[float]) -> Dict[str, Optional[float]]:
        """Compute basic summary statistics for a temperature time-series."""
        if not series:
            return {"min": 0.0, "max": 0.0, "mean": 0.0, "swing": 0.0}
        
        min_v = min(series)
        max_v = max(series)
        mean_v = sum(series) / len(series)
        swing_v = max_v - min_v
        
        return {
            "min": round(min_v, 2),
            "max": round(max_v, 2),
            "mean": round(mean_v, 2),
            "swing": round(swing_v, 2),
        }

    @staticmethod
    def integrate_power_to_energy_kwh(power_series_w: List[float], timestep_hours: float = 1.0) -> float:
        """Numerically integrate instantaneous power (Watts) over discrete timesteps into Energy (kWh).
        
        Formula: Energy (kWh) = sum(Power_i * timestep_hours) / 1000.0
        """
        if not power_series_w or timestep_hours <= 0:
            return 0.0
        total_wh = sum(power_series_w) * timestep_hours
        return round(total_wh / 1000.0, 4)

    @classmethod
    def calculate_component_energy_balance(
        cls,
        component_series: Dict[str, List[float]],
        timestep_hours: float = 1.0,
    ) -> Tuple[Dict[str, float], Dict[str, float]]:
        """Segregate envelope heat exchanges into integrated cumulative gains and losses (kWh).
        
        Positive heat transfer rate -> Heat Gain into zone (kWh)
        Negative heat transfer rate -> Heat Loss from zone to ambient (reported as positive kWh loss)
        """
        gains_kwh: Dict[str, float] = {}
        losses_kwh: Dict[str, float] = {}

        for component_name, rates in component_series.items():
            if not rates:
                gains_kwh[component_name] = 0.0
                losses_kwh[component_name] = 0.0
                continue

            gain_powers = [r for r in rates if r > 0.0]
            loss_powers = [abs(r) for r in rates if r < 0.0]

            gains_kwh[component_name] = cls.integrate_power_to_energy_kwh(gain_powers, timestep_hours)
            losses_kwh[component_name] = cls.integrate_power_to_energy_kwh(loss_powers, timestep_hours)

        return gains_kwh, losses_kwh

    @classmethod
    def calculate_comfort_metrics(
        cls,
        indoor_temps: List[float],
        outdoor_temps: Optional[List[float]] = None,
        timestep_hours: float = 1.0,
        comfort_temperature_min_c: float = 18.0,
        comfort_temperature_max_c: float = 26.0,
        target_indoor_temperature_c: Optional[float] = None,
        comfort_definition: Optional[ComfortDefinition] = None,
        standard_or_model_name: Optional[str] = None,
        assumptions: Optional[str] = None,
        applicable_conditions: Optional[str] = None,
    ) -> ComfortMetrics:
        """Evaluate thermal comfort metrics and degree-hours against operational boundary conditions."""
        # Resolve comfort definition
        if comfort_definition is not None:
            defn = comfort_definition
            min_c = defn.min_acceptable_temperature_c
            max_c = defn.max_acceptable_temperature_c
            tgt_c = defn.target_indoor_temperature_c
        else:
            min_c = float(comfort_temperature_min_c)
            max_c = float(comfort_temperature_max_c)
            tgt_c = (
                float(target_indoor_temperature_c)
                if target_indoor_temperature_c is not None
                else round((min_c + max_c) / 2.0, 1)
            )
            defn = ComfortDefinition(
                min_acceptable_temperature_c=min_c,
                max_acceptable_temperature_c=max_c,
                target_indoor_temperature_c=tgt_c,
                standard_or_model_name=standard_or_model_name or "DesignTargets Operational Band",
                assumptions=assumptions or "Defined by project DesignTargets; occupant clothing and activity adjusted for site conditions.",
                applicable_conditions=applicable_conditions or "High-altitude unconditioned or passively heated cold-climate shelter.",
                is_universal_comfort_claimed=False,
                target_range_str=f"{min_c:.1f}°C – {max_c:.1f}°C",
            )

        if not indoor_temps:
            return ComfortMetrics(
                is_valid=False,
                status="UNAVAILABLE",
                validity_reason="Cannot compute comfort metrics: indoor temperature series is empty.",
                comfort_temperature_min_c=min_c,
                comfort_temperature_max_c=max_c,
                target_indoor_temperature_c=tgt_c,
                target_range_str=defn.target_range_str,
                comfort_definition=defn,
            )

        # Physical integrity check
        if any(math.isnan(t) or math.isinf(t) for t in indoor_temps):
            return ComfortMetrics(
                is_valid=False,
                status="UNAVAILABLE",
                validity_reason="Indoor temperature series contains NaN or Inf values.",
                comfort_temperature_min_c=min_c,
                comfort_temperature_max_c=max_c,
                target_indoor_temperature_c=tgt_c,
                target_range_str=defn.target_range_str,
                comfort_definition=defn,
            )

        if any(t < -60.0 or t > 70.0 for t in indoor_temps):
            return ComfortMetrics(
                is_valid=False,
                status="UNAVAILABLE",
                validity_reason="Indoor temperature values fall outside realistic physical boundaries [-60°C, 70°C].",
                comfort_temperature_min_c=min_c,
                comfort_temperature_max_c=max_c,
                target_indoor_temperature_c=tgt_c,
                target_range_str=defn.target_range_str,
                comfort_definition=defn,
            )

        if timestep_hours <= 0:
            return ComfortMetrics(
                is_valid=False,
                status="UNAVAILABLE",
                validity_reason=f"Invalid timestep_hours: {timestep_hours}. Must be > 0.",
                comfort_temperature_min_c=min_c,
                comfort_temperature_max_c=max_c,
                target_indoor_temperature_c=tgt_c,
                target_range_str=defn.target_range_str,
                comfort_definition=defn,
            )

        stats = cls.calculate_temperature_stats(indoor_temps)
        total_hours = len(indoor_temps) * timestep_hours

        hours_inside = 0.0
        hours_below = 0.0
        hours_above = 0.0
        underheating_degree_hours = 0.0
        overheating_degree_hours = 0.0

        for t in indoor_temps:
            if min_c <= t <= max_c:
                hours_inside += timestep_hours
            elif t < min_c:
                hours_below += timestep_hours
                underheating_degree_hours += (min_c - t) * timestep_hours
            else:
                hours_above += timestep_hours
                overheating_degree_hours += (t - max_c) * timestep_hours

        percent_comf = (hours_inside / total_hours * 100.0) if total_hours > 0 else 0.0

        return ComfortMetrics(
            is_valid=True,
            status="AVAILABLE",
            validity_reason="Comfort evaluated over verified simulated indoor air temperatures.",
            comfort_temperature_min_c=min_c,
            comfort_temperature_max_c=max_c,
            target_indoor_temperature_c=tgt_c,
            target_range_str=defn.target_range_str,
            comfort_definition=defn,
            is_universal_comfort_claimed=False,
            hours_inside_target=round(hours_inside, 2),
            hours_below_target=round(hours_below, 2),
            hours_above_target=round(hours_above, 2),
            hours_in_comfort_band=round(hours_inside, 2),
            hours_below_comfort=round(hours_below, 2),
            hours_above_comfort=round(hours_above, 2),
            percent_time_comfortable=round(percent_comf, 2),
            underheating_degree_hours_c_h=round(underheating_degree_hours, 2),
            overheating_degree_hours_c_h=round(overheating_degree_hours, 2),
            indoor_min_c=stats["min"],
            indoor_max_c=stats["max"],
            indoor_mean_c=stats["mean"],
            diurnal_temperature_swing_c=stats["swing"],
        )

    @classmethod
    def calculate_energy_metrics(
        cls,
        wall_heat_transfer: List[float],
        roof_heat_transfer: List[float],
        floor_heat_transfer: List[float],
        window_heat_transfer: List[float],
        door_heat_transfer: List[float],
        infiltration_heat_transfer: List[float],
        solar_gains: List[float],
        timestep_hours: float = 1.0,
        is_unconditioned: bool = True,
    ) -> EnergyMetrics:
        """Compute full component-level energy balance and total solar gains in kWh."""
        components = {
            "wall": wall_heat_transfer,
            "roof": roof_heat_transfer,
            "floor": floor_heat_transfer,
            "window": window_heat_transfer,
            "door": door_heat_transfer,
            "infiltration": infiltration_heat_transfer,
        }

        gains_kwh, losses_kwh = cls.calculate_component_energy_balance(components, timestep_hours)
        total_solar_kwh = cls.integrate_power_to_energy_kwh(solar_gains, timestep_hours)

        return EnergyMetrics(
            heating_demand_kwh=None if is_unconditioned else 0.0,
            cooling_demand_kwh=None if is_unconditioned else 0.0,
            net_energy_demand_kwh=None if is_unconditioned else 0.0,
            is_unconditioned=is_unconditioned,
            envelope_losses_kwh=losses_kwh,
            envelope_gains_kwh=gains_kwh,
            total_solar_gains_kwh=total_solar_kwh,
        )
