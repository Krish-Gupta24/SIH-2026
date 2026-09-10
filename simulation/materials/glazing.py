"""Canonical Glazing and Window System Database.

Establishes single source of truth for:
- Window glazing systems (Single Clear, Double Low-E Argon, Triple Low-E Krypton)
- Window frame systems (Aluminum with Thermal Break, UPVC Insulated, High-Performance Wood)
- Thermophysical properties (U-value, SHGC, Visible Transmittance, Frame Conductance)
- Costing metrics ($/m²)
- Engineering provenance and verified standards citations (ASHRAE 90.1, NFRC 100, EN 673, ISO 10077)

Consumed by:
- EnergyPlus IDF generator (WindowMaterial:SimpleGlazingSystem & WindowProperty:FrameAndDivider)
- ParameterSweepOptimizer
- RecommendationEngine
- EngineeringReportCompiler
- Frontend UI / API
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
from simulation.materials.material import MaterialStatus


@dataclass(frozen=True)
class GlazingDefinition:
    """Canonical thermophysical definition of a window glazing system."""
    id: str
    name: str
    u_value: float                 # Overall glazing U-factor [W/(m²·K)]
    shgc: float                    # Solar Heat Gain Coefficient [0.0 - 1.0]
    visible_transmittance: float   # Visible Transmittance (VT) [0.0 - 1.0]
    cost_per_m2: float             # Capital cost per aperture area [USD / m²]
    source: str                    # Standard or test certification
    provenance: str                # Assembly specification
    status: MaterialStatus         # VERIFIED, USER_DEFINED, or TEST_ONLY
    notes: str


@dataclass(frozen=True)
class FrameDefinition:
    """Canonical thermophysical definition of an insulated window frame."""
    id: str
    name: str
    u_value: float                 # Frame thermal transmittance [W/(m²·K)]
    width_m: float                 # Frame projected width [m]
    source: str
    notes: str


class GlazingDatabase:
    """Singleton repository of verified glazing and frame assemblies."""

    def __init__(self):
        self._glazing: Dict[str, GlazingDefinition] = {}
        self._frames: Dict[str, FrameDefinition] = {}
        self._aliases: Dict[str, str] = {}
        self._load_canonical_assemblies()

    def _load_canonical_assemblies(self):
        """Seed verified engineering window assemblies."""
        assemblies = [
            GlazingDefinition(
                id="Single_Clear",
                name="Single Glazed Clear Float Glass (6mm)",
                u_value=5.80,
                shgc=0.81,
                visible_transmittance=0.88,
                cost_per_m2=50.0,
                source="ASHRAE Handbook Fundamentals 2021 (Ch. 15, Table 4) / NFRC 100",
                provenance="Standard 6mm monolithic clear float glass",
                status=MaterialStatus.VERIFIED,
                notes="High conductance baseline. Unsuitable for extreme sub-zero Himalayan climates.",
            ),
            GlazingDefinition(
                id="Double_LowE_Argon",
                name="Double Glazed Low-E with Argon Fill (4-16Ar-4)",
                u_value=1.40,
                shgc=0.40,
                visible_transmittance=0.65,
                cost_per_m2=140.0,
                source="ASHRAE Handbook Fundamentals 2021 / EN 673 / NFRC 100",
                provenance="4mm Low-E (surface 3) + 16mm 90% Argon gas gap + 4mm clear float",
                status=MaterialStatus.VERIFIED,
                notes="High-performance thermal barrier suitable for cold climates with moderate solar gain.",
            ),
            GlazingDefinition(
                id="Triple_LowE_Krypton",
                name="Triple Glazed Dual Low-E with Krypton Fill (4-12Kr-4-12Kr-4)",
                u_value=0.80,
                shgc=0.35,
                visible_transmittance=0.55,
                cost_per_m2=220.0,
                source="Passive House Institute Certified Component / ISO 10077-1",
                provenance="4mm Low-E (surf 2) + 12mm Krypton + 4mm clear + 12mm Krypton + 4mm Low-E (surf 5)",
                status=MaterialStatus.VERIFIED,
                notes="Ultra-low heat loss assembly optimized for sub-zero alpine Ladakh shelters.",
            ),
        ]

        for g in assemblies:
            self._glazing[g.id] = g

        # Register common aliases
        self._aliases = {
            "single": "Single_Clear",
            "single_clear": "Single_Clear",
            "singleclear": "Single_Clear",
            "double": "Double_LowE_Argon",
            "double_lowe_argon": "Double_LowE_Argon",
            "doubleloweargon": "Double_LowE_Argon",
            "double_low_e": "Double_LowE_Argon",
            "triple": "Triple_LowE_Krypton",
            "triple_lowe_krypton": "Triple_LowE_Krypton",
            "triplelowekrypton": "Triple_LowE_Krypton",
            "triple_low_e": "Triple_LowE_Krypton",
        }

        frames = [
            FrameDefinition(
                id="Aluminum_ThermalBreak",
                name="Thermally-Broken Aluminum Frame",
                u_value=3.20,
                width_m=0.05,
                source="AAMA/WDMA/CSA 101/I.S.2/A440",
                notes="Extruded aluminum with polyamide thermal strut isolation.",
            ),
            FrameDefinition(
                id="UPVC_Insulated",
                name="Multi-Chamber Insulated UPVC Frame",
                u_value=1.30,
                width_m=0.06,
                source="EN 12608 / ISO 10077-2",
                notes="5-chamber UPVC profile with EPS thermal inserts.",
            ),
            FrameDefinition(
                id="Wood_HighPerformance",
                name="Triple-Laminated Timber Frame (Himalayan Pine/Larch)",
                u_value=1.10,
                width_m=0.07,
                source="DIN EN 10077-2 / Passive House standard",
                notes="Locally sustainably harvested structural timber frame with cork insulation layer.",
            ),
        ]

        for f in frames:
            self._frames[f.id] = f

    def get_glazing(self, key_or_id: str) -> GlazingDefinition:
        """Resolve a glazing system by ID or alias, raising ValueError if unrecognized."""
        if not key_or_id:
            return self._glazing["Double_LowE_Argon"]
        sanitized = str(key_or_id).strip()
        if sanitized in self._glazing:
            return self._glazing[sanitized]
        norm = sanitized.lower().replace("-", "_").replace(" ", "_")
        if norm in self._aliases:
            return self._glazing[self._aliases[norm]]
        if "triple" in norm:
            return self._glazing["Triple_LowE_Krypton"]
        if "double" in norm:
            return self._glazing["Double_LowE_Argon"]
        if "single" in norm:
            return self._glazing["Single_Clear"]
        for k, v in self._glazing.items():
            if norm in k.lower():
                return v
        raise ValueError(
            f"Unrecognized glazing system '{key_or_id}'. "
            f"Available canonical assemblies: {list(self._glazing.keys())}"
        )

    def get_frame(self, key_or_id: Optional[str]) -> Optional[FrameDefinition]:
        """Resolve a window frame specification if provided."""
        if not key_or_id:
            return None
        sanitized = str(key_or_id).strip()
        if sanitized in self._frames:
            return self._frames[sanitized]
        norm = sanitized.lower().replace("-", "_").replace(" ", "_")
        for k, v in self._frames.items():
            if norm in k.lower():
                return v
        return None

    def list_glazing(self) -> List[GlazingDefinition]:
        """List all canonical glazing systems."""
        return list(self._glazing.values())

    def list_frames(self) -> List[FrameDefinition]:
        """List all canonical frame types."""
        return list(self._frames.values())


# Singleton instance for universal import
glazing_db = GlazingDatabase()
