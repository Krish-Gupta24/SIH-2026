# Units and Conventions

**SIH 2026 — Problem Statement 26051**  
**Canonical Reference for All Engineering Data in the Platform**

**Document Version:** 0.1  
**Date:** 2026-09-09  

---

This document defines the **single source of truth** for units, coordinate systems, orientation conventions, and naming rules used across the entire platform. Every module — 3D visualization, IDF generation, database persistence, API transport, optimization, and reporting — MUST conform to these conventions.

---

## 1. Unit System

The platform uses **SI units exclusively**. No imperial units are accepted, stored, or displayed.

### 1.1 Primary Units

| Quantity | Unit | Symbol | Notes |
|---|---|---|---|
| Length | meter | `m` | All geometry, thickness, dimensions |
| Area | square meter | `m²` | Surface areas, floor areas |
| Volume | cubic meter | `m³` | Zone volumes |
| Angle | degree | `°` | Azimuth, slope, latitude, longitude |
| Temperature | degree Celsius | `°C` | Air temp, surface temp, setpoints |
| Temperature difference | Kelvin | `K` | ΔT, temperature gradients |
| Time | second | `s` | Internal computation |
| Time (display) | hour | `h` | User-facing time-series |
| Mass | kilogram | `kg` | Material mass |
| Density | kilogram per cubic meter | `kg/m³` | Material density |
| Thermal conductivity | watt per meter-kelvin | `W/(m·K)` | Material property |
| Specific heat capacity | joule per kilogram-kelvin | `J/(kg·K)` | Material property |
| Thermal resistance (R-value) | square meter-kelvin per watt | `m²·K/W` | Construction property (computed) |
| Thermal transmittance (U-value) | watt per square meter-kelvin | `W/(m²·K)` | Construction property (computed) |
| Heat flux | watt per square meter | `W/m²` | Surface heat flow |
| Power | watt | `W` | Heat gains/losses |
| Energy | kilowatt-hour | `kWh` | Annual/monthly energy |
| Energy (internal) | joule | `J` | EnergyPlus output (converted to kWh for display) |
| Solar irradiance | watt per square meter | `W/m²` | GHI, DNI, DHI |
| Wind speed | meter per second | `m/s` | Weather data |
| Pressure | pascal | `Pa` | Atmospheric pressure |
| Relative humidity | percent | `%` | Range 0–100 |
| Air change rate | air changes per hour | `ACH` | Infiltration, ventilation |
| Volume flow rate | cubic meter per second | `m³/s` | Ventilation flow |
| Metabolic rate | met | `met` | 1 met = 58.15 W/m² body surface |
| Clothing insulation | clo | `clo` | 1 clo = 0.155 m²·K/W |
| Dimensionless ratio | — | — | SHGC, absorptance, emittance, VT (range 0.0–1.0) |

### 1.2 Derived / Display Units

| Quantity | Unit | Symbol | Derivation |
|---|---|---|---|
| Energy intensity | kWh per square meter per year | `kWh/(m²·a)` | Total energy / floor area / year |
| Heating degree-days | degree-day | `°C·day` | Σ max(0, T_base − T_outdoor) per day |
| Comfort hours | percent | `%` | Comfortable hours / occupied hours × 100 |
| Discomfort severity | degree-hour | `°C·h` | Σ (T_threshold − T_indoor) for each uncomfortable hour |

### 1.3 Unit Formatting Rules

- Always store values as **raw floats** in the canonical unit (no unit suffix in data).
- Units are **metadata on the field definition**, not part of the value.
- Display formatting is a UI concern — the model stores raw SI values.
- Precision: store as IEEE 754 `float64`. Display with appropriate decimal places per quantity (temperature: 1 dp, conductivity: 3 dp, area: 2 dp).

---

## 2. Coordinate System

### 2.1 World Coordinate System

```
        Z (Up)
        │
        │
        │
        │
        └───────── X (East)
       /
      /
     Y (North)
```

| Axis | Direction | Positive |
|---|---|---|
| **X** | East–West | East is positive |
| **Y** | North–South | North is positive |
| **Z** | Vertical | Up is positive |

This is a **right-handed** coordinate system. It matches:
- EnergyPlus coordinate convention (X=East, Y=North, Z=Up)
- Standard geographic convention

### 2.2 Three.js Coordinate Transform

Three.js uses Y-up by default. The frontend 3D viewer applies this transform:

```
Model (engineering)    →    Three.js (rendering)
X (East)               →    X (right)
Y (North)              →    Z (into screen, negated)
Z (Up)                 →    Y (up)
```

Transform matrix:
```
Three.js_X =  Model_X
Three.js_Y =  Model_Z
Three.js_Z = -Model_Y
```

This transform is applied **exclusively in the 3D viewer component**. All data storage, API transport, simulation input, and computation use the engineering coordinate system.

### 2.3 Origin

The origin `(0, 0, 0)` is at the **southwest corner of the shelter floor**, at ground level.

- The shelter extends in the **+X** (east) and **+Y** (north) directions from the origin.
- The shelter extends in the **+Z** (up) direction from the origin.
- For a rectangular shelter with `length` along X and `width` along Y:
  - Southwest corner: `(0, 0, 0)`
  - Southeast corner: `(length, 0, 0)`
  - Northeast corner: `(length, width, 0)`
  - Northwest corner: `(0, width, 0)`

### 2.4 Surface Vertices

- **Exterior surfaces (walls, roof):** Vertices are listed in **counter-clockwise order** when viewed from the **outside** of the building. This produces an **outward-facing normal** via the right-hand rule.
- **Floor surfaces:** Vertices are listed in **counter-clockwise order** when viewed from **above** (looking down). This produces a **downward-facing normal** (into the ground), which is correct for EnergyPlus floor surfaces.
- **Window/door sub-surfaces:** Vertices are listed in the **same winding order as the parent wall**, forming a sub-rectangle on the parent surface plane.

---

## 3. Orientation Convention

### 3.1 Building Azimuth

| Property | Convention |
|---|---|
| Reference direction | **True North** |
| Rotation direction | **Clockwise** (viewed from above) |
| Range | `[0, 360)` degrees |
| 0° | Front of building faces **North** |
| 90° | Front of building faces **East** |
| 180° | Front of building faces **South** |
| 270° | Front of building faces **West** |

This matches:
- Compass bearing convention
- EnergyPlus `Building` → `North Axis` (note: EP uses counter-clockwise, so we negate when writing IDF: `EP_north_axis = 360 - our_azimuth` if `our_azimuth > 0`)

**Clarification:** The `orientation_deg` field in the ShelterModel represents the **compass bearing of the building's front face** (the face that the main entrance / primary fenestration faces). A value of `180` means the front faces south — the optimal passive solar orientation for the Northern Hemisphere.

### 3.2 Wall Face Naming

Wall faces are named by their **cardinal direction when the building is at 0° orientation** (front = north). When the building is rotated, the wall names do NOT change — the names refer to the **building's local frame**, not the compass.

| Wall Face ID | At 0° Orientation (front=N) | Description |
|---|---|---|
| `north` | Faces geographic North | Front wall |
| `south` | Faces geographic South | Back wall |
| `east` | Faces geographic East | Right wall (viewed from front) |
| `west` | Faces geographic West | Left wall (viewed from front) |

When `orientation_deg = 180` (front faces south):
- `north` wall face → actually faces geographic **South**
- `south` wall face → actually faces geographic **North**

The geometry engine handles the rotation. Consumers (IDF generator, 3D viewer) receive **absolute world-space vertices** with the rotation already applied.

### 3.3 Roof Slope Direction

Roof slope is measured from the **horizontal plane**:
- `0°` = flat roof
- `90°` = vertical (impossible for a roof, but defines the axis)
- Typical range: `0°` to `60°`

For gable roofs, the ridge runs along the **length axis** (X-axis at 0° orientation), and the slope falls toward the north and south faces.

### 3.4 Window Position Reference

Window position on a wall is specified as:

| Field | Reference Point | Direction |
|---|---|---|
| `offset_x` | Left edge of the wall (when viewed from outside) | Rightward along wall |
| `sill_height` | Floor level (Z = 0 of the wall) | Upward |

This produces a consistent coordinate frame for every wall regardless of orientation.

---

## 4. Construction Layer Ordering

### 4.1 Convention

Material layers in a construction assembly are ordered **from outside to inside**:

```
Layer 1 (index 0): Outermost layer (exposed to weather / ground)
Layer 2 (index 1): Next layer inward
...
Layer N (index N-1): Innermost layer (exposed to zone air)
```

This matches:
- EnergyPlus `Construction` object layer ordering
- ASHRAE convention
- Physical reality (building up from exterior)

### 4.2 Example

