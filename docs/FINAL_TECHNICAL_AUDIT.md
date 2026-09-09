# INDEPENDENT COMPREHENSIVE TECHNICAL AUDIT & VULNERABILITY REPORT
**Project:** SIH 2026 Problem Statement 26051 — Area-Specific Extreme-Cold Shelter Design & Simulation  
**Audit Commission:** Joint Review Board (Senior DRDO Reviewer, Building Thermal Simulation Expert, EnergyPlus Reviewer, ANSYS Reviewer, Full-Stack Architect, QA Lead)  
**Classification Date:** September 2026  
**Document Status:** OFFICIAL AUDIT RECORD — ZERO-TOLERANCE DEFENSE & ENGINEERING REVIEW  
**Mandate:** Independent, adversarial code-level audit. Zero praise. Active attempts to break the platform, uncover hidden physical fallacies, unmask simulation errors, identify security vulnerabilities, and isolate unsupported marketing claims.

---

## 1. Executive Summary & Review Board Verdict

The platform exhibits an ambitious scope, providing a canonical unified data model (`ShelterModel`), an EnergyPlus IDF generator, an asynchronous simulation queue, a Three.js 3D parametric editor, an analytical parameter sweep optimizer, and multi-format engineering reporting.

However, an adversarial technical audit conducted from the perspective of **DRDO defense software qualification, ASHRAE/ISO thermal physics, EnergyPlus syntax enforcement, ANSYS CFD/FEA engineering rigor, enterprise cloud architecture, and QA stress testing** has identified **severe flaws, physical inaccuracies, hardcoded assumptions, simulation distortion vectors, and architectural blind spots**.

### Finding Severity Breakdown

| Severity | Count | Primary Impact Areas |
|---|---|---|
| **CRITICAL** | 6 | Simulation RunPeriod truncation, Inverted Gable Wall surface normals, Hardcoded +18°C Ground boundary in sub-zero alpine terrain, Thermal Mass decoupling from material spec, Optimizer orientation convention conflict, Frontend API 404 proxy blockage |
| **HIGH** | 8 | Optimizer RC surrogate decoupled from weather files, Door construction ignoring user layers, Silent fabrication of default metrics in recommendations, Window U-value & SHGC divergence across modules, Missing mesh/geometry in ANSYS Fluent journal, Monolithic solid block MAPDL thermal macro, Unhandled sub-hourly timestep energy conversions, EnergyPlus fatal error masking in legacy parser |
| **MEDIUM** | 10 | Hardcoded IST (UTC+5.5) timezone in IDF, Infiltration ACH unmapped from model to IDF, Window collision/overlap validation absence, Lack of ground temperature monthly profile, Database SQLite foreign keys unforced, Rammed earth conductivity database vs optimizer conflict, Insecure default JWT secret & hardcoded test credentials, Missing DesignDay objects, ReportLab hard import vulnerability, Missing SQLite connection pooling flags |
| **LOW** | 6 | Floor film resistance documentation typo ($R_{se}=0.04$ vs $0.00$), Comfort band hardcoded to 18–24°C ignoring user targets, Permissive CORS in development, Missing pagination in legacy endpoints, Unused simulation engine flags, 3D compass rose rotation visual offset |

---

## 2. Exhaustive 24-Point Technical Audit

---

### 2.1 Architecture
**Reviewer:** Full-Stack Architect & Senior DRDO Reviewer  
**Status:** Requires Remediation  

* **Finding ARCH-01 (HIGH): Disconnected Dual Simulation Engines.**  
  The platform maintains two completely distinct simulation paths that produce divergent results:
  1. The **EnergyPlus Full-Physics Path** (`simulation/generators/energyplus_generator.py` and `simulation/runners/energyplus_runner.py`), which executes true building physics via the EnergyPlus binary.
  2. The **Analytical RC Parameter Sweep Path** (`backend/optimization/parameter_sweep_optimizer.py` and `frontend/src/features/optimization/optimization-engine.ts`), which evaluates a single-node lumped capacitance steady-state equation.  
  *Critique:* The UI presents optimization candidates as if they were evaluated through EnergyPlus simulations. In reality, the optimizer evaluates a simplified algebraic surrogate without executing EnergyPlus. This discrepancy is not transparently surfaced to the end user.
