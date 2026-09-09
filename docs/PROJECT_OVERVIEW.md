# SIH 2026 — Problem Statement 26051
## Software Based Model Development for Design of Area Specific Shelter for Thermal Comfort Maintenance

**Sponsor:** DRDO (Defence Research and Development Organisation)  
**Category:** Software  
**Document Version:** 0.1 — Initial Analysis  
**Date:** 2026-09-09  

---

## 1. Problem Understanding

### 1.1 What DRDO Is Asking For

DRDO needs a **software platform** that lets an engineer or designer:

1. **Specify a location** (climate zone, altitude, latitude/longitude) — with Ladakh as the primary target.
2. **Define a shelter** — size, shape, orientation, wall/roof/floor construction, windows, doors, openings.
3. **Assign materials** — including composite/multi-layer assemblies, thermal mass storage materials, and user-defined material properties.
4. **Run a physics-based thermal simulation** — using real weather data, not made-up numbers.
5. **See results** — indoor temperature profiles, heat flows through each envelope component, solar gains, thermal comfort indices.
6. **Compare designs** — side-by-side evaluation of alternative shelter configurations.
7. **Get recommendations** — optimized configurations that maximize thermal comfort while minimizing dependence on active heating/cooling.

### 1.2 The Core Physics Problem

In high-altitude cold regions like Ladakh (3,500 m+):

| Factor | Condition |
|---|---|
| Winter temperatures | −25 °C to −35 °C |
| Summer daytime | +25 °C to +35 °C |
| Diurnal swing | 20–30 °C in a single day |
| Solar irradiance | 5–7 kWh/m²/day (among highest globally) |
| Atmospheric pressure | ~65 kPa (vs 101 kPa at sea level) |
| Wind | High, sustained, cold winds |
| Humidity | Extremely low (cold-arid desert) |

The challenge is designing a **passive shelter** that:
- Captures and retains solar energy during the day (Trombe walls, direct gain, sunspaces).
- Minimizes heat loss at night and during winter (insulation, thermal mass, air-tightness).
- Does not overheat in summer (ventilation, shading).
- Operates with **minimal or no active HVAC** systems.

This is a transient, multi-physics problem. Steady-state R-value calculations are **insufficient**. The simulation must resolve hourly (or sub-hourly) heat transfer through massive, multi-layer walls interacting with a rapidly changing solar and temperature environment.

### 1.3 What This Is NOT

- This is **not** a CAD tool. We are not building Revit or SketchUp.
- This is **not** a custom thermal solver. We must not invent finite-element heat transfer code when validated engines exist.
- This is **not** a marketing dashboard. Every number shown must trace to a physics-based calculation.

---

## 2. What the Software Product Should Do

### 2.1 User Workflow (Canonical Pipeline)

```
USER INPUT
  → SHELTER MODEL (parametric geometry + construction + materials)
    → VALIDATION (geometry closure, material property bounds, construction sanity)
      → SIMULATION MODEL (EnergyPlus IDF/epJSON generation)
        → WEATHER DATA (EPW file selection/assignment)
          → THERMAL SIMULATION (EnergyPlus execution)
            → RESULT PARSING (ESO/CSV/SQL output extraction)
              → ENGINEERING METRICS (comfort indices, heat flows, energy balance)
                → VISUALIZATION (3D model, time-series plots, heatmaps)
                  → COMPARISON (multi-design evaluation)
                    → OPTIMIZATION (parametric sweep / genetic algorithm)
                      → RECOMMENDATION (ranked design alternatives)
                        → REPORT (PDF/HTML engineering report)
```

