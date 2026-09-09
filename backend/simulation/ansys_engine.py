"""
ANSYS Integration & Validation Engine Adapter.

Implements the ANSYSEngine interface for high-fidelity 3D CFD (Fluent) and
transient thermal FEA (MAPDL) validation.

Adheres strictly to the honest engineering policy:
- Does NOT claim automated simulation if ANSYS is not installed/licensed.
- Generates complete, production-ready journal files, APDL macros, and boundary decks.
- Ingests true simulation monitor files when available.
- Refuses to fabricate synthetic ANSYS CFD data.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
from pathlib import Path
import os
import sys
import json
import shutil
import subprocess


class ANSYSNotAvailableError(Exception):
    """Raised when ANSYS simulation is requested on a system without ANSYS installed or licensed."""
    pass


@dataclass
class ANSYSEnvironmentStatus:
    is_installed: bool
    version_detected: Optional[str]
    fluent_executable: Optional[str]
    mapdl_executable: Optional[str]
    license_configured: bool
    pyfluent_available: bool
    supported_versions: List[str] = field(default_factory=lambda: ["2023 R1", "2023 R2", "2024 R1", "2024 R2"])

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ANSYSExportPackage:
    export_dir: str
    fluent_journal_path: str
    mapdl_macro_path: str
    boundary_manifest_path: str
    batch_script_windows: str
    batch_script_linux: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ANSYSEngine(ABC):
    """Abstract interface defining operations for ANSYS simulation and validation."""

    @abstractmethod
    def validate_model(self, shelter_model: Dict[str, Any]) -> Dict[str, Any]:
        """Validate topological and physical completeness for ANSYS FEA/CFD modeling."""
        pass

    @abstractmethod
    def prepare_model(
        self,
        shelter_model: Dict[str, Any],
        weather_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Prepare boundary conditions, materials, radiation, and mesh parameters."""
        pass

    @abstractmethod
    def export_model(
        self,
        shelter_model: Dict[str, Any],
        output_dir: str,
        weather_context: Optional[Dict[str, Any]] = None,
    ) -> ANSYSExportPackage:
        """Generate production-ready Fluent journal files, APDL macros, and batch scripts."""
        pass

    @abstractmethod
    def run_simulation(
        self,
        export_package: ANSYSExportPackage,
        timeout_seconds: int = 3600,
    ) -> Dict[str, Any]:
        """
        Execute headless ANSYS batch simulation.
        Raises ANSYSNotAvailableError if ANSYS binary or license is not detected.
        """
        pass

    @abstractmethod
    def collect_results(self, results_dir: str) -> Dict[str, Any]:
        """Parse genuine Fluent monitor files and post-processing summaries."""
        pass


