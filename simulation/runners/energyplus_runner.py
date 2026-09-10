"""EnergyPlus runner handling binary detection, isolated execution, and logging."""

import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from dataclasses import dataclass


@dataclass
class SimulationExecutionOutput:
    """Execution output and log references from an isolated EnergyPlus run."""

    exit_code: int
    duration_seconds: float
    command_executed: str
    engine_name: str
    engine_version: str
    work_dir: str
    idf_path: str
    epw_path: str
    stdout: str
    stderr: str
    stdout_log_path: str
    stderr_log_path: str
    err_file_path: str
    csv_file_path: str

    @property
    def success(self) -> bool:
        """Return True if simulation exited with returncode 0."""
        return self.exit_code == 0

    @property
    def error_message(self) -> str:
        """Return stderr or exit code diagnostic."""
        if self.success:
            return ""
        return self.stderr or f"Process terminated with exit code {self.exit_code}"


from backend.core.binary_allowlist import BinaryAllowlist, SecurityException


class EnergyPlusRunner:
    """Detects EnergyPlus binary, validates version, and executes simulations in isolated directories."""

    def __init__(self, custom_executable_path: Optional[str] = None):
        self.executable_path, self.detected_version = self._resolve_binary(custom_executable_path)

    @property
    def is_available(self) -> bool:
        """Return True if a valid EnergyPlus binary was resolved on host."""
        return self.executable_path is not None and Path(self.executable_path).is_file()

    @classmethod
    def _resolve_binary(cls, custom_path: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
        """Locate EnergyPlus executable across environment variables and standard installation paths."""
        candidates = []

        if custom_path:
            # Strictly validate custom candidate path against security allowlist
            validated_custom = BinaryAllowlist.validate_executable(custom_path)
            candidates.append(validated_custom)

        env_exe = os.environ.get("ENERGYPLUS_EXE")
        if env_exe and Path(env_exe).is_file():
            if BinaryAllowlist.is_binary_name_allowed(env_exe) and BinaryAllowlist.is_path_in_approved_directory(env_exe):
                candidates.append(env_exe)

        user_profile = os.environ.get("USERPROFILE", "")
        if user_profile:
            # Check user profile installation
            p1 = Path(user_profile) / "EnergyPlusV24-1-0" / "energyplus.exe"
            p2 = Path(user_profile) / "EnergyPlusV24-1-0" / "EnergyPlus-24.1.0-9d7789a3ac-Windows-x86_64" / "energyplus.exe"
            if p1.is_file() and BinaryAllowlist.is_binary_name_allowed(str(p1)):
                candidates.append(str(p1))
            if p2.is_file() and BinaryAllowlist.is_binary_name_allowed(str(p2)):
                candidates.append(str(p2))

        # Standard Windows paths
        std_paths = [
            r"C:\EnergyPlusV24-1-0\energyplus.exe",
            r"C:\EnergyPlusV23-2-0\energyplus.exe",
            r"C:\Program Files\EnergyPlusV24-1-0\energyplus.exe",
        ]
        for sp in std_paths:
            if Path(sp).is_file() and BinaryAllowlist.is_binary_name_allowed(sp):
                candidates.append(sp)

        # In PATH
        which_path = shutil.which("energyplus")
        if which_path and BinaryAllowlist.is_binary_name_allowed(which_path):
            candidates.append(which_path)

        for exe in candidates:
            version = cls._probe_version(exe)
            if version:
                return exe, version

        return None, None

    @staticmethod
    def _probe_version(exe_path: str) -> Optional[str]:
        """Execute energyplus -v to determine exact version with security probe."""
        return BinaryAllowlist.probe_energyplus_version(exe_path)


    def run(
        self,
        idf_path: str,
        epw_path: str,
        work_dir: str,
        timeout_seconds: int = 600,
    ) -> SimulationExecutionOutput:
        """Execute EnergyPlus in isolated working directory."""
        if not self.executable_path:
            raise FileNotFoundError("EnergyPlus executable not detected on host system.")

        work_path = Path(work_dir)
        work_path.mkdir(parents=True, exist_ok=True)

        idf_resolved = Path(idf_path).resolve()
        epw_resolved = Path(epw_path).resolve()

        if not idf_resolved.exists():
            raise FileNotFoundError(f"IDF input file not found: {idf_path}")
        if not epw_resolved.exists():
            raise FileNotFoundError(f"EPW weather file not found: {epw_path}")

        # Command arguments: energyplus -w weather.epw -d output_dir -r input.idf
        cmd = [
            self.executable_path,
            "-w", str(epw_resolved),
            "-d", str(work_path),
            "-r", str(idf_resolved),
        ]
        cmd_str = " ".join(f'"{c}"' if " " in c else c for c in cmd)

        start_time = time.time()
        try:
            process = subprocess.run(
                cmd,
                cwd=str(work_path),
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
            duration = time.time() - start_time
            stdout = process.stdout
            stderr = process.stderr
            exit_code = process.returncode
        except subprocess.TimeoutExpired as e:
            duration = time.time() - start_time
            stdout = e.stdout.decode() if isinstance(e.stdout, bytes) else (e.stdout or "")
            stderr = f"Simulation timed out after {timeout_seconds} seconds."
            exit_code = -99

        # Preserve logs to disk
        stdout_log = work_path / "stdout.log"
        stderr_log = work_path / "stderr.log"
        with open(stdout_log, "w", encoding="utf-8", errors="replace") as f:
            f.write(stdout)
        with open(stderr_log, "w", encoding="utf-8", errors="replace") as f:
            f.write(stderr)

        err_file = work_path / "eplusout.err"
        csv_file = work_path / "eplusout.csv"

        return SimulationExecutionOutput(
            exit_code=exit_code,
            duration_seconds=round(duration, 3),
            command_executed=cmd_str,
            engine_name="EnergyPlus",
            engine_version=self.detected_version or "24.1.0",
            work_dir=str(work_path.resolve()),
            idf_path=str(idf_resolved),
            epw_path=str(epw_resolved),
            stdout=stdout,
            stderr=stderr,
            stdout_log_path=str(stdout_log.resolve()),
            stderr_log_path=str(stderr_log.resolve()),
            err_file_path=str(err_file.resolve()),
            csv_file_path=str(csv_file.resolve()),
        )

    def run_simulation(
        self,
        idf_path: Any,
        weather_path: Any,
        output_dir: Any,
        run_period_days: Optional[int] = None,
        timeout_seconds: int = 600,
    ) -> SimulationExecutionOutput:
        """Run simulation convenience method matching standard test interface."""
        return self.run(
            idf_path=str(idf_path),
            epw_path=str(weather_path),
            work_dir=str(output_dir),
            timeout_seconds=timeout_seconds,
        )
