# Environment and Configuration Specification

**Document:** `docs/ENVIRONMENT.md`  
**Project:** SIH 2026 Problem Statement 26051 (Area-Specific Shelter Design & Thermal Comfort Platform)  
**Status:** Complete Audit & Reference Specification  
**Date:** September 2026  

---

## 1. System & Runtime Requirements

The platform is designed as a hybrid full-stack simulation application consisting of a Next.js frontend, a FastAPI Python backend, an asynchronous Celery task queue, and native thermodynamic simulation solver binaries (EnergyPlus).

### Supported Host Platforms
- **Primary Development OS:** Windows 11 (64-bit AMD64)
- **Production OS:** Linux (Ubuntu 22.04 / 24.04 LTS x86_64, Debian 12, or containerized Docker)
- **Subsystem Compatibility:** Windows Subsystem for Linux (WSL2 / Ubuntu 24.04)

### Core Runtime Dependencies
| Component | Required Version | Purpose |
|:---|:---|:---|
| **Python** | `>= 3.10` (tested with 3.12 / 3.14) | Backend API, simulation generator, results parser, optimization |
| **Node.js** | `>= 18.18` (tested with v24.7.0) | Next.js 14 frontend, 3D Canvas (Three.js), client UI |
| **npm** | `>= 9.0` (tested with 11.5.2) | Node package manager |
| **PostgreSQL** | `>= 14.0` (installed 18.4) | Relational persistence for projects, shelters, materials, simulations |
| **Redis** | `>= 6.0` | Message broker and result backend for Celery workers |
| **EnergyPlus** | `24.1.0` (recommended) or `23.2.0` | Native building thermodynamic simulation engine (NREL/DOE) |

---

## 2. Complete Environment Variable Inventory

Every environment variable evaluated by the platform is documented below, categorized by module and sensitivity:

### 2.1 Core Application & Security
| Variable | Type | Default Value | Sensitivity | Purpose |
|:---|:---:|:---|:---:|:---|
| `ENVIRONMENT` | string | `development` | Public | Sets operational mode (`development`, `staging`, `production`). In production, enforces strong `SECRET_KEY` and disables debug endpoints. |
| `DEBUG` | boolean | `true` | Public | Enables FastAPI automatic Swagger UI (`/api/v1/docs`), ReDoc, detailed stack traces, and SQL echo. |
| `LOG_LEVEL` | string | `INFO` | Public | Logging verbosity threshold (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `SECRET_KEY` | string | `default-insecure-secret-key-change-in-production` | **CRITICAL SECRET** | Secret key for cryptographic signing of session access tokens (HMAC-SHA256). Must be 32+ characters in production. |
| `API_V1_STR` | string | `/api/v1` | Public | Prefix for API v1 route aggregation. |
| `PROJECT_NAME` | string | `"Area-Specific Shelter Thermal Simulation Platform"` | Public | System name surfaced in OpenAPI schemas and report provenance. |

### 2.2 Database & Persistence
| Variable | Type | Default Value | Sensitivity | Purpose |
|:---|:---:|:---|:---:|:---|
| `DATABASE_URL` | string | `postgresql+asyncpg://postgres:postgres@localhost:5432/shelter_thermal_db` | **CONFIDENTIAL SECRET** | Full async connection URI for SQLAlchemy async session pool. |
| `POSTGRES_SERVER` | string | `localhost` | Public | Database host IP or domain name. |
| `POSTGRES_PORT` | integer | `5432` | Public | Database TCP listener port. |
| `POSTGRES_DB` | string | `shelter_thermal_db` | Public | Target database schema name. |
| `POSTGRES_USER` | string | `postgres` | Public | Database user account name. |
| `POSTGRES_PASSWORD` | string | `postgres` | **CONFIDENTIAL SECRET** | Database user password. |

### 2.3 Task Queue & Caching (Celery & Redis)
| Variable | Type | Default Value | Sensitivity | Purpose |
|:---|:---:|:---|:---:|:---|
| `REDIS_HOST` | string | `localhost` | Public | Redis server host. |
| `REDIS_PORT` | integer | `6379` | Public | Redis server port. |
| `REDIS_DB` | integer | `0` | Public | Redis logical database index for caching. |
| `CELERY_BROKER_URL` | string | `redis://localhost:6379/0` | **CONFIDENTIAL SECRET** (if auth) | Message broker connection string where simulation jobs are queued. |
| `CELERY_RESULT_BACKEND` | string | `redis://localhost:6379/1` | **CONFIDENTIAL SECRET** (if auth) | Result backend storing task execution metadata. |
| `CELERY_ALWAYS_EAGER` | boolean | `false` | Public | When `true`, executes Celery tasks synchronously in the main thread (used for tests or when Redis is offline). |

### 2.4 Simulation Engines & Binaries
| Variable | Type | Default Value | Sensitivity | Purpose |
|:---|:---:|:---|:---:|:---|
| `ENERGYPLUS_DIR` | path | `C:\EnergyPlusV24-1-0` | Path / Config | Base directory of the EnergyPlus engine installation. |
| `ENERGYPLUS_EXE` | path | `C:\EnergyPlusV24-1-0\energyplus.exe` | Path / Config | Absolute path to the `energyplus.exe` binary. Verified against binary allowlist before execution. |
| `OPENSTUDIO_EXE` | path | `C:\openstudio-3.7.0\bin\openstudio.exe` | Path / Config | Path to the OpenStudio CLI runner (optional). |
| `ANSYS_DIR` | path | `C:\Program Files\ANSYS Inc\v241` | Path / Config | Root directory of the commercial ANSYS installation (optional). |
| `ANSYS_FLUENT_EXE` | path | `C:\Program Files\ANSYS Inc\v241\fluent\ntbin\win64\fluent.exe` | Path / Config | Path to the ANSYS Fluent executable for CFD batch runs. |
| `ANSYSLMD_LICENSE_FILE` | string | *(None)* | **INTERNAL CONFIDENTIAL** | FlexNet license server coordinates (`port@host`) for ANSYS solver licensing. |
| `ANSYS_LICENSE_FILE` | string | *(None)* | **INTERNAL CONFIDENTIAL** | Alternative FlexNet license pointer. |
| `USERPROFILE` | path | *(OS Environment)* | Path | Evaluated on Windows to detect user-installed EnergyPlus binaries in `%USERPROFILE%\EnergyPlus...`. |

### 2.5 Simulation Limits & Execution Guardrails
| Variable | Type | Default Value | Sensitivity | Purpose |
|:---|:---:|:---|:---:|:---|
| `SIMULATION_TIMEOUT_SECONDS` | integer | `600` (10 min) | Public | Soft execution timeout for EnergyPlus runs. Process terminated if exceeded. |
| `MAX_SIMULATION_TIMEOUT_SECONDS` | integer | `1800` (30 min) | Public | Absolute maximum hard timeout allowed in request payloads. |
| `MAX_CONCURRENT_SIMULATIONS` | integer | `4` | Public | Maximum number of simultaneous EnergyPlus processes allowed to execute concurrently. |
| `SIMULATION_TEMP_DIR` | path | `./storage/simulations` | Path | Root directory for isolated transient simulation execution workspaces. |
| `RATE_LIMIT_SIMULATION_PER_MINUTE` | integer | `15` | Public | Rate limiter quota for simulation queue requests per IP per minute. |
| `RATE_LIMIT_GENERAL_PER_MINUTE` | integer | `60` | Public | Rate limiter quota for general API calls per IP per minute. |
| `MAX_REQUEST_BODY_BYTES` | integer | `15728640` (15 MB) | Public | Maximum permitted request payload size. Protects against large file injection attacks. |

### 2.6 Climate Services & Storage
| Variable | Type | Default Value | Sensitivity | Purpose |
|:---|:---:|:---|:---:|:---|
| `NASA_POWER_BASE_URL` | URL | `https://power.larc.nasa.gov/api/temporal/hourly/point` | Public (Keyless) | REST endpoint for querying NASA POWER hourly satellite meteorological data. |
| `NASA_POWER_TIMEOUT_SECONDS` | integer | `30` | Public | Network HTTP request timeout when querying NASA POWER. |
| `WEATHER_CACHE_DIR` | path | `./storage/weather` | Path | Directory where downloaded EPW files and satellite cache responses are persisted. |
| `STORAGE_ROOT` | path | `./storage` | Path | Root data storage directory. |
| `REPORTS_DIR` | path | `./storage/reports` | Path | Target directory for generated PDF and CSV engineering reports. |

### 2.7 Frontend & CORS
| Variable | Type | Default Value | Sensitivity | Purpose |
|:---|:---:|:---|:---:|:---|
| `FRONTEND_URL` | URL | `http://localhost:3000` | Public | Canonical frontend application origin. |
| `CORS_ORIGINS` | list/JSON | `["http://localhost:3000","http://127.0.0.1:3000"]` | Public | Permitted CORS origins for cross-origin browser requests. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | integer | `1440` (24 hr) | Public | Expiration time for issued JWT access tokens. |
| `ALGORITHM` | string | `HS256` | Public | Cryptographic algorithm for JWT session tokens. |

---

## 3. Resilience & Fallback Mechanisms

The backend is architected with graceful degradation mechanics to allow development and demonstration without external infrastructure:

```mermaid
flowchart TD
    Req[POST /api/simulations] --> BrokerCheck{Is Redis Available?}
    BrokerCheck -- Yes --> CeleryQueue[Dispatch to Celery Task Queue\ncelery_app.run_simulation_task.delay]
    BrokerCheck -- No --> ThreadFallback[Local Background Thread Fallback\nthreading.Thread daemon=True]
    
    CeleryQueue --> EngineCheck{Is EnergyPlus Installed?}
    ThreadFallback --> EngineCheck
    
    EngineCheck -- Yes --> RunEPlus[Execute Native energyplus.exe]
    EngineCheck -- No --> ReportMissing[Fail Job with Clear Error Message\n'EnergyPlus executable not found']
```

1. **Redis Broker Resilience:**
   - On startup, `backend/core/celery_app.py` probes Redis on `REDIS_HOST:REDIS_PORT`.
   - If Redis is unreachable, Celery switches to `memory://` broker and `cache+memory://` backend.
   - If Celery dispatch throws an exception during `queue_simulation()`, the system falls back to a managed background daemon thread (`threading.Thread`).
2. **Binary Allowlist Protection:**
   - Every executable path passed to sub-processes is strictly validated by `backend/core/binary_allowlist.py`.
   - Executables must reside within approved directories (`C:\EnergyPlus...`, `C:\Program Files\EnergyPlus...`, or `%USERPROFILE%\EnergyPlus...`). Arbitrary binary execution via path injection is blocked.
3. **Log Sanitization:**
   - `backend/simulation/store.py` (`sanitize_message`) automatically strips local filesystem paths (`C:\Users\...`, `[PATH]`) from user-facing error messages, preventing server directory disclosure.

---

## 4. Local Environment Setup Guide

### Step 1: Clone and Configure Environment File
```bash
cp .env.example .env
```
Edit `.env` to verify your local paths:
- Set `ENERGYPLUS_EXE` to your EnergyPlus binary location.
- In production, generate a secure `SECRET_KEY`:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```

### Step 2: Backend Setup
```bash
# Create virtual environment
python -m venv .venv
# Activate on Windows:
.venv\Scripts\activate
# Activate on Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### Step 3: Frontend Setup
```bash
cd frontend
npm install
cd ..
```

### Step 4: Run Development Services
```bash
# Terminal 1: Backend API (FastAPI)
python -m uvicorn backend.main:app --reload --port 8000

# Terminal 2: Celery Worker (Optional - only if Redis is running)
celery -A backend.core.celery_app worker --loglevel=info -P solo

# Terminal 3: Frontend (Next.js)
cd frontend
npm run dev -- -p 3001
```

---

## 5. Security & Deployment Audit Checklist

- [x] **No Secrets in Frontend:** Verified zero `NEXT_PUBLIC_*` secrets and zero `process.env` lookups in client code.
- [x] **Git Tracking Guard:** `.gitignore` blocks all `.env`, `.env.*`, certificate, key, and simulation scratch files.
- [x] **Keyless Third-Party Access:** Verified NASA POWER API requires no authentication or API keys.
- [x] **No Extraneous APIs:** Confirmed Google Maps/Places/Elevation are completely absent and not required.
- [x] **Production Secret Key Enforcement:** Verified `backend/core/config.py` raises a critical error if default or weak `SECRET_KEY` is used when `ENVIRONMENT=production`.
- [ ] **Pending Hardcoded Demo User Remediation:** Hardcoded `DEMO_USERS` passwords in `backend/core/security.py` lines 155–172 must be migrated to database-backed user records with PBKDF2 salt generated at user creation.
