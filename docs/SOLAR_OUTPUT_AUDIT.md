# EnergyPlus Solar Output Variable Audit & Verification Report

**Active Simulation Engine**: EnergyPlus 24.1.0-9d7789a3ac (DOE Certified)  
**Meteorological Site**: Climate.OneBuilding WMO 427053 (Leh TMYx Dataset)  
**Test Protocol**: Automated Solar Output Audit Suite (`tests/simulation/test_solar_output_audit.py`)  
**Date**: September 11, 2026  

---

## 1. Executive Summary

This audit evaluates all solar radiation, transmission, absorption, and fenestration heat gain variables against the installed EnergyPlus engine. It guarantees:
1. **Zero Unsupported Requests**: Every requested variable exists in the EnergyPlus Report Data Dictionary (`eplusout.rdd`).
2. **Authentic Output Production**: Every requested variable is actually written to the output CSV (`eplusout.csv`).
3. **Rigorous SI Units**: Strict physical units ($W/\text{m}^2$, $W$, $J$, $\text{kWh}$) are validated without dimension errors.
4. **Parser Integrity**: Variables are mapped 1:1 to canonical `SimulationResult.solar` properties without synthetic fallback multipliers or fabricated numbers.

---

## 2. Centralized Output Variable Registry

The mapping from high-level thermal engineering metric to exact EnergyPlus variable, physical unit, frequency, parser key, and concept classification is stored centrally in `simulation/results/output_registry.py` and exposed via API endpoint `/api/v1/simulations/output-variables`.

| Metric | EnergyPlus Output Variable | Unit | Frequency | Parser Key | Concept | Required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `site_direct_solar_radiation` | `Site Direct Solar Radiation Rate per Area` | $\text{W/m}^2$ | Hourly | `solar_direct_normal_irradiance` | Incident solar radiation | Yes |
| `site_diffuse_solar_radiation` | `Site Diffuse Solar Radiation Rate per Area` | $\text{W/m}^2$ | Hourly | `solar_diffuse_horizontal_irradiance` | Incident solar radiation | Yes |
| `surface_incident_solar_radiation` | `Surface Outside Face Incident Solar Radiation Rate per Area` | $\text{W/m}^2$ | Hourly | `surface_incident_solar_radiation` | Incident solar radiation | No |
| `surface_window_transmitted_solar_rate` | `Surface Window Transmitted Solar Radiation Rate` | $\text{W}$ | Hourly | `solar_gains_by_window` | Transmitted solar radiation where supported | No |
| `zone_windows_total_transmitted_solar_rate` | `Zone Windows Total Transmitted Solar Radiation Rate` | $\text{W}$ | Hourly | `solar_gains_total` | Transmitted solar radiation where supported | Yes |
| `zone_windows_total_transmitted_solar_energy` | `Zone Windows Total Transmitted Solar Radiation Energy` | $\text{J}$ | Hourly | `solar_gains_total_energy_j` | Total useful solar gain | Yes |
| `surface_outside_face_solar_absorption_rate` | `Surface Outside Face Solar Radiation Heat Gain Rate` | $\text{W}$ | Hourly | `opaque_surface_absorbed_solar_rate` | Absorbed solar gains where supported | No |
| `window_glazing_absorbed_solar_rate` | `Surface Window Total Glazing Layers Absorbed Solar Radiation Rate` | $\text{W}$ | Hourly | `window_glazing_absorbed_solar_rate` | Absorbed solar gains where supported | No |
| `surface_inside_face_solar_radiation_gain_rate` | `Surface Inside Face Solar Radiation Heat Gain Rate` | $\text{W}$ | Hourly | `surface_inside_face_solar_heat_gain_rate` | Absorbed solar gains where supported | No |
| `zone_windows_total_heat_gain_rate` | `Zone Windows Total Heat Gain Rate` | $\text{W}$ | Hourly | `window_total_heat_gain_rate` | Solar heat gain through windows | Yes |
| `zone_windows_total_heat_loss_rate` | `Zone Windows Total Heat Loss Rate` | $\text{W}$ | Hourly | `window_total_heat_loss_rate` | Solar heat gain through windows | Yes |

---

## 3. Real Simulation Audit Results

A live EnergyPlus simulation of the canonical high-altitude passive shelter ($6\,\text{m} \times 4\,\text{m} \times 2.8\,\text{m}$ with a $2.4\,\text{m}^2$ South-facing solar aperture) was executed to verify all variables against the engine artifacts.

### Audit Result Breakdown:
- **Total Registered Solar Variables**: 11
- **PRODUCED**: 11
- **MISSING**: 0
- **UNSUPPORTED**: 0
- **Simulation Status**: COMPLETED (Exit Code 0, 0 Severe Errors, 0 Fatal Errors)

