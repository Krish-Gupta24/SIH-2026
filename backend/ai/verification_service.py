"""EnergyPlus physics verification service for top diverse Pareto candidates.

Performs:
1. Diverse top-K candidate selection across the Pareto frontier (knee point, min heating, min mass, high uncertainty).
2. Parallel high-fidelity EnergyPlus simulation.
3. Calibration error quantification: Delta = Surrogate - EnergyPlus.
4. Ranking regret calculation.
5. Physics-grounded re-ranking.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import tempfile
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from backend.ai.data_quality import EnergyPlusQualityGate
from backend.ai.feature_schema import design_dict_to_shelter_model
from simulation.runners.engine import EnergyPlusEngine


@dataclass
class VerifiedCandidateResult:
    candidate_id: str
    parameters: Dict[str, Any]
    surrogate_predictions: Dict[str, float]
    verified_physics: Dict[str, float]
    calibration_error: Dict[str, float]
    is_physics_verified: bool
    verification_status: str  # 'VERIFIED_SUCCESS', 'VERIFICATION_FAILED'
    verification_duration_s: float
    error_details: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class VerificationService:
    """Selects diverse Pareto candidates, runs EnergyPlus physics verification, and computes calibration error."""

    CALIBRATION_STORE_PATH = Path("storage/ai/calibration_pool.json")

    def __init__(self, epw_path: Path):
        self.epw_path = Path(epw_path)
        if not self.epw_path.exists():
            raise FileNotFoundError(f"Weather file not found: {self.epw_path}")

    def select_diverse_top_k(self, candidates: List[Dict[str, Any]], k: int = 5) -> List[Dict[str, Any]]:
        """Selects up to K diverse candidates spanning trade-off extremes and knee point."""
        if len(candidates) <= k:
            return candidates

        selected_indices = set()

        # 1. Min Heating Demand candidate
        heating_vals = [
            c["surrogate_predictions"].get("winter_heating_demand_kwh_m2",
            c["surrogate_predictions"].get("annual_heating_demand_kwh_m2", 999.0))
            for c in candidates
        ]
        min_heat_idx = int(np.argmin(heating_vals))
        selected_indices.add(min_heat_idx)

        # 2. Min Envelope Mass candidate
        mass_vals = [c["parameters"].get("estimated_envelope_mass", 9999.0) for c in candidates]
        min_mass_idx = int(np.argmin(mass_vals))
        selected_indices.add(min_mass_idx)

        # 3. Knee Point candidate (normalized Euclidean distance to ideal point [0, 0, 0])
        h_arr = np.array(heating_vals)
        m_arr = np.array(mass_vals)
        h_norm = (h_arr - h_arr.min()) / (h_arr.max() - h_arr.min() + 1e-6)
        m_norm = (m_arr - m_arr.min()) / (m_arr.max() - m_arr.min() + 1e-6)
        dist_to_ideal = np.sqrt(h_norm**2 + m_norm**2)
        knee_idx = int(np.argmin(dist_to_ideal))
        selected_indices.add(knee_idx)

        # 4. Highest Uncertainty candidate (active learning value)
        unc_vals = [c.get("uncertainty_margin_c", 0.0) for c in candidates]
        high_unc_idx = int(np.argmax(unc_vals))
        selected_indices.add(high_unc_idx)

        # 5. Highest Comfort candidate
        comf_vals = [
            c["surrogate_predictions"].get("winter_comfort_hours_pct",
            c["surrogate_predictions"].get("annual_comfort_hours_pct", 0.0))
            for c in candidates
        ]
        high_comf_idx = int(np.argmax(comf_vals))
        selected_indices.add(high_comf_idx)

        # Fill any remaining slots up to k
        for idx in range(len(candidates)):
            if len(selected_indices) >= k:
                break
            selected_indices.add(idx)

        return [candidates[i] for i in sorted(selected_indices)]

    def _verify_single(
        self,
        candidate: Dict[str, Any],
        period_days: int = 3,
        start_month: int = 1,
        start_day: int = 15,
    ) -> VerifiedCandidateResult:
        """Runs forward EnergyPlus simulation on a single candidate."""
        cand_id = candidate.get("candidate_id", "AI_CAND")
        params = candidate["parameters"]
        surr_preds = candidate["surrogate_predictions"]

        shelter_model = design_dict_to_shelter_model(params, base_name=f"Verified_{cand_id}")
        temp_dir = tempfile.mkdtemp(prefix=f"ep_verify_{cand_id}_")

        try:
            engine = EnergyPlusEngine()
            engine.prepare_model(
                shelter_model=shelter_model,
                weather_file_path=str(self.epw_path),
                output_dir=temp_dir,
                run_period_days=period_days,
                start_month=start_month,
                start_day=start_day,
            )
            sim_output = engine.run_simulation(timeout_seconds=180)

            is_winter = period_days <= 14 and start_month in (12, 1, 2)
            quality = EnergyPlusQualityGate.validate_simulation_result(sim_output, is_winter_period=is_winter)

            if not quality.is_valid or not quality.cleaned_metrics:
                return VerifiedCandidateResult(
                    candidate_id=cand_id,
                    parameters=params,
                    surrogate_predictions=surr_preds,
                    verified_physics={},
                    calibration_error={},
                    is_physics_verified=False,
                    verification_status="VERIFICATION_FAILED",
                    verification_duration_s=round(engine.execution_output.duration_seconds if engine.execution_output else 0.0, 2),
                    error_details="; ".join(quality.rejection_reasons),
                )

            verified_metrics = quality.cleaned_metrics

            # Calculate calibration delta: Delta = Surrogate - EnergyPlus
            calibration_error = {}
            for target_name, pred_val in surr_preds.items():
                if target_name in verified_metrics:
                    actual_val = verified_metrics[target_name]
                    calibration_error[target_name] = round(pred_val - actual_val, 2)

            return VerifiedCandidateResult(
                candidate_id=cand_id,
                parameters=params,
                surrogate_predictions=surr_preds,
                verified_physics=verified_metrics,
                calibration_error=calibration_error,
                is_physics_verified=True,
                verification_status="VERIFIED_SUCCESS",
                verification_duration_s=round(engine.execution_output.duration_seconds if engine.execution_output else 0.0, 2),
            )
        except Exception as e:
            return VerifiedCandidateResult(
                candidate_id=cand_id,
                parameters=params,
                surrogate_predictions=surr_preds,
                verified_physics={},
                calibration_error={},
                is_physics_verified=False,
                verification_status="VERIFICATION_FAILED",
                verification_duration_s=0.0,
                error_details=str(e),
            )
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def verify_candidates(
        self,
        candidates: List[Dict[str, Any]],
        k: int = 5,
        period_days: int = 3,
        start_month: int = 1,
        start_day: int = 15,
        workers: int = 4,
    ) -> List[VerifiedCandidateResult]:
        """Selects diverse top-K candidates and verifies them in parallel."""
        selected = self.select_diverse_top_k(candidates, k=k)
        verified_results: List[VerifiedCandidateResult] = []

        with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
            futures = {
                executor.submit(self._verify_single, cand, period_days, start_month, start_day): cand
                for cand in selected
            }
            for future in as_completed(futures):
                verified_results.append(future.result())

        # Re-rank based on verified heating demand (or min temp)
        def _sort_key(res: VerifiedCandidateResult):
            if not res.is_physics_verified or not res.verified_physics:
                return 9999.0
            return res.verified_physics.get("winter_heating_demand_kwh_m2",
                   res.verified_physics.get("annual_heating_demand_kwh_m2", 9999.0))

        verified_results.sort(key=_sort_key)

        # Log verified candidates to calibration pool
        self._log_to_calibration_pool(verified_results)

        return verified_results

    def _log_to_calibration_pool(self, results: List[VerifiedCandidateResult]) -> None:
        """Appends verified results to calibration pool without automatic retraining."""
        self.CALIBRATION_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        pool: List[Dict[str, Any]] = []

        if self.CALIBRATION_STORE_PATH.exists():
            try:
                with open(self.CALIBRATION_STORE_PATH, "r", encoding="utf-8") as f:
                    pool = json.load(f)
            except Exception:
                pool = []

        for r in results:
            if r.is_physics_verified:
                entry = r.to_dict()
                entry["logged_timestamp"] = datetime.now(timezone.utc).isoformat()
                entry["weather_file"] = self.epw_path.name
                pool.append(entry)

        with open(self.CALIBRATION_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(pool, f, indent=2)
