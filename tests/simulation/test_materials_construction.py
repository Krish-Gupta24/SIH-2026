"""Tests for Material, Construction, ConstructionLayer, and EnergyPlus simulation mapping."""

import unittest
import tempfile
from pathlib import Path

from simulation.materials.material import (
    Material,
    MaterialStatus,
    ConstructionLayer,
    Construction,
)
from simulation.materials.database import (
    MaterialDatabase,
    material_db,
    INITIAL_TEST_MATERIALS,
)
from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.runners.engine import EnergyPlusEngine


class TestMaterialSystem(unittest.TestCase):
    """Unit tests verifying physical material integrity and provenance."""

    def test_material_creation_with_valid_parameters(self):
        """Verify standard material initializes with correct physical properties."""
        mat = Material(
            id="mat-test-eps",
            name="Test EPS",
            density=25.0,
            thermal_conductivity=0.035,
            specific_heat=1400.0,
            thermal_absorptance=0.90,
            solar_absorptance=0.60,
            visible_absorptance=0.60,
            source="ASHRAE Fundamentals 2021",
            provenance="Chapter 26 Table 4",
            status=MaterialStatus.VERIFIED,
        )
        self.assertEqual(mat.id, "mat-test-eps")
        self.assertEqual(mat.density, 25.0)
        self.assertEqual(mat.thermal_conductivity, 0.035)
        self.assertEqual(mat.specific_heat, 1400.0)
        self.assertEqual(mat.emissivity, 0.90)
        self.assertEqual(mat.volumetric_heat_capacity, 25.0 * 1400.0)
        self.assertEqual(mat.status, MaterialStatus.VERIFIED)

    def test_rejection_of_unphysical_material_properties(self):
        """Verify strict rejection of negative or zero physical parameters."""
        # Density <= 0
        with self.assertRaises(ValueError):
            Material(
                id="m1", name="Bad", density=-10.0, thermal_conductivity=0.5, specific_heat=1000.0,
                source="Src", provenance="Prov"
            )
        # Thermal conductivity <= 0
        with self.assertRaises(ValueError):
            Material(
                id="m2", name="Bad", density=1000.0, thermal_conductivity=0.0, specific_heat=1000.0,
                source="Src", provenance="Prov"
            )
        # Specific heat <= 0
        with self.assertRaises(ValueError):
            Material(
                id="m3", name="Bad", density=1000.0, thermal_conductivity=0.5, specific_heat=-500.0,
                source="Src", provenance="Prov"
            )
        # Absorptance out of bounds [0, 1]
        with self.assertRaises(ValueError):
            Material(
                id="m4", name="Bad", density=1000.0, thermal_conductivity=0.5, specific_heat=1000.0,
                solar_absorptance=1.2, source="Src", provenance="Prov"
            )

    def test_no_fabricated_materials_allowed(self):
        """Enforce requirement that all materials must state explicit source and provenance."""
        with self.assertRaises(ValueError):
            Material(
                id="m-fake", name="Fabricated Mat", density=500.0, thermal_conductivity=0.2,
                specific_heat=1200.0, source="", provenance=""
            )

    def test_initial_database_materials_are_all_verified(self):
        """Verify every material in the initial database has non-empty source, provenance, and VERIFIED status."""
        self.assertGreaterEqual(len(INITIAL_TEST_MATERIALS), 10)
        for mat in INITIAL_TEST_MATERIALS:
            self.assertTrue(bool(mat.source))
            self.assertTrue(bool(mat.provenance))
            self.assertEqual(mat.status, MaterialStatus.VERIFIED)
            self.assertGreater(mat.density, 0)
            self.assertGreater(mat.thermal_conductivity, 0)
            self.assertGreater(mat.specific_heat, 0)

    def test_material_database_lookup_and_aliases(self):
        """Verify database lookup by ID, standard name, and legacy aliases."""
        eps = material_db.get("mat-eps-insulation")
        self.assertEqual(eps.name, "Expanded Polystyrene (EPS)")

        # Alias lookup
        eps_alias = material_db.get("EPS_Insulation")
        self.assertEqual(eps_alias.id, "mat-eps-insulation")

        # Name lookup
        earth = material_db.get("Local Rammed Earth (Ladakh)")
        self.assertEqual(earth.id, "mat-rammed-earth")

        # Non-existent material raises KeyError
        with self.assertRaises(KeyError):
            material_db.get("non-existent-material-xyz")

    def test_custom_material_creation(self):
        """Verify custom materials receive USER_DEFINED status and valid registration."""
        custom_db = MaterialDatabase()
        aerogel = custom_db.create_custom_material(
            name="Silica Aerogel Blanketing",
            density=120.0,
            thermal_conductivity=0.018,
            specific_heat=1100.0,
            source="Leh Experimental Cold Shelter Trial 2025",
            provenance="Appendix B, Physical Testing Lab Log #4",
        )
        self.assertEqual(aerogel.status, MaterialStatus.USER_DEFINED)
        self.assertEqual(aerogel.thermal_conductivity, 0.018)
        self.assertEqual(custom_db.get(aerogel.id).id, aerogel.id)


