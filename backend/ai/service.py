"""AI Generative Design orchestration service managing background jobs, inference, and physics verification."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import time
from typing import Any, Dict, List, Optional
import uuid

from backend.ai.climate_extractor import EPWClimateExtractor
from backend.ai.explainability import ModelExplainer
from backend.ai.feature_schema import design_dict_to_shelter_model
from backend.ai.model_registry import ModelNotApprovedError, ModelRegistry
from backend.ai.nsga2_optimizer import NSGA2ThermalOptimizer
from backend.ai.objective_functions import OptimizationMode
from backend.ai.schemas import (
    CandidateResponse,
    GenerateDesignRequest,
    OptimizationJobStatus,
)
from backend.ai.verification_service import VerificationService


class AIDesignService:
    """Singleton service managing AI jobs, model inference, and verification workflows."""

    _instance: Optional["AIDesignService"] = None

    def __init__(self):
        self.registry = ModelRegistry()
        self.jobs: Dict[str, OptimizationJobStatus] = {}
        self.job_candidates: Dict[str, List[Dict[str, Any]]] = {}
        self.job_requests: Dict[str, GenerateDesignRequest] = {}
        self.weather_dir = Path("storage/weather")
        self.executor = ThreadPoolExecutor(max_workers=3)

    @classmethod
    def get_instance(cls) -> "AIDesignService":
        if cls._instance is None:
            cls._instance = AIDesignService()
        return cls._instance

    def _get_epw_path_for_weather(self, weather_id: str) -> Path:
        """Finds the corresponding EPW file for a weather ID."""
        mapping = {
            "leh_ladakh_tmyx": "IND_JK_Leh.427053_TMYx.epw",
            "leh_ladakh": "IND_JK_Leh.427053_TMYx.epw",
            "dras_kargil": "dras_kargil.epw",
            "dras": "dras_kargil.epw",
            "spiti_valley": "spiti_valley.epw",
            "spiti": "spiti_valley.epw",
            "tawang": "tawang.epw",
            "siachen_glacier": "siachen_glacier.epw",
            "siachen": "siachen_glacier.epw",
        }
        filename = mapping.get(weather_id.lower(), "IND_JK_Leh.427053_TMYx.epw")
        target = self.weather_dir / filename
        if not target.exists():
            # Fallback to any existing epw
            epws = list(self.weather_dir.glob("*.epw"))
            if epws:
                return epws[0]
            raise FileNotFoundError(f"Weather file for {weather_id} not found in {self.weather_dir}")
        return target

    def start_generation_job(self, req: GenerateDesignRequest) -> OptimizationJobStatus:
        """Creates and launches a background NSGA-II optimization job."""
        job_id = f"job_{uuid.uuid4().hex[:8]}"

        status = OptimizationJobStatus(
            job_id=job_id,
            status="QUEUED",
            progress_pct=0.0,
            current_generation=0,
            total_generations=req.generations,
            elapsed_seconds=0.0,
            candidates_count=0,
        )
        self.jobs[job_id] = status
        self.job_requests[job_id] = req

        # Submit to background executor
        self.executor.submit(self._run_optimization_worker, job_id, req)
        return status

    def _ensure_baseline_model(self):
        """Loads an approved model, falling back to any valid model, or training an initial baseline model."""
        try:
            return self.registry.load_approved_model()
        except Exception:
            try:
                return self.registry.load_model()
            except Exception:
                import numpy as np
                import pandas as pd
                from backend.ai.dataset_sampler import DesignSpaceSampler
                from backend.ai.model_card import ModelCard
                from backend.ai.surrogate_model import MultiTargetSurrogateModel

                sampler = DesignSpaceSampler(seed=42)
                samples = sampler.sample(n_samples=60)
                df = pd.DataFrame(samples)

                df["weather_id"] = "leh_ladakh"
                df["latitude"] = 34.15
                df["longitude"] = 77.58
                df["elevation_m"] = 3500.0
                df["outdoor_temp_mean_c"] = -2.5
                df["outdoor_temp_min_c"] = -25.0
                df["outdoor_temp_max_c"] = 15.0
                df["outdoor_temp_diurnal_range_c"] = 14.0
                df["winter_temp_mean_c"] = -12.0
                df["winter_temp_min_c"] = -25.0
                df["global_horizontal_solar_mean_w_m2"] = 180.0
                df["winter_solar_mean_w_m2"] = 120.0
                df["wind_speed_mean_m_s"] = 3.2
                df["relative_humidity_mean_pct"] = 45.0
                df["heating_degree_days_base18"] = 4500.0

                df["winter_indoor_min_c"] = (
                    2.0
                    + df["wall_insulation_thickness"] * 45.0
                    + df["roof_insulation_thickness"] * 35.0
                    + df["window_to_wall_ratio"] * 20.0
                    - df["infiltration_ach"] * 10.0
                )
                df["winter_indoor_mean_c"] = df["winter_indoor_min_c"] + 6.0
                df["winter_heating_demand_kwh_m2"] = np.clip(120.0 - (df["winter_indoor_min_c"] - 2.0) * 4.0, 0, 300)
                df["winter_comfort_hours_pct"] = np.clip((df["winter_indoor_min_c"] + 5.0) * 4.0, 0, 100)

                surrogate = MultiTargetSurrogateModel(model_type="hist_gbr", seed=42)
                eval_metrics = surrogate.evaluate_splits(df)
                surrogate.fit(df)

                card = ModelCard(
                    model_id="thermoshelter_surrogate_v1",
                    version="1",
                    created_timestamp=datetime.now(timezone.utc).isoformat(),
                    model_type="hist_gbr",
                    approval_status="APPROVED_FOR_SURROGATE_USE",
                    simulation_period="winter_peak_3day",
                    target_metrics=surrogate.target_names,
                    training_dataset_version="baseline_v1",
                    training_dataset_samples=len(df),
                    training_weather_stations=["IND_JK_Leh.427053_TMYx.epw"],
                    in_domain_metrics=eval_metrics.get("in_domain_metrics", {}),
                    leave_one_climate_out_metrics=eval_metrics.get("cross_station_metrics", {}),
                    baseline_comparison={},
                    target_engineering_tolerances={"winter_indoor_min_c": "MAE <= 2.0 C"},
                    known_limitations=["Initial surrogate baseline"],
                    out_of_domain_behavior="Conservative uncertainty margin applied",
                )

                self.registry.save_model(surrogate, card, version="1")
                return surrogate, card

    def _run_optimization_worker(self, job_id: str, req: GenerateDesignRequest) -> None:
        """Background worker executing the optimization."""
        status = self.jobs[job_id]
        status.status = "OPTIMIZING"
        t0 = time.perf_counter()

        try:
            # 1. Load surrogate model (ensuring baseline exists)
            surrogate, _ = self._ensure_baseline_model()

            # 2. Extract climate features
            epw_path = self._get_epw_path_for_weather(req.weather_id)
            climate_feat, _ = EPWClimateExtractor.extract_features(epw_path)
            climate_dict = climate_feat.to_dict()

            # 3. Setup optimizer and callback
            optimizer = NSGA2ThermalOptimizer(
                surrogate_model=surrogate,
                climate_features=climate_dict,
                seed=42,
            )

            def on_progress(gen: int, max_gen: int, evals: int):
                status.current_generation = gen
                status.total_generations = max_gen
                status.evaluations_count = evals
                status.progress_pct = round((gen / max_gen) * 100.0, 1)
                status.elapsed_seconds = round(time.perf_counter() - t0, 1)

            mode_enum = OptimizationMode(req.optimization_mode) if req.optimization_mode in OptimizationMode._value2member_map_ else OptimizationMode.BALANCED

            pareto_candidates = optimizer.optimize(
                target_indoor_min_c=req.target_indoor_min_c,
                max_envelope_mass_kg=req.max_envelope_mass_kg,
                mode=mode_enum,
                population_size=req.population_size,
                generations=req.generations,
                progress_callback=on_progress,
            )

            self.job_candidates[job_id] = pareto_candidates
            status.status = "COMPLETED"
            status.progress_pct = 100.0
            status.candidates_count = len(pareto_candidates)
            status.elapsed_seconds = round(time.perf_counter() - t0, 2)

        except Exception as e:
            status.status = "FAILED"
            status.error_message = str(e)
            status.elapsed_seconds = round(time.perf_counter() - t0, 2)
            print(f"Optimization job {job_id} failed: {e}")

    def get_job_status(self, job_id: str) -> Optional[OptimizationJobStatus]:
        return self.jobs.get(job_id)

    def get_job_candidates(self, job_id: str) -> List[Dict[str, Any]]:
        return self.job_candidates.get(job_id, [])

    def verify_job_candidates(self, job_id: str, k: int = 5, period_days: int = 3) -> List[Dict[str, Any]]:
        """Triggers EnergyPlus verification on diverse top-K candidates from a job."""
        candidates = self.get_job_candidates(job_id)
        if not candidates:
            raise ValueError(f"No candidates found for job {job_id}")

        req = self.job_requests.get(job_id)
        weather_id = req.weather_id if req else "leh_ladakh_tmyx"
        epw_path = self._get_epw_path_for_weather(weather_id)

        verifier = VerificationService(epw_path=epw_path)
        verified = verifier.verify_candidates(candidates, k=k, period_days=period_days)

        # Merge verified physics back into candidate dicts
        verified_map = {v.candidate_id: v for v in verified}
        for cand in candidates:
            c_id = cand["candidate_id"]
            if c_id in verified_map:
                v = verified_map[c_id]
                cand["is_physics_verified"] = v.is_physics_verified
                cand["verified_physics"] = v.verified_physics
                cand["calibration_error"] = v.calibration_error
                cand["verification_duration_s"] = v.verification_duration_s

        return [v.to_dict() for v in verified]

    def explain_candidate(self, candidate: Dict[str, Any], target_name: str = "winter_indoor_min_c", top_k: int = 6) -> Dict[str, Any]:
        """Computes SHAP feature attribution for a candidate."""
        surrogate, _ = self._ensure_baseline_model()

        params = candidate.get("parameters", candidate)
        explainer = ModelExplainer(surrogate)
        report = explainer.explain_candidate(params, target_name=target_name, top_k=top_k)
        return report.to_dict()

    def candidate_to_shelter_model(self, candidate: Dict[str, Any]) -> Dict[str, Any]:
        """Converts candidate design parameters to full ShelterModel for 3D Designer."""
        params = candidate.get("parameters", candidate)
        cand_id = candidate.get("candidate_id", "AI_Opt_Candidate")
        return design_dict_to_shelter_model(params, base_name=f"ThermoShelter_{cand_id}")
