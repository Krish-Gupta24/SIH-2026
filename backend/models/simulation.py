"""Simulation runs and physical results models."""

from sqlalchemy import Column, String, Text, Float, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.models.base import BaseEntity


class SimulationRun(BaseEntity):
    """Execution record for an external simulation engine invocation."""

    __tablename__ = "simulation_runs"

    project_version_id = Column(
        String(36),
        ForeignKey("project_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    weather_dataset_id = Column(
        String(36),
        ForeignKey("weather_datasets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    engine = Column(String(50), nullable=False, index=True)  # EnergyPlus, OpenStudio, ANSYS
    engine_version = Column(String(50), nullable=True)
    executable_path = Column(String(512), nullable=True)

    status = Column(String(30), default="PENDING", nullable=False, index=True)  # PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    exit_code = Column(Integer, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Engineering validation status (must distinguish process success from physics validity)
    is_physically_valid = Column(Boolean, nullable=True, index=True)
    error_message = Column(Text, nullable=True)
    stdout_log_path = Column(String(512), nullable=True)
    stderr_log_path = Column(String(512), nullable=True)

    # Relationships
    project_version = relationship("ProjectVersion", back_populates="simulation_runs")
    weather_dataset = relationship("WeatherDataset", back_populates="simulation_runs")
    result = relationship(
        "SimulationResult",
        back_populates="run",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    reports = relationship("Report", back_populates="simulation_run")


class SimulationResult(BaseEntity):
    """Extracted physical thermal simulation results, comfort indices, and energy loads."""

    __tablename__ = "simulation_results"

    simulation_run_id = Column(
        String(36),
        ForeignKey("simulation_runs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Thermal energy metrics
    heating_demand_kwh = Column(Float, nullable=True)
    cooling_demand_kwh = Column(Float, nullable=True)
    peak_heating_load_w = Column(Float, nullable=True)
    peak_cooling_load_w = Column(Float, nullable=True)

    # Thermal comfort metrics (Fanger PMV/PPD)
    pmv_average = Column(Float, nullable=True)
    ppd_average = Column(Float, nullable=True)
    unmet_heating_hours = Column(Integer, nullable=True)
    unmet_cooling_hours = Column(Integer, nullable=True)

    # Zone air temperature extremes
    min_indoor_temp_c = Column(Float, nullable=True)
    max_indoor_temp_c = Column(Float, nullable=True)
    mean_indoor_temp_c = Column(Float, nullable=True)

    # External time-series file path (Parquet / HDF5 / CSV)
    timeseries_data_path = Column(String(512), nullable=True)

    # Justified JSON: Surface energy balance breakdown and monthly aggregates
    summary_metrics = Column(JSON, nullable=True)

    # Relationships
    run = relationship("SimulationRun", back_populates="result")
