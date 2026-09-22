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
} from "lucide-react";
import type { ShelterModel, WindowModel, DoorModel } from "@/types/shelter";
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

  // --- STAGE-AWARE CONTEXTUAL INSPECTOR (Follows currentStep 0 to 12) ---

  // Stage 0: Project Identity
  if (currentStep === 0) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 1 · Metadata" title="Project Identity" />
        <label className="cad-field">
          <span>Project Name</span>
          <input
            type="text"
            value={model.project.name}
            onChange={(e) =>
              onUpdate({ project: { ...model.project, name: e.target.value } })
            }
          />
        </label>
        <label className="cad-field">
          <span>Project Version</span>
          <input
            type="text"
            value={model.project.version}
            onChange={(e) =>
              onUpdate({ project: { ...model.project, version: e.target.value } })
            }
          />
        </label>
        <div className="cad-property-summary mt-2">
          <span>ID: {model.project.id}</span>
          <span>{model.project.tags?.join(" · ") || "High-Altitude"}</span>
        </div>
      </div>
    );
  }

  // Stage 1: Location & Climate
  if (currentStep === 1) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 2 · Site Boundary" title="Location & Climate" />
        <label className="cad-field">
          <span>Region / Sector</span>
          <input
            type="text"
            value={model.location.region}
            onChange={(e) =>
              onUpdate({ location: { ...model.location, region: e.target.value } })
            }
          />
        </label>
        <div className="cad-field-grid">
          <NumberField
            label="Elevation"
            value={model.location.elevation}
            unit="m"
            min={0}
            max={7000}
            onChange={(v) => onUpdate({ location: { ...model.location, elevation: v } })}
          />
          <NumberField
            label="Winter 99.6% Min"
            value={model.location.designTempWinter ?? -20.5}
            unit="°C"
            min={-50}
            max={10}
            onChange={(v) => onUpdate({ location: { ...model.location, designTempWinter: v } })}
          />
        </div>
        <div className="cad-property-summary mt-2">
          <span>{model.location.climateZone}</span>
          <span>EPW: {model.location.weatherSource?.split("/").pop() || "Leh ISHRAE"}</span>
        </div>
      </div>
    );
  }

  // Stage 2: Geometry & Dimensions
  if (currentStep === 2) {
    const area = model.geometry.length * model.geometry.width;
    const volume = area * model.geometry.height;
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 3 · Spatial Envelope" title="Geometry & Footprint" />
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
        <div className="cad-property-summary mt-2">
          <span>{area.toFixed(1)} m² Floor</span>
          <span>{volume.toFixed(1)} m³ Volume</span>
        </div>
      </div>
    );
  }

  // Stage 3: Orientation & Solar Azimuth
  if (currentStep === 3) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 4 · Solar Axis" title="Orientation & Azimuth" />
        <NumberField
          label="Building Azimuth"
          value={model.geometry.orientation}
          unit="deg"
          min={0}
          max={359}
          step={5}
          onChange={(v) => updateGeometry("orientation", v)}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            { label: "0° (True North)", val: 0 },
            { label: "90° (East)", val: 90 },
            { label: "180° (True South)", val: 180 },
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
        <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          Aligning primary glazing within ±15° of True South (180°) maximizes winter passive solar heat capture during severe Ladakh alpine freeze.
        </p>
      </div>
    );
  }

  // Stage 4: Wall Assemblies
  if (currentStep === 4) {
    const wall = model.envelope.walls[activeWall];
    const span = ["north", "south"].includes(activeWall) ? model.geometry.length : model.geometry.width;
    const totalThickMm = Math.round(wall.layers.reduce((sum, l) => sum + l.thickness, 0) * 1000);

    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 5 · Exterior Assemblies" title="Wall Construction" />
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

  // Stage 5: Roof
  if (currentStep === 5) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 6 · Overhead Envelope" title="Roof & Ceiling Assembly" />
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
      </div>
    );
  }

  // Stage 6: Floor Foundation
  if (currentStep === 6) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 7 · Subgrade Interface" title="Ground Floor Foundation" />
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

  // Stage 7: Windows
  if (currentStep === 7) {
    const totalWinArea = model.windows.reduce((sum, w) => sum + w.width * w.height, 0);
    const wallArea = 2 * (model.geometry.length + model.geometry.width) * model.geometry.height;
    const wwr = wallArea > 0 ? ((totalWinArea / wallArea) * 100).toFixed(1) : "0";

    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 8 · Solar Apertures" title="Windows & Glazing" />
        <div className="cad-property-summary">
          <span>{model.windows.length} Windows</span>
          <span>{wwr}% Total WWR</span>
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
              const sillHeight = 0.9; // 0.9 + 1.2 = 2.1m standard header
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

          {model.windows.filter((w) => w.wall === "south").length > 1 && (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
              onClick={() => {
                const southWins = model.windows.filter((w) => w.wall === "south");
                const distributed = distributeOpeningsEvenly(model.geometry.length, southWins);
                const posMap = new Map(distributed.map((d) => [d.id, d.positionX]));
                onUpdate({
                  windows: model.windows.map((w) =>
                    posMap.has(w.id) ? { ...w, positionX: posMap.get(w.id)! } : w
                  ),
                });
              }}
            >
              Evenly Distribute South Windows
            </button>
          )}
        </div>

        <p className="cad-subhead mt-3">Active Window Schedule</p>
        <div className="cad-layer-stack">
          {model.windows.map((w, idx) => (
            <div
              key={w.id}
              className="cursor-pointer hover:bg-secondary/40"
              onClick={() => onSelect({ type: "window", id: w.id })}
            >
              <span>
                #{idx + 1} {w.wall.toUpperCase()} · {w.width}×{w.height}m · Sill {w.sillHeight}m
              </span>
              <strong>{w.glazingType?.replace(/_/g, " ")}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Stage 8: Doors
  if (currentStep === 8) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 9 · Ingress & Air Barriers" title="Exterior Doors" />
        <div className="cad-property-summary">
          <span>{model.doors.length} Exterior Doors</span>
          <span>Airtight Rating</span>
        </div>

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
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-foreground bg-foreground py-2 text-xs font-semibold text-background shadow-sm hover:opacity-90"
        >
          <Plus className="size-3.5" /> + Add East Entry Door
        </button>

        <p className="cad-subhead mt-3">Active Door Schedule</p>
        <div className="cad-layer-stack">
          {model.doors.map((d, idx) => (
            <div
              key={d.id}
              className="cursor-pointer hover:bg-secondary/40"
              onClick={() => onSelect({ type: "door", id: d.id })}
            >
              <span>
                #{idx + 1} {d.wall.toUpperCase()} · {d.width}×{d.height}m
              </span>
              <strong>{d.airTightness}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Stage 9: Shading
  if (currentStep === 9) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 10 · Solar Cut-Off" title="Overhangs & Shading" />
        <NumberField
          label="South Roof Overhang"
          value={model.envelope.roof.overhang}
          unit="m"
          min={0.1}
          max={2.0}
          onChange={(v) =>
            onUpdate({ envelope: { ...model.envelope, roof: { ...model.envelope.roof, overhang: v } } })
          }
        />
        <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          In cold high-altitude Ladakh (Latitude ~34°N), an overhang of 0.4m–0.6m shades high summer sun (June noon altitude ~79°) while allowing deep winter penetration (December noon altitude ~32°).
        </p>
      </div>
    );
  }

  // Stage 10: Thermal Mass
  if (currentStep === 10) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 11 · Capacitive Flywheel" title="Internal Thermal Mass" />
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

  // Stage 11: Ventilation & Infiltration
  if (currentStep === 11) {
    return (
      <div className="cad-inspector-content">
        <SectionTitle eyebrow="Stage 12 · Fluid Air Exchange" title="Infiltration & Ventilation" />
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
          label="HRV Heat Recovery"
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
        <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          At -20°C outdoor freeze, reducing infiltration from 1.0 ACH to 0.25 ACH prevents over 45% of total building envelope heat loss.
        </p>
      </div>
    );
  }

  // Stage 12: Targets & Simulation Trigger
  return (
    <div className="cad-inspector-content">
      <SectionTitle eyebrow="Stage 13 · Simulation Engine" title="Comfort Targets & Execution" />
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
        <span>Engine: ThermoShelter Core</span>
        <span>Ready for Rerun</span>
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
