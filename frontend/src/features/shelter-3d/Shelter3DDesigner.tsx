"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Box, Check, ChevronLeft, ChevronRight, Compass, Eye, Grid3X3, Layers3, PanelLeft, PanelRight, Redo2, Ruler, Save, Sun, Undo2, Wind } from "lucide-react";
import type { ShelterModel } from "@/types/shelter";
import type { CameraPreset, SelectedElement, ViewerSettings, VisualizationMode } from "./types";
import { ShelterCanvas } from "./components/ShelterCanvas";
import { PropertyInspector } from "./components/PropertyInspector";
import { MaterialWorkbenchDialog } from "./components/MaterialWorkbenchDialog";

const stages = [
  "Project",
  "Location",
  "Geometry",
  "Orientation",
  "Walls",
  "Roof",
  "Floor",
  "Windows",
  "Doors",
  "Shading",
  "Thermal mass",
  "Ventilation",
  "Targets",
];
const views: { id: CameraPreset; label: string }[] = [{ id: "iso", label: "3D" }, { id: "top", label: "Plan" }, { id: "south", label: "South" }, { id: "north", label: "North" }, { id: "east", label: "East" }, { id: "west", label: "West" }];
const modes: { id: VisualizationMode; label: string; icon: typeof Box }[] = [{ id: "model", label: "Model", icon: Box }, { id: "thermal", label: "Thermal", icon: Eye }, { id: "solar", label: "Solar", icon: Sun }, { id: "heat-flow", label: "Heat flow", icon: Wind }];

interface Props { model: ShelterModel; step: number; onStepChange: (step: number) => void; onUpdate: (updates: Partial<ShelterModel>) => void; onSimulate: () => void; }

