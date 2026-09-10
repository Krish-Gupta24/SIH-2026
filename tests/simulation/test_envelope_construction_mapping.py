"""Automated tests for envelope construction mapping, layer ordering, and EnergyPlus integration.

Verifies the trace:
UI → ShelterModel → Construction → Layer[] → Material[] → EnergyPlus Construction → EnergyPlus Surface

Guarantees:
1. Support for different constructions per wall (North, South, East, West).
2. Multilayer assemblies with strict outside-to-inside ordering.
3. Accurate layer thickness and thermophysical properties reaching EnergyPlus IDF.
4. Support for custom user-defined materials.
5. Removal of silent fallbacks:
   - Invalid construction / material IDs raise clear ValueError.
   - Omitted constructions trigger explicit warning in metadata.
6. Execution of real EnergyPlus simulation on distinct-envelope model.
"""

import os
import re
import tempfile
import unittest
from pathlib import Path

from simulation.materials.material import Material, MaterialStatus, ConstructionLayer, Construction
from simulation.materials.database import material_db
from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.runners.energyplus_runner import EnergyPlusRunner


class TestEnvelopeConstructionMapping(unittest.TestCase):
    """Test suite for envelope construction mapping and EnergyPlus integration."""

    def setUp(self):
        import copy
        self.generator = EnergyPlusIDFGenerator(engine_version="24.1")
        self.repo_root = Path(__file__).resolve().parent.parent.parent
        self.weather_file = self.repo_root / "simulation" / "weather" / "test_weather.epw"
        self._orig_materials = copy.deepcopy(material_db._materials)

    def tearDown(self):
        material_db._materials = self._orig_materials

    def test_simple_monolithic_wall_mapping(self):
        """Test simple wall (single-layer AAC block) maps correctly to EnergyPlus Material & Construction."""
        shelter = {
            "id": "test-simple-wall",
            "geometry": {"length": 5.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0},
            "envelope": {
                "walls": {
                    "north": {"constructionId": "const-aac", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                    "south": {"constructionId": "const-aac", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                    "east": {"constructionId": "const-aac", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                    "west": {"constructionId": "const-aac", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                },
                "roof": {"constructionId": "const-roof", "layers": [{"materialId": "mat-galvanized-steel", "thickness": 0.005}]},
                "floor": {"constructionId": "const-floor", "layers": [{"materialId": "mat-concrete-slab", "thickness": 0.15}]},
            },
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter=shelter, output_path=idf_path)
            idf_content = Path(idf_path).read_text(encoding="utf-8")

            # Check Material
            self.assertIn("Material,", idf_content)
            self.assertIn("Mat_mat_aac_block_200mm", idf_content)
            self.assertIn("0.2000,          !- Thickness {m}", idf_content)
            self.assertIn("0.1600, !- Conductivity {W/m-K}", idf_content)

            # Check Construction
            self.assertIn("Construction,", idf_content)
            self.assertIn("NorthWall_Const,", idf_content)
            self.assertIn("Mat_mat_aac_block_200mm; !- Outside Layer", idf_content)

            # Check Surface binding
            self.assertRegex(idf_content, r"NorthWall,[\s\S]*?Wall,[\s\S]*?NorthWall_Const,")

    def test_multilayer_assembly_layer_ordering(self):
        """Test multilayer wall verifies outside-to-inside ordering in IDF."""
        shelter = {
            "id": "test-multilayer-wall",
            "geometry": {"length": 6.0, "width": 4.0, "height": 3.0, "roof_type": "Flat", "roof_angle": 0.0},
            "envelope": {
                "walls": {
                    "north": {
                        "constructionId": "const-tri-layer",
                        "layers": [
                            {"materialId": "mat-mud-plaster", "thickness": 0.025},   # Outside
                            {"materialId": "mat-eps-insulation", "thickness": 0.120}, # Core
                            {"materialId": "mat-rammed-earth", "thickness": 0.280},   # Inside
                        ],
                    },
                    "south": {"constructionId": "const-tri-layer", "layers": [
                        {"materialId": "mat-mud-plaster", "thickness": 0.025},
                        {"materialId": "mat-eps-insulation", "thickness": 0.120},
                        {"materialId": "mat-rammed-earth", "thickness": 0.280},
                    ]},
                },
                "roof": {"constructionId": "const-roof", "layers": [{"materialId": "mat-galvanized-steel", "thickness": 0.005}]},
                "floor": {"constructionId": "const-floor", "layers": [{"materialId": "mat-concrete-slab", "thickness": 0.15}]},
            },
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter=shelter, output_path=idf_path)
            idf_content = Path(idf_path).read_text(encoding="utf-8")

            # Check Construction definition has Outside Layer first and trailing layers in order
            expected_pattern = (
                r"Construction,\s*\n"
                r"\s*NorthWall_Const,[^\n]*\n"
                r"\s*Mat_mat_mud_plaster_25mm,\s*!- Outside Layer\s*\n"
                r"\s*Mat_mat_eps_insulation_120mm,\s*!- Layer 2\s*\n"
                r"\s*Mat_mat_rammed_earth_280mm;\s*!- Layer 3"
            )
            self.assertRegex(idf_content, expected_pattern)

    def test_different_north_south_wall_constructions(self):
        """Test asymmetric envelope: distinct North vs South wall constructions bind to respective surfaces."""
        shelter = {
            "id": "test-asymmetric-envelope",
            "geometry": {"length": 6.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0},
            "envelope": {
                "walls": {
                    "north": {
                        "constructionId": "const-north-heavily-insulated",
                        "name": "North Heavy Insulation Barrier",
                        "layers": [
                            {"materialId": "mat-eps-insulation", "thickness": 0.200},
                            {"materialId": "mat-stone-masonry", "thickness": 0.350},
                        ],
                    },
                    "south": {
                        "constructionId": "const-south-solar-storage",
                        "name": "South Direct Gain Thermal Mass Wall",
                        "layers": [
                            {"materialId": "mat-mud-plaster", "thickness": 0.020},
                            {"materialId": "mat-concrete-slab", "thickness": 0.250},
                        ],
                    },
                    "east": {"constructionId": "const-east", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                    "west": {"constructionId": "const-west", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                },
                "roof": {"constructionId": "const-roof", "layers": [{"materialId": "mat-galvanized-steel", "thickness": 0.005}]},
                "floor": {"constructionId": "const-floor", "layers": [{"materialId": "mat-concrete-slab", "thickness": 0.15}]},
            },
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter=shelter, output_path=idf_path)
            idf_content = Path(idf_path).read_text(encoding="utf-8")

            # Check both constructions exist independently
            self.assertIn("NorthWall_Const,", idf_content)
            self.assertIn("SouthWall_Const,", idf_content)
            self.assertIn("Mat_mat_eps_insulation_200mm", idf_content)
            self.assertIn("Mat_mat_granite_stone_350mm", idf_content)
            self.assertIn("Mat_mat_mud_plaster_20mm", idf_content)
            self.assertIn("Mat_mat_concrete_slab_250mm", idf_content)

            # Check surfaces bind to their respective constructions
            self.assertRegex(idf_content, r"NorthWall,[\s\S]*?Wall,[\s\S]*?NorthWall_Const,")
            self.assertRegex(idf_content, r"SouthWall,[\s\S]*?Wall,[\s\S]*?SouthWall_Const,")

    def test_custom_user_defined_material_mapping(self):
        """Test user-defined custom material in layer assembly propagates to EnergyPlus Material."""
        custom_aerogel = {
            "id": "mat-custom-aerogel-blanket",
            "name": "Nanogel Aerogel Blanket",
            "category": "Insulation",
            "density": 110.0,
            "thermal_conductivity": 0.014,
            "specific_heat": 1000.0,
            "thermal_absorptance": 0.90,
            "solar_absorptance": 0.20,
            "visible_absorptance": 0.20,
            "roughness": "Smooth",
            "status": "USER_DEFINED",
            "source": "Project Engineering Specification (ASTM C1728)",
            "provenance": "Custom User Entry",
            "notes": "Nanoporous silica aerogel blanket for thermal bridging mitigation.",
        }

        shelter = {
            "id": "test-custom-mat-shelter",
            "geometry": {"length": 5.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0},
            "envelope": {
                "walls": {
                    "north": {
                        "constructionId": "const-aerogel-wall",
                        "layers": [
                            {"material": custom_aerogel, "thickness": 0.030},
                            {"materialId": "mat-rammed-earth", "thickness": 0.250},
                        ],
                    },
                },
                "roof": {"constructionId": "const-roof", "layers": [{"materialId": "mat-galvanized-steel", "thickness": 0.005}]},
                "floor": {"constructionId": "const-floor", "layers": [{"materialId": "mat-concrete-slab", "thickness": 0.15}]},
            },
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(shelter=shelter, output_path=idf_path)
            idf_content = Path(idf_path).read_text(encoding="utf-8")

            # Check custom material properties in IDF
            self.assertIn("Mat_mat_custom_aerogel_blanket_30mm", idf_content)
            self.assertIn("0.0300,          !- Thickness {m}", idf_content)
            self.assertIn("0.0140, !- Conductivity {W/m-K}", idf_content)
            self.assertIn("110.00,              !- Density {kg/m3}", idf_content)
            self.assertIn("1000.00,        !- Specific Heat {J/kg-K}", idf_content)

    def test_no_silent_fallback_on_invalid_user_selection(self):
        """Test that invalid user construction or material ID raises ValueError rather than silently falling back."""
        # 1. Invalid material ID inside valid construction
        invalid_mat_shelter = {
            "id": "test-invalid-mat",
            "geometry": {"length": 5.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0},
            "envelope": {
                "walls": {
                    "north": {
                        "constructionId": "const-test",
                        "layers": [{"materialId": "non-existent-fantasy-material-999", "thickness": 0.10}],
                    }
                }
            },
        }
        with self.assertRaises(ValueError) as ctx:
            self.generator.resolve_envelope_constructions(invalid_mat_shelter)
        self.assertIn("non-existent-fantasy-material-999", str(ctx.exception))

        # 2. Invalid construction ID with no layers
        invalid_const_shelter = {
            "id": "test-invalid-const",
            "geometry": {"length": 5.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0},
            "envelope": {
                "walls": {
                    "north": {"constructionId": "unregistered-alien-construction-xyz"}
                }
            },
        }
        with self.assertRaises(ValueError) as ctx:
            self.generator.resolve_envelope_constructions(invalid_const_shelter)
        self.assertIn("unregistered-alien-construction-xyz", str(ctx.exception))

    def test_explicit_warning_when_default_fallback_applied(self):
        """Test that omitted constructions apply fallback AND store a clear warning in metadata."""
        empty_shelter = {
            "id": "test-empty-envelope",
            "geometry": {"length": 5.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0},
            # No envelope provided at all
        }
        insp = self.generator.inspect_envelope(empty_shelter)
        self.assertTrue(insp["has_fallbacks"])
        self.assertGreaterEqual(len(insp["fallback_warnings"]), 6)
        for role in ("north_wall", "south_wall", "east_wall", "west_wall", "roof", "floor"):
            self.assertTrue(insp["surfaces"][role]["is_fallback"])
            self.assertTrue(any(role in w for w in insp["fallback_warnings"]))

    def test_real_energyplus_execution_on_distinct_envelope(self):
        """Execute real EnergyPlus simulation on a model with distinct multilayer envelope."""
        runner = EnergyPlusRunner()
        if not runner.is_available:
            self.skipTest(f"EnergyPlus runner not available on host: {runner.executable_path}")
        if not self.weather_file.exists():
            self.skipTest(f"Test weather file not found: {self.weather_file}")

        shelter = {
            "id": "test-ep-real-run",
            "geometry": {"length": 6.0, "width": 4.0, "height": 2.8, "roof_type": "Flat", "roof_angle": 0.0, "orientation": 0.0},
            "envelope": {
                "walls": {
                    "north": {
                        "constructionId": "const-north-windbreak",
                        "layers": [
                            {"materialId": "mat-eps-insulation", "thickness": 0.150},
                            {"materialId": "mat-stone-masonry", "thickness": 0.300},
                        ],
                    },
                    "south": {
                        "constructionId": "const-south-mass",
                        "layers": [
                            {"materialId": "mat-mud-plaster", "thickness": 0.025},
                            {"materialId": "mat-concrete-slab", "thickness": 0.200},
                        ],
                    },
                    "east": {"constructionId": "const-east", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                    "west": {"constructionId": "const-west", "layers": [{"materialId": "mat-aac-block", "thickness": 0.20}]},
                },
                "roof": {
                    "constructionId": "const-roof",
                    "layers": [
                        {"materialId": "mat-galvanized-steel", "thickness": 0.005},
                        {"materialId": "mat-eps-insulation", "thickness": 0.180},
                        {"materialId": "mat-himalayan-timber", "thickness": 0.030},
                    ],
                },
                "floor": {
                    "constructionId": "const-floor",
                    "layers": [
                        {"materialId": "mat-xps-insulation", "thickness": 0.100},
                        {"materialId": "mat-concrete-slab", "thickness": 0.150},
                    ],
                },
            },
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            idf_path = os.path.join(tmpdir, "in.idf")
            self.generator.generate_idf(
                shelter=shelter,
                output_path=idf_path,
                run_period_days=1,
                start_month=1,
                start_day=15,
                end_month=1,
                end_day=15,
                timestep=4,
            )

            output = runner.run(
                idf_path=idf_path,
                epw_path=str(self.weather_file.resolve()),
                work_dir=tmpdir,
                timeout_seconds=60,
            )

            self.assertEqual(output.exit_code, 0, f"EnergyPlus failed with stdout: {output.stdout}\nstderr: {output.stderr}")
            if output.err_file_path and Path(output.err_file_path).exists():
                err_text = Path(output.err_file_path).read_text(encoding="utf-8")
                self.assertNotIn("** Severe **", err_text, f"EnergyPlus reported severe errors: {err_text}")
                self.assertNotIn("** Fatal **", err_text, f"EnergyPlus reported fatal errors: {err_text}")


if __name__ == "__main__":
    unittest.main()
