"""
Endpoints for comprehensive 24-section engineering report generation,
PDF compilation, CSV/JSON data export, and compliance certifications.
"""

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Dict, Any, Optional

from backend.reports.engineering_report_compiler import EngineeringReportCompiler

router = APIRouter()


class CompileReportRequest(BaseModel):
    shelter_model: Dict[str, Any]
    simulation_result: Optional[Dict[str, Any]] = None
    optimization_result: Optional[Dict[str, Any]] = None
    validation_report: Optional[Dict[str, Any]] = None


@router.post("/compile")
async def compile_report(request: CompileReportRequest):
    """Compile full 24-section engineering report with preserved metadata."""
    try:
        report = EngineeringReportCompiler.compile_24_section_report(
            shelter_model=request.shelter_model,
            simulation_result=request.simulation_result,
            optimization_result=request.optimization_result,
            validation_report=request.validation_report,
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Report compilation failed: {str(e)}")


@router.post("/export/pdf")
async def export_pdf(request: CompileReportRequest):
    """Generate and stream publication-quality 24-section engineering report PDF."""
    try:
        report_data = EngineeringReportCompiler.compile_24_section_report(
            shelter_model=request.shelter_model,
            simulation_result=request.simulation_result,
            optimization_result=request.optimization_result,
            validation_report=request.validation_report,
        )
        pdf_bytes = EngineeringReportCompiler.export_pdf(report_data, io_buffer := None)

        filename = f"{report_data['report_metadata']['report_id']}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF export failed: {str(e)}")


@router.post("/export/csv")
async def export_csv(request: CompileReportRequest):
    """Export 24-section engineering metrics to structured CSV."""
    try:
        report_data = EngineeringReportCompiler.compile_24_section_report(
            shelter_model=request.shelter_model,
            simulation_result=request.simulation_result,
            optimization_result=request.optimization_result,
            validation_report=request.validation_report,
        )
        csv_str = EngineeringReportCompiler.export_csv(report_data)

        filename = f"{report_data['report_metadata']['report_id']}.csv"
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV export failed: {str(e)}")


@router.post("/export/json")
async def export_json(request: CompileReportRequest):
    """Export complete 24-section report schema to JSON."""
    try:
        report_data = EngineeringReportCompiler.compile_24_section_report(
            shelter_model=request.shelter_model,
            simulation_result=request.simulation_result,
            optimization_result=request.optimization_result,
            validation_report=request.validation_report,
        )
        json_str = EngineeringReportCompiler.export_json(report_data)

        filename = f"{report_data['report_metadata']['report_id']}.json"
        return Response(
            content=json_str,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"JSON export failed: {str(e)}")