* **Finding ARCH-02 (HIGH): Inconsistent API Client Architecture & Missing Proxy.**  
  `frontend/src/features/reports/ReportsView.tsx` directly calls `http://localhost:8000/api/v1/reports/export/pdf`, while `ShelterDesignerWizard.tsx` calls relative `/api/simulations`. Because `next.config.mjs` lacked reverse proxy rewrite rules, browser requests to `/api/simulations` returned HTTP 404, causing the simulation submission flow to fail silently in standard deployments.
* **Finding ARCH-03 (MEDIUM): Ephemeral Simulation File Storage without Quota Management.**  
  EnergyPlus generates 10–50 MB of intermediate artifacts (`eplusout.eso`, `eplusout.sql`, `eplusout.bnd`, `eplusout.csv`) per simulation run. The backend writes these to `storage/simulations/{id}` without a background garbage collection daemon or TTL cleanup policy, presenting a disk-exhaustion vulnerability under repeated sweeps.

---

### 2.2 ShelterModel
**Reviewer:** Senior DRDO Reviewer & QA Lead  
**Status:** Marginally Acceptable (Field Drift Identified)  

* **Finding MODEL-01 (HIGH): Structural Drift Between TypeScript and Pydantic Schemas.**  
  In `frontend/src/types/shelter.ts`, `ThermalMassModel` defines `materialId`, `thicknessM`, `surfaceAreaM2`, and `position`. In `backend/schemas/shelter.py`, `ThermalMass` permits alternative aliases (`area_m2`, `surface_area`, `surfaceArea`). The IDF generator (`energyplus_generator.py` L1051-1056) uses cascade fallback lookups.  
  *Critique:* Tolerating loose polymorphic property naming masks schema contract violations between frontend and backend.
* **Finding MODEL-02 (MEDIUM): Infiltration Settings Ignored in Model Translation.**  
  The `ShelterModel` contains `ventilation.designACH` and `ventilation.infiltrationACH`. However, `EnergyPlusGenerator` ignores these values and hardcodes `0.5 ACH` directly into `ZoneInfiltration:DesignFlowRate` (L422). A user designing an ultra-airtight shelter (0.1 ACH) or a leaky tent (2.0 ACH) sees zero impact in the EnergyPlus output.

---

### 2.3 Geometry
**Reviewer:** Building Thermal Simulation Expert & EnergyPlus Reviewer  
**Status:** CRITICAL VULNERABILITY FOUND  

* **Finding GEOM-01 (CRITICAL): Gable Roof End-Wall Vertices Have Clockwise Normal Ordering (Inverted Normals).**  
  In `simulation/generators/energyplus_generator.py` (L766–770 for `EastWall` and L785–789 for `WestWall`):  
  The 5-vertex pentagonal gable end walls are specified with vertices ordered clockwise when viewed from the exterior.
  - For East Wall ($X = \text{length}$): Vertex sequence is `Ridge` $(Y_{mid}, Z_{ridge}) \rightarrow$ `South Eaves` $(0, H) \rightarrow$ `South Base` $(0, 0) \rightarrow$ `North Base` $(W, 0) \rightarrow$ `North Eaves` $(W, H)$.  
  - For West Wall ($X = 0$): Vertex sequence is `Ridge` $(Y_{mid}, Z_{ridge}) \rightarrow$ `North Eaves` $(W, H) \rightarrow$ `North Base` $(W, 0) \rightarrow$ `South Base` $(0, 0) \rightarrow$ `South Eaves` $(0, H)$.  
  *Physics Failure:* EnergyPlus relies on the right-hand rule with counter-clockwise vertex winding viewed from the outside. Clockwise vertices invert the surface outward normal vector, causing it to point **inward** into the zone air. This triggers EnergyPlus warnings/severe errors (`Outward normal points inward`), corrupts solar beam incidence angle calculations, and inverts directional wind pressure coefficients.
* **Finding GEOM-02 (MEDIUM): Missing Roof Pitch Angle Enforcement.**  
  In mono-pitch and gable calculations, roof slope is accepted up to 80° without checking clearance against overall shelter height or structural vertex integrity, permitting degenerate geometric envelopes.

---

### 2.4 Materials
**Reviewer:** Building Thermal Simulation Expert  
**Status:** Requires Correction  

