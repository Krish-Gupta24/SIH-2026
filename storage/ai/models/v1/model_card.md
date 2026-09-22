# Model Card: thermoshelter_surrogate_v1 (v1)

**Approval Status**: `APPROVED_FOR_SURROGATE_USE`  
**Model Architecture**: `hist_gbr`  
**Simulation Regime**: `winter_peak_3day`  
**Generated**: `2026-09-13T17:40:35.423420+00:00`  
**Training Dataset**: `baseline_v1` (60 ThermoShelter Core physics runs)  

## 1. Verified Climate Domain Coverage
`IND_JK_Leh.427053_TMYx.epw`

## 2. In-Domain Validation Performance
| Target Metric | MAE | RMSE | R² | 95th % Error | Max Error | Tolerance Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `winter_indoor_min_c` | 1.434 | 1.869 | 0.836 | 3.782 | 4.371 | MAE <= 2.0 C |
| `winter_indoor_mean_c` | 1.434 | 1.869 | 0.836 | 3.782 | 4.371 | N/A |
| `winter_heating_demand_kwh_m2` | 5.735 | 7.475 | 0.836 | 15.128 | 17.484 | N/A |
| `winter_comfort_hours_pct` | 5.735 | 7.475 | 0.836 | 15.128 | 17.484 | N/A |

## 3. Baseline Comparison
| Target Metric | Dummy (Mean) MAE | Ridge Baseline MAE | Surrogate Model MAE | Improvement over Baseline |
| :--- | :--- | :--- | :--- | :--- |
| `winter_indoor_min_c` | N/A | N/A | 1.434 | N/A |
| `winter_indoor_mean_c` | N/A | N/A | 1.434 | N/A |
| `winter_heating_demand_kwh_m2` | N/A | N/A | 5.735 | N/A |
| `winter_comfort_hours_pct` | N/A | N/A | 5.735 | N/A |

## 4. Known Limitations & Domain Boundary
Conservative uncertainty margin applied

### Limitations:
- Initial surrogate baseline