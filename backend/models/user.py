"""User authentication and authorization model."""

from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship
from backend.models.base import BaseEntity


class User(BaseEntity):
    """User account entity for platform authentication and ownership."""

    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="engineer", nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    projects = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    custom_materials = relationship(
        "Material",
        back_populates="creator",
        foreign_keys="Material.user_id",
    )