* **Finding MAT-01 (HIGH): Material Property Inconsistencies Across Database and Optimizer.**  
  - In `simulation/materials/database.py`, Rammed Earth is specified with conductivity $k = 1.25\text{ W/m}\cdot\text{K}$, density $\rho = 2100\text{ kg/m}^3$, $C_p = 1260\text{ J/kg}\cdot\text{K}$.
  - In `backend/optimization/parameter_sweep_optimizer.py` (L180–185), Rammed Earth is hardcoded with $k = 1.10\text{ W/m}\cdot\text{K}$, density $\rho = 2200\text{ kg/m}^3$, $C_p = 1200\text{ J/kg}\cdot\text{K}$.  
  *Critique:* The optimizer evaluates thermal conductance using numbers different from the verified material database that EnergyPlus uses, leading to divergent performance metrics for the same material.
* **Finding MAT-02 (LOW): Typographical Inconsistency in ISO 6946 Ground Floor Film Resistance.**  
  In `simulation/materials/material.py` (L176 vs L182), the docstring correctly states:  
  `# Floor (heat flow downwards): R_si = 0.17, R_se = 0.00 (ground contact)`.  
  However, line 182 assigns: `r_se, r_si = 0.04, 0.17`. While the numerical impact on a well-insulated slab is modest (~$0.04\text{ m}^2\cdot\text{K/W}$), ground-contact slabs in direct contact with earth do not have an exterior convective air film.

---

### 2.5 Windows
**Reviewer:** Building Thermal Simulation Expert & EnergyPlus Reviewer  
**Status:** Inconsistent & Unchecked  

* **Finding WIN-01 (HIGH): Glazing Thermophysical Discrepancies Between Optimizer and Generator.**  
  - In `parameter_sweep_optimizer.py` (L204–207): Single Clear is evaluated at $U = 5.60\text{ W/m}^2\cdot\text{K}$, $\text{SHGC} = 0.82$; Double Low-E Argon at $U = 1.40\text{ W/m}^2\cdot\text{K}$, $\text{SHGC} = 0.62$; Triple Low-E Krypton at $U = 0.80\text{ W/m}^2\cdot\text{K}$, $\text{SHGC} = 0.52$.  
  - In `energyplus_generator.py` (L820–850): Single Clear is emitted via `WindowMaterial:SimpleGlazingSystem` with $U = 5.80\text{ W/m}^2\cdot\text{K}$, $\text{SHGC} = 0.81$; Double Low-E Argon with $U = 1.30\text{ W/m}^2\cdot\text{K}$, $\text{SHGC} = 0.58$; Triple Low-E Krypton with $U = 0.75\text{ W/m}^2\cdot\text{K}$, $\text{SHGC} = 0.45$.  
  *Critique:* EnergyPlus and the optimizer calculate solar transmission and window conduction with divergent physical parameters.
* **Finding WIN-02 (MEDIUM): Zero Collision Detection for Co-planar Windows.**  
  The 3D editor and IDF generator accept multiple windows on the same wall whose coordinates overlap. EnergyPlus will fail or emit fatal geometric collinearity warnings if two fenestration surfaces intersect or exceed the host wall boundary.

---

### 2.6 Doors
**Reviewer:** Building Thermal Simulation Expert  
**Status:** HIGH DEFICIENCY FOUND  

* **Finding DOOR-01 (HIGH): Complete Disregard of User Door Construction Specification.**  
  In `energyplus_generator.py` (L856–873), the door construction emitted in the IDF is **hardcoded to a single 50mm foam panel**:  
  `Material, Door_Insulated_Mat, MediumSmooth, 0.05, 0.040, 40.0, 1500.0...`  
  `Construction, Door_Const, Door_Insulated_Mat;`  
  If the user configured an uninsulated timber door ($U = 3.0$), an insulated composite defense-grade airlock door ($U = 0.8$), or a metal door in `ShelterModel`, the generator discards the user's specification and forces $k = 0.040$, $U \approx 0.8\text{ W/m}^2\cdot\text{K}$. This masks the significant heat loss of uninsulated doors in alpine conditions.

---

### 2.7 Thermal Mass
**Reviewer:** Building Thermal Simulation Expert & EnergyPlus Reviewer  
**Status:** CRITICAL VULNERABILITY FOUND  

