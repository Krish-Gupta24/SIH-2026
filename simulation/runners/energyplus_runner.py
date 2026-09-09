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


class EnergyPlusRunner:
    """Detects EnergyPlus binary, validates version, and executes simulations in isolated directories."""

    def __init__(self, custom_executable_path: Optional[str] = None):
        self.executable_path, self.detected_version = self._resolve_binary(custom_executable_path)

    @classmethod
    def _resolve_binary(cls, custom_path: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
        """Locate EnergyPlus executable across environment variables and standard installation paths."""
        candidates = []

        if custom_path and Path(custom_path).is_file():
            candidates.append(custom_path)

        env_exe = os.environ.get("ENERGYPLUS_EXE")
        if env_exe and Path(env_exe).is_file():
            candidates.append(env_exe)

        user_profile = os.environ.get("USERPROFILE", "")
        if user_profile:
            # Check user profile installation
            p1 = Path(user_profile) / "EnergyPlusV24-1-0" / "energyplus.exe"
            p2 = Path(user_profile) / "EnergyPlusV24-1-0" / "EnergyPlus-24.1.0-9d7789a3ac-Windows-x86_64" / "energyplus.exe"
            if p1.is_file():
                candidates.append(str(p1))
            if p2.is_file():
                candidates.append(str(p2))

        # Standard Windows paths
        std_paths = [
            r"C:\EnergyPlusV24-1-0\energyplus.exe",
            r"C:\EnergyPlusV23-2-0\energyplus.exe",
            r"C:\Program Files\EnergyPlusV24-1-0\energyplus.exe",
        ]
        for sp in std_paths:
            if Path(sp).is_file():
                candidates.append(sp)

        # In PATH
        which_path = shutil.which("energyplus")
        if which_path:
            candidates.append(which_path)

        for exe in candidates:
            version = cls._probe_version(exe)
            if version:
                return exe, version

        return None, None

    @staticmethod
    def _probe_version(exe_path: str) -> Optional[str]:
        """Execute energyplus -v to determine exact version."""
        try:
            res = subprocess.run([exe_path, "-v"], capture_output=True, text=True, timeout=10)
            output = res.stdout.strip() or res.stderr.strip()
            # Output looks like: "EnergyPlus, Version 24.1.0-9d7789a3ac, YMD=..."
            for part in output.split(","):
                if "Version" in part:
                    return part.replace("Version", "").strip()
            return output if output else "Unknown"
        except Exception:
            return None

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
