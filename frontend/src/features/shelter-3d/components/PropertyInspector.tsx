"use client";

import { X, Plus, Trash2 } from "lucide-react";
import type { ShelterModel, WindowModel, DoorModel } from "@/types/shelter";
import type { SelectedElement, WallOrientation } from "../types";

interface Props { model: ShelterModel; selected: SelectedElement; onSelect: (value: SelectedElement) => void; onUpdate: (updates: Partial<ShelterModel>) => void; }

function NumberField({ label, value, unit, min = 0, max = 100, step = .1, onChange }: { label: string; value: number; unit: string; min?: number; max?: number; step?: number; onChange: (value: number) => void }) {
  return <label className="cad-field"><span>{label}<small>{unit}</small></span><input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function SectionTitle({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return <div className="cad-inspector-title"><div><span>{eyebrow}</span><h3>{title}</h3></div><button aria-label="Close inspector selection" onClick={onClose}><X /></button></div>;
}

export function PropertyInspector({ model, selected, onSelect, onUpdate }: Props) {
  const updateGeometry = (key: keyof ShelterModel["geometry"], value: number | string) => onUpdate({ geometry: { ...model.geometry, [key]: value } });
  const updateWindow = (id: string, patch: Partial<WindowModel>) => onUpdate({ windows: model.windows.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateDoor = (id: string, patch: Partial<DoorModel>) => onUpdate({ doors: model.doors.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const close = () => onSelect(null);

  if (!selected || selected.type === "shelter") return <div className="cad-inspector-content"><SectionTitle eyebrow="Model properties" title="Shelter envelope" onClose={close} /><div className="cad-field-grid"><NumberField label="Length" value={model.geometry.length} unit="m" min={2} max={30} onChange={(v) => updateGeometry("length", v)} /><NumberField label="Width" value={model.geometry.width} unit="m" min={2} max={30} onChange={(v) => updateGeometry("width", v)} /><NumberField label="Height" value={model.geometry.height} unit="m" min={2} max={12} onChange={(v) => updateGeometry("height", v)} /><NumberField label="Orientation" value={model.geometry.orientation} unit="deg" min={0} max={359} step={5} onChange={(v) => updateGeometry("orientation", v)} /></div><label className="cad-field"><span>Roof type<small>form</small></span><select aria-label="Roof type" value={model.geometry.roofType} onChange={(e) => updateGeometry("roofType", e.target.value)}><option>Flat</option><option>Shed</option><option>Gable</option></select></label><NumberField label="Roof pitch" value={model.geometry.roofAngle} unit="deg" max={60} step={1} onChange={(v) => updateGeometry("roofAngle", v)} /></div>;

  if (selected.type === "wall") {
    const wall = model.envelope.walls[selected.orientation];
    const span = ["north", "south"].includes(selected.orientation) ? model.geometry.length : model.geometry.width;
    const addOpening = (type: "window" | "door") => {
      if (type === "window") onUpdate({ windows: [...model.windows, { id: `win-${Date.now()}`, wall: selected.orientation, positionX: span * .3, width: 1.4, height: 1.2, sillHeight: .9, glazingType: "Double_LowE_Argon", frameType: "UPVC_Insulated", shadingOverhang: .35 }] });
      else onUpdate({ doors: [...model.doors, { id: `door-${Date.now()}`, wall: selected.orientation, positionX: span * .15, width: .95, height: 2.1, construction: "Insulated timber door", airTightness: "HighPerformance_Airtight" }] });
    };
    return <div className="cad-inspector-content"><SectionTitle eyebrow="Envelope element" title={`${selected.orientation} wall`} onClose={close} /><div className="cad-property-summary"><span>{(span * model.geometry.height).toFixed(1)} m² gross</span><span>{wall.layers.reduce((sum, layer) => sum + layer.thickness, 0) * 1000} mm</span></div><p className="cad-subhead">Construction assembly</p><div className="cad-layer-stack">{wall.layers.map((layer, index) => <div key={`${layer.materialId}-${index}`}><span>{layer.name || layer.materialId}</span><strong>{Math.round(layer.thickness * 1000)} mm</strong></div>)}</div><div className="cad-action-grid"><button onClick={() => addOpening("window")}><Plus /> Add window</button><button onClick={() => addOpening("door")}><Plus /> Add door</button></div></div>;
  }

  if (selected.type === "roof") return <div className="cad-inspector-content"><SectionTitle eyebrow="Envelope element" title="Roof assembly" onClose={close} /><NumberField label="Pitch" value={model.geometry.roofAngle} unit="deg" max={60} step={1} onChange={(v) => updateGeometry("roofAngle", v)} /><NumberField label="Overhang" value={model.envelope.roof.overhang} unit="m" max={2} onChange={(v) => onUpdate({ envelope: { ...model.envelope, roof: { ...model.envelope.roof, overhang: v } } })} /><div className="cad-layer-stack">{model.envelope.roof.layers.map((layer, index) => <div key={`${layer.materialId}-${index}`}><span>{layer.name || layer.materialId}</span><strong>{Math.round(layer.thickness * 1000)} mm</strong></div>)}</div></div>;
  if (selected.type === "floor") return <div className="cad-inspector-content"><SectionTitle eyebrow="Envelope element" title="Ground floor" onClose={close} /><div className="cad-property-summary"><span>{(model.geometry.length * model.geometry.width).toFixed(1)} m²</span><span>{model.envelope.floor.groundContact ? "Ground contact" : "Suspended"}</span></div><div className="cad-layer-stack">{model.envelope.floor.layers.map((layer, index) => <div key={`${layer.materialId}-${index}`}><span>{layer.name || layer.materialId}</span><strong>{Math.round(layer.thickness * 1000)} mm</strong></div>)}</div></div>;
  if (selected.type === "window") { const item = model.windows.find((w) => w.id === selected.id); if (!item) return null; return <div className="cad-inspector-content"><SectionTitle eyebrow="Opening" title="Window" onClose={close} /><div className="cad-field-grid"><NumberField label="Width" value={item.width} unit="m" min={.3} max={5} onChange={(v) => updateWindow(item.id, { width: v })} /><NumberField label="Height" value={item.height} unit="m" min={.3} max={4} onChange={(v) => updateWindow(item.id, { height: v })} /><NumberField label="Sill" value={item.sillHeight} unit="m" max={3} onChange={(v) => updateWindow(item.id, { sillHeight: v })} /><NumberField label="Position" value={item.positionX} unit="m" max={30} onChange={(v) => updateWindow(item.id, { positionX: v })} /></div><button className="cad-delete" onClick={() => { onUpdate({ windows: model.windows.filter((w) => w.id !== item.id) }); close(); }}><Trash2 /> Delete window</button></div>; }
  if (selected.type === "door") { const item = model.doors.find((d) => d.id === selected.id); if (!item) return null; return <div className="cad-inspector-content"><SectionTitle eyebrow="Opening" title="Exterior door" onClose={close} /><div className="cad-field-grid"><NumberField label="Width" value={item.width} unit="m" min={.6} max={3} onChange={(v) => updateDoor(item.id, { width: v })} /><NumberField label="Height" value={item.height} unit="m" min={1.6} max={4} onChange={(v) => updateDoor(item.id, { height: v })} /><NumberField label="Position" value={item.positionX} unit="m" max={30} onChange={(v) => updateDoor(item.id, { positionX: v })} /></div><button className="cad-delete" onClick={() => { onUpdate({ doors: model.doors.filter((d) => d.id !== item.id) }); close(); }}><Trash2 /> Delete door</button></div>; }
  return null;
}