### 2.2 Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| F-01 | Location selection with automatic climate zone classification (ASHRAE / NBC India) | Must |
| F-02 | EPW weather file selection, preview, and assignment to simulation | Must |
| F-03 | Parametric shelter geometry definition (rectangular, L-shape, curved-roof, Quonset, etc.) | Must |
| F-04 | Orientation control (azimuth angle) | Must |
| F-05 | Multi-layer wall/roof/floor construction definition | Must |
| F-06 | Material property library (with standard construction materials + user-defined entries) | Must |
| F-07 | Window/door/opening placement with sizing, glazing type, frame properties | Must |
| F-08 | Thermal mass integration (phase-change materials, massive walls, water walls) | Should |
| F-09 | Automatic generation of EnergyPlus simulation input (IDF or epJSON) | Must |
| F-10 | Simulation execution with progress feedback | Must |
| F-11 | Indoor temperature prediction (hourly, annual) | Must |
| F-12 | Solar thermal gain computation per surface | Must |
| F-13 | Heat flow through envelope components (conduction, convection, radiation) | Must |
| F-14 | Thermal comfort assessment (PMV/PPD per ASHRAE 55, Adaptive Comfort per EN 16798) | Must |
| F-15 | 3D visualization of shelter model | Must |
| F-16 | Time-series visualization of indoor/outdoor temperatures, heat flows, comfort | Must |
| F-17 | Side-by-side comparison of 2+ shelter designs | Must |
| F-18 | Parametric optimization (vary orientation, insulation thickness, WWR, thermal mass) | Should |
| F-19 | Design recommendation engine (rank alternatives by comfort hours, energy balance) | Should |
| F-20 | Report generation (PDF with all results, assumptions, and methodology) | Must |
| F-21 | Infiltration / ventilation modeling | Should |
| F-22 | Ground heat transfer modeling | Should |

### 2.3 Non-Functional Requirements

| # | Requirement |
|---|---|
| NF-01 | Simulation must use a validated, peer-reviewed thermal engine (EnergyPlus). No custom solvers. |
| NF-02 | Material properties must come from published databases or user input. No fabrication. |
| NF-03 | Weather data must come from TMY/EPW files from recognized sources. No fabrication. |
| NF-04 | All computed metrics must be traceable to simulation outputs. No invented accuracy claims. |
| NF-05 | Web-based UI accessible via modern browsers. No desktop-only installation required for the frontend. |
| NF-06 | Backend must run on a machine where EnergyPlus is installed (Linux/Windows). |
| NF-07 | Simulation of a single shelter for one year should complete in < 5 minutes on commodity hardware. |
| NF-08 | System must handle concurrent users (at least 5 simultaneous simulations for demo). |

---

## 3. Major Modules

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Web UI)                        │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Location  │ │ Shelter  │ │ Material │ │  Results │          │
│  │ & Climate │ │ Designer │ │ Library  │ │ Dashboard│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │ 3D Model │ │  Compare │ │  Report  │                       │
│  │ Viewer   │ │  Panel   │ │ Download │                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API / WebSocket
┌─────────────────────────────┴───────────────────────────────────┐
│                      BACKEND (Python)                           │
│                                                                 │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │ Shelter Model     │  │ Simulation Engine │                  │
│  │ (Geometry, Constr │  │ (IDF Generation,  │                  │
│  │  Materials, Valid) │  │  EP Execution,    │                  │
│  │                   │  │  Result Parsing)  │                  │
│  └───────────────────┘  └───────────────────┘                  │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │ Weather Module    │  │ Comfort Module    │                  │
│  │ (EPW handling,    │  │ (PMV/PPD, Adapt., │                  │
│  │  climate preview) │  │  Comfort Hours)   │                  │
│  └───────────────────┘  └───────────────────┘                  │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │ Optimization      │  │ Reporting Module  │                  │
│  │ (Parametric sweep,│  │ (PDF generation,  │                  │
│  │  GA, ranking)     │  │  comparison tables)│                  │
│  └───────────────────┘  └───────────────────┘                  │
│  ┌───────────────────┐                                         │
│  │ Material Database │                                         │
│  │ (Library + Custom)│                                         │
│  └───────────────────┘                                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    EXTERNAL DEPENDENCIES                        │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐              │
│  │ EnergyPlus│  │ EPW Files │  │ Material Data │              │
│  │ (v24.2+)  │  │ (TMYx)    │  │ (Published)   │              │
│  └───────────┘  └───────────┘  └───────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 Module Breakdown

