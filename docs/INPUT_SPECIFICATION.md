# Input Specification & Validation Rules

**SIH 2026 — Problem Statement 26051**  
**Complete Validation Contract for the ShelterModel**

**Document Version:** 0.1  
**Date:** 2026-09-09  

---

## 1. Validation Layers

Validation happens at **three layers**, each catching different classes of errors:

| Layer | Where | What It Catches | When It Runs |
|---|---|---|---|
| **L1: Schema** | Pydantic model (backend), Zod schema (frontend) | Type errors, missing required fields, enum violations, basic range checks | Every API request, every form change |
| **L2: Domain** | Service layer (Python) | Cross-field constraints, physical plausibility, geometric consistency | On design save, before simulation submit |
| **L3: Engine** | IDF validator + EnergyPlus pre-check | EnergyPlus-specific errors (surface closure, boundary conditions, IDD compliance) | Before simulation execution |

---

## 2. L1: Schema Validation Rules

These are enforced by Pydantic (backend) and Zod (frontend) on every data exchange.

### 2.1 Field-Level Constraints

#### Location

| Field | Type | Required | Min | Max | Step | Other |
|---|---|---|---|---|---|---|
| `latitude` | float | ✅ | −90.0 | 90.0 | — | — |
| `longitude` | float | ✅ | −180.0 | 180.0 | — | — |
| `elevation` | float | ✅ | −500.0 | 9000.0 | — | — |
| `timezone_utc_offset` | float | ✅ | −12.0 | 14.0 | 0.25 | Must be multiple of 0.25 |
| `city` | string | ❌ | — | 100 chars | — | — |
| `region` | string | ❌ | — | 100 chars | — | — |
| `country` | string | ❌ | — | 2 chars | — | ISO 3166-1 alpha-2 |
| `climate_zone` | string | ❌ | — | 3 chars | — | Pattern: `[1-8][A-C]?` |
| `weather_source.type` | enum | ✅ | — | — | — | WeatherSourceType |
| `weather_source.file_id` | UUID | conditional | — | — | — | Required if type ∈ {epw_file, csv_upload} |
| `weather_source.is_synthetic` | bool | ✅ | — | — | — | Default: false |

#### Geometry

| Field | Type | Required | Min | Max | Other |
|---|---|---|---|---|---|
| `shape` | enum | ✅ | — | — | ShapeType |
| `dimensions.length` | float | ✅ | 1.0 | 50.0 | meters |
| `dimensions.width` | float | ✅ | 1.0 | 50.0 | meters |
| `dimensions.height` | float | ✅ | 1.5 | 10.0 | meters |
| `dimensions.length_wing` | float | conditional | 1.0 | 50.0 | Required if shape=l_shape |
| `dimensions.width_wing` | float | conditional | 1.0 | 50.0 | Required if shape=l_shape |
| `dimensions.height_wing` | float | ❌ | 1.5 | 10.0 | Default = height |
| `orientation_deg` | float | ✅ | 0.0 | 360.0 | Exclusive upper bound (360.0 wraps to 0.0) |
| `roof.type` | enum | ✅ | — | — | RoofType |
| `roof.slope_deg` | float | conditional | 0.0 | 60.0 | Required and > 0 if roof.type ≠ flat |
| `roof.overhang_*` | float | ❌ | 0.0 | 3.0 | Default 0.0, per face |
| `floor_elevation` | float | ❌ | 0.0 | 2.0 | Default 0.0 |

#### Material

| Field | Type | Required | Min | Max | Other |
|---|---|---|---|---|---|
| `name` | string | ✅ | 1 char | 255 chars | Non-empty after trim |
| `category` | enum | ✅ | — | — | MaterialCategory |
| `conductivity` | float | ✅ | 0.001 | 500.0 | W/(m·K) |
| `density` | float | ✅ | 1.0 | 25000.0 | kg/m³ |
| `specific_heat` | float | ✅ | 100.0 | 5000.0 | J/(kg·K) |
| `roughness` | enum | ✅ | — | — | Default: medium_rough |
| `thermal_absorptance` | float | ❌ | 0.0 | 1.0 | Default 0.9 |
| `solar_absorptance` | float | ❌ | 0.0 | 1.0 | Default 0.7 |
| `visible_absorptance` | float | ❌ | 0.0 | 1.0 | Default 0.7 |
| `source` | enum | ✅ | — | — | MaterialSource |

