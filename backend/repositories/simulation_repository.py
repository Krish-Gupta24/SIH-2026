"""Repository for SimulationRun and SimulationResult persistence."""

from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.simulation import SimulationRun, SimulationResult
from backend.repositories import BaseRepository


class SimulationRepository(BaseRepository[SimulationRun]):
    """Data access for simulation executions and outcomes."""

    def __init__(self, session: AsyncSession):
        super().__init__(SimulationRun, session)

    async def get_with_results(self, run_id: str) -> Optional[SimulationRun]:
        result = await self.session.execute(
            select(SimulationRun)
            .options(
                selectinload(SimulationRun.result),
                selectinload(SimulationRun.weather_dataset),
            )
            .where(SimulationRun.id == run_id)
        )
        return result.scalars().first()

    async def list_by_version(self, project_version_id: str) -> List[SimulationRun]:
        result = await self.session.execute(
            select(SimulationRun)
            .options(selectinload(SimulationRun.result))
            .where(SimulationRun.project_version_id == project_version_id)
            .order_by(SimulationRun.created_at.desc())
        )
        return list(result.scalars().all())

    async def save_result(self, result_entity: SimulationResult) -> SimulationResult:
        self.session.add(result_entity)
        await self.session.commit()
        await self.session.refresh(result_entity)
        return result_entity
