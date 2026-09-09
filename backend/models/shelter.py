"""Shelter model ORM entity."""

from datetime import datetime
import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from backend.core.database import Base


class ShelterModelEntity(Base):
    """Stores the canonical ShelterModel domain snapshot."""

    __tablename__ = "shelters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    name = Column(String(255), nullable=False)
    version = Column(String(32), default="1.0.0", nullable=False)
    canonical_data = Column(JSON, nullable=False)  # Full validated ShelterModel JSON
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="shelters")
    simulation_runs = relationship("SimulationRun", back_populates="shelter", cascade="all, delete-orphan")
