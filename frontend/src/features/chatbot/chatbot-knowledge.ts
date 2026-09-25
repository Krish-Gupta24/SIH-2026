/**
 * ThermoShelter Engineering Knowledge Base
 * DRDO Problem Statement 26051: Area-Specific Shelter Design & Thermal Comfort Platform
 * High-Altitude Extreme Cold Regimes (Ladakh, Siachen, Dras, Nyoma: -40°C to +30°C)
 */

export interface MaterialSpec {
  id: string;
  name: string;
  category: "Insulation" | "Thermal Mass" | "Glazing" | "Structural" | "PCM" | "Membrane";
  k_value: number; // Thermal conductivity W/(m·K)
  density: number; // kg/m³
  specificHeat: number; // J/(kg·K)
  standardThicknessMm: number;
  r_value_per_100mm: number; // (m²·K)/W
  embodiedCarbonKgCo2PerM3: number;
  costTier: "Low" | "Medium" | "High" | "Premium";
  highAltitudePros: string;
  highAltitudeCons: string;
  bestUse: string;
}

export const MATERIAL_DATABASE: Record<string, MaterialSpec> = {
  aerogel: {
    id: "aerogel",
    name: "Silica Aerogel Blanket",
    category: "Insulation",
    k_value: 0.015,
    density: 160,
    specificHeat: 1000,
    standardThicknessMm: 20,
    r_value_per_100mm: 6.67,
    embodiedCarbonKgCo2PerM3: 180,
    costTier: "Premium",
    highAltitudePros: "Extremely thin profile; highest R-value per mm; non-combustible Class A1; hydrophobic.",
    highAltitudeCons: "High material cost; requires protective face against abrasion during rough military transit.",
    bestUse: "Thermal break isolation, window reveals, and high-altitude space-constrained composite wall cores.",
  },
  eps: {
    id: "eps",
    name: "Expanded Polystyrene (EPS)",
    category: "Insulation",
    k_value: 0.035,
    density: 28,
    specificHeat: 1300,
    standardThicknessMm: 150,
    r_value_per_100mm: 2.86,
    embodiedCarbonKgCo2PerM3: 75,
    costTier: "Low",
    highAltitudePros: "Ultra-lightweight for mule/airdrop transport; cost-effective; predictable thermal properties.",
    highAltitudeCons: "Combustible without flame retardants; can degrade under intense UV if unclad.",
    bestUse: "Main wall cavity insulation and structural insulated panel (SIP) cores in extreme cold.",
  },
  xps: {
    id: "xps",
    name: "Extruded Polystyrene (XPS)",
    category: "Insulation",
    k_value: 0.028,
    density: 35,
    specificHeat: 1400,
    standardThicknessMm: 100,
    r_value_per_100mm: 3.57,
    embodiedCarbonKgCo2PerM3: 95,
    costTier: "Medium",
    highAltitudePros: "High compressive strength (>300 kPa); closed-cell moisture impermeable; permafrost isolation.",
    highAltitudeCons: "Slightly heavier than EPS; requires mechanical anchors.",
    bestUse: "Sub-grade floor slab insulation directly resting on frozen moraine or permafrost.",
  },
  puf: {
    id: "puf",
    name: "Polyurethane Foam (PUF / PIR)",
    category: "Insulation",
    k_value: 0.022,
    density: 40,
    specificHeat: 1400,
    standardThicknessMm: 100,
    r_value_per_100mm: 4.55,
    embodiedCarbonKgCo2PerM3: 110,
    costTier: "Medium",
    highAltitudePros: "Excellent rigidity; forms airtight composite sandwich panels; high thermal resistance.",
    highAltitudeCons: "Toxic fumes in fire scenarios if not treated; higher embodied energy.",
    bestUse: "Prefabricated modular military shelter cassette wall and roof assemblies.",
  },
  rockwool: {
    id: "rockwool",
    name: "Rockwool / Mineral Wool",
    category: "Insulation",
    k_value: 0.038,
    density: 80,
    specificHeat: 840,
    standardThicknessMm: 100,
    r_value_per_100mm: 2.63,
    embodiedCarbonKgCo2PerM3: 45,
    costTier: "Low",
    highAltitudePros: "1000°C fireproof barrier; acoustic attenuation; vapor permeable breathability.",
    highAltitudeCons: "Must be guarded from water/snow ingress; higher density than EPS.",
    bestUse: "Fire-rated partition walls, roof ceiling insulation, and chimney/stove penetration surrounds.",
  },
  rammed_earth: {
    id: "rammed_earth",
    name: "Stabilized Rammed Earth / Adobe",
    category: "Thermal Mass",
    k_value: 0.95,
    density: 1850,
    specificHeat: 1050,
    standardThicknessMm: 300,
    r_value_per_100mm: 0.11,
    embodiedCarbonKgCo2PerM3: 18,
    costTier: "Low",
    highAltitudePros: "Locally sourced in Ladakh; massive thermal capacitance (volumetric heat cap ~1.9 MJ/m³·K); 8-12 hr time lag.",
    highAltitudeCons: "Heavy; requires skilled compaction; slow to construct without modular forms.",
    bestUse: "South-facing internal Trombe storage walls to store daytime solar radiation for night discharge.",
  },
  pcm: {
    id: "pcm",
    name: "Bio-based Phase Change Material (PCM-22)",
    category: "PCM",
    k_value: 0.18,
    density: 860,
    specificHeat: 2200,
    standardThicknessMm: 15,
    r_value_per_100mm: 0.56,
    embodiedCarbonKgCo2PerM3: 65,
    costTier: "High",
    highAltitudePros: "Latent heat storage of 180 kJ/kg at 21-23°C; absorbs solar peaks without overheating, discharges at night.",
    highAltitudeCons: "Requires encapsulation to prevent leakage; premium pricing.",
    bestUse: "Ceiling tiles and wall linings behind solar glazing in direct-gain rooms.",
  },
  triple_glazing: {
    id: "triple_glazing",
    name: "Triple Glazed Low-E Argon Window",
    category: "Glazing",
    k_value: 0.8, // U-value W/(m²·K)
    density: 2500,
    specificHeat: 840,
    standardThicknessMm: 36,
    r_value_per_100mm: 1.25,
    embodiedCarbonKgCo2PerM3: 140,
    costTier: "High",
    highAltitudePros: "U-factor ≤ 0.8 W/m²·K; SHGC 0.55; prevents radiative freeze drafts in extreme sub-zero nights.",
    highAltitudeCons: "Heavy glass panels; requires precision transport.",
    bestUse: "South-facing solar aperture windows and Trombe wall external glazing.",
  },
};