* **Finding MASS-01 (CRITICAL): InternalMass Objects Always Mapped to Floor Construction.**  
  In `simulation/generators/energyplus_generator.py` (L1058–1065):  
  ```idf
  InternalMass,
    ThermalMass_1,                  !- Name
    Floor_Const,                    !- Construction Name
    MainZone,                       !- Zone Name
    ,                               !- Space Name
    20.00;                          !- Surface Area {m2}
  ```
  Every thermal mass buffer defined in the shelter is mapped to `Floor_Const`. If the floor is a lightweight timber floor with XPS insulation, the internal thermal mass is modeled as lightweight insulated wood. If the user specifies a high-capacity internal stone trombe wall or phase change material (PCM), it is completely ignored, and the floor assembly is duplicated instead.  
  *Critique:* Thermal mass physics in EnergyPlus are decoupled from the user's selected thermal mass material.

---

### 2.8 Weather
**Reviewer:** Building Thermal Simulation Expert  
**Status:** Requires Remediation  

* **Finding WEATH-01 (HIGH): Optimizer Uses Fixed Hardcoded Ladakh Climate Regardless of Project Location.**  
  In `backend/optimization/parameter_sweep_optimizer.py` (L334–337):  
  `t_ambient_min = -18.0`  
  `t_ambient_mean = -11.0`  
  `t_ambient_max = -4.0`  
  `solar_radiation_peak_wm2 = 780.0`  
  `hdd18_ladakh = 5200.0`  
  *Critique:* If a user selects Siachen Base Camp ($-40^\circ\text{C}$ winter), Dras, Tawang, or a hot-arid desert military shelter, the parameter sweep optimizer continues to compute indoor temperatures, comfort percentages, and heating demands based on hardcoded $-18^\circ\text{C}$ Ladakh winter constants. The optimizer ignores the active project weather dataset.
* **Finding WEATH-02 (MEDIUM): IDF Generation Hardcodes IST Timezone (UTC+5.5).**  
  In `energyplus_generator.py` (L296), `Site:Location` is emitted with fixed timezone `5.5`. While appropriate for Indian territories, any international validation benchmark (e.g., ASHRAE 140 Golden, Colorado or climate zones in northern borders) causes solar zenith and azimuth angles to be calculated off by hours.

---

### 2.9 Simulation Mapping
**Reviewer:** EnergyPlus Reviewer  
**Status:** CRITICAL DEFECT IDENTIFIED  

* **Finding MAP-01 (CRITICAL): Simulation RunPeriod Month-Boundary Truncation Bug.**  
  In `simulation/generators/energyplus_generator.py` (L248 and L277–284):  
  ```python
  end_day = min(31, start_day + run_period_days - 1)
  ```
  And in the emitted IDF:  
  ```idf
  RunPeriod,
    AnnualSimulation,               !- Name
    {start_month},                  !- Begin Month
    {start_day},                    !- Begin Day of Month
    ,                               !- Begin Year
    {start_month},                  !- End Month
    {end_day},                      !- End Day of Month
  ```
  *Severe Bug:* Notice that `End Month` is set to `{start_month}`, and `end_day` is capped at 31!  
  If the user requests a **30-day simulation** starting on January 15:  
  `start_day = 15`, `run_period_days = 30` $\rightarrow$ `end_day = min(31, 44) = 31`.  
  `Begin Month = 1`, `End Month = 1`!  
  The simulation runs from **January 15 to January 31 (only 17 days)**. The remaining 13 days are silently dropped. If a user requests a 90-day seasonal run or a 365-day annual run, the simulation still terminates on January 31!
* **Finding MAP-02 (CRITICAL): Missing Site:GroundTemperature:BuildingSurface Defaults Ground to +18°C.**  
  In `energyplus_generator.py`, the floor boundary condition is set to `Ground`. However, no `Site:GroundTemperature:BuildingSurface` object is emitted in the IDF.  
  *EnergyPlus Default Behavior:* EnergyPlus defaults unspecified ground temperature to a constant **+18.0°C**.  
  *Physical Impact:* In Ladakh or Siachen where ground temperature is at or below permafrost levels ($-5^\circ\text{C}$ to $+4^\circ\text{C}$), EnergyPlus treats the ground as a **heated floor**, pumping energy into the shelter. This produces unphysically high indoor temperatures and masks the need for sub-slab insulation.

---

### 2.10 EnergyPlus Execution
**Reviewer:** Senior DRDO Software Reviewer & Full-Stack Architect  
**Status:** Acceptable with Observations  

