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
} from "lucide-react";
import type {
  ShelterModel,
  WindowModel,
  DoorModel,
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
  const solar = model.envelope?.roof?.solarPanels || {
    enabled: true,
    panelCount: 6,
    panelWattageW: 400,
    panelEfficiencyPct: 21.5,
    tiltAngleDeg: 30,
    mountingType: "UnistrutElevated",
  };
  const isEnabled = solar.enabled !== false;
  const count = solar.panelCount ?? 6;
  const wattage = solar.panelWattageW ?? 400;
  const totalKw = ((count * wattage) / 1000).toFixed(2);
  const totalArea = (count * 1.95).toFixed(1);

  const updateSolar = (patch: Partial<RoofSolarPanelsConfig>) => {
    onUpdate({
      envelope: {
        ...model.envelope,
        roof: {
          ...model.envelope.roof,
          solarPanels: {
            ...solar,
            ...patch,
          },
        },
      },
    });
  };

  return (
    <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
          <Sun className="size-3.5 text-amber-400" />
          Rooftop Solar Array
        </span>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => updateSolar({ enabled: e.target.checked })}
            className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0"
          />
          {isEnabled ? "Installed" : "Off"}
        </label>
      </div>

      {isEnabled && (
        <div className="mt-2 space-y-2">
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
          <div className="cad-field-grid">
            <label className="cad-field">
              <span>Racking Tilt <small>deg</small></span>
              <input
                type="number"
                min={0}
                max={85}
                value={solar.tiltAngleDeg ?? 30}
                onChange={(e) => updateSolar({ tiltAngleDeg: Math.max(0, Math.min(85, Number(e.target.value) || 30)) })}
              />
            </label>
            <label className="cad-field">
              <span>Efficiency <small>%</small></span>
              <input
                type="number"
                min={10}
                max={30}
                step={0.5}
                value={solar.panelEfficiencyPct ?? 21.5}
                onChange={(e) => updateSolar({ panelEfficiencyPct: Math.max(10, Number(e.target.value) || 21.5) })}
              />
            </label>
          </div>
          <label className="cad-field">
            <span>Mounting Frame</span>
            <select
              value={solar.mountingType || "UnistrutElevated"}
              onChange={(e) => updateSolar({ mountingType: e.target.value as any })}
            >
              <option value="UnistrutElevated">Elevated Racking (Snow Clear)</option>
              <option value="FlushMount">Flush Roof Clamp</option>
              <option value="BallastedRacking">Heavy Ballasted</option>
            </select>
          </label>
          <div className="cad-property-summary">
            <span>{totalKw} kWp Rated</span>
            <span>{totalArea} m² Collector</span>
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
  const pane = windowItem.solarPane || {
    enabled: false,
    transparencyPct: 30,
    powerDensityWpM2: 90,
    efficiencyPct: 12.5,
    shgc: 0.35,
    uValue: 1.20,
  };
  const isEnabled = pane.enabled === true;
  const wArea = ((windowItem.width || 1.4) * (windowItem.height || 1.2)).toFixed(2);
  const peakW = (Number(wArea) * (pane.powerDensityWpM2 ?? 90)).toFixed(1);

  const updatePane = (patch: Partial<WindowSolarPaneConfig>) => {
    onUpdateWindow({
      solarPane: {
        ...pane,
        ...patch,
      },
    });
  };

  return (
    <div className="mt-3 rounded-lg border border-sky-500/40 bg-sky-500/10 p-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
          <Zap className="size-3.5 text-sky-400" />
          BIPV Solar Pane Glazing
        </span>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => updatePane({ enabled: e.target.checked })}
            className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
          />
          {isEnabled ? "Active" : "Off"}
        </label>
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

export function PropertyInspector({
  model,
  selected,
  currentStep = 0,
  onSelect,
  onUpdate,
  onSimulate,
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

          <p className="cad-subhead mt-2">Layer Stack (Exterior → Interior)</p>
          <div className="cad-layer-stack">
            {wall.layers.map((layer, index) => (
              <div key={`${layer.materialId}-${index}`}>
                <span>{layer.name || layer.materialId}</span>
                <strong>{Math.round(layer.thickness * 1000)} mm</strong>
              </div>
            ))}
          </div>

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
          <p className="cad-subhead mt-2">Insulation & Sheathing Layers</p>
          <div className="cad-layer-stack">
            {model.envelope.roof.layers.map((layer, index) => (
              <div key={`${layer.materialId}-${index}`}>
                <span>{layer.name || layer.materialId}</span>
                <strong>{Math.round(layer.thickness * 1000)} mm</strong>
              </div>
            ))}
          </div>
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
          <p className="cad-subhead mt-2">Foundation & Insulation Layers</p>
          <div className="cad-layer-stack">
            {model.envelope.floor.layers.map((layer, index) => (
              <div key={`${layer.materialId}-${index}`}>
                <span>{layer.name || layer.materialId}</span>
                <strong>{Math.round(layer.thickness * 1000)} mm</strong>
              </div>
            ))}
          </div>
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

        <p className="cad-subhead mt-3">Active Facade Layers ({activeWall})</p>
        <div className="cad-layer-stack">
          {wall.layers.map((layer, index) => (
            <div key={`${layer.materialId}-${index}`}>
              <span>{layer.name || layer.materialId}</span>
              <strong>{Math.round(layer.thickness * 1000)} mm</strong>
            </div>
          ))}
        </div>

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
        <p className="cad-subhead mt-3">Roof Layer Stack</p>
        <div className="cad-layer-stack">
          {model.envelope.roof.layers.map((layer, index) => (
            <div key={`${layer.materialId}-${index}`}>
              <span>{layer.name || layer.materialId}</span>
              <strong>{Math.round(layer.thickness * 1000)} mm</strong>
            </div>
          ))}
        </div>
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
        <p className="cad-subhead mt-3">Foundation Layers</p>
        <div className="cad-layer-stack">
          {model.envelope.floor.layers.map((layer, index) => (
            <div key={`${layer.materialId}-${index}`}>
              <span>{layer.name || layer.materialId}</span>
              <strong>{Math.round(layer.thickness * 1000)} mm</strong>
            </div>
          ))}
        </div>
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
