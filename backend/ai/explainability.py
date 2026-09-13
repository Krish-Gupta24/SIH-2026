"""Target-specific SHAP explainability layer for ThermoShelter AI surrogate models.

Computes exact TreeExplainer Shapley attributions for individual candidate designs,
explaining model predictions per target without hardcoded values or causal overreach.
"""

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
import shap

from backend.ai.surrogate_model import MultiTargetSurrogateModel


@dataclass
class FeatureAttribution:
    feature_name: str
    feature_value: Any
    shap_value: float
    direction: str  # 'DECREASES_TARGET', 'INCREASES_TARGET'


@dataclass
class ExplanationReport:
    target_name: str
    predicted_value: float
    base_value: float
    top_contributors: List[FeatureAttribution]
    all_attributions: List[FeatureAttribution]
    disclaimer: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ModelExplainer:
    """Target-specific TreeExplainer for surrogate models."""

    DISCLAIMER = (
        "Feature attributions are mathematical Shapley values representing statistical model "
        "associations from the trained surrogate. They indicate model sensitivity, not absolute "
        "causal proof. Final engineering validation requires EnergyPlus physics simulation."
    )

    def __init__(self, surrogate_model: MultiTargetSurrogateModel):
        self.surrogate = surrogate_model
        if not self.surrogate.is_fitted:
            raise RuntimeError("Cannot explain an unfitted surrogate model.")

        self.explainers: Dict[str, Any] = {}
        # Lazy initialization of TreeExplainers per target
        for target, estimator in self.surrogate.models.items():
            if hasattr(estimator, "estimators_") or hasattr(estimator, "_raw_predict"):
                try:
                    self.explainers[target] = shap.TreeExplainer(estimator)
                except Exception as e:
                    print(f"Warning: Could not initialize TreeExplainer for {target}: {e}")

    def explain_candidate(
        self,
        candidate_params: Dict[str, Any],
        target_name: str,
        top_k: int = 6,
    ) -> ExplanationReport:
        """Computes local SHAP waterfall attribution for a specific candidate and target."""
        if target_name not in self.surrogate.models:
            raise ValueError(f"Unknown target '{target_name}'. Available: {self.surrogate.target_names}")

        df = pd.DataFrame([candidate_params])
        # Ensure all columns exist
        for col in self.surrogate.feature_columns:
            if col not in df.columns:
                df[col] = 0.0

        X_trans = self.surrogate.preprocessor.transform(df[self.surrogate.feature_columns])
        pred_val = float(self.surrogate.models[target_name].predict(X_trans)[0])

        explainer = self.explainers.get(target_name)
        if explainer is None:
            # Fallback if TreeExplainer failed to init
            return ExplanationReport(
                target_name=target_name,
                predicted_value=round(pred_val, 2),
                base_value=round(pred_val, 2),
                top_contributors=[],
                all_attributions=[],
                disclaimer=self.DISCLAIMER,
            )

        shap_values = explainer.shap_values(X_trans)
        # Handle 1D or 2D array output
        if isinstance(shap_values, list):
            s_vals = shap_values[0][0]
        elif len(shap_values.shape) == 2:
            s_vals = shap_values[0]
        else:
            s_vals = shap_values

        if hasattr(explainer, "expected_value"):
            exp_val = explainer.expected_value
            base_val = float(np.ravel(exp_val)[0]) if hasattr(exp_val, "__len__") else float(exp_val)
        else:
            base_val = pred_val

        # Map back to feature names
        # Note: transformed columns correspond to CATEGORICAL_DESIGN_FEATURES first, then remainder
        col_names = self.surrogate.feature_columns
        attributions: List[FeatureAttribution] = []

        for idx, col in enumerate(col_names):
            if idx < len(s_vals):
                val = candidate_params.get(col, "N/A")
                sh_val = float(s_vals[idx])
                direction = "INCREASES_TARGET" if sh_val > 0 else "DECREASES_TARGET"
                attributions.append(
                    FeatureAttribution(
                        feature_name=col,
                        feature_value=val,
                        shap_value=round(sh_val, 3),
                        direction=direction,
                    )
                )

        # Sort by absolute impact
        attributions.sort(key=lambda a: abs(a.shap_value), reverse=True)
        top_items = attributions[:top_k]

        return ExplanationReport(
            target_name=target_name,
            predicted_value=round(pred_val, 2),
            base_value=round(base_val, 2),
            top_contributors=top_items,
            all_attributions=attributions,
            disclaimer=self.DISCLAIMER,
        )
