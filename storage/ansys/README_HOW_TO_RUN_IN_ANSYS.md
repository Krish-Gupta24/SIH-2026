# How to Run ThermoShelter Simulation Decks in ANSYS

This guide provides instructions for evaluating and validating the ThermoShelter simulation decks generated for DRDO Problem Statement 26051.

---

## 1. Quick Verification in ANSYS Student Edition (Free)

The generated scripts are fully compatible with **ANSYS Student Edition 2023 R1 through 2024 R2** (under the 32,000 node limit).

### Steps:
1. Open **ANSYS Mechanical APDL** (or ANSYS Product Launcher).
2. Set your Working Directory to the folder where you extracted the exported ZIP deck.
3. In the APDL Command line / Menu:
   - Select **File → Read Input from...**
   - Choose `material_comparison.mac` (for 5-material comparative study) OR `mapdl_thermal.mac` (for detailed shelter FEA).
4. Click **OK**.
5. MAPDL meshes the parametric geometry, applies atmospheric boundary conditions (convection, ground coupling, solar heat flux), and executes the transient thermal solve.
6. When complete:
   - Check `material_comparison_results.txt` or `ansys_thermal_results.txt` in your working directory.
   - Run `/POST1` → `PLNSOL,TEMP` to view 3D thermal temperature contour bands.

---

## 2. High-Fidelity 3D CFD in ANSYS Fluent

To run the conjugate heat transfer and solar ray tracing CFD model:

### On Windows:
1. Open Command Prompt with ANSYS environment configured.
2. Double-click or execute:
   ```cmd
   run_fluent_batch.bat
   ```
3. Fluent launches in batch mode (`fluent 3ddp -g -t4 -i fluent_setup.jou`) and outputs residual logs to `fluent_run.log`.

### On HPC / Linux Slurm Cluster:
1. Submit batch job:
   ```bash
   sbatch run_fluent_batch.sh
   ```
2. The Discrete Ordinates solar calculator computes high-altitude atmospheric transmittance and generates `results_completed.cas.h5`.

---

## 3. Physical Formulation Reference
- **Conduction Model**: Fourier 3D Heat Conduction ($\nabla \cdot (k \nabla T) = \rho C_p \frac{\partial T}{\partial t}$)
- **Solar Model**: Discrete Ordinates (DO) radiation ray tracing with atmospheric altitude pressure correction
- **Ambient Boundary**: Robin convective condition ($q = h_{\text{conv}}(T_{\text{surf}} - T_{\text{amb}})$)
- **High-Altitude Air Properties**: Ideal gas law corrected for Leh elevation (3,500m ASL, barometric pressure ~65,700 Pa).