#### Construction

| Field | Type | Required | Min | Max | Other |
|---|---|---|---|---|---|
| `name` | string | ✅ | 1 char | 255 chars | — |
| `layers` | array | ✅ | 1 item | 10 items | — |
| `layers[].material_id` | UUID | ✅ | — | — | Must reference existing material |
| `layers[].thickness` | float | ✅ | 0.001 | 2.0 | meters |

#### Window

| Field | Type | Required | Min | Max | Other |
|---|---|---|---|---|---|
| `id` | UUID | ✅ | — | — | Client-generated |
| `wall_face` | enum | ✅ | — | — | Must be valid for shape |
| `position.offset_x` | float | ✅ | 0.0 | — | Upper bound = wall_length − width |
| `position.sill_height` | float | ✅ | 0.0 | — | Upper bound = wall_height − height |
| `width` | float | ✅ | 0.2 | 10.0 | meters |
| `height` | float | ✅ | 0.2 | 5.0 | meters |
| `glazing.type` | enum | ✅ | — | — | GlazingType |
| `glazing.u_value` | float | ✅ | 0.5 | 7.0 | W/(m²·K) |
| `glazing.shgc` | float | ✅ | 0.0 | 1.0 | — |
| `glazing.visible_transmittance` | float | ✅ | 0.0 | 1.0 | — |

#### Door

| Field | Type | Required | Min | Max | Other |
|---|---|---|---|---|---|
| `id` | UUID | ✅ | — | — | — |
| `wall_face` | enum | ✅ | — | — | — |
| `position.offset_x` | float | ✅ | 0.0 | — | — |
| `position.offset_z` | float | ❌ | 0.0 | — | Default 0.0 |
| `width` | float | ✅ | 0.5 | 3.0 | meters |
| `height` | float | ✅ | 1.5 | 3.0 | meters |
| `construction.type` | enum | ✅ | — | — | DoorType |
| `construction.u_value` | float | ✅ | 0.5 | 7.0 | W/(m²·K) |

#### Ventilation

| Field | Type | Required | Min | Max | Other |
|---|---|---|---|---|---|
| `infiltration.method` | enum | ✅ | — | — | Default: ach |
| `infiltration.rate_ach` | float | conditional | 0.0 | 10.0 | Required if method=ach |
| `infiltration.rate_m3s` | float | conditional | 0.0 | 10.0 | Required if method=flow_rate |
| `infiltration.rate_m3s_per_m2` | float | conditional | 0.0 | 0.01 | Required if method=flow_per_area |
| `infiltration.construction_quality` | enum | conditional | — | — | Required if method=quality_based |

#### SimulationSettings

| Field | Type | Required | Min | Max | Other |
|---|---|---|---|---|---|
| `engine.type` | enum | ✅ | — | — | Default: energyplus |
| `weather.file_id` | UUID | ✅ | — | — | Must reference existing file |
| `run_period.start_month` | int | ✅ | 1 | 12 | — |
| `run_period.start_day` | int | ✅ | 1 | 31 | Must be valid for month |
| `run_period.end_month` | int | ✅ | 1 | 12 | — |
| `run_period.end_day` | int | ✅ | 1 | 31 | Must be valid for month |
| `timestep` | int | ✅ | — | — | Must be ∈ {1,2,3,4,5,6,10,12,15,20,30,60} |

---

## 3. L2: Domain Validation Rules

These are enforced by the service layer. They require cross-field reasoning.

### 3.1 Geometric Consistency

| Rule ID | Rule | Error Code |
|---|---|---|
| GEO-001 | Floor area (`length × width`) ≥ 4.0 m² | `floor_area_too_small` |
| GEO-002 | Floor area ≤ 500.0 m² | `floor_area_too_large` |
| GEO-003 | For `l_shape`: `length_wing < length` | `wing_exceeds_main` |
| GEO-004 | For `l_shape`: `width_wing < width` | `wing_exceeds_main` |
| GEO-005 | Aspect ratio `max(length, width) / min(length, width)` ≤ 10.0 | `extreme_aspect_ratio` |
| GEO-006 | Zone volume (`length × width × height`) ≥ 6.0 m³ | `volume_too_small` |
| GEO-007 | If `roof.type ≠ flat`: `roof.slope_deg` > 0 | `zero_slope_non_flat_roof` |
| GEO-008 | Roof peak height (`height + 0.5 × width × tan(slope)` for gable) ≤ 15.0 m | `roof_peak_too_high` |

