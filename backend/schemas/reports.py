"""Pydantic schemas for engineering reports and compliance artifacts."""

from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.schemas import CoreSchema


class EngineeringReportSchema(CoreSchema):
    report_id: str
    shelter_id: str
    simulation_id: str
    engine_name: str
    engine_version: str
    generated_at: datetime
    compliance_standard: str  # NBC 2016 | ASHRAE 55 | ECBC
    is_compliant: bool
    summary: str
    provenance_record: Dict[str, Any]
