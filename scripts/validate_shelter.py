"""CLI utility to validate a ShelterModel JSON file against canonical schema and physical constraints."""

import argparse
import json
import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.schemas.shelter import ShelterModelSchema


def main():
    parser = argparse.ArgumentParser(description="Validate a ShelterModel JSON document.")
    parser.add_argument("file_path", type=str, help="Path to shelter JSON file")
    args = parser.parse_args()

    target = Path(args.file_path)
    if not target.exists():
        print(f"Error: File '{args.file_path}' does not exist.", file=sys.stderr)
        sys.exit(1)

    with open(target, "r", encoding="utf-8") as f:
        data = json.load(f)

    try:
        model = ShelterModelSchema(**data)
        print(f"Validation SUCCESS: '{model.name}' (ID: {model.id}, Version: {model.version}) is valid.")
        print(f"  Location: {model.location.region} ({model.location.latitude}N, {model.location.longitude}E, {model.location.elevation}m)")
        print(f"  Geometry: {model.geometry.length}m x {model.geometry.width}m x {model.geometry.height}m")
    except Exception as e:
        print(f"Validation FAILED for '{args.file_path}':\n{e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
