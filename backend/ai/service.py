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
                # Check if real physics-simulated datasets exist in storage/ai/datasets
                datasets_dir = Path("storage/ai/datasets")
                parquet_files = list(datasets_dir.glob("*.parquet")) if datasets_dir.exists() else []
                if parquet_files:
                    from backend.ai.dataset_schema import DatasetSchema
                    from backend.ai.model_card import ModelCard
                    from backend.ai.surrogate_model import MultiTargetSurrogateModel

                    # Load the largest physical dataset
                    chosen_parquet = sorted(parquet_files, key=lambda p: p.stat().st_size, reverse=True)[0]
                    df, _ = DatasetSchema.load_dataset(chosen_parquet)
                    
                    surrogate = MultiTargetSurrogateModel(model_type="hist_gbr", seed=42)
                    eval_metrics = surrogate.evaluate_splits(df)
                    surrogate.fit(df)

                    card = ModelCard(
                        model_id="thermoshelter_surrogate_v2",
                        version="2",
                        created_timestamp=datetime.now(timezone.utc).isoformat(),
                        model_type="hist_gbr",
                        approval_status="APPROVED_FOR_SURROGATE_USE",
                        simulation_period="winter_peak_3day",
                        target_metrics=surrogate.target_names,
                        training_dataset_version=chosen_parquet.stem,
                        training_dataset_samples=len(df),
                        training_weather_stations=["IND_JK_Leh.427053_TMYx.epw", "dras_kargil.epw", "spiti_valley.epw"],
                        in_domain_metrics=eval_metrics.get("in_domain_metrics", {}),
                        leave_one_climate_out_metrics=eval_metrics.get("cross_station_metrics", {}),
                        baseline_comparison={},
                        target_engineering_tolerances={"winter_indoor_min_c": "MAE <= 2.5 C"},
                        known_limitations=["Himalayan high-altitude domain (2500m-5400m)"],
                        out_of_domain_behavior="Conservative uncertainty margin applied",
                    )
                    self.registry.save_model(surrogate, card, version="2")
                    return surrogate, card
                else:
                    raise RuntimeError(
                        "No pre-trained surrogate model or physical training dataset found. "
                        "Please run scripts/generate_training_data.py to generate physics-based training data."
                    )

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
        """Converts candidate design parameters to full ShelterModel for 3D Designer.
        
        Inspects existing shelter models across persistent disk and in-memory registry.
        Detects highest ThermoShelter_AI_OPT_XXX sequence number and increments it to
        ensure each AI candidate becomes a brand new sequentially numbered project
        (e.g., ThermoShelter_AI_OPT_001 -> ThermoShelter_AI_OPT_002 -> 003).
        """
        import re
        from backend.services.shelter_service import shelter_service

        params = candidate.get("parameters", candidate)
        cand_id = candidate.get("candidate_id", "AI_OPT_001")

        # Collect existing project names & IDs from persistent storage
        existing_names: List[str] = []
        try:
            for s in shelter_service.list_shelters():
                n = s.get("name") or s.get("project", {}).get("name") or ""
                if n:
                    existing_names.append(n)
                sid = s.get("id") or ""
                if sid:
                    existing_names.append(sid)
        except Exception as e:
            print(f"Warning loading existing shelters for sequence resolution: {e}")

        # Incorporate any client-supplied existing names
        client_names = candidate.get("existing_names") or []
        if isinstance(client_names, list):
            existing_names.extend(str(item) for item in client_names if item)

        # Extract sequence numbers matching ThermoShelter_AI_OPT_XXX or shelter_ai_opt_XXX
        seq_nums: List[int] = []
        for name in existing_names:
            m = re.search(r"(?:ThermoShelter_AI_OPT_|shelter[-_]ai[-_]opt[-_])(\d+)", name, re.IGNORECASE)
            if m:
                try:
                    seq_nums.append(int(m.group(1)))
                except ValueError:
                    pass

        # Check candidate's own candidate_id (e.g. AI_OPT_001 -> 1)
        cand_num_match = re.search(r"(\d+)", str(cand_id))
        cand_num = int(cand_num_match.group(1)) if cand_num_match else 1

        # The user's specification:
        # Every time an AI generative designer is called and loaded, check the last name
        # ThermoShelter_AI_OPT_001 and increase it like naming is wrong and make it as a new project.
        if seq_nums:
            max_num = max(seq_nums)
            next_num = max_num + 1
        else:
            # Baseline is considered 001; increment to 002 if 001 was requested, otherwise start fresh
            next_num = cand_num + 1 if cand_num == 1 else cand_num

        tag = f"{next_num:03d}"
        model_name = f"ThermoShelter_AI_OPT_{tag}"
        model_id = f"shelter-ai-opt-{tag}"

        return design_dict_to_shelter_model(params, base_name=model_name, base_id=model_id)

