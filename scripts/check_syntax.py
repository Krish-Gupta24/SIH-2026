"""Validates that all Python files in the repository have valid syntax."""

import ast
import glob
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

patterns = [
    str(ROOT / "backend" / "**" / "*.py"),
    str(ROOT / "database" / "**" / "*.py"),
    str(ROOT / "tests" / "**" / "*.py"),
    str(ROOT / "scripts" / "**" / "*.py"),
]

all_files = []
for p in patterns:
    all_files.extend(glob.glob(p, recursive=True))

errors = []
for f in all_files:
    try:
        with open(f, "r", encoding="utf-8") as s:
            ast.parse(s.read(), filename=f)
    except Exception as e:
        errors.append((f, str(e)))

if errors:
    print(f"FAILED: {len(errors)} syntax error(s):")
    for f, err in errors:
        print(f"  {f}: {err}")
    exit(1)
else:
    print(f"SUCCESS: All {len(all_files)} Python files parsed cleanly with ZERO syntax errors.")
