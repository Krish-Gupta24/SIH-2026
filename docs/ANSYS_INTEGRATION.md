# ANSYS Integration & High-Fidelity Validation Architecture

> **Engineering Disclosure & Status**:
> The Smart India Hackathon (SIH) problem statement references **ANSYS** for structural and high-fidelity thermal validation.
> 
> In accordance with strict software engineering integrity, **we do NOT falsely claim automated execution of ANSYS when software or licenses are absent**. A comprehensive audit of the execution environment confirms:
> - **ANSYS Software Status**: No ANSYS 2023/2024 binaries (`fluent`, `ansys`, `mapdl`) detected in system PATH or `Program Files`.
> - **License Server Status**: No FlexLM license manager (`ANSYSLMD_LICENSE_FILE`) detected.
> - **Python API Status**: No PyAnsys (`ansys-fluent-core`, `ansys-mapdl-core`) client libraries installed.
>
> To deliver professional engineering capability without fake results, the platform provides a **Clean Adapter Architecture**. This generates production-ready ANSYS Fluent and MAPDL input decks, journal scripts, boundary condition maps, and intermediate CAD geometry, allowing seamless execution on licensed HPC clusters or workstations.

---

## 1. Adapter Architecture Overview

The system decouples high-level parametric design (`ShelterModel`) from specific simulation solvers using an explicit `ANSYSEngine` interface.

```
┌─────────────────────────────────────────────────────────────┐
│                    Canonical ShelterModel                   │
│        (Geometry, Materials, Windows, Internal Loads)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│   EnergyPlus / RC Solver    │ │     ANSYS Engine Adapter    │
│    (Annual Whole-Building)  │ │   (High-Fidelity 3D CFD/FEA)│
└─────────────────────────────┘ └──────────────┬──────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
┌─────────────────────────────┐                                 ┌─────────────────────────────┐
│  Headless Automation Mode   │                                 │  HPC / Manual Export Mode   │
│  (PyFluent / Batch Runner)  │                                 │  (Journals, Macros, Ingest) │
│  *Requires Active License*  │                                 │  *Always Available*         │
└─────────────────────────────┘                                 └─────────────────────────────┘
```

---

## 2. Supported ANSYS Versions & Prerequisites

| Component | Specification | Supported Range |
| :--- | :--- | :--- |
| **ANSYS Release** | Ansys Fluent / Ansys Mechanical (MAPDL) | **2023 R1, 2023 R2, 2024 R1, 2024 R2** |
| **Required Licenses** | CFD or Mechanical solver seat | `ansys`, `fluent_trans`, `mech_2`, or `academic_research` |
| **Automation APIs** | PyAnsys Python SDK (gRPC) | `ansys-fluent-core >= 0.19.0`, `ansys-mapdl-core >= 0.65.0` |
| **Batch CLI** | Direct binary execution | `fluent 3ddp -g -t<cores> -i <journal.jou>` <br> `ansys241 -b -i <thermal.mac> -o <output.out>` |
| **CAD Kernel** | Parasolid / ACIS SAT / STEP | STEP AP214 (`.stp`), ACIS SAT v25 (`.sat`) |

---

## 3. The `ANSYSEngine` Interface

The abstract contract defining solver lifecycle operations:

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path

@dataclass
class ANSYSExportPackage:
    export_dir: Path
    fluent_journal_path: Path
    mapdl_macro_path: Path
    geometry_step_path: Path
    boundary_manifest_path: Path
    batch_script_path: Path

