"""Engineering report and compliance certificate models."""

from sqlalchemy import Column, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.models.base import BaseEntity


class Report(BaseEntity):
    """Generated engineering compliance document and simulation summary report."""

    __tablename__ = "reports"

    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    simulation_run_id = Column(
        String(36),
        ForeignKey("simulation_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False, index=True)  # THERMAL_COMFORT, COMPLIANCE_CERTIFICATE, OPTIMIZATION
    compliance_standard = Column(String(50), nullable=False, index=True)  # NBC_2016, ASHRAE_55, ECBC
    is_compliant = Column(Boolean, default=False, nullable=False)

    pdf_file_path = Column(String(512), nullable=True)
    html_file_path = Column(String(512), nullable=True)

    # Justified JSON: Executive summary metrics, author metadata, cryptographic audit signature
    metadata_json = Column(JSON, nullable=True)

    # Relationships
    project_version = relationship("ProjectVersion", back_populates="reports")
    simulation_run = relationship("SimulationRun", back_populates="reports")