### 3.2 Fenestration Consistency

| Rule ID | Rule | Error Code |
|---|---|---|
| FEN-001 | Window `offset_x + width` ≤ wall length − 0.05 | `window_exceeds_wall_width` |
| FEN-002 | Window `sill_height + height` ≤ wall height − 0.05 | `window_exceeds_wall_height` |
| FEN-003 | Window `offset_x` ≥ 0.05 | `window_too_close_to_edge` |
| FEN-004 | Window `sill_height` ≥ 0.0 | `window_below_floor` |
| FEN-005 | No two fenestrations on the same wall may overlap | `fenestration_overlap` |
| FEN-006 | Total fenestration area on any wall ≤ 80% of wall gross area | `fenestration_ratio_exceeds_limit` |
| FEN-007 | Door `offset_x + width` ≤ wall length − 0.05 | `door_exceeds_wall_width` |
| FEN-008 | Door `offset_z + height` ≤ wall height − 0.05 | `door_exceeds_wall_height` |
| FEN-009 | Door `width` ≥ 0.6 (minimum for egress) | `door_too_narrow` |
| FEN-010 | At least 1 door exists (WARNING, not error) | `no_doors_defined` |
| FEN-011 | Window `wall_face` must be a valid face for the shelter `shape` | `invalid_wall_face_for_shape` |

**Overlap detection algorithm:**
```
For each pair of fenestrations (A, B) on the same wall_face:
  A_left   = A.offset_x
  A_right  = A.offset_x + A.width
  A_bottom = A.sill_height (or A.offset_z for doors)
  A_top    = A.sill_height + A.height (or A.offset_z + A.height)

  B_left   = B.offset_x
  B_right  = B.offset_x + B.width
  B_bottom = B.sill_height (or B.offset_z)
  B_top    = B.sill_height + B.height (or B.offset_z + B.height)

  overlap = NOT (A_right ≤ B_left OR B_right ≤ A_left OR A_top ≤ B_bottom OR B_top ≤ A_bottom)
```

### 3.3 Construction Consistency

| Rule ID | Rule | Error Code |
|---|---|---|
| CON-001 | Construction `total_thickness` ≤ 3.0 m | `construction_too_thick` |
| CON-002 | Construction `total_r_value` ≥ 0.01 m²·K/W | `construction_r_value_too_low` |
| CON-003 | All `material_id` references must exist in the material library | `material_not_found` |
| CON-004 | At least 1 layer in every construction | `construction_empty` |
| CON-005 | Each layer thickness > 0.001 m | `layer_too_thin` |
| CON-006 | Envelope must define wall construction for ALL required faces | `missing_wall_construction` |
| CON-007 | Roof construction must be defined | `missing_roof_construction` |
| CON-008 | Floor construction must be defined | `missing_floor_construction` |

### 3.4 Physical Plausibility

| Rule ID | Rule | Severity | Error Code |
|---|---|---|---|
| PHY-001 | Wall U-value > 5.0 W/(m²·K) | WARNING | `wall_u_value_unusually_high` |
| PHY-002 | Wall U-value < 0.05 W/(m²·K) | WARNING | `wall_u_value_unusually_low` |
| PHY-003 | Total window-to-wall ratio > 0.60 | WARNING | `high_window_to_wall_ratio` |
| PHY-004 | Infiltration rate > 3.0 ACH | WARNING | `high_infiltration_rate` |
| PHY-005 | Infiltration rate = 0.0 ACH | WARNING | `zero_infiltration_unrealistic` |
| PHY-006 | No windows on any wall | WARNING | `no_windows_defined` |
| PHY-007 | All windows on north wall (in Northern Hemisphere) | WARNING | `no_south_facing_windows` |
| PHY-008 | Material conductivity > 100 W/(m·K) (metal) used as insulation layer | WARNING | `metal_used_as_insulation` |
| PHY-009 | Glazing SHGC > 0.9 | WARNING | `shgc_unusually_high` |
| PHY-010 | Zone volume per person < 3.0 m³ | WARNING | `overcrowded_shelter` |
| PHY-011 | `elevation` > 4000 and no altitude note | INFO | `high_altitude_note` |
| PHY-012 | Ground temperature monthly range > 30°C | WARNING | `ground_temp_range_unusual` |