#### Module 1: Location & Climate (`location`)
- Location selection (lat/lon, city name, or map pick)
- ASHRAE climate zone lookup
- EPW file inventory and assignment
- Climate data preview (temperature range, solar radiation, wind rose)

#### Module 2: Shelter Model (`shelter`)
- Parametric geometry engine for common shelter shapes
- Surface generation (walls, roof, floor, partitions)
- Window/door/opening placement on surfaces
- Orientation (azimuth) control
- Geometry validation (closed volume, no intersecting surfaces, area checks)
- Internal representation → serialization to JSON

#### Module 3: Material & Construction (`materials`)
- Material property database (conductivity, density, specific heat, thickness)
- Pre-loaded library of common construction materials (concrete, brick, stone, mud, timber, insulation types, glass types)
- Multi-layer construction assembly builder
- User-defined material entry with validation (property bounds checking)
- Thermal mass and PCM (Phase-Change Material) support

#### Module 4: Simulation Engine (`simulation`)
- **IDF/epJSON Generator:** Translates the internal shelter model into a complete EnergyPlus input file
  - Zone definition
  - Surface geometry (vertices)
  - Construction assignments
  - Fenestration (windows/doors)
  - Internal gains schedule (occupancy, lighting — minimal for passive shelter)
  - Infiltration / natural ventilation
  - Ground boundary conditions
  - Output variable requests
- **Simulation Runner:** Executes EnergyPlus as a subprocess, captures progress, handles errors
- **Result Parser:** Reads EnergyPlus output (ESO, CSV, SQL) and extracts:
  - Zone mean air temperature (hourly)
  - Surface inside/outside temperatures
  - Solar gain through each window
  - Conduction/convection heat flow per surface
  - Infiltration heat loss
  - Zone energy balance

#### Module 5: Thermal Comfort (`comfort`)
- PMV / PPD calculation per ASHRAE Standard 55 (using `pythermalcomfort`)
- Adaptive Comfort Model per EN 16798-1 (for naturally ventilated shelters)
- Comfort hours computation (% of occupied hours within comfort band)
- Discomfort severity analysis (degree-hours below/above thresholds)

#### Module 6: Visualization (`visualization`)
- **3D Model Viewer:** Interactive browser-based 3D rendering of the shelter geometry (Three.js)
  - Color-coded surfaces (walls, roof, floor, windows)
  - Orientation indicator (sun path overlay optional)
- **Time-Series Charts:** Indoor/outdoor temperature, heat flows, solar gains (Plotly or Chart.js)
- **Heatmaps:** Hourly comfort over the year (8,760-hour carpet plot)
- **Energy Balance Diagrams:** Sankey or stacked bar charts

#### Module 7: Comparison (`comparison`)
- Store multiple design variants per project
- Side-by-side metric comparison tables
- Overlay time-series plots
- Delta analysis (improvement of Design B over Design A)

#### Module 8: Optimization (`optimization`)
- Define optimization variables (orientation, insulation thickness, WWR, thermal mass thickness)
- Define objective function (maximize comfort hours, minimize heating energy demand)
- Parametric sweep (grid search over variable space)
- Optional: Genetic Algorithm (NSGA-II via `pymoo`) for multi-objective optimization
- Result ranking and Pareto-front visualization

#### Module 9: Reporting (`reporting`)
- Auto-generated PDF/HTML report containing:
  - Project location and climate summary
  - Shelter geometry and construction specifications
  - Material properties used
  - Simulation methodology (EnergyPlus version, weather file, timestep)
  - Results: temperature profiles, comfort metrics, energy balance
  - Comparison table (if multiple designs)
  - Optimization results (if run)
  - Assumptions and limitations

---

## 4. What Should Be Built by Us

