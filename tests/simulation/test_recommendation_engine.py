"""
Tests for the Engineering Recommendation Layer.

Verifies:
1. Presence of all 7 mandatory sections (Objective, Constraints, Candidate Space,
   Selected Configuration, Performance, Reason for Selection, Limitations).
2. All 10 architectural configuration components (location, dimensions, orientation,
   wall system, roof system, floor, windows, doors, thermal mass, ventilation).
3. All 5 engineering performance categories (indoor temp metrics, comfort, solar gains,
   heat loss, energy).
4. Strict enforcement of Non-Universal Optimality (never claims universal optimality).
5. Accurate constraint compliance auditing and safety margins.
6. Markdown document generation.
"""

import pytest
from backend.optimization.parameter_sweep_optimizer import (
    ParameterSweepOptimizer,
    OptimizationConstraint,
)
from backend.optimization.recommendation_engine import (
    RecommendationEngine,
    RecommendationReport,
)
from simulation.runners.energyplus_runner import EnergyPlusRunner

pytestmark = pytest.mark.skipif(
    not EnergyPlusRunner().is_available,
    reason="EnergyPlus binary not installed on host machine"
)


@pytest.fixture
def sample_shelter_model():
    return {
        "id": "base-alpine-shelter",
        "project": {
            "name": "Leh Military Border Outpost",
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
        "openings": {
            "windows": [
                {"id": "win-1", "wall": "south", "width": 1.4, "height": 1.0, "glazingType": "Double_LowE_Argon"},
                {"id": "win-2", "wall": "south", "width": 1.4, "height": 1.0, "glazingType": "Double_LowE_Argon"},
            ]
        },
        "ventilation": {"infiltrationACH": 0.35},
    }


def test_recommendation_report_has_all_7_mandatory_sections(sample_shelter_model):
    """Verify that the generated report contains the exact 7 mandatory sections."""
    optimizer = ParameterSweepOptimizer(
        base_model=sample_shelter_model,
        objective="maximize_comfort",
        constraints=[
            OptimizationConstraint("Min Night Temp", "indoor_min_c", ">=", -15.0),
            OptimizationConstraint("Max Wall Thickness", "wall_thickness_m", "<=", 0.45),
        ],
    )
    sweep_results = optimizer.run_optimization_sweep(
        parameters_to_sweep=["orientation", "insulation_thickness"],
        max_candidates=5,
    )

    report = RecommendationEngine.generate_report(
        sweep_result=sweep_results,
        base_model=sample_shelter_model,
        baseline_heating_kwh=165.0,
        baseline_comfort_pct=35.0,
    )

    # 1. Check top-level dataclass
    assert isinstance(report, RecommendationReport)
    d = report.to_dict()

    # Verify the 7 mandatory section keys exist
    assert "objective" in d, "Missing section 1: Objective"
    assert "constraints" in d, "Missing section 2: Constraints"
    assert "candidate_space" in d, "Missing section 3: Candidate space"
    assert "selected_configuration" in d, "Missing section 4: Selected configuration"
    assert "performance" in d, "Missing section 5: Performance"
    assert "reason_for_selection" in d, "Missing section 6: Reason for selection"
    assert "limitations" in d, "Missing section 7: Limitations"


def test_selected_configuration_includes_all_10_required_items(sample_shelter_model):
    """Verify that Selected Configuration includes all 10 architectural items."""
    optimizer = ParameterSweepOptimizer(
        base_model=sample_shelter_model,
        objective="minimize_auxiliary_energy",
    )
    sweep_results = optimizer.run_optimization_sweep(
        parameters_to_sweep=["insulation_thickness", "glazing_type"],
        max_candidates=10,
    )

    report = RecommendationEngine.generate_report(
        sweep_result=sweep_results,
        base_model=sample_shelter_model,
    )

    cfg = report.selected_configuration

    # 1. location
    assert cfg.location.region == "Leh Ladakh, India"
    assert cfg.location.elevation_m == 3500.0
    assert cfg.location.design_winter_min_c == -20.5

    # 2. dimensions
    assert cfg.dimensions.length_m == 6.0
    assert cfg.dimensions.width_m == 4.0
    assert cfg.dimensions.height_m == 2.8
    assert cfg.dimensions.floor_area_m2 == 24.0
    assert cfg.dimensions.internal_volume_m3 == 67.2

    # 3. orientation
    assert cfg.orientation.azimuth_degrees >= 0.0
    assert len(cfg.orientation.cardinal_facing) > 0

    # 4. wall system
    assert cfg.wall_system.insulation_thickness_m > 0
    assert cfg.wall_system.u_value_w_m2k > 0
    assert len(cfg.wall_system.assembly_name) > 0

    # 5. roof system
    assert cfg.roof_system.slope_degrees == 15.0
    assert cfg.roof_system.u_value_w_m2k > 0

    # 6. floor
    assert cfg.floor.ground_contact is True
    assert cfg.floor.perimeter_insulation is True

    # 7. windows
    assert cfg.windows.window_count > 0
    assert cfg.windows.total_area_m2 > 0
    assert cfg.windows.u_value_w_m2k > 0
    assert cfg.windows.shgc > 0

    # 8. doors
    assert cfg.doors.door_count >= 1
    assert cfg.doors.u_value_w_m2k > 0

    # 9. thermal mass
    assert len(cfg.thermal_mass.strategy_name) > 0
    assert cfg.thermal_mass.heat_capacitance_kj_m2k > 0

    # 10. ventilation
    assert cfg.ventilation.design_ach > 0
    assert len(cfg.ventilation.airtightness_category) > 0


def test_performance_includes_all_5_required_categories(sample_shelter_model):
    """Verify that Performance summary includes all 5 engineering categories."""
    optimizer = ParameterSweepOptimizer(
        base_model=sample_shelter_model,
        objective="maximize_comfort",
    )
    sweep_results = optimizer.run_optimization_sweep(
        parameters_to_sweep=["orientation", "insulation_thickness"],
        max_candidates=10,
    )

    report = RecommendationEngine.generate_report(
        sweep_result=sweep_results,
        base_model=sample_shelter_model,
    )

    perf = report.performance

    # 1. indoor temperature metrics
    assert perf.indoor_temperature_metrics.indoor_min_c is not None
    assert perf.indoor_temperature_metrics.indoor_max_c >= perf.indoor_temperature_metrics.indoor_min_c
    assert perf.indoor_temperature_metrics.freeze_prevention_margin_c is not None

    # 2. comfort
    assert 0.0 <= perf.comfort.comfort_hours_pct <= 100.0
    assert "ASHRAE" in perf.comfort.standard_applied

    # 3. solar gains
    assert perf.solar_gains.total_solar_gain_kwh > 0.0
    assert perf.solar_gains.peak_solar_gain_w > 0.0

    # 4. heat loss
    assert perf.heat_loss.total_heat_loss_ua_w_k > 0.0
    assert perf.heat_loss.peak_envelope_loss_w > 0.0

    # 5. energy
    assert perf.energy.heating_demand_kwh_m2 > 0.0
    assert perf.energy.baseline_reduction_pct >= 0.0


def test_strict_non_universal_optimality_enforcement(sample_shelter_model):
    """
    Verify that universal optimality is NEVER claimed, and the non-universal
    optimality caveat is strictly formulated.
    """
    optimizer = ParameterSweepOptimizer(
        base_model=sample_shelter_model,
        objective="maximize_comfort",
    )
    sweep_results = optimizer.run_optimization_sweep(
        parameters_to_sweep=["insulation_thickness"],
        max_candidates=5,
    )

    report = RecommendationEngine.generate_report(
        sweep_result=sweep_results,
        base_model=sample_shelter_model,
    )

    limitations = report.limitations
    assert "non_universal_optimality_declaration" in limitations

    declaration = limitations["non_universal_optimality_declaration"]

    # Must explicitly state it is NOT universally optimal
    assert "NOT universally optimal" in declaration or "not universally optimal" in declaration.lower()
    assert "conditional, local optimum" in declaration.lower()
    assert "discrete Cartesian candidate space" in declaration or "candidate space" in declaration.lower()

    # Must NOT claim absolute/universal optimality in reason for selection either
    rfs = report.reason_for_selection["summary"]
    assert "universally optimal" not in rfs.lower()
    assert "In the evaluated candidate space" in rfs or "candidate space" in rfs.lower()


def test_markdown_report_formatting(sample_shelter_model):
    """Verify that to_markdown() generates all 7 sections with proper headers."""
    optimizer = ParameterSweepOptimizer(
        base_model=sample_shelter_model,
        objective="minimize_auxiliary_energy",
    )
    sweep_results = optimizer.run_optimization_sweep(
        parameters_to_sweep=["insulation_thickness"],
        max_candidates=5,
    )

    report = RecommendationEngine.generate_report(
        sweep_result=sweep_results,
        base_model=sample_shelter_model,
    )

    md = report.to_markdown()

    assert "# RECOMMENDED DESIGN" in md
    assert "## 1. Objective" in md
    assert "## 2. Boundary Constraints & Compliance Audit" in md
    assert "## 3. Candidate Space Exploration" in md
    assert "## 4. Selected Configuration (RECOMMENDED DESIGN)" in md
    assert "## 5. Performance" in md
    assert "## 6. Reason for Selection" in md
    assert "## 7. Limitations & Engineering Disclosures" in md
    assert "Best configuration found within the evaluated design space and constraints." in md


def test_no_valid_design_found_under_specified_constraints(sample_shelter_model):
    """Verify that impossible constraints trigger NoValidDesignError with exact required message."""
    from backend.optimization.recommendation_engine import NoValidDesignError

    # Set impossible constraint (e.g. min temp >= 50.0°C in passive alpine winter)
    optimizer = ParameterSweepOptimizer(
        base_model=sample_shelter_model,
        objective="maximize_comfort",
        constraints=[
            OptimizationConstraint("Impossible Temperature", "indoor_min_c", ">=", 50.0),
        ],
    )
    sweep_results = optimizer.run_optimization_sweep(
        parameters_to_sweep=["insulation_thickness"],
        max_candidates=3,
    )

    with pytest.raises(NoValidDesignError) as exc_info:
        RecommendationEngine.generate_report(
            sweep_result=sweep_results,
            base_model=sample_shelter_model,
        )

    assert "No valid design found under the specified constraints." in str(exc_info.value)


def test_performance_numbers_link_to_real_simulation_id(sample_shelter_model):
    """Verify that every performance number links to a real simulation_id."""
    optimizer = ParameterSweepOptimizer(
        base_model=sample_shelter_model,
        objective="maximize_comfort",
    )
    sweep_results = optimizer.run_optimization_sweep(
        parameters_to_sweep=["insulation_thickness"],
        max_candidates=3,
    )

    report = RecommendationEngine.generate_report(
        sweep_result=sweep_results,
        base_model=sample_shelter_model,
    )

    best_cand = sweep_results["best_candidate"]
    expected_sim_id = best_cand["simulation_id"]

    assert report.simulation_id == expected_sim_id
    assert report.performance.simulation_id == expected_sim_id
    assert len(report.simulation_id) > 0

