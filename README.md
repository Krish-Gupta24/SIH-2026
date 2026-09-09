# Area-Specific Shelter Design & Thermal Comfort Platform

[![SIH 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://sih.gov.in)
[![Problem Statement](https://img.shields.io/badge/Problem%20Statement-26051-blue.svg)](docs/PROJECT_OVERVIEW.md)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An engineering and computational platform for designing and thermally analyzing area-specific shelters, optimized particularly for high-altitude cold climatic regions (such as Ladakh) while remaining adaptable across all climatic zones.

---

## 1. Project Overview

This repository implements the complete solution for **Smart India Hackathon (SIH) 2026 Problem Statement 26051**:
> *"Software Based Model Development for Design of Area Specific Shelter for Thermal Comfort Maintenance."*

### Key Capabilities
- **Parametric 3D Shelter Modeler:** Dynamic real-time 3D geometry manipulation (Three.js / React Three Fiber).
- **Canonical Domain Model:** Single source of truth (`ShelterModel`) driving 3D rendering, thermal simulation, persistence, optimization, and reporting without discrepancies.
- **Physical Thermal Simulation:** EnergyPlus integration calculating zone air heat balance, conduction transfer functions (CTF), solar gains, and PMV/PPD comfort metrics.
- **Microclimate & Weather Integration:** Support for standard EPW files and automated satellite data retrieval via the NASA POWER API.
- **Multi-Objective Optimization:** Genetic algorithm (NSGA-II) engine optimizing insulation thickness, thermal mass, window-to-wall ratios (WWR), and orientation against heating load and life-cycle cost.
- **Auditability & Provenance:** Strict zero-fabrication engineering rules with persistent tracking of weather sources, material physical properties, and engine log outputs.

---

## 2. Repository Structure

```
├── frontend/             # Next.js / React / TypeScript feature-based frontend
│   ├── src/
│   │   ├── app/          # Next.js App Router (pages & layouts)
│   │   ├── components/   # UI design system & shared layout primitives
│   │   ├── features/     # Feature-scoped modules (editor, simulation, results, etc.)
│   │   ├── hooks/        # Reusable React hooks
│   │   ├── lib/          # API client, math utilities, unit converters
│   │   ├── store/        # Zustand global state management
│   │   └── types/        # TypeScript interfaces matching canonical ShelterModel
│   └── package.json
│
├── backend/              # FastAPI Python backend platform
│   ├── api/              # REST & WebSocket API route controllers (v1)
│   ├── core/             # Application configuration, security, DB session setup
│   ├── models/           # SQLAlchemy ORM database models
│   ├── optimization/     # Multi-objective optimization problem definitions (NSGA-II)
│   ├── reports/          # Report generation pipeline (PDF/HTML/CSV)
│   ├── repositories/     # Data access layer (CRUD abstractions)
│   ├── schemas/          # Pydantic v2 schemas and validation contracts
│   ├── services/         # Domain business logic orchestration
│   ├── simulation/       # Simulation orchestrator, Celery task bridge
│   ├── validation/       # Engineering validation rules & physical checks
│   ├── weather/          # EPW parser and NASA POWER climate connector
│   └── pyproject.toml
│
├── simulation/           # Building physics & simulation engine integration layer
│   ├── generators/       # ShelterModel -> EnergyPlus IDF / epJSON / OSM generators
│   ├── materials/        # Physical materials database & local Ladakh construction library
│   ├── parsers/          # Simulation output extraction (CSV, ESO, SQL)
│   ├── runners/          # Process execution & subprocess wrappers (EnergyPlus, OpenStudio)
│   ├── templates/        # Baseline IDF templates, schedules, and design days
│   ├── test_cases/       # Verified engineering reference models (e.g., ASHRAE 140)
│   ├── validation/       # Thermal balance residual checks & physics verifiers
│   └── weather/          # Standard EPW files and extreme climate design data
│
├── database/             # Relational data layer
│   ├── migrations/       # Alembic database migration scripts
│   └── seeds/            # Initial seeds (standard materials, climate zones, constructions)
│
├── tests/                # Automated testing suite
│   ├── unit/             # Fast unit tests for schemas, math, and validators
│   ├── integration/      # API endpoint and database integration tests
│   ├── simulation/       # EnergyPlus generator, runner, and parser tests
│   └── e2e/              # End-to-end full workflow tests
│
├── scripts/              # Development, seed, and CLI automation utilities
├── docker/               # Dockerfiles and docker-compose configurations
└── docs/                 # Architectural specifications, mathematical models, and rules
    ├── AGENT_RULES.md            # Agent operational constraints
    ├── ENGINEERING_RULES.md      # Scientific & engineering rules (SI units, no fabrication)
    ├── PROJECT_OVERVIEW.md       # Full SIH problem statement & requirements
    ├── SYSTEM_ARCHITECTURE.md    # 12-subsystem platform technical architecture
    ├── TECHNOLOGY_STACK.md       # Technology choices and justifications
    ├── SHELTER_MODEL.md          # Canonical ShelterModel domain specification
    ├── INPUT_SPECIFICATION.md    # Data dictionaries and validation rules
    ├── UNITS_AND_CONVENTIONS.md  # Standardized SI units & coordinate systems
    ├── ENVIRONMENT_REPORT.md     # Development machine inspection & dependency guide
    └── ASSUMPTIONS.md            # Engineering assumptions & boundary limits
```

---

## 3. Engineering & Operational Rules

All development within this repository is governed by the rules codified in:
1. [`ENGINEERING_RULES.md`](ENGINEERING_RULES.md)
   - **Internal SI Units:** All coordinates in meters, temperatures in Celsius or Kelvin, thermal properties in W/(m·K), density in kg/m³, specific heat in J/(kg·K).
   - **Strict Non-Fabrication:** Never synthesize or fake simulation results, weather records, or thermal properties.
   - **Engine Decoupling:** Engine success (process exit code 0) must be distinguished from engineering physical validity (heat balance convergence).
2. [`AGENT_RULES.md`](AGENT_RULES.md)
   - Every simulation result must record the exact engine binary path and version used.
   - Provenance tracking is mandatory for every material and climate dataset.

---

## 4. Quick Start (Development Setup)

### Prerequisites
- **Node.js:** v18+ (Detected host: `v24.7.0`, `npm 11.5.2`)
- **Python:** 3.11 or 3.12 (64-bit recommended)
- **PostgreSQL:** 15+ (Detected host: `18.4`)
- **Redis:** 6+ (or Memurai on Windows)
- **EnergyPlus:** v24.1.0 (recommended)

For comprehensive dependency installation instructions tailored to your machine, consult [`docs/ENVIRONMENT_REPORT.md`](docs/ENVIRONMENT_REPORT.md).

### 1. Environment Configuration
Copy the example environment file and customize it for your local environment:
```bash
cp .env.example .env
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:3000` and communicate with the backend at `http://localhost:8000`.

---

## 5. Documentation Map

- [Project Overview & Scope](docs/PROJECT_OVERVIEW.md)
- [System Architecture](docs/SYSTEM_ARCHITECTURE.md)
- [Canonical Shelter Model](docs/SHELTER_MODEL.md)
- [Input Data Specification](docs/INPUT_SPECIFICATION.md)
- [Units & Conventions](docs/UNITS_AND_CONVENTIONS.md)
- [Engineering Assumptions](docs/ASSUMPTIONS.md)
- [Host Environment Report](docs/ENVIRONMENT_REPORT.md)