class ANSYSEngine(ABC):
    """Abstract solver adapter for ANSYS high-fidelity thermal & CFD validation."""

    @abstractmethod
    def validate_model(self, shelter_model: Dict[str, Any]) -> Dict[str, Any]:
        """Validate topological and thermophysical completeness prior to ANSYS transfer."""
        pass

    @abstractmethod
    def prepare_model(self, shelter_model: Dict[str, Any], weather_context: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize meshing parameters, cell zone definitions, and boundary condition values."""
        pass

    @abstractmethod
    def export_model(self, shelter_model: Dict[str, Any], output_dir: Path) -> ANSYSExportPackage:
        """Generate ready-to-run journal files, APDL macros, and geometry interchange models."""
        pass

    @abstractmethod
    def run_simulation(self, export_package: ANSYSExportPackage, timeout_seconds: int = 3600) -> Dict[str, Any]:
        """
        Execute headless simulation if licensed binaries exist.
        If unavailable, raises ANSYSNotAvailableError with instructions for manual/HPC execution.
        """
        pass

    @abstractmethod
    def collect_results(self, output_dir: Path) -> Dict[str, Any]:
        """Parse native ANSYS surface/volume monitors, flux reports, and CFD-Post exports."""
        pass
```

---

## 4. Technical Transfer & Mapping Specifications

### 4.1 Geometry Transfer
1. **Computational Domain Topology**:
   - **Solid Domain**: Exterior walls, roof assembly, floor slab, and glazing volumes modeled as distinct conjugate heat transfer cell zones.
   - **Indoor Fluid Domain**: Internal air zone volume ($V_{int} = L \times W \times H$).
   - **Outdoor Wind Domain (Optional CFD)**: Rectangular wind tunnel enclosing the shelter ($5H$ upstream, $10H$ downstream, $3H$ sides/top) with an Atmospheric Boundary Layer (ABL) velocity inlet.
2. **CAD Interchange**:
   - Parametric boundary generator outputs boundary curves and extruded solids in **STEP AP214** format.
   - Named selections (`NS_Wall_North`, `NS_Wall_South`, `NS_Roof`, `NS_Window_South`, `NS_Floor`, `NS_Zone_Air`) are embedded for automated boundary assignment.

### 4.2 Material Properties Transfer
Materials in `ShelterModel.materials` are mapped to ANSYS material definitions:

| Physical Property | Engineering Unit | ANSYS Fluent Variable | ANSYS MAPDL Parameter |
| :--- | :--- | :--- | :--- |
| **Density ($\rho$)** | $\text{kg/m}^3$ | `density (constant)` | `DENS` |
| **Specific Heat ($c_p$)** | $\text{J/kg}\cdot\text{K}$ | `specific-heat (constant)` | `C` |
| **Thermal Conductivity ($k$)** | $\text{W/m}\cdot\text{K}$ | `thermal-conductivity` | `KXX` |
| **Solar Absorptance ($\alpha_s$)** | $0.0 - 1.0$ | `absorptivity (solar)` | Surface emissivity $\approx \varepsilon_s$ |
| **Thermal Emittance ($\varepsilon$)** | $0.0 - 1.0$ | `internal-emissivity` | Radiation matrix form factor |

**High-Altitude Air Property Correction (Leh Ladakh, 3500m ASL)**:
- Ambient barometric pressure: $P_{amb} \approx 67.5\text{ kPa}$ (vs $101.325\text{ kPa}$ at sea level).
- Operating density of dry air at $-15^\circ\text{C}$: $\rho = \frac{P}{R_{specific} T} = \frac{67500}{287.05 \times 258.15} \approx 0.911\text{ kg/m}^3$.
- Fluent operating pressure explicitly initialized to `67500 Pa`.

### 4.3 Boundary Condition Mapping
1. **Exterior Opaque Surfaces**:
   - Coupled convective heat transfer coefficient $h_c = 12.0 + 3.8 \cdot V_{wind}\text{ W/m}^2\text{K}$.
   - Mixed boundary condition combining convection to ambient $T_{amb}(t)$ and radiation to effective sky temperature $T_{sky} = T_{amb} \cdot (0.711 + 0.0056 \cdot T_{dew} + 0.000073 \cdot T_{dew}^2)^{0.25}$.
2. **Sub-Slab Ground Boundary**:
   - Constant permafrost ground interface temperature $T_{ground} = +2.0^\circ\text{C}$ applied at $1.5\text{m}$ sub-grade foundation depth.
3. **Glazing Fenestration**:
   - Semi-transparent surface with specified Transmissivity $\tau$ (equal to SHGC) and U-factor thermal resistance.
4. **Internal Heat Gains**:
   - Volumetric heat generation source term assigned to indoor air fluid zone:
     $$S_h = \frac{Q_{occupants} + Q_{equipment}}{V_{zone}}\quad \left[\text{W/m}^3\right]$$

### 4.4 Solar & Radiation Modeling Setup
- **Model**: **Discrete Ordinates (DO)** radiation model or **Surface-to-Surface (S2S)** model.
- **Solar Ray Tracing (Solar Calculator)**:
  - Geographical Location: `Latitude = 34.1526°N`, `Longitude = 77.5771°E`.
  - Solar Timezone: `GMT +5:30`.
  - Solar Beam & Diffuse flux calculated directly from ISHRAE design-day solar irradiation values ($G_b \approx 850\text{ W/m}^2$, $G_d \approx 140\text{ W/m}^2$).
  - Glazing surfaces tagged with direct solar transmission.

### 4.5 Transient Solution Scheme
- **Temporal Formulation**: 2nd-Order Implicit Transient.
- **Time Step**: $\Delta t = 180\text{ seconds}$ (20 time steps per hour), 480 steps for a 24-hour design day.
- **Under-Relaxation Factors**:
  - Pressure: `0.3`, Momentum: `0.7`, Energy: `1.0`.
- **Residual Convergence Criteria**:
  - Energy equation: $< 10^{-6}$.
  - Continuity & Momentum: $< 10^{-4}$.

### 4.6 Result Extraction & Ingestion
When executed in batch mode, Fluent generates structured monitor export files:
- `indoor_temp_volume_avg.out`: Hourly zone air temperature.
- `wall_conduction_flux.out`: Heat flux ($W/m^2$) through north, south, east, west facades.
- `roof_flux.out`, `floor_flux.out`, `window_flux.out`.

The `collect_results()` method parses these files, computes metric deviations vs the lumped-capacitance RC solver, and loads them into a normalized `SimulationResult` schema.

---

## 5. Generated Export File Deliverables

When a user triggers an ANSYS export for a project, the system writes the following package to `exports/ansys/<project_id>/`:

```
exports/ansys/shelter_leh_001/
├── fluent_setup.jou          # Automated TUI commands for mesh read, models, BCs, transient solver
├── mapdl_thermal.mac         # APDL thermal conduction macro for solid envelope FEA
├── boundary_manifest.json    # Human-readable parameter table with SI units
├── geometry_spec.py          # Parametric script to generate native geometry in SpaceClaim
├── run_fluent_batch.bat      # 1-Click execution script for Windows workstations with ANSYS installed
└── run_fluent_batch.sh       # Slurm / PBS script for Linux high-performance computing clusters
```

### Sample Generated Fluent Journal (`fluent_setup.jou`):
```scheme
; =========================================================================
; ANSYS Fluent Automation Journal Generated by ThemoShelter Platform
; Project: Leh Military Border Outpost | Elevation: 3500m ASL
; =========================================================================

; 1. Enable 3D Energy & Turbulence Models
/define/models/energy? yes
/define/models/viscous/ke-realizable? yes

; 2. Enable Discrete Ordinates (DO) Radiation Model
/define/models/radiation/discrete-ordinates? yes 2 2

; 3. Setup Solar Ray Tracing
/define/models/radiation/solar-calculator yes 34.1526 77.5771 5.5 1 15 12 0 0

; 4. High-Altitude Operating Pressure (Leh: 67,500 Pa)
/define/operating-conditions/operating-pressure 67500

; 5. Material Definitions
/define/materials/change-create air air-leh yes ideal-gas yes 1006.0 yes 0.0242 yes 1.78e-5

; 6. Boundary Conditions
/define/boundary-conditions/wall wall-south-glazing yes no yes 1.4 0.024 0 0 yes 0.62
/define/boundary-conditions/wall wall-exterior-opaque yes no yes 0.22 0.15 0 0 no

; 7. Transient Setup & Solve
/solve/set/transient-controls 2nd-order-implicit
/solve/set/time-step 180
/solve/dual-time-iterate 480 25
/file/write-case-data "results_completed.cas.h5"
```

---

## 6. Verification & Ethical Software Policy

1. **No Fake Results**: The platform will never fabricate fake CFD contours or artificial temperature series labeled as "ANSYS". If ANSYS is not installed locally, the dashboard marks ANSYS jobs as `READY_FOR_HPC_EXPORT` or `WAITING_EXTERNAL_RESULTS`.
2. **Cross-Solver Benchmark**: When ANSYS results are ingested, the platform displays a side-by-side comparison between **EnergyPlus**, **Lumped RC**, and **ANSYS Fluent**, quantifying 3D corner heat leakage and localized stratification factors.
