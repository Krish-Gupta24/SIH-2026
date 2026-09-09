"""Repository for Materials and Construction assemblies."""

from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.material import Material, Construction, ConstructionLayer
from backend.repositories import BaseRepository


class MaterialRepository(BaseRepository[Material]):
    """Data access for physical materials."""

    def __init__(self, session: AsyncSession):
        super().__init__(Material, session)

    async def list_standard_materials(self) -> List[Material]:
        result = await self.session.execute(
            select(Material)
            .where(Material.is_user_defined.is_(False))
            .order_by(Material.name.asc())
        )
        return list(result.scalars().all())

    async def list_by_source(self, source_database: str) -> List[Material]:
        result = await self.session.execute(
            select(Material)
            .where(Material.source_database == source_database)
            .order_by(Material.name.asc())
        )
        return list(result.scalars().all())


class ConstructionRepository(BaseRepository[Construction]):
    """Data access for multi-layer construction assemblies."""

    def __init__(self, session: AsyncSession):
        super().__init__(Construction, session)

    async def get_with_layers(self, construction_id: str) -> Optional[Construction]:
        result = await self.session.execute(
            select(Construction)
            .options(
                selectinload(Construction.layers).selectinload(ConstructionLayer.material)
            )
            .where(Construction.id == construction_id)
        )
        return result.scalars().first()

    async def list_by_surface_type(self, surface_type: str) -> List[Construction]:
        result = await self.session.execute(
            select(Construction)
            .options(selectinload(Construction.layers))
            .where(Construction.surface_type == surface_type.upper())
            .order_by(Construction.name.asc())
        )
        return list(result.scalars().all())
