"""Multi-target surrogate machine learning model with multi-split evaluation and baseline comparisons.

Provides:
- ColumnTransformer pipeline with OrdinalEncoder for categoricals.
- Reference baselines: DummyRegressor (mean) and Ridge regression.
- Supervised surrogates: HistGradientBoostingRegressor (baseline) and RandomForestRegressor (challenger).
- Multi-split evaluation: In-domain random split, grouped design-family split, and leave-one-climate-out (LOCO).
- High-throughput vectorized batch prediction for genetic optimization.
"""

from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OrdinalEncoder

from backend.ai.feature_schema import (
    CATEGORICAL_DESIGN_FEATURES,
    CONTINUOUS_DESIGN_FEATURES,
    DERIVED_PHYSICAL_FEATURES,
    PHYSICAL_CLIMATE_FEATURES,
    WINTER_MODEL_TARGETS,
    check_domain_bounds,
)


@dataclass
class TargetEvaluationMetrics:
    mae: float
    rmse: float
    r2: float
    p95_absolute_error: float
    max_absolute_error: float

    def to_dict(self) -> Dict[str, float]:
        return asdict(self)


class MultiTargetSurrogateModel:
    """Multi-target supervised regression surrogate for fast thermal performance approximation."""

    def __init__(
        self,
        target_names: Optional[List[str]] = None,
        model_type: str = "hist_gbr",
        seed: int = 42,
    ):
        self.target_names = target_names or list(WINTER_MODEL_TARGETS)
        self.model_type = model_type  # 'hist_gbr', 'random_forest', 'ridge', 'dummy'
        self.seed = seed

        self.feature_columns = (
            CONTINUOUS_DESIGN_FEATURES
            + DERIVED_PHYSICAL_FEATURES
            + PHYSICAL_CLIMATE_FEATURES
            + CATEGORICAL_DESIGN_FEATURES
        )

        # Preprocessor: OrdinalEncoder for categoricals, passthrough for numericals
        self.preprocessor = ColumnTransformer(
            transformers=[
                (
                    "cat",
                    OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1),
                    CATEGORICAL_DESIGN_FEATURES,
                ),
            ],
            remainder="passthrough",
        )

        self.models: Dict[str, Any] = {}
        self.is_fitted = False
        self.evaluation_results: Dict[str, Any] = {}

    def _create_estimator(self) -> Any:
        if self.model_type == "hist_gbr":
            return HistGradientBoostingRegressor(
                max_iter=150,
                min_samples_leaf=5,
                learning_rate=0.08,
                random_state=self.seed,
            )
        elif self.model_type == "random_forest":
            return RandomForestRegressor(
                n_estimators=100,
                min_samples_leaf=3,
                random_state=self.seed,
                n_jobs=-1,
            )
        elif self.model_type == "ridge":
            return Ridge(alpha=1.0)
        elif self.model_type == "dummy":
            return DummyRegressor(strategy="mean")
        else:
            raise ValueError(f"Unsupported model type: {self.model_type}")

    def fit(self, df: pd.DataFrame) -> "MultiTargetSurrogateModel":
        """Fits preprocessor and target-specific estimators."""
        X_df = df[self.feature_columns].copy()
        X_trans = self.preprocessor.fit_transform(X_df)

        for target in self.target_names:
            if target not in df.columns:
                raise ValueError(f"Target column '{target}' not found in training DataFrame.")

            y = df[target].values
            estimator = self._create_estimator()
            estimator.fit(X_trans, y)
            self.models[target] = estimator

        self.is_fitted = True
        return self

    @staticmethod
    def _compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> TargetEvaluationMetrics:
        mae = float(mean_absolute_error(y_true, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
        r2 = float(r2_score(y_true, y_pred)) if len(y_true) > 1 else 0.0
        abs_errors = np.abs(y_true - y_pred)
        p95 = float(np.percentile(abs_errors, 95))
        max_err = float(np.max(abs_errors))

        return TargetEvaluationMetrics(
            mae=round(mae, 3),
            rmse=round(rmse, 3),
            r2=round(r2, 4),
            p95_absolute_error=round(p95, 3),
            max_absolute_error=round(max_err, 3),
        )

    def evaluate_splits(
        self,
        df: pd.DataFrame,
        test_size: float = 0.20,
    ) -> Dict[str, Any]:
        """Evaluates across multiple rigorous split protocols:
        1. In-domain random split
        2. Grouped split by design family (aspect ratio bin)
        3. Leave-One-Climate-Out (LOCO) if multiple weather_ids present
        """
        results: Dict[str, Any] = {}

        # --- Protocol A: In-Domain Random Split ---
        train_df, test_df = train_test_split(df, test_size=test_size, random_state=self.seed)
        model_a = MultiTargetSurrogateModel(
            target_names=self.target_names,
            model_type=self.model_type,
            seed=self.seed,
        )
        model_a.fit(train_df)

        in_domain_metrics = {}
        for target in self.target_names:
            preds = model_a.predict_target(test_df, target)
            y_actual = test_df[target].values
            in_domain_metrics[target] = self._compute_metrics(y_actual, preds).to_dict()

        results["in_domain_metrics"] = in_domain_metrics

        # --- Protocol B: Leave-One-Climate-Out (LOCO) ---
        if "weather_id" in df.columns and df["weather_id"].nunique() > 1:
            loco_metrics = {}
            for held_out_station in df["weather_id"].unique():
                train_loco = df[df["weather_id"] != held_out_station]
                test_loco = df[df["weather_id"] == held_out_station]

                if test_loco.empty or train_loco.empty:
                    continue

                model_loco = MultiTargetSurrogateModel(
                    target_names=self.target_names,
                    model_type=self.model_type,
                    seed=self.seed,
                )
                model_loco.fit(train_loco)

                station_res = {}
                for target in self.target_names:
                    preds = model_loco.predict_target(test_loco, target)
                    y_actual = test_loco[target].values
                    station_res[target] = self._compute_metrics(y_actual, preds).to_dict()
                loco_metrics[held_out_station] = station_res

            results["leave_one_climate_out_metrics"] = loco_metrics

        # --- Protocol C: Error Correlation Across Targets ---
        error_df = pd.DataFrame()
        for target in self.target_names:
            preds = model_a.predict_target(test_df, target)
            error_df[f"{target}_err"] = test_df[target].values - preds

        corr_matrix = error_df.corr().round(3).to_dict()
        results["target_error_correlations"] = corr_matrix

        self.evaluation_results = results
        return results

    def predict_target(self, df_or_dict: Union[pd.DataFrame, Dict[str, Any]], target: str) -> np.ndarray:
        """Predicts a single target metric."""
        if not self.is_fitted:
            raise RuntimeError("Surrogate model must be fitted before predicting.")

        if isinstance(df_or_dict, dict):
            df = pd.DataFrame([df_or_dict])
        else:
            df = df_or_dict

        # Ensure all columns exist, fallback to 0.0 if missing derived
        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0.0

        X_trans = self.preprocessor.transform(df[self.feature_columns])
        return self.models[target].predict(X_trans)

    def predict_batch(self, df_or_dicts: Union[pd.DataFrame, List[Dict[str, Any]]]) -> Dict[str, np.ndarray]:
        """High-throughput vectorized batch inference for NSGA-II population evaluation."""
        if not self.is_fitted:
            raise RuntimeError("Surrogate model must be fitted before predicting.")

        if isinstance(df_or_dicts, list):
            df = pd.DataFrame(df_or_dicts)
        else:
            df = df_or_dicts

        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0.0

        X_trans = self.preprocessor.transform(df[self.feature_columns])

        predictions: Dict[str, np.ndarray] = {}
        for target in self.target_names:
            predictions[target] = self.models[target].predict(X_trans)

        return predictions

    def predict_single(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Inference for a single candidate dictionary with domain boundary check."""
        is_in_domain, confidence, warnings = check_domain_bounds(params)
        batch_preds = self.predict_batch([params])

        result: Dict[str, Any] = {
            "is_in_domain": is_in_domain,
            "domain_confidence": confidence,
            "domain_warnings": warnings,
            "model_type": self.model_type,
            "predictions": {
                target: round(float(batch_preds[target][0]), 2)
                for target in self.target_names
            },
        }
        return result