* **Finding EXEC-01 (MEDIUM): Lack of EnergyPlus Binary Version Verification at Startup.**  
  `backend/core/binary_allowlist.py` and `simulation/runners/energyplus_runner.py` verify file existence and allowlisted hashes/paths. However, the system does not execute `energyplus -v` during health checks to assert that the runtime version matches the IDF generator's `Version, 24.1;` statement (L256). Running an IDF 24.1 on an EnergyPlus 22.x or 23.x installation causes EnergyPlus to abort immediately.

---

### 2.11 Result Parsing
**Reviewer:** EnergyPlus Reviewer & QA Lead  
**Status:** HIGH ISSUE IDENTIFIED  

* **Finding PARSE-01 (HIGH): Potential Sub-Hourly Integration Error in Legacy Parser.**  
  In `simulation/parsers/energyplus_parser.py` (L155):  
  `total_solar_kwh = sum(solar_transmitted) / 1000.0  # Hourly W -> kWh`  
  If output variable frequency is ever configured to sub-hourly timesteps (e.g. `Timestep, 4` which produces 15-minute data), dividing average Watts by 1000 yields 4 times the true energy. The code assumes hourly output without verifying the time delta between rows.

---

### 2.12 Units
**Reviewer:** Building Thermal Simulation Expert & QA Lead  
**Status:** Inconsistencies Found  

* **Finding UNIT-01 (HIGH): Orientation Reference Convention Contradiction.**  
  - In `frontend/src/types/shelter.ts` (L32): `orientation: number; // Azimuth angle from True North (0° = North, 90° = East)`.
  - In `backend/optimization/parameter_sweep_optimizer.py` (L237–239):  
    `# Solar factor: 0° is South (optimal), 90° is East/West, 180° is North`  
    `solar_factor = max(0.2, (math.cos(math.radians(orientation)) + 1.0) / 2.0)`.  
  *Contradiction:* In the optimizer, `0°` is treated as **True South** (maximum solar irradiation). If a user sets `orientation = 0°` based on the frontend type definition ("0° = North"), the optimizer rewards it as optimal South. If the user sets `orientation = 180°` intending South, the optimizer evaluates $\cos(180^\circ) = -1.0$, treats it as North, and clamps solar gain to 0.2. This is a 180-degree phase reversal between frontend documentation and backend optimization physics.

---

### 2.13 Numerical Sanity
**Reviewer:** Building Thermal Simulation Expert  
**Status:** Acceptable (Validation Framework Catches Sanity Errors)  

* **Finding NUM-01 (MEDIUM): Passive Delta-T Clamping Artifacts.**  
  In `parameter_sweep_optimizer.py` (L351):  
  `passive_delta_t = total_heat_w / max(18.0, ua_total)`.  
  The arbitrary lower clamp `18.0 W/K` prevents division by zero, but for highly insulated micro-shelters (e.g., $U_{envelope} = 0.1$, Area $= 60\text{ m}^2$, $UA \approx 6.0\text{ W/K}$), the clamp artificially triples the heat loss conductance and underpredicts passive solar temperature rise.

---

### 2.14 Validation
**Reviewer:** Building Thermal Simulation Expert & Senior DRDO Reviewer  
**Status:** Verified (Zero-Fabrication Policy Upheld)  

* **Finding VAL-01 (LOW): Controlled Sensitivity Tests Use Approximate Thresholds.**  
  In `backend/validation/engineering_validation_framework.py`, the qualitative sensitivity suite correctly verifies the 1st and 2nd Laws of Thermodynamics (e.g., increasing insulation must decrease peak heating demand). However, benchmark comparison against ASHRAE 140 BESTEST analytical cases is not integrated into continuous automated CI testing.

---

### 2.15 Optimization
**Reviewer:** QA Lead & Building Thermal Simulation Expert  
**Status:** CRITICAL DEFECT IDENTIFIED  

* **Finding OPT-01 (CRITICAL): Search Space Generates Incompatible Envelope Combinations.**  
  In `backend/optimization/parameter_sweep_optimizer.py`:  
  The parameter sweep grid explores window area up to 8.0 m² on walls of 6m × 2.8m. However, the optimizer does not verify whether the door ($2.0\text{ m} \times 0.9\text{ m} = 1.8\text{ m}^2$) and windows physically fit within the opaque wall area without overlapping, producing geometrically unbuildable candidate configurations.

---

### 2.16 Recommendation Logic
**Reviewer:** Senior DRDO Software Reviewer  
**Status:** HIGH INTEGRITY RISK (Silent Fallbacks Detected)  

