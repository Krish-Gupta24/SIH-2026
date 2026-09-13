"""Rigorous scientific benchmark comparing Direct Forward EnergyPlus search vs AI Surrogate + NSGA-II search."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Optional
import numpy as np

# Ensure repository root is on sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from backend.ai.climate_extractor import EPWClimateExtractor
from backend.ai.dataset_sampler import DesignSpaceSampler
from backend.ai.feature_schema import design_dict_to_shelter_model
from backend.ai.model_registry import ModelRegistry
from backend.ai.nsga2_optimizer import NSGA2ThermalOptimizer
from backend.ai.objective_functions import OptimizationMode
from backend.ai.verification_service import VerificationService
from simulation.runners.engine import EnergyPlusEngine


def run_benchmark(
    dataset_path: Optional[str] = None,
    weather_file: str = "storage/weather/IND_JK_Leh.427053_TMYx.epw",
    n_direct_evals: int = 20,
    pop_size: int = 50,
    generations: int = 20,
    output_report: str = "storage/ai/benchmark_report.json",
):
    print("=================================================================")
    print("THERMOSHELTER AI BENCHMARK EXPERIMENT")
    print("Direct Forward Physics Search vs AI Surrogate + NSGA-II Search")
    print("=================================================================\n")

    epw_path = Path(weather_file)
    climate_feat, prov = EPWClimateExtractor.extract_features(epw_path)
    climate_dict = climate_feat.to_dict()

    sampler = DesignSpaceSampler(seed=42)

    # -------------------------------------------------------------
    # 1. METHOD A: Direct Forward EnergyPlus Sweep
    # -------------------------------------------------------------
    print(f"[METHOD A] Running Direct Forward EnergyPlus Sweep ({n_direct_evals} evaluations)...")
    direct_candidates = sampler.sample(n_samples=n_direct_evals)

    t0_direct = time.perf_counter()
    direct_results = []

    for idx, cand in enumerate(direct_candidates):
        shelter_model = design_dict_to_shelter_model(cand, base_name=f"Direct_{idx+1}")
        engine = EnergyPlusEngine()
        engine.prepare_model(shelter_model, str(epw_path), run_period_days=3, start_month=1, start_day=15)
        res = engine.run_simulation(timeout_seconds=120)

        tp = res.get("thermal_performance", {}).get("indoor_temperature", {})
        energy = res.get("energy", {})
        direct_results.append({
            "candidate_idx": idx + 1,
            "min_c": tp.get("min_c", 0.0),
            "mean_c": tp.get("mean_c", 0.0),
            "heating_demand": energy.get("heating_demand_kwh_m2", 0.0),
        })

    duration_direct = time.perf_counter() - t0_direct
    best_direct_heating = min(r["heating_demand"] for r in direct_results)
    best_direct_temp = max(r["min_c"] for r in direct_results)

    print(f"Method A Complete in {duration_direct:.2f}s.")
    print(f"  Best Heating Demand: {best_direct_heating:.2f} kWh/m2 | Best Min Temp: {best_direct_temp:.2f} C\n")

    # -------------------------------------------------------------
    # 2. METHOD B: AI Surrogate + pymoo NSGA-II Search
    # -------------------------------------------------------------
    print(f"[METHOD B] Running AI Surrogate + NSGA-II ({pop_size} pop x {generations} gen = {pop_size * generations} evaluations)...")
    registry = ModelRegistry()
    surrogate, model_card = registry.load_model()  # Loads latest registered model

    t0_ai = time.perf_counter()
    optimizer = NSGA2ThermalOptimizer(surrogate_model=surrogate, climate_features=climate_dict, seed=42)
    pareto_candidates = optimizer.optimize(
        target_indoor_min_c=10.0,
        mode=OptimizationMode.BALANCED,
        population_size=pop_size,
        generations=generations,
    )
    duration_ai_search = time.perf_counter() - t0_ai

    print(f"AI Search Complete in {duration_ai_search:.2f}s ({len(pareto_candidates)} Pareto designs discovered).")

    # Verify top-5 candidates via real EnergyPlus
    print("Verifying Top-5 AI candidates via EnergyPlus...")
    t0_verify = time.perf_counter()
    verifier = VerificationService(epw_path=epw_path)
    verified = verifier.verify_candidates(pareto_candidates, k=5, period_days=3, start_month=1, start_day=15)
    duration_verify = time.perf_counter() - t0_verify

    total_ai_duration = duration_ai_search + duration_verify

    valid_verified = [v for v in verified if v.is_physics_verified and v.verified_physics]
    best_ai_heating = min(v.verified_physics.get("winter_heating_demand_kwh_m2", 999.0) for v in valid_verified) if valid_verified else 0.0
    best_ai_temp = max(v.verified_physics.get("winter_indoor_min_c", -50.0) for v in valid_verified) if valid_verified else 0.0

    # Verification Regret: Difference in heating between surrogate prediction and verified actual
    cal_errors = [abs(v.calibration_error.get("winter_heating_demand_kwh_m2", 0.0)) for v in valid_verified]
    mean_regret = round(float(np.mean(cal_errors)), 2) if cal_errors else 0.0

    speedup = round((duration_direct / total_ai_duration) * (pop_size * generations / n_direct_evals), 1)

    print(f"Total AI Execution Duration: {total_ai_duration:.2f}s (Search: {duration_ai_search:.2f}s + Verification: {duration_verify:.2f}s)")
    print(f"  Best Verified Heating: {best_ai_heating:.2f} kWh/m2 | Best Verified Min Temp: {best_ai_temp:.2f} C")
    print(f"  Surrogate Calibration Error / Regret: {mean_regret:.2f} kWh/m2")

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "weather_location": prov.location_name,
        "direct_search": {
            "evaluations": n_direct_evals,
            "duration_s": round(duration_direct, 2),
            "best_heating_demand_kwh_m2": round(best_direct_heating, 2),
            "best_min_temp_c": round(best_direct_temp, 2),
        },
        "ai_search": {
            "surrogate_evaluations": pop_size * generations,
            "search_duration_s": round(duration_ai_search, 2),
            "verification_duration_s": round(duration_verify, 2),
            "total_duration_s": round(total_ai_duration, 2),
            "pareto_candidates_found": len(pareto_candidates),
            "top_k_verified": len(valid_verified),
            "best_verified_heating_demand_kwh_m2": round(best_ai_heating, 2),
            "best_verified_min_temp_c": round(best_ai_temp, 2),
            "mean_calibration_error_kwh_m2": mean_regret,
        },
        "comparison_metrics": {
            "speedup_factor": speedup,
            "heating_demand_parity": round(best_ai_heating - best_direct_heating, 2),
        },
    }

    out_p = Path(output_report)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    with open(out_p, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\n[BENCHMARK SAVED] Report written to: {out_p}")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run ThermoShelter AI search vs Direct search benchmark.")
    parser.add_argument("--evals", type=int, default=10, help="Number of direct EnergyPlus evaluations")
    parser.add_argument("--pop", type=int, default=30, help="NSGA-II population")
    parser.add_argument("--gen", type=int, default=10, help="NSGA-II generations")
    parser.add_argument("--output", type=str, default="storage/ai/benchmark_report.json", help="Report JSON path")
    args = parser.parse_args()

    run_benchmark(n_direct_evals=args.evals, pop_size=args.pop, generations=args.gen, output_report=args.output)
