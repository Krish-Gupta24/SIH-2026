"""Repository for WeatherSource and WeatherDataset management."""

from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.weather import WeatherSource, WeatherDataset
from backend.repositories import BaseRepository


class WeatherRepository(BaseRepository[WeatherDataset]):
    """Data access for weather datasets and climate sources."""

    def __init__(self, session: AsyncSession):
        super().__init__(WeatherDataset, session)

    async def get_by_location(self, location_name: str) -> Optional[WeatherDataset]:
        result = await self.session.execute(
            select(WeatherDataset)
            .where(WeatherDataset.location_name.ilike(f"%{location_name}%"))
        )
        return result.scalars().first()

    async def list_by_climate_zone(self, climate_zone: str) -> List[WeatherDataset]:
        result = await self.session.execute(
            select(WeatherDataset)
            .where(WeatherDataset.climate_zone == climate_zone)
            .order_by(WeatherDataset.location_name.asc())
        )
        return list(result.scalars().all())

    async def list_all_sources(self) -> List[WeatherSource]:
        result = await self.session.execute(
            select(WeatherSource)
            .options(selectinload(WeatherSource.datasets))
            .order_by(WeatherSource.name.asc())
        )
        return list(result.scalars().all())
