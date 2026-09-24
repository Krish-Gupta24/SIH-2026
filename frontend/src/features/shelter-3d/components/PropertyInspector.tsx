"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Compass,
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
  MapPin,
  Box,
  Sliders,
  Play,
  CheckCircle2,
  Sun,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import type {
  ShelterModel,
  WindowModel,
  DoorModel,
  LayerModel,
  AssemblyModel,
  RoofSolarPanelsConfig,
  WindowSolarPaneConfig,
} from "@/types/shelter";
import type { SelectedElement, WallOrientation } from "../types";
import {
  findNextAvailableOpeningPosition,
  clampOpeningPlacement,
  alignToStandardHeader,
  distributeOpeningsEvenly,
} from "../geometry-math";

interface Props {
  model: ShelterModel;
  selected: SelectedElement;
  currentStep?: number; // 0-indexed (0 to 12)
  onSelect: (value: SelectedElement) => void;
  onUpdate: (updates: Partial<ShelterModel>) => void;
  onSimulate?: () => void;
  onOpenMaterials?: () => void;
}

function NumberField({
  label,
  value,
  unit,
  min = 0,
  max = 100,
  step = 0.1,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="cad-field">
      <span>
        {label}
        <small>{unit}</small>
      </span>
      <input
        aria-label={label}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function SectionTitle({
  eyebrow,
  title,
  onClose,
}: {
  eyebrow: string;
  title: string;
  onClose?: () => void;
}) {
  return (
    <div className="cad-inspector-title">
      <div>
        <span>{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      {onClose && (
        <button aria-label="Close inspector selection" onClick={onClose}>
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function RoofSolarPanelsEditor({
  model,
  onUpdate,
}: {
  model: ShelterModel;
  onUpdate: (updates: Partial<ShelterModel>) => void;
}) {
  const solar = model.envelope?.roof?.solarPanels;
  const isEnabled = solar?.enabled === true;
  const count = solar?.panelCount ?? 6;
  const wattage = solar?.panelWattageW ?? 400;
  const tilt = solar?.tiltAngleDeg ?? 30;
  const efficiency = solar?.panelEfficiencyPct ?? 21.5;
  const mounting = solar?.mountingType ?? "UnistrutElevated";
  const totalKw = ((count * wattage) / 1000).toFixed(2);
  const totalArea = (count * 1.95).toFixed(1);

  const updateSolar = (patch: Partial<RoofSolarPanelsConfig>) => {
    onUpdate({
      envelope: {
        ...model.envelope,
        roof: {
          ...model.envelope.roof,
          solarPanels: {
            enabled: isEnabled,
            panelCount: count,
            panelWattageW: wattage,
            panelEfficiencyPct: efficiency,
            tiltAngleDeg: tilt,
            mountingType: mounting,
            ...patch,
          },
        },
      },
    });
  };

  return (
    <div className={`mt-3 rounded-xl border p-3 transition-all ${
      isEnabled
        ? "border-amber-500/60 bg-amber-500/10"
        : "border-slate-800 bg-slate-900/60"
    }`}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <Sun className="size-4 text-amber-400" />
            Rooftop Solar PV Option
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isEnabled
              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
              : "bg-slate-800 text-slate-400 border border-slate-700"
          }`}>
            {isEnabled ? "● Active Solar" : "Disabled (Passive)"}
          </span>
        </div>

        {/* 2-Way High-Visibility Segmented Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-950/80 p-1 border border-slate-700/80">
          <button
            type="button"
            onClick={() => updateSolar({ enabled: true })}
            className={`flex items-center justify-center gap-1.5 rounded py-1.5 text-xs font-bold transition ${
              isEnabled
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="size-3.5" />
            <span>Installed (Active)</span>
          </button>
          <button
            type="button"
            onClick={() => updateSolar({ enabled: false })}
            className={`rounded py-1.5 text-xs font-bold transition ${
              !isEnabled
                ? "bg-slate-700 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Disabled (No PV)</span>
          </button>
        </div>
      </div>

      {isEnabled && (
        <div className="mt-3 space-y-2.5 border-t border-amber-500/20 pt-2.5">
          <div className="cad-field-grid">
            <label className="cad-field">
              <span>Panel Count <small>pcs</small></span>
              <input
                type="number"
                min={1}
                max={48}
                value={count}
                onChange={(e) => updateSolar({ panelCount: Math.max(1, Number(e.target.value) || 1) })}
              />
            </label>
            <label className="cad-field">
              <span>Module Power <small>Wp</small></span>
              <input
                type="number"
                min={100}
                max={750}
                step={25}
                value={wattage}
                onChange={(e) => updateSolar({ panelWattageW: Math.max(100, Number(e.target.value) || 400) })}
              />
            </label>
          </div>

          {/* Interactive Tilt Angle Slider with Real-Time Degrees Display */}
          <div className="cad-field">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Racking Tilt Angle</span>
              <strong className="text-amber-400 font-bold">{tilt}° from horizon</strong>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="range"
                min={0}
                max={75}
                step={1}
                value={tilt}
                onChange={(e) => updateSolar({ tiltAngleDeg: Number(e.target.value) })}
                className="h-1.5 w-full accent-amber-500 cursor-pointer bg-slate-800 rounded"
              />
              <input
                type="number"
                min={0}
                max={85}
                value={tilt}
                onChange={(e) => updateSolar({ tiltAngleDeg: Math.max(0, Math.min(85, Number(e.target.value) || 30)) })}
                className="w-14 px-1 py-0.5 text-center text-xs bg-slate-800 rounded border border-slate-700 text-white font-bold"
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
              <button type="button" onClick={() => updateSolar({ tiltAngleDeg: 15 })} className="hover:text-amber-400">15°</button>
              <button type="button" onClick={() => updateSolar({ tiltAngleDeg: 30 })} className="hover:text-amber-400 font-bold text-amber-500">30° (Std)</button>
              <button type="button" onClick={() => updateSolar({ tiltAngleDeg: 45 })} className="hover:text-amber-400">45° (Winter)</button>
              <button type="button" onClick={() => updateSolar({ tiltAngleDeg: 60 })} className="hover:text-amber-400">60° (Snow)</button>
            </div>
          </div>

          <label className="cad-field">
            <span>Mounting Frame System</span>
            <select
              value={mounting}
              onChange={(e) => updateSolar({ mountingType: e.target.value as any })}
            >
              <option value="UnistrutElevated">Elevated Unistrut Frame (Snow Clearance)</option>
              <option value="FlushMount">Flush Seam-Clamped to Roof</option>
              <option value="BallastedRacking">Heavy Ballasted Non-Penetrating</option>
            </select>
          </label>

          <div className="cad-property-summary">
            <span>{totalKw} kWp Peak Array</span>
            <span>{totalArea} m² Active Collector</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WindowSolarPaneEditor({
  windowItem,
  onUpdateWindow,
}: {
  windowItem: WindowModel;
  onUpdateWindow: (patch: Partial<WindowModel>) => void;
}) {
  const pane = windowItem.solarPane;
  const isEnabled = pane?.enabled === true;
  const wArea = ((windowItem.width || 1.4) * (windowItem.height || 1.2)).toFixed(2);
  const peakW = (Number(wArea) * (pane?.powerDensityWpM2 ?? 90)).toFixed(1);

  const updatePane = (patch: Partial<WindowSolarPaneConfig>) => {
    onUpdateWindow({
      solarPane: {
        enabled: isEnabled,
        transparencyPct: pane?.transparencyPct ?? 30,
        powerDensityWpM2: pane?.powerDensityWpM2 ?? 90,
        efficiencyPct: pane?.efficiencyPct ?? 12.5,
        shgc: pane?.shgc ?? 0.35,
        uValue: pane?.uValue ?? 1.20,
        ...patch,
      },
    });
  };

  return (
    <div className={`mt-3 rounded-xl border p-3 transition-all ${
      isEnabled
        ? "border-sky-500/60 bg-sky-500/10"
        : "border-slate-800 bg-slate-900/60"
    }`}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
            <Zap className="size-4 text-sky-400" />
            BIPV Photovoltaic Glazing
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isEnabled
              ? "bg-sky-950 text-sky-300 border border-sky-500/40"
              : "bg-slate-800 text-slate-400 border border-slate-700"
          }`}>
            {isEnabled ? "● BIPV Active" : "Standard Glass"}
          </span>
        </div>

        {/* 2-Way High-Visibility Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-950/80 p-1 border border-slate-700/80">
          <button
            type="button"
            onClick={() => updatePane({ enabled: false })}
            className={`rounded py-1.5 text-xs font-bold transition ${
              !isEnabled
                ? "bg-slate-700 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Standard Glass</span>
          </button>
          <button
            type="button"
            onClick={() => updatePane({ enabled: true })}
            className={`flex items-center justify-center gap-1.5 rounded py-1.5 text-xs font-bold transition ${
              isEnabled
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="size-3.5" />
            <span>BIPV Solar Pane</span>
          </button>
        </div>
      </div>

      {isEnabled && (
        <div className="mt-2 space-y-2">
          <div className="cad-field-grid">
            <label className="cad-field">
              <span>VLT Transmittance <small>%</small></span>
              <input
                type="number"
                min={5}
                max={80}
                step={5}
                value={pane.transparencyPct ?? 30}
                onChange={(e) => updatePane({ transparencyPct: Number(e.target.value) || 30 })}
              />
            </label>
            <label className="cad-field">
              <span>Power Density <small>Wp/m²</small></span>
              <input
                type="number"
                min={20}
                max={250}
                step={5}
                value={pane.powerDensityWpM2 ?? 90}
                onChange={(e) => updatePane({ powerDensityWpM2: Number(e.target.value) || 90 })}
              />
            </label>
          </div>
          <div className="cad-field-grid">
            <label className="cad-field">
              <span>Cell Efficiency <small>%</small></span>
              <input
                type="number"
                min={5}
                max={25}
                step={0.5}
                value={pane.efficiencyPct ?? 12.5}
                onChange={(e) => updatePane({ efficiencyPct: Number(e.target.value) || 12.5 })}
              />
            </label>
            <label className="cad-field">
              <span>SHGC Coating</span>
              <input
                type="number"
                min={0.15}
                max={0.80}
                step={0.02}
                value={pane.shgc ?? 0.35}
                onChange={(e) => updatePane({ shgc: Number(e.target.value) || 0.35 })}
              />
            </label>
          </div>
          <div className="cad-property-summary">
            <span>{wArea} m² Glass</span>
            <span className="text-sky-400 font-semibold">{peakW} Wp Generation</span>
          </div>
        </div>
      )}
    </div>
  );
}

const AVAILABLE_MATERIALS = [
  { id: "mat-aerogel-blanket", name: "Aerogel Blanket", category: "Super-Insulation", conductivity: 0.015, tag: "Ultra-High R" },
  { id: "mat-eps-insulation", name: "Rigid EPS Insulation", category: "Continuous Insulation", conductivity: 0.036, tag: "Standard High-R" },
  { id: "mat-xps-insulation", name: "Extruded XPS Insulation", category: "Sub-Slab & Moisture", conductivity: 0.029, tag: "Permafrost Rated" },
  { id: "mat-rammed-earth", name: "Stabilized Rammed Earth", category: "Heavy Thermal Mass", conductivity: 1.25, tag: "High Thermal Inertia" },
  { id: "mat-stone-masonry", name: "Local Granite Stone", category: "Structural Mass", conductivity: 2.20, tag: "Native Mass" },
  { id: "mat-timber-deck", name: "Pine Timber Decking", category: "Bio-Based Finish", conductivity: 0.13, tag: "Warm Wood" },
  { id: "mat-concrete-slab", name: "Heavy Reinforced Concrete", category: "Foundation Core", conductivity: 1.70, tag: "Structural Mass" },
  { id: "mat-galvanized-steel", name: "Galvanized Steel Cladding", category: "Exterior Weather Layer", conductivity: 50.0, tag: "Weather Shield" },
  { id: "mat-weather-barrier", name: "Breathable Weather Barrier", category: "Air / Weather Control", conductivity: 0.19, tag: "Airtight" },
  { id: "mat-vapor-control", name: "Vapor Control Membrane", category: "Moisture Protection", conductivity: 0.22, tag: "Vapor Seal" },
  { id: "mat-timber-frame", name: "Structural Timber Studs", category: "Structural Framing", conductivity: 0.13, tag: "Bio Frame" },
];

function getMat(id: string) {
  return AVAILABLE_MATERIALS.find((m) => m.id === id) || AVAILABLE_MATERIALS[1];
}

function calcAssemblyStats(layers: LayerModel[]) {
  const thickM = layers.reduce((sum, l) => sum + (l.thickness || 0), 0);
  const rVal = layers.reduce((sum, l) => sum + (l.thickness || 0) / getMat(l.materialId).conductivity, 0) + 0.17;
  const uVal = rVal > 0 ? 1 / rVal : 0;
  return {
    thickMm: Math.round(thickM * 1000),
    rValue: Number(rVal.toFixed(2)),
    uValue: Number(uVal.toFixed(2)),
  };
}

const ASSEMBLY_PRESETS = {
  walls: [
    {
      id: "preset-wall-alpine-mass",
      name: "Alpine Heavy Mass Wall",
      badge: "Recommended for Leh",
      desc: "300mm Rammed Earth + 150mm EPS + Timber Finish. Maximum diurnal thermal inertia.",
      icon: "🏔️",
      layers: [
        { materialId: "mat-galvanized-steel", name: "Exterior Steel Cladding", thickness: 0.008 },
        { materialId: "mat-weather-barrier", name: "Weather / Air Barrier", thickness: 0.006 },
        { materialId: "mat-timber-frame", name: "Structural Frame", thickness: 0.09 },
        { materialId: "mat-eps-insulation", name: "Continuous EPS Insulation", thickness: 0.15 },
        { materialId: "mat-rammed-earth", name: "Stabilized Rammed Earth Core", thickness: 0.30 },
        { materialId: "mat-vapor-control", name: "Vapor Control Membrane", thickness: 0.004 },
        { materialId: "mat-timber-deck", name: "Pine Timber Interior Finish", thickness: 0.018 },
      ],
    },
    {
      id: "preset-wall-aerogel",
      name: "High-Altitude Aerogel Wall",
      badge: "Ultra-Light & Slim",
      desc: "60mm Space-Grade Aerogel + Pine Deck. Ultra-slim profile with U=0.18 for constrained sites.",
      icon: "🚀",
      layers: [
        { materialId: "mat-aerogel-blanket", name: "Aerogel Super-Insulation Blanket", thickness: 0.06 },
        { materialId: "mat-timber-deck", name: "Pine Timber Interior Lining", thickness: 0.04 },
      ],
    },
    {
      id: "preset-wall-granite",
      name: "Granite Stone + Cavity EPS",
      badge: "Indigenous Stone",
      desc: "200mm Local Granite Masonry + 120mm EPS Insulation + Timber Lining.",
      icon: "🧱",
      layers: [
        { materialId: "mat-stone-masonry", name: "Local Granite Stone Cladding", thickness: 0.20 },
        { materialId: "mat-eps-insulation", name: "Rigid EPS Insulation", thickness: 0.12 },
        { materialId: "mat-timber-frame", name: "Structural Timber Studs", thickness: 0.08 },
        { materialId: "mat-timber-deck", name: "Pine Timber Interior Finish", thickness: 0.018 },
      ],
    },
    {
      id: "preset-wall-timber",
      name: "Bio-Timber Stud Wall",
      badge: "Rapid Prefab",
      desc: "Pine Siding + 140mm EPS Insulation + Timber Studs + Vapor Control.",
      icon: "🪵",
      layers: [
        { materialId: "mat-timber-deck", name: "Pine Timber Exterior Siding", thickness: 0.02 },
        { materialId: "mat-weather-barrier", name: "Breathable Weather Barrier", thickness: 0.006 },
        { materialId: "mat-eps-insulation", name: "Rigid EPS Insulation", thickness: 0.14 },
        { materialId: "mat-vapor-control", name: "Vapor Control Membrane", thickness: 0.004 },
        { materialId: "mat-timber-deck", name: "Interior Pine Timber Lining", thickness: 0.03 },
      ],
    },
  ],
  roof: [
    {
      id: "preset-roof-alpine",
      name: "Cold-Climate Standing Seam",
      badge: "Snow-Shedding High-R",
      desc: "Galvanized Standing-Seam Steel + 180mm EPS + Timber Rafters + Pine Ceiling.",
      icon: "❄️",
      layers: [
        { materialId: "mat-galvanized-steel", name: "Exterior Steel Cladding", thickness: 0.005 },
        { materialId: "mat-weather-barrier", name: "Weather / Air Barrier", thickness: 0.006 },
        { materialId: "mat-timber-frame", name: "Roof Structural Frame", thickness: 0.12 },
        { materialId: "mat-eps-insulation", name: "Continuous EPS Insulation", thickness: 0.18 },
        { materialId: "mat-vapor-control", name: "Vapor Control Membrane", thickness: 0.004 },
        { materialId: "mat-timber-deck", name: "Pine Ceiling Lining", thickness: 0.025 },
      ],
    },
    {
      id: "preset-roof-aerogel",
      name: "Compact Aerogel Roof",
      badge: "Maximum Headroom",
      desc: "80mm Aerogel Blanket + Galvanized Steel + Pine Ceiling. Slim profile with U=0.17.",
      icon: "🛸",
      layers: [
        { materialId: "mat-galvanized-steel", name: "Galvanized Steel Cladding", thickness: 0.005 },
        { materialId: "mat-aerogel-blanket", name: "Aerogel Super-Insulation", thickness: 0.08 },
        { materialId: "mat-timber-deck", name: "Pine Timber Ceiling", thickness: 0.025 },
      ],
    },
    {
      id: "preset-roof-timber",
      name: "High-R Bio Timber Ceiling",
      badge: "Low Embodied Carbon",
      desc: "Timber Deck + 150mm EPS + Rafters + Interior Pine Finish.",
      icon: "🌲",
      layers: [
        { materialId: "mat-timber-deck", name: "Pine Exterior Deck", thickness: 0.03 },
        { materialId: "mat-weather-barrier", name: "Weather Barrier", thickness: 0.006 },
        { materialId: "mat-eps-insulation", name: "Rigid EPS Insulation", thickness: 0.15 },
        { materialId: "mat-timber-frame", name: "Timber Structural Rafters", thickness: 0.10 },
        { materialId: "mat-timber-deck", name: "Pine Ceiling Finish", thickness: 0.024 },
      ],
    },
  ],
  floor: [
    {
      id: "preset-floor-ground-slab",
      name: "Insulated Perimeter Ground Slab",
      badge: "Permafrost Protection",
      desc: "Heavy Concrete Core (150mm) + Sub-Slab XPS (100mm) + Timber Finish.",
      icon: "🏗️",
      layers: [
        { materialId: "mat-timber-deck", name: "Interior Pine Floor Finish", thickness: 0.025 },
        { materialId: "mat-concrete-slab", name: "Heavy Concrete Thermal Mass Slab", thickness: 0.15 },
        { materialId: "mat-vapor-control", name: "Ground Moisture Membrane", thickness: 0.006 },
        { materialId: "mat-xps-insulation", name: "Sub-Slab XPS Insulation", thickness: 0.10 },
      ],
    },
    {
      id: "preset-floor-suspended",
      name: "Low-Carbon Suspended Floor",
      badge: "Elevated for Snow",
      desc: "Pine Deck (50mm) + Aerogel Blanket (60mm) + Moisture Barrier.",
      icon: "🪵",
      layers: [
        { materialId: "mat-timber-deck", name: "Pine Timber Decking", thickness: 0.05 },
        { materialId: "mat-aerogel-blanket", name: "Aerogel Super-Insulation", thickness: 0.06 },
        { materialId: "mat-weather-barrier", name: "Ground Moisture Barrier", thickness: 0.006 },
      ],
    },
    {
      id: "preset-floor-high-mass",
      name: "High-Mass Baserock Slab",
      badge: "Maximum Sensible Mass",
      desc: "200mm Concrete Slab + Moisture Barrier + 80mm Sub-Slab XPS.",
      icon: "🪨",
      layers: [
        { materialId: "mat-concrete-slab", name: "Heavy Concrete Foundation Slab", thickness: 0.20 },
        { materialId: "mat-vapor-control", name: "Moisture Barrier Membrane", thickness: 0.006 },
        { materialId: "mat-xps-insulation", name: "Extruded XPS Insulation", thickness: 0.08 },
      ],
    },
  ],
};

interface AssemblyMaterialSelectorProps {
  target: "walls" | "roof" | "floor";
  activeWallOrientation?: WallOrientation;
  model: ShelterModel;
  onUpdate: (updates: Partial<ShelterModel>) => void;
  onOpenMaterials?: () => void;
}

function AssemblyMaterialSelector({
  target,
  activeWallOrientation,
  model,
  onUpdate,
  onOpenMaterials,
}: AssemblyMaterialSelectorProps) {
  const [layersExpanded, setLayersExpanded] = useState(false);

  const currentLayers: LayerModel[] = React.useMemo(() => {
    if (target === "walls") {
      const wallKey = activeWallOrientation || "south";
      return model.envelope?.walls?.[wallKey]?.layers || [];
    }
    if (target === "roof") {
      return model.envelope?.roof?.layers || [];
    }
    return model.envelope?.floor?.layers || [];
  }, [model.envelope, target, activeWallOrientation]);

  const stats = React.useMemo(() => calcAssemblyStats(currentLayers), [currentLayers]);
  const presets = ASSEMBLY_PRESETS[target];

  const handleApplyPreset = (preset: (typeof presets)[number], applyToAll = false) => {
    const newLayers = preset.layers.map((l) => ({ ...l }));
    if (target === "walls") {
      if (applyToAll) {
        onUpdate({
          envelope: {
            ...model.envelope,
            walls: {
              north: { ...model.envelope.walls.north, name: preset.name, layers: structuredClone(newLayers) },
              south: { ...model.envelope.walls.south, name: preset.name, layers: structuredClone(newLayers) },
              east: { ...model.envelope.walls.east, name: preset.name, layers: structuredClone(newLayers) },
              west: { ...model.envelope.walls.west, name: preset.name, layers: structuredClone(newLayers) },
            },
          },
        });
      } else {
        const wallKey = activeWallOrientation || "south";
        onUpdate({
          envelope: {
            ...model.envelope,
            walls: {
              ...model.envelope.walls,
              [wallKey]: {
                ...model.envelope.walls[wallKey],
                name: preset.name,
                layers: structuredClone(newLayers),
              },
            },
          },
        });
      }
    } else if (target === "roof") {
      onUpdate({
        envelope: {
          ...model.envelope,
          roof: {
            ...model.envelope.roof,
            name: preset.name,
            layers: structuredClone(newLayers),
          },
        },
      });
    } else {
      onUpdate({
        envelope: {
          ...model.envelope,
          floor: {
            ...model.envelope.floor,
            name: preset.name,
            layers: structuredClone(newLayers),
          },
        },
      });
    }
  };

  const handleUpdateLayer = (index: number, patch: Partial<LayerModel>) => {
    const updated = currentLayers.map((l, i) => {
      if (i === index) {
        const newMatId = patch.materialId ?? l.materialId;
        const mat = getMat(newMatId);
        return {
          ...l,
          ...patch,
          name: patch.name ?? (patch.materialId ? mat.name : l.name),
        };
      }
      return l;
    });

    if (target === "walls") {
      const wallKey = activeWallOrientation || "south";
      onUpdate({
        envelope: {
          ...model.envelope,
          walls: {
            ...model.envelope.walls,
            [wallKey]: {
              ...model.envelope.walls[wallKey],
              layers: updated,
            },
          },
        },
      });
    } else if (target === "roof") {
      onUpdate({
        envelope: {
          ...model.envelope,
          roof: { ...model.envelope.roof, layers: updated },
        },
      });
    } else {
      onUpdate({
        envelope: {
          ...model.envelope,
          floor: { ...model.envelope.floor, layers: updated },
        },
      });
    }
  };

  const handleAddLayer = () => {
    const newLayer: LayerModel = {
      materialId: "mat-eps-insulation",
      name: "Rigid EPS Insulation",
      thickness: 0.10,
    };
    const updated = [...currentLayers, newLayer];
    if (target === "walls") {
      const wallKey = activeWallOrientation || "south";
      onUpdate({
        envelope: {
          ...model.envelope,
          walls: {
            ...model.envelope.walls,
            [wallKey]: { ...model.envelope.walls[wallKey], layers: updated },
          },
        },
      });
    } else if (target === "roof") {
      onUpdate({
        envelope: {
          ...model.envelope,
          roof: { ...model.envelope.roof, layers: updated },
        },
      });
    } else {
      onUpdate({
        envelope: {
          ...model.envelope,
          floor: { ...model.envelope.floor, layers: updated },
        },
      });
    }
  };

  const handleRemoveLayer = (index: number) => {
    if (currentLayers.length <= 1) return;
    const updated = currentLayers.filter((_, i) => i !== index);
    if (target === "walls") {
      const wallKey = activeWallOrientation || "south";
      onUpdate({
        envelope: {
          ...model.envelope,
          walls: {
            ...model.envelope.walls,
            [wallKey]: { ...model.envelope.walls[wallKey], layers: updated },
          },
        },
      });
    } else if (target === "roof") {
      onUpdate({
        envelope: {
          ...model.envelope,
          roof: { ...model.envelope.roof, layers: updated },
        },
      });
    } else {
      onUpdate({
        envelope: {
          ...model.envelope,
          floor: { ...model.envelope.floor, layers: updated },
        },
      });
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {/* 1. Live Assembly Thermal Performance Card */}
      <div className="rounded-xl border border-border/80 bg-secondary/30 p-2.5 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="size-3 text-emerald-500" />
            Thermal Performance Rating
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            stats.uValue <= 0.20
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
              : stats.uValue <= 0.35
              ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
          }`}>
            {stats.uValue <= 0.20 ? "Ultra-Low Heat Loss" : stats.uValue <= 0.35 ? "Cold-Climate Standard" : "Moderate Loss"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-background/80 p-1.5 border border-border/50">
            <div className="text-[9px] uppercase font-semibold text-muted-foreground">U-Value</div>
            <div className="font-mono text-xs font-bold text-foreground">{stats.uValue} <small className="text-[9px] font-normal text-muted-foreground">W/m²K</small></div>
          </div>
          <div className="rounded-lg bg-background/80 p-1.5 border border-border/50">
            <div className="text-[9px] uppercase font-semibold text-muted-foreground">R-Value</div>
            <div className="font-mono text-xs font-bold text-foreground">{stats.rValue} <small className="text-[9px] font-normal text-muted-foreground">m²K/W</small></div>
          </div>
          <div className="rounded-lg bg-background/80 p-1.5 border border-border/50">
            <div className="text-[9px] uppercase font-semibold text-muted-foreground">Thickness</div>
            <div className="font-mono text-xs font-bold text-foreground">{stats.thickMm} <small className="text-[9px] font-normal text-muted-foreground">mm</small></div>
          </div>
        </div>
      </div>

      {/* 2. 1-Click Material Presets */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" />
            1-Click Material Presets
          </span>
          {target === "walls" && (
            <button
              type="button"
              onClick={() => {
                const wallKey = activeWallOrientation || "south";
                const activeWallObj = model.envelope.walls[wallKey];
                const matchingPreset = presets.find((p) => p.name === activeWallObj?.name) || presets[0];
                handleApplyPreset(matchingPreset, true);
              }}
              className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              title="Apply current assembly to North, South, East, and West facades"
            >
              Apply to All 4 Walls
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {presets.map((preset) => {
            const isMatch = currentLayers.length === preset.layers.length &&
              currentLayers.every((l, i) => l.materialId === preset.layers[i].materialId);
            const pStats = calcAssemblyStats(preset.layers);

            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset, false)}
                className={`cursor-pointer rounded-xl border p-2.5 transition text-left ${
                  isMatch
                    ? "border-sky-500 bg-sky-500/10 shadow-xs ring-1 ring-sky-500/30"
                    : "border-border bg-card/60 hover:bg-secondary/40 hover:border-foreground/20"
                }`}
                title={`Click to apply ${preset.name}`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{preset.icon}</span>
                      <strong className="text-xs font-bold text-foreground truncate">{preset.name}</strong>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1 leading-snug">{preset.desc}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    <span className="font-mono text-[10px] font-bold text-foreground">
                      U={pStats.uValue}
                    </span>
                    {isMatch ? (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-sky-600 dark:text-sky-400">
                        <Check className="size-3" /> Active
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground font-semibold">Select</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Layer-by-Layer Customizer (Accordion) */}
      <div className="rounded-xl border border-border/70 bg-card/40 p-2.5">
        <button
          type="button"
          onClick={() => setLayersExpanded(!layersExpanded)}
          className="flex w-full items-center justify-between text-xs font-bold text-foreground cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-muted-foreground" />
            Layer-by-Layer Composition ({currentLayers.length} Layers)
          </span>
          {layersExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>

        {layersExpanded && (
          <div className="mt-2.5 space-y-2 pt-2 border-t border-border/50 animate-in fade-in">
            {currentLayers.map((layer, index) => {
              const mat = getMat(layer.materialId);
              const layerThickMm = Math.round((layer.thickness || 0) * 1000);
              const layerR = ((layer.thickness || 0) / mat.conductivity).toFixed(2);

              return (
                <div key={`${layer.materialId}-${index}`} className="rounded-lg border border-border/60 bg-background/60 p-2 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-[11px] text-foreground truncate">
                      {index + 1}. {layer.name || mat.name}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      R={layerR} m²K/W
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 items-center">
                    <select
                      value={layer.materialId}
                      onChange={(e) => handleUpdateLayer(index, { materialId: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground font-medium"
                    >
                      {AVAILABLE_MATERIALS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.category})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 justify-end">
                      <input
                        type="number"
                        min={1}
                        max={800}
                        step={5}
                        value={layerThickMm}
                        onChange={(e) => handleUpdateLayer(index, { thickness: Math.max(1, Number(e.target.value) || 1) / 1000 })}
                        className="w-16 rounded-md border border-border bg-background px-1.5 py-1 text-xs font-mono text-right font-bold text-foreground"
                      />
                      <span className="text-[10px] text-muted-foreground">mm</span>
                      {currentLayers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLayer(index)}
                          className="ml-1 p-1 text-muted-foreground hover:text-red-500 rounded cursor-pointer"
                          title="Remove layer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddLayer}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition cursor-pointer"
            >
              <Plus className="size-3.5" /> Add Layer to Assembly
            </button>
          </div>
        )}
      </div>

      {/* 4. Open Full Workbench Dialog Button */}
      {onOpenMaterials && (
        <button
          type="button"
          onClick={onOpenMaterials}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition shadow-xs cursor-pointer"
        >
          <Layers3 className="size-3.5 text-amber-500" />
          <span>Open Advanced Material Workbench</span>
        </button>
      )}
    </div>
  );
}

export function PropertyInspector({
  model,
  selected,
  currentStep = 0,
  onSelect,
  onUpdate,
  onSimulate,
  onOpenMaterials,
}: Props) {
  const [activeWall, setActiveWall] = useState<WallOrientation>("south");

  const updateGeometry = (key: keyof ShelterModel["geometry"], value: number | string) =>
    onUpdate({ geometry: { ...model.geometry, [key]: value } });

  const updateWindow = (id: string, patch: Partial<WindowModel>) => {
    const current = model.windows.find((item) => item.id === id);
    if (!current) return;
    const targetWall = (patch.wall ?? current.wall) as WallOrientation;
    const wallSpan = ["north", "south"].includes(targetWall)
      ? model.geometry.length
      : model.geometry.width;
    const wallH = model.geometry.height;

    const w = patch.width ?? current.width;
    const h = patch.height ?? current.height;
    const sill = patch.sillHeight ?? current.sillHeight;
    const posX = patch.positionX ?? current.positionX;

    const clamped = clampOpeningPlacement(wallSpan, wallH, posX, w, sill, h, false);

    onUpdate({
      windows: model.windows.map((item) =>
        item.id === id ? { ...item, ...patch, ...clamped, wall: targetWall } : item
      ),
    });
  };

  const updateDoor = (id: string, patch: Partial<DoorModel>) => {
    const current = model.doors.find((item) => item.id === id);
    if (!current) return;
    const targetWall = (patch.wall ?? current.wall) as WallOrientation;
    const wallSpan = ["north", "south"].includes(targetWall)
      ? model.geometry.length
      : model.geometry.width;
    const wallH = model.geometry.height;

    const w = patch.width ?? current.width;
    const h = patch.height ?? current.height;
    const posX = patch.positionX ?? current.positionX;

    const clamped = clampOpeningPlacement(wallSpan, wallH, posX, w, 0, h, true);

    onUpdate({
      doors: model.doors.map((item) =>
        item.id === id ? { ...item, ...patch, ...clamped, wall: targetWall } : item
      ),
    });
  };

  const close = () => onSelect(null);

  // If a specific 3D mesh was explicitly selected in the canvas
  if (selected && selected.type !== "shelter") {
    if (selected.type === "wall") {
      const wall = model.envelope.walls[selected.orientation];
      const span = ["north", "south"].includes(selected.orientation)
        ? model.geometry.length
        : model.geometry.width;

      const addOpening = (type: "window" | "door") => {
        const wall = selected.orientation;
        const span = ["north", "south"].includes(wall)
          ? model.geometry.length
          : model.geometry.width;
        const wallOpenings = [
          ...model.windows.filter((w) => w.wall === wall).map((w) => ({ positionX: w.positionX, width: w.width })),
          ...model.doors.filter((d) => d.wall === wall).map((d) => ({ positionX: d.positionX, width: d.width })),
        ];

        if (type === "window") {
          const width = 1.4;
          const height = 1.2;
          const sillHeight = 0.9;
          const positionX = findNextAvailableOpeningPosition(span, wallOpenings, width);
          const clamped = clampOpeningPlacement(span, model.geometry.height, positionX, width, sillHeight, height, false);
          const newId = `win-${Date.now()}`;
          onUpdate({
            windows: [
              ...model.windows,
              {
                id: newId,
                wall,
                positionX: clamped.positionX,
                width: clamped.width,
                height: clamped.height,
                sillHeight: clamped.sillHeight,
                glazingType: "Double_LowE_Argon",
                frameType: "UPVC_Insulated",
                shadingOverhang: 0.35,
              },
            ],
          });
          onSelect({ type: "window", id: newId });
        } else {
          const width = 0.95;
          const height = 2.1;
          const positionX = findNextAvailableOpeningPosition(span, wallOpenings, width);
          const clamped = clampOpeningPlacement(span, model.geometry.height, positionX, width, 0, height, true);
          const newId = `door-${Date.now()}`;
          onUpdate({
            doors: [
              ...model.doors,
              {
                id: newId,
                wall,
                positionX: clamped.positionX,
                width: clamped.width,
                height: clamped.height,
                construction: "Insulated timber door",
                airTightness: "HighPerformance_Airtight",
              },
            ],
          });
          onSelect({ type: "door", id: newId });
        }
      };

      return (
        <div className="cad-inspector-content">
          <SectionTitle
            eyebrow="Envelope Element"
            title={`${selected.orientation.toUpperCase()} Wall Assembly`}
            onClose={close}
          />
          <div className="cad-property-summary">
            <span>{(span * model.geometry.height).toFixed(1)} m² gross</span>
            <span>{Math.round(wall.layers.reduce((sum, l) => sum + l.thickness, 0) * 1000)} mm total</span>
          </div>

          <AssemblyMaterialSelector
            target="walls"
            activeWallOrientation={selected.orientation}
            model={model}
            onUpdate={onUpdate}
            onOpenMaterials={onOpenMaterials}
          />

          <div className="cad-action-grid mt-4">
            <button type="button" onClick={() => addOpening("window")}>
              <Plus className="size-3.5" /> Add Window
            </button>
            <button type="button" onClick={() => addOpening("door")}>
              <Plus className="size-3.5" /> Add Door
            </button>
          </div>
        </div>
      );
    }

    if (selected.type === "roof") {
      return (
        <div className="cad-inspector-content">
          <SectionTitle eyebrow="Envelope Element" title="Roof Assembly" onClose={close} />
          <NumberField
            label="Pitch Angle"
            value={model.geometry.roofAngle}
            unit="deg"
            max={60}
            step={1}
            onChange={(v) => updateGeometry("roofAngle", v)}
          />
          <NumberField
            label="Overhang Projection"
            value={model.envelope.roof.overhang}
            unit="m"
            max={2}
            onChange={(v) =>
              onUpdate({ envelope: { ...model.envelope, roof: { ...model.envelope.roof, overhang: v } } })
            }
          />
          <AssemblyMaterialSelector
            target="roof"
            model={model}
            onUpdate={onUpdate}
            onOpenMaterials={onOpenMaterials}
          />
          <RoofSolarPanelsEditor model={model} onUpdate={onUpdate} />
        </div>
      );
    }

    if (selected.type === "floor") {
      return (
        <div className="cad-inspector-content">
          <SectionTitle eyebrow="Envelope Element" title="Ground Floor Foundation" onClose={close} />
          <div className="cad-property-summary">
            <span>{(model.geometry.length * model.geometry.width).toFixed(1)} m²</span>
            <span>{model.envelope.floor.groundContact ? "Slab-on-Grade" : "Suspended"}</span>
          </div>
          <AssemblyMaterialSelector
            target="floor"
            model={model}
            onUpdate={onUpdate}
            onOpenMaterials={onOpenMaterials}
          />
        </div>
      );
    }

    if (selected.type === "window") {
      const item = model.windows.find((w) => w.id === selected.id);
      if (!item) return null;
      const wallSpan = ["north", "south"].includes(item.wall)
        ? model.geometry.length
        : model.geometry.width;
      const wallOpenings = model.windows.filter((w) => w.wall === item.wall);

      return (
        <div className="cad-inspector-content">
          <SectionTitle eyebrow="Aperture Element" title="Window Inspector" onClose={close} />

          <label className="cad-field">
            <span>Host Wall Orientation</span>
            <select
              value={item.wall}
              onChange={(e) => updateWindow(item.id, { wall: e.target.value as WallOrientation })}
            >
              <option value="south">South Wall (High Solar Exposure)</option>
              <option value="north">North Wall (Shaded / Heat Loss)</option>
              <option value="east">East Wall (Morning Sun)</option>
              <option value="west">West Wall (Afternoon / Wind)</option>
            </select>
          </label>

          <div className="cad-field-grid">
            <NumberField
              label="Width"
              value={item.width}
              unit="m"
              min={0.4}
              max={Math.max(0.5, wallSpan - 0.4)}
              step={0.05}
              onChange={(v) => updateWindow(item.id, { width: v })}
            />
            <NumberField
              label="Height"
              value={item.height}
              unit="m"
              min={0.4}
              max={Math.max(0.5, model.geometry.height - 0.4)}
              step={0.05}
              onChange={(v) => updateWindow(item.id, { height: v })}
            />
            <NumberField
              label="Sill Height"
              value={item.sillHeight}
              unit="m"
              min={0.15}
              max={Math.max(0.2, model.geometry.height - item.height - 0.15)}
              step={0.05}
              onChange={(v) => updateWindow(item.id, { sillHeight: v })}
            />
            <NumberField
              label="Position Along Wall"
              value={item.positionX}
              unit="m"
              min={0.2}
              max={Math.max(0.2, wallSpan - item.width - 0.2)}
              step={0.05}
              onChange={(v) => updateWindow(item.id, { positionX: v })}
            />
          </div>

          {/* Quick Architectural Alignment Tools */}
          <div className="mt-2 flex flex-col gap-1.5">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
              onClick={() => {
                const aligned = alignToStandardHeader(model.geometry.height, item.height, 2.1);
                updateWindow(item.id, aligned);
              }}
              title="Align window header to standard 2.10m datum matching doors"
            >
              Align Header (2.1m Datum)
            </button>
            {wallOpenings.length > 1 && (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
                onClick={() => {
                  const distributed = distributeOpeningsEvenly(wallSpan, wallOpenings);
                  const updatedMap = new Map(distributed.map((d) => [d.id, d.positionX]));
                  onUpdate({
                    windows: model.windows.map((w) =>
                      updatedMap.has(w.id) ? { ...w, positionX: updatedMap.get(w.id)! } : w
                    ),
                  });
                }}
                title="Evenly space all windows across this facade"
              >
                Evenly Space All {item.wall.toUpperCase()} Windows
              </button>
            )}
          </div>

          <label className="cad-field mt-2">
            <span>Glazing Specification</span>
            <select
              value={item.glazingType}
              onChange={(e) => updateWindow(item.id, { glazingType: e.target.value as any })}
            >
              <option value="Triple_LowE_Krypton">Triple Low-E Krypton (U=0.8 W/m²K)</option>
              <option value="Double_LowE_Argon">Double Low-E Argon (U=1.4 W/m²K)</option>
              <option value="Single_Clear">Single Clear (Baseline U=5.8 W/m²K)</option>
            </select>
          </label>

          <NumberField
            label="Shading Awning Overhang"
            value={item.shadingOverhang || 0}
            unit="m"
            min={0}
            max={1.5}
            step={0.05}
            onChange={(v) => updateWindow(item.id, { shadingOverhang: v })}
          />

          <WindowSolarPaneEditor windowItem={item} onUpdateWindow={(patch) => updateWindow(item.id, patch)} />

          <button
            type="button"
            className="cad-delete mt-4"
            onClick={() => {
              onUpdate({ windows: model.windows.filter((w) => w.id !== item.id) });
              close();
            }}
          >
            <Trash2 className="size-3.5" /> Delete Window
          </button>
        </div>
      );
    }

    if (selected.type === "door") {
      const item = model.doors.find((d) => d.id === selected.id);
      if (!item) return null;
      const wallSpan = ["north", "south"].includes(item.wall)
        ? model.geometry.length
        : model.geometry.width;

      return (
        <div className="cad-inspector-content">
          <SectionTitle eyebrow="Aperture Element" title="Exterior Door Inspector" onClose={close} />

          <label className="cad-field">
            <span>Host Wall Orientation</span>
            <select
              value={item.wall}
              onChange={(e) => updateDoor(item.id, { wall: e.target.value as WallOrientation })}
            >
              <option value="east">East Wall (Primary Ingress)</option>
              <option value="south">South Wall (Sunny Entry)</option>
              <option value="west">West Wall (Airlock Ingress)</option>
              <option value="north">North Wall (Service Door)</option>
            </select>
          </label>

          <div className="cad-field-grid">
            <NumberField
              label="Width"
              value={item.width}
              unit="m"
              min={0.6}
              max={Math.max(0.7, wallSpan - 0.4)}
              step={0.05}
              onChange={(v) => updateDoor(item.id, { width: v })}
            />
            <NumberField
              label="Height"
              value={item.height}
              unit="m"
              min={1.8}
              max={Math.max(1.8, model.geometry.height - 0.1)}
              step={0.05}
              onChange={(v) => updateDoor(item.id, { height: v })}
            />
            <NumberField
              label="Position Along Wall"
              value={item.positionX}
              unit="m"
              min={0.2}
              max={Math.max(0.2, wallSpan - item.width - 0.2)}
              step={0.05}
              onChange={(v) => updateDoor(item.id, { positionX: v })}
            />
          </div>

          <label className="cad-field mt-2">
            <span>Air-Tightness Rating</span>
            <select
              value={item.airTightness}
              onChange={(e) => updateDoor(item.id, { airTightness: e.target.value as any })}
            >
              <option value="HighPerformance_Airtight">High Performance Airtight (Passive House spec)</option>
              <option value="Standard_Weatherstripped">Standard Weatherstripped</option>
              <option value="Basic_Drafty">Basic (Draft Risk)</option>
            </select>
          </label>

          <button
            type="button"
            className="cad-delete mt-4"
            onClick={() => {
              onUpdate({ doors: model.doors.filter((d) => d.id !== item.id) });
              close();
            }}
          >
            <Trash2 className="size-3.5" /> Delete Door
          </button>
        </div>
      );
    }
  }

  // --- STAGE-AWARE CONTEXTUAL INSPECTOR (Synchronized 1:1 with DESIGNER_9_STEPS: 0 to 8) ---

  // Stage 1 (index 0): Geometry & Spatial Envelope
  if (currentStep === 0) {
    const area = model.geometry.length * model.geometry.width;
    const volume = area * model.geometry.height;
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 1 · Spatial Massing" title="Geometry & Solar Axis" />
        <div className="cad-field-grid">
          <NumberField
            label="Length (EW)"
            value={model.geometry.length}
            unit="m"
            min={2}
            max={30}
            onChange={(v) => updateGeometry("length", v)}
          />
          <NumberField
            label="Width (NS)"
            value={model.geometry.width}
            unit="m"
            min={2}
            max={30}
            onChange={(v) => updateGeometry("width", v)}
          />
          <NumberField
            label="Eave Height"
            value={model.geometry.height}
            unit="m"
            min={2}
            max={10}
            onChange={(v) => updateGeometry("height", v)}
          />
          <label className="cad-field">
            <span>Roof Form</span>
            <select
              value={model.geometry.roofType}
              onChange={(e) => updateGeometry("roofType", e.target.value)}
            >
              <option value="Flat">Flat Roof</option>
              <option value="Shed">Shed Roof</option>
              <option value="Gable">Gable Roof</option>
            </select>
          </label>
        </div>

        <div className="mt-3">
          <NumberField
            label="Building Azimuth"
            value={model.geometry.orientation}
            unit="deg"
            min={0}
            max={359}
            step={5}
            onChange={(v) => updateGeometry("orientation", v)}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { label: "0° (North)", val: 0 },
              { label: "90° (East)", val: 90 },
              { label: "180° (South)", val: 180 },
              { label: "270° (West)", val: 270 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => updateGeometry("orientation", item.val)}
                className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition ${
                  model.geometry.orientation === item.val
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-secondary text-muted-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cad-property-summary mt-3">
          <span>{area.toFixed(1)} m² Floor</span>
          <span>{volume.toFixed(1)} m³ Volume</span>
        </div>
      </div>
    );
  }

  // Stage 2 (index 1): Wall Construction
  if (currentStep === 1) {
    const wall = model.envelope.walls[activeWall];
    const span = ["north", "south"].includes(activeWall) ? model.geometry.length : model.geometry.width;
    const totalThickMm = Math.round(wall.layers.reduce((sum, l) => sum + l.thickness, 0) * 1000);

    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 2 · Exterior Envelope" title="Wall Construction" />
        <div className="flex gap-1 rounded-xl bg-secondary/40 p-1 border border-border">
          {(["north", "south", "east", "west"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setActiveWall(w)}
              className={`flex-1 rounded-lg py-1 text-[11px] font-semibold capitalize transition ${
                activeWall === w ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        <div className="cad-property-summary mt-2">
          <span>{(span * model.geometry.height).toFixed(1)} m² Gross Area</span>
          <span>{totalThickMm} mm Assembly</span>
        </div>

        <AssemblyMaterialSelector
          target="walls"
          activeWallOrientation={activeWall}
          model={model}
          onUpdate={onUpdate}
          onOpenMaterials={onOpenMaterials}
        />

        <div className="cad-action-grid mt-4">
          <button
            type="button"
            onClick={() =>
              onUpdate({
                windows: [
                  ...model.windows,
                  {
                    id: `win-${Date.now()}`,
                    wall: activeWall,
                    positionX: span * 0.3,
                    width: 1.6,
                    height: 1.3,
                    sillHeight: 0.9,
                    glazingType: "Double_LowE_Argon",
                    frameType: "UPVC_Insulated",
                    shadingOverhang: 0.4,
                  },
                ],
              })
            }
          >
            <Plus className="size-3.5" /> + Window on {activeWall}
          </button>
        </div>
      </div>
    );
  }

  // Stage 3 (index 2): Roof Assembly
  if (currentStep === 2) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 3 · Overhead Envelope" title="Roof & Ceiling Assembly" />
        <NumberField
          label="Roof Pitch"
          value={model.geometry.roofAngle}
          unit="deg"
          max={60}
          step={1}
          onChange={(v) => updateGeometry("roofAngle", v)}
        />
        <NumberField
          label="Overhang Projection"
          value={model.envelope.roof.overhang}
          unit="m"
          max={2}
          onChange={(v) =>
            onUpdate({ envelope: { ...model.envelope, roof: { ...model.envelope.roof, overhang: v } } })
          }
        />
        <AssemblyMaterialSelector
          target="roof"
          model={model}
          onUpdate={onUpdate}
          onOpenMaterials={onOpenMaterials}
        />
        <RoofSolarPanelsEditor model={model} onUpdate={onUpdate} />
      </div>
    );
  }

  // Stage 4 (index 3): Floor Foundation
  if (currentStep === 3) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 4 · Subgrade Interface" title="Ground Floor Foundation" />
        <div className="cad-property-summary">
          <span>{(model.geometry.length * model.geometry.width).toFixed(1)} m² Slab Area</span>
          <span>{model.envelope.floor.groundContact ? "Ground Contact" : "Suspended"}</span>
        </div>
        <AssemblyMaterialSelector
          target="floor"
          model={model}
          onUpdate={onUpdate}
          onOpenMaterials={onOpenMaterials}
        />
      </div>
    );
  }

  // Stage 5 (index 4): Windows & Doors (Unified Apertures)
  if (currentStep === 4) {
    const totalWinArea = model.windows.reduce((sum, w) => sum + w.width * w.height, 0);
    const wallArea = 2 * (model.geometry.length + model.geometry.width) * model.geometry.height;
    const wwr = wallArea > 0 ? ((totalWinArea / wallArea) * 100).toFixed(1) : "0";

    const bipvWindows = model.windows.filter((w) => w.solarPane?.enabled);
    const bipvCount = bipvWindows.length;
    const totalBipvWatts = bipvWindows
      .reduce((sum, w) => sum + w.width * w.height * (w.solarPane?.powerDensityWpM2 || 90), 0)
      .toFixed(0);

    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 5 · Apertures & Ingress" title="Windows & Doors" />
        <div className="cad-property-summary">
          <span>{model.windows.length} Windows ({wwr}% WWR)</span>
          <span>{bipvCount} BIPV ({totalBipvWatts} Wp)</span>
          <span>{model.doors.length} Doors</span>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              const wall = "south";
              const span = model.geometry.length;
              const wallOpenings = [
                ...model.windows.filter((w) => w.wall === wall).map((w) => ({ positionX: w.positionX, width: w.width })),
                ...model.doors.filter((d) => d.wall === wall).map((d) => ({ positionX: d.positionX, width: d.width })),
              ];
              const width = 1.4;
              const height = 1.2;
              const sillHeight = 0.9;
              const positionX = findNextAvailableOpeningPosition(span, wallOpenings, width);
              const clamped = clampOpeningPlacement(span, model.geometry.height, positionX, width, sillHeight, height, false);
              const newId = `win-${Date.now()}`;
              onUpdate({
                windows: [
                  ...model.windows,
                  {
                    id: newId,
                    wall,
                    positionX: clamped.positionX,
                    width: clamped.width,
                    height: clamped.height,
                    sillHeight: clamped.sillHeight,
                    glazingType: "Triple_LowE_Krypton",
                    frameType: "Wood_HighPerformance",
                    shadingOverhang: 0.45,
                  },
                ],
              });
              onSelect({ type: "window", id: newId });
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-foreground bg-foreground py-2 text-xs font-semibold text-background shadow-sm hover:opacity-90"
          >
            <Plus className="size-3.5" /> + Add South Solar Window
          </button>

          <button
            type="button"
            onClick={() => {
              const wall = "east";
              const span = model.geometry.width;
              const wallOpenings = [
                ...model.windows.filter((w) => w.wall === wall).map((w) => ({ positionX: w.positionX, width: w.width })),
                ...model.doors.filter((d) => d.wall === wall).map((d) => ({ positionX: d.positionX, width: d.width })),
              ];
              const width = 0.95;
              const height = 2.1;
              const positionX = findNextAvailableOpeningPosition(span, wallOpenings, width);
              const clamped = clampOpeningPlacement(span, model.geometry.height, positionX, width, 0, height, true);
              const newId = `door-${Date.now()}`;
              onUpdate({
                doors: [
                  ...model.doors,
                  {
                    id: newId,
                    wall,
                    positionX: clamped.positionX,
                    width: clamped.width,
                    height: clamped.height,
                    construction: "Insulated timber door",
                    airTightness: "HighPerformance_Airtight",
                  },
                ],
              });
              onSelect({ type: "door", id: newId });
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-secondary"
          >
            <Plus className="size-3.5" /> + Add Entry Door
          </button>
        </div>

        <p className="cad-subhead mt-3">Glazing Schedule ({model.windows.length})</p>
        <div className="cad-layer-stack">
          {model.windows.map((w, idx) => (
            <div
              key={w.id}
              className="cursor-pointer hover:bg-secondary/40"
              onClick={() => onSelect({ type: "window", id: w.id })}
            >
              <span>#{idx + 1} {w.wall.toUpperCase()} · {w.width}×{w.height}m</span>
              <strong>{w.glazingType?.replace(/_/g, " ")}</strong>
            </div>
          ))}
        </div>

        <p className="cad-subhead mt-3">Door Schedule ({model.doors.length})</p>
        <div className="cad-layer-stack">
          {model.doors.map((d, idx) => (
            <div
              key={d.id}
              className="cursor-pointer hover:bg-secondary/40"
              onClick={() => onSelect({ type: "door", id: d.id })}
            >
              <span>#{idx + 1} {d.wall.toUpperCase()} · {d.width}×{d.height}m</span>
              <strong>{d.airTightness}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Stage 6 (index 5): Thermal Mass
  if (currentStep === 5) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 6 · Capacitive Flywheel" title="Internal Thermal Mass" />
        <div className="cad-property-summary">
          <span>{model.thermalMass?.length || 0} Mass Elements</span>
          <span>Diurnal Damping</span>
        </div>
        <div className="cad-layer-stack mt-3">
          {(model.thermalMass || []).map((tm) => (
            <div key={tm.id}>
              <span>{tm.name}</span>
              <strong>{Math.round(tm.thickness * 1000)} mm</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Stage 7 (index 6): Ventilation & Internal Loads
  if (currentStep === 6) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 7 · Air Exchange & Loads" title="Ventilation & Internal Gains" />
        <div className="cad-field-grid">
          <NumberField
            label="Infiltration Rate"
            value={model.ventilation?.infiltrationACH ?? 0.35}
            unit="ACH"
            min={0.05}
            max={3.0}
            step={0.05}
            onChange={(v) =>
              onUpdate({ ventilation: { ...model.ventilation, infiltrationACH: v } as any })
            }
          />
          <NumberField
            label="HRV Efficiency"
            value={Math.round((model.ventilation?.heatRecoveryEfficiency ?? 0.75) * 100)}
            unit="%"
            min={0}
            max={95}
            step={5}
            onChange={(v) =>
              onUpdate({
                ventilation: { ...model.ventilation, heatRecoveryEfficiency: v / 100 } as any,
              })
            }
          />
        </div>
        <div className="cad-field-grid mt-2">
          <NumberField
            label="Occupants"
            value={model.internalLoads?.occupantsCount ?? 2}
            unit="pax"
            min={0}
            max={20}
            onChange={(v) =>
              onUpdate({ internalLoads: { ...model.internalLoads, occupantsCount: v } as any })
            }
          />
          <NumberField
            label="Equipment Loads"
            value={model.internalLoads?.equipmentPowerWatts ?? 150}
            unit="W"
            min={0}
            max={2000}
            step={50}
            onChange={(v) =>
              onUpdate({ internalLoads: { ...model.internalLoads, equipmentPowerWatts: v } as any })
            }
          />
        </div>
      </div>
    );
  }

  // Stage 8 (index 7): Targets
  if (currentStep === 7) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 8 · Performance Boundaries" title="Thermal Comfort Targets" />
        <div className="cad-field-grid">
          <NumberField
            label="Comfort Min"
            value={model.designTargets?.comfortTempMinC ?? 18.0}
            unit="°C"
            min={10}
            max={24}
            onChange={(v) =>
              onUpdate({
                designTargets: { ...model.designTargets, comfortTempMinC: v } as any,
              })
            }
          />
          <NumberField
            label="Comfort Max"
            value={model.designTargets?.comfortTempMaxC ?? 26.0}
            unit="°C"
            min={20}
            max={35}
            onChange={(v) =>
              onUpdate({
                designTargets: { ...model.designTargets, comfortTempMaxC: v } as any,
              })
            }
          />
        </div>
        <div className="cad-property-summary mt-2">
          <span>Target: {model.designTargets?.targetComfortPercent ?? 85}% Year-Round Comfort</span>
        </div>
      </div>
    );
  }

  // Stage 9 (index 8): Simulation Engine & Solver Execution
  return (
    <div className="cad-inspector-content">
      <SectionTitle eyebrow="Stage 9 · Solver Execution" title="ThermoShelter Simulation" />
      <div className="cad-property-summary">
        <span>Engine: ThermoShelter Core</span>
        <span>Validation: Ready</span>
      </div>

      <button
        type="button"
        onClick={onSimulate}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-xs font-bold text-background shadow-md transition hover:opacity-90"
      >
        <Play className="size-3.5 fill-current" /> Run Thermal Simulation
      </button>
    </div>
  );
}
