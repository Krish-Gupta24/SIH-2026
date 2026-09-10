# High-Altitude Shelter Thermal Simulation: Reference-Case Validation Protocol

## 1. Scope & Objective
This protocol establishes the rigorous, empirical validation procedure for evaluating building thermal simulation models against measured site data in extreme cold climates (e.g. Leh, Ladakh, 3500m ASL).

It defines:
- The 5-stage data processing workflow.
- Sensor precision and measurement criteria.
- Unit and temporal alignment standards.
- Quantitative statistical error formulations (**MAE**, **RMSE**, **MBE**, and **$R^2$**).
- Acceptability criteria according to international building physics standards (ASHRAE Guideline 14 and IPMVP).
- **The Zero-Fabrication Policy**: absolute prohibition on synthetic, manufactured, or default reference data.

---

## 2. Zero-Fabrication Policy

> [!CAUTION]
> **Strict Verification Standard**:
> If no empirical reference dataset is provided for a project, the software **MUST NEVER** generate synthetic reference numbers or claim a model accuracy rating.
> When reference data is absent, the system must clearly output:
> **"Validation data not provided."**

---

## 3. The 5-Stage Reference-Case Validation Workflow

```
┌────────────────────────────────────────────────────────┐
│                   REFERENCE DATA                       │
│    (Indoor/Outdoor Temp, Solar Irradiance, Sensors)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                1. MAP TIMESTAMPS                       │
│     (Normalize ISO8601, Monotonic Check, Resampling)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 2. ALIGN UNITS                         │
│     (Fahrenheit → Celsius, kW/m² → W/m², psi → Pa)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               3. ALIGN TIME ZONES                      │
│     (Local Standard Time UTC+5.5 vs Universal Time)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│         4. COMPARE AGAINST SIMULATION                  │
│     (Pair Simulated vs Measured Observation Steps)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│           5. CALCULATE STATISTICAL METRICS             │
│            (MAE, RMSE, MBE, Conditional R²)            │
└────────────────────────────────────────────────────────┘
```

### Stage 1: Reference Data Ingestion
The system supports the following empirical reference formats:
1. **Indoor Air Temperature**: Calibrated thermocouple, thermistor, or RTD data loggers (e.g. HOBO, Campbell Scientific, Testo) placed in the living zone at 1.1m elevation, shielded from direct solar radiation.
2. **Ambient Outdoor Temperature**: On-site weather station logging dry-bulb temperature in a solar radiation shield.
3. **Solar Irradiance**: Thermopile pyranometer (ISO 9060 Class A/B) logging global horizontal irradiance (GHI) or vertical plane-of-array irradiance.
4. **Surface Heat Flux**: Calibrated heat flux plates on opaque envelope assemblies.

### Stage 2: Timestamp Mapping
- Parse diverse logger timestamp conventions: ISO8601 (`YYYY-MM-DDTHH:MM:SS`), standard delimiter strings (`YYYY-MM-DD HH:MM:SS`, `DD/MM/YYYY HH:MM`), or Unix epoch.
- Assert temporal monotonicity (no out-of-order or duplicate records).
- Align differing sampling rates (e.g. 5-minute or 15-minute sensor logs) to the simulation output timestep (typically 1-hour or 15-minute intervals) using linear interpolation or time-averaged binning.

### Stage 3: Unit Alignment
Ensure physical quantities are strictly converted to SI engineering units:
- **Temperature**: Convert $^\circ\text{F}$ or $\text{K}$ to Celsius ($^\circ\text{C}$).
  $$T_{^\circ\text{C}} = (T_{^\circ\text{F}} - 32) \times \frac{5}{9} = T_{\text{K}} - 273.15$$
- **Solar Irradiance**: Convert $\text{kW/m}^2$, $\text{BTU/h}\cdot\text{ft}^2$, or $\text{Wh/m}^2$ to $\text{W/m}^2$.
- **Atmospheric Pressure**: Convert $\text{mbar}$, $\text{hPa}$, $\text{psi}$, or $\text{atm}$ to Pascals ($\text{Pa}$).

### Stage 4: Timezone Alignment
Field loggers frequently record in Local Standard Time (e.g. Indian Standard Time, UTC+5.5), whereas some weather generators or simulation platforms log in Solar Time or UTC.
The validator normalizes reference and simulation timestamps to a common coordinate frame before residual computation.

---

## 4. Statistical Error Formulations

Given $n$ paired observations where $y_i$ is the empirical reference value and $\hat{y}_i$ is the simulated output:

### 4.1 Mean Absolute Error (MAE)
Quantifies the average magnitude of absolute prediction errors:
$$\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} \left| y_i - \hat{y}_i \right|$$
- **Interpretation**: Direct physical error in original engineering units ($^\circ\text{C}$, $\text{W/m}^2$).

### 4.2 Root Mean Square Error (RMSE)
Measures the square root of the variance of the residuals, placing higher weight on large discrepancies:
$$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^{n} \left( y_i - \hat{y}_i \right)^2}$$

### 4.3 Mean Bias Error (MBE)
Quantifies persistent overprediction or underprediction bias:
$$\text{MBE} = \frac{1}{n} \sum_{i=1}^{n} \left( y_i - \hat{y}_i \right)$$
- Positive MBE indicates the simulation underpredicts the measured reference.
- Negative MBE indicates the simulation overpredicts the measured reference.

### 4.4 Coefficient of Determination ($R^2$) — Conditional Evaluation
Measures the proportion of the variance in the measured dependent variable that is predictable from the simulation:
$$R^2 = \frac{\left[ \sum_{i=1}^{n} (y_i - \bar{y})(\hat{y}_i - \bar{\hat{y}}) \right]^2}{\sum_{i=1}^{n} (y_i - \bar{y})^2 \sum_{i=1}^{n} (\hat{y}_i - \bar{\hat{y}})^2}$$

> [!IMPORTANT]
> **Applicability Constraint for $R^2$**:
> $R^2$ is mathematically undefined and physically meaningless if the measured reference values are constant ($\text{Var}(y) = 0$). In such cases (e.g. steady-state calibration chamber or constant thermostat experiments), $R^2$ **MUST NOT** be reported as $1.0$ or $0.0$; it must be flagged as non-applicable with explicit notes.

---

## 5. Standard Compliance Thresholds (ASHRAE Guideline 14)

For calibrated hourly thermal simulations:
- **Normalized Mean Bias Error (NMBE)**:
  $$\text{NMBE} = \frac{\sum_{i=1}^n (y_i - \hat{y}_i)}{(n - 1) \cdot \bar{y}} \times 100\% \quad \implies \quad |\text{NMBE}| \le 10\%$$
- **Coefficient of Variation of the RMSE (CV(RMSE))**:
  $$\text{CV(RMSE)} = \frac{\sqrt{\frac{1}{n-1}\sum_{i=1}^n (y_i - \hat{y}_i)^2}}{\bar{y}} \times 100\% \quad \implies \quad \text{CV(RMSE)} \le 30\%$$

*(Note: For temperature near $0^\circ\text{C}$, denominators are evaluated in Kelvin to prevent division by near-zero Celsius means).*

---

## 6. Output Reporting Standard

Every validation analysis must generate:
1. **Metadata**: Reference file name, rows processed, target metric, unit applied, timezone adjustment.
2. **Aligned Timeseries**: Step-by-step table comparing Simulation vs Reference with residual and squared error.
3. **Statistical Summary**: MAE, RMSE, MBE, and $R^2$ (when applicable).
4. **Graphical Overlay**: Side-by-side time-series curves comparing Simulated vs Measured.
