"""Unit tests for SQLAlchemy database models and relationships."""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from backend.models import (
    Base,
    User,
    Project,
    ProjectVersion,
    Location,
    WeatherSource,
    WeatherDataset,
    Material,
    Construction,
    ConstructionLayer,
    Wall,
    Roof,
    Floor,
    Window,
    Door,
    ThermalMass,
    VentilationSetting,
    InternalLoad,
    SimulationRun,
    SimulationResult,
    OptimizationRun,
    OptimizationCandidate,
    Report,
)


@pytest.fixture
async def test_db():
    """Create in-memory async database for testing models."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_user_and_project_creation(test_db: AsyncSession):
    """Test User creation and cascading linkage to Project and ProjectVersion."""
    # 1. Create User
    user = User(
        email="architect@ladakh-shelter.org",
        hashed_password="secure-pbkdf2-hash",
        full_name="Tsering Norboo",
        role="senior_architect",
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    assert user.id is not None
    assert len(user.id) == 36
    assert user.created_at is not None

    # 2. Create Project owned by User
    project = Project(
        user_id=user.id,
        name="Changthang High-Altitude Outpost",
        description="Passive solar thermal shelter design at 4200m elevation",
    )
    test_db.add(project)
    await test_db.commit()
    await test_db.refresh(project)

    assert project.user_id == user.id

    # 3. Create ProjectVersion
    version = ProjectVersion(
        project_id=project.id,
        version_number=1,
        commit_message="Initial baseline with 300mm rammed earth walls",
        is_canonical=True,
    )
    test_db.add(version)
    await test_db.commit()
    await test_db.refresh(version)

    assert version.version_number == 1
    assert version.is_canonical is True


@pytest.mark.asyncio
async def test_duplicate_version_number_fails(test_db: AsyncSession):
    """Verify that UniqueConstraint(project_id, version_number) prevents duplicate versions."""
    user = User(email="test2@example.com", hashed_password="pwd", full_name="User Two")
    test_db.add(user)
    await test_db.commit()

    project = Project(user_id=user.id, name="Test Lineage Project")
    test_db.add(project)
    await test_db.commit()

    v1 = ProjectVersion(project_id=project.id, version_number=1, commit_message="v1")
    test_db.add(v1)
    await test_db.commit()

    # Attempt to insert same version number for same project
    v1_duplicate = ProjectVersion(project_id=project.id, version_number=1, commit_message="duplicate v1")
    test_db.add(v1_duplicate)

    with pytest.raises(IntegrityError):
        await test_db.commit()
    await test_db.rollback()


@pytest.mark.asyncio
async def test_material_and_construction_assembly(test_db: AsyncSession):
    """Test Materials, Construction, and ordered ConstructionLayer stack."""
    # Create materials with explicit thermophysical properties
    mat_earth = Material(
        name="Rammed Earth (Local Ladakh)",
        conductivity=1.25,
        density=2000.0,
        specific_heat=900.0,
        roughness="Rough",
        provenance="IS 3792 / DRDO Leh",
        source_database="IS_3792",
        is_user_defined=False,
    )
    mat_eps = Material(
        name="Expanded Polystyrene (EPS)",
        conductivity=0.035,
        density=25.0,
        specific_heat=1400.0,
        roughness="Smooth",
        provenance="ASHRAE 2021",
        source_database="ASHRAE",
        is_user_defined=False,
    )
    test_db.add_all([mat_earth, mat_eps])
    await test_db.commit()

    # Create Construction
    construction = Construction(
        name="Insulated Rammed Earth Wall Assembly",
        surface_type="WALL",
        description="300mm rammed earth with 100mm external EPS insulation",
        u_value_calculated=0.31,
        r_value_calculated=3.22,
        total_thickness=0.40,
    )
    test_db.add(construction)
    await test_db.commit()

    # Create Construction Layers in order: 0 = outside (EPS), 1 = inside (Rammed Earth)
    layer_0 = ConstructionLayer(
        construction_id=construction.id,
        material_id=mat_eps.id,
        layer_order=0,
        thickness=0.10,
    )
    layer_1 = ConstructionLayer(
        construction_id=construction.id,
        material_id=mat_earth.id,
        layer_order=1,
        thickness=0.30,
    )
    test_db.add_all([layer_0, layer_1])
    await test_db.commit()

    result = await test_db.execute(select(ConstructionLayer).where(ConstructionLayer.construction_id == construction.id))
    layers = list(result.scalars().all())
    assert len(layers) == 2
    assert layers[0].layer_order == 0
    assert layers[1].layer_order == 1


@pytest.mark.asyncio
async def test_envelope_walls_and_fenestration(test_db: AsyncSession):
    """Test Wall geometry, hosted Window, and hosted Door with cascading behavior."""
    user = User(email="architect3@ladakh.org", hashed_password="pwd", full_name="User Three")
    test_db.add(user)
    await test_db.commit()

    project = Project(user_id=user.id, name="Test Envelope Project")
    test_db.add(project)
    await test_db.commit()

    version = ProjectVersion(project_id=project.id, version_number=1)
    test_db.add(version)
    await test_db.commit()

    mat = Material(
        name="Granite Stone",
        conductivity=2.8,
        density=2600.0,
        specific_heat=820.0,
        provenance="NBC 2016",
        source_database="NBC",
    )
    test_db.add(mat)
    await test_db.commit()

    construction = Construction(name="Stone Wall", surface_type="WALL")
    test_db.add(construction)
    await test_db.commit()

    # Create South-facing Wall
    wall_south = Wall(
        project_version_id=version.id,
        construction_id=construction.id,
        cardinal_direction="SOUTH",
        azimuth_deg=180.0,
        length=8.0,
        height=3.0,
    )
    test_db.add(wall_south)
    await test_db.commit()

    # Host double-glazed Window on South Wall
    window = Window(
        wall_id=wall_south.id,
        project_version_id=version.id,
        name="South Direct Gain Window",
        width=2.5,
        height=1.8,
        sill_height=0.8,
        position_x=1.5,
        glass_u_value=1.4,
        glass_shgc=0.62,
        glass_vlt=0.75,
    )
    test_db.add(window)

    # Host Insulated Air-lock Door on South Wall
    door = Door(
        wall_id=wall_south.id,
        project_version_id=version.id,
        name="Airlock Vestibule Door",
        width=1.0,
        height=2.1,
        position_x=5.5,
        u_value=1.2,
    )
    test_db.add(door)
    await test_db.commit()

    assert window.wall_id == wall_south.id
    assert door.wall_id == wall_south.id


@pytest.mark.asyncio
async def test_simulation_run_and_result_provenance(test_db: AsyncSession):
    """Test SimulationRun and 1-to-1 SimulationResult with engine tracking."""
    user = User(email="sim@test.org", hashed_password="pwd", full_name="Simulation Tester")
    test_db.add(user)
    await test_db.commit()

    project = Project(user_id=user.id, name="Simulation Provenance Test")
    test_db.add(project)
    await test_db.commit()

    version = ProjectVersion(project_id=project.id, version_number=1)
    test_db.add(version)
    await test_db.commit()

    source = WeatherSource(
        source_type="EPW",
        name="ISHRAE Leh Weather File",
        provider="ISHRAE",
    )
    test_db.add(source)
    await test_db.commit()

    dataset = WeatherDataset(
        weather_source_id=source.id,
        location_name="Leh, Ladakh, India",
        latitude=34.1526,
        longitude=77.5771,
        elevation=3500.0,
        climate_zone="Cold",
        year=2021,
        file_path="storage/weather/IND_Ladakh.Leh.420270_ISHRAE.epw",
        data_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )
    test_db.add(dataset)
    await test_db.commit()

    # Record simulation run
    sim_run = SimulationRun(
        project_version_id=version.id,
        weather_dataset_id=dataset.id,
        engine="EnergyPlus",
        engine_version="24.1.0",
        executable_path="C:\\EnergyPlusV24-1-0\\energyplus.exe",
        status="COMPLETED",
        exit_code=0,
        duration_seconds=14.2,
        is_physically_valid=True,
    )
    test_db.add(sim_run)
    await test_db.commit()

    # Record parsed physical thermal results
    sim_result = SimulationResult(
        simulation_run_id=sim_run.id,
        heating_demand_kwh=4850.5,
        cooling_demand_kwh=0.0,
        peak_heating_load_w=3200.0,
        pmv_average=-0.35,
        ppd_average=8.5,
        unmet_heating_hours=42,
        min_indoor_temp_c=16.8,
        max_indoor_temp_c=23.4,
        mean_indoor_temp_c=19.8,
    )
    test_db.add(sim_result)
    await test_db.commit()

    assert sim_result.simulation_run_id == sim_run.id
    assert sim_run.is_physically_valid is True
