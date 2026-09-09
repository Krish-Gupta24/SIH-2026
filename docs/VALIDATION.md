# Engineering Validation Framework for High-Altitude Shelter Thermal Simulation

> **Integrity Mandate**:
> Simulation models are approximations of physical reality. In accordance with professional engineering ethics:
> 1. **Never invent validation accuracy**: Statistical error metrics ($R^2$, NMBE, CV(RMSE)) are **only** computed when empirical, measured sensor datasets or standardized benchmark cases exist.
> 2. **Never hard-code false universal physical assumptions**: Physical behaviors are checked qualitatively (directional monotonicity, conservation of energy) without assuming single-point empirical universality across disparate climates.

---

## 1. The Six Pillars of Engineering Validation

The platform implements a comprehensive 6-tier validation architecture ensuring correctness from source code execution to physical consistency.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        6-Tier Validation Matrix                        │
├───────────────────────────────┬────────────────────────────────────────┤
│ 1. Software Validation        │ Unit, integration, schema type safety  │
│ 2. Simulation-Input Validation│ Physical domain boundaries & materials │
│ 3. Numerical Sanity Checks    │ 1st & 2nd Laws of Thermodynamics       │
│ 4. Reference-Case Validation  │ Empirical sensor data & BESTEST cases  │
│ 5. Sensitivity Testing        │ Controlled monotonic parameter sweeps  │
│ 6. Regression Testing         │ Golden dataset & solver consistency    │
└───────────────────────────────┴────────────────────────────────────────┘
```

---

### 1.1 Software Validation
Verifies that software components execute reliably and deterministically without runtime crashes, memory leaks, or unhandled edge conditions.
- **Automated Test Suite**: 75+ automated unit and integration tests covering geometry transformations, EnergyPlus IDF generation, lumped-capacitance RC solvers, and API endpoints.
- **Contract & Schema Invariance**: Shared domain models between Python Pydantic models and TypeScript Zod schemas guarantee zero field mismatch.
- **Deterministic Numerical State**: Given identical weather inputs and shelter configurations, simulation engines must produce identical, byte-for-byte reproducible outputs.

### 1.2 Simulation-Input Validation
Guarantees that input models represent buildable, physically realistic structures before computational resources are committed.
- **Geometric Bounds**: Bounding dimensions ($L, W, H \ge 0.5\text{m}$), aspect ratios $\le 10:1$, non-self-intersecting wall boundaries.
- **Thermophysical Property Bounds**:
  - Thermal conductivity: $0.005 \le k \le 250\text{ W/m}\cdot\text{K}$
  - Density: $10 \le \rho \le 10,000\text{ kg/m}^3$
  - Specific heat: $100 \le c_p \le 5,000\text{ J/kg}\cdot\text{K}$
  - Solar absorptance & thermal emittance: $0.05 \le \alpha_s, \varepsilon \le 0.98$
- **Envelope Integrity**: Fenestration surface area cannot exceed 75% of the host facade; doors must fit within wall height and length.
- **Airtightness Bounds**: Infiltration rates restricted to $0.05 \le ACH \le 5.0\text{ h}^{-1}$.

### 1.3 Numerical Sanity Checks
Enforces fundamental physical conservation laws at every simulation timestep:
1. **First Law of Thermodynamics (Energy Conservation)**:
   For any enclosed thermal zone over time interval $\Delta t$:
   $$C_z \frac{dT_{in}}{dt} = \sum Q_{conduction} + Q_{solar} + Q_{internal} + Q_{ventilation} + Q_{auxiliary}$$
   The net heat balance residual must satisfy:
   $$\left|\sum Q_{in} - \sum Q_{out} - \Delta E_{stored}\right| < 10^{-4} \times \max(|Q_{in}|, 1.0\text{ W})$$
2. **Second Law of Thermodynamics**:
   In the absence of internal heat sources, direct solar radiation, and auxiliary heating, an unconditioned indoor space must strictly relax toward ambient temperature $T_{in}(t) \to T_{amb}(t)$; it cannot spontaneously cool below or heat above ambient boundaries.
3. **Non-Negative Space Heating**:
   Auxiliary heating energy demand cannot be negative ($Q_{heat} \ge 0$). Cooling demand cannot be negative ($Q_{cool} \ge 0$).
4. **Physical Temperature Hierarchy**:
   For any simulation period:
   $$T_{indoor, min} \le T_{indoor, mean} \le T_{indoor, max}$$

### 1.4 Reference-Case Validation (Empirical & Analytical)
Validates simulation engine predictions against high-fidelity reference cases:
- **Analytical Standards**: ASHRAE Standard 140 / BESTEST (Building Energy Simulation Test) benchmark cases.
- **Empirical Field Datasets**: Monitored temperature series from high-altitude expedition shelters (e.g., Siachen base camp or Leh outpost test cells).
- **Workflow**:
  1. Ingest timestamped measured outdoor weather and recorded indoor zone temperatures.
  2. Configure `ShelterModel` to match recorded test cell geometry and insulation.
  3. Execute simulation.
  4. Compute standard statistical error metrics **only when measured reference series are present**.

### 1.5 Sensitivity Testing (Controlled Qualitative Perturbation)
Verifies that the simulation solver responds in the correct physical direction when input parameters are individually perturbed from a baseline.

### 1.6 Regression Testing
Protects against algorithmic drift and accidental physics regressions during code updates:
- A golden test suite of 5 benchmark shelter archetypes (Lightweight Arctic Tent, EPS Bunkhouse, Rammed Earth Passive Pod, Super-Insulated Aerogel Unit, High-Mass Solar Shelter) is evaluated on every code release.
- Deviations exceeding $\pm 1.5\%$ in annual heating demand or $\pm 0.5^\circ\text{C}$ in minimum indoor temperature fail the test pipeline.

---

## 2. Controlled Qualitative Sensitivity Tests

The framework conducts seven controlled sensitivity perturbations against any baseline model. Every test defines an expected qualitative direction, runs the simulation, records the observed behavior, and automatically flags any physical anomaly.

| Test ID | Perturbation | Parameter | Direction | Expected Qualitative Behavior | Physical Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST-01** | Increase Insulation | Wall Insulation Thickness $t_{ins}$ | $+100\text{mm}$ | $\Delta UA < 0$, Conductive Loss $\downarrow$, $T_{in, min} \uparrow$, Heating Demand $\downarrow$ | Conduction resistance $R = \sum \frac{t}{k}$ increases, reducing heat escape rate during cold pre-dawn periods. |
| **TEST-02** | Decrease Insulation | Wall Insulation Thickness $t_{ins}$ | $-50\text{mm}$ | $\Delta UA > 0$, Conductive Loss $\uparrow$, $T_{in, min} \downarrow$, Heating Demand $\uparrow$ | Thinner envelope accelerates thermal leakage to freezing ambient, lowering zone temperatures. |
| **TEST-03** | Rotate Orientation | Azimuth Angle $\theta$ | $0^\circ \to 180^\circ$ (South to North) | Total Solar Gain $\downarrow$, Heating Demand $\uparrow$ | Primary fenestration rotates away from direct winter solar beam in Northern Hemisphere, reducing passive heat capture. |
| **TEST-04** | Upgrade Glazing | Glazing Type | Single Clear $\to$ Triple Low-E | Nocturnal Window Loss $\downarrow$, $T_{in, min} \uparrow$, Peak Heat Loss $\downarrow$ | Glazing U-value drops from $5.6$ to $0.8\text{ W/m}^2\text{K}$, eliminating nighttime fenestration chill. |
| **TEST-05** | Increase Window Area | Window Area $A_w$ | $+1.4\text{ m}^2$ ($10\% \to 20\%$ WWR) | Daytime Solar Gain $\uparrow$, Nocturnal Conduction Loss $\uparrow$ | Larger glazed aperture transmits more daytime solar flux but presents greater conduction area during freezing nights. |
| **TEST-06** | Increase Thermal Mass | Internal Mass Strategy | Lightweight $\to$ High-Mass Slab/PCM | Diurnal Zone Swing $\Delta T \downarrow$, Damping Ratio $\uparrow$, $T_{max} \downarrow$, $T_{min} \uparrow$ | Higher thermal capacitance $C_z = \sum m c_p$ buffers day-to-night temperature fluctuations. |
| **TEST-07** | Decrease Ambient Temp | Outdoor Temperature $T_{amb}$ | $-10^\circ\text{C}$ across entire series | Total Heat Loss $\uparrow$, Heating Demand $\uparrow$, $T_{in, min} \downarrow$ | Larger temperature differential $\Delta T = T_{zone} - T_{amb}$ drives higher conductive and infiltration loss rates. |

---

## 3. Reference-Case Comparison Workflow & Error Metrics

When actual empirical or benchmark reference data is available, the platform calculates standardized statistical error metrics in compliance with **ASHRAE Guideline 14** and the **International Performance Measurement and Verification Protocol (IPMVP)**.

### 3.1 Mathematical Formulations

Given:
- $y_i$: Measured reference value at timestep $i$
- $\hat{y}_i$: Simulated predicted value at timestep $i$
- $\bar{y}$: Mean of measured reference values ($\frac{1}{N}\sum_{i=1}^N y_i$)
- $N$: Total number of valid paired observations

#### 1. Normalized Mean Bias Error (NMBE)
Measures overall model bias (tendency to over- or under-predict):
$$\text{NMBE} = \frac{\sum_{i=1}^N (y_i - \hat{y}_i)}{(N - 1) \cdot \bar{y}} \times 100\%$$
- **ASHRAE Guideline 14 Thresholds**:
  - Hourly data: $|\text{NMBE}| \le 10.0\%$
  - Monthly data: $|\text{NMBE}| \le 5.0\%$

#### 2. Coefficient of Variation of Root Mean Square Error (CV(RMSE))
Measures cumulative model dispersion and variability relative to the mean:
$$\text{CV(RMSE)} = \frac{\sqrt{\frac{1}{N - 1} \sum_{i=1}^N (y_i - \hat{y}_i)^2}}{\bar{y}} \times 100\%$$
- **ASHRAE Guideline 14 Thresholds**:
  - Hourly data: $\text{CV(RMSE)} \le 30.0\%$
  - Monthly data: $\text{CV(RMSE)} \le 15.0\%$

#### 3. Coefficient of Determination ($R^2$)
Measures the proportion of variance in the measured data explained by the simulation:
$$R^2 = 1 - \frac{\sum_{i=1}^N (y_i - \hat{y}_i)^2}{\sum_{i=1}^N (y_i - \bar{y})^2}$$
- High correlation benchmark: $R^2 \ge 0.85$

#### 4. Mean Absolute Error (MAE)
Quantifies average absolute deviation in engineering units (°C or kW):
$$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |y_i - \hat{y}_i|$$

---

## 4. Policy on Empirical Data & Non-Fabrication

> [!CAUTION]
> **Zero-Fabrication Policy**:
> If a user or test run has NOT supplied an empirical reference file (`.csv`, `.dat`, or monitored sensor logs), the validation system will **never** synthesize fake comparison data or claim a mock $R^2 = 0.98$.
>
> In such instances, the report explicitly states:
> ```json
> {
>   "reference_data_available": false,
>   "message": "No empirical or measured sensor dataset supplied for this project. Quantitative statistical validation metrics (NMBE, CV(RMSE), R²) cannot be computed without measured data.",
>   "computed_metrics": null
> }
> ```
