# Engineering Assumptions

**SIH 2026 — Problem Statement 26051**

This document serves as a living record of all major engineering assumptions made during the design and development of the shelter simulation platform. 

Per the `AGENT_RULES.md` and `ENGINEERING_RULES.md`, no silent assumptions are allowed. Every assumption that bridges a gap in data, simplifies physics, or enables a technical implementation must be recorded here.

---

## 1. Adapter Pattern for Simulation Engines

**The Assumption:**
The core physics of shelter thermal dynamics can be modeled generically enough to map efficiently to EnergyPlus, OpenStudio, and (optionally) ANSYS via an adapter interface, without losing critical fidelity.

**Why it was made:**
To prevent the canonical `ShelterModel` from becoming tightly coupled to the idiosyncrasies of a single engine (e.g., EnergyPlus IDF syntax), ensuring the platform remains modular, future-proof, and capable of utilizing different solvers for different analysis needs (e.g., EnergyPlus for annual energy, ANSYS for detailed CFD).

**Its Limitations:**
Some advanced, engine-specific features (like complex EnergyPlus HVAC nodes or specific ANSYS turbulence models) may be difficult to express in the generic `ShelterModel`. The adapter may have to default or ignore properties that don't translate across engines.

## 2. Defaulting to Passive Shelters

**The Assumption:**
The primary use case for this platform involves passive shelters, where mechanical HVAC systems are secondary, simplified, or entirely absent.

**Why it was made:**
Problem Statement 26051 focuses heavily on "Thermal Comfort Maintenance" in extreme climates (like Ladakh) where active heating may be scarce or rely on basic internal loads. The complexity of modeling full HVAC systems detracts from optimizing the envelope and passive solar gains.

**Its Limitations:**
The `ShelterModel` provides simplified representations of mechanical ventilation and equipment. It does not support complex air handling units, VAV boxes, or detailed plant loops.

## 3. NASA POWER as Synthetic Weather

**The Assumption:**
When localized EPW files are unavailable, NASA POWER hourly API data provides a sufficient synthetic baseline for thermal analysis.

**Why it was made:**
Many remote high-altitude regions (like Pangong Tso) do not have standardized, measured EPW files available from ASHRAE or White Box Technologies. NASA POWER provides satellite-derived meteorological data globally.

**Its Limitations:**
Satellite-derived data may lack micro-climate nuances (e.g., specific valley wind patterns or local shading). All simulations using this data must carry a "synthetic weather" disclaimer.

## 4. Internal Thermal Mass Modeling

**The Assumption:**
Internal thermal mass elements (like water walls or masonry partitions) can be adequately modeled as EnergyPlus `InternalMass` objects without explicit 3D geometric representation in the bounding box.

**Why it was made:**
Adding complex internal geometries significantly complicates the 3D surface meshing, zone splitting, and daylighting calculations. Modeling them as internal mass preserves their thermal inertia and radiant exchange effects within the zone heat balance without geometric overhead.

**Its Limitations:**
We lose the ability to model exact geometric shadowing or specific localized radiant asymmetries caused by the exact placement of these internal masses.

## 5. Construction Layer Ordering

**The Assumption:**
All construction assemblies are defined strictly from Outside to Inside.

**Why it was made:**
To maintain consistency with EnergyPlus and ASHRAE conventions, ensuring that solar absorptance on the exterior layer and interior convection on the innermost layer are calculated correctly.

**Its Limitations:**
UI designers and API consumers must rigidly adhere to this order. If a user inputs layers inside-out, the thermal mass placement and surface properties will be entirely physically incorrect, drastically altering simulation results.
