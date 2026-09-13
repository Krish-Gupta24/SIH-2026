"""Parquet schema definitions and dataset serialization for ThermoShelter AI.

Enforces schema validation, column types, and metadata persistence (versioning,
EnergyPlus version, random seeds, provenance hash) for all training datasets.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from backend.ai.feature_schema import (
    CATEGORICAL_DESIGN_FEATURES,
    CONTINUOUS_DESIGN_FEATURES,
    DERIVED_PHYSICAL_FEATURES,
    PHYSICAL_CLIMATE_FEATURES,
    WINTER_MODEL_TARGETS,
)


class DatasetSchema:
    """Standardized schema management and Parquet I/O."""

    CURRENT_VERSION = "1.0.0"

    # Core metadata columns retained for auditability
    METADATA_COLUMNS = [
        "sample_id",
        "param_hash",
        "weather_id",
        "weather_filename",
        "weather_sha256",
        "energyplus_version",
        "dataset_stage",
        "dataset_version",
        "simulation_period_days",
        "start_month",
        "start_day",
        "timestamp",
    ]

    @classmethod
    def get_pyarrow_schema(cls, is_winter_period: bool = True) -> pa.Schema:
        """Returns the formal PyArrow schema for dataset validation."""
        fields = []

        # 1. Metadata fields
        for col in cls.METADATA_COLUMNS:
            fields.append(pa.field(col, pa.string()))

        # 2. Continuous design features
        for col in CONTINUOUS_DESIGN_FEATURES:
            fields.append(pa.field(col, pa.float64()))

        # 3. Categorical design features
        for col in CATEGORICAL_DESIGN_FEATURES:
            fields.append(pa.field(col, pa.string()))

        # 4. Derived physical features
        for col in DERIVED_PHYSICAL_FEATURES:
            fields.append(pa.field(col, pa.float64()))

        # 5. Physical climate features
        for col in PHYSICAL_CLIMATE_FEATURES:
            fields.append(pa.field(col, pa.float64()))

        # 6. Targets
        target_cols = WINTER_MODEL_TARGETS if is_winter_period else [
            "annual_heating_demand_kwh_m2",
            "annual_comfort_hours_pct",
            "indoor_min_c",
            "indoor_mean_c",
        ]
        for col in target_cols:
            fields.append(pa.field(col, pa.float64()))

        return pa.schema(fields)

    @classmethod
    def save_dataset(
        cls,
        df: pd.DataFrame,
        output_path: Path,
        dataset_metadata: Optional[Dict[str, str]] = None,
    ) -> Path:
        """Saves a validated DataFrame to Parquet with embedded schema metadata."""
        target_path = Path(output_path)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        meta = {
            "schema_version": cls.CURRENT_VERSION,
            "created_by": "ThermoShelter AI Engine",
        }
        if dataset_metadata:
            meta.update({str(k): str(v) for k, v in dataset_metadata.items()})

        table = pa.Table.from_pandas(df, preserve_index=False)
        custom_metadata = {k.encode("utf-8"): v.encode("utf-8") for k, v in meta.items()}
        existing_meta = table.schema.metadata or {}
        existing_meta.update(custom_metadata)
        table = table.replace_schema_metadata(existing_meta)

        pq.write_table(table, target_path, compression="snappy")
        return target_path

    @classmethod
    def load_dataset(cls, file_path: Path) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """Loads a Parquet dataset and returns DataFrame alongside custom metadata."""
        target_path = Path(file_path)
        if not target_path.exists():
            raise FileNotFoundError(f"Dataset file not found: {target_path}")

        table = pq.read_table(target_path)
        df = table.to_pandas()

        raw_meta = table.schema.metadata or {}
        meta = {
            k.decode("utf-8"): v.decode("utf-8")
            for k, v in raw_meta.items()
        }

        return df, meta
