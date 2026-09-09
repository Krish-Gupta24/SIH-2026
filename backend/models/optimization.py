"""Optimization runs and candidate Pareto solutions models."""

from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.models.base import BaseEntity


class OptimizationRun(BaseEntity):
    """Multi-objective optimization loop (e.g. NSGA-II genetic search)."""

    __tablename__ = "optimization_runs"

    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    algorithm = Column(String(50), default="NSGA-II", nullable=False)
    population_size = Column(Integer, default=30, nullable=False)
    generations = Column(Integer, default=50, nullable=False)
    status = Column(String(30), default="PENDING", nullable=False, index=True)

    # Justified JSON: Structured objective configuration and decision variable bounds
    objectives_config = Column(JSON, nullable=False)
    parameter_bounds = Column(JSON, nullable=False)

    # Relationships
    project_version = relationship("ProjectVersion", back_populates="optimization_runs")
    candidates = relationship(
        "OptimizationCandidate",
        back_populates="optimization_run",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class OptimizationCandidate(BaseEntity):
    """Individual design candidate evaluated during multi-objective optimization."""

    __tablename__ = "optimization_candidates"

    optimization_run_id = Column(
        String(36),
        ForeignKey("optimization_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    simulation_run_id = Column(
        String(36),
        ForeignKey("simulation_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    generation_number = Column(Integer, nullable=False, index=True)
    candidate_index = Column(Integer, nullable=False)

    # Justified JSON: Genetic variable assignments and objective evaluations
    parameters = Column(JSON, nullable=False)
    objective_scores = Column(JSON, nullable=False)

    is_pareto_optimal = Column(Boolean, default=False, nullable=False, index=True)

    # Relationships
    optimization_run = relationship("OptimizationRun", back_populates="candidates")
    simulation_run = relationship("SimulationRun")
