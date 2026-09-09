# Technology Stack

**SIH 2026 — Problem Statement 26051**  
**Software Based Model Development for Design of Area Specific Shelter for Thermal Comfort Maintenance**

**Document Version:** 0.1  
**Date:** 2026-09-09  

---

## Table of Contents

1. [Stack Summary](#1-stack-summary)
2. [Frontend](#2-frontend)
3. [Backend](#3-backend)
4. [Database & Caching](#4-database--caching)
5. [Simulation Engines](#5-simulation-engines)
6. [Scientific Computing](#6-scientific-computing)
7. [Weather Data](#7-weather-data)
8. [Optimization](#8-optimization)
9. [Reporting](#9-reporting)
10. [Background Processing](#10-background-processing)
11. [DevOps & Infrastructure](#11-devops--infrastructure)
12. [Testing](#12-testing)
13. [Development Tools](#13-development-tools)
14. [Dependency Matrix](#14-dependency-matrix)
15. [Version Pinning Strategy](#15-version-pinning-strategy)
16. [License Audit](#16-license-audit)

---

## 1. Stack Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  TypeScript · Next.js 14 · React 18 · Tailwind CSS · shadcn/ui │
│  Three.js · React Three Fiber · Drei · Recharts · Plotly.js    │
│  React Hook Form · Zod · Zustand · TanStack Query              │
├─────────────────────────────────────────────────────────────────┤
│                         BACKEND                                 │
│  Python 3.11+ · FastAPI · Pydantic v2 · SQLAlchemy 2.0         │
│  Alembic · Celery · pythermalcomfort · eppy · geomeppy          │
│  WeasyPrint · Jinja2                                            │
├─────────────────────────────────────────────────────────────────┤
│                      SCIENTIFIC                                 │
│  NumPy · Pandas · SciPy · pymoo · Matplotlib · pyarrow          │
├─────────────────────────────────────────────────────────────────┤
│                   DATA & MESSAGING                              │
│  PostgreSQL 16 · Redis 7 · Parquet (via pyarrow)                │
├─────────────────────────────────────────────────────────────────┤
│                  SIMULATION ENGINES                             │
│  EnergyPlus 24.2 · OpenStudio 3.8 · ANSYS (optional, licensed) │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE                               │
│  Docker · Docker Compose · Nginx · Linux (Ubuntu 22.04)         │
│  GitHub Actions                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend

### 2.1 Core Framework

| Package | Version | Purpose | Install |
|---|---|---|---|
| `next` | `^14.2` | React meta-framework (App Router, SSR, API routes) | `npm install next` |
| `react` | `^18.3` | UI library | (peer dep of next) |
| `react-dom` | `^18.3` | DOM rendering | (peer dep of next) |
| `typescript` | `^5.5` | Type safety | `npm install -D typescript` |

### 2.2 Styling & UI Components

| Package | Version | Purpose | Install |
|---|---|---|---|
| `tailwindcss` | `^3.4` | Utility-first CSS framework | `npm install -D tailwindcss postcss autoprefixer` |
| `shadcn/ui` | latest | Accessible component library (Radix UI primitives) | `npx shadcn-ui@latest init` |
| `@radix-ui/*` | (managed by shadcn) | Unstyled accessible UI primitives | (installed by shadcn) |
| `lucide-react` | `^0.400` | Icon library | `npm install lucide-react` |
| `tailwind-merge` | `^2.3` | Conditional Tailwind class merging | `npm install tailwind-merge` |
| `clsx` | `^2.1` | Conditional class utility | `npm install clsx` |
| `class-variance-authority` | `^0.7` | Component variant definitions | `npm install class-variance-authority` |

### 2.3 Forms & Validation

| Package | Version | Purpose | Install |
|---|---|---|---|
| `react-hook-form` | `^7.52` | Performant form state management | `npm install react-hook-form` |
| `@hookform/resolvers` | `^3.6` | Schema validation integration | `npm install @hookform/resolvers` |
| `zod` | `^3.23` | TypeScript-first schema validation | `npm install zod` |

### 2.4 State Management

| Package | Version | Purpose | Install |
|---|---|---|---|
| `zustand` | `^4.5` | Lightweight global state | `npm install zustand` |
| `@tanstack/react-query` | `^5.50` | Server state, caching, refetching | `npm install @tanstack/react-query` |
| `immer` | `^10.1` | Immutable state helper (for Zustand) | `npm install immer` |

### 2.5 3D Visualization

| Package | Version | Purpose | Install |
|---|---|---|---|
| `three` | `^0.166` | WebGL 3D engine | `npm install three` |
| `@react-three/fiber` | `^8.16` | React renderer for Three.js | `npm install @react-three/fiber` |
| `@react-three/drei` | `^9.109` | Helpers: OrbitControls, Text, Grid, etc. | `npm install @react-three/drei` |
| `@types/three` | `^0.166` | TypeScript types for Three.js | `npm install -D @types/three` |

### 2.6 Charts & Data Visualization

| Package | Version | Purpose | Install |
|---|---|---|---|
| `recharts` | `^2.12` | Line charts, bar charts, area charts | `npm install recharts` |
| `plotly.js` | `^2.33` | Heatmaps, Sankey diagrams, 3D surface plots | `npm install plotly.js-dist-min` |
| `react-plotly.js` | `^2.6` | React wrapper for Plotly | `npm install react-plotly.js` |

**When to use which:**

| Chart Type | Library | Rationale |
|---|---|---|
| Temperature time-series | Recharts | Simple, performant, good tooltips |
| Heat flow bar charts | Recharts | Standard bar chart |
| Monthly comparison | Recharts | Grouped bar chart |
| 8760-hour comfort heatmap | Plotly | Heatmap with 365×24 cells requires Plotly's canvas rendering |
| Energy balance Sankey | Plotly | Plotly has built-in Sankey support |
| Pareto front scatter | Plotly | Interactive hover on optimization results |

### 2.7 HTTP & Real-Time

| Package | Version | Purpose | Install |
|---|---|---|---|
| `axios` | `^1.7` | HTTP client (used by TanStack Query) | `npm install axios` |
| Native `WebSocket` | — | Real-time simulation progress | Built-in browser API |

### 2.8 Utilities

| Package | Version | Purpose | Install |
|---|---|---|---|
| `date-fns` | `^3.6` | Date formatting | `npm install date-fns` |
| `uuid` | `^10.0` | Client-side UUID generation | `npm install uuid @types/uuid` |
| `file-saver` | `^2.0` | Download generated reports | `npm install file-saver @types/file-saver` |

---

## 3. Backend

### 3.1 Core Framework

| Package | Version | Purpose | Install |
|---|---|---|---|
| `python` | `3.11+` | Language runtime | System install |
| `fastapi` | `^0.111` | Async web framework | `pip install fastapi` |
| `uvicorn[standard]` | `^0.30` | ASGI server | `pip install uvicorn[standard]` |
| `pydantic` | `^2.8` | Data validation, settings management | (dep of FastAPI) |
| `pydantic-settings` | `^2.3` | Environment-based configuration | `pip install pydantic-settings` |
| `python-multipart` | `^0.0.9` | File upload support | `pip install python-multipart` |

### 3.2 Database & ORM

| Package | Version | Purpose | Install |
|---|---|---|---|
| `sqlalchemy` | `^2.0` | ORM with async support | `pip install sqlalchemy` |
| `asyncpg` | `^0.29` | Async PostgreSQL driver | `pip install asyncpg` |
| `psycopg2-binary` | `^2.9` | Sync PostgreSQL driver (for Celery workers) | `pip install psycopg2-binary` |
| `alembic` | `^1.13` | Database migrations | `pip install alembic` |
| `greenlet` | `^3.0` | Required by SQLAlchemy async | (dep of sqlalchemy) |

### 3.3 Authentication

| Package | Version | Purpose | Install |
|---|---|---|---|
| `python-jose[cryptography]` | `^3.3` | JWT encoding/decoding | `pip install python-jose[cryptography]` |
| `passlib[bcrypt]` | `^1.7` | Password hashing (bcrypt) | `pip install passlib[bcrypt]` |

### 3.4 EnergyPlus Integration

| Package | Version | Purpose | Install |
|---|---|---|---|
| `eppy` | `^0.5` | EnergyPlus IDF file reading/writing | `pip install eppy` |
| `geomeppy` | `^0.5` | IDF geometry manipulation, surface intersection/matching | `pip install geomeppy` |

**Note:** `geomeppy` requires `shapely` and `numpy`. These are installed as transitive dependencies.

### 3.5 OpenStudio Integration

| Package | Version | Purpose | Install |
|---|---|---|---|
| `openstudio` | `^3.8` | OpenStudio Python bindings | `pip install openstudio` |

**Note:** The `openstudio` package bundles its own EnergyPlus version. When using the OpenStudio adapter, we use OpenStudio's bundled EnergyPlus. When using the direct EnergyPlus adapter, we use the separately installed EnergyPlus. Both paths are valid.

### 3.6 ANSYS Integration (Optional)

| Package | Version | Purpose | Install | License |
|---|---|---|---|---|
| `ansys-fluent-core` | `^0.24` | PyFluent — Fluent Python API | `pip install ansys-fluent-core` | ANSYS commercial |
| `ansys-mapdl-core` | `^0.68` | PyMAPDL — Mechanical APDL Python API | `pip install ansys-mapdl-core` | ANSYS commercial |
| `ansys-dpf-core` | `^0.12` | Data Processing Framework (result extraction) | `pip install ansys-dpf-core` | ANSYS commercial |

> These are **optional dependencies**. The backend must start and function without them. The adapter performs a runtime import check and gracefully degrades.

### 3.7 Thermal Comfort

| Package | Version | Purpose | Install |
|---|---|---|---|
| `pythermalcomfort` | `^2.10` | PMV/PPD, Adaptive Comfort, SET, UTCI | `pip install pythermalcomfort` |

### 3.8 File Processing

| Package | Version | Purpose | Install |
|---|---|---|---|
| `python-dotenv` | `^1.0` | .env file loading | `pip install python-dotenv` |
| `jinja2` | `^3.1` | HTML template engine (for reports) | `pip install jinja2` |
| `aiofiles` | `^23.2` | Async file I/O | `pip install aiofiles` |

### 3.9 WebSocket & Real-Time

| Package | Version | Purpose | Install |
|---|---|---|---|
| `websockets` | `^12.0` | WebSocket protocol support | (dep of uvicorn[standard]) |
| `redis[hiredis]` | `^5.0` | Redis client with Pub/Sub for progress relay | `pip install redis[hiredis]` |

---

## 4. Database & Caching

### 4.1 PostgreSQL

| Component | Version | Purpose |
|---|---|---|
| PostgreSQL | `16` | Primary relational database |
| Docker image | `postgres:16-alpine` | Container deployment |

**Configuration highlights:**
- `max_connections = 100`
- `shared_buffers = 256MB`
- `work_mem = 16MB`
- Extension: `uuid-ossp` (for UUID generation)
- Extension: `pg_trgm` (for material name fuzzy search)

### 4.2 Redis

| Component | Version | Purpose |
|---|---|---|
| Redis | `7.x` | Celery broker, result backend, Pub/Sub, caching |
| Docker image | `redis:7-alpine` | Container deployment |

**Database allocation:**
- DB 0: Celery message broker
- DB 1: Celery result backend
- DB 2: Application cache (weather data, climate zone lookups)
- DB 3: Pub/Sub channels (simulation progress)

---

## 5. Simulation Engines

### 5.1 EnergyPlus

| Property | Value |
|---|---|
| Version | **24.2.0** (latest stable) |
| Source | https://energyplus.net/downloads |
| Installation | Official `.sh` installer (Linux) or `.exe` (Windows) |
| License | BSD-3-Clause (free, open-source) |
| Required files | `energyplus` (binary), `Energy+.idd` (data dictionary), `WeatherData/` |
| Integration | Subprocess execution (`subprocess.run`) |
| Input format | IDF (Input Data File) or epJSON |
| Output files | `.csv`, `.sql`, `.eso`, `.err`, `.end`, `.htm` |

**Environment variable:** `ENERGYPLUS_PATH=/opt/EnergyPlus-24-2-0`

### 5.2 OpenStudio

| Property | Value |
|---|---|
| Version | **3.8.0** |
| Source | https://github.com/NREL/OpenStudio/releases |
| Python bindings | `pip install openstudio` |
| License | BSD-3-Clause (free, open-source) |
| Integration | Python SDK (`openstudio` package) + CLI (`openstudio` command) |
| Input format | OSM (OpenStudio Model) |
| Forward translation | OSM → IDF (via `ForwardTranslator`) |

### 5.3 ANSYS (Optional)

| Property | Value |
|---|---|
| Products | Fluent (CFD), Mechanical (FEA) |
| Version | 2024 R2+ |
| License | **Commercial** — requires ANSYS license server |
| Integration | PyANSYS ecosystem (`ansys-fluent-core`, `ansys-mapdl-core`) |
| Connection | gRPC (PyFluent launches Fluent server, connects via gRPC) |
| Availability | **Optional** — platform functions fully without it |

**Environment variable:** `ANSYS_INSTALL_PATH` (empty = ANSYS features disabled)

---

## 6. Scientific Computing

| Package | Version | Purpose | Install |
|---|---|---|---|
| `numpy` | `^1.26` | Array operations, vertex math, coordinate transforms | `pip install numpy` |
| `pandas` | `^2.2` | Time-series data manipulation, result aggregation | `pip install pandas` |
| `scipy` | `^1.13` | Interpolation, statistical analysis | `pip install scipy` |
| `pyarrow` | `^16.0` | Parquet file I/O for time-series storage | `pip install pyarrow` |
| `matplotlib` | `^3.9` | Server-side chart rendering for PDF reports | `pip install matplotlib` |
| `shapely` | `^2.0` | 2D geometry operations (surface intersection) | (dep of geomeppy) |

---

## 7. Weather Data

### 7.1 EPW File Format
- **Format:** EnergyPlus Weather file (`.epw`)
- **Source:** Climate.OneBuilding.org (TMYx), Ladybug Tools EPW Map
- **Parser:** Custom Python parser (EPW format is documented CSV with header)
- **Fields used:** Dry-bulb temp, dew-point, RH, atmospheric pressure, GHI, DNI, DHI, wind speed, wind direction

### 7.2 NASA POWER API

| Property | Value |
|---|---|
| Base URL | `https://power.larc.nasa.gov/api/temporal/hourly/point` |
| Community | `SB` (Sustainable Buildings) |
| Format | JSON or CSV |
| Rate limit | ~30 requests/minute |
| Authentication | None required (public API) |
| Parameters | `T2M`, `RH2M`, `WS10M`, `WD10M`, `ALLSKY_SFC_SW_DWN`, `ALLSKY_SFC_SW_DNI`, `ALLSKY_SFC_SW_DIFF`, `PS` |

### 7.3 CSV Import
- **Format:** User-provided CSV with required columns
- **Validation:** 8760 rows, column mapping, range checks

### 7.4 Manual Climate Input
- **Format:** 12 monthly averages (temp, RH, wind, solar)
- **Conversion:** Synthetic EPW generation via sinusoidal diurnal interpolation
- **Labeling:** All results from synthetic EPW carry a "synthetic weather data" disclaimer

---

## 8. Optimization

| Package | Version | Purpose | Install |
|---|---|---|---|
| `pymoo` | `^0.6` | Multi-objective optimization (NSGA-II, NSGA-III) | `pip install pymoo` |

**Algorithms used:**

| Algorithm | Use Case | Population | Generations |
|---|---|---|---|
| Grid Search | 1-2 variables, small space | N/A | N/A |
| Latin Hypercube Sampling | 3+ variables, sampling | N/A (sample size configurable) | N/A |
| NSGA-II | Multi-objective (2 objectives) | 20-50 | 20-50 |

---

## 9. Reporting

| Package | Version | Purpose | Install |
|---|---|---|---|
| `weasyprint` | `^62.0` | HTML/CSS → PDF conversion | `pip install weasyprint` |
| `jinja2` | `^3.1` | HTML template engine | `pip install jinja2` |
| `matplotlib` | `^3.9` | Server-side chart rendering to PNG | `pip install matplotlib` |

**WeasyPrint system dependencies (Ubuntu):**
```bash
apt-get install -y libpango1.0-dev libcairo2-dev libgdk-pixbuf2.0-dev
```

---

## 10. Background Processing

### 10.1 Celery

| Package | Version | Purpose | Install |
|---|---|---|---|
| `celery` | `^5.4` | Distributed task queue | `pip install celery` |
| `redis` | `^5.0` | Celery broker + result backend | `pip install redis[hiredis]` |

### 10.2 Task Queues

| Queue | Worker Concurrency | Purpose |
|---|---|---|
| `simulation` | 2 per worker | EnergyPlus / OpenStudio execution |
| `optimization` | 1 per worker | Multi-run optimization loops |
| `weather` | 2 per worker | NASA POWER API fetches, EPW conversion |
| `reporting` | 2 per worker | PDF/HTML report generation |
| `maintenance` | 1 per worker | File cleanup, health checks |

---

## 11. DevOps & Infrastructure

### 11.1 Containerization

| Component | Image | Purpose |
|---|---|---|
| Frontend | `node:20-alpine` (build), `nginx:alpine` (serve) | Next.js production build |
| Backend | `python:3.11-slim` + EnergyPlus | FastAPI + EnergyPlus |
| Celery Workers | Same as Backend | Share codebase + EnergyPlus |
| PostgreSQL | `postgres:16-alpine` | Database |
| Redis | `redis:7-alpine` | Message broker + cache |
| Nginx | `nginx:alpine` | Reverse proxy, TLS termination |

### 11.2 Docker Compose Services

| Service | Replicas | Resources (recommended) |
|---|---|---|
| `nginx` | 1 | 128 MB RAM |
| `frontend` | 1 | 256 MB RAM |
| `backend` | 1 | 512 MB RAM |
| `celery-worker-sim` | 1-2 | 1 GB RAM per worker |
| `celery-worker-opt` | 1 | 2 GB RAM |
| `celery-worker-misc` | 1 | 512 MB RAM |
| `celery-beat` | 1 | 128 MB RAM |
| `postgres` | 1 | 512 MB RAM |
| `redis` | 1 | 256 MB RAM |

**Total recommended:** 4-6 GB RAM minimum for development, 8+ GB for production with concurrent simulations.

### 11.3 CI/CD

| Stage | Tool | Actions |
|---|---|---|
| Lint (Python) | `ruff` | Code style, import sorting |
| Lint (TypeScript) | `eslint` + `prettier` | Code style |
| Type check (Python) | `mypy` | Static type checking |
| Type check (TypeScript) | `tsc --noEmit` | TypeScript compiler check |
| Unit tests | `pytest` | Geometry, IDF generation, comfort, materials |
| Integration tests | `pytest` + TestClient | API endpoint tests |
| Build (Frontend) | `next build` | Verify production build succeeds |
| Build (Backend) | `docker build` | Verify Docker image builds |
| BESTEST validation | `pytest` (on CI with EnergyPlus) | Run ASHRAE 140 cases on every PR |

### 11.4 Host OS

| Property | Value |
|---|---|
| OS | Ubuntu 22.04 LTS (recommended) |
| Architecture | x86_64 |
| EnergyPlus compatibility | EnergyPlus 24.2 ships `.deb` and `.sh` installers for Ubuntu 22.04 |
| Python compatibility | Python 3.11 available via `deadsnakes` PPA or Docker |

---

## 12. Testing

### 12.1 Backend Testing

| Package | Version | Purpose | Install |
|---|---|---|---|
| `pytest` | `^8.2` | Test framework | `pip install pytest` |
| `pytest-asyncio` | `^0.23` | Async test support | `pip install pytest-asyncio` |
| `pytest-cov` | `^5.0` | Code coverage | `pip install pytest-cov` |
| `httpx` | `^0.27` | Async HTTP client for API tests | `pip install httpx` |
| `factory-boy` | `^3.3` | Test data factories | `pip install factory-boy` |
| `faker` | `^25.0` | Fake data generation | `pip install faker` |

### 12.2 Frontend Testing

| Package | Version | Purpose | Install |
|---|---|---|---|
| `vitest` | `^1.6` | Unit test runner | `npm install -D vitest` |
| `@testing-library/react` | `^16.0` | React component testing | `npm install -D @testing-library/react` |
| `@playwright/test` | `^1.45` | E2E browser testing | `npm install -D @playwright/test` |
| `msw` | `^2.3` | API mocking for component tests | `npm install -D msw` |

### 12.3 Code Quality

| Tool | Purpose | Install |
|---|---|---|
| `ruff` | Python linting + formatting | `pip install ruff` |
| `mypy` | Python static type checking | `pip install mypy` |
| `eslint` | TypeScript linting | `npm install -D eslint` |
| `prettier` | Code formatting | `npm install -D prettier` |

---

## 13. Development Tools

| Tool | Purpose |
|---|---|
| VS Code | IDE (recommended extensions: Python, ESLint, Prettier, Tailwind CSS IntelliSense) |
| Docker Desktop | Local container management |
| pgAdmin or DBeaver | PostgreSQL GUI client |
| RedisInsight | Redis GUI client |
| Postman or Bruno | API testing |
| IDF Editor (EnergyPlus) | Manual IDF inspection/editing during development |

---

## 14. Dependency Matrix

This matrix shows which subsystem depends on which packages:

| Subsystem | Python Packages | NPM Packages | External Software |
|---|---|---|---|
| **API Layer** | fastapi, uvicorn, pydantic | — | — |
| **Database** | sqlalchemy, asyncpg, alembic | — | PostgreSQL 16 |
| **Auth** | python-jose, passlib | — | — |
| **Geometry Engine** | numpy, shapely | three, @react-three/fiber, drei | — |
| **IDF Generation** | eppy, geomeppy, numpy | — | EnergyPlus (for IDD file) |
| **OpenStudio** | openstudio | — | OpenStudio SDK |
| **ANSYS** | ansys-fluent-core, ansys-mapdl-core | — | ANSYS Fluent/Mechanical |
| **Simulation Runner** | (subprocess) | — | EnergyPlus binary |
| **Result Parsing** | pandas, numpy, pyarrow | — | — |
| **Thermal Comfort** | pythermalcomfort, numpy | — | — |
| **Weather** | pandas, numpy, requests | — | — (NASA POWER is HTTP API) |
| **Optimization** | pymoo, numpy | — | — |
| **Reporting** | weasyprint, jinja2, matplotlib | — | System libs (pango, cairo) |
| **Background Jobs** | celery, redis | — | Redis 7 |
| **Frontend Core** | — | next, react, typescript | Node.js 20 |
| **Frontend UI** | — | tailwindcss, shadcn/ui, radix-ui | — |
| **Frontend 3D** | — | three, r3f, drei | — |
| **Frontend Charts** | — | recharts, plotly.js, react-plotly.js | — |
| **Frontend Forms** | — | react-hook-form, zod, zustand | — |

---

## 15. Version Pinning Strategy

### Python (`requirements.txt`)
- **Pin major.minor** with caret (`^`): e.g., `fastapi>=0.111,<0.112`
- **Pin exact** for simulation-critical packages: `eppy==0.5.63`, `geomeppy==0.5.2`
- Use `pip-compile` (from `pip-tools`) to generate a locked `requirements.lock` file
- Regenerate lock file weekly or when adding new dependencies

### Node.js (`package.json`)
- Use caret ranges (`^`) for all packages
- Commit `package-lock.json` for deterministic installs
- Run `npm audit` weekly

### External Software
- **EnergyPlus:** Pin to 24.2.0 — simulation results are version-dependent
- **OpenStudio:** Pin to 3.8.x — must match compatible EnergyPlus version
- **PostgreSQL:** Pin to 16.x — use Docker image tag
- **Redis:** Pin to 7.x — use Docker image tag

---

## 16. License Audit

All dependencies must be compatible with open-source distribution. ANSYS is the sole exception (commercial, optional).

| Package | License | Compatible | Notes |
|---|---|---|---|
| FastAPI | MIT | ✅ | |
| SQLAlchemy | MIT | ✅ | |
| Pydantic | MIT | ✅ | |
| Celery | BSD | ✅ | |
| EnergyPlus | BSD-3-Clause | ✅ | DOE open-source |
| OpenStudio | BSD-3-Clause | ✅ | NREL open-source |
| eppy | MIT | ✅ | |
| geomeppy | MIT | ✅ | |
| pythermalcomfort | MIT | ✅ | |
| pymoo | Apache-2.0 | ✅ | |
| NumPy | BSD | ✅ | |
| Pandas | BSD | ✅ | |
| SciPy | BSD | ✅ | |
| WeasyPrint | BSD | ✅ | |
| Three.js | MIT | ✅ | |
| React | MIT | ✅ | |
| Next.js | MIT | ✅ | |
| Tailwind CSS | MIT | ✅ | |
| Recharts | MIT | ✅ | |
| Plotly.js | MIT | ✅ | |
| PostgreSQL | PostgreSQL License | ✅ | |
| Redis | RSALv2 + SSPLv1 (v7+) | ✅ for our use | Server-side use is fine; we are not offering Redis-as-a-service |
| ANSYS | **Commercial** | ⚠️ | Optional; requires separate license; not bundled |

---

## Appendix A: requirements.txt (Backend)

```txt
# Core
fastapi>=0.111,<1.0
uvicorn[standard]>=0.30,<1.0
pydantic>=2.8,<3.0
pydantic-settings>=2.3,<3.0
python-multipart>=0.0.9

# Database
sqlalchemy>=2.0,<3.0
asyncpg>=0.29,<1.0
psycopg2-binary>=2.9,<3.0
alembic>=1.13,<2.0

# Auth
python-jose[cryptography]>=3.3,<4.0
passlib[bcrypt]>=1.7,<2.0

# EnergyPlus
eppy>=0.5,<1.0
geomeppy>=0.5,<1.0

# OpenStudio
openstudio>=3.8,<4.0

# Scientific
numpy>=1.26,<2.0
pandas>=2.2,<3.0
scipy>=1.13,<2.0
pyarrow>=16.0,<17.0
matplotlib>=3.9,<4.0

# Thermal Comfort
pythermalcomfort>=2.10,<3.0

# Optimization
pymoo>=0.6,<1.0

# Background Processing
celery>=5.4,<6.0
redis[hiredis]>=5.0,<6.0

# Reporting
weasyprint>=62.0,<63.0
jinja2>=3.1,<4.0

# Utilities
aiofiles>=23.2,<24.0
python-dotenv>=1.0,<2.0
httpx>=0.27,<1.0
```

## Appendix B: package.json Dependencies (Frontend)

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "@tanstack/react-query": "^5.50",
    "zustand": "^4.5",
    "immer": "^10.1",
    "react-hook-form": "^7.52",
    "@hookform/resolvers": "^3.6",
    "zod": "^3.23",
    "three": "^0.166",
    "@react-three/fiber": "^8.16",
    "@react-three/drei": "^9.109",
    "recharts": "^2.12",
    "plotly.js-dist-min": "^2.33",
    "react-plotly.js": "^2.6",
    "axios": "^1.7",
    "lucide-react": "^0.400",
    "tailwind-merge": "^2.3",
    "clsx": "^2.1",
    "class-variance-authority": "^0.7",
    "date-fns": "^3.6",
    "uuid": "^10.0",
    "file-saver": "^2.0"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "tailwindcss": "^3.4",
    "postcss": "^8.4",
    "autoprefixer": "^10.4",
    "@types/three": "^0.166",
    "@types/react": "^18.3",
    "@types/react-dom": "^18.3",
    "@types/uuid": "^10.0",
    "@types/file-saver": "^2.0",
    "eslint": "^8.57",
    "eslint-config-next": "^14.2",
    "prettier": "^3.3",
    "prettier-plugin-tailwindcss": "^0.6",
    "vitest": "^1.6",
    "@testing-library/react": "^16.0",
    "@playwright/test": "^1.45",
    "msw": "^2.3"
  }
}
```

---

*This document should be read alongside [SYSTEM_ARCHITECTURE.md](file:///c:/CODINGG/HACKATHON/SIH%202026/docs/SYSTEM_ARCHITECTURE.md) for how these technologies are wired together, and [PROJECT_OVERVIEW.md](file:///c:/CODINGG/HACKATHON/SIH%202026/docs/PROJECT_OVERVIEW.md) for problem context.*
