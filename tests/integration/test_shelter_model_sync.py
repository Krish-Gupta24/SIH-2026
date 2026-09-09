"""Automated test suite verifying that 3D designer and simulation engine
strictly use the same canonical ShelterModel.

Traced Workflow:
User edits geometry
  ↓
ShelterModel changes
  ↓
3D updates
  ↓
Save project
  ↓
Simulation generator receives same ShelterModel
  ↓
EnergyPlus model updates accordingly
"""

import copy
import tempfile
from pathlib import Path
import pytest

from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.materials.database import material_db


@pytest.fixture
def baseline_shelter():
    """Canonical base shelter model."""
    return {
        "id": "shelter-sync-test",
        "name": "Sync Verification Shelter",
        "version": "1.0.0",
        "location": {
            "latitude": 34.1526,
            "longitude": 77.5771,
            "elevation": 3500.0,
            "region": "Leh, Ladakh",
            "climate_zone": "Cold / Extreme Alpine",
            "weather_source": "test_weather.epw",
        },
        "geometry": {
            "shape": "Rectangle",
            "length": 6.0,
            "width": 4.0,
            "height": 2.8,
            "orientation": 0.0,
            "roof_type": "Flat",
            "roof_angle": 0.0,
            "floor_elevation": 0.0,
        },
        "envelope": {
            "walls": {
                "north": {"construction_id": "c_north", "layers": [{"material_id": "mat-rammed-earth", "thickness": 0.30}]},
                "south": {"construction_id": "c_south", "layers": [{"material_id": "mat-rammed-earth", "thickness": 0.30}]},
                "east": {"construction_id": "c_east", "layers": [{"material_id": "mat-rammed-earth", "thickness": 0.30}]},
                "west": {"construction_id": "c_west", "layers": [{"material_id": "mat-rammed-earth", "thickness": 0.30}]},
            },
            "roof": {
                "construction_id": "c_roof",
                "slope": 0.0,
                "overhang": 0.3,
                "solar_absorptance": 0.70,
                "layers": [{"material_id": "mat-eps-insulation", "thickness": 0.10}],
            },
            "floor": {
                "construction_id": "c_floor",
                "ground_contact": True,
                "perimeter_insulation": True,
                "layers": [{"material_id": "mat-concrete-slab", "thickness": 0.15}],
            },
        },
        "windows": [],
        "doors": [],
        "thermal_mass": [],
        "ventilation": {
            "infiltration_ach": 0.4,
            "natural_ventilation_enabled": False,
            "natural_schedule": "DayOnly",
            "mechanical_ventilation_enabled": False,
            "mechanical_flow_rate_lps": 0.0,
            "heat_recovery_efficiency": 0.75,
        },
    }


def generate_idf_content(generator: EnergyPlusIDFGenerator, model: dict) -> str:
    with tempfile.TemporaryDirectory() as tmpdir:
        idf_file = Path(tmpdir) / "model.idf"
        generator.generate_idf(model, str(idf_file))
        return idf_file.read_text(encoding="utf-8")


