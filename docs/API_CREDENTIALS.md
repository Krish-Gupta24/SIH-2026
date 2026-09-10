# External Services and Credential Audit

**Document:** `docs/API_CREDENTIALS.md`  
**Project:** SIH 2026 Problem Statement 26051  
**Status:** Complete Audit  
**Date:** September 2026  

---

## 1. Executive Summary

This document audits all external services, third-party APIs, and credentials utilized or referenced by the SIH 2026 PS 26051 shelter simulation platform.

### Summary of Service Audit Results
- **Third-Party API Keys Required:** **0** (Zero). The platform does **not** rely on any proprietary, paid, or API-key-gated third-party cloud services.
- **External Public APIs:** NASA POWER API is used as the satellite meteorological provider. It is a **100% public, keyless, open-access** REST API. No authentication or API key is required.
- **Google Maps / Places / Geocoding / Elevation:** **Not Used.** Codebase inspection reveals zero usage of Google Maps, Google Places, Google Geocoding, or Google Elevation APIs. Location coordinates and elevation are sourced from canonical engineering profiles (e.g. Leh Airport, Kargil, Dras) or manual engineering inputs.
- **Simulation Solvers:** EnergyPlus and OpenStudio are free, open-source binaries running locally on the host machine. They do not require license keys or API keys.
- **ANSYS (Optional):** Requires an on-premises or cluster FlexNet license server (`ANSYSLMD_LICENSE_FILE` port@host), not an API key.
- **Internal Security Secrets:** The only required secrets are the internal application cryptographic signing key (`SECRET_KEY`), database credentials (`DATABASE_URL`), and Celery message broker credentials (`CELERY_BROKER_URL`).

---

## 2. Service-by-Service Credential Specifications

### Service 1: Internal Application Cryptographic Signing Key
- **SERVICE:** Internal FastAPI Application Core (HMAC-SHA256 Token Manager)
- **PURPOSE:** Cryptographically signs and validates session access tokens (JWT/Bearer tokens) for Role-Based Access Control (RBAC: Viewer, Engineer, Admin) and verifies session integrity.
- **REQUIRED:** **YES (Mandatory for non-development environments)**
- **KEY/SECRET REQUIRED:** **YES (Secret Key)**
- **WHERE TO GET IT:** Generate locally using a cryptographically secure random generator:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  # or
  openssl rand -hex 32
  ```
- **ENV VARIABLE:** `SECRET_KEY`
- **SERVER OR CLIENT:** **SERVER-SIDE ONLY** (Must NEVER be exposed to frontend or client-side bundles)
- **SECURITY REQUIREMENTS:**
  - Minimum 32 characters (256 bits of entropy) in production.
  - Stored strictly in environment variables or container secret stores (`.env` omitted from git).
  - Must not use the development default (`"default-insecure-secret-key-change-in-production"`).
  - Validated at application startup via Pydantic validator in `backend/core/config.py`.

---

### Service 2: PostgreSQL Database Engine
- **SERVICE:** PostgreSQL Relational Database (via `asyncpg` async driver and SQLAlchemy)
- **PURPOSE:** Stores persistent records for projects, shelter models, multilayer constructions, material libraries, simulation runs, and user credentials.
- **REQUIRED:** **YES (For persistent operational mode)**
- **KEY/SECRET REQUIRED:** **YES (Database Password)**
- **WHERE TO GET IT:** Configured during PostgreSQL database installation / setup:
  - Local installation: configured via `psql` or `pg_admin`.
  - Docker Compose: set in `docker-compose.yml`.
  - Cloud provider: AWS RDS, Azure Database for PostgreSQL, or Supabase connection string.
- **ENV VARIABLE:** `DATABASE_URL` (Optionally broken down into `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_SERVER`, `POSTGRES_PORT`, `POSTGRES_DB`)
- **SERVER OR CLIENT:** **SERVER-SIDE ONLY**
- **SECURITY REQUIREMENTS:**
  - Standard format: `postgresql+asyncpg://<username>:<password>@<host>:<port>/<database>`
  - Strong, non-default database password in production.
  - Database port (5432) must not be publicly exposed to the internet; accessible only within private VPC or localhost.
  - SSL/TLS encryption (`ssl=require`) enforced for remote connections.

---

