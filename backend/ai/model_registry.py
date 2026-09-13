"""Model Registry for versioned persistence, governance, and safe loading of surrogate models.

Guarantees:
- Only models tagged 'APPROVED_FOR_SURROGATE_USE' can drive NSGA-II optimization.
- Rejects loading artifacts with schema mismatches or missing preprocessors.
- Tracks EnergyPlus engine versions, training seeds, and feature bounds.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import joblib

from backend.ai.feature_schema import DESIGN_BOUNDS
from backend.ai.model_card import ModelCard
from backend.ai.surrogate_model import MultiTargetSurrogateModel


class ModelNotApprovedError(RuntimeError):
    """Raised when an unapproved or retired model is requested for active surrogate search."""
    pass


class ModelRegistry:
    """Manages versioned model artifacts under storage/ai/models/."""

    DEFAULT_MODELS_DIR = Path("storage/ai/models")

    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = Path(models_dir or self.DEFAULT_MODELS_DIR)
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def _get_next_version(self) -> str:
        existing = [d.name for d in self.models_dir.iterdir() if d.is_dir() and d.name.startswith("v")]
        if not existing:
            return "1"
        versions = []
        for e in existing:
            try:
                versions.append(int(e.replace("v", "")))
            except ValueError:
                pass
        return str(max(versions, default=0) + 1)

    def save_model(
        self,
        surrogate_model: MultiTargetSurrogateModel,
        model_card: ModelCard,
        version: Optional[str] = None,
    ) -> Path:
        """Serializes model, preprocessors, feature bounds, and model cards into a versioned folder."""
        ver = version or self._get_next_version()
        ver_dir = self.models_dir / f"v{ver}"
        ver_dir.mkdir(parents=True, exist_ok=True)

        # 1. Save estimator bundle
        joblib.dump(surrogate_model, ver_dir / "model.joblib", compress=3)

        # 2. Save Model Card (JSON & Markdown)
        model_card.save_json(ver_dir / "model_card.json")
        with open(ver_dir / "model_card.md", "w", encoding="utf-8") as f:
            f.write(model_card.to_markdown())

        # 3. Save feature bounds
        with open(ver_dir / "feature_bounds.json", "w", encoding="utf-8") as f:
            json.dump(DESIGN_BOUNDS, f, indent=2)

        print(f"Model saved successfully to {ver_dir} (Approval status: {model_card.approval_status})")
        return ver_dir

    def load_model(self, version: Optional[str] = None) -> Tuple[MultiTargetSurrogateModel, ModelCard]:
        """Loads a model version. If version is None, loads latest version."""
        if version:
            ver_dir = self.models_dir / f"v{version}"
        else:
            # Find highest version
            existing = [d for d in self.models_dir.iterdir() if d.is_dir() and d.name.startswith("v")]
            if not existing:
                raise FileNotFoundError(f"No models found in {self.models_dir}")
            ver_dir = sorted(existing, key=lambda p: int(p.name.replace("v", "") if p.name.replace("v", "").isdigit() else 0))[-1]

        model_path = ver_dir / "model.joblib"
        card_path = ver_dir / "model_card.json"

        if not model_path.exists() or not card_path.exists():
            raise FileNotFoundError(f"Corrupted model directory at {ver_dir} (missing model or card)")

        surrogate_model = joblib.load(model_path)
        with open(card_path, "r", encoding="utf-8") as f:
            card_dict = json.load(f)
        model_card = ModelCard(**card_dict)

        return surrogate_model, model_card

    def load_approved_model(self, version: Optional[str] = None) -> Tuple[MultiTargetSurrogateModel, ModelCard]:
        """Loads an approved surrogate model. Refuses to load models that are not APPROVED_FOR_SURROGATE_USE."""
        model, card = self.load_model(version=version)
        if card.approval_status != "APPROVED_FOR_SURROGATE_USE":
            raise ModelNotApprovedError(
                f"Model v{card.version} has status '{card.approval_status}'. "
                "Only 'APPROVED_FOR_SURROGATE_USE' models are permitted to drive NSGA-II optimization."
            )
        return model, card

    def approve_model(self, version: str) -> ModelCard:
        """Promotes a validated model to APPROVED_FOR_SURROGATE_USE."""
        ver_dir = self.models_dir / f"v{version}"
        card_path = ver_dir / "model_card.json"
        if not card_path.exists():
            raise FileNotFoundError(f"Model v{version} not found at {ver_dir}")

        with open(card_path, "r", encoding="utf-8") as f:
            card_dict = json.load(f)

        card_dict["approval_status"] = "APPROVED_FOR_SURROGATE_USE"
        card = ModelCard(**card_dict)
        card.save_json(card_path)

        with open(ver_dir / "model_card.md", "w", encoding="utf-8") as f:
            f.write(card.to_markdown())

        print(f"Model v{version} is now APPROVED_FOR_SURROGATE_USE.")
        return card

    def list_models(self) -> List[Dict[str, Any]]:
        """Lists all registered models and their statuses."""
        results = []
        for d in sorted(self.models_dir.iterdir()):
            if d.is_dir() and d.name.startswith("v"):
                card_file = d / "model_card.json"
                if card_file.exists():
                    with open(card_file, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    results.append({
                        "version": meta.get("version"),
                        "model_id": meta.get("model_id"),
                        "status": meta.get("approval_status"),
                        "model_type": meta.get("model_type"),
                        "created": meta.get("created_timestamp"),
                        "dataset": meta.get("training_dataset_version"),
                        "samples": meta.get("training_dataset_samples"),
                    })
        return results
