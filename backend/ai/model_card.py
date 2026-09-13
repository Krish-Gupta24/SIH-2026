"""Standardized Model Card generator for ThermoShelter AI surrogates.

Provides machine-readable JSON and human-readable Markdown documentation
guaranteeing complete scientific transparency for competition juries and defense audits.
"""

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class ModelCard:
    model_id: str
    version: str
    created_timestamp: str
    model_type: str
    approval_status: str  # 'TRAINED', 'VALIDATED', 'APPROVED_FOR_SURROGATE_USE', 'RETIRED'
    simulation_period: str
    target_metrics: List[str]
    training_dataset_version: str
    training_dataset_samples: int
    training_weather_stations: List[str]
    in_domain_metrics: Dict[str, Any]
    leave_one_climate_out_metrics: Dict[str, Any]
    baseline_comparison: Dict[str, Any]
    target_engineering_tolerances: Dict[str, str]
    known_limitations: List[str]
    out_of_domain_behavior: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def save_json(self, output_path: Path) -> Path:
        p = Path(output_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)
        return p

    def to_markdown(self) -> str:
        md = [
            f"# Model Card: {self.model_id} (v{self.version})",
            "",
            f"**Approval Status**: `{self.approval_status}`  ",
            f"**Model Architecture**: `{self.model_type}`  ",
            f"**Simulation Regime**: `{self.simulation_period}`  ",
            f"**Generated**: `{self.created_timestamp}`  ",
            f"**Training Dataset**: `{self.training_dataset_version}` ({self.training_dataset_samples} EnergyPlus runs)  ",
            "",
            "## 1. Verified Climate Domain Coverage",
            ", ".join(f"`{st}`" for st in self.training_weather_stations),
            "",
            "## 2. In-Domain Validation Performance",
            "| Target Metric | MAE | RMSE | R² | 95th % Error | Max Error | Tolerance Gate |",
            "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
        ]

        for target in self.target_metrics:
            m = self.in_domain_metrics.get(target, {})
            tol = self.target_engineering_tolerances.get(target, "N/A")
            mae = m.get("mae", "N/A")
            rmse = m.get("rmse", "N/A")
            r2 = m.get("r2", "N/A")
            p95 = m.get("p95_absolute_error", "N/A")
            max_err = m.get("max_absolute_error", "N/A")
            md.append(f"| `{target}` | {mae} | {rmse} | {r2} | {p95} | {max_err} | {tol} |")

        md.extend([
            "",
            "## 3. Baseline Comparison",
            "| Target Metric | Dummy (Mean) MAE | Ridge Baseline MAE | Surrogate Model MAE | Improvement over Baseline |",
            "| :--- | :--- | :--- | :--- | :--- |",
        ])

        for target in self.target_metrics:
            base_m = self.baseline_comparison.get(target, {})
            dummy_mae = base_m.get("dummy_mae", "N/A")
            ridge_mae = base_m.get("ridge_mae", "N/A")
            model_mae = self.in_domain_metrics.get(target, {}).get("mae", "N/A")
            imp = base_m.get("improvement_pct", "N/A")
            md.append(f"| `{target}` | {dummy_mae} | {ridge_mae} | {model_mae} | {imp} |")

        md.extend([
            "",
            "## 4. Known Limitations & Domain Boundary",
            self.out_of_domain_behavior,
            "",
            "### Limitations:",
        ])
        for lim in self.known_limitations:
            md.append(f"- {lim}")

        return "\n".join(md)
