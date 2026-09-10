"""Validation and resolution module for shelter infiltration and ventilation parameters."""

import math
from typing import Any, Dict, List, Optional, Tuple
from simulation.validation.opening_validator import ValidationResult


class VentilationValidator:
    """Rigorous validator and normalizer for ventilation and infiltration specifications."""

    DEFAULT_INFILTRATION_ACH = 0.5
    MAX_ACH_LIMIT = 15.0
    DEFAULT_NATURAL_ACH = 1.0

    @classmethod
    def validate(cls, shelter_model: Dict[str, Any]) -> ValidationResult:
        """Validate ventilation configuration in shelter model."""
        is_valid, errors = cls.validate_ventilation(shelter_model)
        return ValidationResult(is_valid=is_valid, errors=errors)


    @classmethod
    def resolve_ventilation(cls, shelter: Dict[str, Any]) -> Dict[str, Any]:
        """Extract, normalize, and default ventilation/infiltration parameters from shelter model."""
        vent_raw = shelter.get("ventilation")
        if vent_raw is None:
            # Check top-level fallback fields
            top_ach = (
                shelter.get("infiltrationACH")
                if shelter.get("infiltrationACH") is not None
                else shelter.get("infiltration_ach")
                if shelter.get("infiltration_ach") is not None
                else shelter.get("air_changes_per_hour")
            )
            if top_ach is not None:
                vent_raw = {"infiltrationACH": top_ach}
            else:
                vent_raw = {}

        if isinstance(vent_raw, (int, float)):
            vent_dict: Dict[str, Any] = {"infiltrationACH": float(vent_raw)}
        elif isinstance(vent_raw, dict):
            vent_dict = dict(vent_raw)
        else:
            vent_dict = {}

        # 1. Infiltration ACH
        raw_ach = (
            vent_dict.get("infiltrationACH")
            if vent_dict.get("infiltrationACH") is not None
            else vent_dict.get("infiltration_ach")
            if vent_dict.get("infiltration_ach") is not None
            else vent_dict.get("air_changes_per_hour")
            if vent_dict.get("air_changes_per_hour") is not None
            else vent_dict.get("ach")
            if vent_dict.get("ach") is not None
            else shelter.get("infiltrationACH")
            if shelter.get("infiltrationACH") is not None
            else shelter.get("infiltration_ach")
            if shelter.get("infiltration_ach") is not None
            else cls.DEFAULT_INFILTRATION_ACH
        )

        try:
            infiltration_ach = float(raw_ach)
        except (ValueError, TypeError):
            infiltration_ach = cls.DEFAULT_INFILTRATION_ACH

        # 2. Natural Ventilation
        natural_enabled = bool(
            vent_dict.get("naturalVentilationEnabled")
            if vent_dict.get("naturalVentilationEnabled") is not None
            else vent_dict.get("natural_ventilation_enabled", False)
        )
        natural_schedule = str(
            vent_dict.get("naturalSchedule")
            or vent_dict.get("natural_schedule")
            or "Always"
        ).strip()
        raw_natural_ach = (
            vent_dict.get("naturalACH")
            if vent_dict.get("naturalACH") is not None
            else vent_dict.get("natural_ach", cls.DEFAULT_NATURAL_ACH)
        )
        try:
            natural_ach = float(raw_natural_ach)
        except (ValueError, TypeError):
            natural_ach = cls.DEFAULT_NATURAL_ACH

        # 3. Mechanical Ventilation
        mech_enabled = bool(
            vent_dict.get("mechanicalVentilationEnabled")
            if vent_dict.get("mechanicalVentilationEnabled") is not None
            else vent_dict.get("mechanical_ventilation_enabled", False)
        )
        raw_flow_lps = (
            vent_dict.get("mechanicalFlowRateLps")
            if vent_dict.get("mechanicalFlowRateLps") is not None
            else vent_dict.get("mechanical_flow_rate_lps", 0.0)
        )
        try:
            mechanical_flow_rate_lps = float(raw_flow_lps)
        except (ValueError, TypeError):
            mechanical_flow_rate_lps = 0.0

        raw_hrv = (
            vent_dict.get("heatRecoveryEfficiency")
            if vent_dict.get("heatRecoveryEfficiency") is not None
            else vent_dict.get("heat_recovery_efficiency", 0.0)
        )
        try:
            heat_recovery_efficiency = float(raw_hrv)
        except (ValueError, TypeError):
            heat_recovery_efficiency = 0.0

        return {
            "infiltration_ach": infiltration_ach,
            "natural_ventilation_enabled": natural_enabled,
            "natural_schedule": natural_schedule,
            "natural_ach": natural_ach,
            "mechanical_ventilation_enabled": mech_enabled,
            "mechanical_flow_rate_lps": mechanical_flow_rate_lps,
            "heat_recovery_efficiency": heat_recovery_efficiency,
        }

    @classmethod
    def validate_ventilation(cls, shelter: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate ventilation and infiltration inputs against engineering physical bounds."""
        errors: List[str] = []
        vent_raw = shelter.get("ventilation")

        if vent_raw is None and "infiltrationACH" not in shelter and "infiltration_ach" not in shelter:
            # Defaults will be safely applied
            return True, errors

        # Check numeric inputs if raw value is scalar
        if isinstance(vent_raw, (int, float)):
            ach = float(vent_raw)
            if math.isnan(ach) or math.isinf(ach):
                errors.append("Infiltration rate cannot be NaN or Inf.")
            elif ach < 0.0:
                errors.append(f"Infiltration rate cannot be negative (received {ach} ACH).")
            elif ach > cls.MAX_ACH_LIMIT:
                errors.append(
                    f"Infiltration rate {ach} ACH exceeds maximum physical limit of {cls.MAX_ACH_LIMIT} ACH."
                )
            return len(errors) == 0, errors

        if not isinstance(vent_raw, dict) and vent_raw is not None:
            errors.append(f"Invalid ventilation specification type: '{type(vent_raw)}'. Must be dict or number.")
            return False, errors

        vdict = vent_raw if isinstance(vent_raw, dict) else {}

        # 1. Check Infiltration ACH
        raw_ach = (
            vdict.get("infiltrationACH")
            if vdict.get("infiltrationACH") is not None
            else vdict.get("infiltration_ach")
            if vdict.get("infiltration_ach") is not None
            else vdict.get("air_changes_per_hour")
            if vdict.get("air_changes_per_hour") is not None
            else vdict.get("ach")
            if vdict.get("ach") is not None
            else shelter.get("infiltrationACH")
            if shelter.get("infiltrationACH") is not None
            else shelter.get("infiltration_ach")
        )

        if raw_ach is not None:
            try:
                ach = float(raw_ach)
                if math.isnan(ach) or math.isinf(ach):
                    errors.append("Infiltration rate cannot be NaN or Inf.")
                elif ach < 0.0:
                    errors.append(f"Infiltration rate cannot be negative (received {ach} ACH).")
                elif ach > cls.MAX_ACH_LIMIT:
                    errors.append(
                        f"Infiltration rate {ach} ACH exceeds maximum physical limit of {cls.MAX_ACH_LIMIT} ACH."
                    )
            except (ValueError, TypeError) as e:
                errors.append(f"Infiltration rate must be numeric: {e}")

        # 2. Check Natural ACH if enabled
        if vdict.get("naturalVentilationEnabled") or vdict.get("natural_ventilation_enabled"):
            raw_nach = vdict.get("naturalACH") if vdict.get("naturalACH") is not None else vdict.get("natural_ach")
            if raw_nach is not None:
                try:
                    nach = float(raw_nach)
                    if math.isnan(nach) or math.isinf(nach):
                        errors.append("Natural ventilation ACH cannot be NaN or Inf.")
                    elif nach < 0.0:
                        errors.append(f"Natural ventilation rate cannot be negative (received {nach} ACH).")
                    elif nach > cls.MAX_ACH_LIMIT:
                        errors.append(
                            f"Natural ventilation rate {nach} ACH exceeds maximum physical limit of {cls.MAX_ACH_LIMIT} ACH."
                        )
                except (ValueError, TypeError) as e:
                    errors.append(f"Natural ventilation rate must be numeric: {e}")

        # 3. Check Mechanical Ventilation if enabled
        if vdict.get("mechanicalVentilationEnabled") or vdict.get("mechanical_ventilation_enabled"):
            raw_flow = vdict.get("mechanicalFlowRateLps") if vdict.get("mechanicalFlowRateLps") is not None else vdict.get("mechanical_flow_rate_lps")
            if raw_flow is not None:
                try:
                    flow = float(raw_flow)
                    if math.isnan(flow) or math.isinf(flow):
                        errors.append("Mechanical ventilation flow rate cannot be NaN or Inf.")
                    elif flow < 0.0:
                        errors.append(f"Mechanical ventilation flow rate cannot be negative (received {flow} L/s).")
                except (ValueError, TypeError) as e:
                    errors.append(f"Mechanical ventilation flow rate must be numeric: {e}")

            raw_hrv = vdict.get("heatRecoveryEfficiency") if vdict.get("heatRecoveryEfficiency") is not None else vdict.get("heat_recovery_efficiency")
            if raw_hrv is not None:
                try:
                    hrv = float(raw_hrv)
                    if math.isnan(hrv) or math.isinf(hrv):
                        errors.append("Heat recovery efficiency cannot be NaN or Inf.")
                    elif not (0.0 <= hrv <= 1.0):
                        errors.append(f"Heat recovery efficiency must be between 0.0 and 1.0 (received {hrv}).")
                except (ValueError, TypeError) as e:
                    errors.append(f"Heat recovery efficiency must be numeric: {e}")

        return len(errors) == 0, errors