### 3.5 Design Target Consistency

| Rule ID | Rule | Error Code |
|---|---|---|
| TGT-001 | `target_indoor_temp_min` < `target_indoor_temp_max` | `comfort_range_inverted` |
| TGT-002 | `target_indoor_temp_max − target_indoor_temp_min` ≥ 2.0 | `comfort_band_too_narrow` |
| TGT-003 | `acceptable_ppd_max` ∈ [5, 50] | `ppd_limit_out_of_range` |

### 3.6 Simulation Settings Consistency

| Rule ID | Rule | Error Code |
|---|---|---|
| SIM-001 | `run_period.end` date is after `run_period.start` date | `run_period_inverted` |
| SIM-002 | `weather.file_id` references an existing, valid weather file | `weather_file_not_found` |
| SIM-003 | `engine.type = ansys` but ANSYS is not installed | `engine_not_available` |
| SIM-004 | `output_variables` list is not empty | `no_output_variables` |
| SIM-005 | Run period ≥ 1 month (for meaningful results) | `run_period_too_short` |

---

## 4. L3: Engine Validation (EnergyPlus Pre-Check)

These are checked after IDF generation, before submitting to EnergyPlus.

| Rule ID | Rule | Error Code |
|---|---|---|
| IDF-001 | All surfaces form a closed zone (sum of surface normals ≈ 0) | `zone_not_closed` |
| IDF-002 | All surface vertices are coplanar (within 0.01 m tolerance) | `surface_not_planar` |
| IDF-003 | All surface areas > 0.01 m² | `degenerate_surface` |
| IDF-004 | Sub-surface area < parent surface area | `subsurface_exceeds_parent` |
| IDF-005 | Sub-surface is coplanar with parent surface | `subsurface_not_coplanar` |
| IDF-006 | Zone volume > 0 | `zero_volume_zone` |
| IDF-007 | Boundary conditions set for all surfaces (Outdoors, Ground, or Zone) | `missing_boundary_condition` |
| IDF-008 | EPW file path exists and is readable | `weather_file_inaccessible` |
| IDF-009 | EnergyPlus IDD file path exists | `idd_file_missing` |
| IDF-010 | IDF passes `energyplus --idf-verification` (if available) | `idf_verification_failed` |

---

## 5. Validation Response Format

All validation results are returned in a uniform structure:

```typescript
interface ValidationResult {
  valid: boolean;           // true if no errors (warnings are OK)
  errors: ValidationIssue[];    // blocking — must fix before proceeding
  warnings: ValidationIssue[];  // non-blocking — show to user, allow override
  info: ValidationIssue[];      // informational — logged, may show in UI
}

interface ValidationIssue {
  code: string;            // machine-readable error code (e.g., "window_exceeds_wall_width")
  field: string;           // JSON path to the offending field (e.g., "windows[0].width")
  message: string;         // human-readable description
  severity: "error" | "warning" | "info";
  context: Record<string, any>;  // additional context (e.g., { wall_length: 6.0, window_right_edge: 6.5 })
}
```

**Example:**
```json
{
  "valid": false,
  "errors": [
    {
      "code": "window_exceeds_wall_width",
      "field": "windows[0].position.offset_x",
      "message": "Window extends 0.5 m beyond the east wall edge. Wall length is 6.0 m, window right edge is at 6.5 m.",
      "severity": "error",
      "context": {
        "wall_face": "east",
        "wall_length": 6.0,
        "window_offset_x": 4.0,
        "window_width": 2.5,
        "window_right_edge": 6.5
      }
    }
  ],
  "warnings": [
    {
      "code": "high_infiltration_rate",
      "field": "ventilation.infiltration.rate_ach",
      "message": "Infiltration rate of 3.5 ACH is unusually high. Typical range is 0.1–2.0 ACH.",
      "severity": "warning",
      "context": {
        "value": 3.5,
        "typical_max": 2.0
      }
    }
  ],
  "info": []
}
```