| Component | Rationale |
|---|---|
| **Web frontend** (shelter designer, results dashboard, 3D viewer, comparison panel) | Bespoke UI for this domain; no off-the-shelf product fits. |
| **Parametric geometry engine** | Translates user-defined shelter parameters into 3D surface vertices for EnergyPlus. Shelter shapes (Quonset, A-frame, etc.) are domain-specific. |
| **IDF/epJSON generator** | The translation layer from our internal model to EnergyPlus input. This is the core integration logic. |
| **Material database schema + seeded data** | We must curate a library of materials relevant to high-altitude construction (mud-brick, rammed earth, stone, GFRP panels, aerogel insulation, etc.) with published properties. |
| **Simulation orchestration** | Job management: queue simulation, track progress, handle timeouts/errors, parse results. |
| **Result post-processing** | Extract, aggregate, and compute derived metrics (comfort indices, energy balance summaries) from raw EnergyPlus output. |
| **Comparison engine** | Multi-design evaluation logic with normalized scoring. |
| **Optimization loop** | Parametric sweep controller and integration with `pymoo` or similar. |
| **Report generator** | Templated PDF/HTML generation from structured results. |
| **REST API** | Backend API layer connecting frontend to all backend services. |

---

## 5. What Should Be Delegated to Existing Software/Libraries

| Responsibility | Delegated To | Why |
|---|---|---|
| **Thermal simulation** (transient heat transfer, solar geometry, conduction through multi-layer walls, fenestration heat balance) | **EnergyPlus** (v24.2+) | DOE-validated, peer-reviewed, ASHRAE-140 tested. The gold standard for whole-building energy simulation. Attempting to replicate this would be both futile and scientifically irresponsible. |
| **EnergyPlus IDF manipulation** | **eppy** + **geomeppy** | Mature Python libraries for reading/writing/modifying IDF files and handling surface geometry. |
| **Weather data** | **EPW files** from Climate.OneBuilding.org, Ladybug EPW Map | TMYx files derived from real meteorological records. No fabrication. |
| **Thermal comfort calculation** | **pythermalcomfort** | Peer-reviewed library implementing ASHRAE 55, ISO 7730, EN 16798. Published in SoftwareX. |
| **Multi-objective optimization** | **pymoo** | Established Python framework for multi-objective optimization (NSGA-II, NSGA-III). |
| **3D rendering in browser** | **Three.js** | Industry-standard WebGL library for interactive 3D visualization. |
| **Charting** | **Plotly.js** or **Chart.js** | Interactive, publication-quality charts for time-series and heatmaps. |
| **PDF generation** | **WeasyPrint** or **ReportLab** | Python-based PDF rendering from HTML/CSS or programmatic layout. |
| **Numerical computing** | **NumPy**, **Pandas** | Standard scientific Python stack for data manipulation and numerical operations. |
| **Web framework** | **FastAPI** | High-performance async Python web framework with automatic OpenAPI docs. |
| **Database** | **SQLite** (dev) / **PostgreSQL** (prod) | Reliable, well-understood relational databases. SQLAlchemy as ORM. |

> **CAUTION:**
> **We must NOT build a custom thermal solver.** EnergyPlus solves the Conduction Transfer Function (CTF) equations, performs solar distribution calculations, handles ground coupling, models infiltration, and has been validated against ASHRAE Standard 140 (BESTEST). Any attempt to replicate this in Python would produce scientifically indefensible results and would fail peer review.

---

## 6. Recommended Technology Stack

### 6.1 Backend