class TestConstructionSystem(unittest.TestCase):
    """Unit tests for multi-layer construction assembly and physics validation."""

    def setUp(self):
        self.eps = material_db.get("mat-eps-insulation")       # k = 0.035 W/(m·K)
        self.earth = material_db.get("mat-rammed-earth")       # k = 1.25 W/(m·K)
        self.plaster = material_db.get("mat-mud-plaster")      # k = 0.75 W/(m·K)

    def test_construction_layer_calculations(self):
        """Verify layer thermal resistance R = t / k and heat capacity."""
        layer = ConstructionLayer(material=self.eps, thickness=0.10, layer_order=0)
        expected_r = 0.10 / 0.035
        self.assertAlmostEqual(layer.thermal_resistance, expected_r, places=4)

        expected_hc = (25.0 * 1400.0 * 0.10) / 1000.0  # kJ/(m²·K)
        self.assertAlmostEqual(layer.areal_heat_capacity, expected_hc, places=4)

    def test_layer_thickness_validation(self):
        """Verify rejection of zero, negative, or unrealistic thickness (> 2m)."""
        with self.assertRaises(ValueError):
            ConstructionLayer(material=self.eps, thickness=0.0, layer_order=0)
        with self.assertRaises(ValueError):
            ConstructionLayer(material=self.eps, thickness=-0.05, layer_order=0)
        with self.assertRaises(ValueError):
            ConstructionLayer(material=self.eps, thickness=2.5, layer_order=0)

    def test_multilayer_construction_order_and_u_value(self):
        """Verify layer ordering outside-to-inside and ISO 6946 R-value and U-value."""
        # 3-layer wall:
        # Layer 0 (outside): 20mm Mud Plaster (t=0.02, k=0.75) -> R = 0.0267
        # Layer 1 (middle):  100mm EPS (t=0.10, k=0.035)       -> R = 2.8571
        # Layer 2 (inside):  300mm Rammed Earth (t=0.30, k=1.25)-> R = 0.2400
        layer0 = ConstructionLayer(material=self.plaster, thickness=0.02, layer_order=0)
        layer1 = ConstructionLayer(material=self.eps, thickness=0.10, layer_order=1)
        layer2 = ConstructionLayer(material=self.earth, thickness=0.30, layer_order=2)

        wall = Construction(
            id="wall-insulated-rammed-earth",
            name="Super-Insulated Rammed Earth Wall",
            surface_type="WALL",
            layers=[layer0, layer1, layer2],
        )

        self.assertEqual(wall.outside_layer, layer0)
        self.assertEqual(wall.inside_layer, layer2)
        self.assertAlmostEqual(wall.total_thickness, 0.02 + 0.10 + 0.30, places=4)

        mat_r = (0.02 / 0.75) + (0.10 / 0.035) + (0.30 / 1.25)
        self.assertAlmostEqual(wall.material_r_value, mat_r, places=4)

        # ISO 6946 standard film resistances for vertical wall: R_se = 0.04, R_si = 0.13
        total_r = 0.04 + mat_r + 0.13
        self.assertAlmostEqual(wall.total_r_value, total_r, places=4)
        expected_u = 1.0 / total_r
        self.assertAlmostEqual(wall.u_value, expected_u, places=4)
        self.assertEqual(wall.status, MaterialStatus.VERIFIED)

    def test_construction_rejects_non_consecutive_layers(self):
        """Verify failure if layer order has gaps or does not start at 0."""
        layer0 = ConstructionLayer(material=self.eps, thickness=0.05, layer_order=0)
        layer2 = ConstructionLayer(material=self.earth, thickness=0.30, layer_order=2)
        with self.assertRaises(ValueError):
            Construction(
                id="bad-wall",
                name="Bad Layer Wall",
                surface_type="WALL",
                layers=[layer0, layer2],
            )

    def test_construction_max_ten_layers_limit(self):
        """Verify enforcement of EnergyPlus maximum 10-layer constraint."""
        layers = [
            ConstructionLayer(material=self.eps, thickness=0.01, layer_order=i)
            for i in range(11)
        ]
        with self.assertRaises(ValueError):
            Construction(
                id="eleven-layers",
                name="Too Many Layers",
                surface_type="WALL",
                layers=layers,
            )


