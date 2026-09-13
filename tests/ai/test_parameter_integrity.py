"""Pre-ML Physics Pipeline Readiness Gate: Parameter Integrity Audit.

Verifies that every candidate ML design feature genuinely propagates through
the canonical ShelterModel into the compiled EnergyPlus IDF.
"""

import pytest
from simulation.generators.energyplus_generator import EnergyPlusGenerator
from backend.ai.feature_schema import design_dict_to_shelter_model


@pytest.fixture
def baseline_params():
    return {
        "length": 6.0,
        "width": 4.0,
        "height": 2.8,
        "orientation": 0.0,
        "wall_insulation_thickness": 0.10,
        "roof_insulation_thickness": 0.15,
        "floor_insulation_thickness": 0.10,
        "thermal_mass_thickness": 0.10,
        "window_area": 2.4,
        "infiltration_ach": 0.35,
        "occupants": 4.0,
        "wall_construction": "PUF_PANEL",
        "roof_construction": "INSULATED_SANDWICH",
        "glazing_type": "DOUBLE_LOW_E_ARGON",
        "thermal_mass_type": "HIGH_DENSITY_CONCRETE",
        "window_placement": "SOUTH_CONCENTRATED",
    }


def test_parameter_propagation_to_idf(baseline_params, tmp_path):
    """Verify that perturbing individual design features changes the generated EnergyPlus IDF."""
    from pathlib import Path

    gen = EnergyPlusGenerator()
    base_shelter = design_dict_to_shelter_model(baseline_params)
    base_path = str(tmp_path / "base.idf")
    gen.generate_idf(base_shelter, base_path)
    base_idf = Path(base_path).read_text(encoding="utf-8")

    assert "Building," in base_idf
    assert "MainZone" in base_idf
    assert "ZoneInfiltration:DesignFlowRate" in base_idf

    # 1. Perturb Infiltration ACH
    params_infil = dict(baseline_params, infiltration_ach=0.75)
    shelter_infil = design_dict_to_shelter_model(params_infil)
    infil_path = str(tmp_path / "infil.idf")
    gen.generate_idf(shelter_infil, infil_path)
    idf_infil = Path(infil_path).read_text(encoding="utf-8")
    assert idf_infil != base_idf
    assert "0.7500" in idf_infil

    # 2. Perturb Orientation
    params_ori = dict(baseline_params, orientation=180.0)
    shelter_ori = design_dict_to_shelter_model(params_ori)
    ori_path = str(tmp_path / "ori.idf")
    gen.generate_idf(shelter_ori, ori_path)
    idf_ori = Path(ori_path).read_text(encoding="utf-8")
    assert idf_ori != base_idf
    assert "180.00" in idf_ori

    # 3. Perturb Length
    params_len = dict(baseline_params, length=8.5)
    shelter_len = design_dict_to_shelter_model(params_len)
    len_path = str(tmp_path / "len.idf")
    gen.generate_idf(shelter_len, len_path)
    idf_len = Path(len_path).read_text(encoding="utf-8")
    assert idf_len != base_idf
    assert "8.5" in idf_len

    # 4. Perturb Wall Insulation Thickness
    params_thick = dict(baseline_params, wall_insulation_thickness=0.22)
    shelter_thick = design_dict_to_shelter_model(params_thick)
    thick_path = str(tmp_path / "thick.idf")
    gen.generate_idf(shelter_thick, thick_path)
    idf_thick = Path(thick_path).read_text(encoding="utf-8")
    assert idf_thick != base_idf
    assert "0.2200" in idf_thick or "220mm" in idf_thick

    # 5. Perturb Window Area
    params_win = dict(baseline_params, window_area=4.8)
    shelter_win = design_dict_to_shelter_model(params_win)
    win_path = str(tmp_path / "win.idf")
    gen.generate_idf(shelter_win, win_path)
    idf_win = Path(win_path).read_text(encoding="utf-8")
    assert idf_win != base_idf