| Layer | Technology | Version / Notes |
|---|---|---|
| Language | **Python** | 3.11+ |
| Web Framework | **FastAPI** | Async, automatic OpenAPI schema, WebSocket support for simulation progress |
| ORM | **SQLAlchemy** | 2.0+ with async support |
| Database | **SQLite** (dev/demo) → **PostgreSQL** (production) | |
| Task Queue | **Celery** + **Redis** | For async simulation job management |
| EnergyPlus Interface | **eppy** + **geomeppy** | IDF construction and geometry manipulation |
| Simulation Engine | **EnergyPlus** | v24.2+ (must be installed on the server) |
| Thermal Comfort | **pythermalcomfort** | ASHRAE 55 / EN 16798 compliance |
| Optimization | **pymoo** | NSGA-II multi-objective optimization |
| Scientific Computing | **NumPy**, **Pandas**, **SciPy** | Data processing and numerical methods |
| PDF Reports | **WeasyPrint** | HTML/CSS → PDF conversion |
| EPW Parsing | **pvlib** or custom parser | Solar position + EPW weather file reading |
| Validation | **Pydantic** | Request/response validation, shelter model schema |

### 6.2 Frontend

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js** (React) | SSR, routing, API integration |
| 3D Visualization | **Three.js** via **React Three Fiber** + **Drei** | Interactive shelter model viewer |
| Charts | **Plotly.js** (via react-plotly.js) | Time-series, heatmaps, Sankey diagrams |
| UI Components | **Radix UI** or **Headless UI** + custom styling | Accessible, unstyled primitives |
| Styling | **Vanilla CSS** with CSS custom properties | Design system with tokens |
| State Management | **Zustand** or **React Context** | Lightweight, sufficient for this domain |
| Forms | **React Hook Form** + **Zod** | Structured form validation for shelter parameters |

### 6.3 Infrastructure

| Component | Technology |
|---|---|
| Containerization | **Docker** + **Docker Compose** |
| CI/CD | **GitHub Actions** |
| Process Manager | **Supervisor** or **systemd** (for EnergyPlus worker) |
| Reverse Proxy | **Nginx** |

### 6.4 External Dependencies (Must Be Installed on Server)

| Dependency | Installation |
|---|---|
| **EnergyPlus v24.2+** | Official installer from energyplus.net |
| **Redis** | For Celery task broker |
| **Node.js 20+** | For frontend build |

---

## 7. Major Technical Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| T-01 | **EnergyPlus IDF generation correctness.** Generating valid IDF files programmatically from arbitrary user geometry is the hardest technical challenge. Invalid vertex ordering, unclosed zones, or incorrect boundary conditions will cause EnergyPlus to crash or produce nonsense. | **Critical** | Start with a small set of validated shelter templates (rectangular, L-shape). Use geomeppy's `intersect()` and `match()` for boundary conditions. Build a comprehensive IDF validation layer that catches errors before submission to EnergyPlus. Test against hand-built reference models. |
| T-02 | **Geometry edge cases.** Curved roofs (Quonset huts), non-convex floor plans, and sloped surfaces require careful tessellation into planar surfaces that EnergyPlus accepts. | **High** | Approximate curves with faceted planar segments. Limit initial geometry to well-understood shapes. Document tessellation tolerances. |
| T-03 | **EnergyPlus execution failures.** EnergyPlus can fail silently or produce warnings that indicate invalid results. Not all failures are fatal errors. | **High** | Parse `eplusout.err` programmatically. Classify warnings vs. severe errors vs. fatal errors. Block result display if fatal errors occurred. Surface warnings to the user. |
| T-04 | **Weather data availability for remote locations.** Ladakh has limited weather station coverage. The nearest TMYx station may be 50+ km from the target site. | **High** | Use Climate.OneBuilding.org TMYx data for Leh. Allow users to upload custom EPW files. Document the weather station used and its distance from the site. Do NOT interpolate or fabricate weather data. |
| T-05 | **Simulation runtime.** Annual hourly simulation can take 30–120 seconds per design. Optimization loops with 100+ variants could take hours. | **Medium** | Use Celery for async job management. Provide progress feedback via WebSocket. Allow users to cancel long-running jobs. For optimization, use Latin Hypercube Sampling to reduce the search space. |
| T-06 | **Altitude effects on air properties.** EnergyPlus uses standard atmosphere by default. At 3,500 m, air density is ~35% lower, affecting convection coefficients and infiltration rates. | **Medium** | Set `Site:Location` altitude correctly in the IDF. EnergyPlus adjusts barometric pressure accordingly. Verify convection algorithm selection (TARP, DOE-2, etc.) handles altitude correctly. |
| T-07 | **Frontend 3D performance.** Complex shelter geometries with many surfaces could cause rendering lag in Three.js. | **Low** | Shelter models are simple (typically < 50 surfaces). This is not an architectural visualization problem. Basic Three.js will suffice. |