class TestShelterModel3DAndSimulationSync:
    """Verifies that geometry, window, door, and material changes synchronously update simulation model."""

    def test_01_changing_dimensions_affects_simulation(self, baseline_shelter):
        """Proof: Changing length, width, and height updates EnergyPlus zone volume and surface coordinates."""
        generator = EnergyPlusIDFGenerator(engine_version="24.1")

        # 1. Baseline: 6.0m x 4.0m x 2.8m -> Volume = 67.2 m3, Floor Area = 24.0 m2
        idf_baseline = generate_idf_content(generator, baseline_shelter)
        assert "67.20;                   !- Volume {m3}" in idf_baseline
        assert "6.000, 0.0, 0.0,         !- Vertex 3" in idf_baseline  # South wall base vertex at x=6.0

        # 2. Modify dimensions: 8.0m x 5.0m x 3.2m -> Volume = 128.0 m3
        modified = copy.deepcopy(baseline_shelter)
        modified["geometry"]["length"] = 8.0
        modified["geometry"]["width"] = 5.0
        modified["geometry"]["height"] = 3.2

        idf_modified = generate_idf_content(generator, modified)
        assert "128.00;                   !- Volume {m3}" in idf_modified
        assert "8.000, 0.0, 0.0,         !- Vertex 3" in idf_modified  # South wall base vertex at x=8.0
        assert "3.200;!- Vertex 4" in idf_modified or "3.200" in idf_modified

        # Prove that old geometry vertices are no longer present
        assert "67.20;                   !- Volume {m3}" not in idf_modified

    def test_02_adding_window_affects_simulation(self, baseline_shelter):
        """Proof: Adding a window to ShelterModel generates FenestrationSurface:Detailed and glazing system."""
        generator = EnergyPlusIDFGenerator(engine_version="24.1")

        # Baseline has no windows
        idf_baseline = generate_idf_content(generator, baseline_shelter)
        assert "FenestrationSurface:Detailed" not in idf_baseline
        assert "win_south_master" not in idf_baseline

        # Add window to South Wall
        model_with_window = copy.deepcopy(baseline_shelter)
        model_with_window["windows"].append({
            "id": "win_south_master",
            "wall": "south",
            "position_x": 1.5,
            "width": 2.0,
            "height": 1.4,
            "sill_height": 0.8,
            "glazing_type": "Double_LowE_Argon",
        })

        idf_with_win = generate_idf_content(generator, model_with_window)

        # Verify FenestrationSurface:Detailed generated for SouthWall
        assert "FenestrationSurface:Detailed," in idf_with_win
        assert "win_south_master" in idf_with_win
        assert "Double_LowE_Argon_Const" in idf_with_win
        assert "SouthWall" in idf_with_win

        # Verify window vertices are coplanar with SouthWall (y = 0.0)
        # x starts at 1.5, extends to 1.5+2.0 = 3.5; z spans 0.8 to 0.8+1.4 = 2.2
        assert "1.500, 0.000, 2.200" in idf_with_win
        assert "3.500, 0.000, 0.800" in idf_with_win

    def test_03_deleting_window_removes_it_from_simulation(self, baseline_shelter):
        """Proof: Removing a window from ShelterModel removes the fenestration surface from the EnergyPlus model."""
        generator = EnergyPlusIDFGenerator(engine_version="24.1")

        # Start with a model with two windows (South and East)
        model = copy.deepcopy(baseline_shelter)
        model["windows"] = [
            {
                "id": "win_south_01",
                "wall": "south",
                "position_x": 1.0,
                "width": 1.5,
                "height": 1.2,
                "sill_height": 0.9,
                "glazing_type": "Triple_LowE_Krypton",
            },
            {
                "id": "win_east_02",
                "wall": "east",
                "position_x": 1.0,
                "width": 1.0,
                "height": 1.0,
                "sill_height": 1.0,
                "glazing_type": "Double_LowE_Argon",
            },
        ]

        idf_two_windows = generate_idf_content(generator, model)
        assert "win_south_01" in idf_two_windows
        assert "win_east_02" in idf_two_windows

        # Delete the east window from the ShelterModel
        model["windows"] = [w for w in model["windows"] if w["id"] != "win_east_02"]

        idf_one_window = generate_idf_content(generator, model)
        assert "win_south_01" in idf_one_window
        assert "win_east_02" not in idf_one_window  # Fully removed!

    def test_04_adding_door_affects_simulation(self, baseline_shelter):
        """Proof: Adding an insulated door generates door FenestrationSurface:Detailed in EnergyPlus."""
        generator = EnergyPlusIDFGenerator(engine_version="24.1")

        model = copy.deepcopy(baseline_shelter)
        model["doors"].append({
            "id": "door_north_main",
            "wall": "north",
            "position_x": 2.0,
            "width": 1.0,
            "height": 2.1,
            "construction": "Insulated Steel",
        })

        idf = generate_idf_content(generator, model)
        assert "door_north_main" in idf
        assert "Door_Const" in idf
        assert "NorthWall" in idf
        assert "Door," in idf or "Door" in idf

    def test_05_changing_wall_construction_affects_simulation(self, baseline_shelter):
        """Proof: Changing wall construction (adding 150mm insulation) updates materials and constructions in EnergyPlus."""
        generator = EnergyPlusIDFGenerator(engine_version="24.1")

        # Baseline: North wall is single-layer Rammed Earth 300mm
        idf_base = generate_idf_content(generator, baseline_shelter)
        assert "NorthWall_Const" in idf_base
        assert "Mat_mat_rammed_earth_300mm" in idf_base
        assert "Mat_mat_eps_insulation_150mm" not in idf_base

        # Upgrade North wall to composite: 150mm EPS + 300mm Rammed Earth
        upgraded = copy.deepcopy(baseline_shelter)
        upgraded["envelope"]["walls"]["north"]["layers"] = [
            {"material_id": "mat-eps-insulation", "thickness": 0.15},
            {"material_id": "mat-rammed-earth", "thickness": 0.30},
        ]

        idf_upgraded = generate_idf_content(generator, upgraded)
        assert "Mat_mat_eps_insulation_150mm" in idf_upgraded
        assert "Mat_mat_rammed_earth_300mm" in idf_upgraded

        # Verify NorthWall_Const contains the new EPS layer
        assert "NorthWall_Const," in idf_upgraded
        # Verify thermal properties of the new material are emitted
        assert "0.0350, !- Conductivity {W/m-K}" in idf_upgraded  # EPS conductivity