A typical cold-climate wall:
```
Layer 0 (outside): Cement plaster render    — 15 mm
Layer 1:           Stone masonry            — 300 mm
Layer 2:           Expanded polystyrene     — 100 mm
Layer 3 (inside):  Mud plaster             — 20 mm
```

---

## 5. Time Conventions

### 5.1 Simulation Time

| Property | Convention |
|---|---|
| Time zone | Defined by `location.timezone_utc_offset` (hours from UTC) |
| Calendar | Standard Gregorian, non-leap year (8760 hours) |
| Hour indexing | 1-indexed (Hour 1 = 00:00–01:00, Hour 24 = 23:00–24:00) — matches EnergyPlus |
| Timestep | Sub-hourly steps expressed as `timesteps_per_hour` (e.g., 4 = 15-minute steps) |
| Run period | Default: Jan 1 – Dec 31 (full year) |

### 5.2 Schedule Convention

Schedules (occupancy, ventilation, lighting) use **fractional values [0.0, 1.0]** representing the fraction of the design-level value active at each hour.

- `0.0` = fully off
- `1.0` = fully on (design level)
- `0.5` = 50% of design level

Schedules are defined as either:
- **DayType profiles** (Weekday, Weekend, Holiday) with 24 hourly values
- **Compact schedules** (EnergyPlus-style "Through: 12/31, For: AllDays, Until: 24:00, 1.0")

---

## 6. Identification Conventions

### 6.1 IDs

| Entity | ID Format | Generator |
|---|---|---|
| Project | UUID v4 | Server-side (Python `uuid.uuid4()`) |
| Design | UUID v4 | Server-side |
| Material | UUID v4 | Server-side (system materials get stable UUIDs from seed data) |
| Construction | UUID v4 | Server-side |
| Window | UUID v4 | Client-side (allows immediate 3D preview before server round-trip) |
| Door | UUID v4 | Client-side |
| Simulation | UUID v4 | Server-side |
| User | UUID v4 | Server-side |

### 6.2 Naming

- All user-visible names are **free-text strings**, max 255 characters.
- Internal identifiers (wall face, shape type, material category) are **lowercase snake_case enum values**.
- EnergyPlus object names are auto-generated from our IDs and human-readable prefixes (e.g., `Wall_North_abc123`).

---

## 7. Versioning

### 7.1 Model Schema Version

The `ShelterModel` carries a `schema_version` field (semantic version string, e.g., `"1.0.0"`).

- **Major version bump:** Breaking change to required fields or structure (old models cannot be loaded without migration).
- **Minor version bump:** New optional fields added (old models load correctly with defaults).
- **Patch version bump:** Documentation or validation rule changes only.

### 7.2 Design Version

Each design has a monotonically increasing `version` integer. Every mutation to the design (dimensions, materials, fenestration) increments the version. This enables:
- Cache invalidation (3D viewer, IDF cache)
- Optimistic concurrency control
- Audit trail

---

## 8. Precision and Tolerance

| Quantity | Storage Precision | Display Precision | Tolerance for Comparison |
|---|---|---|---|
| Coordinates (m) | float64 | 3 decimal places | 1 mm (0.001 m) |
| Angles (°) | float64 | 1 decimal place | 0.1° |
| Temperature (°C) | float64 | 1 decimal place | 0.1 °C |
| Material properties | float64 | 3–4 significant figures | — |
| U/R values | float64 | 3 decimal places | — |
| Ratios (SHGC, etc.) | float64 | 2 decimal places | 0.01 |

---

## 9. Physical Constants

These constants are used in calculations and must not be hard-coded in multiple places. They are defined in `backend/app/core/constants.py`.

| Constant | Value | Unit | Source |
|---|---|---|---|
| Stefan-Boltzmann constant | 5.670374419 × 10⁻⁸ | W/(m²·K⁴) | NIST |
| Standard atmospheric pressure (sea level) | 101325 | Pa | ISO 2533 |
| Standard air density (sea level, 15°C) | 1.225 | kg/m³ | ISO 2533 |
| Specific heat of air (constant pressure) | 1006 | J/(kg·K) | — |
| Gravitational acceleration | 9.80665 | m/s² | — |
| Lapse rate (temperature vs altitude) | −0.0065 | K/m | ISA |
| Body surface area (standard adult) | 1.8 | m² | DuBois |
| 1 met | 58.15 | W/m² | ASHRAE 55 |
| 1 clo | 0.155 | m²·K/W | ASHRAE 55 |

---

*This document is the authoritative reference for all unit and convention questions. If any module deviates from these conventions, it is a bug.*