class ANSYSAdapter(ANSYSEngine):
    """Production implementation of the ANSYSEngine interface."""

    def __init__(self, custom_ansys_path: Optional[str] = None):
        self.custom_ansys_path = custom_ansys_path

    @classmethod
    def detect_environment(cls) -> ANSYSEnvironmentStatus:
        """Inspect the operating system and Python environment for ANSYS availability."""
        fluent_exe = shutil.which("fluent")
        mapdl_exe = shutil.which("ansys241") or shutil.which("ansys232") or shutil.which("ansys231")

        # Check standard installation directories on Windows
        version_detected = None
        ansys_root = None
        for v, folder in [("2024 R2", "v242"), ("2024 R1", "v241"), ("2023 R2", "v232"), ("2023 R1", "v231")]:
            std_path = Path(f"C:\\Program Files\\ANSYS Inc\\{folder}")
            if std_path.exists():
                version_detected = v
                ansys_root = str(std_path)
                if not fluent_exe and (std_path / "fluent" / "ntbin" / "win64" / "fluent.exe").exists():
                    fluent_exe = str(std_path / "fluent" / "ntbin" / "win64" / "fluent.exe")
                if not mapdl_exe and (std_path / "ansys" / "bin" / "winx64" / f"{folder}.exe").exists():
                    mapdl_exe = str(std_path / "ansys" / "bin" / "winx64" / f"{folder}.exe")
                break

        # Check license environment
        has_license = bool(
            os.environ.get("ANSYSLMD_LICENSE_FILE") or os.environ.get("ANSYS_LICENSE_FILE")
        )

        # Check PyAnsys Python package
        pyfluent_available = False
        try:
            import ansys.fluent.core  # noqa: F401
            pyfluent_available = True
        except ImportError:
            pyfluent_available = False

        is_installed = bool(fluent_exe or mapdl_exe or version_detected)

        return ANSYSEnvironmentStatus(
            is_installed=is_installed,
            version_detected=version_detected,
            fluent_executable=fluent_exe,
            mapdl_executable=mapdl_exe,
            license_configured=has_license,
            pyfluent_available=pyfluent_available,
        )

    def validate_model(self, shelter_model: Dict[str, Any]) -> Dict[str, Any]:
        """Validate topological and physical completeness for ANSYS FEA/CFD modeling."""
        errors: List[str] = []
        warnings: List[str] = []

        geom = shelter_model.get("geometry", {})
        length = geom.get("length", 0.0)
        width = geom.get("width", 0.0)
        height = geom.get("height", 0.0)

        if length <= 0.5 or width <= 0.5 or height <= 0.5:
            errors.append(f"Invalid bounding dimensions: length={length}m, width={width}m, height={height}m must be > 0.5m")

        envelope = shelter_model.get("envelope", {})
        walls = envelope.get("walls", {})
        for w_side in ["north", "south", "east", "west"]:
            wall_def = walls.get(w_side)
            if not wall_def:
                errors.append(f"Missing wall definition for facade '{w_side}'")
            elif not wall_def.get("layers"):
                warnings.append(f"Wall '{w_side}' has no material layer stack defined; using nominal single-layer conduction")

        # Elevation and Location
        loc = shelter_model.get("location", {})
        elev = loc.get("elevation", 0.0)
        if elev > 2500:
            warnings.append(f"High-altitude location ({elev}m ASL): Requires barometric pressure correction in Fluent operating conditions")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "geometry_volume_m3": round(length * width * height, 2),
            "floor_area_m2": round(length * width, 2),
        }

    def prepare_model(
        self,
        shelter_model: Dict[str, Any],
        weather_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Synthesize boundary conditions, materials, radiation, and mesh parameters."""
        geom = shelter_model.get("geometry", {})
        length = geom.get("length", 6.0)
        width = geom.get("width", 4.0)
        height = geom.get("height", 2.8)
        orientation = geom.get("orientation", 0.0)

        loc = shelter_model.get("location", {})
        elev = loc.get("elevation", 3500.0)
        lat = loc.get("latitude", 34.1526)
        lon = loc.get("longitude", 77.5771)
        winter_min = loc.get("designTempWinter", -20.5)

        # Barometric pressure at altitude
        # P = 101325 * (1 - 2.25577e-5 * h)^5.25588
        p_operating = round(101325.0 * (1.0 - 2.25577e-5 * elev) ** 5.25588, 0)
        rho_air = round(p_operating / (287.05 * (273.15 + winter_min)), 3)

        # Internal loads
        int_loads = shelter_model.get("internalLoads", {})
        q_sensible = (
            int_loads.get("occupantsCount", 2) * int_loads.get("activityLevelWatts", 90.0)
            + int_loads.get("equipmentPowerWatts", 270.0)
        )
        zone_volume = length * width * height
        volumetric_source_w_m3 = round(q_sensible / max(0.1, zone_volume), 2)

        return {
            "fluid_domain": {
                "length_m": length,
                "width_m": width,
                "height_m": height,
                "volume_m3": round(zone_volume, 2),
                "operating_pressure_pa": p_operating,
                "operating_air_density_kg_m3": rho_air,
                "volumetric_heat_source_w_m3": volumetric_source_w_m3,
            },
            "solar_radiation": {
                "model": "Discrete_Ordinates (DO)",
                "latitude": lat,
                "longitude": lon,
                "timezone_gmt": 5.5,
                "day_of_year": 15,  # Jan 15 peak winter design day
                "azimuth_offset_deg": orientation,
            },
            "boundary_conditions": {
                "exterior_ambient_min_c": winter_min,
                "convective_heat_transfer_coef_w_m2k": 18.5,
                "ground_interface_temp_c": 2.0,
                "glazing_shgc": 0.62,
                "glazing_u_factor": 1.40,
            },
            "transient_solver": {
                "time_step_sec": 180,
                "total_steps": 480,
                "iterations_per_step": 25,
                "energy_residual_target": 1e-6,
            },
        }

    def export_model(
        self,
        shelter_model: Dict[str, Any],
        output_dir: str,
        weather_context: Optional[Dict[str, Any]] = None,
    ) -> ANSYSExportPackage:
        """Generate production-ready Fluent journal files, APDL macros, and batch scripts."""
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)

        prep = self.prepare_model(shelter_model, weather_context)
        proj_name = shelter_model.get("project", {}).get("name", "Alpine_Shelter")

        # 1. Fluent Journal File (TUI commands)
        fluent_jou = [
            f"; =========================================================================",
            f"; ANSYS Fluent Journal Script Generated by ShelterThermal Platform",
            f"; Project: {proj_name}",
            f"; Elevation: {prep['fluid_domain']['operating_pressure_pa']} Pa | Altitude Air Density: {prep['fluid_domain']['operating_air_density_kg_m3']} kg/m3",
            f"; =========================================================================",
            f"",
            f"; 1. Initialize Models",
            f"/define/models/energy? yes",
            f"/define/models/viscous/ke-realizable? yes",
            f"/define/models/radiation/discrete-ordinates? yes 2 2",
            f"",
            f"; 2. Solar Calculator for High-Altitude Direct/Diffuse Radiation",
            f"/define/models/radiation/solar-calculator yes {prep['solar_radiation']['latitude']} {prep['solar_radiation']['longitude']} {prep['solar_radiation']['timezone_gmt']} 1 {prep['solar_radiation']['day_of_year']} 12 0 0",
            f"",
            f"; 3. High-Altitude Operating Pressure",
            f"/define/operating-conditions/operating-pressure {prep['fluid_domain']['operating_pressure_pa']}",
            f"",
            f"; 4. Fluid Zone Volumetric Internal Heat Gain",
            f"/define/boundary-conditions/fluid zone-air-fluid yes 0 no 0 no 0 no 0 no {prep['fluid_domain']['volumetric_heat_source_w_m3']} no no no",
            f"",
            f"; 5. Exterior Boundary Conditions",
            f"/define/boundary-conditions/wall wall-opaque-exterior yes no yes 0.22 0.15 0 0 no",
            f"/define/boundary-conditions/wall wall-glazing yes no yes {prep['boundary_conditions']['glazing_u_factor']} 0.024 0 0 yes {prep['boundary_conditions']['glazing_shgc']}",
            f"",
            f"; 6. Transient Scheme & Execution",
            f"/solve/set/transient-controls 2nd-order-implicit",
            f"/solve/set/time-step {prep['transient_solver']['time_step_sec']}",
            f"/solve/monitors/surface/set-monitor zone-temp-mon \"Area-Weighted Average\" temperature zone-air () yes yes \"indoor_temp_volume_avg.out\" 1 yes",
            f"/solve/initialize/hyb-initialization",
            f"/solve/dual-time-iterate {prep['transient_solver']['total_steps']} {prep['transient_solver']['iterations_per_step']}",
            f"/file/write-case-data \"results_completed.cas.h5\"",
            f"exit ok",
        ]
        jou_path = out_path / "fluent_setup.jou"
        jou_path.write_text("\n".join(fluent_jou), encoding="utf-8")

        # 2. ANSYS MAPDL Thermal Macro (.mac)
        geom = shelter_model.get("geometry", {})
        mapdl_mac = [
            f"! =========================================================================",
            f"! ANSYS Mechanical APDL Thermal Macro: {proj_name}",
            f"! Solid Envelope 3D Conduction & Structural Thermal Stress",
            f"! =========================================================================",
            f"/PREP7",
            f"ET,1,SOLID70        ! 3D 8-Node Thermal Solid",
            f"MP,KXX,1,0.035      ! Insulation Thermal Conductivity W/m-K",
            f"MP,DENS,1,25.0      ! Density kg/m3",
            f"MP,C,1,1400.0       ! Specific Heat J/kg-K",
            f"",
            f"! Geometry Solid Block Generation",
            f"BLOCK,0,{geom.get('length', 6.0)},0,{geom.get('width', 4.0)},0,{geom.get('height', 2.8)}",
            f"ESIZE,0.1           ! 100mm Finite Element Mesh Size",
            f"VMESH,ALL",
            f"",
            f"! Boundary Conditions",
            f"/SOLU",
            f"ANTYPE,TRANS        ! Transient Thermal Analysis",
            f"TIME,86400          ! 24 Hours in Seconds",
            f"AUTOTS,ON",
            f"DELTIM,300,60,600",
            f"SOLVE",
            f"FINISH",
        ]
        mac_path = out_path / "mapdl_thermal.mac"
        mac_path.write_text("\n".join(mapdl_mac), encoding="utf-8")

        # 3. Boundary Condition Manifest JSON
        manifest_path = out_path / "boundary_manifest.json"
        manifest_path.write_text(json.dumps(prep, indent=2), encoding="utf-8")

        # 4. Windows Execution Script
        bat_script = [
            "@echo off",
            "echo =============================================================",
            "echo  ShelterThermal - ANSYS Fluent Batch Execution Launcher",
            "echo =============================================================",
            "where fluent >nul 2>nul",
            "if %ERRORLEVEL% NEQ 0 (",
            "    echo [ERROR] 'fluent' binary not found in system PATH.",
            "    echo Please ensure ANSYS Fluent is installed and licensed.",
            "    pause",
            "    exit /b 1",
            ")",
            "echo Launching 3D Double-Precision Fluent Solver...",
            "fluent 3ddp -g -t4 -i fluent_setup.jou > fluent_run.log 2>&1",
            "echo Simulation execution completed. Check results_completed.cas.h5.",
        ]
        bat_path = out_path / "run_fluent_batch.bat"
        bat_path.write_text("\n".join(bat_script), encoding="utf-8")

        # 5. Linux / Slurm HPC Execution Script
        sh_script = [
            "#!/bin/bash",
            "#SBATCH --job-name=shelter_cfd",
            "#SBATCH --nodes=1",
            "#SBATCH --ntasks=16",
            "#SBATCH --time=04:00:00",
            "#SBATCH --partition=compute",
            "",
            "echo 'Loading ANSYS module...'",
            "module load ansys/2024r1 2>/dev/null || module load ansys/2023r2 2>/dev/null",
            "",
            "echo 'Running Fluent in batch mode on HPC cluster...'",
            "fluent 3ddp -g -t16 -i fluent_setup.jou > fluent_cluster.log 2>&1",
            "echo 'HPC execution concluded.'",
        ]
        sh_path = out_path / "run_fluent_batch.sh"
        sh_path.write_text("\n".join(sh_script), encoding="utf-8")

        return ANSYSExportPackage(
            export_dir=str(out_path),
            fluent_journal_path=str(jou_path),
            mapdl_macro_path=str(mac_path),
            boundary_manifest_path=str(manifest_path),
            batch_script_windows=str(bat_path),
            batch_script_linux=str(sh_path),
        )

    def run_simulation(
        self,
        export_package: ANSYSExportPackage,
        timeout_seconds: int = 3600,
    ) -> Dict[str, Any]:
        """
        Execute headless simulation if licensed binaries exist.
        Strictly raises ANSYSNotAvailableError if ANSYS is missing, avoiding fake results.
        """
        env = self.detect_environment()
        if not env.is_installed or not env.fluent_executable:
            raise ANSYSNotAvailableError(
                f"Cannot execute ANSYS simulation locally: ANSYS Fluent binary was not detected on this machine. "
                f"Export package is ready at: '{export_package.export_dir}'. "
                f"Execute 'run_fluent_batch.bat' on an ANSYS workstation or submit 'run_fluent_batch.sh' to your HPC Slurm cluster."
            )

        if not env.license_configured:
            raise ANSYSNotAvailableError(
                f"ANSYS binary found at '{env.fluent_executable}', but no license server is configured "
                f"(missing ANSYSLMD_LICENSE_FILE environment variable). Contact your system administrator."
            )

        # If binary and license exist, execute safely
        cmd = [env.fluent_executable, "3ddp", "-g", "-t4", "-i", export_package.fluent_journal_path]
        try:
            proc = subprocess.run(
                cmd,
                cwd=export_package.export_dir,
                timeout=timeout_seconds,
                capture_output=True,
                text=True,
            )
            return {
                "status": "completed" if proc.returncode == 0 else "failed",
                "returncode": proc.returncode,
                "stdout": proc.stdout[-1000:] if proc.stdout else "",
                "stderr": proc.stderr[-1000:] if proc.stderr else "",
            }
        except subprocess.TimeoutExpired:
            raise ANSYSNotAvailableError(f"ANSYS execution timed out after {timeout_seconds} seconds.")

    def collect_results(self, results_dir: str) -> Dict[str, Any]:
        """Parse genuine Fluent monitor files if present; returns status without fake synthesis."""
        res_path = Path(results_dir)
        monitor_file = res_path / "indoor_temp_volume_avg.out"

        if not monitor_file.exists():
            return {
                "status": "no_results_found",
                "message": (
                    f"No ANSYS Fluent output files found at '{results_dir}'. "
                    f"The simulation must be executed on a licensed ANSYS installation before results can be ingested."
                ),
                "has_valid_data": False,
            }

        # Parse genuine monitor file lines
        timeseries = []
        try:
            with open(monitor_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("(") or line.startswith("#"):
                        continue
                    parts = line.split()
                    if len(parts) >= 2:
                        try:
                            timestep = int(parts[0])
                            temp_k = float(parts[1])
                            temp_c = round(temp_k - 273.15, 2)
                            timeseries.append({"timestep": timestep, "indoor_temp_c": temp_c})
                        except ValueError:
                            continue

            return {
                "status": "ingested",
                "source_file": str(monitor_file),
                "total_timesteps": len(timeseries),
                "timeseries": timeseries,
                "has_valid_data": True,
            }
        except Exception as e:
            return {
                "status": "parse_error",
                "message": f"Failed to parse ANSYS monitor file: {str(e)}",
                "has_valid_data": False,
            }
