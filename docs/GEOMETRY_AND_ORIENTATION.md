# Geometry & Orientation Technical Specification (SIH 2026)

This document specifies the single universal geometry and orientation standard implemented across the SIH 2026 application stack (Canonical ShelterModel, UI, Three.js 3D Viewer, EnergyPlus IDF Generator, Optimization Algorithms, and Engineering Reports).

---

## 1. Canonical Coordinate System

The building model operates in a standard right-handed 3D Cartesian coordinate system:

| Axis | Building Axis | Direction at Baseline ($\text{Orientation} = 0^{\circ}$) | Description |
| :--- | :--- | :--- | :--- |
| **X** | Longitudinal | **East-West** ($X = 0$ to $X = \text{Length}$) | Building Length dimension |
| **Y** | Transverse | **North-South** ($Y = 0$ to $Y = \text{Width}$) | Building Width dimension |
| **Z** | Vertical | **Up / Zenith** ($Z = 0$ to $Z = \text{Height}$) | Building Height dimension |

- **Origin $(0, 0, 0)$**: Bottom South-West corner of the building footprint at finished grade.
- **Footprint Area**: $\text{Floor Area} = \text{Length} \times \text{Width} \ (\text{m}^2)$

---

## 2. Universal Orientation Standard

Orientation is defined as the **clockwise azimuth angle in degrees ($0.0^{\circ} \le \theta < 360.0^{\circ}$)** from True North to the Building's North Axis.

### Baseline ($0^{\circ}$ Azimuth) — Solar Optimal Alignment

When $\theta = 0^{\circ}$:
- **South Wall ($Y = 0$, Outward Normal $[0, -1, 0]$)**: Faces **True South ($180^{\circ}$ Compass)**.
  - In the Northern Hemisphere (e.g., Ladakh at $34^{\circ}\text{N}$), this is the primary long facade ($L \times H$), designed to maximize low-angle winter solar heat gains.
- **North Wall ($Y = \text{Width}$, Outward Normal $[0, +1, 0]$)**: Faces **True North ($0^{\circ}$ Compass)**.
  - Receives minimal direct solar radiation; acts as the primary thermal buffer facade.
- **East Wall ($X = \text{Length}$, Outward Normal $[+1, 0, 0]$)**: Faces **True East ($90^{\circ}$ Compass)**.
  - Receives morning solar radiation.
- **West Wall ($X = 0$, Outward Normal $[-1, 0, 0]$)**: Faces **True West ($270^{\circ}$ Compass)**.
  - Receives afternoon solar radiation.
- **Roof Surface (Outward Normal $[+Z]$)**: Faces Sky.
- **Floor Surface (Outward Normal $[-Z]$)**: Faces Ground.

### Cardinal Azimuth Reference Table

| Azimuth Angle | Building Rotation | Long Solar Facade (South Wall) | North Wall Facing | East Wall Facing | West Wall Facing | Solar Efficiency |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **$0^{\circ}$** | Baseline Alignment | **True South ($180^{\circ}$)** | True North ($0^{\circ}$) | True East ($90^{\circ}$) | True West ($270^{\circ}$) | $1.00$ (Optimal Winter Gain) |
| **$45^{\circ}$** | $45^{\circ}$ Clockwise | **South-West ($225^{\circ}$)** | North-East ($45^{\circ}$) | South-East ($135^{\circ}$) | North-West ($315^{\circ}$) | $0.71$ |
| **$90^{\circ}$** | $90^{\circ}$ Clockwise | **True West ($270^{\circ}$)** | True East ($90^{\circ}$) | True South ($180^{\circ}$) | True North ($0^{\circ}$) | $0.00$ |
| **$180^{\circ}$** | $180^{\circ}$ Inversion | **True North ($0^{\circ}$)** | True South ($180^{\circ}$) | True West ($270^{\circ}$) | True East ($90^{\circ}$) | $-1.00$ (Coldest alignment) |
| **$270^{\circ}$** | $270^{\circ}$ Clockwise | **True East ($90^{\circ}$)** | True West ($270^{\circ}$) | True North ($0^{\circ}$) | True South ($180^{\circ}$) | $0.00$ |

---

## 3. Surface Vertex Winding & Outward Normals

EnergyPlus enforces the `UpperLeftCorner, CounterClockWise, World` geometry convention.
When viewing any surface from the **outside looking at the building**, vertices must be entered in **counter-clockwise order**.
By the right-hand rule, $\vec{n} = (\vec{v}_2 - \vec{v}_1) \times (\vec{v}_3 - \vec{v}_2)$ must point **strictly outwards** from the building interior into the ambient environment (or into the ground for the floor).

### A. Flat Roof ($0^{\circ}$ pitch)

- **Floor ($Z = 0$, Normal $[0, 0, -1]$)**:
  1. $(0, 0, 0)$
  2. $(0, W, 0)$
  3. $(L, W, 0)$
  4. $(L, 0, 0)$
- **Roof ($Z = H$, Normal $[0, 0, +1]$)**:
  1. $(0, W, H)$
  2. $(0, 0, H)$
  3. $(L, 0, H)$
  4. $(L, W, H)$
