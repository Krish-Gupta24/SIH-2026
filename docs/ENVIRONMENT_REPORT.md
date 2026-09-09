# Development Environment & Machine Inspection Report

**Date of Inspection:** 2026-09-09  
**Platform:** Windows 11 Home Single Language (64-bit, Build 26200)  
**Host Architecture:** AMD64 (Intel 12-core x64 Processor)  
**Workspace:** `c:\CODINGG\HACKATHON\SIH 2026`  

---

## 1. Executive Summary Table

| Component | Status | Detected Version | Resolved Path / Service |
| :--- | :--- | :--- | :--- |
| **Operating System** | Installed | Windows 11 Home (10.0.26200) | Native Win32 / WSL2 (Ubuntu 24.04 available) |
| **Python** | Missing (Native) | Not Found (WSL: 3.12.3) | `py.exe` launcher present, but no native runtime found |
| **Node.js** | Installed | `v24.7.0` | `C:\Program Files\nodejs\node.exe` |
| **npm** | Installed | `11.5.2` | `C:\Program Files\nodejs\npm.cmd` |
| **Git** | Installed | `2.55.0.windows.2` | `C:\Program Files\Git\cmd\git.exe` |
| **Docker** | Missing | Not Installed | Not found in Windows PATH or WSL |
| **PostgreSQL** | Installed & Active | `18.4-2` (psql 18.4) | `C:\Program Files\PostgreSQL\18\bin\psql.exe` (Service: `postgresql-x64-18` Running) |
| **Redis** | Missing | Not Installed | Not found in Windows PATH or WSL |
| **EnergyPlus** | Missing | Not Installed | None detected |
| **OpenStudio** | Missing | Not Installed | None detected |
| **ANSYS** | Missing | Not Installed | None detected |

---

## 2. Detailed Inspection Results

### 2.1 Operating System & Hardware Platform
- **Caption:** Microsoft Windows 11 Home Single Language
- **Version:** `10.0.26200`
- **OS Architecture:** 64-bit (`AMD64`)
- **CPU Cores:** 12 logical processors (`Intel64 Family 6 Model 151 Stepping 2, GenuineIntel`)
- **Storage:** Volume `C:` (351.21 GB used, 123.50 GB free)
- **Subsystem for Linux (WSL2):** `Ubuntu-24.04` (Installed, Stopped). Inside WSL, Python `3.12.3` is available.
- **Package Managers Available:**
  - `winget` (v1.29.290)
  - `chocolatey` (v2.3.0)

### 2.2 Node.js & Frontend Tooling
- **Node.js:** `v24.7.0` (`C:\Program Files\nodejs\node.exe`)
- **npm:** `11.5.2` (`C:\Program Files\nodejs\npm.cmd`)
- **Note on PowerShell Execution Policy:** Running `npm` directly in PowerShell may trigger a script execution error on `npm.ps1`. Use `npm.cmd` or execute `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned` in the developer session.

### 2.3 Git Version Control
- **Git Version:** `2.55.0.windows.2`
- **Path:** `C:\Program Files\Git\cmd\git.exe`
- **Credential Manager:** Installed (`C:\Users\krish\AppData\Local\Programs\Microsoft Git Credential Manager for Windows`)

### 2.4 Database (PostgreSQL)
- **Status:** Installed, configured, and actively running.
- **PostgreSQL Version:** `18.4-2`
- **Client Tool (`psql`):** `psql (PostgreSQL) 18.4` (`C:\Program Files\PostgreSQL\18\bin\psql.exe`)
- **Service Name:** `postgresql-x64-18` (Status: `Running`, Startup: Automatic)
- **Installation Directory:** `C:\Program Files\PostgreSQL\18`
- **Environment Variable:** `PostgreSQL` = `C:\Program Files\PostgreSQL\18\bin`