### Service 3: Redis In-Memory Broker & Cache
- **SERVICE:** Redis (Message Broker & Result Store for Celery Distributed Task Queue)
- **PURPOSE:** Coordinates asynchronous, isolated EnergyPlus simulation jobs and optimization sweeps without blocking the FastAPI HTTP event loop.
- **REQUIRED:** **OPTIONAL in development** (Application automatically falls back to in-memory execution via daemon threads or Celery eager mode if Redis is offline); **MANDATORY in production**.
- **KEY/SECRET REQUIRED:** **CONDITIONAL** (Password required if Redis is configured with `requirepass`).
- **WHERE TO GET IT:** Set in `redis.conf` (`requirepass <password>`) or provided by managed cloud cache (AWS ElastiCache, Redis Cloud, Upstash).
- **ENV VARIABLE:** `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `REDIS_HOST`, `REDIS_PORT`
- **SERVER OR CLIENT:** **SERVER-SIDE ONLY**
- **SECURITY REQUIREMENTS:**
  - Format with auth: `redis://:<password>@<host>:<port>/0`
  - Accessible only via private internal network or localhost.
  - TLS encryption (`rediss://`) recommended for remote broker connections.

---

### Service 4: NASA POWER Meteorological API
- **SERVICE:** NASA Prediction Of Worldwide Energy Resources (POWER) API
- **PURPOSE:** Provides satellite-derived hourly meteorological data (drybulb temperature, direct solar radiation, diffuse solar irradiance, relative humidity, wind speed, atmospheric pressure) for high-altitude locations where measured EPW files do not exist.
- **REQUIRED:** **OPTIONAL / AS NEEDED** (Used when requesting live satellite weather; the platform primarily consumes standardized local EPW files).
- **KEY/SECRET REQUIRED:** **NO (KEYLESS / PUBLIC)**
  - *Technical Verification:* The NASA POWER API endpoint at `https://power.larc.nasa.gov/api/temporal/hourly/point` is completely public, keyless, and free of charge. NASA Langley Research Center does not mandate API keys, OAuth tokens, or user registration for standard point queries.
- **WHERE TO GET IT:** No registration or API key required. Publicly accessible:
  ```
  GET https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=T2M,ALLSKY_SFC_SW_DWN&community=SB&longitude=77.58&latitude=34.15&start=20230101&end=20230103&format=JSON
  ```
- **ENV VARIABLE:** `NASA_POWER_BASE_URL` (default: `https://power.larc.nasa.gov/api/temporal/hourly/point`)
- **SERVER OR CLIENT:** **SERVER-SIDE ONLY** (Backend proxies requests to avoid CORS and caches meteorological payloads in `storage/weather/`).
- **SECURITY REQUIREMENTS:**
  - Standard HTTPS transport security.
  - Rate limiting / local caching in `WEATHER_CACHE_DIR` to prevent IP throttling by NASA servers.

---

### Service 5: EnergyPlus Building Simulation Engine
- **SERVICE:** EnergyPlus (US Department of Energy / National Renewable Energy Laboratory)
- **PURPOSE:** Primary thermodynamic solver that simulates 1D multi-layer transient wall conduction, thermal radiation exchange, solar aperture transmission, and zone heat balances.
- **REQUIRED:** **MANDATORY for thermal simulation execution**
- **KEY/SECRET REQUIRED:** **NO (Open Source / Free)**
- **WHERE TO GET IT:** Download and install binary from EnergyPlus official releases:
  - Official URL: `https://github.com/NREL/EnergyPlus/releases`
  - Recommended Version: `EnergyPlus v24.1.0`
- **ENV VARIABLE:** `ENERGYPLUS_DIR`, `ENERGYPLUS_EXE` (default: `C:\EnergyPlusV24-1-0\energyplus.exe`)
- **SERVER OR CLIENT:** **SERVER-SIDE ONLY (Local Binary Execution)**
- **SECURITY REQUIREMENTS:**
  - Must reside in approved installation directories verified by `backend.core.binary_allowlist.BinaryAllowlist`.
  - Executed in isolated working directories (`storage/simulations/sim_<id>/`) with execution timeouts enforced (`SIMULATION_TIMEOUT_SECONDS=600`).

---

### Service 6: OpenStudio CLI Engine (Optional)
- **SERVICE:** OpenStudio Command Line Interface (NREL)
- **PURPOSE:** Advanced building geometry and HVAC sub-process modeling workflows.
- **REQUIRED:** **OPTIONAL** (Not required for canonical EnergyPlus simulation runs).
- **KEY/SECRET REQUIRED:** **NO (Open Source / Free)**
- **WHERE TO GET IT:** Download from OpenStudio GitHub releases (`https://github.com/NREL/OpenStudio/releases`).
- **ENV VARIABLE:** `OPENSTUDIO_EXE` (default: `C:\openstudio-3.7.0\bin\openstudio.exe`)
- **SERVER OR CLIENT:** **SERVER-SIDE ONLY**
- **SECURITY REQUIREMENTS:** Verified against binary allowlist before subprocess execution.

