# Weather Data Policy and Provenance Specification

## 1. Core Engineering Principle: Zero Silent Fallback

**The Area-Specific Shelter Thermal Simulation Platform strictly prohibits the silent substitution of synthetic or test weather datasets for authentic user simulations.**

In building energy and passive thermal analysis, thermal comfort indicators (Fanger PMV/PPD), indoor minimum temperatures, and sizing of heating systems depend entirely on ambient microclimatic boundary conditions:
- Hourly dry-bulb temperature ($T_{db}$)
- Direct normal irradiance ($I_{dni}$) and diffuse horizontal irradiance ($I_{dhi}$)
- Atmospheric barometric pressure ($P_{atm}$), which governs air density and convective heat transfer coefficients
- Relative humidity ($RH$) and dew-point temperature ($T_{dp}$)
- Wind speed ($v$) and direction ($\theta$)

Substituting an unverified or disparate weather dataset (e.g. using Denver, Colorado TMY data for a high-altitude shelter in Leh, Ladakh) invalidates thermal physics calculations. 

### Hard Rule on Fallback
If a requested weather dataset does not exist or fails validation:
1. The execution engine must **FAIL CLEARLY** with an explicit error.
2. The engine must **NEVER** replace missing weather files with `test_weather.epw` or any other placeholder.
3. Automated test fixtures (e.g. `simulation/weather/test_weather.epw`) are strictly reserved for unit and regression testing.

---

## 2. Dataset Classification & UI Status

Every weather dataset in the platform must be assigned an immutable classification status:

| Classification | UI Badge | Description | Production Simulation Allowed |
|---|---|---|---|
| `REAL_DATA` | **REAL DATA** (Emerald) | Verified empirical meteorological data originating from certified EPW providers (ISHRAE, ASHRAE, Climate.OneBuilding), authenticated weather stations, or satellite reanalysis (NASA POWER). | **YES** |
| `USER_DEFINED` | **USER-DEFINED** (Violet) | Custom engineering design days, parametric cold-wave stress tests, or bespoke hourly files specified by an engineer. | **YES** (Flagged as parametric study) |
| `TEST_DATA` | **TEST DATA** (Amber/Red) | Synthetic, truncated, or test fixtures (such as `test_weather.epw`) intended solely for testing software infrastructure. | **BLOCKED by default**; requires explicit user override (`allow_test_data=True`). |

---

## 3. Supported Weather Ingestion Channels

The platform provides 4 validated meteorological ingestion channels:

```
                  ┌───────────────────────────────────────────────┐
                  │            USER LOCATION INPUT                │
                  │   (Latitude, Longitude, Elevation, Region)    │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │            SELECT WEATHER CHANNEL             │
                  └───────┬───────────┬───────────┬───────────┬───┘
                          │           │           │           │
                          ▼           ▼           ▼           ▼
                     [1. EPW]     [2. CSV]   [3. NASA]   [4. Manual]
                      Upload       Upload     POWER       Design
                          │           │       Hourly       Day
                          │           ▼           ▼           │
                          │      CSV-to-EPW  API-to-EPW       │
                          │      Converter   Converter        │
                          │           │           │           │
                          └─────┬─────┴─────┬─────┴───────────┘
                                │           │
                                ▼           ▼
                       ┌─────────────────────────────┐
                       │   WEATHER VALIDATION LAYER  │
                       │   - Header consistency      │
                       │   - Coordinate alignment    │
                       │   - Physical value bounds   │
                       │   - Timestep & gap checks   │
                       │   - SHA-256 Hashing         │
                       └──────────────┬──────────────┘
                                      │
                                      ▼
                       ┌─────────────────────────────┐
                       │    PROVENANCE REGISTRY      │
                       │   (Persist metadata & hash) │
                       └──────────────┬──────────────┘
                                      │
                                      ▼
                       ┌─────────────────────────────┐
                       │    ENERGYPLUS ENGINE        │
                       │   (Executes authentic runs) │
                       └─────────────────────────────┘
```

### 3.1 EPW File Upload
- Direct upload of standard EnergyPlus Weather (`.epw`) files.
- Header lines 1–8 must be strictly formatted according to US DOE EnergyPlus Weather specification.
- Location header coordinates are cross-checked against project shelter coordinates.