### 2.5 Native Python Runtime
- **Status:** **Missing / Broken Native Installation**
- **Findings:**
  - `py.exe` (Windows Python Launcher `3.13.7150.0`) is present at `C:\Windows\py.exe`.
  - Executing `py -0` returns `"No installed Pythons found!"`.
  - Checking `C:\Users\krish\AppData\Local\Programs\Python` revealed orphaned folders `Python310` and `Python313` with partial library files but missing `python.exe` binaries.
  - Windows Store execution alias points to `C:\Users\krish\AppData\Local\Microsoft\WindowsApps\python.exe` which triggers the store stub.
  - WSL2 `Ubuntu-24.04` has Python `3.12.3` installed.

### 2.6 Simulation Engines & Solvers
- **EnergyPlus:**
  - Status: **Not installed**
  - Executable Path: **None** (searched PATH, root `C:\`, and `C:\Program Files`)
- **OpenStudio:**
  - Status: **Not installed**
  - Executable Path: **None**
- **ANSYS (Fluent/Mechanical/CFD):**
  - Status: **Not installed / Not detected**
  - Executable Path: **None** (checked Registry uninstall keys, Program Files, and PATH)

### 2.7 Caching & Background Queues
- **Redis:**
  - Status: **Not installed**
  - Executable Path: **None**
- **Docker:**
  - Status: **Not installed**
  - Executable Path: **None**

---

## 3. Environment Variables & PATH Inspection

### 3.1 Environment PATH Breakdown
The following directories are currently configured in the system/user `PATH`:
1. `C:/Users/krish/.gemini/antigravity-ide/bin`
2. `C:\Program Files\Common Files\Oracle\Java\javapath`
3. `C:\Program Files (x86)\Common Files\Oracle\Java\java8path`
4. `C:\Program Files (x86)\Common Files\Oracle\Java\javapath`
5. `C:\Windows\system32`
6. `C:\Windows`
7. `C:\Windows\System32\Wbem`
8. `C:\Windows\System32\WindowsPowerShell\v1.0\`
9. `C:\Windows\System32\OpenSSH\`
10. `C:\Program Files (x86)\NVIDIA Corporation\PhysX\Common`
11. `C:\Program Files\dotnet\`
12. `C:\ProgramData\chocolatey\bin`
13. `C:\Program Files\NVIDIA Corporation\NVIDIA app\NvDLISR`
14. `C:\Program Files\nodejs\`
15. `C:\Program Files\Git\cmd`
16. `C:\Users\krish\AppData\Local\Programs\oh-my-posh\bin\`
17. `C:\Program Files\MySQL\MySQL Shell 8.0\bin\`
18. `C:\Users\krish\AppData\Local\Microsoft\WindowsApps`
19. `C:\Users\krish\AppData\Local\Programs\Microsoft VS Code\bin`
20. `C:\Users\krish\AppData\Local\GitHubDesktop\bin`
21. `C:\MinGW\bin`
22. `C:\Users\krish\AppData\Roaming\npm`
23. `C:\Users\krish\AppData\Local\PowerToys\DSCModules\`
24. `C:\Users\krish\AppData\Local\Programs\Antigravity\bin`
25. `C:\Program Files\PostgreSQL\18\bin`
26. `C:\Users\krish\AppData\Local\Programs\cursor\resources\app\bin`
27. `C:\Users\krish\AppData\Local\Programs\Antigravity IDE\bin`

### 3.2 Key System Environment Variables
- `NUMBER_OF_PROCESSORS` = `12`
- `OS` = `Windows_NT`
- `PROCESSOR_ARCHITECTURE` = `AMD64`
- `PostgreSQL` = `C:\Program Files\PostgreSQL\18\bin`
- *(Missing: `PYTHONPATH`, `ENERGYPLUS_DIR`, `ENERGYPLUS_EXE`, `OPENSTUDIO_DIR`)*

---

## 4. Existing Project Files Inspection

The workspace currently contains comprehensive architectural blueprints, models, conventions, and constraints:

```
c:\CODINGG\HACKATHON\SIH 2026\
├── AGENT_RULES.md               # Mandatory agent behaviors & provenance rules
├── ENGINEERING_RULES.md         # SI units, strict physics & simulation constraints
└── docs/
    ├── ASSUMPTIONS.md           # Engineering decisions, rationale & validity ranges
    ├── INPUT_SPECIFICATION.md   # Field-level schema specifications for user inputs
    ├── PROJECT_OVERVIEW.md      # SIH Problem 26051 scope, workflow & requirements
    ├── SHELTER_MODEL.md         # Canonical ShelterModel domain model specification
    ├── SYSTEM_ARCHITECTURE.md   # Complete 12-subsystem platform architecture
    ├── TECHNOLOGY_STACK.md      # Front/backend/solver tech decisions and rationale
    ├── UNITS_AND_CONVENTIONS.md # Explicit unit catalog and coordinate definitions
    └── examples/
        ├── 01_simple_shelter.json        # Baseline test case schema
        ├── 02_multilayer_walls.json      # Insulation & envelope validation case
        ├── 03_windows_and_doors.json     # Fenestration & orientation case
        └── 04_high_altitude_shelter.json # Extreme cold (Ladakh) sub-zero test case
```

---

## 5. Missing Dependencies: Purpose & Recommended Installation Approaches

In accordance with user instructions, **no packages or files were installed or altered**. The analysis below details why each missing component is required and how the user can safely install them.

---

### 5.1 Native Python 3.12 (64-bit)

#### Why It Is Needed
The backend platform is designed on **FastAPI**, **Pydantic v2**, **SQLAlchemy**, **NumPy**, **Pandas**, and **SciPy**. Scientific computing, climate data processing (EPW parsing), thermal geometry translation, and orchestration of EnergyPlus simulations require an active, native 64-bit Python 3.11 or 3.12 runtime.

#### Safest Recommended Installation Approach
Use Windows Package Manager (`winget`) to install Python 3.12 with PATH configuration enabled:
```powershell
winget install --id Python.Python.3.12 --exact --scope machine --override "/passive PrependPath=1 Include_pip=1"
```
*Alternatively:* Download the official 64-bit Windows Installer (`python-3.12.x-amd64.exe`) from [python.org/downloads](https://www.python.org/downloads/windows/) and ensure **"Add python.exe to PATH"** is checked during setup.

---

### 5.2 Redis (In-Memory Cache & Message Broker)

#### Why It Is Needed
Required by **Celery** for asynchronous task queuing and result backend storage. Simulation runs (EnergyPlus multi-day thermal cycles, NSGA-II optimization iterations) are long-running jobs (seconds to minutes). Without Redis, background simulation worker decoupling and caching of NASA POWER climate responses cannot execute.

#### Safest Recommended Installation Approaches
**Option A (Native Windows via Memurai - Recommended for local Windows dev without Docker):**
[Memurai](https://www.memurai.com/) is a production-grade Redis 7-compatible native Windows service:
```powershell
winget install --id Memurai.MemuraiDeveloper --exact
```

**Option B (Via WSL2 Ubuntu):**
Since WSL2 `Ubuntu-24.04` is already on the machine, Redis can run natively inside WSL without Docker:
```bash
wsl -d Ubuntu-24.04 -- sudo apt-get update && sudo apt-get install -y redis-server
wsl -d Ubuntu-24.04 -- sudo service redis-server start
```
Windows apps can connect directly to `localhost:6379`.

**Option C (Docker Container):**
If Docker is installed (see 5.3 below), run:
```powershell
docker run -d --name redis-sih -p 6379:6379 redis:7-alpine
```

---

### 5.3 Docker Desktop for Windows

#### Why It Is Needed
Docker provides an isolated, reproducible container environment for running:
1. Multi-worker Celery nodes and Redis.
2. Headless EnergyPlus batch simulation containers across different engine versions.
3. Integration testing pipelines matching Linux CI/CD environments.

#### Safest Recommended Installation Approach
Since WSL2 is already enabled on this Windows 11 machine, install Docker Desktop with the WSL2 backend:
```powershell
winget install --id Docker.DockerDesktop --exact
```
After installation, launch Docker Desktop once, enable integration with `Ubuntu-24.04` in Settings > Resources > WSL Integration, and verify with `docker --version`.

---

### 5.4 EnergyPlus (Version 24.1.0 or 23.2.0)

#### Why It Is Needed
EnergyPlus is the core computational building energy simulation engine of the platform. It calculates:
- Zone air heat balance and thermal storage.
- Conduction Transfer Functions (CTF) through multi-layer walls/roofs.
- Solar heat gain through fenestrations (windows/skylights).
- Hourly/sub-hourly zone indoor temperatures under Ladakh extreme cold weather files.

#### Safest Recommended Installation Approach
1. Download the official Windows 64-bit installer from the official EnergyPlus GitHub Releases:
   - URL: [https://github.com/NREL/EnergyPlus/releases/tag/v24.1.0](https://github.com/NREL/EnergyPlus/releases/tag/v24.1.0)
   - Asset: `EnergyPlus-24.1.0-9d7789a3ac-Windows-x86_64.exe`
2. Run the installer and install to the standard directory:
   - Target: `C:\EnergyPlusV24-1-0`
3. Configure the environment variable so the backend adapter can locate the engine:
   ```powershell
   [Environment]::SetEnvironmentVariable("ENERGYPLUS_DIR", "C:\EnergyPlusV24-1-0", "Machine")
   [Environment]::SetEnvironmentVariable("PATH", "$([Environment]::GetEnvironmentVariable('PATH', 'Machine'));C:\EnergyPlusV24-1-0", "Machine")
   ```
4. Verify execution:
   ```powershell
   energyplus --version
   ```

---

### 5.5 OpenStudio (CLI / SDK Version 3.7.0+)

#### Why It Is Needed
OpenStudio provides the higher-level parametric building energy modeling layer (`openstudio-standards` and OpenStudio SDK). It enables programmatic construction synthesis, standard space types, and automated HVAC/envelope template definitions before generating the IDF/epJSON for EnergyPlus.

#### Safest Recommended Installation Approach
1. Download the official Windows installer from OpenStudio GitHub Releases:
   - URL: [https://github.com/NREL/OpenStudio/releases](https://github.com/NREL/OpenStudio/releases)
   - Asset: `OpenStudio-3.7.0+xxxxxx-Windows.exe`
2. Install to `C:\openstudio-3.7.0`.
3. Verify CLI availability:
   ```powershell
   & "C:\openstudio-3.7.0\bin\openstudio.exe" --version
   ```

---

### 5.6 ANSYS Adapter & CFD Tools

#### Why It Is Needed
As defined in [SYSTEM_ARCHITECTURE.md](file:///c:/CODINGG/HACKATHON/SIH%202026/docs/SYSTEM_ARCHITECTURE.md) and [ENGINEERING_RULES.md](file:///c:/CODINGG/HACKATHON/SIH%202026/AGENT_RULES.md), the system includes an **ANSYS Adapter Layer** for detailed 3D micro-climate CFD airflow, buoyancy-driven natural ventilation, and multi-dimensional thermal bridging analysis.

#### Safest Recommended Installation Approach
- ANSYS is commercial engineering software.
- **For Local Development & SIH Demonstration:** The platform is architected with a decoupled `ANSYSAdapter` that exports standard geometry (`.step`, `.stl`) and simulation setup scripts (`journal` / `Python pyfluent` / `APDL`).
- If an academic or commercial license of ANSYS 2023/2024 is available, install ANSYS Workbench / Fluent via the official ANSYS Customer Portal or University Student Portal.
- If ANSYS is not locally installed, the application's adapter architecture allows running in EnergyPlus mode while generating ANSYS-ready export packages for remote/cluster execution.

---

## 6. Action Items Checklist for User

When ready to proceed with environment setup, execute the following steps:

- [ ] **Step 1:** Install Python 3.12 (64-bit) and verify `python --version` outputs `Python 3.12.x`.
- [ ] **Step 2:** Ensure virtual environment tool (`python -m venv .venv`) is ready.
- [ ] **Step 3:** Download and install EnergyPlus 24.1.0 into `C:\EnergyPlusV24-1-0`.
- [ ] **Step 4:** Set up Redis (either via Memurai on Windows or inside existing WSL2 Ubuntu 24.04).
- [ ] **Step 5 (Optional for Phase 1):** Install Docker Desktop if containerized worker deployment is preferred.
- [ ] **Step 6:** Confirm PostgreSQL database connection credentials (`postgres` service is already running).
