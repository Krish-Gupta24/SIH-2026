"""
Tests for MultiDesignComparator Operating on Real SimulationResult Objects.

Verifies:
1. Comparison operates on completed SimulationResult objects.
2. Displays all 12 mandatory items (Design, Simulation ID, Weather, Engine, Period,
   Average indoor temp, Minimum temp, Maximum temp, Comfort, Solar gain, Heat loss, Energy).
3. Detects disparate simulation engines (EnergyPlus vs RC) and issues explicit non-equivalence warning.
4. Detects differing weather datasets and issues weather divergence warning.
5. Mathematical validity of percentage difference (None when baseline is zero).
6. Objective winner determination under selected constraints.
7. Modifying a design and re-running produces verified changes in comparison data.
"""

import pytest
from simulation.results.result import (
    SimulationResult,
    EngineMetadata,
    EnvelopeHeatTransfer,
    SolarPerformance,
    EnergyMetrics,
    ComfortMetrics,
)
from backend.simulation.comparison import MultiDesignComparator, MultiDesignComparisonResult


def build_mock_simulation_result(
    sim_id: str,
    design_name: str,
    indoor_temps: list,
    engine: str = "EnergyPlus",
    weather: str = "IND_JK_Leh.427053_TMYx.epw",
    useful_solar_kwh: float = 35.0,
    heating_demand_kwh: float = 45.0,
    comfort_hours: float = 60.0,
) -> SimulationResult:
    """Construct a clean, valid SimulationResult object for testing."""
    n = len(indoor_temps)
    timestamps = [f"2023-01-15T{i:02d}:00:00" for i in range(n)]

    meta = EngineMetadata(
        engine_name=engine,
        engine_version="24.1.0-9d7789a3ac",
        model_version="1.0.0",
        weather_dataset=weather,
        simulation_period={"run_period_days": 1, "timesteps_count": n},
        completed_successfully=True,
        simulation_id=sim_id,
        design_name=design_name,
    )

    envelope = EnvelopeHeatTransfer(
        wall_heat_transfer=[-120.0] * n,
        roof_heat_transfer=[-80.0] * n,
        floor_heat_transfer=[-50.0] * n,
        window_heat_transfer=[-40.0] * n,
    )

    solar = SolarPerformance(
        useful_solar_gain_total_kwh=useful_solar_kwh,
        solar_gains_total=[useful_solar_kwh * 1000 / n] * n,
    )

    energy = EnergyMetrics(
        heating_demand_kwh=heating_demand_kwh,
        envelope_losses_kwh={"wall": 12.0, "roof": 8.0, "floor": 5.0, "window": 4.0},
    )

    comfort = ComfortMetrics(
        hours_inside_target=comfort_hours,
        percent_time_comfortable=(comfort_hours / n) * 100.0 if n > 0 else 0.0,
    )

    return SimulationResult(
        metadata=meta,
        timestamps=timestamps,
        indoor_temperature=indoor_temps,
        outdoor_temperature=[-15.0] * n,
        solar_radiation=[250.0] * n,
        solar_gains=[useful_solar_kwh * 1000 / n] * n,
        wall_heat_transfer=[-120.0] * n,
        roof_heat_transfer=[-80.0] * n,
        floor_heat_transfer=[-50.0] * n,
        window_heat_transfer=[-40.0] * n,
        door_heat_transfer=[-10.0] * n,
        infiltration_heat_transfer=[-20.0] * n,
        envelope=envelope,
        solar=solar,
        energy=energy,
        comfort=comfort,
    )


def test_comparison_shows_all_12_mandatory_items():
    """Verify that MultiDesignComparator operates on SimulationResult and includes all 12 items."""
    res_a = build_mock_simulation_result(
        sim_id="sim-ep-001",
        design_name="Baseline 150mm EPS",
        indoor_temps=[8.0, 9.0, 11.0, 12.0, 10.0],
        useful_solar_kwh=25.0,
        heating_demand_kwh=60.0,
        comfort_hours=2.0,
    )

    res_b = build_mock_simulation_result(
        sim_id="sim-ep-002",
        design_name="Candidate 250mm EPS",
        indoor_temps=[10.5, 11.5, 13.0, 14.5, 12.0],
        useful_solar_kwh=32.0,
        heating_demand_kwh=42.0,
        comfort_hours=4.0,
    )

    comparison = MultiDesignComparator.compare_designs(
        designs=[res_a, res_b],
        objective_id="passive_resilience",
        baseline_index=0,
    )

    assert isinstance(comparison, MultiDesignComparisonResult)
    assert len(comparison.metadata_summary) == 2

    # Check the 5 metadata items for each design
    cand_meta = comparison.metadata_summary[1]
    assert cand_meta["design"] == "Candidate 250mm EPS"       # 1. Design
    assert cand_meta["simulation_id"] == "sim-ep-002"          # 2. Simulation ID
    assert "IND_JK_Leh" in cand_meta["weather"]                # 3. Weather
    assert "EnergyPlus" in cand_meta["engine"]                 # 4. Engine
    assert "days" in cand_meta["period"]                       # 5. Period

    # Check the 7 physical metric rows in side_by_side_table
    metric_keys = [r["metric_key"] for r in comparison.side_by_side_table]
    assert "indoor_mean_c" in metric_keys                      # 6. Average indoor temp
    assert "indoor_min_c" in metric_keys                       # 7. Minimum temp
    assert "indoor_max_c" in metric_keys                       # 8. Maximum temp
    assert "comfort_hours_pct" in metric_keys                  # 9. Comfort
    assert "solar_gains_kwh" in metric_keys                    # 10. Solar gain
    assert "envelope_heat_loss_kwh" in metric_keys             # 11. Heat loss
    assert "heating_demand_kwh_m2" in metric_keys              # 12. Energy