---

## 8. Major Engineering Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| E-01 | **Validation of results.** Judges / DRDO evaluators will ask: "How do you know these results are correct?" Without validation, the tool is a black box. | **Critical** | Run ASHRAE Standard 140 (BESTEST) qualification cases through our IDF generator → EnergyPlus pipeline and compare against published reference results. Document the validation in the report. This is non-negotiable. |
| E-02 | **Material property accuracy.** Using incorrect thermal conductivity, density, or specific heat will produce wrong results regardless of simulation engine quality. | **Critical** | Source all material properties from published databases: ASHRAE Handbook of Fundamentals, BIS standards (IS 3792, IS 2185), CIBSE Guide A, manufacturer datasheets. Cite every source. Allow user override but warn when values are outside typical bounds. |
| E-03 | **Thermal comfort model applicability.** PMV model (Fanger) assumes steady-state conditions and mechanically conditioned spaces. In naturally ventilated passive shelters, the Adaptive Comfort Model (EN 16798-1) is more appropriate. Using the wrong model will give misleading comfort assessments. | **High** | Implement both PMV/PPD and Adaptive Comfort. Default to Adaptive Comfort for unconditioned shelters. Clearly label which model is being used. Document assumptions about metabolic rate and clothing insulation. |
| E-04 | **Ground heat transfer modeling.** Ground-coupled floors are significant in cold climates. EnergyPlus ground models (Slab, Basement, Kiva) require careful setup. | **High** | Use EnergyPlus Foundation:Kiva for ground-coupled floor simulation. If too complex for the timeline, use the `GroundTemperatures:BuildingSurface` monthly schedule approach with documented assumptions. |
| E-05 | **Infiltration modeling.** In real shelters, air infiltration through cracks, joints, and openings is a dominant heat loss mechanism in cold climates. Under-estimating infiltration will overpredict indoor temperatures. | **High** | Use EnergyPlus `ZoneInfiltration:DesignFlowRate` with coefficients derived from ASHRAE-published values for the construction type (tight, average, leaky). Allow user override. Document the infiltration model used. |
| E-06 | **Scope creep.** The problem statement is broad. Attempting to model HVAC systems, detailed lighting, or building codes compliance will derail the project. | **High** | Strictly scope to passive shelters with no mechanical systems. Model only: envelope, solar gains, infiltration, internal gains (occupancy heat), and natural ventilation. Exclude HVAC, detailed lighting, and code compliance. |
| E-07 | **Misrepresentation of optimization results.** Genetic algorithm results can suggest physically implausible designs if constraints are not properly set. | **Medium** | Enforce physical constraints on all optimization variables (e.g., wall thickness 0.1–1.0 m, WWR 0.05–0.40). Validate every generated design before simulation. |

---

## 9. Proposed Development Phases

### Phase 0: Foundation (Days 1–3)
> Project setup, architecture, and core infrastructure.

- [ ] Repository structure, CI/CD, Docker setup
- [ ] Backend skeleton (FastAPI + project structure)
- [ ] Frontend skeleton (Next.js + design system)
- [ ] Database schema (projects, designs, materials, simulations, results)
- [ ] EnergyPlus installation verification and path configuration
- [ ] EPW file inventory (collect TMYx files for Ladakh/Leh and 3-4 other Indian climate zones)

### Phase 1: Shelter Model + IDF Generation (Days 3–7)
> The core engineering challenge. If this doesn't work, nothing works.