### 3.2 CSV Logger Upload
- Upload of hourly station records (e.g. Campbell Scientific, Davis Instruments, Onset HOBO).
- Required columns: `timestamp` (or `month`, `day`, `hour`), `dry_bulb_temp_c`, `relative_humidity` or `dew_point_c`, `direct_normal_radiation` (or `global_horizontal_radiation`), `wind_speed_ms`.
- Automatically converted to standard 35-column EPW format with barometric pressure calculated from site elevation.

### 3.3 NASA POWER Satellite API
- Query the keyless public NASA Prediction Of Worldwide Energy Resources (POWER) hourly point API (`https://power.larc.nasa.gov/api/temporal/hourly/point`).
- Parameters retrieved:
  - `T2M`: Temperature at 2 meters (°C)
  - `RH2M`: Relative Humidity at 2 meters (%)
  - `PS`: Surface Pressure (kPa → Pa)
  - `WS10M`: Wind Speed at 10 meters (m/s)
  - `WD10M`: Wind Direction at 10 meters (degrees)
  - `ALLSKY_SFC_SW_DWN`: All-sky Global Horizontal Irradiance ($Wh/m^2$)
  - `ALLSKY_SFC_SW_DNI`: All-sky Direct Normal Irradiance ($Wh/m^2$)
  - `ALLSKY_SFC_SW_DIFF`: All-sky Diffuse Horizontal Irradiance ($Wh/m^2$)
- Horizontal infrared radiation is derived using the Clark and Allen sky temperature formulation.
- Output dataset is saved as an EPW file and permanently hashed.

### 3.4 Manual User-Defined Weather
- Allows engineers to define customized extreme design conditions:
  - Design minimum dry-bulb temperature
  - Diurnal temperature amplitude
  - Peak solar irradiance ($W/m^2$)
  - Prevailing wind speed
  - Site elevation and barometric pressure
- Generates an EPW file tagged explicitly as `USER_DEFINED`.

---

## 4. Weather Validation Rules and Thresholds

Every weather dataset must pass the validation layer before ingestion:

1. **Header Consistency:**
   - Valid `LOCATION` header: City, State/Region, Country, Data Source, WMO ID, Latitude, Longitude, Time Zone, Elevation.
   - Coordinate check: If distance between shelter latitude/longitude and EPW latitude/longitude exceeds 100 km, a clear geographic divergence warning is issued.
2. **Physical Boundary Checks:**
   - Dry-bulb temperature: $-70^\circ\text{C} \le T_{db} \le +60^\circ\text{C}$
   - Relative humidity: $0\% \le RH \le 100\%$
   - Atmospheric pressure: $30{,}000\text{ Pa} \le P_{atm} \le 108{,}000\text{ Pa}$ (consistent with elevation via barometric formula $P = 101325 \cdot (1 - 2.25577 \cdot 10^{-5} \cdot h)^{5.25588}$)
   - Solar irradiance: $0 \le GHI, DNI, DHI \le 1400\text{ W/m}^2$
   - Wind speed: $0 \le v \le 75\text{ m/s}$
3. **Data Completeness & Continuity:**
   - No `NaN`, null, or unhandled missing values (e.g. raw 999.0 without flags).
   - Timestamps must be strictly monotonic with no missing hours.

---

## 5. Simulation Provenance Tracking

For every simulation run, the system must record and persist the following provenance schema:

```json
{
  "weather_provenance": {
    "weather_source": "NASA_POWER",
    "dataset_name": "NASA_POWER_Leh_34.1526N_77.5771E_2023.epw",
    "file_hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "latitude": 34.1526,
    "longitude": 77.5771,
    "elevation_m": 3500.0,
    "date_range": "2023-01-01 to 2023-01-03",
    "timestep_minutes": 60,
    "status": "REAL_DATA",
    "is_test_data": false,
    "validation": {
      "is_valid": true,
      "checks_passed": ["header", "coordinates", "variables", "bounds", "continuity"],
      "coordinate_delta_km": 0.0
    }
  }
}
```

---

## 6. Policy Enforcement in Production

1. **API Layer (`backend/api/v1/endpoints/simulations.py`):**
   - Inspects the requested `weather_file`.
   - If `status == "TEST_DATA"` and `allow_test_data == False`, the request is rejected with `HTTP 400 Bad Request`.
2. **Task Worker (`backend/simulation/tasks.py`):**
   - If the requested weather file does not exist on disk, raises `FileNotFoundError`.
   - **No fallback substitution** is permitted.
3. **Frontend UI (`SimulationsView.tsx` & `WeatherView.tsx`):**
   - Highlights weather provenance status with color-coded badges.
   - If a test dataset is selected, requires explicit modal confirmation before the user can submit a run.
