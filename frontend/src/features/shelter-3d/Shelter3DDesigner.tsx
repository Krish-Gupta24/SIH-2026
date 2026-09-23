"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Box,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  Grid3X3,
  Layers3,
  PanelLeft,
  PanelRight,
  Pause,
  Play,
  Redo2,
  Ruler,
  Save,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  Sun,
  Undo2,
  Wind,
} from "lucide-react";
import type { ShelterModel } from "@/types/shelter";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { step3dTo2d } from "@/lib/store/shelter-model-adapter";
import type { CameraPreset, SelectedElement, ViewerSettings, VisualizationMode } from "./types";
import { calculateHourlyThermalStep } from "./thermal-physics";
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
  const router = useRouter();
  const [selected, setSelected] = useState<SelectedElement>({ type: "shelter" });
  const [preset, setPreset] = useState<CameraPreset>("iso");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [saved, setSaved] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [settings, setSettings] = useState<ViewerSettings>({ showGrid: true, showDimensions: true, showCompass: true, showSunShadows: true, wireframe: false, transparentWalls: false, revealLayers: false, visualization: "model" });
  const [selectedHour, setSelectedHour] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);

  const simulations = useShelterStore((state) => state.simulations);
  const activeSim = useMemo(() => {
    return (
      simulations.find(
        (s) =>
          (s.projectId === model.project.id ||
            s.projectId === model.id ||
            s.shelterModel?.id === model.id ||
            s.shelterModel?.project?.id === model.project.id) &&
          s.status === "completed" &&
          Boolean(s.results)
      ) || null
    );
  }, [simulations, model.project.id, model.id]);

  const hourlyStep = useMemo(() => {
    if (settings.visualization === "model" || !activeSim) return null;
    return calculateHourlyThermalStep(
      model,
      selectedHour,
      activeSim?.results?.hourly
    );
  }, [model, selectedHour, activeSim, settings.visualization]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSelectedHour((prev) => (prev + 1) % 24);
    }, 1100);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Sync URL query parameter ?mode=thermal to auto-activate 3D thermal live inspection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      if (mode === "thermal" || mode === "solar" || mode === "heat-flow") {
        setSettings((s) => ({ ...s, visualization: mode as VisualizationMode }));
      }
    }
  }, []);

  const history = useRef<ShelterModel[]>([]);
  const future = useRef<ShelterModel[]>([]);
  const update = (patch: Partial<ShelterModel>) => { history.current.push(structuredClone(model)); future.current = []; onUpdate(patch); setSaved(false); };
  const undo = () => { const previous = history.current.pop(); if (!previous) return; future.current.push(structuredClone(model)); onUpdate(previous); };
  const redo = () => { const next = future.current.pop(); if (!next) return; history.current.push(structuredClone(model)); onUpdate(next); };
  const setSetting = <K extends keyof ViewerSettings>(key: K, value: ViewerSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  // Shortcut: Press W to toggle Wireframe, X for X-ray, G for Grid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "w" || e.key === "W") {
        setSettings((s) => ({ ...s, wireframe: !s.wireframe }));
      } else if (e.key === "x" || e.key === "X") {
        setSettings((s) => ({ ...s, transparentWalls: !s.transparentWalls }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
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
      <div className="cad-toolbar-actions">
        {activeSim ? (
          <button
            type="button"
            onClick={() => setSetting("visualization", "thermal")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 hover:bg-emerald-500/25 transition-all shadow-xs cursor-pointer mr-1"
            title="24h physics simulation dataset ready! Click to visualize dynamic thermal field."
          >
            <Sparkles className="size-3 text-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">✨ 24h Thermal Field Ready</span>
            <span className="sm:hidden">✨ 24h Ready</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSimulate}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 transition-all shadow-xs cursor-pointer mr-1"
            title="Simulation required to view 24-hour diurnal thermal heat flow"
          >
            <Clock className="size-3 text-amber-500" />
            <span className="hidden sm:inline">Simulation Required for 24h View</span>
            <span className="sm:hidden">Sim Required</span>
          </button>
        )}
        <button aria-label="Undo" disabled={!history.current.length} onClick={undo}><Undo2 /></button>
        <button aria-label="Redo" disabled={!future.current.length} onClick={redo}><Redo2 /></button>
        <button data-active={settings.showGrid} aria-label="Toggle grid" onClick={() => setSetting("showGrid", !settings.showGrid)}><Grid3X3 /></button>
        <button data-active={settings.showDimensions} aria-label="Toggle dimensions" onClick={() => setSetting("showDimensions", !settings.showDimensions)}><Ruler /></button>
        <button data-active={settings.showCompass} aria-label="Toggle compass" onClick={() => setSetting("showCompass", !settings.showCompass)}><Compass /></button>
        <button data-active={settings.wireframe} aria-label="Toggle wireframe" title="Toggle wireframe mode (W)" onClick={() => setSetting("wireframe", !settings.wireframe)}><Boxes /></button>
        <button
          className="cad-save"
          onClick={() => {
            onUpdate(model);
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2000);
          }}
          title="Persist model and sync to project library"
        >
          {saved ? <Check /> : <Save />}
          {saved ? "Saved" : "Save"}
        </button>
        <button className="cad-simulate" onClick={onSimulate}>Simulate <ArrowRight /></button>
      </div>
    </header>

    <div className="cad-workspace">
      <aside className="cad-stage-panel" data-open={leftOpen}>
        <div className="cad-panel-heading"><span>Design sequence</span><button aria-label="Toggle workflow panel" onClick={() => setLeftOpen(!leftOpen)}><PanelLeft /></button></div>
        <ol>{stages.map((label, index) => <li key={label}><button data-active={index === step} data-complete={index < step} onClick={() => handleStageSelect(index)}><span>{index < step ? <Check /> : String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></button></li>)}</ol>
        <div className="cad-stage-progress"><span style={{ width: `${((step + 1) / stages.length) * 100}%` }} /></div>
      </aside>

      <main className="cad-canvas-region relative">
        <div className="cad-floating-tools">
          <button aria-label="Toggle workflow panel" onClick={() => setLeftOpen(!leftOpen)}>
            <PanelLeft />
          </button>
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              data-active={settings.visualization === id}
              onClick={() => setSetting("visualization", id)}
              className="relative"
            >
              <Icon />
              {label}
              {id === "thermal" && activeSim ? (
                <span
                  className="size-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5"
                  title="24h physics simulation data loaded"
                />
              ) : null}
            </button>
          ))}
          <button
            aria-haspopup="dialog"
            data-active={materialsOpen || settings.revealLayers}
            onClick={() => {
              setMaterialsOpen(true);
              setSetting("revealLayers", true);
            }}
          >
            <Layers3 />
            Materials
          </button>
          <button
            data-active={settings.transparentWalls}
            onClick={() => setSetting("transparentWalls", !settings.transparentWalls)}
          >
            <Eye />
            X-ray
          </button>
          <button
            data-active={settings.wireframe}
            title="Toggle wireframe (W)"
            onClick={() => setSetting("wireframe", !settings.wireframe)}
          >
            <Boxes />
            Wireframe
          </button>
        </div>

        <ShelterCanvas
          model={model}
          selected={selected}
          onSelect={setSelected}
          settings={settings}
          activePreset={preset}
          hourlyStep={hourlyStep}
          hasSimResults={Boolean(activeSim)}
        />

        {!activeSim &&
          (settings.visualization === "thermal" ||
            settings.visualization === "heat-flow" ||
            settings.visualization === "solar") && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-foreground">Simulation Required for 24h Thermal View</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The 24-hour diurnal thermal heat map, surface thermography, and flux vectors require at least one completed physical simulation run for <strong>{model.project.name}</strong>.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSetting("visualization", "model")}
                    className="px-4 py-1.5 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-all cursor-pointer"
                  >
                    Return to 3D Model
                  </button>
                  <button
                    type="button"
                    onClick={onSimulate}
                    className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Play className="size-3.5 fill-black" /> Run Simulation Now
                  </button>
                </div>
              </div>
            </div>
          )}

        {activeSim &&
          hourlyStep &&
          (settings.visualization === "thermal" ||
            settings.visualization === "heat-flow" ||
            settings.visualization === "solar") ? (
          <div
            className="cad-timeline-scrubber"
            role="region"
            aria-label="24-Hour Diurnal Thermal Timeline"
          >
            <div className="cad-timeline-row-top">
              <div className="cad-timeline-controls">
                <button
                  type="button"
                  className="cad-timeline-btn"
                  aria-label="Previous hour"
                  title="Step back 1 hour"
                  onClick={() => setSelectedHour((h) => (h - 1 + 24) % 24)}
                >
                  <SkipBack className="size-3.5" />
                </button>
                <button
                  type="button"
                  className={`cad-timeline-btn ${isPlaying ? "cad-timeline-btn-play" : ""}`}
                  aria-label={isPlaying ? "Pause timeline playback" : "Play 24h diurnal cycle"}
                  title={isPlaying ? "Pause playback" : "Play 24h diurnal cycle (1h/sec)"}
                  onClick={() => setIsPlaying((p) => !p)}
                >
                  {isPlaying ? (
                    <Pause className="size-3.5" />
                  ) : (
                    <Play className="size-3.5 ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  className="cad-timeline-btn"
                  aria-label="Next hour"
                  title="Step forward 1 hour"
                  onClick={() => setSelectedHour((h) => (h + 1) % 24)}
                >
                  <SkipForward className="size-3.5" />
                </button>
                <span className="cad-timeline-chip font-bold text-amber-600 dark:text-amber-400">
                  <Clock className="size-3" />
                  {hourlyStep.timeLabel}
                </span>
              </div>

              <div className="cad-timeline-quick-hours">
                <span className="text-[10px] text-muted-foreground mr-1 hidden sm:inline">Jump:</span>
                {[
                  { h: 0, label: "00h Night" },
                  { h: 6, label: "06h Dawn" },
                  { h: 12, label: "12h Noon" },
                  { h: 18, label: "18h Dusk" },
                ].map((item) => (
                  <button
                    key={item.h}
                    type="button"
                    className="cad-timeline-quick-btn"
                    data-active={selectedHour === item.h}
                    onClick={() => setSelectedHour(item.h)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className="cad-timeline-chip"
                  style={{
                    background: activeSim
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(59, 130, 246, 0.12)",
                    color: activeSim ? "#059669" : "#2563eb",
                    borderColor: activeSim
                      ? "rgba(16, 185, 129, 0.28)"
                      : "rgba(59, 130, 246, 0.25)",
                  }}
                >
                  {activeSim ? "⚡ ThermoShelter Sim" : "📐 ISO 6946 Sol-Air"}
                </span>
              </div>
            </div>

            <div className="cad-timeline-slider-row">
              <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">00:00</span>
              <input
                type="range"
                min="0"
                max="23"
                step="1"
                value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                className="cad-timeline-slider"
                aria-label="Hour of day timeline slider"
              />
              <span className="text-[10px] font-mono text-muted-foreground w-7">23:00</span>

              <div className="hidden md:flex items-center gap-2 border-l border-slate-300 dark:border-slate-700 pl-3">
                <span className="cad-timeline-chip" title="Ambient outdoor Sol-Air temperature">
                  ❄ Out:{" "}
                  <strong className="ml-0.5">
                    {hourlyStep.outdoorTemp > 0
                      ? `+${hourlyStep.outdoorTemp}`
                      : hourlyStep.outdoorTemp}
                    °C
                  </strong>
                </span>
                <span className="cad-timeline-chip" title="Indoor living zone temperature">
                  🏠 In:{" "}
                  <strong className="ml-0.5">
                    {hourlyStep.indoorTemp > 0
                      ? `+${hourlyStep.indoorTemp}`
                      : hourlyStep.indoorTemp}
                    °C
                  </strong>
                </span>
                <span className="cad-timeline-chip" title="Aperture solar irradiance harvest">
                  ☀️ Sun: <strong className="ml-0.5">{hourlyStep.solarGainW} W</strong>
                </span>
              </div>
            </div>
          </div>
        ) : null}
        <div className="cad-mode-label"><span>{settings.visualization === "model" ? "Geometry model" : `${settings.visualization.toUpperCase()} preview`}</span><strong>{settings.visualization === "thermal" ? "FLIR false-color IR thermography · Stefan-Boltzmann radiation emission" : settings.visualization === "solar" ? "Direct winter solar irradiance & glazing penetration (Leh Ladakh 34°N)" : settings.visualization === "heat-flow" ? "Envelope thermal bridges & convective currents" : "Editable canonical geometry"}</strong></div>
        <div className="cad-metrics"><span><small>Floor area</small><strong>{area.toFixed(1)} m²</strong></span><span><small>Volume</small><strong>{volume.toFixed(1)} m³</strong></span><span><small>South Glazing</small><strong>{southGlazingRatio.toFixed(1)}% WWR</strong></span><span><small>Solar Harvest</small><strong>~{estDailySolarGainKwh} kWh/d</strong></span><span><small>Openings</small><strong>{model.windows.length}W / {model.doors.length}D</strong></span></div>
        <button className="cad-inspector-toggle" aria-label="Toggle properties panel" onClick={() => setRightOpen(!rightOpen)}><PanelRight /></button>
      </main>

      <aside className="cad-property-panel" data-open={rightOpen}><PropertyInspector model={model} selected={selected} currentStep={step} onSelect={setSelected} onUpdate={update} onSimulate={onSimulate} /></aside>
    </div>

    <footer className="cad-statusbar">
      <div className="flex items-center gap-2">
        <span className="cad-status-dot" />
        <span>Canonical model synchronized · Autosave Active</span>
      </div>
      <div>{readiness}/4 simulation checks complete</div>
      <div className="cad-step-nav">
        <button disabled={step === 0} onClick={() => handleStageSelect(step - 1)}>
          <ChevronLeft /> Previous
        </button>
        <span>Stage {step + 1} of {stages.length}</span>
        <button disabled={step === stages.length - 1} onClick={() => handleStageSelect(step + 1)}>
          Next <ChevronRight />
        </button>
      </div>
    </footer>
    <MaterialWorkbenchDialog open={materialsOpen} model={model} onOpenChange={setMaterialsOpen} onUpdate={update} />
  </div>;
}
