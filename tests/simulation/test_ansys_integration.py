"""
Tests for the ANSYS Integration & Validation Engine Adapter.

Verifies:
1. Honest environment detection (identifies absence of ANSYS binary & licenses).
2. Topological and physical model validation.
3. High-altitude physics preparation (pressure, air density, internal heat sources).
4. Export packaging: Fluent journal, MAPDL macro, boundary manifest, batch scripts.
5. Strict refusal to fake results: run_simulation raises ANSYSNotAvailableError.
6. Honest results collection: returns no_results_found when outputs do not exist.
"""

import pytest
import os
import tempfile
from pathlib import Path
from backend.simulation.ansys_engine import (
    ANSYSAdapter,
    ANSYSEngine,
    ANSYSNotAvailableError,
    ANSYSEnvironmentStatus,
    ANSYSExportPackage,
)


@pytest.fixture
def sample_shelter_model():
    return {
        "id": "alpine-ansys-test",
        "project": {
            "name": "Siachen Glacier High-Altitude Bunkhouse",
            "version": "1.0.0",
        },
        "location": {
            "region": "Leh Ladakh, India",
            "elevation": 3500.0,
            "latitude": 34.1526,
            "longitude": 77.5771,
            "climateZone": "Cold / Extreme Alpine (ASHRAE Zone 8)",
            "designTempWinter": -20.5,
            "weatherSource": "IND_JK_Leh.420270_ISHRAE.epw",
        },
        "geometry": {
            "length": 6.0,
            "width": 4.0,
            "height": 2.8,
            "orientation": 0.0,
            "roofAngle": 15.0,
        },
        "envelope": {
            "walls": {
                "north": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                "south": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                "east": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
                "west": {"layers": [{"materialId": "mat-eps-insulation", "thickness": 0.15}]},
            }
        },
        "internalLoads": {
            "occupantsCount": 4,
            "activityLevelWatts": 90.0,
            "equipmentPowerWatts": 350.0,
        },
    }


def test_honest_environment_detection():
    """Verify that detect_environment returns accurate, non-falsified system state."""
    env = ANSYSAdapter.detect_environment()
    assert isinstance(env, ANSYSEnvironmentStatus)

    # Documented fact for this local runner: ANSYS is not installed locally
    assert env.is_installed is False
    assert env.fluent_executable is None
    assert env.mapdl_executable is None
    assert env.license_configured is False
    assert "2024 R2" in env.supported_versions


def test_model_validation(sample_shelter_model):
    """Verify that model validation catches physical errors and warns about high altitude."""
    adapter = ANSYSAdapter()
    res = adapter.validate_model(sample_shelter_model)

    assert res["valid"] is True
    assert res["geometry_volume_m3"] == 67.2
    assert res["floor_area_m2"] == 24.0
    # High altitude warning should be triggered (>2500m)
    assert any("High-altitude location" in w for w in res["warnings"])

    # Test invalid dimensions
    bad_model = dict(sample_shelter_model)
    bad_model["geometry"] = {"length": 0.2, "width": 4.0, "height": 2.8}
    bad_res = adapter.validate_model(bad_model)
    assert bad_res["valid"] is False
    assert any("Invalid bounding dimensions" in e for e in bad_res["errors"])


def test_high_altitude_physics_preparation(sample_shelter_model):
    """Verify barometric pressure correction and volumetric internal load computation."""
    adapter = ANSYSAdapter()
    prep = adapter.prepare_model(sample_shelter_model)

    # Elevation 3500m barometric pressure should be around 67.5 kPa (not sea-level 101.3 kPa)
    p_op = prep["fluid_domain"]["operating_pressure_pa"]
    assert 65000.0 < p_op < 70000.0

    # High altitude cold air density around ~0.9 kg/m3
    rho = prep["fluid_domain"]["operating_air_density_kg_m3"]
    assert 0.85 < rho < 1.05

    # Volumetric internal heat generation from 4 occupants + equipment
    # Q = 4 * 90 + 350 = 710 W / 67.2 m3 = ~10.56 W/m3
    q_vol = prep["fluid_domain"]["volumetric_heat_source_w_m3"]
    assert 10.0 < q_vol < 12.0

    # Solar radiation parameters
    assert prep["solar_radiation"]["latitude"] == 34.1526
    assert prep["solar_radiation"]["longitude"] == 77.5771
    assert prep["solar_radiation"]["model"] == "Discrete_Ordinates (DO)"


