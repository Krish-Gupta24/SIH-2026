"""Envelope Construction & Material Inspection Utility.

Traces the entire lifecycle:
UI → ShelterModel → Construction → Layer[] → Material[] → EnergyPlus Construction → EnergyPlus Surface

Demonstrates and verifies:
1. Simple wall (monolithic / single-layer assembly)
2. Multilayer wall (multi-layer assembly with strict outside-to-inside ordering)
3. Different North and South walls (distinct assemblies assigned to different cardinal walls)
4. Roof (insulated sloped/flat roof assembly with cladding, thermal barrier, and ceiling finish)
5. Floor (insulated ground slab with permafrost isolation)

Also runs real EnergyPlus simulation on the verified model.
"""

import sys
import json
import tempfile
from pathlib import Path
from typing import Dict, Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from simulation.materials.material import Material, MaterialStatus, ConstructionLayer, Construction
from simulation.materials.database import material_db
from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.runners.energyplus_runner import EnergyPlusRunner


def build_scenario_models() -> Dict[str, Dict[str, Any]]:
    """Build the 5 requested scenario configurations."""

    # 1. Simple wall (Single-layer 200mm AAC Block)
    simple_wall_shelter = {
        "id": "scenario_1_simple_wall",
        "name": "Scenario 1: Simple Monolithic Wall Shelter",
        "geometry": {"length": 6.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0, "orientation": 0.0},
        "envelope": {
            "walls": {
                "north": {"constructionId": "const-simple-aac", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                "south": {"constructionId": "const-simple-aac", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                "east": {"constructionId": "const-simple-aac", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                "west": {"constructionId": "const-simple-aac", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
            },
            "roof": {"constructionId": "const-roof", "layers": [{"materialId": "mat-galvanized-steel", "thickness": 0.005}, {"materialId": "mat-eps-insulation", "thickness": 0.15}]},
            "floor": {"constructionId": "const-floor", "layers": [{"materialId": "mat-concrete-slab", "thickness": 0.15}]},
        },
    }

    # 2. Multilayer wall (3-layer: Outside Plaster + Middle EPS + Inside Rammed Earth)
    multilayer_wall_shelter = {
        "id": "scenario_2_multilayer_wall",
        "name": "Scenario 2: Multilayer High-R Wall Shelter",
        "geometry": {"length": 6.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0, "orientation": 0.0},
        "envelope": {
            "walls": {
                "north": {
                    "constructionId": "const-multilayer-wall",
                    "layers": [
                        {"materialId": "mat-mud-plaster", "thickness": 0.025},     # Layer 1: OUTSIDE
                        {"materialId": "mat-eps-insulation", "thickness": 0.150},  # Layer 2: MIDDLE
                        {"materialId": "mat-rammed-earth", "thickness": 0.300},    # Layer 3: INSIDE
                    ],
                },
                "south": {
                    "constructionId": "const-multilayer-wall",
                    "layers": [
                        {"materialId": "mat-mud-plaster", "thickness": 0.025},
                        {"materialId": "mat-eps-insulation", "thickness": 0.150},
                        {"materialId": "mat-rammed-earth", "thickness": 0.300},
                    ],
                },
                "east": {"constructionId": "const-multilayer-wall", "layers": [{"materialId": "mat-mud-plaster", "thickness": 0.025}, {"materialId": "mat-eps-insulation", "thickness": 0.150}, {"materialId": "mat-rammed-earth", "thickness": 0.300}]},
                "west": {"constructionId": "const-multilayer-wall", "layers": [{"materialId": "mat-mud-plaster", "thickness": 0.025}, {"materialId": "mat-eps-insulation", "thickness": 0.150}, {"materialId": "mat-rammed-earth", "thickness": 0.300}]},
            },
            "roof": {"constructionId": "const-roof", "layers": [{"materialId": "mat-galvanized-steel", "thickness": 0.005}, {"materialId": "mat-eps-insulation", "thickness": 0.15}]},
            "floor": {"constructionId": "const-floor", "layers": [{"materialId": "mat-concrete-slab", "thickness": 0.15}]},
        },
    }

    # 3. Different North/South walls (North = Sub-zero wind barrier; South = Direct solar absorption)
    distinct_ns_walls_shelter = {
        "id": "scenario_3_distinct_walls",
        "name": "Scenario 3: Asymmetric North/South Climate-Optimized Walls",
        "geometry": {"length": 6.0, "width": 4.0, "height": 2.8, "roof_type": "Gable", "roof_angle": 18.0, "orientation": 0.0},
        "envelope": {
            "walls": {
                # North Wall: Heavy Granite + Super Aerogel Insulation for harsh North winds
                "north": {
                    "constructionId": "const-north-heavy-insulated",
                    "name": "North Heavy Alpine Wind Barrier Wall",
                    "layers": [
                        {"materialId": "mat-granite-stone", "thickness": 0.250},   # OUTSIDE
                        {"materialId": "mat-aerogel-blanket", "thickness": 0.030}, # MIDDLE
                        {"materialId": "mat-mud-plaster", "thickness": 0.025},     # INSIDE
                    ],
                },
                # South Wall: High-absorption Rammed Earth with EPS for solar thermal storage
                "south": {
                    "constructionId": "const-south-solar-storage",
                    "name": "South Direct-Gain Solar Mass Wall",
                    "layers": [
                        {"materialId": "mat-eps-insulation", "thickness": 0.100},  # OUTSIDE
                        {"materialId": "mat-rammed-earth", "thickness": 0.350},    # INSIDE
                    ],
                },
                "east": {
                    "constructionId": "const-east-rammed-earth",
                    "layers": [{"materialId": "mat-eps-insulation", "thickness": 0.120}, {"materialId": "mat-rammed-earth", "thickness": 0.250}],
                },
                "west": {
                    "constructionId": "const-west-granite",
                    "layers": [{"materialId": "mat-granite-stone", "thickness": 0.200}, {"materialId": "mat-eps-insulation", "thickness": 0.150}],
                },
            },
            "roof": {
                "constructionId": "const-roof-aerogel-heavy",
                "name": "Aerogel Insulated Cold Climate Roof",
                "layers": [
                    {"materialId": "mat-galvanized-steel", "thickness": 0.005},
                    {"materialId": "mat-aerogel-blanket", "thickness": 0.030},
                    {"materialId": "mat-himalayan-timber", "thickness": 0.025},
                ],
            },
            "floor": {
                "constructionId": "const-floor-perimeter-slab",
                "name": "Insulated Permafrost Isolation Floor Slab",
                "layers": [
                    {"materialId": "mat-xps-insulation", "thickness": 0.100},
                    {"materialId": "mat-concrete-slab", "thickness": 0.150},
                ],
            },
        },
    }

    # 4. Roof inspection scenario
    roof_shelter = {
        "id": "scenario_4_roof",
        "name": "Scenario 4: High-Performance Pitched Roof Envelope",
        "geometry": {"length": 7.0, "width": 4.5, "height": 2.8, "roof_type": "Shed", "roof_angle": 15.0, "orientation": 0.0},
        "envelope": {
            "walls": {"north": {"constructionId": "const-wall", "layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}, {"materialId": "mat-rammed-earth", "thickness": 0.30}]}},
            "roof": {
                "constructionId": "const-triple-layer-cold-roof",
                "name": "Triple-Layer Alpine Cold Roof Assembly",
                "layers": [
                    {"materialId": "mat-galvanized-steel", "thickness": 0.005},   # Cladding (OUTSIDE)
                    {"materialId": "mat-eps-insulation", "thickness": 0.200},     # Thick Thermal Barrier
                    {"materialId": "mat-himalayan-timber", "thickness": 0.035},   # Structural Timber Ceiling (INSIDE)
                ],
            },
            "floor": {"constructionId": "const-floor", "layers": [{"materialId": "mat-concrete-slab", "thickness": 0.15}]},
        },
    }

    # 5. Floor inspection scenario
    floor_shelter = {
        "id": "scenario_5_floor",
        "name": "Scenario 5: Dual-Layer Insulated Sub-Slab Ground Floor",
        "geometry": {"length": 6.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0, "orientation": 0.0},
        "envelope": {
            "walls": {"north": {"constructionId": "const-wall", "layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}, {"materialId": "mat-rammed-earth", "thickness": 0.30}]}},
            "roof": {"constructionId": "const-roof", "layers": [{"materialId": "mat-galvanized-steel", "thickness": 0.005}, {"materialId": "mat-eps-insulation", "thickness": 0.15}]},
            "floor": {
                "constructionId": "const-subslab-permafrost-barrier",
                "name": "High-Compressive XPS Sub-Slab & Concrete Thermal Storage",
                "layers": [
                    {"materialId": "mat-xps-insulation", "thickness": 0.120},  # Ground interface (OUTSIDE / BELOW)
                    {"materialId": "mat-concrete-slab", "thickness": 0.180},   # Internal thermal mass (INSIDE / ABOVE)
                ],
            },
        },
    }

    return {
        "simple_wall": simple_wall_shelter,
        "multilayer_wall": multilayer_wall_shelter,
        "different_north_south": distinct_ns_walls_shelter,
        "roof": roof_shelter,
        "floor": floor_shelter,
    }


def run_envelope_inspection_suite(execute_energyplus: bool = True) -> bool:
    """Run generated-model inspection across all 5 envelope configurations."""
    scenarios = build_scenario_models()
    generator = EnergyPlusIDFGenerator(engine_version="24.1")

    print("\n" + "=" * 80)
    print("STARTING ENVELOPE CONSTRUCTION & THERMOPHYSICAL MAPPING VERIFICATION")
    print("=" * 80)

    for name, shelter_model in scenarios.items():
        print(f"\n>>> EXECUTING INSPECTION TRACE FOR: {name.upper()} ({shelter_model['name']})")
        report_str = generator.format_envelope_inspection(shelter_model)
        print(report_str)

        # Assert no unwanted fallbacks for explicit user models
        insp = generator.inspect_envelope(shelter_model)
        for s_role, s_meta in insp["surfaces"].items():
            if s_role in shelter_model.get("envelope", {}).get("walls", {}) or s_role in shelter_model.get("envelope", {}):
                assert not s_meta["is_fallback"], f"Silent fallback detected unexpectedly on {s_role} in scenario {name}!"

    # Run real EnergyPlus simulation on Scenario 3 (most demanding: distinct walls + gable roof + multi-layer)
    if execute_energyplus:
        print("\n" + "=" * 80)
        print("RUNNING REAL ENERGYPLUS SIMULATION WITH DISTINCT MULTILAYER ENVELOPE")
        print("=" * 80)

        target_shelter = scenarios["different_north_south"]
        runner = EnergyPlusRunner()
        assert runner.is_available, f"EnergyPlus executable not found at: {runner.executable_path}"

        weather_file = REPO_ROOT / "simulation" / "weather" / "test_weather.epw"
        assert weather_file.exists(), f"Weather file {weather_file} not found"

        with tempfile.TemporaryDirectory() as tmpdir:
            work_dir = Path(tmpdir)
            idf_path = str(work_dir / "in.idf")

            # Generate IDF with complete distinct envelope constructions
            generated_idf = generator.generate_idf(
                shelter=target_shelter,
                output_path=idf_path,
                run_period_days=1,
                start_month=1,
                start_day=15,
                end_month=1,
                end_day=15,
                timestep=4,
            )

            print(f"Generated EnergyPlus IDF: {generated_idf}")
            idf_content = Path(generated_idf).read_text(encoding="utf-8")

            # Verify that distinct constructions are written to IDF
            assert "NorthWall_Const" in idf_content
            assert "SouthWall_Const" in idf_content
            assert "EastWall_Const" in idf_content
            assert "WestWall_Const" in idf_content
            assert "Roof_Const" in idf_content
            assert "Floor_Const" in idf_content

            # Verify surface bindings
            import re
            assert re.search(r"NorthWall,[\s\S]*?Wall,[\s\S]*?NorthWall_Const,", idf_content) is not None, "NorthWall not bound to NorthWall_Const"
            assert re.search(r"SouthWall,[\s\S]*?Wall,[\s\S]*?SouthWall_Const,", idf_content) is not None, "SouthWall not bound to SouthWall_Const"

            # Execute EnergyPlus
            print("Executing EnergyPlus runner...")
            output = runner.run(
                idf_path=generated_idf,
                epw_path=str(weather_file.resolve()),
                work_dir=str(work_dir),
                timeout_seconds=60,
            )

            print(f"Execution Exit Code: {output.exit_code}")
            print(f"Duration: {output.duration_seconds:.2f} seconds")

            if output.exit_code != 0:
                print("STDOUT:\n", output.stdout)
                print("STDERR:\n", output.stderr)
                if output.err_file_path and Path(output.err_file_path).exists():
                    print("ERR FILE:\n", Path(output.err_file_path).read_text())
                return False

            # Inspect error log for severe errors
            if output.err_file_path and Path(output.err_file_path).exists():
                err_text = Path(output.err_file_path).read_text()
                has_severe = "** Severe **" in err_text or "** Fatal **" in err_text
                print("\nEnergyPlus Log Status:")
                for line in err_text.splitlines():
                    if "EnergyPlus Completed" in line or "** Warning **" in line or "** Severe **" in line or "** Fatal **" in line:
                        print("  " + line)
                assert not has_severe, f"EnergyPlus reported severe/fatal errors:\n{err_text}"

            print("\n[SUCCESS] Envelope construction verification PASSED with 0 EnergyPlus severe errors!")

    return True


if __name__ == "__main__":
    success = run_envelope_inspection_suite(execute_energyplus=True)
    sys.exit(0 if success else 1)
