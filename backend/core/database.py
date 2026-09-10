"""SQLAlchemy async database engine, connection pooling, and session management."""

from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from backend.core.config import settings

from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

# Determine pool settings based on database dialect and normalize URL for async drivers
raw_url = settings.DATABASE_URL
connect_args = {}
pool_kwargs = {
    "echo": settings.DEBUG,
    "future": True,
}

# Normalize dialect prefix and connection query params for asyncpg
parsed = urlparse(raw_url)
scheme = parsed.scheme
if scheme in ("postgresql", "postgres"):
    scheme = "postgresql+asyncpg"
elif scheme == "sqlite":
    scheme = "sqlite+aiosqlite"

query_dict = parse_qs(parsed.query)
if "sslmode" in query_dict or "ssl" in query_dict:
    connect_args["ssl"] = "require"
    query_dict.pop("sslmode", None)
    query_dict.pop("channel_binding", None)

query_str = urlencode(query_dict, doseq=True)
normalized_url = urlunparse((scheme, parsed.netloc, parsed.path, parsed.params, query_str, parsed.fragment))

if "postgresql" in normalized_url:
    pool_kwargs.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    })

engine = create_async_engine(
    normalized_url,
    connect_args=connect_args,
    **pool_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_connection() -> bool:
    """Verify database connectivity with a ping query."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
