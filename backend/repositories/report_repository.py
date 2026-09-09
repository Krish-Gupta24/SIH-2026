"""Repository for Report data access."""

from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.report import Report
from backend.repositories import BaseRepository


class ReportRepository(BaseRepository[Report]):
    """Data access for engineering reports and compliance artifacts."""

    def __init__(self, session: AsyncSession):
        super().__init__(Report, session)

    async def list_by_version(self, project_version_id: str) -> List[Report]:
        result = await self.session.execute(
            select(Report)
            .options(selectinload(Report.simulation_run))
            .where(Report.project_version_id == project_version_id)
            .order_by(Report.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_simulation(self, simulation_run_id: str) -> Optional[Report]:
        result = await self.session.execute(
            select(Report).where(Report.simulation_run_id == simulation_run_id)
        )
        return result.scalars().first()