- **South Wall ($Y = 0$, Normal $[0, -1, 0]$)**:
  1. $(0, 0, H)$
  2. $(0, 0, 0)$
  3. $(L, 0, 0)$
  4. $(L, 0, H)$
- **North Wall ($Y = W$, Normal $[0, +1, 0]$)**:
  1. $(L, W, H)$
  2. $(L, W, 0)$
  3. $(0, W, 0)$
  4. $(0, W, H)$
- **East Wall ($X = L$, Normal $[+1, 0, 0]$)**:
  1. $(L, 0, H)$
  2. $(L, 0, 0)$
  3. $(L, W, 0)$
  4. $(L, W, H)$
- **West Wall ($X = 0$, Normal $[-1, 0, 0]$)**:
  1. $(0, W, H)$
  2. $(0, W, 0)$
  3. $(0, 0, 0)$
  4. $(0, 0, H)$

### B. Shed Roof (Monoslope)

Rises from South eave at $Y = 0, Z = H$ up to North wall at $Y = W, Z = H + \Delta h$, where $\Delta h = W \tan(\theta_{\text{roof}})$.
- **Roof Surface (Normal tilts South & Up)**:
  1. $(0, W, H + \Delta h)$
  2. $(0, 0, H)$
  3. $(L, 0, H)$
  4. $(L, W, H + \Delta h)$
- **East Wall (Trapezoid, Normal $[+1, 0, 0]$)**:
  1. $(L, 0, H)$
  2. $(L, 0, 0)$
  3. $(L, W, 0)$
  4. $(L, W, H + \Delta h)$
- **West Wall (Trapezoid, Normal $[-1, 0, 0]$)**:
  1. $(0, W, H + \Delta h)$
  2. $(0, W, 0)$
  3. $(0, 0, 0)$
  4. $(0, 0, H)$

### C. Gable Roof (Symmetric Dual Pitch)

Ridge along building length at $Y = W/2, Z = H + \Delta h$, where $\Delta h = \frac{W}{2} \tan(\theta_{\text{roof}})$.
- **South Roof Pitch (Normal tilts South & Up)**:
  1. $(0, W/2, H + \Delta h)$
  2. $(0, 0, H)$
  3. $(L, 0, H)$
  4. $(L, W/2, H + \Delta h)$
- **North Roof Pitch (Normal tilts North & Up)**:
  1. $(0, W, H)$
  2. $(0, W/2, H + \Delta h)$
  3. $(L, W/2, H + \Delta h)$
  4. $(L, W, H)$
- **East Wall (5-sided Pentagon, Normal $[+1, 0, 0]$)**:
  1. South Base: $(L, 0, 0)$
  2. North Base: $(L, W, 0)$
  3. North Eaves: $(L, W, H)$
  4. Ridge: $(L, W/2, H + \Delta h)$
  5. South Eaves: $(L, 0, H)$
- **West Wall (5-sided Pentagon, Normal $[-1, 0, 0]$)**:
  1. North Base: $(0, W, 0)$
  2. South Base: $(0, 0, 0)$
  3. South Eaves: $(0, 0, H)$
  4. Ridge: $(0, W/2, H + \Delta h)$
  5. North Eaves: $(0, W, H)$

---

## 4. Volume & Mean Ceiling Height Formulas

EnergyPlus calculates Zone Volume via the 3D surface divergence theorem:
$$\text{Volume} = \frac{1}{3} \sum_{i} (\vec{c}_i \cdot \vec{n}_i) A_i$$

When surface normals are properly outward-facing:
- **Flat Roof**:
  $$\text{Volume} = L \cdot W \cdot H$$
  $$\text{Mean Ceiling Height} = \frac{\text{Volume}}{\text{Floor Area}} = H$$
- **Shed Roof**:
  $$\text{Volume} = L \cdot W \cdot \left(H + \frac{1}{2} \Delta h\right)$$
  $$\text{Mean Ceiling Height} = H + \frac{1}{2} \Delta h$$
- **Gable Roof**:
  $$\text{Volume} = L \cdot W \cdot \left(H + \frac{1}{2} \Delta h\right)$$
  $$\text{Mean Ceiling Height} = H + \frac{1}{2} \Delta h$$

Setting `Ceiling Height = Mean Ceiling Height` in the EnergyPlus `Zone` object ensures exact agreement between entered and calculated geometric quantities, with $0$ warnings and $0$ errors.

---

## 5. Three.js Viewport Alignment

In Three.js standard coordinates:
- $+X$ = East (Right)
- $-X$ = West (Left)
- $-Z$ = North (Top / Forward)
- $+Z$ = South (Bottom / Backward)
- $+Y$ = Up (Zenith)

A clockwise rotation of $\theta$ azimuth rotates the South facade ($+Z$) towards the West facade ($-X$). In Three.js, positive Y-rotation rotates $+Z$ towards $+X$ (counter-clockwise). Therefore:
$$\text{Mesh Rotation Y} = -\theta_{\text{rad}} = -\frac{\theta \cdot \pi}{180}$$
This guarantees visual and spatial parity with the Cardinal Compass Rose and EnergyPlus simulations.
