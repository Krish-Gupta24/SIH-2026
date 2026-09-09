# System Architecture

**SIH 2026 — Problem Statement 26051**  
**Software Based Model Development for Design of Area Specific Shelter for Thermal Comfort Maintenance**

**Document Version:** 0.1  
**Date:** 2026-09-09  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Architecture](#5-database-architecture)
6. [3D Shelter Editor](#6-3d-shelter-editor)
7. [Weather Service](#7-weather-service)
8. [Thermal Simulation Layer](#8-thermal-simulation-layer)
9. [EnergyPlus Integration](#9-energyplus-integration)
10. [OpenStudio Integration](#10-openstudio-integration)
11. [ANSYS Integration / Adapter](#11-ansys-integration--adapter)
12. [Optimization Engine](#12-optimization-engine)
13. [Result Processing Pipeline](#13-result-processing-pipeline)
14. [Report Generation](#14-report-generation)
15. [Background Jobs](#15-background-jobs)
16. [File Storage](#16-file-storage)
17. [Authentication](#17-authentication)
18. [Testing Architecture](#18-testing-architecture)
19. [Deployment Architecture](#19-deployment-architecture)
20. [Data Flow — End to End](#20-data-flow--end-to-end)
21. [Inter-Service Communication](#21-inter-service-communication)
22. [Error Handling Strategy](#22-error-handling-strategy)

---

## 1. System Overview

The platform is a **monolithic backend** (Python/FastAPI) with a **decoupled frontend** (Next.js/React) architecture. The backend orchestrates all simulation engines, databases, and background processing. The frontend communicates exclusively via REST API and WebSocket.

### Design Principles

1. **Simulation engines are external processes.** EnergyPlus, OpenStudio, and ANSYS are never embedded — they run as subprocesses or remote services.
2. **Single source of truth is PostgreSQL.** All project state, design definitions, material properties, and simulation results are persisted in the database.
3. **Background jobs for all heavy computation.** No simulation, optimization, or report generation blocks the HTTP request thread.
4. **Adapter pattern for simulation engines.** Each engine (EnergyPlus, OpenStudio, ANSYS) implements a common `SimulationEngine` interface, allowing the orchestration layer to be engine-agnostic.
5. **No fabricated data.** Weather data comes from EPW files or NASA POWER API. Material properties come from published databases. Simulation results come from validated engines.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["Browser (Next.js App)"]
    end

    subgraph "Reverse Proxy"
        Nginx["Nginx"]
    end

    subgraph "Frontend Container"
        NextJS["Next.js SSR Server<br/>(Node.js)"]
    end

    subgraph "Backend Container"
        FastAPI["FastAPI Application"]
        
        subgraph "API Layer"
            AuthAPI["Auth API"]
            ProjectAPI["Project API"]
            ShelterAPI["Shelter API"]
            MaterialAPI["Material API"]
            WeatherAPI["Weather API"]
            SimulationAPI["Simulation API"]
            ComparisonAPI["Comparison API"]
            OptimizationAPI["Optimization API"]
            ReportAPI["Report API"]
        end
        
        subgraph "Service Layer"
            GeometrySvc["Geometry Service"]
            MaterialSvc["Material Service"]
            WeatherSvc["Weather Service"]
            SimOrchestrator["Simulation Orchestrator"]
            ComfortSvc["Comfort Service"]
            ComparisonSvc["Comparison Service"]
            OptimizationSvc["Optimization Service"]
            ReportSvc["Report Service"]
        end
        
        subgraph "Engine Adapters"
            EPAdapter["EnergyPlus Adapter"]
            OSAdapter["OpenStudio Adapter"]
            ANSYSAdapter["ANSYS Adapter"]
        end
    end

    subgraph "Background Workers"
        CeleryWorker["Celery Worker(s)"]
        CeleryBeat["Celery Beat"]
    end

    subgraph "Data Layer"
        PostgreSQL[("PostgreSQL")]
        Redis[("Redis")]
        FileStore["File Storage<br/>(Local / S3)"]
    end

    subgraph "External Engines"
        EnergyPlus["EnergyPlus<br/>v24.2+"]
        OpenStudio["OpenStudio<br/>SDK"]
        ANSYS["ANSYS Fluent/<br/>Mechanical<br/>(Optional)"]
    end

    subgraph "External APIs"
        NASAPower["NASA POWER API"]
        ClimateOB["Climate.OneBuilding.org"]
    end

    Browser --> Nginx
    Nginx --> NextJS
    Nginx --> FastAPI
    
    FastAPI --> PostgreSQL
    FastAPI --> Redis
    FastAPI --> FileStore
    
    CeleryWorker --> PostgreSQL
    CeleryWorker --> Redis
    CeleryWorker --> FileStore
    CeleryWorker --> EnergyPlus
    CeleryWorker --> OpenStudio
    CeleryWorker --> ANSYS
    
    WeatherSvc --> NASAPower
    WeatherSvc --> ClimateOB
    
    SimOrchestrator --> EPAdapter
    SimOrchestrator --> OSAdapter
    SimOrchestrator --> ANSYSAdapter
    
    EPAdapter --> EnergyPlus
    OSAdapter --> OpenStudio
    ANSYSAdapter --> ANSYS
```

---

## 3. Frontend Architecture

### 3.1 Technology Choices

| Concern | Technology | Justification |
|---|---|---|
| Framework | **Next.js 14+** (App Router) | SSR for initial load, API routes for BFF pattern, file-based routing |
| Language | **TypeScript** | Type safety across the entire frontend, Zod schema reuse |
| Styling | **Tailwind CSS** | Utility-first, rapid iteration, consistent design tokens |
| Components | **shadcn/ui** | Accessible, composable, built on Radix UI primitives |
| Forms | **React Hook Form + Zod** | Performant uncontrolled forms with schema-validated inputs |
| State | **Zustand** | Lightweight global state for shelter model, simulation status, comparison data |
| 3D | **Three.js + React Three Fiber + Drei** | Declarative 3D in React; Drei provides controls, helpers, loaders |
| Charts | **Recharts** (primary) + **Plotly** (heatmaps) | Recharts for standard line/bar charts; Plotly for 8760-hour heatmaps and Sankey diagrams |
| HTTP | **TanStack Query (React Query)** | Caching, refetching, optimistic updates, WebSocket integration |
| WebSocket | **Native WebSocket** via custom hook | Real-time simulation progress updates |

### 3.2 Page Structure

```
src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx                    # Authenticated layout with sidebar
│   ├── projects/
│   │   ├── page.tsx                  # Project list
│   │   └── [projectId]/
│   │       ├── page.tsx              # Project overview
│   │       ├── designs/
│   │       │   ├── page.tsx          # Design list for project
│   │       │   ├── new/page.tsx      # Shelter designer (create)
│   │       │   └── [designId]/
│   │       │       ├── page.tsx      # Design detail + 3D view
│   │       │       ├── edit/page.tsx  # Shelter designer (edit)
│   │       │       └── results/
│   │       │           └── page.tsx   # Simulation results dashboard
│   │       ├── compare/page.tsx       # Side-by-side comparison
│   │       ├── optimize/page.tsx      # Optimization configuration + results
│   │       └── reports/page.tsx       # Report generation + download
│   ├── materials/page.tsx             # Material library browser
│   └── weather/page.tsx               # Weather data browser + preview
└── api/                               # Next.js API routes (BFF proxy)
```

### 3.3 Component Architecture

```mermaid
graph TB
    subgraph "Pages"
        DesignerPage["Shelter Designer Page"]
        ResultsPage["Results Dashboard Page"]
        ComparePage["Comparison Page"]
        OptimizePage["Optimization Page"]
    end
    
    subgraph "Feature Components"
        ShelterForm["ShelterDesignerForm<br/>(React Hook Form + Zod)"]
        ModelViewer["ModelViewer3D<br/>(R3F Canvas)"]
        LocationPicker["LocationPicker<br/>(Map + Dropdown)"]
        MaterialPicker["MaterialPicker<br/>(Library Browser)"]
        ConstructionBuilder["ConstructionBuilder<br/>(Layer Stack Editor)"]
        FenestrationEditor["FenestrationEditor<br/>(Window/Door Placement)"]
    end
    
    subgraph "Result Components"
        TempChart["TemperatureTimeSeries<br/>(Recharts)"]
        HeatFlowChart["HeatFlowBreakdown<br/>(Recharts)"]
        ComfortHeatmap["ComfortHeatmap8760<br/>(Plotly)"]
        EnergyBalance["EnergyBalanceSankey<br/>(Plotly)"]
        MetricCards["MetricSummaryCards"]
    end
    
    subgraph "3D Components (R3F)"
        ShelterMesh["ShelterMesh"]
        WallSurface["WallSurface"]
        RoofSurface["RoofSurface"]
        FloorSurface["FloorSurface"]
        WindowMesh["WindowMesh"]
        OrientationGizmo["OrientationGizmo"]
        SunPath["SunPathOverlay"]
    end
    
    subgraph "Shared State (Zustand)"
        ShelterStore["useShelterStore"]
        SimStore["useSimulationStore"]
        CompareStore["useComparisonStore"]
    end

    DesignerPage --> ShelterForm
    DesignerPage --> ModelViewer
    ShelterForm --> LocationPicker
    ShelterForm --> MaterialPicker
    ShelterForm --> ConstructionBuilder
    ShelterForm --> FenestrationEditor
    
    ModelViewer --> ShelterMesh
    ShelterMesh --> WallSurface
    ShelterMesh --> RoofSurface
    ShelterMesh --> FloorSurface
    ShelterMesh --> WindowMesh
    ModelViewer --> OrientationGizmo
    
    ResultsPage --> TempChart
    ResultsPage --> HeatFlowChart
    ResultsPage --> ComfortHeatmap
    ResultsPage --> EnergyBalance
    ResultsPage --> MetricCards
    
    ShelterForm --> ShelterStore
    ModelViewer --> ShelterStore
    ResultsPage --> SimStore
    ComparePage --> CompareStore
```

### 3.4 Zustand Store Design

```typescript
// Simplified type signatures — actual implementation will expand these

interface ShelterStore {
  // Geometry
  shape: 'rectangular' | 'l_shape' | 'quonset' | 'a_frame';
  dimensions: { length: number; width: number; height: number; roofPitch: number };
  orientation: number; // azimuth degrees
  
  // Construction
  wallConstruction: Construction;
  roofConstruction: Construction;
  floorConstruction: Construction;
  
  // Fenestration
  windows: WindowDefinition[];
  doors: DoorDefinition[];
  
  // Location
  location: { lat: number; lon: number; altitude: number; climateZone: string };
  weatherFileId: string | null;
  
  // Actions
  setDimensions: (dims: Partial<Dimensions>) => void;
  addWindow: (wall: WallFace, window: WindowDefinition) => void;
  removeWindow: (id: string) => void;
  setConstruction: (surface: SurfaceType, construction: Construction) => void;
  // ... etc
}

interface SimulationStore {
  activeSimulationId: string | null;
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  results: SimulationResults | null;
  error: string | null;
}

interface ComparisonStore {
  selectedDesignIds: string[];
  comparisonData: ComparisonResult | null;
  addDesign: (id: string) => void;
  removeDesign: (id: string) => void;
}
```

### 3.5 API Client Layer

All backend communication goes through a typed API client built with TanStack Query:

```typescript
// Example query hooks
const useProject = (id: string) => useQuery(['project', id], () => api.projects.get(id));
const useMaterials = (filters: MaterialFilters) => useQuery(['materials', filters], () => api.materials.list(filters));
const useSimulationStatus = (simId: string) => useQuery(['simulation', simId], () => api.simulations.status(simId), { refetchInterval: 2000 });
const useSubmitSimulation = () => useMutation((payload: SimulationRequest) => api.simulations.submit(payload));
```

WebSocket connection for real-time simulation progress:

```typescript
// useSimulationProgress hook
// Connects to ws://{host}/api/v1/simulations/{simId}/progress
// Receives: { status, progress_pct, current_month, elapsed_sec, est_remaining_sec }
```

---

## 4. Backend Architecture

### 4.1 Application Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI app factory, middleware, lifespan
│   ├── config.py                    # Pydantic Settings (env-based config)
│   │
│   ├── api/                         # API routes (thin controllers)
│   │   ├── __init__.py
│   │   ├── deps.py                  # Dependency injection (get_db, get_current_user)
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py            # Aggregates all v1 routers
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── designs.py
│   │   │   ├── materials.py
│   │   │   ├── constructions.py
│   │   │   ├── weather.py
│   │   │   ├── simulations.py
│   │   │   ├── results.py
│   │   │   ├── comparisons.py
│   │   │   ├── optimizations.py
│   │   │   └── reports.py
│   │   └── websocket.py             # WebSocket endpoints (sim progress)
│   │
│   ├── models/                      # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── base.py                  # Declarative base, mixins (timestamps, UUID PK)
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── design.py                # Shelter design (geometry + construction)
│   │   ├── material.py
│   │   ├── construction.py          # Multi-layer construction assembly
│   │   ├── weather.py               # Weather file metadata
│   │   ├── simulation.py            # Simulation job record
│   │   ├── result.py                # Simulation results (summary + time-series ref)
│   │   └── report.py
│   │
│   ├── schemas/                     # Pydantic v2 schemas (request/response DTOs)
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── project.py
│   │   ├── design.py
│   │   ├── geometry.py              # Shelter geometry definitions
│   │   ├── material.py
│   │   ├── construction.py
│   │   ├── weather.py
│   │   ├── simulation.py
│   │   ├── result.py
│   │   ├── comfort.py
│   │   ├── comparison.py
│   │   ├── optimization.py
│   │   └── report.py
│   │
│   ├── services/                    # Business logic layer
│   │   ├── __init__.py
│   │   ├── geometry/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py            # Parametric geometry engine
│   │   │   ├── shapes.py            # Shape generators (rectangular, L, Quonset, A-frame)
│   │   │   ├── surfaces.py          # Surface generation, vertex ordering
│   │   │   ├── fenestration.py      # Window/door placement on surfaces
│   │   │   └── validation.py        # Geometry validation (closure, planarity, area)
│   │   │
│   │   ├── materials/
│   │   │   ├── __init__.py
│   │   │   ├── library.py           # Material CRUD + search
│   │   │   └── validation.py        # Property bounds checking
│   │   │
│   │   ├── weather/
│   │   │   ├── __init__.py
│   │   │   ├── epw_parser.py        # EPW file reading and summary extraction
│   │   │   ├── nasa_power.py        # NASA POWER API client
│   │   │   ├── climate_zones.py     # ASHRAE climate zone lookup
│   │   │   └── converter.py         # NASA POWER / CSV → EPW conversion
│   │   │
│   │   ├── simulation/
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py      # Engine-agnostic simulation dispatcher
│   │   │   ├── engines/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py          # Abstract SimulationEngine interface
│   │   │   │   ├── energyplus/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── adapter.py   # EnergyPlus adapter (implements SimulationEngine)
│   │   │   │   │   ├── idf_generator.py   # Shelter model → IDF
│   │   │   │   │   ├── idf_validator.py   # IDF pre-submission validation
│   │   │   │   │   ├── runner.py          # Subprocess execution + monitoring
│   │   │   │   │   └── parser.py          # ESO/CSV/SQL result parsing
│   │   │   │   ├── openstudio/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── adapter.py   # OpenStudio adapter (implements SimulationEngine)
│   │   │   │   │   ├── osm_generator.py   # Shelter model → OSM
│   │   │   │   │   ├── measures.py        # OpenStudio Measures integration
│   │   │   │   │   └── translator.py      # OSM → IDF forward translation
│   │   │   │   └── ansys/
│   │   │   │       ├── __init__.py
│   │   │   │       ├── adapter.py   # ANSYS adapter (implements SimulationEngine)
│   │   │   │       ├── model_exporter.py  # Geometry → ANSYS mesh input
│   │   │   │       ├── boundary_mapper.py # Thermal BCs from EP results
│   │   │   │       └── result_importer.py # ANSYS results → common format
│   │   │   └── result_processor.py  # Common result normalization
│   │   │
│   │   ├── comfort/
│   │   │   ├── __init__.py
│   │   │   ├── pmv_ppd.py           # ASHRAE 55 PMV/PPD (via pythermalcomfort)
│   │   │   ├── adaptive.py          # EN 16798 Adaptive Comfort
│   │   │   ├── comfort_hours.py     # Comfort hour aggregation
│   │   │   └── degree_hours.py      # Heating/cooling degree-hours
│   │   │
│   │   ├── comparison/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py            # Multi-design comparison logic
│   │   │   └── scoring.py           # Normalized scoring and ranking
│   │   │
│   │   ├── optimization/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py            # Optimization orchestrator
│   │   │   ├── parametric.py        # Grid / LHS parametric sweep
│   │   │   ├── genetic.py           # NSGA-II via pymoo
│   │   │   ├── variables.py         # Optimization variable definitions + constraints
│   │   │   └── objectives.py        # Objective function definitions
│   │   │
│   │   └── reporting/
│   │       ├── __init__.py
│   │       ├── generator.py         # Report orchestration
│   │       ├── templates/           # Jinja2 HTML templates for PDF
│   │       └── charts.py            # Server-side chart rendering (matplotlib)
│   │
│   ├── tasks/                       # Celery task definitions
│   │   ├── __init__.py
│   │   ├── celery_app.py            # Celery application factory
│   │   ├── simulation_tasks.py      # run_simulation, cancel_simulation
│   │   ├── optimization_tasks.py    # run_optimization, run_parametric_sweep
│   │   ├── weather_tasks.py         # fetch_nasa_power, convert_to_epw
│   │   └── report_tasks.py          # generate_report
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── database.py              # Async SQLAlchemy engine + session factory
│   │   ├── security.py              # JWT, password hashing
│   │   ├── exceptions.py            # Custom exception hierarchy
│   │   ├── constants.py             # Physical constants, unit conversions
│   │   └── file_storage.py          # File storage abstraction (local/S3)
│   │
│   └── data/                        # Seed data and static resources
│       ├── materials/               # Material library JSON files
│       │   ├── masonry.json
│       │   ├── insulation.json
│       │   ├── glazing.json
│       │   ├── roofing.json
│       │   └── flooring.json
│       ├── weather/                  # Pre-bundled EPW files
│       │   ├── IND_LA_Leh.epw
│       │   └── ...
│       └── climate_zones/           # ASHRAE climate zone database
│           └── ashrae_zones_india.json
│
├── alembic/                         # Database migrations
│   ├── alembic.ini
│   ├── env.py
│   └── versions/
│
├── tests/                           # Test suite
│   ├── conftest.py
│   ├── unit/
│   ├── integration/
│   └── validation/                  # BESTEST validation tests
│
├── requirements.txt
├── requirements-dev.txt
├── Dockerfile
└── pyproject.toml
```

### 4.2 Layered Architecture

```mermaid
graph TB
    subgraph "API Layer (FastAPI Routes)"
        direction LR
        Routes["HTTP Routes<br/>(thin controllers)"]
        WS["WebSocket<br/>Handlers"]
    end
    
    subgraph "Schema Layer (Pydantic)"
        direction LR
        ReqSchemas["Request<br/>Schemas"]
        ResSchemas["Response<br/>Schemas"]
        InternalSchemas["Internal<br/>DTOs"]
    end
    
    subgraph "Service Layer (Business Logic)"
        direction LR
        GeoSvc["Geometry"]
        MatSvc["Materials"]
        WxSvc["Weather"]
        SimSvc["Simulation"]
        CmfSvc["Comfort"]
        CmpSvc["Comparison"]
        OptSvc["Optimization"]
        RptSvc["Reporting"]
    end
    
    subgraph "Engine Layer (Adapters)"
        direction LR
        EPEng["EnergyPlus<br/>Adapter"]
        OSEng["OpenStudio<br/>Adapter"]
        ANEng["ANSYS<br/>Adapter"]
    end
    
    subgraph "Data Layer"
        direction LR
        ORM["SQLAlchemy<br/>Models"]
        FileIO["File<br/>Storage"]
        Cache["Redis<br/>Cache"]
    end
    
    Routes --> ReqSchemas
    Routes --> ResSchemas
    Routes --> GeoSvc
    Routes --> SimSvc
    WS --> SimSvc
    
    GeoSvc --> InternalSchemas
    SimSvc --> EPEng
    SimSvc --> OSEng
    SimSvc --> ANEng
    
    GeoSvc --> ORM
    SimSvc --> ORM
    SimSvc --> FileIO
    SimSvc --> Cache
    
    EPEng --> FileIO
    OSEng --> FileIO
    ANEng --> FileIO
```

### 4.3 Simulation Engine Interface (Adapter Pattern)

```python
# services/simulation/engines/base.py — Abstract interface

from abc import ABC, abstractmethod
from app.schemas.simulation import (
    SimulationInput,
    SimulationOutput,
    SimulationProgress,
    EngineCapabilities,
)

class SimulationEngine(ABC):
    """
    Abstract base class for all simulation engine adapters.
    Every engine (EnergyPlus, OpenStudio, ANSYS) implements this interface.
    """
    
    @abstractmethod
    def get_capabilities(self) -> EngineCapabilities:
        """Return what this engine can simulate (thermal, CFD, structural, etc.)."""
        ...
    
    @abstractmethod
    def validate_input(self, input: SimulationInput) -> list[str]:
        """Pre-flight validation. Returns list of error messages (empty = valid)."""
        ...
    
    @abstractmethod
    def generate_input_files(self, input: SimulationInput, work_dir: Path) -> Path:
        """Generate engine-specific input files. Returns path to primary input file."""
        ...
    
    @abstractmethod
    def execute(self, input_file: Path, work_dir: Path, 
                progress_callback: Callable[[SimulationProgress], None]) -> int:
        """Run the simulation. Returns exit code. Calls progress_callback periodically."""
        ...
    
    @abstractmethod
    def parse_results(self, work_dir: Path) -> SimulationOutput:
        """Parse engine output files into common result format."""
        ...
    
    @abstractmethod
    def get_error_log(self, work_dir: Path) -> str:
        """Return the engine's error/warning log content."""
        ...
```

### 4.4 Key API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | User registration | No |
| `POST` | `/api/v1/auth/login` | JWT token pair | No |
| `POST` | `/api/v1/auth/refresh` | Refresh access token | Yes |
| | | | |
| `GET` | `/api/v1/projects` | List user's projects | Yes |
| `POST` | `/api/v1/projects` | Create project | Yes |
| `GET` | `/api/v1/projects/{id}` | Get project details | Yes |
| `DELETE` | `/api/v1/projects/{id}` | Delete project | Yes |
| | | | |
| `GET` | `/api/v1/projects/{pid}/designs` | List designs in project | Yes |
| `POST` | `/api/v1/projects/{pid}/designs` | Create shelter design | Yes |
| `GET` | `/api/v1/designs/{id}` | Get design details + geometry | Yes |
| `PUT` | `/api/v1/designs/{id}` | Update design | Yes |
| `GET` | `/api/v1/designs/{id}/geometry` | Get 3D geometry (vertices, faces) | Yes |
| | | | |
| `GET` | `/api/v1/materials` | List materials (filterable) | Yes |
| `POST` | `/api/v1/materials` | Create user-defined material | Yes |
| `GET` | `/api/v1/materials/{id}` | Get material properties | Yes |
| | | | |
| `GET` | `/api/v1/constructions` | List construction assemblies | Yes |
| `POST` | `/api/v1/constructions` | Create multi-layer construction | Yes |
| | | | |
| `GET` | `/api/v1/weather/files` | List available EPW files | Yes |
| `POST` | `/api/v1/weather/upload` | Upload custom EPW file | Yes |
| `GET` | `/api/v1/weather/{id}/preview` | Climate summary from EPW | Yes |
| `POST` | `/api/v1/weather/nasa-power` | Fetch from NASA POWER API | Yes |
| | | | |
| `POST` | `/api/v1/simulations` | Submit simulation job | Yes |
| `GET` | `/api/v1/simulations/{id}` | Get simulation status | Yes |
| `DELETE` | `/api/v1/simulations/{id}` | Cancel running simulation | Yes |
| `GET` | `/api/v1/simulations/{id}/results` | Get parsed results | Yes |
| `GET` | `/api/v1/simulations/{id}/results/timeseries` | Get hourly time-series data | Yes |
| `GET` | `/api/v1/simulations/{id}/results/comfort` | Get comfort analysis | Yes |
| `GET` | `/api/v1/simulations/{id}/results/energy-balance` | Get energy balance | Yes |
| `WS` | `/api/v1/simulations/{id}/progress` | Real-time progress stream | Yes |
| | | | |
| `POST` | `/api/v1/comparisons` | Compare multiple designs | Yes |
| `GET` | `/api/v1/comparisons/{id}` | Get comparison results | Yes |
| | | | |
| `POST` | `/api/v1/optimizations` | Start optimization run | Yes |
| `GET` | `/api/v1/optimizations/{id}` | Get optimization status + results | Yes |
| `DELETE` | `/api/v1/optimizations/{id}` | Cancel optimization | Yes |
| | | | |
| `POST` | `/api/v1/reports` | Generate PDF report | Yes |
| `GET` | `/api/v1/reports/{id}/download` | Download generated report | Yes |

---

## 5. Database Architecture

### 5.1 Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ PROJECT : owns
    PROJECT ||--o{ DESIGN : contains
    DESIGN ||--o{ SIMULATION : has
    DESIGN }o--|| WEATHER_FILE : uses
    DESIGN }o--|| CONSTRUCTION : wall_construction
    DESIGN }o--|| CONSTRUCTION : roof_construction
    DESIGN }o--|| CONSTRUCTION : floor_construction
    CONSTRUCTION ||--|{ CONSTRUCTION_LAYER : has_layers
    CONSTRUCTION_LAYER }o--|| MATERIAL : uses
    DESIGN ||--o{ FENESTRATION : has
    FENESTRATION }o--|| MATERIAL : glazing_material
    SIMULATION ||--o| SIMULATION_RESULT : produces
    SIMULATION_RESULT ||--o{ TIMESERIES_CHUNK : has
    PROJECT ||--o{ COMPARISON : has
    COMPARISON }o--o{ DESIGN : compares
    PROJECT ||--o{ OPTIMIZATION : has
    OPTIMIZATION ||--o{ OPTIMIZATION_VARIANT : generates
    OPTIMIZATION_VARIANT }o--|| DESIGN : based_on
    SIMULATION ||--o| REPORT : generates
    
    USER {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        timestamp created_at
        timestamp updated_at
    }
    
    PROJECT {
        uuid id PK
        uuid user_id FK
        string name
        string description
        json location "lat, lon, altitude, city, country"
        string climate_zone
        timestamp created_at
        timestamp updated_at
    }
    
    DESIGN {
        uuid id PK
        uuid project_id FK
        string name
        string description
        string shape_type "rectangular | l_shape | quonset | a_frame"
        json dimensions "length, width, height, roof_pitch, etc"
        float orientation_deg
        uuid wall_construction_id FK
        uuid roof_construction_id FK
        uuid floor_construction_id FK
        uuid weather_file_id FK
        json infiltration_config
        json internal_gains_config
        json ventilation_config
        boolean is_baseline
        timestamp created_at
        timestamp updated_at
    }
    
    MATERIAL {
        uuid id PK
        uuid created_by FK "null = system material"
        string name
        string category "masonry | insulation | glazing | roofing | etc"
        float conductivity "W/m·K"
        float density "kg/m3"
        float specific_heat "J/kg·K"
        float thickness "m (default)"
        float thermal_absorptance
        float solar_absorptance
        float visible_absorptance
        string roughness
        string source "ASHRAE | BIS | CIBSE | user"
        string source_reference
        boolean is_system "true = pre-loaded, false = user-defined"
        timestamp created_at
    }
    
    CONSTRUCTION {
        uuid id PK
        uuid created_by FK
        string name
        string surface_type "wall | roof | floor"
        float total_r_value "computed, m2·K/W"
        float total_u_value "computed, W/m2·K"
        float total_thickness "computed, m"
        timestamp created_at
    }
    
    CONSTRUCTION_LAYER {
        uuid id PK
        uuid construction_id FK
        uuid material_id FK
        int layer_order "1 = outside, N = inside"
        float thickness "m"
    }
    
    FENESTRATION {
        uuid id PK
        uuid design_id FK
        string type "window | door | opening"
        string wall_face "north | south | east | west | roof"
        float offset_x "m from left edge"
        float offset_z "m from floor"
        float width "m"
        float height "m"
        uuid glazing_material_id FK "null for doors/openings"
        float u_value "W/m2·K"
        float shgc "Solar Heat Gain Coefficient"
        float visible_transmittance
        string frame_type
    }
    
    WEATHER_FILE {
        uuid id PK
        uuid uploaded_by FK "null = system file"
        string name
        string source "climate_onebuilding | nasa_power | user_upload | manual"
        string file_path
        float latitude
        float longitude
        float altitude "m"
        string city
        string country
        string climate_zone
        json climate_summary "temp_min, temp_max, solar_avg, etc"
        timestamp created_at
    }
    
    SIMULATION {
        uuid id PK
        uuid design_id FK
        string engine "energyplus | openstudio | ansys"
        string status "queued | running | completed | failed | cancelled"
        string celery_task_id
        int progress_pct
        string current_stage
        json engine_config "timestep, run_period, output_vars"
        string input_file_path
        string work_dir_path
        string error_log
        int warning_count
        int severe_count
        float runtime_seconds
        timestamp submitted_at
        timestamp started_at
        timestamp completed_at
    }
    
    SIMULATION_RESULT {
        uuid id PK
        uuid simulation_id FK
        json summary_metrics "comfort_hours_pct, mean_indoor_temp, etc"
        json energy_balance "solar_gain, conduction_loss, infiltration_loss, etc"
        json comfort_analysis "pmv_avg, ppd_avg, adaptive_comfort_pct"
        json surface_heat_flows "per-surface conduction/convection/radiation"
        string timeseries_file_path "path to Parquet/HDF5 file"
        timestamp created_at
    }
    
    TIMESERIES_CHUNK {
        uuid id PK
        uuid result_id FK
        string variable_name
        string unit
        int start_hour
        int end_hour
        json data "array of hourly values"
    }
    
    COMPARISON {
        uuid id PK
        uuid project_id FK
        string name
        json design_ids "array of design UUIDs"
        json comparison_result
        timestamp created_at
    }
    
    OPTIMIZATION {
        uuid id PK
        uuid project_id FK
        uuid base_design_id FK
        string method "parametric | nsga2"
        string status "queued | running | completed | failed"
        json variables "array of {name, min, max, step}"
        json objectives "array of {name, direction}"
        json constraints
        int total_variants
        int completed_variants
        json pareto_front "array of {design, objectives}"
        string celery_task_id
        timestamp created_at
        timestamp completed_at
    }
    
    OPTIMIZATION_VARIANT {
        uuid id PK
        uuid optimization_id FK
        uuid design_id FK
        json parameter_values
        json objective_values
        boolean is_pareto_optimal
        int generation "GA generation number"
    }
    
    REPORT {
        uuid id PK
        uuid simulation_id FK
        string format "pdf | html"
        string file_path
        string status "generating | ready | failed"
        timestamp created_at
    }
```

### 5.2 Database Design Decisions

| Decision | Rationale |
|---|---|
| **UUIDs for primary keys** | Prevents enumeration attacks, allows client-side ID generation, safe for distributed systems. |
| **JSON columns for complex nested data** | `dimensions`, `climate_summary`, `summary_metrics` are read-heavy, rarely queried by individual fields. PostgreSQL JSONB gives us indexing when needed. |
| **Time-series data in files, not rows** | 8,760 hourly values × 10+ variables × multiple simulations would create millions of rows. Store in Parquet/HDF5 files, reference by path. The `TIMESERIES_CHUNK` table stores small chunks for API pagination when full file access is not needed. |
| **Separate `CONSTRUCTION` and `CONSTRUCTION_LAYER`** | Constructions are reusable across designs. Layers are ordered (outside→inside) and reference materials by FK. |
| **`is_system` flag on materials** | Distinguishes pre-loaded published materials from user-defined ones. System materials cannot be edited or deleted. |
| **Soft references for file paths** | `file_path` columns store relative paths within the file storage root. The `FileStorage` service resolves absolute paths. |

### 5.3 Indexes

```sql
-- Performance-critical queries
CREATE INDEX idx_project_user ON project(user_id);
CREATE INDEX idx_design_project ON design(project_id);
CREATE INDEX idx_simulation_design ON simulation(design_id);
CREATE INDEX idx_simulation_status ON simulation(status);
CREATE INDEX idx_material_category ON material(category);
CREATE INDEX idx_material_is_system ON material(is_system);
CREATE INDEX idx_construction_layer_order ON construction_layer(construction_id, layer_order);
CREATE INDEX idx_fenestration_design ON fenestration(design_id);
CREATE INDEX idx_weather_file_location ON weather_file(latitude, longitude);
CREATE INDEX idx_optimization_project ON optimization(project_id);
```

---

## 6. 3D Shelter Editor

### 6.1 Architecture

The 3D editor is a **React Three Fiber** (R3F) component that renders a live preview of the shelter geometry as the user modifies parameters in the form. It is NOT a freeform CAD tool — it visualizes the output of the parametric geometry engine.

```mermaid
graph LR
    subgraph "Form Controls (React)"
        DimInputs["Dimension Inputs<br/>(length, width, height)"]
        RoofInputs["Roof Controls<br/>(pitch, type)"]
        OrientInput["Orientation Slider<br/>(0-360°)"]
        WinEditor["Window Placement<br/>(wall, position, size)"]
    end
    
    subgraph "Zustand Store"
        ShelterState["Shelter State"]
    end
    
    subgraph "Geometry Computation (Client-side)"
        ParamEngine["Parametric Geometry<br/>Engine (TypeScript)"]
    end
    
    subgraph "R3F Canvas"
        Scene["Three.js Scene"]
        Walls["Wall Meshes<br/>(color-coded by orientation)"]
        Roof["Roof Mesh<br/>(distinct color)"]
        Floor["Floor Mesh"]
        Windows["Window Meshes<br/>(semi-transparent)"]
        Doors["Door Meshes"]
        Grid["Ground Grid"]
        Compass["Compass Rose /<br/>North Arrow"]
        Orbit["OrbitControls"]
    end
    
    DimInputs --> ShelterState
    RoofInputs --> ShelterState
    OrientInput --> ShelterState
    WinEditor --> ShelterState
    
    ShelterState --> ParamEngine
    ParamEngine --> Walls
    ParamEngine --> Roof
    ParamEngine --> Floor
    ParamEngine --> Windows
    ParamEngine --> Doors
```

### 6.2 Client-Side Geometry Engine

A lightweight TypeScript geometry engine mirrors the server-side Python engine. It computes vertices and face indices from parametric inputs for real-time preview. The server-side engine is authoritative for IDF generation.

**Supported shapes (initial):**

| Shape | Parameters | Surface Count |
|---|---|---|
| Rectangular (flat roof) | L, W, H | 6 (4 walls + floor + roof) |
| Rectangular (gable roof) | L, W, H, pitch | 7 (4 walls + floor + 2 roof planes) |
| Rectangular (shed roof) | L, W, H_low, H_high | 6 |
| L-shape | L1, W1, L2, W2, H, pitch | 9-11 (depends on roof) |
| Quonset (approximated) | L, W, H, segments | 2 + N (floor + end walls + N barrel segments) |
| A-frame | L, W, H, pitch | 5 (2 gable walls + floor + 2 roof planes) |

### 6.3 Visual Features

- **Color coding:** North wall = blue, South = warm yellow, East/West = neutral gray, Roof = brown, Floor = dark gray, Windows = semi-transparent cyan
- **Orientation:** Compass rose fixed to scene. Rotating orientation rotates the building model, not the camera.
- **Window placement:** Clicking a wall face opens a sub-editor for window/door placement. Windows render as recessed, semi-transparent quads on the parent wall.
- **Dimensions overlay:** Optional dimension lines (length, width, height) displayed as Three.js line annotations.
- **Sun path:** Optional sun path arc for the selected latitude and date, showing solar angles.

### 6.4 Interaction Model

The 3D viewer is **read-only visualization**, not an interactive modeler. All modifications happen through the form panel. The viewer updates reactively via Zustand state changes. This avoids the enormous complexity of a 3D editor while still providing spatial understanding.

Future enhancement: allow clicking a wall face in the 3D view to select it for fenestration editing.

---

## 7. Weather Service

### 7.1 Data Sources

```mermaid
graph TB
    subgraph "Weather Service"
        WxService["Weather Service<br/>(Python)"]
        EPWParser["EPW Parser"]
        NASAClient["NASA POWER<br/>API Client"]
        CSVParser["CSV Parser"]
        ManualInput["Manual Climate<br/>Input Handler"]
        EPWConverter["→ EPW Converter"]
    end
    
    subgraph "Data Sources"
        EPWFiles["Pre-bundled EPW Files<br/>(Climate.OneBuilding.org)"]
        UserEPW["User-Uploaded<br/>EPW Files"]
        NASAAPI["NASA POWER API<br/>power.larc.nasa.gov"]
        UserCSV["User CSV<br/>(custom format)"]
        ManualForm["Manual Form Input<br/>(monthly averages)"]
    end
    
    subgraph "Output"
        EPWFile["Validated EPW File<br/>(for EnergyPlus)"]
        ClimateSummary["Climate Summary<br/>(for UI preview)"]
    end
    
    EPWFiles --> EPWParser
    UserEPW --> EPWParser
    NASAAPI --> NASAClient
    UserCSV --> CSVParser
    ManualForm --> ManualInput
    
    EPWParser --> WxService
    NASAClient --> EPWConverter
    CSVParser --> EPWConverter
    ManualInput --> EPWConverter
    
    EPWConverter --> WxService
    WxService --> EPWFile
    WxService --> ClimateSummary
```

### 7.2 Source Details

#### 7.2.1 EPW Files (Primary)
- **Pre-bundled:** Ship with TMYx EPW files for key Indian locations:
  - Leh/Ladakh (IND_LA_Leh)
  - Srinagar (cold)
  - Shimla (cold-temperate)
  - New Delhi (composite)
  - Jaisalmer (hot-dry)
  - Chennai (warm-humid)
  - Bengaluru (temperate)
- **User upload:** Accept `.epw` files with validation (correct header format, 8760 data rows, reasonable value ranges).
- **Parser:** Read EPW header (location, design conditions) and data (8760 hourly rows with dry-bulb temp, dew-point, RH, atmospheric pressure, solar radiation components, wind speed/direction, etc.).

#### 7.2.2 NASA POWER API
- **Endpoint:** `https://power.larc.nasa.gov/api/temporal/hourly/point`
- **Community:** `SB` (Sustainable Buildings)
- **Parameters fetched:**
  - `T2M` — Air temperature at 2m (°C)
  - `RH2M` — Relative humidity at 2m (%)
  - `WS10M` — Wind speed at 10m (m/s)
  - `WD10M` — Wind direction at 10m (°)
  - `ALLSKY_SFC_SW_DWN` — Global horizontal irradiance (W/m²)
  - `ALLSKY_SFC_SW_DNI` — Direct normal irradiance (W/m²)
  - `ALLSKY_SFC_SW_DIFF` — Diffuse horizontal irradiance (W/m²)
  - `PS` — Surface pressure (kPa)
- **Rate limiting:** Max 1 request/second, chunk by year. Cache responses in Redis (TTL 7 days).
- **Conversion:** NASA POWER hourly data → EPW format using a converter that maps API fields to EPW columns and fills missing fields (e.g., infrared radiation) with calculated estimates.

#### 7.2.3 CSV Import
- Accept user CSV with columns: `datetime, temperature, rh, wind_speed, wind_direction, ghi, dni, dhi, pressure`
- Validate: 8760 rows (or 8784 for leap year), reasonable ranges, no gaps.
- Convert to EPW format.

#### 7.2.4 Manual Climate Input
- For locations with no data at all, accept monthly averages:
  - Monthly mean/min/max temperature
  - Monthly mean RH
  - Monthly mean wind speed
  - Monthly mean global solar radiation
- Generate a **synthetic EPW** using sinusoidal diurnal interpolation.
- **Clearly label** output as "synthetic — not from measured data" in all results.

### 7.3 Climate Summary Schema

```python
class ClimateSummary(BaseModel):
    """Extracted from EPW for UI preview."""
    temp_min_annual: float          # °C
    temp_max_annual: float          # °C
    temp_mean_annual: float         # °C
    temp_mean_monthly: list[float]  # 12 values
    heating_degree_days: float      # base 18°C
    cooling_degree_days: float      # base 24°C
    ghi_annual: float               # kWh/m²/year
    ghi_mean_monthly: list[float]   # 12 values
    wind_speed_mean: float          # m/s
    wind_predominant_dir: float     # degrees
    rh_mean_annual: float           # %
    altitude: float                 # m
    latitude: float
    longitude: float
    koppen_class: str | None        # e.g., "BWk"
    ashrae_zone: str | None         # e.g., "5B"
```

---

## 8. Thermal Simulation Layer

### 8.1 Orchestrator Pattern

The simulation orchestrator is engine-agnostic. It dispatches work to the appropriate engine adapter based on the requested engine type.

```mermaid
sequenceDiagram
    participant Client as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL
    participant Queue as Redis/Celery
    participant Worker as Celery Worker
    participant Orch as SimOrchestrator
    participant Engine as EngineAdapter
    participant EP as EnergyPlus
    
    Client->>API: POST /simulations {design_id, engine: "energyplus"}
    API->>DB: Create Simulation(status=queued)
    API->>Queue: Enqueue run_simulation(sim_id)
    API-->>Client: 202 Accepted {simulation_id}
    
    Worker->>Queue: Dequeue task
    Worker->>DB: Update status=running
    Worker->>Orch: run(simulation_id)
    
    Orch->>DB: Load Design + Construction + Materials + Weather
    Orch->>Engine: validate_input(shelter_model)
    Engine-->>Orch: [] (no errors)
    
    Orch->>Engine: generate_input_files(shelter_model, work_dir)
    Engine->>Engine: Build IDF/OSM/ANSYS input
    Engine-->>Orch: /work/sim_123/in.idf
    
    Orch->>Engine: execute(input_file, work_dir, progress_cb)
    Engine->>EP: subprocess.run(energyplus -w weather.epw in.idf)
    
    loop Every 5 seconds
        Engine->>EP: Check progress (parse eplusout.end)
        Engine-->>Orch: progress_callback({pct: 45, month: "June"})
        Orch->>DB: Update progress_pct
        Orch->>Queue: Publish to WebSocket channel
    end
    
    EP-->>Engine: Exit code 0
    Engine->>Engine: Parse eplusout.err (warnings/errors)
    
    Orch->>Engine: parse_results(work_dir)
    Engine->>Engine: Parse ESO/CSV/SQL outputs
    Engine-->>Orch: SimulationOutput{...}
    
    Orch->>Orch: Compute comfort metrics (pythermalcomfort)
    Orch->>Orch: Compute energy balance
    Orch->>DB: Store SimulationResult
    Orch->>DB: Update status=completed
    
    Client->>API: GET /simulations/{id}/results
    API->>DB: Load results
    API-->>Client: 200 {summary, comfort, energy_balance}
```

### 8.2 Simulation Input Model

```python
class SimulationInput(BaseModel):
    """Engine-agnostic simulation input — assembled from DB records."""
    
    # Location
    location: Location            # lat, lon, altitude
    weather_file_path: Path       # absolute path to EPW
    
    # Geometry
    shape: ShapeType
    dimensions: dict              # shape-specific parameters
    orientation_deg: float
    surfaces: list[Surface]       # generated by geometry engine
    fenestrations: list[Fenestration]
    
    # Construction
    constructions: dict[str, ConstructionAssembly]  # wall, roof, floor
    
    # Thermal
    infiltration: InfiltrationConfig
    internal_gains: InternalGainsConfig
    ventilation: VentilationConfig | None
    ground_temperature: GroundTempConfig
    
    # Simulation control
    run_period: RunPeriod         # start/end dates
    timestep: int                 # timesteps per hour (default 6)
    output_variables: list[str]   # what to report
```

---

## 9. EnergyPlus Integration

### 9.1 IDF Generation Pipeline

```mermaid
graph TB
    subgraph "Input"
        ShelterModel["Shelter Model<br/>(from DB)"]
    end
    
    subgraph "IDF Generator"
        Version["Version<br/>Statement"]
        Building["Building<br/>Object"]
        Timestep["Timestep<br/>Object"]
        RunPeriod["RunPeriod<br/>Object"]
        SiteLocation["Site:Location<br/>(lat, lon, alt, timezone)"]
        
        Zone["Zone<br/>Definition"]
        
        Materials["Material<br/>Objects"]
        Constructions["Construction<br/>Objects"]
        
        Surfaces["BuildingSurface:<br/>Detailed<br/>(walls, roof, floor)"]
        
        Windows["FenestrationSurface:<br/>Detailed<br/>(windows, doors)"]
        
        Infiltration["ZoneInfiltration:<br/>DesignFlowRate"]
        
        InternalGains["People +<br/>OtherEquipment"]
        
        Schedules["Schedule:Compact<br/>(occupancy, activity)"]
        
        GroundTemp["GroundTemperatures:<br/>BuildingSurface"]
        
        OutputVars["Output:Variable<br/>+ Output:Meter"]
        
        OutputControl["OutputControl:<br/>Table:Style"]
    end
    
    subgraph "Validation"
        Validator["IDF Validator"]
        GeomCheck["Geometry Checks<br/>(closure, normals, area)"]
        MatCheck["Material Checks<br/>(property bounds)"]
        BCSCheck["Boundary Condition<br/>Checks"]
    end
    
    subgraph "Output"
        IDFFile["in.idf"]
    end
    
    ShelterModel --> Version
    ShelterModel --> Building
    ShelterModel --> Zone
    ShelterModel --> Materials
    ShelterModel --> Constructions
    ShelterModel --> Surfaces
    ShelterModel --> Windows
    ShelterModel --> Infiltration
    ShelterModel --> InternalGains
    ShelterModel --> Schedules
    
    Version --> IDFFile
    Building --> IDFFile
    Timestep --> IDFFile
    RunPeriod --> IDFFile
    SiteLocation --> IDFFile
    Zone --> IDFFile
    Materials --> IDFFile
    Constructions --> IDFFile
    Surfaces --> IDFFile
    Windows --> IDFFile
    Infiltration --> IDFFile
    InternalGains --> IDFFile
    Schedules --> IDFFile
    GroundTemp --> IDFFile
    OutputVars --> IDFFile
    OutputControl --> IDFFile
    
    IDFFile --> Validator
    Validator --> GeomCheck
    Validator --> MatCheck
    Validator --> BCSCheck
```

### 9.2 IDF Object Mapping

| Our Model Concept | EnergyPlus IDF Object(s) | Notes |
|---|---|---|
| Location | `Site:Location` | Latitude, longitude, timezone, elevation |
| Weather | EPW file path passed to CLI | `-w weather.epw` |
| Zone | `Zone` | One zone per shelter (single-zone model) |
| Wall surface | `BuildingSurface:Detailed` (type=Wall) | Vertices in counter-clockwise order (viewed from outside) |
| Roof surface | `BuildingSurface:Detailed` (type=Roof) | Vertices in counter-clockwise order (viewed from outside) |
| Floor surface | `BuildingSurface:Detailed` (type=Floor) | Vertices in clockwise order (viewed from inside, facing down) |
| Window | `FenestrationSurface:Detailed` (type=Window) | Child of parent wall surface, vertices as sub-rectangle |
| Door | `FenestrationSurface:Detailed` (type=Door) | Child of parent wall surface |
| Material layer | `Material` or `Material:NoMass` | conductivity, density, specific_heat, thickness, roughness, absorptances |
| Glazing | `WindowMaterial:SimpleGlazingSystem` | U-value, SHGC, VT |
| Construction assembly | `Construction` | Ordered list of material names (outside→inside) |
| Infiltration | `ZoneInfiltration:DesignFlowRate` | Flow/zone, coefficients A/B/C/D |
| Occupancy | `People` + `Schedule:Compact` | Number of people, metabolic rate |
| Ground temps | `Site:GroundTemperature:BuildingSurface` | 12 monthly values |
| Output requests | `Output:Variable` | Zone Mean Air Temperature, Surface Heat Flow, etc. |

### 9.3 EnergyPlus Execution

```python
# Simplified execution flow

class EnergyPlusRunner:
    def __init__(self, ep_install_path: Path):
        self.ep_exe = ep_install_path / "energyplus"  # or energyplus.exe on Windows
        self.idd_path = ep_install_path / "Energy+.idd"
    
    def run(self, idf_path: Path, epw_path: Path, work_dir: Path,
            progress_callback: Callable) -> int:
        """
        Execute EnergyPlus as a subprocess.
        Monitor eplusout.end for progress.
        Parse eplusout.err for warnings/errors after completion.
        """
        cmd = [
            str(self.ep_exe),
            "--weather", str(epw_path),
            "--output-directory", str(work_dir),
            "--idd", str(self.idd_path),
            str(idf_path),
        ]
        
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Monitor progress by checking eplusout.end or parsing stdout
        while process.poll() is None:
            progress = self._check_progress(work_dir)
            progress_callback(progress)
            time.sleep(2)
        
        return process.returncode
```

### 9.4 Result Parsing

EnergyPlus outputs we parse:

| Output File | What We Extract |
|---|---|
| `eplusout.csv` (or `eplusout.eso`) | Hourly time-series: zone temperatures, surface temps, heat flows, solar gains |
| `eplustbl.htm` | Summary tables: annual energy balance, peak loads, unmet hours |
| `eplusout.sql` | SQLite database with all outputs (preferred for programmatic access) |
| `eplusout.err` | Warnings, severe errors, fatal errors — parsed and stored |
| `eplusout.end` | Simulation completion status and timing |

### 9.5 Output Variables Requested

```
Zone Mean Air Temperature                    [C]     — Hourly
Zone Operative Temperature                   [C]     — Hourly
Zone Mean Radiant Temperature                [C]     — Hourly
Surface Inside Face Temperature              [C]     — Hourly (per surface)
Surface Outside Face Temperature             [C]     — Hourly (per surface)
Surface Inside Face Conduction Heat Flow     [W]     — Hourly (per surface)
Zone Windows Total Transmitted Solar Radiation Rate [W] — Hourly
Zone Infiltration Sensible Heat Loss Energy  [J]     — Hourly
Zone Infiltration Sensible Heat Gain Energy  [J]     — Hourly
Zone People Total Heating Energy             [J]     — Hourly
Site Outdoor Air Drybulb Temperature         [C]     — Hourly
Site Direct Solar Radiation Rate per Area    [W/m2]  — Hourly
Site Diffuse Solar Radiation Rate per Area   [W/m2]  — Hourly
```

---

## 10. OpenStudio Integration

### 10.1 Role in Architecture

OpenStudio provides a **higher-level API** over EnergyPlus. In our architecture, it serves as an **alternative engine adapter** — not a replacement for the direct EnergyPlus path. The OpenStudio path is valuable when:

1. Users want to leverage OpenStudio **Measures** (pre-built scripts for common modeling tasks).
2. We need to import/export **gbXML** or **OSM** files.
3. Future extensions require HVAC system modeling (OpenStudio's HVAC library is much richer than raw IDF).

### 10.2 Architecture

```mermaid
graph TB
    subgraph "OpenStudio Adapter"
        OSAdapter["OpenStudioAdapter<br/>(implements SimulationEngine)"]
        OSMGen["OSM Generator"]
        Measures["Measures Library"]
        FwdTranslator["ForwardTranslator<br/>(OSM → IDF)"]
        OSRunner["OpenStudio CLI<br/>Runner"]
        OSParser["Result Parser<br/>(same SQL output)"]
    end
    
    subgraph "External"
        OSSDK["openstudio<br/>Python Package"]
        OSCLI["OpenStudio CLI"]
        EP["EnergyPlus"]
    end
    
    OSAdapter --> OSMGen
    OSMGen --> OSSDK
    OSAdapter --> Measures
    Measures --> OSSDK
    OSAdapter --> FwdTranslator
    FwdTranslator --> OSSDK
    OSAdapter --> OSRunner
    OSRunner --> OSCLI
    OSCLI --> EP
    OSAdapter --> OSParser
```

### 10.3 OSM Generation

```python
# Simplified OpenStudio model creation

import openstudio

def create_osm_from_shelter(shelter_model: SimulationInput) -> openstudio.model.Model:
    model = openstudio.model.Model()
    
    # Set building
    building = model.getBuilding()
    building.setNorthAxis(shelter_model.orientation_deg)
    
    # Create thermal zone
    zone = openstudio.model.ThermalZone(model)
    zone.setName("ShelterZone")
    
    # Create space
    space = openstudio.model.Space(model)
    space.setName("ShelterSpace")
    space.setThermalZone(zone)
    
    # Add surfaces (from geometry engine output)
    for surface in shelter_model.surfaces:
        os_surface = openstudio.model.Surface(
            _to_point3d_vector(surface.vertices), model
        )
        os_surface.setSpace(space)
        os_surface.setSurfaceType(surface.type)  # "Wall", "RoofCeiling", "Floor"
        os_surface.setOutsideBoundaryCondition(surface.boundary_condition)
        
        # Assign construction
        construction = _create_construction(model, surface.construction)
        os_surface.setConstruction(construction)
    
    # Add fenestration
    for fen in shelter_model.fenestrations:
        parent_surface = _find_parent_surface(model, fen.wall_face)
        sub_surface = openstudio.model.SubSurface(
            _to_point3d_vector(fen.vertices), model
        )
        sub_surface.setSurface(parent_surface)
        sub_surface.setSubSurfaceType("FixedWindow" if fen.type == "window" else "Door")
    
    # Forward translate to IDF
    translator = openstudio.energyplus.ForwardTranslator()
    workspace = translator.translateModel(model)
    
    return model, workspace
```

### 10.4 When to Use OpenStudio vs Direct EnergyPlus

| Criterion | Direct EnergyPlus (eppy) | OpenStudio |
|---|---|---|
| Simple passive shelter | ✅ Preferred — less overhead | Overkill |
| Complex HVAC systems | ❌ Manual IDF is error-prone | ✅ Preferred |
| Measures (pre-built scripts) | ❌ Not available | ✅ Rich library |
| gbXML import/export | ❌ Not supported | ✅ Built-in |
| Prototype buildings | ❌ Must build from scratch | ✅ Has templates |
| Direct IDF control | ✅ Full control | ⚠️ Abstraction layer |
| **Default for our project** | **✅ Yes** | **Alternative path** |

---

## 11. ANSYS Integration / Adapter

### 11.1 Role and Scope

ANSYS (Fluent / Mechanical) is positioned as an **optional, advanced adapter** for detailed thermal/CFD analysis that EnergyPlus cannot perform:

| Analysis Type | EnergyPlus | ANSYS |
|---|---|---|
| Whole-building hourly thermal simulation | ✅ | ❌ (not its purpose) |
| Internal air flow patterns (CFD) | ❌ | ✅ Fluent |
| Detailed thermal bridge analysis | ❌ (1D heat transfer) | ✅ Mechanical (2D/3D) |
| Surface temperature distribution | ⚠️ (average per surface) | ✅ (fine mesh resolution) |
| Condensation risk at junctions | ❌ | ✅ |
| Phase-change material behavior (detailed) | ⚠️ (simplified) | ✅ |

### 11.2 Integration Architecture

```mermaid
graph TB
    subgraph "Primary Path"
        EPResults["EnergyPlus Results<br/>(boundary conditions)"]
    end
    
    subgraph "ANSYS Adapter"
        Exporter["Geometry Exporter<br/>(shelter → ANSYS mesh input)"]
        BCMapper["Boundary Condition Mapper<br/>(EP hourly data → ANSYS BCs)"]
        ANSYSRunner["ANSYS Runner<br/>(PyFluent / PyMechanical)"]
        ResultImporter["Result Importer<br/>(ANSYS results → common format)"]
    end
    
    subgraph "External"
        ANSYSFluent["ANSYS Fluent<br/>(CFD)"]
        ANSYSMech["ANSYS Mechanical<br/>(Thermal FEA)"]
    end
    
    subgraph "Output"
        ThermalBridge["Thermal Bridge<br/>Analysis Report"]
        AirflowViz["Airflow<br/>Visualization"]
        TempDistrib["Surface Temperature<br/>Distribution"]
    end
    
    EPResults --> BCMapper
    BCMapper --> ANSYSRunner
    Exporter --> ANSYSRunner
    ANSYSRunner --> ANSYSFluent
    ANSYSRunner --> ANSYSMech
    ANSYSFluent --> ResultImporter
    ANSYSMech --> ResultImporter
    ResultImporter --> ThermalBridge
    ResultImporter --> AirflowViz
    ResultImporter --> TempDistrib
```

### 11.3 Workflow

1. **User runs EnergyPlus simulation first** (required — provides boundary conditions).
2. User requests "Detailed Analysis" for a specific design hour or peak condition.
3. System exports shelter geometry to ANSYS-compatible format (STEP or mesh).
4. System maps EnergyPlus hourly results (outdoor temp, solar flux, indoor temp) to ANSYS boundary conditions for the selected hour.
5. ANSYS runs a steady-state or short-transient thermal/CFD analysis.
6. Results (temperature fields, velocity fields) are imported and displayed as overlays.

### 11.4 Implementation Reality

> **IMPORTANT:** ANSYS requires a **commercial license** (Fluent, Mechanical). The adapter is designed as a **plugin interface** that is available only when:
> 1. ANSYS is installed on the server.
> 2. A valid license is detected.
> 3. The `ANSYS_INSTALL_PATH` environment variable is set.
>
> If ANSYS is not available, the adapter gracefully reports "not available" and the UI hides ANSYS-specific features. The core platform (EnergyPlus) functions independently.

### 11.5 PyANSYS Integration

```python
# Conditional import — does not crash if ANSYS is not installed
try:
    import ansys.fluent.core as pyfluent
    import ansys.mapdl.core as pymapdl
    ANSYS_AVAILABLE = True
except ImportError:
    ANSYS_AVAILABLE = False

class AnsysAdapter(SimulationEngine):
    def get_capabilities(self) -> EngineCapabilities:
        return EngineCapabilities(
            thermal_bridge=True,
            cfd_airflow=True,
            requires_license=True,
            available=ANSYS_AVAILABLE,
        )
    
    def validate_input(self, input: SimulationInput) -> list[str]:
        errors = []
        if not ANSYS_AVAILABLE:
            errors.append("ANSYS is not installed or not licensed on this server.")
        if not input.ansys_config:
            errors.append("ANSYS-specific configuration is required.")
        return errors
```

---

## 12. Optimization Engine

### 12.1 Architecture

```mermaid
graph TB
    subgraph "User Configuration"
        VarDef["Variable Definitions<br/>(orientation: 0-360°, step 15°)<br/>(insulation: 50-300mm, step 25mm)<br/>(WWR: 5-40%, step 5%)"]
        ObjDef["Objective Definitions<br/>- Maximize comfort hours<br/>- Minimize heat loss"]
        ConDef["Constraints<br/>- Wall thickness ≤ 1m<br/>- Budget limit"]
    end
    
    subgraph "Optimization Engine"
        Dispatcher["Method Dispatcher"]
        
        subgraph "Parametric Sweep"
            GridSearch["Grid Search"]
            LHS["Latin Hypercube<br/>Sampling"]
        end
        
        subgraph "Evolutionary"
            NSGA2["NSGA-II<br/>(pymoo)"]
        end
        
        DesignGen["Design Variant<br/>Generator"]
        SimQueue["Simulation Queue<br/>(batch submit)"]
        ResultCollector["Result Collector"]
        ParetoCalc["Pareto Front<br/>Calculator"]
        Ranker["Design Ranker"]
    end
    
    subgraph "Output"
        ParetoFront["Pareto Front<br/>(objectives plot)"]
        RankedList["Ranked Design<br/>List"]
        BestDesign["Recommended<br/>Design"]
    end
    
    VarDef --> Dispatcher
    ObjDef --> Dispatcher
    ConDef --> Dispatcher
    
    Dispatcher --> GridSearch
    Dispatcher --> LHS
    Dispatcher --> NSGA2
    
    GridSearch --> DesignGen
    LHS --> DesignGen
    NSGA2 --> DesignGen
    
    DesignGen --> SimQueue
    SimQueue --> ResultCollector
    ResultCollector --> NSGA2
    ResultCollector --> ParetoCalc
    ParetoCalc --> Ranker
    
    Ranker --> ParetoFront
    Ranker --> RankedList
    Ranker --> BestDesign
```

### 12.2 Optimization Variables

| Variable | Type | Range | Step | IDF Impact |
|---|---|---|---|---|
| `orientation` | Continuous | 0–360° | 15° | `Building` north axis |
| `wall_insulation_thickness` | Continuous | 0–300 mm | 25 mm | `Material` thickness in wall construction |
| `roof_insulation_thickness` | Continuous | 0–300 mm | 25 mm | `Material` thickness in roof construction |
| `window_to_wall_ratio_south` | Continuous | 0.05–0.40 | 0.05 | `FenestrationSurface` dimensions |
| `window_to_wall_ratio_north` | Continuous | 0.00–0.20 | 0.05 | `FenestrationSurface` dimensions |
| `thermal_mass_thickness` | Continuous | 100–600 mm | 50 mm | Inner `Material` thickness |
| `glazing_type` | Categorical | [single, double, triple] | — | `WindowMaterial` properties |
| `wall_material` | Categorical | [brick, stone, rammed_earth, concrete] | — | `Material` properties |

### 12.3 Objective Functions

| Objective | Direction | Computation |
|---|---|---|
| Comfort hours (%) | Maximize | % of occupied hours where adaptive comfort criteria are met |
| Annual heating demand (kWh/m²) | Minimize | Sum of hourly heating energy required to maintain setpoint |
| Peak discomfort (°C·hr) | Minimize | Cumulative degree-hours below comfort threshold |
| Envelope heat loss (kWh/m²) | Minimize | Annual conduction + infiltration losses |

### 12.4 pymoo Integration

```python
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.core.problem import Problem
from pymoo.optimize import minimize

class ShelterOptimizationProblem(Problem):
    def __init__(self, base_design, variables, objectives, engine):
        n_var = len(variables)
        n_obj = len(objectives)
        xl = np.array([v.min for v in variables])  # lower bounds
        xu = np.array([v.max for v in variables])  # upper bounds
        super().__init__(n_var=n_var, n_obj=n_obj, xl=xl, xu=xu)
        
        self.base_design = base_design
        self.variables = variables
        self.objectives = objectives
        self.engine = engine
    
    def _evaluate(self, X, out, *args, **kwargs):
        """Evaluate a population of designs."""
        F = []
        for x in X:
            # Generate variant design from parameter vector
            variant = self._create_variant(x)
            # Run simulation
            result = self.engine.run_sync(variant)
            # Extract objective values
            obj_values = [obj.evaluate(result) for obj in self.objectives]
            F.append(obj_values)
        out["F"] = np.array(F)

# Usage:
algorithm = NSGA2(pop_size=20)
result = minimize(problem, algorithm, termination=('n_gen', 30), verbose=True)
```

---

## 13. Result Processing Pipeline

### 13.1 Pipeline Stages

```mermaid
graph LR
    subgraph "Stage 1: Raw Extraction"
        SQL["EnergyPlus SQL<br/>(eplusout.sql)"]
        CSV["EnergyPlus CSV<br/>(eplusout.csv)"]
        ERR["Error Log<br/>(eplusout.err)"]
    end
    
    subgraph "Stage 2: Normalization"
        TSNorm["Time-Series<br/>Normalization<br/>(hourly alignment)"]
        UnitConv["Unit Conversion<br/>(J→kWh, etc.)"]
        SurfaceMap["Surface Mapping<br/>(EP names → our IDs)"]
    end
    
    subgraph "Stage 3: Derived Metrics"
        ComfortCalc["Thermal Comfort<br/>(PMV/PPD, Adaptive)"]
        EnergyBal["Energy Balance<br/>(gains vs losses)"]
        PeakAnalysis["Peak Load<br/>Analysis"]
        MonthlyAgg["Monthly<br/>Aggregation"]
    end
    
    subgraph "Stage 4: Storage"
        SummaryDB["Summary Metrics<br/>(→ PostgreSQL JSON)"]
        TSFile["Time-Series Data<br/>(→ Parquet file)"]
    end
    
    SQL --> TSNorm
    CSV --> TSNorm
    ERR --> SurfaceMap
    
    TSNorm --> UnitConv
    UnitConv --> SurfaceMap
    
    SurfaceMap --> ComfortCalc
    SurfaceMap --> EnergyBal
    SurfaceMap --> PeakAnalysis
    SurfaceMap --> MonthlyAgg
    
    ComfortCalc --> SummaryDB
    EnergyBal --> SummaryDB
    PeakAnalysis --> SummaryDB
    MonthlyAgg --> SummaryDB
    
    TSNorm --> TSFile
```

### 13.2 Summary Metrics Computed

```python
class SimulationSummary(BaseModel):
    # Temperature
    indoor_temp_mean_annual: float       # °C
    indoor_temp_min: float               # °C (with hour)
    indoor_temp_max: float               # °C (with hour)
    indoor_temp_mean_monthly: list[float] # 12 values
    outdoor_temp_mean_annual: float
    
    # Comfort
    comfort_hours_adaptive_pct: float    # % (EN 16798 Category II)
    comfort_hours_pmv_pct: float         # % (|PMV| < 0.5)
    discomfort_degree_hours_cold: float  # °C·hr below 18°C
    discomfort_degree_hours_hot: float   # °C·hr above 26°C
    pmv_mean: float
    ppd_mean: float
    
    # Energy Balance (kWh/m² per year)
    solar_gain_windows: float
    solar_gain_opaque: float
    conduction_loss_walls: float
    conduction_loss_roof: float
    conduction_loss_floor: float
    conduction_loss_windows: float
    infiltration_loss: float
    internal_gains: float
    net_energy_balance: float
    
    # Per-surface detail
    surface_heat_flows: list[SurfaceHeatFlow]
    
    # Metadata
    simulation_runtime_sec: float
    energyplus_version: str
    warning_count: int
    severe_error_count: int
    weather_file_used: str
```

---

## 14. Report Generation

### 14.1 Architecture

```mermaid
graph TB
    subgraph "Input"
        SimResult["Simulation Result<br/>(from DB)"]
        DesignData["Design Data<br/>(geometry, materials)"]
        WeatherData["Weather Summary"]
        CompareData["Comparison Data<br/>(optional)"]
        OptData["Optimization Data<br/>(optional)"]
    end
    
    subgraph "Report Generator"
        Assembler["Data Assembler"]
        ChartRenderer["Chart Renderer<br/>(Matplotlib - server-side)"]
        TemplateEngine["Jinja2 Template<br/>Engine"]
        PDFRenderer["PDF Renderer<br/>(WeasyPrint)"]
    end
    
    subgraph "Templates"
        BaseTemplate["Base Template<br/>(header, footer, styles)"]
        SummarySection["Executive Summary"]
        LocationSection["Location & Climate"]
        DesignSection["Design Specification"]
        ResultSection["Simulation Results"]
        ComfortSection["Thermal Comfort Analysis"]
        CompareSection["Design Comparison"]
        OptSection["Optimization Results"]
        MethodSection["Methodology & Assumptions"]
    end
    
    subgraph "Output"
        PDF["PDF Report"]
        HTML["HTML Report"]
    end
    
    SimResult --> Assembler
    DesignData --> Assembler
    WeatherData --> Assembler
    CompareData --> Assembler
    OptData --> Assembler
    
    Assembler --> ChartRenderer
    Assembler --> TemplateEngine
    ChartRenderer --> TemplateEngine
    
    TemplateEngine --> BaseTemplate
    TemplateEngine --> SummarySection
    TemplateEngine --> LocationSection
    TemplateEngine --> DesignSection
    TemplateEngine --> ResultSection
    TemplateEngine --> ComfortSection
    TemplateEngine --> CompareSection
    TemplateEngine --> OptSection
    TemplateEngine --> MethodSection
    
    TemplateEngine --> PDFRenderer
    PDFRenderer --> PDF
    TemplateEngine --> HTML
```

### 14.2 Report Sections

1. **Cover Page** — Project name, location, date, version
2. **Executive Summary** — Key metrics (comfort hours, peak indoor temp, energy balance) in a dashboard layout
3. **Location & Climate** — Map, coordinates, altitude, ASHRAE zone, climate summary charts (monthly temp/radiation)
4. **Design Specification** — 3D render (pre-rendered image), dimensions table, construction details, material properties, fenestration schedule
5. **Simulation Results** — Annual temperature profile (indoor vs outdoor), monthly averages, peak conditions
6. **Thermal Comfort Analysis** — PMV/PPD distribution, adaptive comfort chart, 8760-hour comfort heatmap, comfort hours summary
7. **Energy Balance** — Annual energy balance table, Sankey diagram, per-surface heat flow breakdown
8. **Design Comparison** (optional) — Side-by-side metrics table, overlay charts, improvement percentages
9. **Optimization Results** (optional) — Pareto front plot, top 5 recommended designs, parameter sensitivity
10. **Methodology & Assumptions** — EnergyPlus version, weather file source, infiltration model, comfort standard used, limitations

---

## 15. Background Jobs

### 15.1 Celery Architecture

```mermaid
graph TB
    subgraph "FastAPI Process"
        API["API Handlers"]
        TaskSubmit["Task Submission<br/>(celery.send_task)"]
    end
    
    subgraph "Redis"
        Broker["Message Broker<br/>(task queue)"]
        ResultBackend["Result Backend<br/>(task status)"]
        PubSub["Pub/Sub Channels<br/>(WebSocket relay)"]
    end
    
    subgraph "Celery Workers"
        Worker1["Worker 1<br/>(simulation)"]
        Worker2["Worker 2<br/>(simulation)"]
        Worker3["Worker 3<br/>(optimization/reports)"]
    end
    
    subgraph "Celery Beat"
        Beat["Periodic Scheduler"]
        Cleanup["cleanup_old_files<br/>(daily)"]
        HealthCheck["engine_health_check<br/>(hourly)"]
    end
    
    API --> TaskSubmit
    TaskSubmit --> Broker
    Broker --> Worker1
    Broker --> Worker2
    Broker --> Worker3
    Worker1 --> ResultBackend
    Worker2 --> ResultBackend
    Worker3 --> ResultBackend
    Worker1 --> PubSub
    Worker2 --> PubSub
    Beat --> Cleanup
    Beat --> HealthCheck
    Cleanup --> Broker
    HealthCheck --> Broker
```

### 15.2 Task Definitions

| Task | Queue | Timeout | Retry | Description |
|---|---|---|---|---|
| `run_simulation` | `simulation` | 600s | 0 | Execute EnergyPlus/OpenStudio/ANSYS simulation |
| `cancel_simulation` | `simulation` | 30s | 0 | Kill running simulation subprocess |
| `run_parametric_sweep` | `optimization` | 7200s | 0 | Orchestrate N simulation runs for parametric study |
| `run_nsga2_optimization` | `optimization` | 14400s | 0 | Orchestrate NSGA-II optimization loop |
| `generate_report` | `reporting` | 120s | 1 | Generate PDF/HTML report |
| `fetch_nasa_power` | `weather` | 60s | 2 | Fetch weather data from NASA POWER API |
| `convert_weather_to_epw` | `weather` | 30s | 1 | Convert CSV/NASA data to EPW format |
| `cleanup_old_files` | `maintenance` | 300s | 0 | Remove simulation working directories older than 7 days |
| `engine_health_check` | `maintenance` | 30s | 0 | Verify EnergyPlus/OpenStudio are accessible |

### 15.3 Worker Configuration

```python
# tasks/celery_app.py

from celery import Celery

celery_app = Celery("shelter_sim")
celery_app.config_from_object({
    "broker_url": "redis://redis:6379/0",
    "result_backend": "redis://redis:6379/1",
    "task_serializer": "json",
    "result_serializer": "json",
    "accept_content": ["json"],
    "task_track_started": True,
    "task_time_limit": 600,         # hard kill after 10 min
    "task_soft_time_limit": 540,    # soft warning at 9 min
    "worker_prefetch_multiplier": 1, # one task at a time (simulations are heavy)
    "worker_concurrency": 2,         # 2 concurrent simulations per worker
    "task_routes": {
        "tasks.simulation_tasks.*": {"queue": "simulation"},
        "tasks.optimization_tasks.*": {"queue": "optimization"},
        "tasks.report_tasks.*": {"queue": "reporting"},
        "tasks.weather_tasks.*": {"queue": "weather"},
    },
})
```

### 15.4 WebSocket Progress Relay

```python
# When a Celery worker updates simulation progress:
# 1. Worker publishes to Redis Pub/Sub channel: simulation:{sim_id}:progress
# 2. FastAPI WebSocket handler subscribes to that channel
# 3. Frontend receives progress updates in real-time

# Worker side:
redis_client.publish(f"simulation:{sim_id}:progress", json.dumps({
    "status": "running",
    "progress_pct": 42,
    "current_month": "June",
    "elapsed_sec": 15.3,
    "est_remaining_sec": 21.1,
}))

# FastAPI WebSocket handler:
@app.websocket("/api/v1/simulations/{sim_id}/progress")
async def simulation_progress(websocket: WebSocket, sim_id: str):
    await websocket.accept()
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"simulation:{sim_id}:progress")
    async for message in pubsub.listen():
        if message["type"] == "message":
            await websocket.send_text(message["data"])
```

---

## 16. File Storage

### 16.1 Storage Layout

```
storage/
├── weather/                          # EPW files
│   ├── system/                       # Pre-bundled EPW files
│   │   ├── IND_LA_Leh_TMYx.epw
│   │   ├── IND_DL_NewDelhi_TMYx.epw
│   │   └── ...
│   └── user/                         # User-uploaded EPW files
│       └── {user_id}/
│           └── {file_id}.epw
│
├── simulations/                      # Simulation working directories
│   └── {simulation_id}/
│       ├── in.idf                    # Generated IDF input
│       ├── weather.epw               # Symlink or copy of weather file
│       ├── Energy+.idd               # Symlink to EnergyPlus IDD
│       ├── eplusout.csv              # EnergyPlus outputs
│       ├── eplusout.sql
│       ├── eplusout.err
│       ├── eplusout.end
│       ├── eplustbl.htm
│       └── ...
│
├── results/                          # Processed result files
│   └── {simulation_id}/
│       ├── timeseries.parquet        # Hourly data in columnar format
│       └── charts/                   # Pre-rendered chart images (for reports)
│           ├── temperature_profile.png
│           ├── comfort_heatmap.png
│           └── energy_balance.png
│
├── reports/                          # Generated reports
│   └── {report_id}/
│       └── report.pdf
│
└── exports/                          # Exported files (IDF, gbXML, etc.)
    └── {design_id}/
        ├── shelter.idf
        └── shelter.osm
```

### 16.2 File Storage Abstraction

```python
# core/file_storage.py

class FileStorage(ABC):
    """Abstract file storage — local filesystem or S3-compatible."""
    
    @abstractmethod
    def save(self, relative_path: str, content: bytes) -> str: ...
    
    @abstractmethod
    def read(self, relative_path: str) -> bytes: ...
    
    @abstractmethod
    def exists(self, relative_path: str) -> bool: ...
    
    @abstractmethod
    def delete(self, relative_path: str) -> None: ...
    
    @abstractmethod
    def get_absolute_path(self, relative_path: str) -> Path: ...

class LocalFileStorage(FileStorage):
    def __init__(self, root_dir: Path):
        self.root = root_dir
    # ... implementation

class S3FileStorage(FileStorage):
    def __init__(self, bucket: str, prefix: str):
        self.bucket = bucket
        self.prefix = prefix
    # ... implementation (future)
```

### 16.3 Cleanup Policy

- **Simulation working directories:** Retained for 7 days after completion, then auto-deleted by the `cleanup_old_files` Celery Beat task. The `in.idf` and `eplusout.err` are archived before deletion.
- **Result Parquet files:** Retained indefinitely (they are small — ~2 MB per simulation).
- **Reports:** Retained indefinitely.
- **User-uploaded EPW files:** Retained while the user account exists.

---

## 17. Authentication

### 17.1 Architecture

```mermaid
graph LR
    subgraph "Client"
        Login["Login Form"]
        TokenStore["Token Storage<br/>(httpOnly cookie)"]
    end
    
    subgraph "Backend"
        AuthRouter["Auth Router"]
        JWTService["JWT Service"]
        PasswordHash["bcrypt Hasher"]
        UserModel["User Model"]
    end
    
    subgraph "Token Flow"
        AccessToken["Access Token<br/>(15 min TTL)"]
        RefreshToken["Refresh Token<br/>(7 day TTL)"]
    end
    
    Login --> AuthRouter
    AuthRouter --> PasswordHash
    AuthRouter --> JWTService
    JWTService --> AccessToken
    JWTService --> RefreshToken
    AccessToken --> TokenStore
    RefreshToken --> TokenStore
```

### 17.2 Implementation

| Component | Technology | Details |
|---|---|---|
| Password hashing | **bcrypt** (via `passlib`) | 12 rounds |
| Token format | **JWT** (via `python-jose`) | HS256, configurable secret |
| Access token TTL | 15 minutes | Short-lived, carried in `Authorization: Bearer` header |
| Refresh token TTL | 7 days | Stored in httpOnly cookie, used to get new access tokens |
| User model | Email + hashed password + full name | Minimal for hackathon scope |
| Authorization | **Owner-based** | Users can only access their own projects/designs/simulations |

### 17.3 Dependency Injection

```python
# api/deps.py

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    user_id = payload.get("sub")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

async def get_current_project(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    project = await db.get(Project, project_id)
    if not project or project.user_id != user.id:
        raise HTTPException(status_code=404)
    return project
```

---

## 18. Testing Architecture

### 18.1 Test Layers

```mermaid
graph TB
    subgraph "Test Pyramid"
        E2E["E2E Tests<br/>(Playwright)<br/>~10 tests"]
        Integration["Integration Tests<br/>(FastAPI TestClient + DB)<br/>~50 tests"]
        Unit["Unit Tests<br/>(pytest)<br/>~200 tests"]
        Validation["BESTEST Validation<br/>(EnergyPlus)<br/>~5 cases"]
    end
    
    E2E --> Integration
    Integration --> Unit
    Validation --> Unit
```

### 18.2 Test Categories

| Category | Framework | What It Tests | Requires EnergyPlus |
|---|---|---|---|
| **Unit — Geometry** | pytest | Vertex generation, surface normals, area calculations, winding order | No |
| **Unit — IDF Generation** | pytest | IDF object creation, field values, object relationships | No |
| **Unit — Material Validation** | pytest | Property bounds, construction assembly validation | No |
| **Unit — EPW Parsing** | pytest | EPW header/data extraction, climate summary computation | No |
| **Unit — Comfort Calculation** | pytest | PMV/PPD against known reference values | No |
| **Unit — Result Processing** | pytest | Metric computation from mock EnergyPlus output | No |
| **Integration — API** | pytest + httpx | Full request-response cycle through FastAPI TestClient | No |
| **Integration — Database** | pytest + SQLAlchemy | ORM model CRUD, query correctness, migration integrity | No |
| **Integration — Simulation** | pytest | IDF generation + EnergyPlus execution + result parsing | **Yes** |
| **Validation — BESTEST** | pytest | ASHRAE 140 qualification cases (600, 610, 620, 630, 900) | **Yes** |
| **E2E — Frontend** | Playwright | User workflow: create project → design shelter → run simulation → view results | **Yes** |

### 18.3 BESTEST Validation Cases

| Case | Description | What We Validate |
|---|---|---|
| Case 600 | Low-mass rectangular building, south windows | Annual heating/cooling load within reference range |
| Case 610 | Case 600 + south overhang shading | Shading effect on cooling load |
| Case 620 | Case 600 + east/west windows | Orientation effect |
| Case 630 | Case 620 + east/west overhangs | Combined orientation + shading |
| Case 900 | High-mass version of Case 600 | Thermal mass effect |

### 18.4 Test Configuration

```python
# tests/conftest.py

@pytest.fixture
def db_session():
    """In-memory SQLite for fast unit tests."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture
def api_client(db_session):
    """FastAPI TestClient with injected test DB."""
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)

@pytest.fixture
def energyplus_path():
    """Skip tests if EnergyPlus is not installed."""
    ep_path = os.environ.get("ENERGYPLUS_PATH")
    if not ep_path or not Path(ep_path).exists():
        pytest.skip("EnergyPlus not installed")
    return Path(ep_path)

@pytest.fixture
def sample_shelter():
    """BESTEST Case 600 shelter model."""
    return ShelterModel(
        shape="rectangular",
        dimensions={"length": 8.0, "width": 6.0, "height": 2.7},
        orientation_deg=0,
        # ... full Case 600 specification
    )
```

---

## 19. Deployment Architecture

### 19.1 Docker Compose Stack

```mermaid
graph TB
    subgraph "Docker Network: shelter-net"
        Nginx["Nginx<br/>:80, :443"]
        
        subgraph "Frontend"
            NextJS["next-app<br/>:3000"]
        end
        
        subgraph "Backend"
            FastAPIApp["fastapi-app<br/>:8000"]
        end
        
        subgraph "Workers"
            CeleryW1["celery-worker-sim<br/>(simulation queue)"]
            CeleryW2["celery-worker-opt<br/>(optimization queue)"]
            CeleryW3["celery-worker-misc<br/>(weather, reports)"]
            CeleryBeat["celery-beat<br/>(periodic tasks)"]
        end
        
        subgraph "Data Services"
            PG["PostgreSQL<br/>:5432"]
            RedisDB["Redis<br/>:6379"]
        end
        
        subgraph "Volumes"
            PGData["pg-data"]
            StorageVol["storage-vol"]
            EPInstall["energyplus-vol<br/>(EnergyPlus install)"]
        end
    end
    
    Nginx --> NextJS
    Nginx --> FastAPIApp
    
    FastAPIApp --> PG
    FastAPIApp --> RedisDB
    FastAPIApp --> StorageVol
    
    CeleryW1 --> PG
    CeleryW1 --> RedisDB
    CeleryW1 --> StorageVol
    CeleryW1 --> EPInstall
    
    CeleryW2 --> PG
    CeleryW2 --> RedisDB
    CeleryW2 --> StorageVol
    CeleryW2 --> EPInstall
    
    CeleryW3 --> PG
    CeleryW3 --> RedisDB
    CeleryW3 --> StorageVol
    
    CeleryBeat --> RedisDB
    
    PG --> PGData
```

### 19.2 Docker Compose File Structure

```yaml
# docker-compose.yml (structure — not the actual file yet)
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: [./nginx/nginx.conf:/etc/nginx/nginx.conf]
    depends_on: [frontend, backend]

  frontend:
    build: ./frontend
    expose: [3000]
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000

  backend:
    build: ./backend
    expose: [8000]
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/shelter_sim
      - REDIS_URL=redis://redis:6379/0
      - ENERGYPLUS_PATH=/opt/EnergyPlus
      - STORAGE_ROOT=/storage
    volumes:
      - storage-vol:/storage
      - energyplus-vol:/opt/EnergyPlus
    depends_on: [postgres, redis]

  celery-worker-sim:
    build: ./backend
    command: celery -A app.tasks.celery_app worker -Q simulation -c 2
    volumes: [storage-vol:/storage, energyplus-vol:/opt/EnergyPlus]
    depends_on: [postgres, redis]

  celery-worker-opt:
    build: ./backend
    command: celery -A app.tasks.celery_app worker -Q optimization -c 1
    volumes: [storage-vol:/storage, energyplus-vol:/opt/EnergyPlus]
    depends_on: [postgres, redis]

  celery-worker-misc:
    build: ./backend
    command: celery -A app.tasks.celery_app worker -Q weather,reporting -c 2
    volumes: [storage-vol:/storage]
    depends_on: [postgres, redis]

  celery-beat:
    build: ./backend
    command: celery -A app.tasks.celery_app beat
    depends_on: [redis]

  postgres:
    image: postgres:16
    environment: [POSTGRES_DB=shelter_sim, POSTGRES_USER=user, POSTGRES_PASSWORD=pass]
    volumes: [pg-data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    volumes: [redis-data:/data]

volumes:
  pg-data:
  redis-data:
  storage-vol:
  energyplus-vol:
```

### 19.3 Backend Dockerfile

```dockerfile
FROM python:3.11-slim

# Install EnergyPlus
RUN apt-get update && apt-get install -y wget && \
    wget -q https://github.com/NREL/EnergyPlus/releases/download/v24.2.0/EnergyPlus-24.2.0-SHA-Linux-Ubuntu22.04-x86_64.sh && \
    chmod +x EnergyPlus-*.sh && \
    echo "y" | ./EnergyPlus-*.sh && \
    rm EnergyPlus-*.sh

# Install Python dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 19.4 Nginx Configuration

```nginx
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name shelter-sim.example.com;

    # API requests → FastAPI
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 600s;  # Long timeout for simulation endpoints
    }

    # WebSocket → FastAPI
    location /api/v1/simulations/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Report downloads → FastAPI (direct file serving)
    location /api/v1/reports/ {
        proxy_pass http://backend;
    }

    # Everything else → Next.js
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

---

## 20. Data Flow — End to End

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (Next.js)
    participant API as Backend (FastAPI)
    participant DB as PostgreSQL
    participant Redis
    participant Worker as Celery Worker
    participant GeoEng as Geometry Engine
    participant IDFGen as IDF Generator
    participant EP as EnergyPlus
    participant Comfort as Comfort Service
    
    User->>FE: Define shelter (dims, materials, windows)
    FE->>FE: 3D preview (client-side geometry)
    FE->>API: POST /designs {shelter_data}
    API->>GeoEng: Generate surfaces from parameters
    GeoEng-->>API: Surface vertices + validation result
    API->>DB: Store Design
    API-->>FE: 201 {design_id}
    
    User->>FE: Click "Run Simulation"
    FE->>API: POST /simulations {design_id, engine: "energyplus"}
    API->>DB: Create Simulation(status=queued)
    API->>Redis: Enqueue run_simulation task
    API-->>FE: 202 {simulation_id}
    
    FE->>API: WS /simulations/{id}/progress
    
    Worker->>Redis: Dequeue task
    Worker->>DB: Load Design + Materials + Weather
    Worker->>IDFGen: Generate IDF from shelter model
    IDFGen-->>Worker: in.idf (validated)
    Worker->>EP: subprocess.run(energyplus ...)
    
    loop Progress monitoring
        Worker->>Redis: Publish progress
        Redis-->>API: Forward via Pub/Sub
        API-->>FE: WS message {progress: 65%}
        FE->>User: Update progress bar
    end
    
    EP-->>Worker: Simulation complete
    Worker->>Worker: Parse eplusout.sql
    Worker->>Comfort: Compute PMV/PPD + Adaptive Comfort
    Comfort-->>Worker: Comfort metrics
    Worker->>Worker: Compute energy balance
    Worker->>DB: Store SimulationResult
    Worker->>Redis: Publish completion
    Redis-->>API: Forward via Pub/Sub
    API-->>FE: WS message {status: completed}
    
    FE->>API: GET /simulations/{id}/results
    API->>DB: Load results
    API-->>FE: {summary, comfort, energy_balance}
    FE->>User: Render dashboard (charts, metrics, heatmap)
```

---

## 21. Inter-Service Communication

| From | To | Protocol | Purpose |
|---|---|---|---|
| Frontend | Backend API | REST (HTTP/1.1) | All CRUD operations, data queries |
| Frontend | Backend WS | WebSocket | Real-time simulation progress |
| Backend API | PostgreSQL | TCP (asyncpg) | Data persistence |
| Backend API | Redis | TCP | Task enqueue, pub/sub, caching |
| Backend API | Celery Worker | Redis (broker) | Task dispatch |
| Celery Worker | PostgreSQL | TCP (psycopg2) | Read design data, write results |
| Celery Worker | Redis | TCP | Task acknowledgment, progress publish |
| Celery Worker | EnergyPlus | Subprocess (stdin/stdout/stderr) | Simulation execution |
| Celery Worker | OpenStudio CLI | Subprocess | Alternative simulation path |
| Celery Worker | ANSYS (PyFluent) | gRPC (PyFluent internal) | CFD/FEA analysis (optional) |
| Backend → NASA POWER | HTTPS | Weather data fetch |

---

## 22. Error Handling Strategy

### 22.1 Error Classification

| Category | Example | HTTP Code | User Message | Recovery |
|---|---|---|---|---|
| **Validation** | Invalid geometry, material out of bounds | 422 | Specific field error | User corrects input |
| **Not Found** | Design/simulation/material doesn't exist | 404 | Resource not found | — |
| **Authorization** | Access to another user's project | 403 | Forbidden | — |
| **Simulation Warning** | EnergyPlus warning (non-fatal) | 200 (with warnings) | Warning list in results | Show warnings, allow result viewing |
| **Simulation Error** | EnergyPlus severe error / crash | 200 (status=failed) | Error log excerpt | User adjusts design, re-runs |
| **Engine Unavailable** | EnergyPlus not installed, ANSYS unlicensed | 503 | Engine not available | Admin installs engine |
| **Task Timeout** | Simulation exceeds 10 min | 200 (status=failed) | Simulation timed out | Simplify model or increase timeout |
| **Internal Error** | Unhandled exception | 500 | Internal server error | Developer investigates |

### 22.2 EnergyPlus Error Parsing

```python
class EnergyPlusErrorParser:
    """Parse eplusout.err into structured error/warning objects."""
    
    def parse(self, err_file_path: Path) -> EnergyPlusErrorReport:
        warnings = []
        severe_errors = []
        fatal_errors = []
        
        for line in err_file_path.read_text().splitlines():
            if "** Warning **" in line:
                warnings.append(self._extract_message(line))
            elif "** Severe  **" in line:
                severe_errors.append(self._extract_message(line))
            elif "**  Fatal  **" in line:
                fatal_errors.append(self._extract_message(line))
        
        return EnergyPlusErrorReport(
            warnings=warnings,
            severe_errors=severe_errors,
            fatal_errors=fatal_errors,
            success=len(fatal_errors) == 0,
        )
```

---

*This architecture document should be read alongside [TECHNOLOGY_STACK.md](file:///c:/CODINGG/HACKATHON/SIH%202026/docs/TECHNOLOGY_STACK.md) for version pinning and dependency details, and [PROJECT_OVERVIEW.md](file:///c:/CODINGG/HACKATHON/SIH%202026/docs/PROJECT_OVERVIEW.md) for problem context and development phases.*
