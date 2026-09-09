"""Project and ProjectVersion models for engineering version lineage."""

from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from backend.models.base import BaseEntity


class Project(BaseEntity):
    """Engineering container grouping designs, versions, and simulation history."""

    __tablename__ = "projects"

    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="projects")
    versions = relationship(
        "ProjectVersion",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectVersion.version_number",
    )


class ProjectVersion(BaseEntity):
    """Immutable snapshot of a shelter design ensuring strict provenance and version traceability."""

    __tablename__ = "project_versions"

    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number = Column(Integer, nullable=False, index=True)
    commit_message = Column(String(500), nullable=True)
    parent_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_canonical = Column(Boolean, default=False, nullable=False, index=True)

    # Table constraints
    __table_args__ = (
        UniqueConstraint("project_id", "version_number", name="uq_project_version_number"),
        Index("ix_project_versions_project_canonical", "project_id", "is_canonical"),
    )

    # Relationships
    project = relationship("Project", back_populates="versions")
    parent_version = relationship("ProjectVersion", remote_side="ProjectVersion.id", backref="child_versions")

    location = relationship(
        "Location",
        back_populates="project_version",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    walls = relationship(
        "Wall",
        back_populates="project_version",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    roofs = relationship(
        "Roof",
        back_populates="project_version",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    floors = relationship(
        "Floor",
        back_populates="project_version",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    thermal_masses = relationship(
        "ThermalMass",
        back_populates="project_version",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    ventilation_settings = relationship(
        "VentilationSetting",
        back_populates="project_version",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    internal_loads = relationship(
        "InternalLoad",
        back_populates="project_version",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    simulation_runs = relationship(
        "SimulationRun",
        back_populates="project_version",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    optimization_runs = relationship(
        "OptimizationRun",
        back_populates="project_version",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    reports = relationship(
        "Report",
        back_populates="project_version",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
