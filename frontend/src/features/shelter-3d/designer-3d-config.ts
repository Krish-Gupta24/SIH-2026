import {
  Box as BoxIcon,
  Layers,
  Home,
  Grid,
  Square,
  Mountain,
  Wind,
  Target,
  Sparkles,
} from "lucide-react";
import type { ElementType } from "react";

export interface StepItem {
  id: number; // 1-indexed (1 to 9)
  index: number; // 0-indexed (0 to 8)
  name: string;
  shortName: string;
  description: string;
  icon: ElementType;
  phaseId: string;
}

export const DESIGNER_9_STEPS: StepItem[] = [
  { id: 1, index: 0, name: "Geometry", shortName: "Geometry", description: "Dimensions & Roof Pitch", icon: BoxIcon, phaseId: "envelope" },
  { id: 2, index: 1, name: "Walls", shortName: "Walls", description: "Multi-Layer Assemblies & U-Values", icon: Layers, phaseId: "envelope" },
  { id: 3, index: 2, name: "Roof", shortName: "Roof", description: "Pitch, Eaves & Insulation", icon: Home, phaseId: "envelope" },
  { id: 4, index: 3, name: "Floor", shortName: "Floor", description: "Foundation Slab & Permafrost", icon: Grid, phaseId: "envelope" },
  { id: 5, index: 4, name: "Windows & Doors", shortName: "Apertures", description: "Glazing Apertures, Ingress & Shading", icon: Square, phaseId: "apertures" },
  { id: 6, index: 5, name: "Thermal Mass", shortName: "Mass", description: "Sensible Flywheel Storage", icon: Mountain, phaseId: "apertures" },
  { id: 7, index: 6, name: "Ventilation & Loads", shortName: "Climate", description: "ACH, HRV & Occupancy Gains", icon: Wind, phaseId: "climate" },
  { id: 8, index: 7, name: "Design Targets", shortName: "Targets", description: "Thermal Comfort Bands", icon: Target, phaseId: "performance" },
  { id: 9, index: 8, name: "Simulation", shortName: "Simulation", description: "ThermoShelter Physics Solver", icon: Sparkles, phaseId: "performance" },
];

export const DESIGNER_13_STEPS = DESIGNER_9_STEPS;

export interface Workflow3DPhase {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  stepIndices: number[];
}

export const WORKFLOW_PHASES: Workflow3DPhase[] = [
  {
    id: "envelope",
    name: "Building Envelope",
    shortName: "Envelope",
    icon: "🏗️",
    description: "Massing, multi-layer walls, roof & foundation",
    stepIndices: [0, 1, 2, 3],
  },
  {
    id: "apertures",
    name: "Apertures & Solar",
    shortName: "Apertures",
    icon: "🪟",
    description: "Passive solar glazing, airtight doors & thermal mass",
    stepIndices: [4, 5],
  },
  {
    id: "climate",
    name: "Indoor Climate",
    shortName: "Climate",
    icon: "💨",
    description: "Fresh air ventilation, HRV & occupant heat gains",
    stepIndices: [6],
  },
  {
    id: "performance",
    name: "Simulation & Targets",
    shortName: "Targets",
    icon: "🎯",
    description: "Thermal targets & ThermoShelter solver validation",
    stepIndices: [7, 8],
  },
];
