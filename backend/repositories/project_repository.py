"""Repository for Project and ProjectVersion data access."""

from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.project import Project, ProjectVersion
from backend.repositories import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    """Data access operations for Projects and version lineage."""

    def __init__(self, session: AsyncSession):
        super().__init__(Project, session)

    async def list_by_user(self, user_id: str) -> List[Project]:
        result = await self.session.execute(
            select(Project)
            .where(Project.user_id == user_id)
            .order_by(Project.updated_at.desc())
        )
        return list(result.scalars().all())

    async def get_with_versions(self, project_id: str) -> Optional[Project]:
        result = await self.session.execute(
            select(Project)
            .options(selectinload(Project.versions))
            .where(Project.id == project_id)
        )
        return result.scalars().first()

    async def get_version_with_envelope(self, version_id: str) -> Optional[ProjectVersion]:
        """Fetch project version with complete shelter envelope and thermal settings loaded."""
        result = await self.session.execute(
            select(ProjectVersion)
            .options(
                selectinload(ProjectVersion.location),
                selectinload(ProjectVersion.walls),
                selectinload(ProjectVersion.roofs),
                selectinload(ProjectVersion.floors),
                selectinload(ProjectVersion.thermal_masses),
                selectinload(ProjectVersion.ventilation_settings),
                selectinload(ProjectVersion.internal_loads),
            )
            .where(ProjectVersion.id == version_id)
        )
        return result.scalars().first()

    async def get_canonical_version(self, project_id: str) -> Optional[ProjectVersion]:
        result = await self.session.execute(
            select(ProjectVersion)
            .where(
                ProjectVersion.project_id == project_id,
                ProjectVersion.is_canonical.is_(True),
            )
            .order_by(ProjectVersion.version_number.desc())
        )
        return result.scalars().first()
