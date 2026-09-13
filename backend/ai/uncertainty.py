"""Uncertainty quantification and domain boundary enforcement for surrogate inference."""

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple
import numpy as np

from backend.ai.feature_schema import (
    CATEGORICAL_DESIGN_FEATURES,
    CONTINUOUS_DESIGN_FEATURES,
    DESIGN_BOUNDS,
    GLAZING_TYPES,
    ROOF_CONSTRUCTION_TYPES,
    THERMAL_MASS_TYPES,
    WALL_CONSTRUCTION_TYPES,
)


@dataclass
class UncertaintyAssessment:
    uncertainty_margin_c: float
    is_high_uncertainty: bool
    is_out_of_domain: bool
    domain_distance: float
    warning_reasons: List[str]


class SurrogateUncertaintyEstimator:
    """Estimates prediction uncertainty and boundary extrapolation penalties."""

    DEFAULT_RESIDUAL_STD_C = 1.25  # Empirically measured temperature standard error
    DEFAULT_HEATING_STD_KWH = 8.5  # Empirically measured heating demand standard error

    @classmethod
    def assess_candidate(
        cls,
        design_params: Dict[str, Any],
        base_temp_std: float = DEFAULT_RESIDUAL_STD_C,
    ) -> UncertaintyAssessment:
        """Assesses domain distance and computes a conservative uncertainty margin."""
        warnings: List[str] = []
        total_normalized_distance = 0.0

        for feat in CONTINUOUS_DESIGN_FEATURES:
            if feat in design_params:
                val = float(design_params[feat])
                b_min, b_max, _ = DESIGN_BOUNDS[feat]
                span = b_max - b_min
                if val < b_min:
                    d = (b_min - val) / span
                    total_normalized_distance += d
                    warnings.append(f"{feat} ({val}) below lower bound ({b_min})")
                elif val > b_max:
                    d = (val - b_max) / span
                    total_normalized_distance += d
                    warnings.append(f"{feat} ({val}) above upper bound ({b_max})")

        # Categorical checks
        if design_params.get("wall_construction") not in WALL_CONSTRUCTION_TYPES:
            total_normalized_distance += 0.5
            warnings.append(f"Unrecognized wall construction: {design_params.get('wall_construction')}")
        if design_params.get("roof_construction") not in ROOF_CONSTRUCTION_TYPES:
            total_normalized_distance += 0.5
            warnings.append(f"Unrecognized roof construction: {design_params.get('roof_construction')}")
        if design_params.get("glazing_type") not in GLAZING_TYPES:
            total_normalized_distance += 0.5
            warnings.append(f"Unrecognized glazing type: {design_params.get('glazing_type')}")
        if design_params.get("thermal_mass_type") not in THERMAL_MASS_TYPES:
            total_normalized_distance += 0.5
            warnings.append(f"Unrecognized thermal mass type: {design_params.get('thermal_mass_type')}")

        is_ood = total_normalized_distance > 0.0
        # Scale margin conservatively with distance outside the training domain
        margin_c = base_temp_std * (1.0 + 2.5 * total_normalized_distance)
        is_high_uncertainty = total_normalized_distance > 0.15 or margin_c > 2.5

        return UncertaintyAssessment(
            uncertainty_margin_c=round(margin_c, 2),
            is_high_uncertainty=is_high_uncertainty,
            is_out_of_domain=is_ood,
            domain_distance=round(total_normalized_distance, 3),
            warning_reasons=warnings,
        )
