"""FastAPI endpoints for ANSYS Deck Generation, Preview, and ZIP Export."""

import io
import json
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.simulation.ansys_engine import (
    ANSYSAdapter,
    ANSYSEnvironmentStatus,
    ANSYSExportPackage,
)

router = APIRouter()


class AnsysExportRequest(BaseModel):
    """Schema for ANSYS deck export request."""
    shelter_model: Dict[str, Any] = Field(..., description="Canonical ShelterModel dictionary")
    weather_context: Optional[Dict[str, Any]] = Field(default=None, description="Optional climate and solar context")


@router.get(
    "/status",
    summary="Check local ANSYS software, binary, and license status",
)
async def get_ansys_status():
    """Returns honest detection of ANSYS installation, binaries, and license status."""
    env = ANSYSAdapter.detect_environment()
    return env.to_dict()


@router.get(
    "/material-comparison",
    summary="Get pre-computed ANSYS Mechanical APDL 5-material comparison study for Leh winter",
)
async def get_ansys_material_comparison():
    """Returns authentic ANSYS Mechanical APDL comparative dataset across 5 envelope materials."""
    candidates = [
        Path("storage/ansys/material_comparison_leh_winter.json"),
        Path(__file__).resolve().parents[4] / "storage" / "ansys" / "material_comparison_leh_winter.json",
        Path(__file__).resolve().parents[3] / "storage" / "ansys" / "material_comparison_leh_winter.json",
    ]
    for p in candidates:
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="ANSYS material comparison data not found.",
    )


@router.post(
    "/export",
    summary="Generate ANSYS Fluent Journal (.jou) and MAPDL Macro (.mac) deck",
)
async def export_ansys_deck(req: AnsysExportRequest):
    """
    Validate shelter geometry and thermophysical properties, then compile ready-to-run
    Fluent Journal scripts, MAPDL thermal macros, boundary manifests, and batch scripts.
    """
    adapter = ANSYSAdapter()
    val = adapter.validate_model(req.shelter_model)
    if not val.get("valid", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Shelter model validation failed for ANSYS export", "errors": val.get("errors", [])},
        )

    prepared = adapter.prepare_model(req.shelter_model, req.weather_context)
    env = ANSYSAdapter.detect_environment()

    with tempfile.TemporaryDirectory() as tmpdir:
        pkg = adapter.export_model(req.shelter_model, tmpdir, req.weather_context)
        
        # Read file contents
        files = {
            "fluent_setup.jou": Path(pkg.fluent_journal_path).read_text(encoding="utf-8"),
            "mapdl_thermal.mac": Path(pkg.mapdl_macro_path).read_text(encoding="utf-8"),
            "material_comparison.mac": Path(pkg.material_comparison_macro_path).read_text(encoding="utf-8") if pkg.material_comparison_macro_path else "",
            "boundary_manifest.json": Path(pkg.boundary_manifest_path).read_text(encoding="utf-8"),
            "run_fluent_batch.bat": Path(pkg.batch_script_windows).read_text(encoding="utf-8"),
            "run_fluent_batch.sh": Path(pkg.batch_script_linux).read_text(encoding="utf-8"),
        }

    proj_name = req.shelter_model.get("project", {}).get("name", "Alpine_Shelter")

    return {
        "project_name": proj_name,
        "environment": env.to_dict(),
        "validation": val,
        "prepared_physics": prepared,
        "files": files,
    }


@router.post(
    "/download",
    summary="Download complete ANSYS Simulation Deck as a .zip archive",
)
async def download_ansys_zip(req: AnsysExportRequest):
    """Generate and download all ANSYS journal, macro, boundary manifest, and batch execution scripts in a single ZIP."""
    adapter = ANSYSAdapter()
    val = adapter.validate_model(req.shelter_model)
    if not val.get("valid", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Shelter model validation failed for ANSYS export", "errors": val.get("errors", [])},
        )

    proj_name = req.shelter_model.get("project", {}).get("name", "Alpine_Shelter").replace(" ", "_")
    zip_buffer = io.BytesIO()

    with tempfile.TemporaryDirectory() as tmpdir:
        pkg = adapter.export_model(req.shelter_model, tmpdir, req.weather_context)

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.write(pkg.fluent_journal_path, arcname="fluent_setup.jou")
            zip_file.write(pkg.mapdl_macro_path, arcname="mapdl_thermal.mac")
            if pkg.material_comparison_macro_path and Path(pkg.material_comparison_macro_path).exists():
                zip_file.write(pkg.material_comparison_macro_path, arcname="material_comparison.mac")
            zip_file.write(pkg.boundary_manifest_path, arcname="boundary_manifest.json")
            zip_file.write(pkg.batch_script_windows, arcname="run_fluent_batch.bat")
            zip_file.write(pkg.batch_script_linux, arcname="run_fluent_batch.sh")

            # Add README.txt for HPC and workstation engineers
            readme_text = (
                f"=================================================================\n"
                f"ANSYS High-Fidelity Validation Deck - ThemoShelter Platform\n"
                f"Project: {proj_name}\n"
                f"=================================================================\n\n"
                f"Contents:\n"
                f"1. fluent_setup.jou     : ANSYS Fluent journal script (Discrete Ordinates solar model,\n"
                f"                          high-altitude barometric operating pressure, transient iterations)\n"
                f"2. mapdl_thermal.mac    : ANSYS Mechanical APDL macro (3D solid FEA thermal conduction)\n"
                f"3. boundary_manifest.json: Full thermophysical parameters and boundary specifications\n"
                f"4. run_fluent_batch.bat : Windows batch execution launcher\n"
                f"5. run_fluent_batch.sh  : Linux / Slurm HPC cluster batch script\n\n"
                f"Execution:\n"
                f"- On Windows: Ensure 'fluent' is in PATH, then double-click 'run_fluent_batch.bat'\n"
                f"- On Linux/Slurm: Submit with 'sbatch run_fluent_batch.sh'\n"
            )
            zip_file.writestr("README.txt", readme_text)

    zip_buffer.seek(0)

    filename = f"ansys_deck_{proj_name}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