```
================================================================================
AUDITING REQUESTED OUTPUT VARIABLES AGAINST ENGINE ARTIFACTS:
--------------------------------------------------------------------------------
Metric                              | Category   | Status       | Unit
--------------------------------------------------------------------------------
site_direct_solar_radiation         | SOLAR      | PRODUCED     | W/m2
site_diffuse_solar_radiation        | SOLAR      | PRODUCED     | W/m2
surface_incident_solar_radiation    | SOLAR      | PRODUCED     | W/m2
surface_window_transmitted_solar_rate | SOLAR      | PRODUCED     | W
zone_windows_total_transmitted_solar_rate | SOLAR      | PRODUCED     | W
zone_windows_total_transmitted_solar_energy | SOLAR      | PRODUCED     | J
surface_outside_face_solar_absorption_rate | SOLAR      | PRODUCED     | W
window_glazing_absorbed_solar_rate  | SOLAR      | PRODUCED     | W
surface_inside_face_solar_radiation_gain_rate | SOLAR      | PRODUCED     | W
zone_windows_total_heat_gain_rate   | SOLAR      | PRODUCED     | W
zone_windows_total_heat_loss_rate   | SOLAR      | PRODUCED     | W
```

---

## 4. Verification of the 5 Mandatory Solar Concepts

### Concept 1: Incident Solar Radiation
- **Direct Normal Irradiance (DNI)**: Extracted from `Environment:Site Direct Solar Radiation Rate per Area [W/m2](Hourly)`
- **Diffuse Horizontal Irradiance (DHI)**: Extracted from `Environment:Site Diffuse Solar Radiation Rate per Area [W/m2](Hourly)`
- **Surface Irradiance**: Extracted from `SOUTHWALL:Surface Outside Face Incident Solar Radiation Rate per Area [W/m2](Hourly)`
- **Status**: ✅ **PRODUCED & VERIFIED**

### Concept 2: Transmitted Solar Radiation Where Supported
- **Per-Aperture Transmission**: Extracted from `WIN_SOUTH_AUDIT:Surface Window Transmitted Solar Radiation Rate [W](Hourly)`
- **Zone Cumulative Transmission**: Extracted from `MAINZONE:Zone Windows Total Transmitted Solar Radiation Rate [W](Hourly)`
- **Status**: ✅ **PRODUCED & VERIFIED**

### Concept 3: Absorbed Solar Gains Where Supported
- **Opaque Exterior Surface Absorption**: Extracted from `SOUTHWALL:Surface Outside Face Solar Radiation Heat Gain Rate [W](Hourly)`
- **Window Glazing Assembly Absorption**: Extracted from `WIN_SOUTH_AUDIT:Surface Window Total Glazing Layers Absorbed Solar Radiation Rate [W](Hourly)`
- **Interior Surface Solar Heat Gain**: Extracted from `SOUTHWALL:Surface Inside Face Solar Radiation Heat Gain Rate [W](Hourly)`
- **Status**: ✅ **PRODUCED & VERIFIED**

### Concept 4: Solar Heat Gain Through Windows
- **Zone Window Total Heat Gain Rate**: Extracted from `MAINZONE:Zone Windows Total Heat Gain Rate [W](Hourly)` (combines transmitted beam/diffuse solar radiation with inward glass conduction)
- **Zone Window Total Heat Loss Rate**: Extracted from `MAINZONE:Zone Windows Total Heat Loss Rate [W](Hourly)`
- **Status**: ✅ **PRODUCED & VERIFIED**

### Concept 5: Total Useful Solar Gain
- **Aperture Energy (Joules)**: Extracted from `MAINZONE:Zone Windows Total Transmitted Solar Radiation Energy [J](Hourly)`
- **Integrated Harvest ($\text{kWh}$)**: Derived via mathematical trapezoidal integration $\int P_{\text{solar}}(t)\,dt$ without artificial multiplier
- **Status**: ✅ **PRODUCED & VERIFIED**

---

## 5. Elimination of Fallbacks and Synthetic Values

1. **Eliminated Synthetic DNI Multiplier**: Previously, `SolarPerformanceChart.tsx` calculated `rawDni = rawGhi * 1.25` when direct normal radiation was not explicitly passed. This fallback has been completely eliminated. DNI is strictly rendered when authentic DNI telemetry exists; otherwise, `dni` is set to `null` and not displayed.
2. **Isolated Fenestration Logic**: If a shelter design possesses zero windows (e.g. subterranean bunker), window transmitted solar gains are accurately reported as $0.0\,\text{W}$ and empty dictionaries (`{}`), reflecting true physics without manufactured estimates.
3. **Transparent Reporting**: Reports and dashboards link every solar metric directly to the EnergyPlus output variable from which it was parsed.