class TestSimulationMappingAndInsulationImpact(unittest.TestCase):
    """Tests verifying simulation mapping for cardinal faces and insulation sensitivity."""

    def setUp(self):
        self.generator = EnergyPlusIDFGenerator(engine_version="24.1")
        self.base_shelter = {
            "id": "shelter-material-test",
            "name": "Material Test Monozone Shelter",
            "location": {
                "latitude": 34.15,
                "longitude": 77.58,
                "elevation": 3500.0,
                "region": "Leh_Ladakh",
            },
            "geometry": {
                "length": 6.0,
                "width": 4.0,
                "height": 3.0,
                "roof_type": "Flat",
                "roof_angle": 0.0,
            },
        }

    def test_distinct_constructions_for_all_cardinal_walls_roof_and_floor(self):
        """Verify different constructions for north, south, east, west walls, roof, and floor."""
        # 1. Uninsulated high thermal mass stone for South wall (direct solar gain)
        south_wall = material_db.build_construction(
            "south-stone", "South Massive Stone", "WALL",
            [("mat-granite-stone", 0.40)]
        )
        # 2. Super-insulated 150mm EPS for North wall (no solar, high cold exposure)
        north_wall = material_db.build_construction(
            "north-super-eps", "North Super Insulated", "WALL",
            [("mat-eps-insulation", 0.15), ("mat-rammed-earth", 0.20)]
        )
        # 3. Bio-straw bale for East wall
        east_wall = material_db.build_construction(
            "east-straw", "East Straw Bale", "WALL",
            [("mat-mud-plaster", 0.03), ("mat-straw-insulation", 0.25), ("mat-mud-plaster", 0.03)]
        )
        # 4. AAC Block for West wall
        west_wall = material_db.build_construction(
            "west-aac", "West AAC Block", "WALL",
            [("mat-aac-block", 0.20)]
        )
        # 5. Heavy insulated timber roof
        roof = material_db.build_construction(
            "timber-roof", "Timber Insulated Roof", "ROOF",
            [("mat-galvanized-steel", 0.005), ("mat-eps-insulation", 0.15), ("mat-himalayan-timber", 0.05)]
        )
        # 6. Concrete slab floor
        floor = material_db.build_construction(
            "concrete-floor", "Heavy Floor", "FLOOR",
            [("mat-concrete-slab", 0.20)]
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            out_idf = str(Path(tmpdir) / "distinct_constructions.idf")
            self.generator.generate_idf(
                self.base_shelter,
                out_idf,
                constructions={
                    "north_wall": north_wall,
                    "south_wall": south_wall,
                    "east_wall": east_wall,
                    "west_wall": west_wall,
                    "roof": roof,
                    "floor": floor,
                },
            )

            content = Path(out_idf).read_text(encoding="utf-8")

            # Check that each surface links to its distinct construction name
            self.assertIn("SouthWall_Const", content)
            self.assertIn("NorthWall_Const", content)
            self.assertIn("EastWall_Const", content)
            self.assertIn("WestWall_Const", content)
            self.assertIn("Roof_Const", content)
            self.assertIn("Floor_Const", content)

            # Check that unique material definitions were emitted
            self.assertIn("Mat_mat_granite_stone_400mm", content)
            self.assertIn("Mat_mat_straw_insulation_250mm", content)
            self.assertIn("Mat_mat_aac_block_200mm", content)
            self.assertIn("Mat_mat_himalayan_timber_50mm", content)

    def test_changing_insulation_modifies_generated_simulation_model(self):
        """Prove that changing insulation changes the generated IDF syntax, layer thickness, and U-values."""
        # Baseline: Uninsulated 300mm Rammed Earth
        uninsulated_wall = material_db.build_construction(
            "wall-uninsulated", "Uninsulated Earth Wall", "WALL",
            [("mat-rammed-earth", 0.30)]
        )

        # 50mm EPS Insulated Wall
        insulated_50mm_wall = material_db.build_construction(
            "wall-50mm-eps", "50mm Insulated Earth Wall", "WALL",
            [("mat-eps-insulation", 0.05), ("mat-rammed-earth", 0.30)]
        )

        # 150mm EPS Insulated Wall
        insulated_150mm_wall = material_db.build_construction(
            "wall-150mm-eps", "150mm Insulated Earth Wall", "WALL",
            [("mat-eps-insulation", 0.15), ("mat-rammed-earth", 0.30)]
        )

        # Verify physics: R-value must increase monotonically
        self.assertLess(uninsulated_wall.total_r_value, insulated_50mm_wall.total_r_value)
        self.assertLess(insulated_50mm_wall.total_r_value, insulated_150mm_wall.total_r_value)

        # Verify physics: U-value must decrease monotonically
        self.assertGreater(uninsulated_wall.u_value, insulated_50mm_wall.u_value)
        self.assertGreater(insulated_50mm_wall.u_value, insulated_150mm_wall.u_value)

        with tempfile.TemporaryDirectory() as tmpdir:
            idf_uninsulated = Path(tmpdir) / "uninsulated.idf"
            idf_50mm = Path(tmpdir) / "insulated_50mm.idf"
            idf_150mm = Path(tmpdir) / "insulated_150mm.idf"

            self.generator.generate_idf(
                self.base_shelter, str(idf_uninsulated),
                constructions={"walls": uninsulated_wall}
            )
            self.generator.generate_idf(
                self.base_shelter, str(idf_50mm),
                constructions={"walls": insulated_50mm_wall}
            )
            self.generator.generate_idf(
                self.base_shelter, str(idf_150mm),
                constructions={"walls": insulated_150mm_wall}
            )

            content_uninsulated = idf_uninsulated.read_text(encoding="utf-8")
            content_50mm = idf_50mm.read_text(encoding="utf-8")
            content_150mm = idf_150mm.read_text(encoding="utf-8")

            # 1. Uninsulated walls must have Rammed Earth as outside layer and no 50/150mm EPS
            self.assertNotIn("Mat_mat_eps_insulation_50mm", content_uninsulated)
            self.assertNotIn("Mat_mat_eps_insulation_150mm", content_uninsulated)
            self.assertIn("Mat_mat_rammed_earth_300mm; !- Outside Layer", content_uninsulated)

            # 2. 50mm model must contain 50mm EPS as outside layer of walls
            self.assertIn("Mat_mat_eps_insulation_50mm", content_50mm)
            self.assertIn("0.0500,          !- Thickness {m}", content_50mm)
            self.assertIn("Mat_mat_eps_insulation_50mm, !- Outside Layer", content_50mm)
            self.assertNotIn("Mat_mat_eps_insulation_150mm", content_50mm)

            # 3. 150mm model must contain 150mm EPS as outside layer of walls
            self.assertIn("Mat_mat_eps_insulation_150mm", content_150mm)
            self.assertIn("0.1500,          !- Thickness {m}", content_150mm)
            self.assertIn("Mat_mat_eps_insulation_150mm, !- Outside Layer", content_150mm)
            self.assertNotIn("Mat_mat_eps_insulation_50mm", content_150mm)

            # 4. Models must differ in length and content
            self.assertNotEqual(content_uninsulated, content_50mm)
            self.assertNotEqual(content_50mm, content_150mm)


class TestEnergyPlusExecutionWithVaryingInsulation(unittest.TestCase):
    """Executes real simulations comparing uninsulated vs insulated models."""

    def test_real_simulations_demonstrating_insulation_thermal_effect(self):
        """Run real EnergyPlus simulations proving changing insulation alters thermal response."""
        engine_a = EnergyPlusEngine()
        if not engine_a.runner.executable_path:
            self.skipTest("EnergyPlus executable not available on host system.")

        weather_file = Path("simulation/weather/test_weather.epw").resolve()
        if not weather_file.exists():
            self.skipTest("test_weather.epw not found.")

        # Model A: Uninsulated 300mm Rammed Earth Walls
        uninsulated_wall = material_db.build_construction(
            "wall-uninsulated", "Uninsulated Earth Wall", "WALL",
            [("mat-rammed-earth", 0.30)]
        )

        # Model B: High Insulation 150mm EPS + 300mm Rammed Earth
        insulated_wall = material_db.build_construction(
            "wall-insulated-150mm", "Super Insulated Earth Wall", "WALL",
            [("mat-eps-insulation", 0.15), ("mat-rammed-earth", 0.30)]
        )

        shelter_uninsulated = {
            "id": "shelter-uninsulated-earth",
            "name": "Uninsulated Earth Shelter",
            "location": {
                "latitude": 34.15,
                "longitude": 77.58,
                "elevation": 3500.0,
                "region": "Leh_Ladakh",
            },
            "geometry": {
                "length": 6.0,
                "width": 4.0,
                "height": 3.0,
                "roof_type": "Flat",
                "roof_angle": 0.0,
            },
            "envelope": {
                "walls": uninsulated_wall,
            },
        }

        shelter_insulated = {
            "id": "shelter-insulated-earth",
            "name": "Super Insulated Earth Shelter",
            "location": {
                "latitude": 34.15,
                "longitude": 77.58,
                "elevation": 3500.0,
                "region": "Leh_Ladakh",
            },
            "geometry": {
                "length": 6.0,
                "width": 4.0,
                "height": 3.0,
                "roof_type": "Flat",
                "roof_angle": 0.0,
            },
            "envelope": {
                "walls": insulated_wall,
            },
        }

        with tempfile.TemporaryDirectory() as tmpdir_a, tempfile.TemporaryDirectory() as tmpdir_b:
            engine_a.prepare_model(
                shelter_model=shelter_uninsulated,
                weather_file_path=str(weather_file),
                output_dir=tmpdir_a,
                run_period_days=3,
            )
            res_a = engine_a.run_simulation(timeout_seconds=90)
            self.assertTrue(res_a["success"], f"Simulation A failed: {res_a.get('errors')}")
            self.assertEqual(res_a["error_inspection"]["severe_errors"], 0)
            self.assertTrue(res_a["error_inspection"]["completed_successfully"])

            engine_b = EnergyPlusEngine()
            engine_b.prepare_model(
                shelter_model=shelter_insulated,
                weather_file_path=str(weather_file),
                output_dir=tmpdir_b,
                run_period_days=3,
            )
            res_b = engine_b.run_simulation(timeout_seconds=90)
            self.assertTrue(res_b["success"], f"Simulation B failed: {res_b.get('errors')}")
            self.assertEqual(res_b["error_inspection"]["severe_errors"], 0)
            self.assertTrue(res_b["error_inspection"]["completed_successfully"])

            # Thermal verification: In cold climate (Leh winter), indoor temperatures
            # will differ between uninsulated and insulated structures.
            mean_temp_a = res_a["thermal_performance"]["indoor_temperature"]["mean_c"]
            mean_temp_b = res_b["thermal_performance"]["indoor_temperature"]["mean_c"]

            self.assertIsNotNone(mean_temp_a)
            self.assertIsNotNone(mean_temp_b)
            # Verify physically distinct thermal response
            self.assertNotAlmostEqual(mean_temp_a, mean_temp_b, places=1)


if __name__ == "__main__":
    unittest.main()