- [ ] Material database schema + seed data (20+ materials with published properties)
- [ ] Multi-layer construction assembly builder
- [ ] Parametric geometry engine for rectangular shelters
- [ ] Surface vertex generation with correct winding order
- [ ] Window/door placement on surfaces
- [ ] IDF generator (zone, surfaces, constructions, fenestration, schedules, outputs)
- [ ] IDF validation layer
- [ ] **Validation: Generate IDF for BESTEST Case 600, run in EnergyPlus, compare results**

### Phase 2: Simulation Pipeline (Days 7–10)
> End-to-end: user defines shelter → simulation runs → results come back.

- [ ] EnergyPlus execution wrapper (subprocess, error handling, timeout)
- [ ] Result parser (ESO/CSV/SQL → structured data)
- [ ] Weather module (EPW file selection, climate preview)
- [ ] Celery task queue integration for async simulation
- [ ] WebSocket progress reporting
- [ ] REST API endpoints for create/read shelter, submit simulation, get results

### Phase 3: Frontend — Shelter Designer + Results (Days 10–15)
> User-facing interface for the core workflow.

- [ ] Location selection page (map or dropdown with climate zone display)
- [ ] Shelter designer form (dimensions, orientation, construction, materials)
- [ ] 3D model viewer (Three.js / React Three Fiber)
- [ ] Simulation submit + progress indicator
- [ ] Results dashboard (temperature plots, heat flows, comfort metrics)
- [ ] 8,760-hour comfort heatmap

### Phase 4: Comfort, Comparison, and Reporting (Days 15–18)
> Engineering value-add features.

- [ ] Thermal comfort computation (PMV/PPD + Adaptive Comfort)
- [ ] Multi-design comparison panel (side-by-side metrics, overlay plots)
- [ ] Energy balance visualization (Sankey diagram or stacked bar)
- [ ] Report generation (PDF with all results + methodology)

### Phase 5: Optimization + Advanced Features (Days 18–22)
> Differentiation features.

- [ ] Parametric sweep engine (vary 1-3 variables, grid search)
- [ ] Multi-objective optimization (pymoo NSGA-II)
- [ ] Pareto-front visualization
- [ ] Design recommendation ranking
- [ ] Additional shelter shapes (L-shape, Quonset approximation)

### Phase 6: Polish, Validation, Documentation (Days 22–25)
> Production readiness.

- [ ] BESTEST validation documentation
- [ ] User manual / help documentation
- [ ] Error handling hardening
- [ ] UI/UX polish and responsiveness
- [ ] Performance optimization (caching, lazy loading)
- [ ] Demo preparation (pre-built scenarios for Ladakh, Jaisalmer, Shimla)
- [ ] Final testing and bug fixes

---

## 10. Key Architectural Decisions

### Decision 1: EnergyPlus as the sole simulation engine
**Rationale:** EnergyPlus is the only freely available, open-source simulation engine that is:
- Validated against ASHRAE Standard 140 (BESTEST)
- Capable of transient multi-zone heat balance simulation
- Able to model solar distribution, thermal mass, ground coupling, and infiltration
- Scriptable via IDF/epJSON text-based input
- Accepted by the building science community

**Alternatives considered and rejected:**
- *Custom Python solver:* Scientifically indefensible, would require years of validation.
- *TRNSYS:* Commercial license, not freely available.
- *ESP-r:* Smaller community, less tooling support.
- *OpenStudio:* Good SDK, but adds a layer of abstraction over EnergyPlus that we don't need. We use eppy/geomeppy for direct IDF control instead.

### Decision 2: Parametric geometry, not freeform CAD
**Rationale:** Free-form 3D modeling requires a full CAD frontend (Revit, SketchUp, Blender). This is infeasible for a hackathon timeline. Instead, we define shelter shapes parametrically: the user specifies length, width, height, roof pitch, and the system generates the 3D geometry automatically.

