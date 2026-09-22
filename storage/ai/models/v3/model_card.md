# Model Card: thermoshelter_surrogate_v3_stacked (v3)

**Approval Status**: `APPROVED_FOR_SURROGATE_USE`  
**Model Architecture**: `hist_gbr`  
**Simulation Regime**: `winter_peak_3day`  
**Generated**: `2026-09-22T17:35:31.297781+00:00`  
**Training Dataset**: `stage_a_merged` (122 ThermoShelter Core physics runs)  

## 1. Verified Climate Domain Coverage
`siachen_glacier`, `dras_kargil`, `tawang`, `leh_ladakh_tmyx`, `spiti_valley`

## 2. In-Domain Validation Performance
| Target Metric | MAE | RMSE | R² | 95th % Error | Max Error | Tolerance Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `winter_indoor_min_c` | 4.372 | 5.902 | 0.715 | 9.618 | 17.488 | MAE <= 2.5 C |
| `winter_indoor_mean_c` | 3.498 | 4.722 | 0.7944 | 7.696 | 13.992 | MAE <= 2.0 C |
| `envelope_ua_value` | 1106.968 | 1494.407 | 0.9505 | 2435.33 | 4427.872 | MAE <= 5.0 W/K |
| `thermal_autonomy_hours` | 15.573 | 21.024 | 0.5028 | 34.261 | 62.292 | MAE <= 6.0 h |
| `delta_t_peak_c` | 3.783 | 5.107 | 0.5611 | 8.323 | 15.132 | MAE <= 2.0 C |

## 3. Baseline Comparison
| Target Metric | Dummy (Mean) MAE | Ridge Baseline MAE | Surrogate Model MAE | Improvement over Baseline |
| :--- | :--- | :--- | :--- | :--- |
| `winter_indoor_min_c` | N/A | N/A | 4.372 | N/A |
| `winter_indoor_mean_c` | N/A | N/A | 3.498 | N/A |
| `envelope_ua_value` | N/A | N/A | 1106.968 | N/A |
| `thermal_autonomy_hours` | N/A | N/A | 15.573 | N/A |
| `delta_t_peak_c` | N/A | N/A | 3.783 | N/A |

## 4. Known Limitations & Domain Boundary
Inference flags out-of-domain requests and applies a conservative uncertainty margin.

### Limitations:
- Valid only within high-altitude Himalayan climate envelope (2,500m – 5,400m).
- Geometry: aspect ratio <= 2.5, WWR <= 0.40.
- envelope_ua_value and delta_t_peak_c are physics-derived; thermal_autonomy_hours is model-estimated.
- High-priority candidates should be verified via ThermoShelter Core forward simulation.