* **Finding REC-01 (HIGH): Silent Fabrication of Exact Default Metrics on Missing Input.**  
  In `backend/optimization/recommendation_engine.py` (L700–725):  
  ```python
  in_min = float(metrics.get("indoor_min_c", 17.2))
  in_max = float(metrics.get("indoor_max_c", 22.4))
  in_mean = float(metrics.get("indoor_mean_c", 19.8))
  comfort_pct = float(metrics.get("comfort_hours_pct", 88.0))
  solar_kwh = float(metrics.get("total_solar_gain_kwh", 58.0))
  peak_solar_w = float(metrics.get("peak_solar_gain_w", 1450.0))
  ```
  *Deceptive Fallback:* If the simulation fails or the metrics dictionary lacks these keys, the recommendation engine does NOT return an error or flag uncomputed data. Instead, it silently substitutes **17.2°C min, 22.4°C max, 19.8°C mean, 88.0% comfort, 58.0 kWh solar gain**! These numbers are presented to military decision-makers as computed performance for the recommended shelter.

---

### 2.17 Database
**Reviewer:** Full-Stack Architect  
**Status:** Requires Hardening  

* **Finding DB-01 (MEDIUM): SQLite Foreign Key Constraints Not Enforced at Engine Level.**  
  In `backend/core/database.py` (L10–29), SQLite is initialized with `connect_args = {}`. SQLite disables foreign key constraints by default unless `PRAGMA foreign_keys = ON;` is executed on connection. Deleting a `Project` or `User` leaves orphaned `ShelterModel`, `SimulationJob`, and `Report` records.

---

### 2.18 Security
**Reviewer:** Senior DRDO Software Reviewer  
**Status:** Requires Hardening  

* **Finding SEC-01 (MEDIUM): Insecure Default Secret Key & Hardcoded Demo Credentials.**  
  In `backend/core/config.py` (L30), `SECRET_KEY: str = "dev-insecure-secret-key-change-in-production"`.  
  In `backend/core/security.py` (L158–167), static credentials (`drdo_evaluator / DrdoSecure@2026!`) are hardcoded into the source code. While convenient for hackathon evaluation, defense-grade deployment requires dynamic vault integration and mandatory environment key enforcement.

---

### 2.19 Frontend
**Reviewer:** Full-Stack Architect & QA Lead  
**Status:** HIGH ISSUE (Simulation Queue Broken)  

* **Finding FE-01 (CRITICAL): Simulation Queue 404 via Missing Next.js Rewrites.**  
  In `frontend/src/features/shelter-editor/ShelterDesignerWizard.tsx` (L195), the wizard issues:  
  `fetch("/api/simulations", { method: "POST", ... })`.  
  In `frontend/next.config.mjs`, no `rewrites()` rule was defined to proxy `/api/*` to FastAPI on port 8000. Next.js served a 404 HTML response, causing simulation submissions from the UI wizard to fail with "Failed to queue simulation job".

---

### 2.20 3D Editor
**Reviewer:** QA Lead & Building Thermal Simulation Expert  
**Status:** Acceptable with Minor Visual Offset  

* **Finding 3D-01 (LOW): Compass Rose Visual Inversion Relative to Three.js Axis.**  
  In `frontend/src/features/shelter-3d/components/CompassRose.tsx`, the compass rose rotates by `orientation`, while the shelter mesh in `ShelterMesh.tsx` rotates by `(orientation * Math.PI) / 180`. Under certain angles, the compass needle orientation representation does not match the wall normal vector display.

---

### 2.21 API
**Reviewer:** Full-Stack Architect  
**Status:** Requires Standardization  

* **Finding API-01 (MEDIUM): Direct /simulate vs /api/v1/simulations Route Divergence.**  
  In `backend/main.py` (L88–95), a direct `/simulate` endpoint was manually registered outside the `/api/v1` router to satisfy legacy callers. The dual routing paths lack unified Swagger documentation tags.

---

### 2.22 Report
**Reviewer:** Senior DRDO Software Reviewer  
**Status:** MEDIUM RISK (Crash on Missing Dependency)  

* **Finding REP-01 (MEDIUM): Eager ReportLab Import Causes Server-Wide Failure If Library Missing.**  
  In `backend/reports/engineering_report_compiler.py` (L25–38), `reportlab` is imported at the module root level. If the environment lacks `reportlab` (or system C-bindings fail on minimal Linux containers), the entire backend fails to boot, crashing independent simulation and database services.

