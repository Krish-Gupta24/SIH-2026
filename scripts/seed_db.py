"""Database seed utility to populate verified materials and initial reference shelters."""

import asyncio
import json
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.core.database import AsyncSessionLocal, engine, Base
import backend.models
from backend.models.material import MaterialEntity


async def seed_materials():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    materials_file = ROOT_DIR / "database" / "seeds" / "default_materials.json"
    if not materials_file.exists():
        print("Seed file not found:", materials_file)
        return

    with open(materials_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    async with AsyncSessionLocal() as session:

        for item in data:
            entity = MaterialEntity(
                id=item["id"],
                name=item["name"],
                conductivity=item["conductivity"],
                density=item["density"],
                specific_heat=item["specific_heat"],
                roughness=item.get("roughness", "MediumRough"),
                provenance=item["provenance"],
                source_database=item["source_database"],
                is_user_defined=item.get("is_user_defined", False),
            )
            session.add(entity)
        await session.commit()
        print(f"Successfully seeded {len(data)} materials into database.")


if __name__ == "__main__":
    asyncio.run(seed_materials())
