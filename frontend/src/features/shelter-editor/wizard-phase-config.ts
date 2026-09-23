import {
  FolderKanban,
  MapPin,
  Box,
  Layers,
  Home,
  Grid,
  Square,
  DoorOpen,
  Mountain,
  Wind,
  Users,
  Target,
  Cpu,
} from "lucide-react";
import type { ElementType } from "react";

export interface WizardStepConfig {
  id: number;
  name: string;
  description: string;
  icon: ElementType;
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  { id: 1, name: "Geometry", description: "Dimensions & Roof Pitch", icon: Box },
  { id: 2, name: "Walls", description: "Multi-Layer Assemblies", icon: Layers },
  { id: 3, name: "Roof", description: "Pitch, Eaves & Insulation", icon: Home },
  { id: 4, name: "Floor", description: "Foundation Slab & Permafrost", icon: Grid },
  { id: 5, name: "Windows & Doors", description: "Glazing Apertures & Ingress", icon: Square },
  { id: 6, name: "Thermal Mass", description: "Sensible Flywheel Storage", icon: Mountain },
  { id: 7, name: "Ventilation & Loads", description: "ACH, HRV & Occupancy Gains", icon: Wind },
  { id: 8, name: "Design Targets", description: "Thermal Comfort Bands", icon: Target },
  { id: 9, name: "Simulation", description: "ThermoShelter Solver", icon: Cpu },
];

export interface WizardPhase {
  id: number;
  name: string;
  badge: string;
  description: string;
  steps: number[];
  stepNames: string[];
}

export const WIZARD_PHASES: WizardPhase[] = [
  {
    id: 1,
    name: "Building Envelope",
    badge: "Phase 1",
    description: "Massing dimensions, multi-layer walls, insulated roof & foundation slab",
    steps: [1, 2, 3, 4],
    stepNames: ["Dimensions", "Wall Layers", "Roof & Eaves", "Ground Slab"],
  },
  {
    id: 2,
    name: "Apertures & Solar",
    badge: "Phase 2",
    description: "Passive solar glazing apertures, airtight doors & thermal flywheel storage",
    steps: [5, 6],
    stepNames: ["Windows & Doors", "Thermal Storage"],
  },
  {
    id: 3,
    name: "Indoor Climate",
    badge: "Phase 3",
    description: "Fresh air ventilation, HRV heat recovery & internal occupant gains",
    steps: [7],
    stepNames: ["Ventilation & Internal Gains"],
  },
  {
    id: 4,
    name: "Simulation",
    badge: "Phase 4",
    description: "Comfort performance boundaries & ThermoShelter physics engine run",
    steps: [8, 9],
    stepNames: ["Comfort Targets", "Launch Solver"],
  },
];
