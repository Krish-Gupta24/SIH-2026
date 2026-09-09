"""Repository for OptimizationRun and candidate solutions."""

from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.optimization import OptimizationRun, OptimizationCandidate
from backend.repositories import BaseRepository


class OptimizationRepository(BaseRepository[OptimizationRun]):
    """Data access for multi-objective optimization loops and candidate Pareto records."""

    def __init__(self, session: AsyncSession):
        super().__init__(OptimizationRun, session)

    async def get_with_candidates(self, run_id: str) -> Optional[OptimizationRun]:
        result = await self.session.execute(
            select(OptimizationRun)
            .options(selectinload(OptimizationRun.candidates))
            .where(OptimizationRun.id == run_id)
        )
        return result.scalars().first()

    async def get_pareto_front(self, run_id: str) -> List[OptimizationCandidate]:
        result = await self.session.execute(
            select(OptimizationCandidate)
            .where(
                OptimizationCandidate.optimization_run_id == run_id,
                OptimizationCandidate.is_pareto_optimal.is_(True),
            )
            .order_by(OptimizationCandidate.generation_number.desc())
        )
        return list(result.scalars().all())

    async def add_candidate(self, candidate: OptimizationCandidate) -> OptimizationCandidate:
        self.session.add(candidate)
        await self.session.commit()
        await self.session.refresh(candidate)
        return candidate
