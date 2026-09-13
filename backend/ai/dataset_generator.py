"""Automated EnergyPlus training dataset generator with staged growth and quality gating.

Orchestrates:
1. Space-filling Latin Hypercube design sampling with categorical balance.
2. Verified high-altitude EPW climate integration and feature extraction.
3. Canonical ShelterModel IDF compilation.
4. Parallel EnergyPlus simulation execution.
5. Physics quality gating and outlier rejection.
6. Versioned Parquet serialization with audit reports.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import tempfile
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd

from backend.ai.climate_extractor import EPWClimateExtractor, PhysicalClimateFeatures
from backend.ai.data_quality import DatasetQualityAuditor, EnergyPlusQualityGate
from backend.ai.dataset_sampler import DesignSpaceSampler
from backend.ai.dataset_schema import DatasetSchema
from backend.ai.feature_schema import (
    CATEGORICAL_DESIGN_FEATURES,
    CONTINUOUS_DESIGN_FEATURES,
    DERIVED_PHYSICAL_FEATURES,
    PHYSICAL_CLIMATE_FEATURES,
    design_dict_to_shelter_model,
)
from simulation.runners.engine import EnergyPlusEngine


class DatasetGenerator:
    """Batch generator transforming parametric design samples into validated EnergyPlus datasets."""

    # Canonical verified weather stations strictly permitted for high-altitude training
    CANONICAL_WEATHER_FILES = [
        "IND_JK_Leh.427053_TMYx.epw",
        "dras_kargil.epw",
        "spiti_valley.epw",
        "tawang.epw",
        "siachen_glacier.epw",
    ]

    def __init__(
        self,
        weather_dir: Path = Path("storage/weather"),
        output_dir: Path = Path("storage/ai/datasets"),
        seed: int = 42,
    ):
        self.weather_dir = Path(weather_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.seed = seed
        self.sampler = DesignSpaceSampler(seed=seed)

        # Pre-extract and cache physical climate features for canonical stations
        self.climate_cache: Dict[str, Tuple[PhysicalClimateFeatures, Any, Path]] = {}
        for w_file in self.CANONICAL_WEATHER_FILES:
            epw_path = self.weather_dir / w_file
            if epw_path.exists():
                try:
                    features, prov = EPWClimateExtractor.extract_features(epw_path)
                    self.climate_cache[prov.weather_id] = (features, prov, epw_path)
                except Exception as e:
                    print(f"Warning: Could not pre-cache climate for {w_file}: {e}")

        if not self.climate_cache:
            raise RuntimeError(f"No verified high-altitude weather files found in {self.weather_dir}")

    def _simulate_single_sample(
        self,
        sample_idx: int,
        design_params: Dict[str, Any],
        weather_id: str,
        stage: str,
        period_days: int,
        start_month: int,
        start_day: int,
    ) -> Optional[Dict[str, Any]]:
        """Executes a single forward EnergyPlus simulation and returns a clean dataset row."""
        climate_feat, prov, epw_path = self.climate_cache[weather_id]
        shelter_model = design_dict_to_shelter_model(design_params, base_name=f"Shelter_S{sample_idx}")

        # Unique isolated workspace for this simulation run
        temp_work_dir = tempfile.mkdtemp(prefix=f"ep_sim_s{sample_idx}_")
        try:
            engine = EnergyPlusEngine()
            engine.prepare_model(
                shelter_model=shelter_model,
                weather_file_path=str(epw_path),
                output_dir=temp_work_dir,
                run_period_days=period_days,
                start_month=start_month,
                start_day=start_day,
            )
            sim_output = engine.run_simulation(timeout_seconds=180)

            # Quality gate
            is_winter = period_days <= 14 and start_month in (12, 1, 2)
            quality = EnergyPlusQualityGate.validate_simulation_result(sim_output, is_winter_period=is_winter)
            if not quality.is_valid or not quality.cleaned_metrics:
                print(f"Sample {sample_idx} rejected by quality gate: {quality.rejection_reasons}")
                return None

            # Assemble full dataset record
            row: Dict[str, Any] = {
                "sample_id": f"SMP_{stage}_{sample_idx:05d}",
                "param_hash": design_params.get("param_hash", ""),
                "weather_id": prov.weather_id,
                "weather_filename": prov.filename,
                "weather_sha256": prov.sha256_hash[:16],
                "energyplus_version": engine.runner.detected_version or "24.1.0",
                "dataset_stage": stage,
                "dataset_version": "1.0.0",
                "simulation_period_days": str(period_days),
                "start_month": str(start_month),
                "start_day": str(start_day),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            # Add continuous design features
            for feat in CONTINUOUS_DESIGN_FEATURES:
                row[feat] = float(design_params[feat])

            # Add categorical design features
            for feat in CATEGORICAL_DESIGN_FEATURES:
                row[feat] = str(design_params[feat])

            # Add derived physical features
            for feat in DERIVED_PHYSICAL_FEATURES:
                row[feat] = float(design_params[feat])

            # Add physical climate features
            row.update(climate_feat.to_dict())

            # Add verified targets
            row.update(quality.cleaned_metrics)

            return row
        except Exception as e:
            print(f"Simulation error on sample {sample_idx}: {e}")
            return None
        finally:
            shutil.rmtree(temp_work_dir, ignore_errors=True)

    def generate(
        self,
        n_samples: int,
        stage: str = "stage_a",
        period_days: int = 3,
        start_month: int = 1,
        start_day: int = 15,
        workers: int = 4,
        output_filename: Optional[str] = None,
        progress_callback: Optional[Any] = None,
    ) -> Tuple[Path, Path]:
        """Generates n_samples validated dataset rows in parallel.

        Args:
            n_samples: Number of valid simulation rows required.
            stage: Stage identifier ('stage_a', 'stage_b', 'stage_c').
            period_days: Length of simulation in days.
            start_month: Beginning month of simulation.
            start_day: Beginning day of month.
            workers: Concurrency level.
            output_filename: Optional custom parquet file name.
            progress_callback: Optional callable receiving (completed, total).

        Returns:
            Tuple of (parquet_file_path, quality_report_json_path).
        """
        weather_ids = list(self.climate_cache.keys())
        # Sample generous candidate design pool to accommodate quality rejections
        pool_size = int(n_samples * 1.3) + 5
        candidate_designs = self.sampler.sample(n_samples=pool_size)

        valid_rows: List[Dict[str, Any]] = []
        filename = output_filename or f"thermoshelter_{stage}_{period_days}d_{n_samples}s.parquet"
        target_parquet = self.output_dir / filename
        report_json = self.output_dir / f"{Path(filename).stem}_quality_report.json"

        print(f"Starting dataset generation: {n_samples} samples across {len(weather_ids)} climate zones ({workers} workers)...")

        with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
            futures = []
            for idx, design in enumerate(candidate_designs):
                assigned_weather = weather_ids[idx % len(weather_ids)]
                f = executor.submit(
                    self._simulate_single_sample,
                    idx + 1,
                    design,
                    assigned_weather,
                    stage,
                    period_days,
                    start_month,
                    start_day,
                )
                futures.append(f)

            completed_count = 0
            for future in as_completed(futures):
                res = future.result()
                if res is not None:
                    valid_rows.append(res)
                    completed_count += 1
                    if progress_callback:
                        progress_callback(completed_count, n_samples)
                    if completed_count >= n_samples:
                        # Cancel remaining
                        for pending in futures:
                            pending.cancel()
                        break

        if len(valid_rows) == 0:
            raise RuntimeError("Zero valid simulation samples could be generated. Check EnergyPlus installation.")

        df = pd.DataFrame(valid_rows[:n_samples])

        # Save Parquet with schema metadata
        DatasetSchema.save_dataset(
            df=df,
            output_path=target_parquet,
            dataset_metadata={
                "stage": stage,
                "period_days": str(period_days),
                "samples_requested": str(n_samples),
                "samples_generated": str(len(df)),
                "weather_stations": ",".join(weather_ids),
                "generated_timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

        # Audit and save quality report
        audit = DatasetQualityAuditor.audit_dataset(df)
        with open(report_json, "w", encoding="utf-8") as f:
            json.dump(audit, f, indent=2)

        print(f"Dataset generation complete! Saved {len(df)} samples to {target_parquet}")
        print(f"Quality report written to {report_json}")
        return target_parquet, report_json
