"""Opening and Window Geometry Validator.

Validates all architectural openings (windows and doors) against:
- Wall boundaries and dimensional constraints
- Cardinal wall hosts (north, south, east, west)
- Position offsets and sill heights
- Overlapping openings on the same wall surface (2D AABB intersection)
- Impossible geometries (<= 0, NaN, Inf)
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Any, Tuple, Optional


@dataclass
class ValidationResult:
    """Standardized validation outcome container."""
    is_valid: bool
    errors: List[str]

    def __bool__(self) -> bool:
        return self.is_valid


class OpeningValidator:
    """Rigorous validator for shelter window and door openings."""

    CARDINAL_WALLS = ("north", "south", "east", "west")

    @classmethod
    def validate(cls, shelter_model: Dict[str, Any]) -> ValidationResult:
        """Validate all openings in a canonical shelter model."""
        openings = shelter_model.get("openings", {})
        windows = openings.get("windows", [])
        doors = openings.get("doors", [])
        geometry = shelter_model.get("geometry", {})
        is_valid, errors = cls.validate_openings(windows, doors, geometry)
        return ValidationResult(is_valid=is_valid, errors=errors)


    @classmethod
    def get_wall_dimensions(cls, wall: str, geometry: Dict[str, Any]) -> Tuple[float, float]:
        """Return (length, height) for the specified cardinal wall."""
        norm_wall = str(wall).strip().lower().replace("wall_", "").replace("_wall", "")
        length = float(geometry.get("length") if geometry.get("length") is not None else geometry.get("lengthM", 0.0))
        width = float(geometry.get("width") if geometry.get("width") is not None else geometry.get("widthM", 0.0))
        height = float(geometry.get("height") if geometry.get("height") is not None else geometry.get("wallHeightM", 0.0))

        if norm_wall in ("north", "south"):
            return length, height
        elif norm_wall in ("east", "west"):
            return width, height
        else:
            raise ValueError(f"Invalid cardinal wall '{wall}'. Must be one of: {cls.CARDINAL_WALLS}")

    @classmethod
    def validate_window(
        cls,
        window: Dict[str, Any],
        geometry: Dict[str, Any],
        index: int = 0,
    ) -> List[str]:
        """Validate a single window opening against wall geometry."""
        errors: List[str] = []
        win_id = str(window.get("id") or f"window_{index + 1}")
        raw_wall = str(window.get("wall") or window.get("wall_id") or "south").strip().lower()
        wall = raw_wall.replace("wall_", "").replace("_wall", "")

        if wall not in cls.CARDINAL_WALLS:
            errors.append(f"Window '{win_id}': Invalid wall '{raw_wall}'. Must be one of {cls.CARDINAL_WALLS}.")
            return errors

        try:
            wall_len, wall_h = cls.get_wall_dimensions(wall, geometry)
        except ValueError as e:
            errors.append(f"Window '{win_id}': {str(e)}")
            return errors

        # Parse and validate numerical values
        try:
            w = float(window.get("width", 0.0))
            h = float(window.get("height", 0.0))
            pos_x = float(
                window.get("position_x")
                if window.get("position_x") is not None
                else window.get("positionX", 0.0)
            )
            sill = float(
                window.get("sill_height")
                if window.get("sill_height") is not None
                else window.get("sillHeight", 0.0)
            )
        except (ValueError, TypeError) as e:
            errors.append(f"Window '{win_id}': Non-numeric geometry values encountered: {e}")
            return errors

        # Impossible geometry / NaN / Inf checks
        for val, name in [(w, "width"), (h, "height"), (pos_x, "position_x"), (sill, "sill_height")]:
            if math.isnan(val) or math.isinf(val):
                errors.append(f"Window '{win_id}': {name} has impossible non-finite value ({val}).")

        if w <= 0.0:
            errors.append(f"Window '{win_id}': Width must be > 0 m (received {w}).")
        if h <= 0.0:
            errors.append(f"Window '{win_id}': Height must be > 0 m (received {h}).")
        if pos_x < 0.0:
            errors.append(f"Window '{win_id}': Position X cannot be negative (received {pos_x}).")
        if sill < 0.0:
            errors.append(f"Window '{win_id}': Sill height cannot be negative (received {sill}).")

        # Dimensional comparison against host wall
        if wall_len > 0.0 and w > wall_len:
            errors.append(
                f"Window '{win_id}': Width ({w:.2f}m) exceeds {wall} wall length ({wall_len:.2f}m)."
            )
        if wall_h > 0.0 and h > wall_h:
            errors.append(
                f"Window '{win_id}': Height ({h:.2f}m) exceeds {wall} wall height ({wall_h:.2f}m)."
            )

        # Boundary checks
        if wall_len > 0.0 and pos_x >= wall_len:
            errors.append(
                f"Window '{win_id}': Position X ({pos_x:.2f}m) is outside {wall} wall (length: {wall_len:.2f}m)."
            )
        elif wall_len > 0.0 and (pos_x + w) > wall_len:
            errors.append(
                f"Window '{win_id}': Right edge ({pos_x + w:.2f}m) extends outside {wall} wall boundary ({wall_len:.2f}m)."
            )

        if wall_h > 0.0 and (sill + h) > wall_h:
            errors.append(
                f"Window '{win_id}': Top edge (sill {sill:.2f}m + height {h:.2f}m = {sill + h:.2f}m) "
                f"exceeds {wall} wall height ({wall_h:.2f}m)."
            )

        return errors

    @classmethod
    def validate_door(
        cls,
        door: Dict[str, Any],
        geometry: Dict[str, Any],
        index: int = 0,
    ) -> List[str]:
        """Validate a single door opening against wall geometry."""
        errors: List[str] = []
        door_id = str(door.get("id") or f"door_{index + 1}")
        raw_wall = str(door.get("wall") or door.get("wall_id") or "north").strip().lower()
        wall = raw_wall.replace("wall_", "").replace("_wall", "")

        if wall not in cls.CARDINAL_WALLS:
            errors.append(f"Door '{door_id}': Invalid wall '{raw_wall}'. Must be one of {cls.CARDINAL_WALLS}.")
            return errors

        try:
            wall_len, wall_h = cls.get_wall_dimensions(wall, geometry)
        except ValueError as e:
            errors.append(f"Door '{door_id}': {str(e)}")
            return errors

        try:
            w = float(door.get("width", 0.0))
            h = float(door.get("height", 0.0))
            pos_x = float(
                door.get("position_x")
                if door.get("position_x") is not None
                else door.get("positionX", 0.0)
            )
            sill = float(
                door.get("sill_height")
                if door.get("sill_height") is not None
                else door.get("sillHeight", 0.0)
            )
        except (ValueError, TypeError) as e:
            errors.append(f"Door '{door_id}': Non-numeric geometry values encountered: {e}")
            return errors

        if math.isnan(w) or math.isinf(w) or math.isnan(h) or math.isinf(h) or \
           math.isnan(pos_x) or math.isinf(pos_x) or math.isnan(sill) or math.isinf(sill):
            errors.append(f"Door '{door_id}': Geometry values cannot be NaN or Inf.")
            return errors

        if w <= 0.0:
            errors.append(f"Door '{door_id}': Width must be > 0 m (received {w}).")
        if h <= 0.0:
            errors.append(f"Door '{door_id}': Height must be > 0 m (received {h}).")
        if pos_x < 0.0:
            errors.append(f"Door '{door_id}': Position X cannot be negative (received {pos_x}).")
        if sill < 0.0:
            errors.append(f"Door '{door_id}': Sill height cannot be negative (received {sill}).")

        if wall_len > 0.0 and w > wall_len:
            errors.append(
                f"Door '{door_id}': Width ({w:.2f}m) exceeds {wall} wall length ({wall_len:.2f}m)."
            )
        if wall_len > 0.0 and pos_x >= wall_len:
            errors.append(
                f"Door '{door_id}': Position X ({pos_x:.2f}m) begins outside {wall} wall ({wall_len:.2f}m)."
            )
        if wall_len > 0.0 and (pos_x + w) > wall_len:
            errors.append(
                f"Door '{door_id}': Right edge ({pos_x + w:.2f}m) extends outside {wall} wall boundary ({wall_len:.2f}m)."
            )
        if wall_h > 0.0 and (sill + h) > wall_h:
            errors.append(
                f"Door '{door_id}': Top edge (sill {sill:.2f}m + height {h:.2f}m = {sill + h:.2f}m) "
                f"exceeds {wall} wall height ({wall_h:.2f}m)."
            )

        return errors

    @classmethod
    def check_overlapping_openings(
        cls,
        windows: List[Dict[str, Any]],
        doors: List[Dict[str, Any]],
    ) -> List[str]:
        """Check for 2D bounding box collisions between all openings on each wall."""
        errors: List[str] = []

        # Group openings by cardinal wall
        wall_openings: Dict[str, List[Dict[str, Any]]] = {
            "north": [], "south": [], "east": [], "west": []
        }

        for idx, win in enumerate(windows):
            raw_wall = str(win.get("wall") or win.get("wall_id") or "south").strip().lower()
            wall = raw_wall.replace("wall_", "").replace("_wall", "")
            if wall in wall_openings:
                wall_openings[wall].append({
                    "id": str(win.get("id") or f"window_{idx + 1}"),
                    "type": "Window",
                    "x0": float(win.get("position_x") if win.get("position_x") is not None else win.get("positionX", 0.0)),
                    "x1": float(win.get("position_x") if win.get("position_x") is not None else win.get("positionX", 0.0)) + float(win.get("width", 0.0)),
                    "z0": float(win.get("sill_height") if win.get("sill_height") is not None else win.get("sillHeight", 0.0)),
                    "z1": float(win.get("sill_height") if win.get("sill_height") is not None else win.get("sillHeight", 0.0)) + float(win.get("height", 0.0)),
                })

        for idx, door in enumerate(doors):
            raw_wall = str(door.get("wall") or door.get("wall_id") or "north").strip().lower()
            wall = raw_wall.replace("wall_", "").replace("_wall", "")
            if wall in wall_openings:
                door_sill = float(door.get("sill_height") if door.get("sill_height") is not None else door.get("sillHeight", 0.0))
                wall_openings[wall].append({
                    "id": str(door.get("id") or f"door_{idx + 1}"),
                    "type": "Door",
                    "x0": float(door.get("position_x") if door.get("position_x") is not None else door.get("positionX", 0.0)),
                    "x1": float(door.get("position_x") if door.get("position_x") is not None else door.get("positionX", 0.0)) + float(door.get("width", 0.0)),
                    "z0": door_sill,
                    "z1": door_sill + float(door.get("height", 0.0)),
                })

        # Check pairwise overlap on each wall
        TOL = 1e-4  # Numerical tolerance to permit exact edge alignment/abutting
        for wall, openings in wall_openings.items():
            n = len(openings)
            for i in range(n):
                for j in range(i + 1, n):
                    op_a = openings[i]
                    op_b = openings[j]

                    x_overlap = (op_a["x0"] < op_b["x1"] - TOL) and (op_a["x1"] > op_b["x0"] + TOL)
                    z_overlap = (op_a["z0"] < op_b["z1"] - TOL) and (op_a["z1"] > op_b["z0"] + TOL)

                    if x_overlap and z_overlap:
                        errors.append(
                            f"Overlapping openings detected on {wall} wall: "
                            f"{op_a['type']} '{op_a['id']}' [X: {op_a['x0']:.2f}-{op_a['x1']:.2f}m, Z: {op_a['z0']:.2f}-{op_a['z1']:.2f}m] "
                            f"collides with {op_b['type']} '{op_b['id']}' [X: {op_b['x0']:.2f}-{op_b['x1']:.2f}m, Z: {op_b['z0']:.2f}-{op_b['z1']:.2f}m]."
                        )

        return errors

    @classmethod
    def validate_openings(
        cls,
        windows: List[Dict[str, Any]],
        doors: List[Dict[str, Any]],
        geometry: Dict[str, Any],
    ) -> Tuple[bool, List[str]]:
        """Perform comprehensive validation of all windows and doors for a shelter."""
        all_errors: List[str] = []

        for idx, win in enumerate(windows):
            all_errors.extend(cls.validate_window(win, geometry, idx))

        for idx, door in enumerate(doors):
            all_errors.extend(cls.validate_door(door, geometry, idx))

        if not all_errors:
            # Check collisions only if individual openings are well-formed
            all_errors.extend(cls.check_overlapping_openings(windows, doors))

        return len(all_errors) == 0, all_errors