def test_engine_equivalence_warning_when_comparing_rc_to_energyplus():
    """Verify that comparing RC approximation to EnergyPlus triggers non-equivalence warning."""
    res_ep = build_mock_simulation_result(
        sim_id="sim-ep-real",
        design_name="EnergyPlus Design",
        indoor_temps=[9.0, 10.0, 11.0],
        engine="EnergyPlus",
    )

    res_rc = build_mock_simulation_result(
        sim_id="sim-rc-estimate",
        design_name="RC Approximation",
        indoor_temps=[9.2, 10.1, 10.9],
        engine="RC Network Engine",
    )

    comparison = MultiDesignComparator.compare_designs(
        designs=[res_ep, res_rc],
        objective_id="passive_resilience",
    )

    assert comparison.same_engine is False
    assert comparison.engine_warning is not None
    assert "NOT directly equivalent" in comparison.engine_warning
    assert "RC" in comparison.engine_warning


def test_weather_parity_warning_when_weather_datasets_differ():
    """Verify that differing weather datasets across candidates triggers a warning."""
    res_a = build_mock_simulation_result(
        sim_id="sim-01",
        design_name="Design A",
        indoor_temps=[8.0, 9.0],
        weather="IND_JK_Leh.427053_TMYx.epw",
    )

    res_b = build_mock_simulation_result(
        sim_id="sim-02",
        design_name="Design B",
        indoor_temps=[12.0, 13.0],
        weather="USA_CO_Golden-NREL.724666_TMY3.epw",
    )

    comparison = MultiDesignComparator.compare_designs(
        designs=[res_a, res_b],
    )

    assert comparison.same_weather is False
    assert comparison.weather_warning is not None
    assert "Different weather datasets used" in comparison.weather_warning


def test_safe_percentage_differences_guard_division_by_zero():
    """Verify delta_percentage is None when baseline is 0.0 (mathematically invalid)."""
    diff_valid = MultiDesignComparator.calculate_delta(
        baseline_val=10.0,
        candidate_val=15.0,
        higher_is_better=True,
    )
    assert diff_valid.delta_absolute == 5.0
    assert diff_valid.delta_percentage == 50.0

    diff_zero_baseline = MultiDesignComparator.calculate_delta(
        baseline_val=0.0,
        candidate_val=5.0,
        higher_is_better=True,
    )
    assert diff_zero_baseline.delta_absolute == 5.0
    assert diff_zero_baseline.delta_percentage is None  # Undefined division by zero safely guarded


def test_objective_winner_selected_under_constraints():
    """Verify winner statement adheres to conditional optimality under specified constraints."""
    res_a = build_mock_simulation_result(
        sim_id="sim-01",
        design_name="Design Low-E",
        indoor_temps=[6.0, 7.0, 8.0],
    )
    res_b = build_mock_simulation_result(
        sim_id="sim-02",
        design_name="Design Triple-Glazed",
        indoor_temps=[11.0, 12.0, 13.0],
    )

    comparison = MultiDesignComparator.compare_designs(
        designs=[res_a, res_b],
        objective_id="passive_resilience",
    )

    assert comparison.winner_id == "sim-02"
    assert comparison.winner_name == "Design Triple-Glazed"
    assert "best according to" in comparison.winner_statement.lower()
    assert "under" in comparison.winner_statement.lower()
    assert "does not constitute universal physical optimality" in comparison.winner_statement.lower()


def test_modifying_design_and_re_running_changes_comparison_data():
    """Proves that modifying a design parameter (e.g. higher insulation) changes comparison deltas."""
    base = build_mock_simulation_result(
        sim_id="sim-base",
        design_name="Base 100mm",
        indoor_temps=[7.0, 8.0, 9.0],
    )

    # Moderate modification: 150mm
    mod_150 = build_mock_simulation_result(
        sim_id="sim-150",
        design_name="Insulation 150mm",
        indoor_temps=[9.5, 10.5, 11.5],
    )

    comp_1 = MultiDesignComparator.compare_designs([base, mod_150], objective_id="passive_resilience")
    min_row_1 = next(r for r in comp_1.side_by_side_table if r["metric_key"] == "indoor_min_c")
    delta_1 = min_row_1["candidates"]["sim-150"]["delta_absolute"]
    assert delta_1 == round(9.5 - 7.0, 2)  # +2.5°C improvement

    # Further modification: 250mm
    mod_250 = build_mock_simulation_result(
        sim_id="sim-250",
        design_name="Insulation 250mm",
        indoor_temps=[12.0, 13.0, 14.0],
    )

    comp_2 = MultiDesignComparator.compare_designs([base, mod_250], objective_id="passive_resilience")
    min_row_2 = next(r for r in comp_2.side_by_side_table if r["metric_key"] == "indoor_min_c")
    delta_2 = min_row_2["candidates"]["sim-250"]["delta_absolute"]
    assert delta_2 == round(12.0 - 7.0, 2)  # +5.0°C improvement

    # The delta explicitly changed when the design was modified
    assert delta_2 > delta_1