---

### Service 7: ANSYS Fluent / Mechanical Engine (Optional)
- **SERVICE:** ANSYS Inc. Commercial Simulation Suite (CFD / FEA)
- **PURPOSE:** Generates high-fidelity 3D computational fluid dynamics (CFD) boundary condition decks and finite element thermal bridge meshes for external cluster execution.
- **REQUIRED:** **OPTIONAL** (The platform generates exportable journal decks without requiring a local ANSYS license; execution of the solver requires ANSYS installation).
- **KEY/SECRET REQUIRED:** **LICENSE SERVER POINTER REQUIRED (FlexNet)**
- **WHERE TO GET IT:** Academic, DRDO, or corporate enterprise ANSYS license agreement.
- **ENV VARIABLE:** `ANSYSLMD_LICENSE_FILE` or `ANSYS_LICENSE_FILE` (Format: `<port>@<license_server_hostname>`)
- **SERVER OR CLIENT:** **SERVER-SIDE ONLY**
- **SECURITY REQUIREMENTS:**
  - License server connection string contains sensitive internal hostnames and IP addresses. Must remain strictly server-side.

---

### Service 8: Google Maps / Places / Geocoding / Elevation
- **STATUS:** **NOT USED / NOT REQUIRED**
- **AUDIT FINDING:** A full-text scan of all source files in `frontend/src/` and `backend/` verified that:
  1. No Google Maps JavaScript API script tags or NPM packages (`@react-google-maps/api`, `@googlemaps/...`) exist.
  2. No HTTP requests to `maps.googleapis.com` exist.
  3. All high-altitude locations (Leh, Kargil, Dras, Tawang, Siachen) have pre-configured canonical coordinates and elevations in `backend/api/v1/endpoints/weather.py` and `frontend/src/lib/store/use-shelter-store.ts`.
  4. **Conclusion:** NO Google Maps API keys should be added to `.env` or requested from users.

---

## 3. Credential Matrix & Vulnerability Analysis

| Variable | Type | Required | Exposed to Client? | Current Code Status | Remediation Needed |
|:---|:---:|:---:|:---:|:---|:---|
| `SECRET_KEY` | Secret | Yes | No | Hardcoded fallback in `config.py` line 23 | Enforce mandatory 32+ char key in production |
| `DATABASE_URL` | Secret | Yes | No | Hardcoded fallback (`postgres:postgres`) | Provide empty template; require explicit env var |
| `CELERY_BROKER_URL` | Secret (if auth) | Conditional | No | Hardcoded `redis://localhost:6379/0` | Support password-protected Redis URLs |
| `CELERY_RESULT_BACKEND` | Secret (if auth) | Conditional | No | Hardcoded `redis://localhost:6379/1` | Support password-protected Redis URLs |
| `ENERGYPLUS_EXE` | Path | Yes | No | Validated via `BinaryAllowlist` | Keep in `.env`; allow user-profile detection |
| `OPENSTUDIO_EXE` | Path | No | No | Validated via `BinaryAllowlist` | Keep optional |
| `ANSYSLMD_LICENSE_FILE` | Secret/Config | No | No | Read via `os.environ` in `ansys_engine.py` | Add commented entry in `.env.example` |
| `NASA_POWER_BASE_URL` | Public URL | No | No | Hardcoded public URL in `config.py` | Keep as configurable base URL (keyless) |
| `DEMO_USERS` passwords | Secret | Dev only | No | Hardcoded in `security.py` line 159 & 167 | Restrict to test runs; use DB user store |

---

## 4. Frontend Leakage Audit

A dedicated security audit was performed on the frontend repository (`frontend/src/`):

1. **Client Bundles:** No server secrets (`SECRET_KEY`, `DATABASE_URL`, or `POSTGRES_PASSWORD`) are referenced in frontend TypeScript/React files.
2. **Environment Variables:** No `NEXT_PUBLIC_*` variables containing confidential data exist.
3. **API Routing:** The Next.js frontend uses a server-side reverse proxy in `next.config.mjs`:
   ```javascript
   async rewrites() {
     return [
       { source: '/api/:path*', destination: 'http://127.0.0.1:8000/api/:path*' },
       { source: '/simulate', destination: 'http://127.0.0.1:8000/simulate' },
     ];
   }
   ```
   All client requests are routed through this internal rewrite, preventing exposure of internal backend ports or tokens to public consumers.
4. **Session Tokens:** Tokens issued by `POST /api/v1/auth/login` are stored in browser memory/storage for authorization headers (`Authorization: Bearer <token>`). The signature is validated on the server using `SECRET_KEY`.
