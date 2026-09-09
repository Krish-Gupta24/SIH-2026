"""Repository for User entity operations."""

from typing import Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.user import User
from backend.repositories import BaseRepository


class UserRepository(BaseRepository[User]):
    """Data access operations for User accounts."""

    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.email == email.lower().strip())
        )
        return result.scalars().first()