def test_export_package_generation(sample_shelter_model):
    """Verify generation of all 5 export artifacts."""
    adapter = ANSYSAdapter()

    with tempfile.TemporaryDirectory() as tmpdir:
        pkg = adapter.export_model(sample_shelter_model, tmpdir)

        assert isinstance(pkg, ANSYSExportPackage)
        assert Path(pkg.fluent_journal_path).exists()
        assert Path(pkg.mapdl_macro_path).exists()
        assert Path(pkg.boundary_manifest_path).exists()
        assert Path(pkg.batch_script_windows).exists()
        assert Path(pkg.batch_script_linux).exists()

        # Check Fluent journal contents
        jou_content = Path(pkg.fluent_journal_path).read_text(encoding="utf-8")
        assert "/define/models/energy? yes" in jou_content
        assert "/define/models/radiation/solar-calculator" in jou_content
        assert "/define/operating-conditions/operating-pressure" in jou_content
        assert "2nd-order-implicit" in jou_content

        # Check MAPDL macro contents
        mac_content = Path(pkg.mapdl_macro_path).read_text(encoding="utf-8")
        assert "SOLID70" in mac_content
        assert "BLOCK,0,6.0,0,4.0,0,2.8" in mac_content

        # Check Windows launcher contents
        bat_content = Path(pkg.batch_script_windows).read_text(encoding="utf-8")
        assert "fluent 3ddp" in bat_content


def test_strict_refusal_to_fake_simulation(sample_shelter_model):
    """Verify that run_simulation strictly raises ANSYSNotAvailableError rather than faking data."""
    adapter = ANSYSAdapter()

    with tempfile.TemporaryDirectory() as tmpdir:
        pkg = adapter.export_model(sample_shelter_model, tmpdir)

        with pytest.raises(ANSYSNotAvailableError) as excinfo:
            adapter.run_simulation(pkg)

        err_msg = str(excinfo.value)
        assert "Cannot execute ANSYS simulation locally" in err_msg
        assert "ANSYS Fluent binary was not detected" in err_msg
        assert "run_fluent_batch.bat" in err_msg


def test_honest_results_collection_when_absent():
    """Verify collect_results refuses to fabricate fake data when files are missing."""
    adapter = ANSYSAdapter()

    with tempfile.TemporaryDirectory() as tmpdir:
        res = adapter.collect_results(tmpdir)
        assert res["status"] == "no_results_found"
        assert res["has_valid_data"] is False
        assert "No ANSYS Fluent output files found" in res["message"]


def test_genuine_results_collection_when_present():
    """Verify collect_results parses actual Fluent monitor format accurately."""
    adapter = ANSYSAdapter()

    with tempfile.TemporaryDirectory() as tmpdir:
        monitor_file = Path(tmpdir) / "indoor_temp_volume_avg.out"
        monitor_content = (
            "# Fluent Surface Monitor Output\n"
            "((timestep temperature))\n"
            "1 285.15\n"
            "2 286.20\n"
            "3 287.05\n"
        )
        monitor_file.write_text(monitor_content, encoding="utf-8")

        res = adapter.collect_results(tmpdir)
        assert res["status"] == "ingested"
        assert res["has_valid_data"] is True
        assert res["total_timesteps"] == 3
        # 285.15 K = 12.0 °C
        assert res["timeseries"][0]["indoor_temp_c"] == 12.0
        # 286.20 K = 13.05 °C
        assert res["timeseries"][1]["indoor_temp_c"] == 13.05
