"""Data access layer repositories."""

from typing import Generic, TypeVar, Type, Optional, List
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy.future import select

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    """Generic base repository for CRUD operations."""

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, entity_id: str) -> Optional[ModelType]:
        result = await self.session.execute(select(self.model).where(self.model.id == entity_id))
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        result = await self.session.execute(select(self.model).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, entity: ModelType) -> ModelType:
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def delete(self, entity: ModelType) -> None:
        await self.session.delete(entity)
        await self.session.commit()


from backend.repositories.user_repository import UserRepository
from backend.repositories.project_repository import ProjectRepository
from backend.repositories.material_repository import MaterialRepository, ConstructionRepository
from backend.repositories.simulation_repository import SimulationRepository
from backend.repositories.weather_repository import WeatherRepository
from backend.repositories.optimization_repository import OptimizationRepository
from backend.repositories.report_repository import ReportRepository

__all__ = [
    "BaseRepository",
    "UserRepository",
    "ProjectRepository",
    "MaterialRepository",
    "ConstructionRepository",
    "SimulationRepository",
    "WeatherRepository",
    "OptimizationRepository",
    "ReportRepository",
]
