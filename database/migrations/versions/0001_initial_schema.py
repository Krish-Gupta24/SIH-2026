"""Initial database schema with 22 domain entities.

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-09 23:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="engineer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_created_at", "users", ["created_at"])

    # 2. projects
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"])
    op.create_index("ix_projects_name", "projects", ["name"])
    op.create_index("ix_projects_created_at", "projects", ["created_at"])

    # 3. project_versions
    op.create_table(
        "project_versions",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("commit_message", sa.String(length=500), nullable=True),
        sa.Column("parent_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_canonical", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("project_id", "version_number", name="uq_project_version_number"),
    )
    op.create_index("ix_project_versions_project_id", "project_versions", ["project_id"])
    op.create_index("ix_project_versions_version_number", "project_versions", ["version_number"])
    op.create_index("ix_project_versions_parent_version_id", "project_versions", ["parent_version_id"])
    op.create_index("ix_project_versions_is_canonical", "project_versions", ["is_canonical"])
    op.create_index("ix_project_versions_project_canonical", "project_versions", ["project_id", "is_canonical"])
    op.create_index("ix_project_versions_created_at", "project_versions", ["created_at"])

    # 4. weather_sources
    op.create_table(
        "weather_sources",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("provider", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_weather_sources_source_type", "weather_sources", ["source_type"])
    op.create_index("ix_weather_sources_created_at", "weather_sources", ["created_at"])

    # 5. weather_datasets
    op.create_table(
        "weather_datasets",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("weather_source_id", sa.String(length=36), sa.ForeignKey("weather_sources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("location_name", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("elevation", sa.Float(), nullable=False),
        sa.Column("climate_zone", sa.String(length=50), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("file_path", sa.String(length=512), nullable=True),
        sa.Column("data_hash", sa.String(length=64), nullable=True),
        sa.Column("annual_heating_degree_days", sa.Float(), nullable=True),
        sa.Column("annual_cooling_degree_days", sa.Float(), nullable=True),
        sa.Column("min_dry_bulb_c", sa.Float(), nullable=True),
        sa.Column("max_dry_bulb_c", sa.Float(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_weather_datasets_source_id", "weather_datasets", ["weather_source_id"])
    op.create_index("ix_weather_datasets_location_name", "weather_datasets", ["location_name"])
    op.create_index("ix_weather_datasets_latitude", "weather_datasets", ["latitude"])
    op.create_index("ix_weather_datasets_longitude", "weather_datasets", ["longitude"])
    op.create_index("ix_weather_datasets_climate_zone", "weather_datasets", ["climate_zone"])
    op.create_index("ix_weather_datasets_created_at", "weather_datasets", ["created_at"])

    # 6. locations
    op.create_table(
        "locations",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("weather_dataset_id", sa.String(length=36), sa.ForeignKey("weather_datasets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("region", sa.String(length=100), nullable=False),
        sa.Column("climate_zone", sa.String(length=50), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("elevation", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_locations_project_version_id", "locations", ["project_version_id"])
    op.create_index("ix_locations_weather_dataset_id", "locations", ["weather_dataset_id"])
    op.create_index("ix_locations_climate_zone", "locations", ["climate_zone"])
    op.create_index("ix_locations_created_at", "locations", ["created_at"])

    # 7. materials
    op.create_table(
        "materials",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("conductivity", sa.Float(), nullable=False),
        sa.Column("density", sa.Float(), nullable=False),
        sa.Column("specific_heat", sa.Float(), nullable=False),
        sa.Column("roughness", sa.String(length=50), nullable=False, server_default="MediumRough"),
        sa.Column("thermal_absorptance", sa.Float(), nullable=False, server_default="0.9"),
        sa.Column("solar_absorptance", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("visible_absorptance", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("provenance", sa.String(length=255), nullable=False),
        sa.Column("source_database", sa.String(length=100), nullable=False),
        sa.Column("is_user_defined", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_materials_name", "materials", ["name"])
    op.create_index("ix_materials_source_database", "materials", ["source_database"])
    op.create_index("ix_materials_is_user_defined", "materials", ["is_user_defined"])
    op.create_index("ix_materials_user_id", "materials", ["user_id"])
    op.create_index("ix_materials_created_at", "materials", ["created_at"])

    # 8. constructions
    op.create_table(
        "constructions",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("surface_type", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("u_value_calculated", sa.Float(), nullable=True),
        sa.Column("r_value_calculated", sa.Float(), nullable=True),
        sa.Column("total_thickness", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_constructions_name", "constructions", ["name"])
    op.create_index("ix_constructions_surface_type", "constructions", ["surface_type"])
    op.create_index("ix_constructions_created_at", "constructions", ["created_at"])

    # 9. construction_layers
    op.create_table(
        "construction_layers",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("construction_id", sa.String(length=36), sa.ForeignKey("constructions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("material_id", sa.String(length=36), sa.ForeignKey("materials.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("layer_order", sa.Integer(), nullable=False),
        sa.Column("thickness", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("construction_id", "layer_order", name="uq_construction_layer_order"),
    )
    op.create_index("ix_construction_layers_construction_id", "construction_layers", ["construction_id"])
    op.create_index("ix_construction_layers_material_id", "construction_layers", ["material_id"])
    op.create_index("ix_construction_layers_created_at", "construction_layers", ["created_at"])

    # 10. walls
    op.create_table(
        "walls",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("construction_id", sa.String(length=36), sa.ForeignKey("constructions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("cardinal_direction", sa.String(length=20), nullable=False),
        sa.Column("azimuth_deg", sa.Float(), nullable=False),
        sa.Column("length", sa.Float(), nullable=False),
        sa.Column("height", sa.Float(), nullable=False),
        sa.Column("solar_absorptance", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_walls_project_version_id", "walls", ["project_version_id"])
    op.create_index("ix_walls_construction_id", "walls", ["construction_id"])
    op.create_index("ix_walls_cardinal_direction", "walls", ["cardinal_direction"])
    op.create_index("ix_walls_created_at", "walls", ["created_at"])

    # 11. roofs
    op.create_table(
        "roofs",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("construction_id", sa.String(length=36), sa.ForeignKey("constructions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("roof_type", sa.String(length=50), nullable=False, server_default="SHED"),
        sa.Column("slope_deg", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("area", sa.Float(), nullable=False),
        sa.Column("azimuth_deg", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("solar_absorptance", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_roofs_project_version_id", "roofs", ["project_version_id"])
    op.create_index("ix_roofs_construction_id", "roofs", ["construction_id"])
    op.create_index("ix_roofs_created_at", "roofs", ["created_at"])

    # 12. floors
    op.create_table(
        "floors",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("construction_id", sa.String(length=36), sa.ForeignKey("constructions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("area", sa.Float(), nullable=False),
        sa.Column("perimeter", sa.Float(), nullable=False),
        sa.Column("floor_elevation", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("ground_contact", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("perimeter_insulation_depth", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_floors_project_version_id", "floors", ["project_version_id"])
    op.create_index("ix_floors_construction_id", "floors", ["construction_id"])
    op.create_index("ix_floors_created_at", "floors", ["created_at"])

    # 13. windows
    op.create_table(
        "windows",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("wall_id", sa.String(length=36), sa.ForeignKey("walls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("width", sa.Float(), nullable=False),
        sa.Column("height", sa.Float(), nullable=False),
        sa.Column("sill_height", sa.Float(), nullable=False),
        sa.Column("position_x", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("glass_u_value", sa.Float(), nullable=False),
        sa.Column("glass_shgc", sa.Float(), nullable=False),
        sa.Column("glass_vlt", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("frame_conductance", sa.Float(), nullable=False, server_default="4.5"),
        sa.Column("overhang_depth", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_windows_wall_id", "windows", ["wall_id"])
    op.create_index("ix_windows_project_version_id", "windows", ["project_version_id"])
    op.create_index("ix_windows_created_at", "windows", ["created_at"])

    # 14. doors
    op.create_table(
        "doors",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("wall_id", sa.String(length=36), sa.ForeignKey("walls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("construction_id", sa.String(length=36), sa.ForeignKey("constructions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("width", sa.Float(), nullable=False),
        sa.Column("height", sa.Float(), nullable=False),
        sa.Column("position_x", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("u_value", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_doors_wall_id", "doors", ["wall_id"])
    op.create_index("ix_doors_project_version_id", "doors", ["project_version_id"])
    op.create_index("ix_doors_created_at", "doors", ["created_at"])

    # 15. thermal_masses
    op.create_table(
        "thermal_masses",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("material_id", sa.String(length=36), sa.ForeignKey("materials.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("surface_area", sa.Float(), nullable=False),
        sa.Column("thickness", sa.Float(), nullable=False),
        sa.Column("exposed_fraction", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_thermal_masses_project_version_id", "thermal_masses", ["project_version_id"])
    op.create_index("ix_thermal_masses_material_id", "thermal_masses", ["material_id"])
    op.create_index("ix_thermal_masses_created_at", "thermal_masses", ["created_at"])

    # 16. ventilation_settings
    op.create_table(
        "ventilation_settings",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("air_changes_per_hour_infiltration", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("natural_ventilation_ach", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("mechanical_ventilation_ach", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("heat_recovery_efficiency", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("night_flushing_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ventilation_settings_project_version_id", "ventilation_settings", ["project_version_id"])
    op.create_index("ix_ventilation_settings_created_at", "ventilation_settings", ["created_at"])

    # 17. internal_loads
    op.create_table(
        "internal_loads",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("occupant_count", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("occupant_heat_gain_w", sa.Float(), nullable=False, server_default="115.0"),
        sa.Column("lighting_power_density_w_per_m2", sa.Float(), nullable=False, server_default="3.0"),
        sa.Column("equipment_power_density_w_per_m2", sa.Float(), nullable=False, server_default="2.0"),
        sa.Column("schedule_profile_type", sa.String(length=50), nullable=False, server_default="CONTINUOUS_OCCUPANCY"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_internal_loads_project_version_id", "internal_loads", ["project_version_id"])
    op.create_index("ix_internal_loads_created_at", "internal_loads", ["created_at"])

    # 18. simulation_runs
    op.create_table(
        "simulation_runs",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("weather_dataset_id", sa.String(length=36), sa.ForeignKey("weather_datasets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("engine", sa.String(length=50), nullable=False),
        sa.Column("engine_version", sa.String(length=50), nullable=True),
        sa.Column("executable_path", sa.String(length=512), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDING"),
        sa.Column("exit_code", sa.Integer(), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("is_physically_valid", sa.Boolean(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("stdout_log_path", sa.String(length=512), nullable=True),
        sa.Column("stderr_log_path", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_simulation_runs_project_version_id", "simulation_runs", ["project_version_id"])
    op.create_index("ix_simulation_runs_weather_dataset_id", "simulation_runs", ["weather_dataset_id"])
    op.create_index("ix_simulation_runs_engine", "simulation_runs", ["engine"])
    op.create_index("ix_simulation_runs_status", "simulation_runs", ["status"])
    op.create_index("ix_simulation_runs_is_physically_valid", "simulation_runs", ["is_physically_valid"])
    op.create_index("ix_simulation_runs_created_at", "simulation_runs", ["created_at"])

    # 19. simulation_results
    op.create_table(
        "simulation_results",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("simulation_run_id", sa.String(length=36), sa.ForeignKey("simulation_runs.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("heating_demand_kwh", sa.Float(), nullable=True),
        sa.Column("cooling_demand_kwh", sa.Float(), nullable=True),
        sa.Column("peak_heating_load_w", sa.Float(), nullable=True),
        sa.Column("peak_cooling_load_w", sa.Float(), nullable=True),
        sa.Column("pmv_average", sa.Float(), nullable=True),
        sa.Column("ppd_average", sa.Float(), nullable=True),
        sa.Column("unmet_heating_hours", sa.Integer(), nullable=True),
        sa.Column("unmet_cooling_hours", sa.Integer(), nullable=True),
        sa.Column("min_indoor_temp_c", sa.Float(), nullable=True),
        sa.Column("max_indoor_temp_c", sa.Float(), nullable=True),
        sa.Column("mean_indoor_temp_c", sa.Float(), nullable=True),
        sa.Column("timeseries_data_path", sa.String(length=512), nullable=True),
        sa.Column("summary_metrics", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_simulation_results_run_id", "simulation_results", ["simulation_run_id"])
    op.create_index("ix_simulation_results_created_at", "simulation_results", ["created_at"])

    # 20. optimization_runs
    op.create_table(
        "optimization_runs",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("algorithm", sa.String(length=50), nullable=False, server_default="NSGA-II"),
        sa.Column("population_size", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("generations", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="PENDING"),
        sa.Column("objectives_config", sa.JSON(), nullable=False),
        sa.Column("parameter_bounds", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_optimization_runs_project_version_id", "optimization_runs", ["project_version_id"])
    op.create_index("ix_optimization_runs_status", "optimization_runs", ["status"])
    op.create_index("ix_optimization_runs_created_at", "optimization_runs", ["created_at"])

    # 21. optimization_candidates
    op.create_table(
        "optimization_candidates",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("optimization_run_id", sa.String(length=36), sa.ForeignKey("optimization_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("simulation_run_id", sa.String(length=36), sa.ForeignKey("simulation_runs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("generation_number", sa.Integer(), nullable=False),
        sa.Column("candidate_index", sa.Integer(), nullable=False),
        sa.Column("parameters", sa.JSON(), nullable=False),
        sa.Column("objective_scores", sa.JSON(), nullable=False),
        sa.Column("is_pareto_optimal", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_opt_cand_run_id", "optimization_candidates", ["optimization_run_id"])
    op.create_index("ix_opt_cand_sim_run_id", "optimization_candidates", ["simulation_run_id"])
    op.create_index("ix_opt_cand_gen_num", "optimization_candidates", ["generation_number"])
    op.create_index("ix_opt_cand_is_pareto", "optimization_candidates", ["is_pareto_optimal"])
    op.create_index("ix_opt_cand_created_at", "optimization_candidates", ["created_at"])

    # 22. reports
    op.create_table(
        "reports",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("project_version_id", sa.String(length=36), sa.ForeignKey("project_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("simulation_run_id", sa.String(length=36), sa.ForeignKey("simulation_runs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("report_type", sa.String(length=50), nullable=False),
        sa.Column("compliance_standard", sa.String(length=50), nullable=False),
        sa.Column("is_compliant", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("pdf_file_path", sa.String(length=512), nullable=True),
        sa.Column("html_file_path", sa.String(length=512), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_reports_project_version_id", "reports", ["project_version_id"])
    op.create_index("ix_reports_simulation_run_id", "reports", ["simulation_run_id"])
    op.create_index("ix_reports_report_type", "reports", ["report_type"])
    op.create_index("ix_reports_compliance_standard", "reports", ["compliance_standard"])
    op.create_index("ix_reports_created_at", "reports", ["created_at"])


def downgrade() -> None:
    # Drop tables in reverse topological order
    op.drop_table("reports")
    op.drop_table("optimization_candidates")
    op.drop_table("optimization_runs")
    op.drop_table("simulation_results")
    op.drop_table("simulation_runs")
    op.drop_table("internal_loads")
    op.drop_table("ventilation_settings")
    op.drop_table("thermal_masses")
    op.drop_table("doors")
    op.drop_table("windows")
    op.drop_table("floors")
    op.drop_table("roofs")
    op.drop_table("walls")
    op.drop_table("construction_layers")
    op.drop_table("constructions")
    op.drop_table("materials")
    op.drop_table("locations")
    op.drop_table("weather_datasets")
    op.drop_table("weather_sources")
    op.drop_table("project_versions")
    op.drop_table("projects")
    op.drop_table("users")
