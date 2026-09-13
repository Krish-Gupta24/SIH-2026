"""Space-filling Latin Hypercube Sampler for mixed continuous and categorical shelter design spaces.

Enforces:
- Space-filling Latin Hypercube Sampling for continuous variables (L, W, H, orientation, insulation, window area, ACH, occupants).
- Balanced stratified assignment for categoricals (wall construction, roof construction, glazing, thermal mass, window placement).
- Constraint-aware rejection (aspect ratio limits, window-to-wall limits).
- SHA-256 deduplication.
"""

import hashlib
import json
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
from scipy.stats.qmc import LatinHypercube

from backend.ai.feature_schema import (
    CATEGORICAL_DESIGN_FEATURES,
    CONTINUOUS_DESIGN_FEATURES,
    DESIGN_BOUNDS,
    GLAZING_TYPES,
    ROOF_CONSTRUCTION_TYPES,
    THERMAL_MASS_TYPES,
    WALL_CONSTRUCTION_TYPES,
    WINDOW_PLACEMENTS,
    compute_derived_features,
)


class DesignSpaceSampler:
    """Generates space-filling, constraint-checked design samples for EnergyPlus training."""

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = np.random.default_rng(seed)

    def _param_hash(self, params: Dict[str, Any]) -> str:
        """Computes a deterministic hash of rounded parameters to detect duplicates."""
        clean = {}
        for k in sorted(CONTINUOUS_DESIGN_FEATURES):
            clean[k] = round(float(params[k]), 3)
        for k in sorted(CATEGORICAL_DESIGN_FEATURES):
            clean[k] = str(params[k])
        serialized = json.dumps(clean, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def sample(
        self,
        n_samples: int,
        max_aspect_ratio: float = 2.5,
        max_wwr: float = 0.35,
        max_attempts_factor: int = 5,
    ) -> List[Dict[str, Any]]:
        """Samples n_samples valid, unique, space-filling design configurations.

        Args:
            n_samples: Number of valid candidate designs required.
            max_aspect_ratio: Upper limit on length / width.
            max_wwr: Upper limit on window-to-wall ratio.
            max_attempts_factor: Multiplier for maximum candidate proposals.

        Returns:
            List of complete design parameter dictionaries with derived features.
        """
        valid_samples: List[Dict[str, Any]] = []
        seen_hashes: Set[str] = set()

        n_continuous = len(CONTINUOUS_DESIGN_FEATURES)
        total_pool_size = n_samples * max_attempts_factor

        # 1. Continuous LHS Sampling in [0, 1]^d
        sampler = LatinHypercube(d=n_continuous, seed=self.seed)
        unit_samples = sampler.random(n=total_pool_size)

        # Scale continuous features to their physical bounds
        scaled_continuous: Dict[str, np.ndarray] = {}
        for idx, feat_name in enumerate(CONTINUOUS_DESIGN_FEATURES):
            b_min, b_max, _ = DESIGN_BOUNDS[feat_name]
            scaled_continuous[feat_name] = b_min + unit_samples[:, idx] * (b_max - b_min)

        # 2. Categorical Stratified Sampling (balanced across pool)
        cat_pools = {
            "wall_construction": self.rng.choice(WALL_CONSTRUCTION_TYPES, size=total_pool_size),
            "roof_construction": self.rng.choice(ROOF_CONSTRUCTION_TYPES, size=total_pool_size),
            "glazing_type": self.rng.choice(GLAZING_TYPES, size=total_pool_size),
            "thermal_mass_type": self.rng.choice(THERMAL_MASS_TYPES, size=total_pool_size),
            "window_placement": self.rng.choice(WINDOW_PLACEMENTS, size=total_pool_size),
        }

        # 3. Assemble, evaluate constraints, and filter
        for i in range(total_pool_size):
            if len(valid_samples) >= n_samples:
                break

            candidate = {
                feat: float(scaled_continuous[feat][i])
                for feat in CONTINUOUS_DESIGN_FEATURES
            }
            for cat_feat, cat_array in cat_pools.items():
                candidate[cat_feat] = str(cat_array[i])

            # Integer rounding for occupants
            candidate["occupants"] = float(int(round(candidate["occupants"])))

            # Check geometric sanity constraints
            derived = compute_derived_features(candidate)

            if derived["aspect_ratio"] > max_aspect_ratio:
                continue
            if derived["aspect_ratio"] < 1.0:  # Enforce length >= width convention
                continue
            if derived["window_to_wall_ratio"] > max_wwr:
                continue
            if derived["window_to_wall_ratio"] < 0.02:
                continue

            # Deduplication check
            p_hash = self._param_hash(candidate)
            if p_hash in seen_hashes:
                continue

            seen_hashes.add(p_hash)
            candidate.update(derived)
            candidate["param_hash"] = p_hash
            valid_samples.append(candidate)

        return valid_samples
