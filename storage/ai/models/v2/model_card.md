# Model Card: thermoshelter_surrogate_hist_gbr (v2)

**Approval Status**: `VALIDATED`  
**Model Architecture**: `hist_gbr`  
**Simulation Regime**: `winter_peak_3day`  
**Generated**: `2026-09-22T17:14:53.941836+00:00`  
**Training Dataset**: `stage_a` (120 ThermoShelter Core physics runs)  

## 1. Verified Climate Domain Coverage
`siachen_glacier`, `dras_kargil`, `tawang`, `leh_ladakh_tmyx`, `spiti_valley`

## 2. In-Domain Validation Performance
| Target Metric | MAE | RMSE | R² | 95th % Error | Max Error | Tolerance Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `winter_indoor_min_c` | 3.876 | 4.72 | 0.8184 | 8.458 | 10.279 | MAE <= 2.5 C |
| `winter_indoor_mean_c` | 3.077 | 3.925 | 0.8535 | 6.195 | 10.697 | MAE <= 2.0 C |
| `winter_heating_demand_kwh_m2` | 0.0 | 0.0 | 1.0 | 0.0 | 0.0 | MAE <= 25.0 kWh/m2 |
| `winter_comfort_hours_pct` | 7.774 | 19.444 | 0.3086 | 32.182 | 86.04 | MAE <= 15.0% |

## 3. Baseline Comparison
| Target Metric | Dummy (Mean) MAE | Ridge Baseline MAE | Surrogate Model MAE | Improvement over Baseline |
| :--- | :--- | :--- | :--- | :--- |
| `winter_indoor_min_c` | 8.58 | 4.315 | 3.876 | 54.8% |
| `winter_indoor_mean_c` | 8.011 | 3.56 | 3.077 | 61.6% |
| `winter_heating_demand_kwh_m2` | 0.0 | 0.0 | 0.0 | 0.0% |
| `winter_comfort_hours_pct` | 13.156 | 15.347 | 7.774 | 40.9% |

## 4. Known Limitations & Domain Boundary
Inference flags out-of-domain requests and reduces confidence score, prompting forward physics simulation.

### Limitations:
- Surrogate is valid only within high-altitude Himalayan climate envelope (2,500m - 5,400m).
- Geometry must adhere to aspect ratio <= 2.5 and WWR <= 0.35.
- Surrogate predictions represent fast interpolations; high-priority candidate designs must undergo ThermoShelter Core verification.