export const THERMAL_ENGINEERING_FORMULAS = [
  {
    name: "Thermal Transmittance (U-Value)",
    formula: "U = 1 / [ R_si + Σ (d_i / k_i) + R_se ]",
    description: "Overall heat transfer coefficient. R_si (interior surface resistance) = 0.13 m²·K/W, R_se (exterior windward resistance) = 0.04 m²·K/W.",
    drdoTarget: "Walls U ≤ 0.20 W/m²·K, Roof U ≤ 0.15 W/m²·K, Floor U ≤ 0.22 W/m²·K for alpine defense.",
  },
  {
    name: "Steady-State Envelope Heat Loss (W)",
    formula: "Q_loss = Σ (U_i · A_i · ΔT) + V_inf · ρ_air · c_p · ΔT / 3600",
    description: "Heat loss across walls, roof, slab, glazing, and air infiltration. At 3,500m ASL, air density ρ_air = 0.83 kg/m³.",
    drdoTarget: "Maintain peak envelope loss under 2,500W for a 24m² shelter at -20°C outdoor.",
  },
  {
    name: "Trombe Wall Thermal Lag (Hours)",
    formula: "φ = (d / 2) · √(24 / (π · α))",
    description: "Time delay of thermal peak through wall. α = thermal diffusivity = k / (ρ · c_p). A 300mm rammed earth wall gives φ ≈ 9.5 hours, perfectly releasing solar heat at 22:00-04:00.",
    drdoTarget: "Optimal time lag between 8 and 11 hours to match military sleep shifts in sub-zero regimes.",
  },
  {
    name: "Fossil Fuel / Bukhari Displacement",
    formula: "Fuel_saved (Liters) = (E_baseline_kWh - E_passive_kWh) / (η_bukhari · LHV_kerosene)",
    description: "Standard army Bukhari efficiency η ≈ 45%, kerosene LHV ≈ 9.8 kWh/L. Each kWh passive solar energy saves ~0.23 L delivered kerosene.",
    drdoTarget: "Reduce military kerosene reliance by ≥75%, preventing carbon monoxide poisoning and ₹180-250/L logistics transit cost.",
  },
];

