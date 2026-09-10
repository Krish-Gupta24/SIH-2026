"""Executable audit script for EnergyPlus solar-related output variables.

Verifies and audits:
- incident solar radiation
- transmitted solar radiation where supported
- absorbed solar gains where supported
- solar heat gain through windows
- total useful solar gain

Prints which requested variables were:
- produced
- missing
- unsupported
"""

import sys
import os
import csv
from pathlib import Path

# Ensure repo root in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from simulation.results.output_registry import OutputVariableRegistry, OutputCategory
from simulation.runners.engine import EnergyPlusEngine
from simulation.validation.result_completeness_validator import ResultCompletenessValidator


def run_solar_audit():
    print("=" * 80)
    print("ENERGYPLUS SOLAR OUTPUT AUDIT REPORT")
    print("=" * 80)

    # 1. Define model with south-facing window aperture for solar transmission & absorption
    shelter_model = {
        "id": "solar-audit-shelter-leh",
        "name": "Leh High-Altitude Solar Audit Post",
        "version": "1.0.0",
        "geometry": {
            "length": 6.0,
            "width": 4.0,
            "height": 2.8,
            "roof_type": "Flat",
            "roof_angle": 0.0,
            "orientation": 0.0,  # True South
        },
        "location": {
            "region": "Leh Ladakh",
            "elevation": 3500.0,
            "latitude": 34.1526,
            "longitude": 77.5771,
        },
        "envelope": {
            "walls": {
                "south": {"constructionId": "default-insulated-earth-wall"},
                "north": {"constructionId": "default-insulated-earth-wall"},
                "east": {"constructionId": "default-insulated-earth-wall"},
                "west": {"constructionId": "default-insulated-earth-wall"},
            }
        },
        "windows": [
            {
                "id": "Win_South_Aperture",
                "wall": "south",
                "position_x": 1.5,
                "width": 2.0,
                "height": 1.2,
                "sill_height": 0.9,
                "glazing_type": "Double_LowE_Argon",
            }
        ],
        "doors": [],
        "ventilation": {"infiltrationACH": 0.35},
        "thermal_mass": [{"id": "mass_slab", "type": "FloorSlab", "material": "mat-concrete-slab", "thickness": 0.15, "surface_area": 24.0}],
    }

    epw_path = str(REPO_ROOT / "simulation" / "weather" / "test_weather.epw")
    out_dir = str(REPO_ROOT / "storage" / "simulations" / "solar_audit_run")

    print(f"\n[1] Initializing EnergyPlus Engine...")
    engine = EnergyPlusEngine()
    print(f"    Engine version: {engine.runner.detected_version}")
    print(f"    Executable path: {engine.runner.executable_path}")

    print(f"\n[2] Preparing model with OutputVariableRegistry requests...")
    idf_path = engine.prepare_model(
        shelter_model=shelter_model,
        weather_file_path=epw_path,
        output_dir=out_dir,
        run_period_days=2,
        start_month=1,
        start_day=1,
    )
    print(f"    Generated IDF: {idf_path}")

    # Check requested Output:Variable entries in generated IDF
    idf_text = Path(idf_path).read_text(encoding="utf-8")
    requested_ep_vars = []
    for line in idf_text.splitlines():
        if line.strip().startswith("Output:Variable,"):
            parts = [p.strip().rstrip(";") for p in line.split(",")]
            if len(parts) >= 3:
                requested_ep_vars.append(parts[2])

    print(f"    Total Output:Variable requested in IDF: {len(requested_ep_vars)}")

    print(f"\n[3] Executing Live EnergyPlus Simulation...")
    results = engine.run_simulation(timeout_seconds=120)
    print(f"    Simulation Status: {engine.status}")
    print(f"    Exit Code: {results.get('exit_code')}")
    print(f"    Duration: {results.get('duration_seconds')}s")

    # 4. Inspect RDD (Report Data Dictionary - supported in installed EnergyPlus)
    rdd_file = Path(out_dir) / "eplusout.rdd"
    supported_in_rdd = set()
    if rdd_file.exists():
        for line in rdd_file.read_text(encoding="utf-8", errors="replace").splitlines():
            if "," in line:
                parts = line.split(",")
                if len(parts) >= 3:
                    var_and_unit = parts[2].strip()
                    # e.g. "Site Direct Solar Radiation Rate per Area [W/m2]"
                    var_name = var_and_unit.split("[")[0].strip()
                    supported_in_rdd.add(var_name.lower())

    # 5. Inspect CSV headers (actually produced in CSV)
    csv_file = Path(out_dir) / "eplusout.csv"
    produced_headers = []
    if csv_file.exists():
        with open(csv_file, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            produced_headers = next(reader, [])

    produced_headers_clean = [h.strip() for h in produced_headers]

    print(f"\n[4] AUDITING REQUESTED OUTPUT VARIABLES AGAINST ENGINE ARTIFACTS:")
    print("-" * 80)
    print(f"{'Metric':<35} | {'Category':<10} | {'Status':<12} | {'Unit'}")
    print("-" * 80)

    produced_list = []
    missing_list = []
    unsupported_list = []

    all_specs = OutputVariableRegistry.get_all()
    for spec in all_specs:
        var_name = spec.ep_variable_name
        is_supported = var_name.lower() in supported_in_rdd

        # Check if actually produced in CSV
        is_produced = any(var_name.lower() in h.lower() for h in produced_headers_clean)

        if is_produced:
            status_str = "PRODUCED"
            produced_list.append(spec)
        elif is_supported:
            status_str = "MISSING"  # Supported by EnergyPlus, but not produced (e.g. no aperture or specific condition)
            missing_list.append(spec)
        else:
            status_str = "UNSUPPORTED"
            unsupported_list.append(spec)

        print(f"{spec.metric:<35} | {spec.category.value:<10} | {status_str:<12} | {spec.unit}")

    # 6. Detail Audit of the 5 Required Solar Concepts
    print("\n" + "=" * 80)
    print("DETAILED VERIFICATION OF 5 REQUIRED SOLAR CONCEPTS:")
    print("=" * 80)

    solar_concepts = [
        "incident solar radiation",
        "transmitted solar radiation where supported",
        "absorbed solar gains where supported",
        "solar heat gain through windows",
        "total useful solar gain",
    ]

    sim_res = engine.get_simulation_result()

    for concept in solar_concepts:
        matching_specs = OutputVariableRegistry.get_by_concept(concept)
        print(f"\nConcept: [{concept.upper()}]")
        for spec in matching_specs:
            found_col = [h for h in produced_headers_clean if spec.ep_variable_name.lower() in h.lower()]
            if found_col:
                print(f"  [+] PRODUCED: '{spec.ep_variable_name}' [{spec.unit}]")
                print(f"      CSV Column: '{found_col[0]}'")
                print(f"      Parser Key: '{spec.parser_key}'")
            else:
                is_supp = spec.ep_variable_name.lower() in supported_in_rdd
                stat = "MISSING (Supported but not produced)" if is_supp else "UNSUPPORTED"
                print(f"  [-] {stat}: '{spec.ep_variable_name}' [{spec.unit}]")

    print("\n" + "=" * 80)
    print(f"AUDIT SUMMARY:")
    print(f"  Total Registered Variables : {len(all_specs)}")
    print(f"  PRODUCED in this run       : {len(produced_list)}")
    print(f"  MISSING                    : {len(missing_list)}")
    print(f"  UNSUPPORTED                : {len(unsupported_list)}")
    print(f"  Completeness Status        : {engine.status}")
    print("=" * 80)

    return {
        "produced": [s.metric for s in produced_list],
        "missing": [s.metric for s in missing_list],
        "unsupported": [s.metric for s in unsupported_list],
        "engine_status": engine.status,
    }


if __name__ == "__main__":
    run_solar_audit()
