# Engineering Rules

This document outlines the strict engineering and coding standards for the SIH 2026 Problem Statement 26051 platform. These rules ensure scientific validity, traceability, and architectural robustness.

## 1. Units and Quantities
- **Internal SI Units:** All data models, database columns, simulation inputs, API responses, and internal calculations MUST use strictly SI units (meters, Celsius, W/(m²·K), etc.) without exception.
- **Explicit Units in UI:** The user interface MUST display explicit units for all quantities. A number should never appear on screen without its unit context (e.g., "Thickness: 0.3 m" or "Conductivity: 1.8 W/(m·K)").

## 2. Engineering Provenance and Traceability
- **Data Provenance:** All engineering data must have clear provenance.
  - **Material Source:** Every material definition must store its source (e.g., "ASHRAE", "BIS", "research_paper") and a specific citation/reference string.
  - **User-Defined Data:** Any material property or configuration defined by a user without a citation MUST be clearly labelled as "User-Defined" in the UI and database.
  - **Weather Source:** The source of weather data (EPW, NASA POWER API, manual synthesis) must be permanently stored alongside the simulation configuration.
- **Version Traceability:** Every `ShelterModel` mutation must increment its version number. Simulation runs must be tied to a specific, immutable version of a `ShelterModel` to guarantee reproducibility.
- **Engine Traceability:** The exact simulation engine used (e.g., "energyplus") and its version (e.g., "24.2.0") must be recorded and stored for every simulation run.

## 3. Simulation Truth and Error Handling
- **Success vs. Validity:** A simulation completing without crashing (success) is distinct from the simulation representing physical reality (engineering validity). The system must distinguish between engine execution success and the physical validity of the results.
- **Preserve Errors:** All simulation errors, warnings, and severe messages from the underlying engine (e.g., EnergyPlus `.err` files) MUST be preserved, parsed, and made accessible to the user. Do not swallow or hide engine warnings.

## 4. Optimization and Targets
- **Explicit Objectives:** Optimization routines must define explicit mathematical objectives.
- **Definition of "Best":** The term "best" is subjective and must never be used alone. It must always mean the optimal solution *under defined objectives and constraints* (e.g., "Optimal for maximizing comfort hours while keeping heating demand below 60 kWh/m²a").

## 5. Architectural Modularity
- **Decoupled Frontend:** Frontend logic must not be coupled directly to EnergyPlus internals (e.g., IDF syntax, specific EP variable names). The frontend interacts strictly with the canonical `ShelterModel` and generic `SimulationOutput` DTOs.
- **Decoupled Domain:** The core domain (`ShelterModel`) must not be coupled directly to a single simulation engine. It must remain a generic representation of the physics, capable of being mapped to EnergyPlus, OpenStudio, or ANSYS via the Adapter Pattern.

## 6. Assumptions
- **No Silent Assumptions:** Do not make major engineering assumptions silently. Any assumption made to bridge a gap in data or physics must be explicitly documented.
- **Living Document:** All major engineering decisions must be recorded in `docs/ASSUMPTIONS.md`.
