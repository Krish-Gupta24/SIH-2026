"""
Path traversal protection and secure file handling utilities.
Guarantees that file operations remain strictly confined within designated directories.
"""

import os
import re
from pathlib import Path
from typing import Union, Optional

from backend.core.binary_allowlist import SecurityException


# Approved base storage directories
APPROVED_STORAGE_ROOTS = [
    Path("storage").resolve(),
    Path("simulation/weather").resolve(),
    Path("backend/weather").resolve(),
]


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a user-provided filename:
    - Strips directory paths / separators
    - Removes null bytes and control characters
    - Restricts to alphanumeric, dots, underscores, hyphens
    """
    if not filename:
        return "unnamed_file"

    # Take only the basename
    clean = Path(filename).name

    # Remove null bytes and non-printable characters
    clean = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", clean)

    # Allow only safe characters
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", clean)

    # Prevent hidden files or relative path tricks
    clean = clean.lstrip(".")

    return clean or "unnamed_file"


def resolve_safe_path(
    user_path: Union[str, Path],
    base_dir: Union[str, Path],
    must_exist: bool = False,
) -> Path:
    """
    Safely resolve a target path and verify that it strictly resides within base_dir.
    Prevents path traversal attacks (e.g. '../../windows/system32' or '/etc/passwd').
    Raises SecurityException if the resolved path escapes the base directory.
    """
    base_resolved = Path(base_dir).resolve()
    target_resolved = (base_resolved / Path(user_path)).resolve() if not Path(user_path).is_absolute() else Path(user_path).resolve()

    # Verify containment within base directory
    try:
        target_resolved.relative_to(base_resolved)
    except ValueError:
        raise SecurityException(
            f"SECURITY VIOLATION: Path traversal detected. "
            f"Target path '{user_path}' escapes authorized base directory '{base_resolved}'."
        )

    if must_exist and not target_resolved.exists():
        raise FileNotFoundError(f"Requested file does not exist: {target_resolved}")

    return target_resolved


def validate_weather_file(
    file_path: Union[str, Path],
    max_size_bytes: int = 25 * 1024 * 1024,  # 25 MB max
) -> Path:
    """
    Validate an EPW weather dataset file:
    - Must have .epw extension
    - Must exist and not exceed max_size_bytes
    - Magic header check: first line must start with 'LOCATION,'
    """
    p = Path(file_path).resolve()

    # 1. Extension check
    if p.suffix.lower() != ".epw":
        raise SecurityException(
            f"SECURITY VIOLATION: Weather file must have an '.epw' extension, received: '{p.suffix}'"
        )

    if not p.is_file():
        raise FileNotFoundError(f"Weather file not found: {p}")

    # 2. File size quota check
    size = p.stat().st_size
    if size > max_size_bytes:
        raise SecurityException(
            f"SECURITY VIOLATION: Weather file size ({size} bytes) exceeds maximum allowable limit ({max_size_bytes} bytes)."
        )

    if size == 0:
        raise ValueError("Weather file is empty (0 bytes).")

    # 3. Magic header check (EPW files strictly start with 'LOCATION,')
    try:
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            first_line = f.readline().strip()
            if not first_line.upper().startswith("LOCATION,"):
                raise SecurityException(
                    "SECURITY VIOLATION: Invalid EPW weather file format. "
                    "EPW files must start with a valid 'LOCATION,' header line."
                )
    except Exception as exc:
        if isinstance(exc, SecurityException):
            raise
        raise SecurityException(f"Failed to read and validate weather file header: {str(exc)}")

    return p
