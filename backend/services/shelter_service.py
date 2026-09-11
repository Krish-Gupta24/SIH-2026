"""
Shelter Service for Canonical ShelterModel persistence and CRUD management.
Saves shelter definitions to storage/shelters/ and provides fast in-memory access.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

SHELTERS_DIR = Path("storage/shelters")


CANONICAL_SHELTERS: List[Dict[str, Any]] = [
    {
        "id": "shelter-ladakh-01",
        "name": "Ladakh High-Altitude Outpost Shelter",
        "description": "Cold-climate high-altitude insulated shelter designed for extreme temperature swings in Leh, Ladakh.",
        "tags": ["High-Altitude", "Extreme-Cold", "Passive-Solar", "Rammed-Earth"],
        "version": "1.0.0",
        "project": {
            "id": "shelter-ladakh-01",
            "name": "Ladakh High-Altitude Outpost Shelter",
            "description": "Cold-climate high-altitude insulated shelter designed for extreme temperature swings in Leh, Ladakh.",
            "tags": ["High-Altitude", "Extreme-Cold", "Passive-Solar", "Rammed-Earth"],
            "version": "1.0.0",
        },
        "location": {
            "latitude": 34.1526,
            "longitude": 77.5771,
            "elevation": 3500.0,
            "region": "Leh Ladakh, India",
            "climateZone": "Cold / Extreme Alpine",
            "weatherSource": "IND_JK_Leh.427053_TMYx.epw",
            "designTempWinter": -20.0,
            "designTempSummer": 28.0,
        },
        "geometry": {
            "shape": "Rectangle",
            "length": 6.0,
            "width": 4.0,
            "height": 3.0,
            "orientation": 0.0,
            "roofType": "Flat",
            "roofAngle": 0.0,
            "floorElevation": 0.3,
            "floorArea": 24.0,
            "volume": 72.0,
        },
        "envelope": {
            "walls": {
                "north": {
                    "id": "const-north-insulated-rammed-earth",
                    "name": "North Insulated Rammed Earth Wall",
                    "layers": [
                        {"materialId": "mat-eps-insulation", "thickness": 0.15},
                        {"materialId": "mat-rammed-earth", "thickness": 0.30},
                    ],
                },
                "south": {
                    "id": "const-south-insulated-rammed-earth",
                    "name": "South Passive Solar Absorbing Wall",
                    "layers": [
                        {"materialId": "mat-eps-insulation", "thickness": 0.15},
                        {"materialId": "mat-rammed-earth", "thickness": 0.30},
                    ],
                },
                "east": {
                    "id": "const-east-insulated-rammed-earth",
                    "name": "East Thermal Barrier Wall",
                    "layers": [
                        {"materialId": "mat-eps-insulation", "thickness": 0.15},
                        {"materialId": "mat-rammed-earth", "thickness": 0.30},
                    ],
                },
                "west": {
                    "id": "const-west-insulated-rammed-earth",
                    "name": "West Windbreak Insulated Wall",
                    "layers": [
                        {"materialId": "mat-eps-insulation", "thickness": 0.15},
                        {"materialId": "mat-rammed-earth", "thickness": 0.30},
                    ],
                },
            },
            "roof": {
                "id": "const-insulated-deck-roof",
                "name": "Insulated High-Snow Load Roof Assembly",
                "layers": [
                    {"materialId": "mat-roof-decking", "thickness": 0.02},
                    {"materialId": "mat-eps-insulation", "thickness": 0.20},
                    {"materialId": "mat-roof-cgi-sheet", "thickness": 0.005},
                ],
            },
            "floor": {
                "id": "const-perimeter-insulated-slab",
                "name": "Perimeter-Insulated Ground Contact Slab",
                "layers": [
                    {"materialId": "mat-concrete-slab", "thickness": 0.15},
                    {"materialId": "mat-eps-insulation", "thickness": 0.10},
                ],
            },
        },
        "windows": [
            {
                "id": "win-south-01",
                "wall": "south",
                "width": 1.5,
                "height": 1.2,
                "sillHeight": 0.9,
                "positionX": 1.0,
                "glazingType": "Double_LowE_Argon",
                "frameType": "UPVC_Insulated",
                "shadingOverhang": 0.3,
            },
            {
                "id": "win-south-02",
                "wall": "south",
                "width": 1.5,
                "height": 1.2,
                "sillHeight": 0.9,
                "positionX": 3.5,
                "glazingType": "Double_LowE_Argon",
                "frameType": "UPVC_Insulated",
                "shadingOverhang": 0.3,
            },
        ],
        "doors": [
            {
                "id": "door-east-01",
                "wall": "east",
                "width": 0.9,
                "height": 2.1,
                "positionX": 1.5,
                "type": "Insulated Air-Lock Vestibule Door",
            }
        ],
        "thermalMass": {
            "internalFloors": 0.0,
            "interiorPartitions": 18.0,
            "massMaterial": "Rammed Earth Stabilized Block",
            "effectiveThickness": 0.2,
        },
        "ventilation": {
            "infiltrationACH": 0.35,
            "mechanicalVentilation": False,
            "heatRecoveryEfficiency": 0.0,
        },
        "occupancy": {
            "peopleCount": 4,
            "activityLevel": "Moderate",
            "heatGainWattsPerPerson": 115.0,
            "schedule": "24/7 Outpost Presence",
        },
        "designTargets": {
            "comfortTempMinC": 18.0,
            "comfortTempMaxC": 24.0,
            "targetIndoorTempC": 21.0,
            "targetComfortPercent": 85.0,
            "maxAnnualHeatingDemandKwhM2": 95.0,
        },
        "simulationSettings": {
            "engine": "EnergyPlus",
            "timestepsPerHour": 4,
            "runPeriodDays": 3,
            "detailedComponentOutputs": True,
        },
    },
    {
        "id": "shelter-kargil-02",
        "name": "Kargil High-Thermal Mass Bunkhouse",
        "description": "Multi-occupant military shelter in Kargil utilizing local granite thermal mass and rockwool batt insulation.",
        "tags": ["Kargil", "Granite", "High-Thermal-Mass", "Rockwool"],
        "version": "1.0.0",
        "project": {
            "id": "shelter-kargil-02",
            "name": "Kargil High-Thermal Mass Bunkhouse",
            "description": "Multi-occupant military shelter in Kargil utilizing local granite thermal mass and rockwool batt insulation.",
            "tags": ["Kargil", "Granite", "High-Thermal-Mass", "Rockwool"],
            "version": "1.0.0",
        },
        "location": {
            "latitude": 34.5539,
            "longitude": 76.1349,
            "elevation": 2676.0,
            "region": "Kargil, Ladakh, India",
            "climateZone": "Extreme Cold Continental",
            "weatherSource": "IND_JK_Leh.427053_TMYx.epw",
            "designTempWinter": -24.0,
            "designTempSummer": 29.0,
        },
        "geometry": {
            "shape": "Rectangle",
            "length": 5.5,
            "width": 3.5,
            "height": 2.8,
            "orientation": 0.0,
            "roofType": "Flat",
            "roofAngle": 0.0,
            "floorElevation": 0.2,
            "floorArea": 19.25,
            "volume": 53.9,
        },
        "envelope": {
            "walls": {
                "north": {
                    "id": "const-north-granite-rockwool",
                    "name": "North Granite Rockwool Wall",
                    "layers": [
                        {"materialId": "mat-rockwool-batt", "thickness": 0.12},
                        {"materialId": "mat-stone-granite", "thickness": 0.35},
                    ],
                },
                "south": {
                    "id": "const-south-granite-rockwool",
                    "name": "South Solar Mass Wall",
                    "layers": [
                        {"materialId": "mat-rockwool-batt", "thickness": 0.12},
                        {"materialId": "mat-stone-granite", "thickness": 0.35},
                    ],
                },
                "east": {
                    "id": "const-east-granite-rockwool",
                    "name": "East Granite Wall",
                    "layers": [
                        {"materialId": "mat-rockwool-batt", "thickness": 0.12},
                        {"materialId": "mat-stone-granite", "thickness": 0.35},
                    ],
                },
                "west": {
                    "id": "const-west-granite-rockwool",
                    "name": "West Windbreak Wall",
                    "layers": [
                        {"materialId": "mat-rockwool-batt", "thickness": 0.12},
                        {"materialId": "mat-stone-granite", "thickness": 0.35},
                    ],
                },
            },
            "roof": {
                "id": "const-insulated-metal-roof",
                "name": "Insulated Metal Roof",
                "layers": [
                    {"materialId": "mat-roof-decking", "thickness": 0.02},
                    {"materialId": "mat-eps-insulation", "thickness": 0.18},
                ],
            },
            "floor": {
                "id": "const-slab-on-grade",
                "name": "Concrete Slab with EPS Underlay",
                "layers": [
                    {"materialId": "mat-concrete-slab", "thickness": 0.12},
                    {"materialId": "mat-eps-insulation", "thickness": 0.08},
                ],
            },
        },
        "windows": [
            {
                "id": "win-south-kargil-01",
                "wall": "south",
                "width": 1.8,
                "height": 1.2,
                "sillHeight": 0.9,
                "positionX": 1.5,
                "glazingType": "Triple_LowE_Krypton",
                "frameType": "UPVC_Insulated",
                "shadingOverhang": 0.25,
            }
        ],
        "doors": [
            {
                "id": "door-east-kargil-01",
                "wall": "east",
                "width": 0.9,
                "height": 2.0,
                "positionX": 1.2,
                "type": "Insulated Weather-Stripped Door",
            }
        ],
        "thermalMass": {
            "internalFloors": 0.0,
            "interiorPartitions": 14.0,
            "massMaterial": "Local Granite Stone",
            "effectiveThickness": 0.25,
        },
        "ventilation": {
            "infiltrationACH": 0.28,
            "mechanicalVentilation": False,
            "heatRecoveryEfficiency": 0.0,
        },
        "occupancy": {
            "peopleCount": 6,
            "activityLevel": "Sleeping / Rest",
            "heatGainWattsPerPerson": 80.0,
            "schedule": "Night Guard Shift & Crew Quarters",
        },
        "designTargets": {
            "comfortTempMinC": 17.0,
            "comfortTempMaxC": 23.0,
            "targetIndoorTempC": 20.0,
            "targetComfortPercent": 80.0,
            "maxAnnualHeatingDemandKwhM2": 110.0,
        },
        "simulationSettings": {
            "engine": "EnergyPlus",
            "timestepsPerHour": 4,
            "runPeriodDays": 3,
            "detailedComponentOutputs": True,
        },
    },
]


class ShelterService:
    """Manages Canonical ShelterModel persistence and CRUD operations."""

    def __init__(self):
        self._shelters: Dict[str, Dict[str, Any]] = {}
        self._init_storage()

    def _init_storage(self):
        """Create storage directory and load existing or canonical models."""
        SHELTERS_DIR.mkdir(parents=True, exist_ok=True)

        # 1. Seed canonical models if missing from disk
        for cs in CANONICAL_SHELTERS:
            sid = cs["id"]
            fp = SHELTERS_DIR / f"{sid}.json"
            if not fp.is_file():
                with open(fp, "w", encoding="utf-8") as f:
                    json.dump(cs, f, indent=2)

        # 2. Load all models from storage directory
        for fp in SHELTERS_DIR.glob("*.json"):
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    sid = data.get("id") or fp.stem
                    data["id"] = sid
                    self._shelters[sid] = data
            except Exception as e:
                logger.error(f"Error loading shelter model from {fp}: {e}")

    def list_shelters(self) -> List[Dict[str, Any]]:
        """Return all persisted shelter models."""
        return list(self._shelters.values())

    def get_shelter(self, shelter_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single shelter by ID."""
        return self._shelters.get(shelter_id)

    def save_shelter(self, shelter_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save or update a shelter model to disk and memory."""
        sid = shelter_data.get("id") or f"shelter-{len(self._shelters) + 1:02d}"
        shelter_data["id"] = sid
        self._shelters[sid] = shelter_data

        fp = SHELTERS_DIR / f"{sid}.json"
        try:
            with open(fp, "w", encoding="utf-8") as f:
                json.dump(shelter_data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist shelter {sid} to disk: {e}")

        return shelter_data

    def delete_shelter(self, shelter_id: str) -> bool:
        """Delete a shelter model by ID."""
        if shelter_id in self._shelters:
            del self._shelters[shelter_id]
            fp = SHELTERS_DIR / f"{shelter_id}.json"
            if fp.is_file():
                fp.unlink()
            return True
        return False


# Singleton instance
shelter_service = ShelterService()
