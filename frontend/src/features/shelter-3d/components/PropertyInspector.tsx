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

  const updateWindow = (id: string, patch: Partial<WindowModel>) =>
    onUpdate({
      windows: model.windows.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });

  const updateDoor = (id: string, patch: Partial<DoorModel>) =>
    onUpdate({
      doors: model.doors.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });

  const close = () => onSelect(null);

  // If a specific 3D mesh was explicitly selected in the canvas
  if (selected && selected.type !== "shelter") {
    if (selected.type === "wall") {
      const wall = model.envelope.walls[selected.orientation];
      const span = ["north", "south"].includes(selected.orientation)
        ? model.geometry.length
        : model.geometry.width;

      const addOpening = (type: "window" | "door") => {
        if (type === "window") {
          onUpdate({
            windows: [
              ...model.windows,
              {
                id: `win-${Date.now()}`,
                wall: selected.orientation,
                positionX: span * 0.3,
                width: 1.4,
                height: 1.2,
                sillHeight: 0.9,
                glazingType: "Double_LowE_Argon",
                frameType: "UPVC_Insulated",
                shadingOverhang: 0.35,
              },
            ],
          });
        } else {
          onUpdate({
            doors: [
              ...model.doors,
              {
                id: `door-${Date.now()}`,
                wall: selected.orientation,
                positionX: span * 0.15,
                width: 0.95,
                height: 2.1,
                construction: "Insulated timber door",
                airTightness: "HighPerformance_Airtight",
              },
            ],
          });
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
      return (
        <div className="cad-inspector-content">
          <SectionTitle eyebrow="Aperture Element" title="Window Inspector" onClose={close} />
          <div className="cad-field-grid">
            <NumberField
              label="Width"
              value={item.width}
              unit="m"
              min={0.3}
              max={5}
              onChange={(v) => updateWindow(item.id, { width: v })}
            />
            <NumberField
              label="Height"
              value={item.height}
              unit="m"
              min={0.3}
              max={4}
              onChange={(v) => updateWindow(item.id, { height: v })}
            />
            <NumberField
              label="Sill Height"
              value={item.sillHeight}
              unit="m"
              max={3}
              onChange={(v) => updateWindow(item.id, { sillHeight: v })}
            />
            <NumberField
              label="Position X"
              value={item.positionX}
              unit="m"
              max={30}
              onChange={(v) => updateWindow(item.id, { positionX: v })}
            />
          </div>
          <label className="cad-field mt-2">
            <span>Glazing Specification</span>
            <select
              value={item.glazingType}
              onChange={(e) => updateWindow(item.id, { glazingType: e.target.value as any })}
            >
              <option value="Triple_LowE_Krypton">Triple Low-E Krypton (U=0.8)</option>
              <option value="Double_LowE_Argon">Double Low-E Argon (U=1.4)</option>
              <option value="Single_Clear">Single Clear (Baseline U=5.8)</option>
            </select>
          </label>
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
      return (
        <div className="cad-inspector-content">
          <SectionTitle eyebrow="Aperture Element" title="Exterior Door Inspector" onClose={close} />
          <div className="cad-field-grid">
            <NumberField
              label="Width"
              value={item.width}
              unit="m"
              min={0.6}
              max={3}
              onChange={(v) => updateDoor(item.id, { width: v })}
            />
            <NumberField
              label="Height"
              value={item.height}
              unit="m"
              min={1.6}
              max={4}
              onChange={(v) => updateDoor(item.id, { height: v })}
            />
            <NumberField
              label="Position X"
              value={item.positionX}
              unit="m"
              max={30}
              onChange={(v) => updateDoor(item.id, { positionX: v })}
            />
          </div>
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

        <button
          type="button"
          onClick={() =>
            onUpdate({
              windows: [
                ...model.windows,
                {
                  id: `win-${Date.now()}`,
                  wall: "south",
                  positionX: model.geometry.length * 0.25,
                  width: 1.6,
                  height: 1.3,
                  sillHeight: 0.9,
                  glazingType: "Triple_LowE_Krypton",
                  frameType: "Wood_HighPerformance",
                  shadingOverhang: 0.45,
                },
              ],
            })
          }
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-foreground bg-foreground py-2 text-xs font-semibold text-background shadow-sm hover:opacity-90"
        >
          <Plus className="size-3.5" /> + Add South Solar Window
        </button>

        <p className="cad-subhead mt-3">Active Window Schedule</p>
        <div className="cad-layer-stack">
          {model.windows.map((w, idx) => (
            <div
              key={w.id}
              className="cursor-pointer hover:bg-secondary/40"
              onClick={() => onSelect({ type: "window", id: w.id })}
            >
              <span>
                #{idx + 1} {w.wall.toUpperCase()} · {w.width}×{w.height}m
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
          onClick={() =>
            onUpdate({
              doors: [
                ...model.doors,
                {
                  id: `door-${Date.now()}`,
                  wall: "east",
                  positionX: model.geometry.width * 0.2,
                  width: 0.95,
                  height: 2.1,
                  construction: "Insulated timber door",
                  airTightness: "HighPerformance_Airtight",
                },
              ],
            })
          }
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-foreground bg-foreground py-2 text-xs font-semibold text-background shadow-sm hover:opacity-90"
        >
          <Plus className="size-3.5" /> + Add Exterior Door
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
        <span>Engine: EnergyPlus 24.1.0</span>
        <span>Ready for Rerun</span>
      </div>

      <button
        type="button"
        onClick={onSimulate}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-xs font-bold text-background shadow-md transition hover:opacity-90"
      >
        <Play className="size-3.5 fill-current" /> Run EnergyPlus Simulation
      </button>
    </div>
  );
}