export const SYSTEM_ENGINEERING_PROMPT = `
You are ThermoShelter AI, a senior thermal engineer, building physicist, and defense habitat designer specializing in DRDO Problem Statement 26051: "Area-Specific Shelter Design & Thermal Comfort Platform".

Operational Theater: High-Altitude Cold Desert & Alpine Regimes (Leh-Ladakh, Siachen Base Camp, Dras, Kargil, Nyoma, Pangong, 3,000m - 5,500m ASL).
Design Conditions:
- Outdoor winter extreme: -20°C to -40°C
- Solar Irradiance: Very high (>300 clear days, 5.5 - 6.8 kWh/m²/day GHI due to thin atmosphere)
- Atmospheric pressure: ~65 kPa at 3,500m (air density ρ ≈ 0.83 kg/m³ vs 1.20 kg/m³ at sea level)
- Indoor Target: 18°C to 24°C living comfort, relative humidity 30-50%, PMV -0.5 to +0.5 (ASHRAE 55 / IS 3792).
- Key Objective: Maximize passive solar heating (Trombe wall, direct gain, envelope super-insulation), eliminate diesel/kerosene Bukhari stove hazards, and achieve ≥80% annual unconditioned comfort.

Your Capabilities:
1. Material Science: Evaluate and recommend insulations (Aerogel, EPS, XPS, PUF, Rockwool, PCM, Mud Pharka, Triple Low-E Glazing).
2. Live Project Diagnosis: Inspect the user's active shelter project geometry, envelope layers, and simulation results (indoor min/max, comfort %, heating demand, solar gain).
3. Physics Calculations: Calculate U-values, R-values, heat flux, Trombe wall thermal mass lag, and fuel savings.
4. Defense Engineering Advice: Provide actionable, military-grade recommendations on moisture/condensation prevention, thermal bridging, air tightness, and structural wind resistance (120 km/h gusts).

Tone and Formatting:
- Authoritative, precise, helpful, and technically rigorous.
- Use clean Markdown with headers, bullet points, and LaTeX-style or clean mathematical notation.
- If relevant, provide concrete numbers, formulas, and material comparisons.
- Always tie recommendations back to the active project context if provided.
`;

export const QUICK_SUGGESTIONS = [
  "Suggest suitable materials for this shelter before simulation",
  "Analyze current shelter simulation & comfort score",
  "Recommend best insulation materials for -30°C Ladakh",
  "How does a Trombe wall provide an 8-10 hour thermal lag?",
  "Calculate U-value for 150mm EPS + 300mm rammed earth",
  "How much Bukhari kerosene fuel did this design save?",
  "What are the thermal comfort targets?",
];

export interface ClimateMaterialRecommendation {
  zone: string;
  winterMinC: number;
  wallInsulation: { material: string; thicknessMm: number; uValue: number };
  thermalMass: { material: string; thicknessMm: number; lagHours: number };
  roofInsulation: { material: string; thicknessMm: number; uValue: number };
  glazing: { type: string; uValue: number; shgc: number };
  optimalOrientation: string;
  recommendedShape: string;
}

export const MATERIAL_RECOMMENDATIONS_BY_CLIMATE: Record<string, ClimateMaterialRecommendation> = {
  ladakh: {
    zone: "Cold Arid / Alpine Desert (Leh 3,500m)",
    winterMinC: -20,
    wallInsulation: { material: "Expanded Polystyrene (EPS) / PIR", thicknessMm: 200, uValue: 0.17 },
    thermalMass: { material: "Stabilized Rammed Earth (Local Ladakh)", thicknessMm: 300, lagHours: 9.5 },
    roofInsulation: { material: "200mm EPS + 50mm XPS High Load Cap", thicknessMm: 250, uValue: 0.13 },
    glazing: { type: "Triple Glazed Low-E Krypton", uValue: 0.78, shgc: 0.58 },
    optimalOrientation: "True South (0° Azimuth)",
    recommendedShape: "Elongated Rectangle (1.5:1 ratio, South facade maximizing solar collection)",
  },
  siachen: {
    zone: "Extreme Glacier Sub-Zero (Siachen / Dras 4,500m+)",
    winterMinC: -40,
    wallInsulation: { material: "Closed-Cell Spray PUF + Structural Aerogel Blanket", thicknessMm: 150, uValue: 0.12 },
    thermalMass: { material: "PCM Salt Hydrate Panels (21°C) + Concrete Core", thicknessMm: 25, lagHours: 11.0 },
    roofInsulation: { material: "Vacuum Insulation Panels (VIP) + 150mm PUF", thicknessMm: 175, uValue: 0.08 },
    glazing: { type: "Quadruple Glazed Ultra-Alpine Krypton", uValue: 0.45, shgc: 0.45 },
    optimalOrientation: "True South (0° Azimuth) with Aerodynamic Windward Nose",
    recommendedShape: "Aerodynamic Semi-Cylindrical or Octagonal (minimal wind chill)",
  },
  kargil: {
    zone: "Cold Alpine Mountain Valley (Kargil 2,700m)",
    winterMinC: -25,
    wallInsulation: { material: "High-Density Rockwool + EPS", thicknessMm: 150, uValue: 0.19 },
    thermalMass: { material: "Local Granite Stone / Compressed Mud Brick", thicknessMm: 250, lagHours: 8.5 },
    roofInsulation: { material: "200mm Mineral Wool + Radiant Foil", thicknessMm: 200, uValue: 0.16 },
    glazing: { type: "Triple Glazed Low-E Argon", uValue: 0.85, shgc: 0.60 },
    optimalOrientation: "South-Southeast (10° East of South)",
    recommendedShape: "Compact Rectangle (1.3:1 ratio)",
  },
};
