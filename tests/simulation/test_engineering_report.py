"""
Tests for Comprehensive Engineering Report Generation.

Verifies:
1. Compilation contains all 24 required sections.
2. Mandatory preservation of:
   - simulation engine & version
   - weather source
   - project version
   - model version
   - assumptions
3. Export to PDF (valid PDF header %PDF- and content).
4. Export to CSV (structured multi-section CSV).
5. Export to JSON (schema valid and deserializable).
"""

import pytest
import json
import csv
import io
import tempfile
from pathlib import Path

from backend.reports.engineering_report_compiler import EngineeringReportCompiler


@pytest.fixture
def sample_shelter_model():
    return {
        "id": "shelter-leh-001",
        "schemaVersion": "1.0.0",
        "project": {
            "name": "Leh Military Bunkhouse Alpha",
            "version": "1.2.0",
            "description": "High-altitude extreme cold operational outpost.",
            "authors": ["Northern Command", "SIH 2026 Team"],
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
            },
            "roof": {"constructionId": "Insulated_Heavy_Metal_Roof"},
            "floor": {"constructionId": "Insulated_Perimeter_Slab"},
        },
        "windows": [
            {"id": "w1", "wall": "south", "width": 1.4, "height": 1.0, "glazingType": "Double_LowE_Argon"},
            {"id": "w2", "wall": "south", "width": 1.4, "height": 1.0, "glazingType": "Double_LowE_Argon"},
        ],
        "ventilation": {"infiltrationACH": 0.35},
        "internalLoads": {
            "occupantsCount": 2,
            "activityLevelWatts": 90.0,
            "equipmentPowerWatts": 270.0,
        },
        "simulationSettings": {
            "engine": "EnergyPlus",
            "timestepsPerHour": 4,
            "runPeriodDays": 7,
        },
    }


def test_compiled_report_contains_all_24_sections(sample_shelter_model):
    """Verify presence of all 24 required sections in compiled report."""
    report = EngineeringReportCompiler.compile_24_section_report(sample_shelter_model)

    sections = report.get("sections", {})

    expected_24_sections = [
        "1_project",
        "2_location",
        "3_weather_source",
        "4_geometry",
        "5_orientation",
        "6_walls",
        "7_roof",
        "8_floor",
        "9_windows",
        "10_doors",
        "11_thermal_mass",
        "12_ventilation",
        "13_internal_loads",
        "14_simulation_settings",
        "15_indoor_temperature",
        "16_solar_gains",
        "17_heat_flow",
        "18_comfort",
        "19_comparison",
        "20_optimization",
        "21_recommended_design",
        "22_assumptions",
        "23_sources",
        "24_validation_notes",
    ]

    for sec_name in expected_24_sections:
        assert sec_name in sections, f"Missing required section: {sec_name}"


def test_metadata_preservation_on_every_report(sample_shelter_model):
    """
    Verify strict preservation of:
    - simulation engine & engine version
    - weather source
    - project version
    - model version
    - explicit assumptions
    """
    report = EngineeringReportCompiler.compile_24_section_report(sample_shelter_model)

    meta = report.get("report_metadata", {})
    preserved = meta.get("preserved", {})

    # 1. Simulation engine & version
    assert "EnergyPlus" in preserved["simulation_engine"]
    assert len(preserved["simulation_engine_version"]) > 0

    # 2. Weather source
    assert preserved["weather_source"] == "IND_JK_Leh.420270_ISHRAE.epw"

    # 3. Project version
    assert preserved["project_version"] == "1.2.0"

    # 4. Model version
    assert preserved["model_version"] == "1.0.0"

    # 5. Assumptions
    sec22 = report["sections"]["22_assumptions"]
    assert "assumptions" in sec22
    assert len(sec22["assumptions"]) >= 4
    assert any("conduction" in a.lower() for a in sec22["assumptions"])


def test_pdf_export_generation(sample_shelter_model):
    """Verify PDF document generation produces valid binary with ReportLab."""
    report = EngineeringReportCompiler.compile_24_section_report(sample_shelter_model)

    buffer = io.BytesIO()
    pdf_bytes = EngineeringReportCompiler.export_pdf(report, buffer)

    assert isinstance(pdf_bytes, (bytes, bytearray))
    assert len(pdf_bytes) > 2000, "PDF should be non-trivial document"
    # PDF magic header
    assert pdf_bytes[:5] == b"%PDF-", "Valid PDF must begin with %PDF- header"

    # Also test export to file path
    with tempfile.TemporaryDirectory() as tmpdir:
        pdf_path = Path(tmpdir) / "test_report.pdf"
        EngineeringReportCompiler.export_pdf(report, pdf_path)
        assert pdf_path.exists()
        assert pdf_path.stat().st_size > 2000


def test_json_export_serialization(sample_shelter_model):
    """Verify JSON export produces valid, deserializable document."""
    report = EngineeringReportCompiler.compile_24_section_report(sample_shelter_model)

    json_str = EngineeringReportCompiler.export_json(report)
    assert isinstance(json_str, str)
    assert len(json_str) > 1000

    parsed = json.loads(json_str)
    assert "sections" in parsed
    assert len(parsed["sections"]) == 24
    assert parsed["report_metadata"]["preserved"]["project_version"] == "1.2.0"


def test_csv_export_formatting(sample_shelter_model):
    """Verify CSV export produces structured table with all 24 sections."""
    report = EngineeringReportCompiler.compile_24_section_report(sample_shelter_model)

    csv_str = EngineeringReportCompiler.export_csv(report)
    assert isinstance(csv_str, str)
    assert len(csv_str) > 500

    reader = list(csv.reader(io.StringIO(csv_str)))
    # Check preserved metadata in header rows
    flat_rows = [cell for row in reader for cell in row]
    assert "Simulation Engine" in flat_rows
    assert "IND_JK_Leh.420270_ISHRAE.epw" in flat_rows
    assert "Project Version" in flat_rows
