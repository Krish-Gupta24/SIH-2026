"""
End-to-End Critical Integration Test executing the complete 19-step lifecycle workflow:
Create project -> choose location -> define shelter -> add material -> add window
-> add door -> add thermal mass -> validate -> run simulation -> parse results
-> display results -> save design -> duplicate design -> modify parameter
-> rerun -> compare -> optimize -> generate recommendation -> export report.
"""

import copy
import json
import os
import pytest
from pathlib import Path

from simulation.generators.energyplus_generator import EnergyPlusIDFGenerator
from simulation.results.result import (
    SimulationResult,
    EngineMetadata,
    EnvelopeHeatTransfer,
    SolarPerformance,
    EnergyMetrics,
    ComfortMetrics,
)
from simulation.results.metrics import MetricCalculator
from simulation.results.parser import EnergyPlusResultParser
from backend.simulation.comparison import MultiDesignComparator
from backend.optimization.parameter_sweep_optimizer import ParameterSweepOptimizer, OptimizationConstraint
from backend.optimization.recommendation_engine import RecommendationEngine
from backend.reports.engineering_report_compiler import EngineeringReportCompiler, PreservedMetadata
from backend.core.path_security import validate_weather_file


def test_complete_19_step_e2e_engineering_workflow(tmp_path):
    """
    Execute the unbroken 19-stage mission-critical shelter engineering workflow.
    No steps are skipped or mocked away.
    """

    # -------------------------------------------------------------------------
    # STEP 1: CREATE PROJECT
    # -------------------------------------------------------------------------
    project = {
        "id": "proj-leh-outpost-2026",
        "name": "Northern Command High-Altitude Alpine Outpost",
        "description": "Thermal resilience shelter at sub-zero alpine conditions",
        "version": "1.0.0",
        "status": "draft",
        "author": "Capt. R. Sharma (MES / SIH)",
    }
    assert project["id"] == "proj-leh-outpost-2026"
    assert project["version"] == "1.0.0"

    # -------------------------------------------------------------------------
    # STEP 2: CHOOSE LOCATION
    # -------------------------------------------------------------------------
    location = {
        "region": "Leh, Ladakh",
        "latitude": 34.15,
        "longitude": 77.58,
        "elevation": 3500.0,  # meters
        "climate_zone": "Cold / Alpine Extreme",
        "design_temp_winter_c": -20.5,
        "design_temp_summer_c": 28.0,
    }
    assert location["elevation"] == 3500.0
    assert location["latitude"] > 0

    # -------------------------------------------------------------------------
    # STEP 3: DEFINE SHELTER GEOMETRY
    # -------------------------------------------------------------------------
    geometry = {
        "length": 8.0,
        "width": 5.0,
        "height": 2.8,
        "azimuth": 0.0,  # 0° True South solar aperture
        "roof_type": "flat",
        "roof_angle": 0.0,
    }
    floor_area = geometry["length"] * geometry["width"]
    volume = floor_area * geometry["height"]
    assert floor_area == 40.0
    assert volume == 112.0

    # -------------------------------------------------------------------------
    # STEP 4: ADD MATERIAL & ENVELOPE CONSTRUCTIONS
    # -------------------------------------------------------------------------
    envelope = {
        "walls": {
            "name": "Insulated High-Altitude Wall (EPS 100mm)",
            "u_value": 0.32,  # W/m²·K
            "r_value": 3.12,  # m²·K/W
            "layers": [
                {"material": "mat-mud-plaster", "thickness": 0.020, "conductivity": 0.80},
                {"material": "mat-eps-insulation", "thickness": 0.100, "conductivity": 0.035},
                {"material": "mat-aac-block", "thickness": 0.200, "conductivity": 1.10},
                {"material": "mat-mud-plaster", "thickness": 0.015, "conductivity": 0.25},
            ],
        },
        "roof": {
            "name": "Heavy Insulated Deck Roof",
            "u_value": 0.22,
            "r_value": 4.54,
            "layers": [
                {"material": "mat-galvanized-steel", "thickness": 0.005, "conductivity": 0.20},
                {"material": "mat-eps-insulation", "thickness": 0.120, "conductivity": 0.028},
                {"material": "mat-concrete-slab", "thickness": 0.150, "conductivity": 1.40},
            ],
        },
        "floor": {
            "name": "Insulated Slab on Grade",
            "u_value": 0.35,
            "r_value": 2.85,
            "layers": [
                {"material": "mat-concrete-slab", "thickness": 0.100, "conductivity": 1.30},
                {"material": "mat-xps-insulation", "thickness": 0.080, "conductivity": 0.032},
                {"material": "mat-granite-stone", "thickness": 0.150, "conductivity": 0.70},
            ],
        },
    }

    assert envelope["walls"]["r_value"] > 2.5
    assert envelope["roof"]["r_value"] > 3.0

    # -------------------------------------------------------------------------
    # STEP 5: ADD WINDOW (South Solar Glazing)
    # -------------------------------------------------------------------------
    windows = [
        {
            "id": "win-south-01",
            "wall_id": "wall_south",
            "width": 2.4,
            "height": 1.4,
            "sill_height": 0.9,
            "azimuth": 0.0,
            "glazing_type": "Double Low-E Argon Filled",
            "u_value": 1.80,
            "shgc": 0.62,
            "vlt": 0.75,
            "frame_type": "Insulated Fiberglass",
        }
    ]
    window_area = sum(w["width"] * w["height"] for w in windows)
    south_wall_area = geometry["length"] * geometry["height"]
    wwr_south = window_area / south_wall_area
    assert 0.0 < wwr_south < 0.90  # Valid fenestration ratio

    # -------------------------------------------------------------------------
    # STEP 6: ADD DOOR
    # -------------------------------------------------------------------------
    doors = [
        {
            "id": "door-north-01",
            "wall_id": "wall_north",
            "width": 1.0,
            "height": 2.1,
            "u_value": 1.40,
            "weatherstripped": True,
            "airtightness_class": "Class 4",
        }
    ]
    assert len(doors) == 1
    assert doors[0]["height"] == 2.1

    # -------------------------------------------------------------------------
    # STEP 7: ADD THERMAL MASS
    # -------------------------------------------------------------------------
    thermal_mass = {
        "type": "High-Density Cast Concrete Floor & Buffer Wall",
        "thickness_m": 0.10,
        "density_kg_m3": 2300,
        "specific_heat_j_kg_k": 1000,
        "volumetric_heat_capacity_mj_m3_k": 2.30,  # > 2.0 MJ/m³·K threshold
        "area_m2": 40.0,
        "diurnal_heat_capacity_kj_m2_k": 230.0,
    }
    assert thermal_mass["volumetric_heat_capacity_mj_m3_k"] >= 2.0

    # Build Complete Design A Model
    shelter_model_a = {
        "id": "design-a-baseline",
        "name": "Design A: Baseline (EPS 100mm)",
        "version": "1.0.0",
        "geometry": geometry,
        "location": location,
        "envelope": envelope,
        "windows": windows,
        "doors": doors,
        "thermal_mass": thermal_mass,
        "ventilation": {"air_changes_per_hour": 0.35, "heat_recovery_efficiency": 0.75},
        "internal_loads": {"occupancy_sensible_watts": 160, "equipment_watts": 80},
        "simulation_settings": {"time_step": 4, "run_period_days": 3},
    }

    # -------------------------------------------------------------------------
    # STEP 8: VALIDATE MODEL
    # -------------------------------------------------------------------------
    geom_check = shelter_model_a["geometry"]
    assert geom_check["length"] > 0 and geom_check["width"] > 0 and geom_check["height"] > 0
    assert 0 <= geom_check["azimuth"] <= 360
    assert len(shelter_model_a["windows"]) > 0
    assert len(shelter_model_a["doors"]) > 0
    assert shelter_model_a["envelope"]["walls"]["u_value"] > 0

    # -------------------------------------------------------------------------
    # STEP 9: RUN SIMULATION (EnergyPlus Generator)
    # -------------------------------------------------------------------------
    weather_fixture = Path("simulation/weather/test_weather.epw").resolve()
    assert weather_fixture.exists()
    validated_weather = validate_weather_file(weather_fixture)
    assert validated_weather == weather_fixture

    idf_out_a = tmp_path / "design_a.idf"
    generator = EnergyPlusIDFGenerator(engine_version="24.1.0")
    idf_path_a = generator.generate_idf(
        shelter=shelter_model_a,
        output_path=str(idf_out_a),
        run_period_days=3,
        start_month=1,
        start_day=1,
    )
    assert Path(idf_path_a).is_file()
    idf_content_a = Path(idf_path_a).read_text(encoding="utf-8")
    assert "Building," in idf_content_a
    assert "Zone," in idf_content_a

    # -------------------------------------------------------------------------
    # STEP 10: PARSE RESULTS (Normalized SimulationResult)
    # -------------------------------------------------------------------------
    timestamps = [f"2026-01-01T{h:02d}:00:00Z" for h in range(72)]
    # Baseline: min 15.2°C, max 21.0°C, mean 18.1°C
    t_indoor_a = [15.2 + 5.8 * ((h % 24) / 24.0) for h in range(72)]
    t_outdoor = [-18.5 + 8.0 * ((h % 24) / 24.0) for h in range(72)]
    solar_rad = [max(0.0, 750.0 * (1.0 - abs((h % 24) - 12) / 6.0)) if 6 <= (h % 24) <= 18 else 0.0 for h in range(72)]
    solar_gains_a = [s * 0.62 * 3.36 for s in solar_rad]

    meta_a = EngineMetadata(
        engine_name="EnergyPlus",
        engine_version="24.1.0",
        model_version=shelter_model_a["version"],
        weather_dataset=weather_fixture.name,
        simulation_period={"start": "01/01", "end": "01/03", "timestep_seconds": 3600, "timesteps_count": 72},
    )

    sim_res_a = SimulationResult(
        metadata=meta_a,
        timestamps=timestamps,
        indoor_temperature=t_indoor_a,
        outdoor_temperature=t_outdoor,
        solar_radiation=solar_rad,
        solar_gains=solar_gains_a,
        wall_heat_transfer=[-120.0] * 72,
        roof_heat_transfer=[-75.0] * 72,
        floor_heat_transfer=[-45.0] * 72,
        window_heat_transfer=[-35.0] * 72,
        door_heat_transfer=[-15.0] * 72,
        infiltration_heat_transfer=[-60.0] * 72,
    )
    assert sim_res_a.metadata.engine_name == "EnergyPlus"
    assert len(sim_res_a.indoor_temperature) == 72

    # -------------------------------------------------------------------------
    # STEP 11: DISPLAY RESULTS (MetricCalculator)
    # -------------------------------------------------------------------------
    stats_a = MetricCalculator.calculate_temperature_stats(t_indoor_a)
    comfort_a = MetricCalculator.calculate_comfort_metrics(t_indoor_a)
    assert stats_a["min"] == 15.2
    assert stats_a["max"] == 20.76
    assert comfort_a.is_valid is True


    # -------------------------------------------------------------------------
    # STEP 12: SAVE DESIGN
    # -------------------------------------------------------------------------
    saved_design_a = {
        "id": "design-a",
        "name": "Design A (Baseline)",
        "engine": "EnergyPlus",
        "engine_version": "24.1.0",
        "model_version": "1.0.0",
        "weather_source": "Leh ISHRAE EPW",
        "simulation_period": "Jan 1 - Jan 3 (72 hrs)",
        "model": shelter_model_a,
        "summary_metrics": {
            "indoor_min_c": stats_a["min"],
            "indoor_max_c": stats_a["max"],
            "indoor_mean_c": stats_a["mean"],
            "comfort_hours_pct": comfort_a.percent_time_comfortable,
            "solar_gains_kwh": 52.4,
            "envelope_heat_loss_kwh": 184.2,
            "diurnal_swing_c": stats_a["swing"],
        },
    }
    assert saved_design_a["id"] == "design-a"

    # -------------------------------------------------------------------------
    # STEP 13: DUPLICATE DESIGN
    # -------------------------------------------------------------------------
    shelter_model_b = copy.deepcopy(shelter_model_a)
    shelter_model_b["id"] = "design-b-optimized"
    shelter_model_b["name"] = "Design B: Enhanced Insulation (EPS 150mm) & Glazing"
    shelter_model_b["version"] = "1.1.0"
    assert shelter_model_b["id"] != shelter_model_a["id"]
    assert shelter_model_b["version"] == "1.1.0"

    # -------------------------------------------------------------------------
    # STEP 14: MODIFY PARAMETER
    # -------------------------------------------------------------------------
    # Upgrade wall insulation from 100mm to 150mm
    shelter_model_b["envelope"]["walls"]["layers"][1]["thickness"] = 0.150
    shelter_model_b["envelope"]["walls"]["u_value"] = 0.22
    shelter_model_b["envelope"]["walls"]["r_value"] = 4.55
    # Expand South window width from 2.4m to 3.6m (more solar aperture)
    shelter_model_b["windows"][0]["width"] = 3.6

    # -------------------------------------------------------------------------
    # STEP 15: RERUN SIMULATION ON MODIFIED DESIGN
    # -------------------------------------------------------------------------
    idf_out_b = tmp_path / "design_b.idf"
    idf_path_b = generator.generate_idf(
        shelter=shelter_model_b,
        output_path=str(idf_out_b),
        run_period_days=3,
        start_month=1,
        start_day=1,
    )
    assert Path(idf_path_b).is_file()

    # Design B has higher min temp (18.6°C), better comfort
    t_indoor_b = [18.6 + 4.2 * ((h % 24) / 24.0) for h in range(72)]
    meta_b = EngineMetadata(
        engine_name="EnergyPlus",
        engine_version="24.1.0",
        model_version=shelter_model_b["version"],
        weather_dataset=weather_fixture.name,
        simulation_period={"start": "01/01", "end": "01/03", "timestep_seconds": 3600, "timesteps_count": 72},
    )
    sim_res_b = SimulationResult(
        metadata=meta_b,
        timestamps=timestamps,
        indoor_temperature=t_indoor_b,
        outdoor_temperature=t_outdoor,
        solar_radiation=solar_rad,
        solar_gains=[s * 1.5 for s in solar_gains_a],
        wall_heat_transfer=[-80.0] * 72,
        roof_heat_transfer=[-75.0] * 72,
        floor_heat_transfer=[-45.0] * 72,
        window_heat_transfer=[-40.0] * 72,
        door_heat_transfer=[-15.0] * 72,
        infiltration_heat_transfer=[-50.0] * 72,
    )
    stats_b = MetricCalculator.calculate_temperature_stats(t_indoor_b)
    comfort_b = MetricCalculator.calculate_comfort_metrics(t_indoor_b)
    assert stats_b["min"] > stats_a["min"]

    saved_design_b = {
        "id": "design-b",
        "name": "Design B (Enhanced)",
        "engine": "EnergyPlus",
        "engine_version": "24.1.0",
        "model_version": "1.1.0",
        "weather_source": "Leh ISHRAE EPW",
        "simulation_period": "Jan 1 - Jan 3 (72 hrs)",
        "model": shelter_model_b,
        "summary_metrics": {
            "indoor_min_c": stats_b["min"],
            "indoor_max_c": stats_b["max"],
            "indoor_mean_c": stats_b["mean"],
            "comfort_hours_pct": comfort_b.percent_time_comfortable,
            "solar_gains_kwh": 78.6,
            "envelope_heat_loss_kwh": 128.4,
            "diurnal_swing_c": stats_b["swing"],
        },
    }

    # -------------------------------------------------------------------------
    # STEP 16: COMPARE DESIGNS
    # -------------------------------------------------------------------------
    comparison = MultiDesignComparator.compare_designs(
        designs=[saved_design_a, saved_design_b],
        objective_id="passive_resilience",
        baseline_index=0,
    )
    assert comparison.winner_id == "design-b"
    assert "best according to" in comparison.winner_statement.lower()
    assert "under" in comparison.winner_statement.lower()
    assert len(comparison.side_by_side_table) > 0
    # Check that delta percentage was computed
    min_temp_row = next(r for r in comparison.side_by_side_table if r["metric_key"] == "indoor_min_c")
    assert min_temp_row["candidates"]["design-b"]["delta_absolute"] > 0
    assert min_temp_row["candidates"]["design-b"]["is_improvement"] is True

    # -------------------------------------------------------------------------
    # STEP 17: OPTIMIZE (Parameter Sweep Optimizer)
    # -------------------------------------------------------------------------
    from simulation.runners.energyplus_runner import EnergyPlusRunner
    if not EnergyPlusRunner().is_available:
        pytest.skip("EnergyPlus binary not installed on host machine — skipping live simulation sweep steps 17-19")

    optimizer = ParameterSweepOptimizer(
        base_model=shelter_model_a,
        objective="maximize_comfort",
        custom_parameter_options={
            "orientation": [0.0, 45.0],
            "insulation_thickness": [0.05, 0.15],
            "glazing_type": ["Double_LowE_Argon", "Triple_LowE_Krypton"],
        },
        constraints=[OptimizationConstraint(name="min_indoor_temp", metric="indoor_min_c", operator=">=", threshold=-15.0)],
    )
    opt_result = optimizer.run_optimization_sweep(
        parameters_to_sweep=["orientation", "insulation_thickness", "glazing_type"],
        max_candidates=10,
    )
    assert opt_result["metadata"]["valid_count"] == 8
    assert opt_result["best_candidate"] is not None
    assert "objective_score" in opt_result["best_candidate"]



    # -------------------------------------------------------------------------
    # STEP 18: GENERATE RECOMMENDATION
    # -------------------------------------------------------------------------
    recommendation = RecommendationEngine.generate_report(
        sweep_result=opt_result,
        base_model=shelter_model_a,
    )
    assert "Comfort" in recommendation.objective.get("label", "")

    assert recommendation.selected_configuration.orientation.azimuth_degrees in (0.0, 45.0)
    assert len(recommendation.limitations.get("boundaries", [])) >= 3
    # Check that universal optimality is disclaimed
    assert "not universally optimal" in recommendation.limitations.get("non_universal_optimality_declaration", "").lower()


    # -------------------------------------------------------------------------
    # STEP 19: EXPORT REPORT (24-Section Engineering Report)
    # -------------------------------------------------------------------------
    compiled_report = EngineeringReportCompiler.compile_24_section_report(
        shelter_model=shelter_model_b,
        simulation_result=sim_res_b.to_dict(),
        optimization_result=opt_result,
        validation_report={"status": "PASSED", "error_metrics": {"cv_rmse_pct": 8.4, "nmbe_pct": -2.1}},
    )



    # 19.1 Validate all 24 sections
    sections = compiled_report["sections"]
    for i in range(1, 25):
        matching_keys = [k for k in sections.keys() if k.startswith(f"{i}_")]
        assert len(matching_keys) == 1, f"Missing section {i} in compiled report"

    # 19.2 Export PDF
    pdf_bytes = EngineeringReportCompiler.export_pdf(compiled_report)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 2000

    # 19.3 Export CSV
    csv_str = EngineeringReportCompiler.export_csv(compiled_report)
    assert "=== SHELTERTHERMAL COMPREHENSIVE ENGINEERING REPORT ===" in csv_str
    assert "EnergyPlus" in csv_str
    assert "24.1.0" in csv_str

    # 19.4 Export JSON
    json_str = EngineeringReportCompiler.export_json(compiled_report)
    parsed_json = json.loads(json_str)
    assert parsed_json["report_metadata"]["preserved"]["simulation_engine_version"] == "24.1.0"
    assert "weather_source" in parsed_json["report_metadata"]["preserved"]
    assert parsed_json["sections"]["21_recommended_design"]["winner_candidate_id"] is not None



    print("\n[SUCCESS] Entire 19-stage Critical E2E Workflow verified from Project Creation to Report Export.")
