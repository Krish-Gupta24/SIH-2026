"""Unit tests for the repository data access layer."""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

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
    SimulationRun,
    SimulationResult,
    OptimizationRun,
    OptimizationCandidate,
    Report,
)
from backend.repositories import (
    UserRepository,
    ProjectRepository,
    MaterialRepository,
    ConstructionRepository,
    SimulationRepository,
    WeatherRepository,
    OptimizationRepository,
    ReportRepository,
)


@pytest.fixture
async def repo_session():
    """Create in-memory async database session for repository tests."""
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
async def test_user_repository(repo_session: AsyncSession):
    """Test UserRepository operations."""
    repo = UserRepository(repo_session)
    user = User(
        email="engineer@ladakh.gov.in",
        hashed_password="hash",
        full_name="Stanzin Dorje",
        role="engineer",
    )
    created = await repo.create(user)
    assert created.id is not None

    found = await repo.get_by_email("engineer@ladakh.gov.in")
    assert found is not None
    assert found.full_name == "Stanzin Dorje"

    not_found = await repo.get_by_email("unknown@nowhere.com")
    assert not_found is None


@pytest.mark.asyncio
async def test_project_repository(repo_session: AsyncSession):
    """Test ProjectRepository version querying and canonical resolution."""
    user_repo = UserRepository(repo_session)
    user = await user_repo.create(User(email="u1@test.com", hashed_password="pwd", full_name="U1"))

    proj_repo = ProjectRepository(repo_session)
    project = await proj_repo.create(Project(user_id=user.id, name="Leh High School Shelter"))

    # Add 2 versions
    v1 = ProjectVersion(project_id=project.id, version_number=1, is_canonical=False)
    v2 = ProjectVersion(project_id=project.id, version_number=2, is_canonical=True)
    repo_session.add_all([v1, v2])
    await repo_session.commit()

    canonical = await proj_repo.get_canonical_version(project.id)
    assert canonical is not None
    assert canonical.version_number == 2
    assert canonical.is_canonical is True


@pytest.mark.asyncio
async def test_material_and_construction_repositories(repo_session: AsyncSession):
    """Test MaterialRepository and ConstructionRepository with layer resolution."""
    mat_repo = MaterialRepository(repo_session)
    const_repo = ConstructionRepository(repo_session)

    m1 = await mat_repo.create(Material(
        name="Wood",
        conductivity=0.14,
        density=650.0,
        specific_heat=1600.0,
        provenance="IS 3792",
        source_database="IS_3792",
        is_user_defined=False,
    ))

    standard_mats = await mat_repo.list_standard_materials()
    assert len(standard_mats) == 1
    assert standard_mats[0].name == "Wood"

    c1 = await const_repo.create(Construction(name="Timber Roof", surface_type="ROOF"))
    layer = ConstructionLayer(construction_id=c1.id, material_id=m1.id, layer_order=0, thickness=0.05)
    repo_session.add(layer)
    await repo_session.commit()

    loaded = await const_repo.get_with_layers(c1.id)
    assert loaded is not None
    assert len(loaded.layers) == 1
    assert loaded.layers[0].material.name == "Wood"


@pytest.mark.asyncio
async def test_optimization_repository_pareto_front(repo_session: AsyncSession):
    """Test OptimizationRepository Pareto front retrieval."""
    user_repo = UserRepository(repo_session)
    user = await user_repo.create(User(email="opt@test.com", hashed_password="pwd", full_name="Opt User"))

    proj_repo = ProjectRepository(repo_session)
    proj = await proj_repo.create(Project(user_id=user.id, name="Opt Project"))

    v1 = ProjectVersion(project_id=proj.id, version_number=1)
    repo_session.add(v1)
    await repo_session.commit()

    opt_repo = OptimizationRepository(repo_session)
    run = await opt_repo.create(OptimizationRun(
        project_version_id=v1.id,
        algorithm="NSGA-II",
        population_size=20,
        generations=10,
        objectives_config=[{"name": "heating_load", "direction": "minimize"}],
        parameter_bounds={"insulation_thickness": [0.05, 0.25]},
    ))

    # Add 2 candidates: 1 pareto optimal, 1 dominated
    c1 = OptimizationCandidate(
        optimization_run_id=run.id,
        generation_number=10,
        candidate_index=1,
        parameters={"insulation_thickness": 0.20},
        objective_scores={"heating_load": 2200.0},
        is_pareto_optimal=True,
    )
    c2 = OptimizationCandidate(
        optimization_run_id=run.id,
        generation_number=10,
        candidate_index=2,
        parameters={"insulation_thickness": 0.05},
        objective_scores={"heating_load": 6500.0},
        is_pareto_optimal=False,
    )
    await opt_repo.add_candidate(c1)
    await opt_repo.add_candidate(c2)

    pareto_front = await opt_repo.get_pareto_front(run.id)
    assert len(pareto_front) == 1
    assert pareto_front[0].is_pareto_optimal is True
    assert pareto_front[0].parameters["insulation_thickness"] == 0.20
