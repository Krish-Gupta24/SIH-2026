"""
Security controls for simulation binary allowlisting and command execution policy.
Strictly prevents execution of arbitrary operating-system commands or untrusted binaries.
"""

import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Tuple, Set, Dict, Any


class SecurityException(Exception):
    """Raised when an unauthorized binary, command injection, or path violation is detected."""
    pass


# Strict set of permissible binary basenames (case-insensitive on Windows)
APPROVED_BINARY_NAMES: Set[str] = {
    "energyplus.exe",
    "energyplus",
    "fluent.exe",
    "fluent",
    "openstudio.exe",
    "openstudio",
}

# Standard approved system installation prefixes/directories
APPROVED_INSTALLATION_PREFIXES = [
    r"C:\EnergyPlus",
    r"C:\Program Files\EnergyPlus",
    r"C:\openstudio",
    r"C:\Program Files\ANSYS Inc",
    r"C:\Program Files\ANSYS",
    "/usr/local/EnergyPlus",
    "/usr/local/bin",
    "/usr/local",
    "/usr/bin",
    "/opt/EnergyPlus",
    "/opt",
    "/opt/ansys_inc",
    "/ansys_inc",
]


class BinaryAllowlist:
    """Verifies that simulation executables are approved, genuine, and located in trusted paths."""

    @classmethod
    def is_binary_name_allowed(cls, binary_path: str) -> bool:
        """Check whether the filename belongs to the strict approved binary set."""
        basename = Path(binary_path).name.lower()
        return basename in APPROVED_BINARY_NAMES

    @classmethod
    def is_path_in_approved_directory(cls, binary_path: str) -> bool:
        """
        Verify that the executable path resides within an approved installation directory,
        or within the active user's EnergyPlus directory.
        """
        resolved = Path(binary_path).resolve()
        resolved_str = str(resolved).lower()

        # Check standard installation prefixes
        for prefix in APPROVED_INSTALLATION_PREFIXES:
            if resolved_str.startswith(prefix.lower()):
                return True

        # Check USERPROFILE path if on Windows
        user_profile = os.environ.get("USERPROFILE", "")
        if user_profile:
            user_energyplus = str(Path(user_profile) / "EnergyPlus").lower()
            if resolved_str.startswith(user_energyplus):
                return True

        # Check PATH resolution if it points to an approved binary name
        which_path = shutil.which(resolved.name)
        if which_path and Path(which_path).resolve() == resolved:
            return True

        return False

    @classmethod
    def validate_executable(cls, candidate_path: Optional[str]) -> str:
        """
        Strictly validate an executable path before invocation.
        Raises SecurityException if the executable is not allowlisted or resides outside approved paths.
        """
        if not candidate_path:
            raise SecurityException("Simulation executable path cannot be null or empty.")

        p = Path(candidate_path).resolve()

        # 1. Enforce approved binary filename first
        if not cls.is_binary_name_allowed(str(p)):
            raise SecurityException(
                f"SECURITY VIOLATION: Execution of binary '{p.name}' is strictly prohibited. "
                f"Only approved simulation binaries {sorted(list(APPROVED_BINARY_NAMES))} are permitted."
            )

        if not p.is_file():
            raise FileNotFoundError(f"Simulation binary does not exist: {candidate_path}")

        # 2. Enforce approved directory location

        if not cls.is_path_in_approved_directory(str(p)):
            raise SecurityException(
                f"SECURITY VIOLATION: Binary '{p}' resides outside approved simulation directories. "
                f"Execution denied to prevent arbitrary host command execution."
            )

        return str(p)

    @classmethod
    def probe_energyplus_version(cls, exe_path: str) -> Optional[str]:
        """
        Execute energyplus -v with strict timeouts and shell=False.
        Confirms genuine EnergyPlus signature to prevent binary spoofing.
        """
        validated_exe = cls.validate_executable(exe_path)
        try:
            res = subprocess.run(
                [validated_exe, "-v"],
                capture_output=True,
                text=True,
                timeout=10,
                shell=False,  # Explicitly disabled
            )
            output = res.stdout.strip() or res.stderr.strip()
            if "EnergyPlus" not in output:
                return None
            for part in output.split(","):
                if "Version" in part:
                    return part.replace("Version", "").strip()
            return output if output else "Unknown"
        except (subprocess.TimeoutExpired, Exception):
            return None