---

## 6. Default Values Summary

When a field is optional and not provided, these defaults are applied:

| Field Path | Default Value | Rationale |
|---|---|---|
| `geometry.orientation_deg` | `0.0` | Front faces north |
| `geometry.roof.type` | `flat` | Simplest case |
| `geometry.roof.slope_deg` | `0.0` | Flat roof |
| `geometry.roof.overhang_*` | `0.0` | No overhangs |
| `geometry.floor_elevation` | `0.0` | Slab on grade |
| `envelope.walls.*.surface_properties` | From outermost material | Inherit from material |
| `envelope.floor.ground_contact.type` | `slab_on_grade` | Most common |
| `envelope.floor.ground_contact.soil_conductivity` | `1.0` | Typical soil |
| `ventilation.infiltration.method` | `ach` | Most intuitive |
| `ventilation.infiltration.construction_quality` | `average` | Middle ground |
| `ventilation.natural_ventilation.enabled` | `false` | Conservative |
| `ventilation.mechanical_ventilation.enabled` | `false` | Passive shelter |
| `internal_loads.occupancy.activity_level` | `seated_relaxed` | 1.0 met |
| `internal_loads.occupancy.clothing_insulation_clo` | `1.0` | Typical indoor winter |
| `internal_loads.lighting.enabled` | `false` | Passive analysis focus |
| `internal_loads.equipment.enabled` | `false` | Passive analysis focus |
| `design_targets.comfort.model` | `adaptive` | Appropriate for passive shelters |
| `design_targets.comfort.target_indoor_temp_min` | `18.0` | Common lower bound |
| `design_targets.comfort.target_indoor_temp_max` | `26.0` | Common upper bound |
| `design_targets.comfort.acceptable_ppd_max` | `20.0` | ASHRAE 55 threshold |
| `design_targets.comfort.adaptive_category` | `category_ii` | Normal expectation |
| `simulation_settings.engine.type` | `energyplus` | Primary engine |
| `simulation_settings.run_period.*` | Jan 1 – Dec 31 | Full year |
| `simulation_settings.timestep` | `6` | 10-minute steps |
| `simulation_settings.solar_distribution` | `full_interior_and_exterior` | EnergyPlus recommended |

---

## 7. Consumer Contract

### 7.1 What Each Consumer Reads

| Consumer | Fields Read | Fields Ignored |
|---|---|---|
| **3D Viewer** | geometry.*, windows[].{wall_face, position, width, height}, doors[].{wall_face, position, width, height}, thermal_mass[].{geometry, location} | All material properties, all schedules, simulation_settings |
| **IDF Generator** | geometry.*, envelope.*, windows.*, doors.*, ventilation.*, internal_loads.*, simulation_settings.*, location.{lat, lon, elevation, timezone} | project.*, design_targets.*, tags, descriptions |
| **Database** | ALL fields | — |
| **Comparison Engine** | Computed results + design_targets.* + envelope.*.construction.total_u_value + geometry.{dimensions, orientation} | Raw material properties, schedules, simulation_settings |
| **Optimization Engine** | geometry.{orientation_deg}, envelope.walls.*.construction.layers[].thickness, windows[].{width, height, glazing}, envelope.roof.construction.layers[].thickness | project.*, schedules (inherited from base design) |
| **Report Generator** | ALL fields + computed results | — |
| **Comfort Analyzer** | internal_loads.occupancy.{metabolic_rate_met, clothing_insulation_clo}, simulation output (air temp, MRT, RH, air speed) | geometry, envelope (used indirectly via simulation) |

### 7.2 Mutation Contract

| Mutator | Fields It May Modify | Must Do After Mutation |
|---|---|---|
| **Shelter Designer (UI)** | All fields except project.id, project.created_at, project.created_by | Increment project.version, update project.updated_at |
| **Optimization Engine** | Only fields declared as optimization variables | Clone full model, mutate variable fields, increment version |
| **Weather Service** | location.weather_source.*, location.climate_zone, location.koppen_class | — |
| **Backend (auto)** | project.id, project.version, project.created_at, project.updated_at | — |

---

*This document is the validation contract. All validators (Pydantic, Zod, service layer) must implement these rules. If a rule is missing from this document, it is not enforced.*