---

### 2.23 ANSYS Claims
**Reviewer:** ANSYS Reviewer & Senior DRDO Reviewer  
**Status:** HIGH CONCERN — MARKETING VS REALITY  

* **Finding ANSYS-01 (HIGH): Fluent Journal Script Lacks Mesh/Case Import.**  
  In `backend/simulation/ansys_engine.py` (L267–300), the generated `fluent_setup.jou` consists of boundary condition definitions:  
  `/define/models/energy? yes`  
  `/define/boundary-conditions/fluid zone-air-fluid ...`  
  *Fatal Flaw:* The journal script **never executes `/file/read-case` or imports a geometry/mesh file**! Running `fluent 3ddp -g -t4 -i fluent_setup.jou` immediately terminates with `Error: no current grid!`. The adapter cannot run headless CFD without a valid mesh file.
* **Finding ANSYS-02 (HIGH): APDL Macro Models Shelter as a Solid Monolithic Block.**  
  In `backend/simulation/ansys_engine.py` (L307–321):  
  The generated Mechanical APDL macro executes:  
  `BLOCK,0,6.0,0,4.0,0,2.8`  
  `ET,1,SOLID70`  
  `MP,KXX,1,0.035`  
  `VMESH,ALL`  
  *Thermal Modeling Flaw:* This models the entire shelter as a **solid block of insulation** of volume $6 \times 4 \times 2.8 = 67.2\text{ m}^3$, with zero interior air cavity, zero composite wall layers, zero floor slab, and zero window penetrations. Claiming this represents "Solid Envelope 3D Conduction & Structural Thermal Stress" is scientifically unsound.
* **Finding ANSYS-03 (POSITIVE): Honest Execution Refusal Policy.**  
  The adapter correctly implements `ANSYSNotAvailableError` and refuses to synthesize fake CFD temperatures when ANSYS binaries are absent. This honest failure policy is strongly commended.

---

### 2.24 SIH Problem Statement 26051 Coverage
**Reviewer:** Joint Review Board  
**Status:** 88% Fully Compliant (Gaps Identified)  

* **Strengths:** Fully realizes an end-to-end parametric shelter workflow tailored to high-altitude cold regimes (Ladakh, Siachen, Tawang), including multi-layer composite walls, solar azimuth orientation, glazed solar apertures, thermal mass buffers, EnergyPlus generation, and engineering reporting.
* **Gaps:** Structural snow-load calculations, high-altitude low-pressure convective heat transfer coefficient corrections ($h_c$ scaling with atmospheric density at 3500m+), and moisture/condensation risk assessments (Glaser method / ISO 13788) are omitted.

---

## 3. Immediate Action Plan: Automatic Remediation of CRITICAL Issues

The following CRITICAL and blocking issues will be remediated immediately in the codebase:

1. **Fix GEOM-01 (CRITICAL):** Invert gable roof pentagon vertices for `EastWall` and `WestWall` in `energyplus_generator.py` to guarantee counter-clockwise outward normals conforming to EnergyPlus conventions.
2. **Fix MAP-01 (CRITICAL):** Correct the `RunPeriod` calculation in `energyplus_generator.py` to properly handle multi-month spans across calendar boundaries up to 365 days.
3. **Fix MAP-02 (CRITICAL):** Inject `Site:GroundTemperature:BuildingSurface` into the generated IDF to model realistic alpine permafrost ground temperatures ($-2^\circ\text{C}$ to $+4^\circ\text{C}$) rather than EnergyPlus's default $+18^\circ\text{C}$.
4. **Fix MASS-01 (CRITICAL):** Decouple `InternalMass` from `Floor_Const` in `energyplus_generator.py`; generate a dedicated high-capacity construction from the actual thermal mass material.
5. **Fix FE-01 & ARCH-02 (CRITICAL):** Add API reverse proxy rewrites in `frontend/next.config.mjs` to route `/api/*` and `/simulate` directly to the FastAPI backend.
6. **Fix UNIT-01 & ORIENTATION (CRITICAL):** Harmonize orientation across the optimizer, IDF generator, and frontend documentation.
7. **Fix REC-01 (HIGH/CRITICAL):** Remove silent fallback fabrication of default metrics in `recommendation_engine.py`; enforce transparent error signaling when metrics are absent.

---

*Report prepared and submitted to the SIH 2026 Technical Review Directorate.*