### Decision 3: Web-based UI
**Rationale:** Accessibility. A judge or DRDO evaluator should be able to open a browser and use the tool without installing Python, EnergyPlus, or any desktop software. The simulation backend runs on a server.

### Decision 4: No HVAC modeling
**Rationale:** The problem statement asks for "self-sufficient passive shelter" design. Adding HVAC systems would distract from the core objective and massively increase complexity.

---

## 11. Directory Structure (Proposed)

```
SIH 2026/
├── docs/                          # Documentation
│   ├── PROJECT_OVERVIEW.md        # This file
│   ├── ARCHITECTURE.md            # Detailed architecture (to be created)
│   └── VALIDATION.md              # BESTEST validation results
│
├── backend/                       # Python backend
│   ├── app/
│   │   ├── main.py                # FastAPI application entry
│   │   ├── api/                   # REST API routes
│   │   │   ├── shelters.py
│   │   │   ├── simulations.py
│   │   │   ├── materials.py
│   │   │   ├── weather.py
│   │   │   ├── comparisons.py
│   │   │   └── reports.py
│   │   ├── models/                # SQLAlchemy ORM models
│   │   ├── schemas/               # Pydantic schemas
│   │   ├── services/              # Business logic
│   │   │   ├── geometry/          # Parametric geometry engine
│   │   │   ├── idf_generator/     # EnergyPlus IDF construction
│   │   │   ├── simulation/        # EP execution + result parsing
│   │   │   ├── comfort/           # Thermal comfort calculations
│   │   │   ├── optimization/      # Parametric + GA optimization
│   │   │   └── reporting/         # PDF report generation
│   │   ├── data/                  # Seed data
│   │   │   ├── materials/         # Material property database (JSON/YAML)
│   │   │   └── weather/           # EPW files
│   │   └── core/                  # Config, database, dependencies
│   ├── tests/
│   │   ├── test_geometry.py
│   │   ├── test_idf_generator.py
│   │   ├── test_simulation.py
│   │   └── test_bestest.py        # BESTEST validation tests
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                      # Next.js frontend
│   ├── src/
│   │   ├── app/                   # Next.js app router pages
│   │   ├── components/            # React components
│   │   │   ├── shelter-designer/
│   │   │   ├── model-viewer/      # Three.js 3D viewer
│   │   │   ├── results/           # Charts and dashboards
│   │   │   ├── comparison/
│   │   │   └── ui/                # Shared UI primitives
│   │   ├── lib/                   # Utilities, API client
│   │   └── styles/                # CSS design system
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## 12. Success Criteria

For this project to be considered successful (and defensible before DRDO judges), it must demonstrate:

1. **Scientific integrity:** Every simulation result traces to EnergyPlus + real weather data + published material properties. Nothing is fabricated.
2. **BESTEST compliance:** At least one ASHRAE 140 qualification case (e.g., Case 600) passes through our pipeline and produces results within the published reference range.
3. **End-to-end workflow:** A user can define a shelter for Ladakh, run a simulation, see indoor temperature predictions, assess thermal comfort, and compare two designs — entirely through the web UI.
4. **Engineering insight:** The tool must reveal actionable design insight — e.g., "South-facing orientation with 300 mm rammed-earth walls and 20% WWR achieves 78% comfort hours vs. 42% for the baseline."
5. **Transparency:** All assumptions, data sources, and limitations are documented. No black boxes.

---

## 13. What We Will NOT Do

To maintain engineering credibility:

- No custom finite-element / finite-difference thermal solver
- No fabricated material properties
- No fabricated weather data
- No interpolated or generated EPW files
- No invented validation metrics or accuracy percentages
- No HVAC system modeling
- No structural analysis
- No cost estimation (unless based on real market data)
- No "AI-powered" claims without substantive ML models behind them
- No CFD simulation (ANSYS-class problems are out of scope for a web tool)

---

*This document will be updated as the project progresses. Next step: detailed architecture document and implementation plan upon approval.*