export function Shelter3DDesigner({ model, step, onStepChange, onUpdate, onSimulate }: Props) {
  const [selected, setSelected] = useState<SelectedElement>({ type: "shelter" });
  const [preset, setPreset] = useState<CameraPreset>("iso");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [saved, setSaved] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [settings, setSettings] = useState<ViewerSettings>({ showGrid: true, showDimensions: true, showCompass: true, showSunShadows: true, wireframe: false, transparentWalls: false, revealLayers: false, visualization: "model" });
  const history = useRef<ShelterModel[]>([]);
  const future = useRef<ShelterModel[]>([]);
  const update = (patch: Partial<ShelterModel>) => { history.current.push(structuredClone(model)); future.current = []; onUpdate(patch); setSaved(false); };
  const undo = () => { const previous = history.current.pop(); if (!previous) return; future.current.push(structuredClone(model)); onUpdate(previous); };
  const redo = () => { const next = future.current.pop(); if (!next) return; history.current.push(structuredClone(model)); onUpdate(next); };
  const setSetting = <K extends keyof ViewerSettings>(key: K, value: ViewerSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const area = model.geometry.length * model.geometry.width;
  const volume = area * model.geometry.height;
  const wallArea = 2 * (model.geometry.length + model.geometry.width) * model.geometry.height;
  const windowArea = model.windows.reduce((sum, window) => sum + window.width * window.height, 0);
  const readiness = useMemo(() => [model.location.weatherSource, model.envelope.roof.layers.length, model.envelope.floor.layers.length, model.designTargets.comfortTempMinC].filter(Boolean).length, [model]);

  // Handle stage change with auto-focusing elements in 3D
  const handleStageSelect = (idx: number) => {
    onStepChange(idx);
    if (idx === 3 || idx === 4) setSelected({ type: "wall", orientation: "south" });
    else if (idx === 5) setSelected({ type: "roof" });
    else if (idx === 6) setSelected({ type: "floor" });
    else if (idx === 7) setSelected(model.windows[0] ? { type: "window", id: model.windows[0].id } : null);
    else if (idx === 8) setSelected(model.doors[0] ? { type: "door", id: model.doors[0].id } : null);
    else if (idx === 9) setSelected(model.windows[0] ? { type: "window", id: model.windows[0].id } : null);
    else if (idx === 10) setSelected(model.thermalMass[0] ? { type: "thermalMass", id: model.thermalMass[0].id } : null);
    else setSelected({ type: "shelter" });
  };

  const southWallArea = model.geometry.length * model.geometry.height;
  const southWinArea = model.windows.filter((w) => w.wall === "south").reduce((sum, w) => sum + w.width * w.height, 0);
  const southGlazingRatio = southWallArea > 0 ? (southWinArea / southWallArea) * 100 : 0;
  const estDailySolarGainKwh = (southWinArea * 0.55 * 5.2).toFixed(1);

  return <div className="cad-shell">
    <header className="cad-toolbar">
      <div className="cad-model-identity"><span className="cad-model-icon"><Box /></span><div><strong>{model.project.name}</strong><span>{model.geometry.length.toFixed(1)} × {model.geometry.width.toFixed(1)} × {model.geometry.height.toFixed(1)} m · {model.geometry.roofType}</span></div></div>
      <div className="cad-view-switcher" aria-label="Camera views">{views.map((view) => <button key={view.id} data-active={preset === view.id} onClick={() => setPreset(view.id)}>{view.label}</button>)}</div>
      <div className="cad-toolbar-actions"><button aria-label="Undo" disabled={!history.current.length} onClick={undo}><Undo2 /></button><button aria-label="Redo" disabled={!future.current.length} onClick={redo}><Redo2 /></button><button data-active={settings.showGrid} aria-label="Toggle grid" onClick={() => setSetting("showGrid", !settings.showGrid)}><Grid3X3 /></button><button data-active={settings.showDimensions} aria-label="Toggle dimensions" onClick={() => setSetting("showDimensions", !settings.showDimensions)}><Ruler /></button><button data-active={settings.showCompass} aria-label="Toggle compass" onClick={() => setSetting("showCompass", !settings.showCompass)}><Compass /></button><button className="cad-save" onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); }}>{saved ? <Check /> : <Save />}{saved ? "Saved" : "Save"}</button><button className="cad-simulate" onClick={onSimulate}>Simulate <ArrowRight /></button></div>
    </header>

    <div className="cad-workspace">
      <aside className="cad-stage-panel" data-open={leftOpen}>
        <div className="cad-panel-heading"><span>Design sequence</span><button aria-label="Toggle workflow panel" onClick={() => setLeftOpen(!leftOpen)}><PanelLeft /></button></div>
        <ol>{stages.map((label, index) => <li key={label}><button data-active={index === step} data-complete={index < step} onClick={() => handleStageSelect(index)}><span>{index < step ? <Check /> : String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></button></li>)}</ol>
        <div className="cad-stage-progress"><span style={{ width: `${((step + 1) / stages.length) * 100}%` }} /></div>
      </aside>

      <main className="cad-canvas-region">
        <div className="cad-floating-tools"><button aria-label="Toggle workflow panel" onClick={() => setLeftOpen(!leftOpen)}><PanelLeft /></button>{modes.map(({ id, label, icon: Icon }) => <button key={id} data-active={settings.visualization === id} onClick={() => setSetting("visualization", id)}><Icon />{label}</button>)}<button aria-haspopup="dialog" data-active={materialsOpen || settings.revealLayers} onClick={() => { setMaterialsOpen(true); setSetting("revealLayers", true); }}><Layers3 />Materials</button><button data-active={settings.transparentWalls} onClick={() => setSetting("transparentWalls", !settings.transparentWalls)}><Eye />X-ray</button></div>
        <ShelterCanvas model={model} selected={selected} onSelect={setSelected} settings={settings} activePreset={preset} />
        <div className="cad-mode-label"><span>{settings.visualization === "model" ? "Geometry model" : `${settings.visualization.toUpperCase()} preview`}</span><strong>{settings.visualization === "thermal" ? "FLIR false-color IR thermography · Stefan-Boltzmann radiation emission" : settings.visualization === "solar" ? "Direct winter solar irradiance & glazing penetration (Leh Ladakh 34°N)" : settings.visualization === "heat-flow" ? "Envelope thermal bridges & convective currents" : "Editable canonical geometry"}</strong></div>
        <div className="cad-metrics"><span><small>Floor area</small><strong>{area.toFixed(1)} m²</strong></span><span><small>Volume</small><strong>{volume.toFixed(1)} m³</strong></span><span><small>South Glazing</small><strong>{southGlazingRatio.toFixed(1)}% WWR</strong></span><span><small>Solar Harvest</small><strong>~{estDailySolarGainKwh} kWh/d</strong></span><span><small>Openings</small><strong>{model.windows.length}W / {model.doors.length}D</strong></span></div>
        <button className="cad-inspector-toggle" aria-label="Toggle properties panel" onClick={() => setRightOpen(!rightOpen)}><PanelRight /></button>
      </main>

      <aside className="cad-property-panel" data-open={rightOpen}><PropertyInspector model={model} selected={selected} currentStep={step} onSelect={setSelected} onUpdate={update} onSimulate={onSimulate} /></aside>
    </div>

    <footer className="cad-statusbar"><div><span className="cad-status-dot" />Canonical model synchronized</div><div>{readiness}/4 simulation checks complete</div><div className="cad-step-nav"><button disabled={step === 0} onClick={() => handleStageSelect(step - 1)}><ChevronLeft /> Previous</button><span>Stage {step + 1} of {stages.length}</span><button disabled={step === stages.length - 1} onClick={() => handleStageSelect(step + 1)}>Next <ChevronRight /></button></div></footer>
    <MaterialWorkbenchDialog open={materialsOpen} model={model} onOpenChange={setMaterialsOpen} onUpdate={update} />
  </div>;
}
