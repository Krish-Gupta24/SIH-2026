"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Box,
  Boxes,
  CalendarDays,
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
  SlidersHorizontal,
  Sparkles,
  Sun,
  Undo2,
  Mountain,
  UnfoldVertical,
  Wind,
  Moon,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { ShelterModel } from "@/types/shelter";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import type { CameraPreset, SelectedElement, ViewerSettings, VisualizationMode } from "./types";
import { calculateHourlyThermalStep } from "./thermal-physics";
import { daylightWindow, dayOfYearFromIsoDate } from "./sun-geometry";
import { ShelterCanvas } from "./components/ShelterCanvas";
import { PropertyInspector } from "./components/PropertyInspector";
import { MaterialWorkbenchDialog } from "./components/MaterialWorkbenchDialog";

const stages = [
  "Geometry",
  "Walls",
  "Roof",
  "Floor",
  "Windows & Doors",
  "Thermal mass",
  "Ventilation & Loads",
  "Targets",
  "Simulation",
];

// Grouped workflow phases for cleaner navigation
const workflowPhases = [
  { 
    id: "envelope", 
    label: "Building Envelope", 
    description: "Massing, walls, roof, and foundation slab",
    stages: [0, 1, 2, 3],
    icon: "🏗️"
  },
  { 
    id: "apertures", 
    label: "Apertures & Solar", 
    description: "Glazing openings, doors, and thermal storage",
    stages: [4, 5],
    icon: "🪟"
  },
  { 
    id: "climate", 
    label: "Indoor Climate", 
    description: "Ventilation, HRV, and internal heat gains",
    stages: [6],
    icon: "💨"
  },
  { 
    id: "performance", 
    label: "Performance & Simulation", 
    description: "Thermal targets & physics solver",
    stages: [7, 8],
    icon: "🎯"
  },
];
const views: { id: CameraPreset; label: string }[] = [{ id: "iso", label: "3D" }, { id: "top", label: "Plan" }, { id: "south", label: "South" }, { id: "north", label: "North" }, { id: "east", label: "East" }, { id: "west", label: "West" }];

const modes: {
  id: VisualizationMode;
  label: string;
  icon: typeof Box;
  description: string;
  activeClass: string;
}[] = [
  {
    id: "model",
    label: "3D Model",
    icon: Box,
    description: "Parametric CAD geometry & materials",
    activeClass: "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-600 shadow-xs",
  },
  {
    id: "thermal",
    label: "Thermal IR",
    icon: Eye,
    description: "24-Hour FLIR surface thermography",
    activeClass: "bg-amber-600 text-white border-amber-400 shadow-amber-500/30 shadow-md",
  },
  {
    id: "solar",
    label: "Solar Sun",
    icon: Sun,
    description: "Solstice solar arc & daylight shadows",
    activeClass: "bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-amber-500/30 shadow-md",
  },
  {
    id: "heat-flow",
    label: "Heat Flow",
    icon: Wind,
    description: "Envelope conduction flux & heat loss",
    activeClass: "bg-teal-600 text-white border-teal-400 shadow-teal-500/30 shadow-md",
  },
];

interface Props { model: ShelterModel; step: number; onStepChange: (step: number) => void; onUpdate: (updates: Partial<ShelterModel>) => void; onSimulate: () => void; }

export function Shelter3DDesigner({ model, step, onStepChange, onUpdate, onSimulate }: Props) {
  const [selected, setSelected] = useState<SelectedElement>({ type: "shelter" });
  const [preset, setPreset] = useState<CameraPreset>("iso");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [saved, setSaved] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  // Close view options when clicking outside
  useEffect(() => {
    if (!viewOptionsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewOptionsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [viewOptionsOpen]);

  const [openWorkflowGroup, setOpenWorkflowGroup] = useState(() => workflowPhases.find((phase) => phase.stages.includes(step))?.id ?? "envelope");

  // Keep open phase group synced when step changes externally
  useEffect(() => {
    const phase = workflowPhases.find((p) => p.stages.includes(step));
    if (phase) {
      setOpenWorkflowGroup(phase.id);
    }
  }, [step]);
  const [settings, setSettings] = useState<ViewerSettings>({
    showGrid: true,
    showDimensions: true,
    showCompass: true,
    showSunShadows: true,
    showEnvironment: true,
    explodedView: false,
    wireframe: false,
    transparentWalls: false,
    revealLayers: false,
    visualization: "model",
  });
  const [selectedHour, setSelectedHour] = useState(12);
  const [sunTime, setSunTime] = useState(12);
  const [solarDate, setSolarDate] = useState("2026-12-21");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [timelineMinimized, setTimelineMinimized] = useState(false);

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
    if (settings.visualization === "model") return null;
    return calculateHourlyThermalStep(
      model,
      selectedHour,
      activeSim?.results?.hourly
    );
  }, [model, selectedHour, activeSim, settings.visualization]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSunTime((previous) => {
        const next = (previous + 0.05 * playbackSpeed) % 24;
        const simulationHour = Math.round(next) % 24;
        setSelectedHour((current) => current === simulationHour ? current : simulationHour);
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

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
    const validIdx = Math.max(0, Math.min(stages.length - 1, idx));
    setOpenWorkflowGroup(workflowPhases.find((phase) => phase.stages.includes(validIdx))?.id ?? "envelope");
    onStepChange(validIdx);
    if (validIdx === 0) setSelected({ type: "shelter" });
    else if (validIdx === 1) setSelected({ type: "wall", orientation: "south" });
    else if (validIdx === 2) setSelected({ type: "roof" });
    else if (validIdx === 3) setSelected({ type: "floor" });
    else if (validIdx === 4) setSelected(model.windows[0] ? { type: "window", id: model.windows[0].id } : model.doors[0] ? { type: "door", id: model.doors[0].id } : { type: "shelter" });
    else if (validIdx === 5) setSelected(model.thermalMass[0] ? { type: "thermalMass", id: model.thermalMass[0].id } : { type: "shelter" });
    else if (validIdx === 6) setSelected({ type: "shelter" });
    else if (validIdx === 7) setSelected({ type: "shelter" });
    else setSelected({ type: "shelter" });
  };

  const toggleExplodedView = () => {
    const next = !settings.explodedView;
    setSettings((current) => ({
      ...current,
      explodedView: next,
      revealLayers: next ? true : current.revealLayers,
    }));
  };

  const setSolarTime = (hour: number) => {
    const normalized = (hour + 24) % 24;
    setSunTime(normalized);
    setSelectedHour(Math.round(normalized) % 24);
  };

  const formattedSolarTime = `${Math.floor(sunTime).toString().padStart(2, "0")}:${Math.round((sunTime % 1) * 60).toString().padStart(2, "0")}`;
  const siteDaylight = useMemo(() => daylightWindow({
    latitudeDeg: model.location?.latitude ?? 34.15,
    longitudeDeg: model.location?.longitude ?? 77.58,
    dayOfYear: dayOfYearFromIsoDate(solarDate),
  }), [model.location?.latitude, model.location?.longitude, solarDate]);
  const formatSolarHour = (hour: number) => {
    const normalized = ((hour % 24) + 24) % 24;
    const totalMinutes = Math.round(normalized * 60) % (24 * 60);
    return `${Math.floor(totalMinutes / 60).toString().padStart(2, "0")}:${(totalMinutes % 60).toString().padStart(2, "0")}`;
  };

  const southWallArea = model.geometry.length * model.geometry.height;
  const southWinArea = model.windows.filter((w) => w.wall === "south").reduce((sum, w) => sum + w.width * w.height, 0);
  const southGlazingRatio = southWallArea > 0 ? (southWinArea / southWallArea) * 100 : 0;
  const estDailySolarGainKwh = (southWinArea * 0.55 * 5.2).toFixed(1);

  return <div className="cad-shell">
    <header className="cad-toolbar">
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

    <div className="cad-workspace" data-left-open={leftOpen} data-right-open={rightOpen}>
      <aside className="cad-stage-panel" data-open={leftOpen}>
        <div className="cad-panel-heading">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <Layers3 className="size-4 text-sky-400" />
            <span>Workflow Sequence</span>
          </div>
          <button aria-label="Toggle workflow panel" onClick={() => setLeftOpen(!leftOpen)} title="Close workflow panel">
            <PanelLeft className="size-4" />
          </button>
        </div>
        <div className="cad-workflow-phases">
          {workflowPhases.map((phase) => {
            const isOpen = openWorkflowGroup === phase.id;
            const completed = phase.stages.filter((index) => index < step).length;
            const isActive = phase.stages.includes(step);
            return (
              <div key={phase.id} className="cad-workflow-phase" data-open={isOpen} data-active={isActive}>
                <button
                  type="button"
                  className="cad-phase-trigger"
                  onClick={() => setOpenWorkflowGroup(isOpen ? "" : phase.id)}
                  aria-expanded={isOpen}
                >
                  <span className="cad-phase-icon">{phase.icon}</span>
                  <div className="cad-phase-info">
                    <strong>{phase.label}</strong>
                    <small>{phase.description}</small>
                  </div>
                  <span className="cad-phase-progress">{completed}/{phase.stages.length}</span>
                </button>
                {isOpen && (
                  <ol className="cad-phase-stages">
                    {phase.stages.map((index) => (
                      <li key={stages[index]}>
                        <button data-active={index === step} data-complete={index < step} onClick={() => handleStageSelect(index)}>
                          <span className="cad-stage-marker">{index < step ? <Check className="size-3" /> : String(index + 1).padStart(2, "0")}</span>
                          <strong>{stages[index]}</strong>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
        <div className="cad-stage-progress">
          <div className="cad-progress-bar">
            <span style={{ width: `${((step + 1) / stages.length) * 100}%` }} />
          </div>
          <p className="cad-progress-text">Step {step + 1} of {stages.length} complete</p>
        </div>
      </aside>

      <main className="cad-canvas-region relative">
        <div className="cad-floating-tools" role="toolbar" aria-label="CAD Modes and Tools">
          {/* 1. Workflow Drawer Toggle */}
          <button
            type="button"
            aria-label="Toggle workflow panel"
            onClick={() => setLeftOpen(!leftOpen)}
            data-active={leftOpen}
            className="flex items-center gap-1.5"
            title="Toggle 9-stage engineering workflow drawer"
          >
            <Layers3 className="size-3.5 text-sky-400" />
            <span>Workflow</span>
          </button>

          <div className="h-4 w-px bg-white/20 mx-0.5 shrink-0 hidden sm:block" />

          {/* 2. 4 Dedicated Visualization Modes with Visible Tags & High Contrast */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
            {modes.map(({ id, label, icon: Icon, description, activeClass }) => {
              const isActive = settings.visualization === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-active={isActive}
                  onClick={() => setSetting("visualization", id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    isActive
                      ? `${activeClass} ring-1 ring-white/30 font-bold scale-[1.02]`
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                  title={`${label}: ${description}`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{label}</span>
                  {id === "thermal" && activeSim ? (
                    <span
                      className="size-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5 shrink-0"
                      title="24h physics simulation data loaded & active"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-white/20 mx-0.5 shrink-0 hidden sm:block" />

          {/* 3. Materials Assembly Studio */}
          <button
            type="button"
            aria-haspopup="dialog"
            data-active={materialsOpen}
            onClick={() => setMaterialsOpen(true)}
            className="flex items-center gap-1.5"
            title="Open Material Assembly Workbench"
          >
            <Layers3 className="size-3.5 text-amber-400" />
            <span>Materials</span>
          </button>

          {/* 4. Exploded Assembly View */}
          <button
            type="button"
            data-active={settings.explodedView}
            title="Exploded assembly view (reveals internal envelope layers)"
            onClick={toggleExplodedView}
            className="flex items-center gap-1.5"
          >
            <UnfoldVertical className="size-3.5" />
            <span>Exploded</span>
          </button>

          {/* 5. View Display Options Dropdown */}
          <div className="cad-view-options-wrap relative" ref={viewMenuRef}>
            <button
              type="button"
              data-active={viewOptionsOpen || settings.transparentWalls || settings.wireframe}
              aria-expanded={viewOptionsOpen}
              aria-controls="designer-view-options"
              onClick={() => setViewOptionsOpen((open) => !open)}
              className="flex items-center gap-1.5"
              title="Camera perspectives & display options"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>View</span>
            </button>
            {viewOptionsOpen ? (
              <div
                id="designer-view-options"
                className="cad-view-options absolute right-0 top-full mt-2 w-64 rounded-xl bg-slate-950/98 border border-white/20 p-2 shadow-2xl backdrop-blur-xl z-[1000] text-xs text-slate-200 divide-y divide-white/10"
                role="menu"
                aria-label="View options"
              >
                {/* Section A: Camera Perspectives */}
                <div className="pb-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Camera Perspectives
                  </p>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {views.map((v) => {
                      const isActive = preset === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setPreset(v.id);
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            isActive
                              ? "bg-sky-500/25 text-sky-300 font-bold border border-sky-400/40"
                              : "text-slate-300 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <span>{v.label}</span>
                          {isActive && <Check className="size-3 text-sky-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section B: Display Overlays */}
                <div className="pt-2 space-y-0.5">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Display Overlays
                  </p>
                  {[
                    { key: "showEnvironment" as const, label: "Site Context / Terrain", icon: Mountain },
                    { key: "showGrid" as const, label: "Coordinate Grid", icon: Grid3X3 },
                    { key: "showDimensions" as const, label: "CAD Dimensions", icon: Ruler },
                    { key: "showCompass" as const, label: "True North Compass", icon: Compass },
                    { key: "transparentWalls" as const, label: "X-Ray Enclosures", icon: Eye },
                    { key: "wireframe" as const, label: "Wireframe Mesh", icon: Boxes },
                  ].map(({ key, label, icon: Icon }) => {
                    const isActive = Boolean(settings[key]);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSetting(key, !isActive)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          isActive
                            ? "bg-white/15 text-white font-semibold"
                            : "text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="size-3.5 shrink-0 text-slate-300" />
                          <span>{label}</span>
                        </div>
                        <span
                          className={`size-2 rounded-full transition-colors ${
                            isActive ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" : "bg-slate-600"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <ShelterCanvas
          model={model}
          selected={selected}
          onSelect={setSelected}
          settings={settings}
          activePreset={preset}
          hourlyStep={hourlyStep}
          hasSimResults={Boolean(activeSim)}
          sunHour={sunTime}
          solarDate={solarDate}
          suppressHtmlLabels={materialsOpen}
        />

        {!activeSim &&
          (settings.visualization === "thermal" || settings.visualization === "heat-flow") && (
            <div className="absolute top-[4.25rem] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/90 backdrop-blur-md border border-amber-500/35 text-amber-200 text-xs shadow-xl pointer-events-auto whitespace-nowrap">
              <Clock className="size-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] font-medium">
                Sol-Air Physics Preview · Run simulation for measured CFD dataset
              </span>
              <button
                type="button"
                onClick={onSimulate}
                className="px-2.5 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10.5px] transition cursor-pointer shrink-0"
              >
                Simulate
              </button>
            </div>
          )}

        {!materialsOpen && settings.visualization !== "model" ? (
          timelineMinimized ? (
            <button
              type="button"
              onClick={() => setTimelineMinimized(false)}
              className="cad-timeline-minimized-pill"
              title="Expand 24h Diurnal Timeline"
            >
              {sunTime < 5.5 || sunTime > 20.5 ? (
                <Moon className="size-3.5 text-indigo-400" />
              ) : (
                <Sun className="size-3.5 text-amber-400" />
              )}
              <span>{hourlyStep?.timeLabel ?? formattedSolarTime} · 24h Timeline</span>
              <Maximize2 className="size-3 text-slate-400 ml-0.5" />
            </button>
          ) : (
            <div
              className="cad-timeline-scrubber"
              role="region"
              aria-label="24-Hour Diurnal Timeline"
            >
              {/* Row 1: Controls, Current Time & Telemetry Metrics */}
              <div className="cad-timeline-header-row">
                {/* Left: Play/Pause, Speed & Time Clock */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className={`cad-timeline-btn ${isPlaying ? "cad-timeline-btn-play" : ""}`}
                    aria-label={isPlaying ? "Pause timeline playback" : "Play 24h diurnal cycle"}
                    title={isPlaying ? "Pause daylight playback" : "Play smooth 24-hour diurnal cycle"}
                    onClick={() => setIsPlaying((p) => !p)}
                  >
                    {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    className="cad-timeline-quick-btn font-mono"
                    title={`Playback speed: ${playbackSpeed}x (Click to cycle)`}
                    onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                  >
                    {playbackSpeed}x
                  </button>

                  <div className="cad-timeline-time-display">
                    {sunTime < 5.5 || sunTime > 20.5 ? (
                      <Moon className="size-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <Sun className="size-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="cad-timeline-time-val font-mono">
                      {hourlyStep?.timeLabel ?? formattedSolarTime}
                    </span>
                    <span className="cad-timeline-phase-tag">
                      {sunTime < 5.5 || sunTime > 21
                        ? "Night Freeze"
                        : sunTime <= siteDaylight.sunrise + 1
                        ? "Dawn"
                        : sunTime >= siteDaylight.sunset - 1
                        ? "Dusk Cooling"
                        : sunTime < 11.5
                        ? "Morning Gain"
                        : sunTime < 13.5
                        ? "Solar Noon"
                        : "Afternoon"}
                    </span>
                  </div>
                </div>

                {/* Center: Live Zone Telemetry Badge */}
                <div className="flex items-center justify-center flex-1 min-w-0 px-2">
                  {hourlyStep ? (
                    <div className="cad-timeline-metrics-chip truncate flex items-center gap-2" title="Outdoor ambient freeze / Indoor zone temperature">
                      <span className="text-sky-300 font-mono">
                        ❄ {hourlyStep.outdoorTemp > 0 ? `+${hourlyStep.outdoorTemp}` : hourlyStep.outdoorTemp}°C
                      </span>
                      <span className="opacity-30">|</span>
                      <span className="text-emerald-400 font-semibold font-mono">
                        🏠 +{hourlyStep.indoorTemp}°C
                      </span>
                      {activeSim ? (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono hidden md:inline">
                          Simulated
                        </span>
                      ) : (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono hidden md:inline">
                          Sol-Air
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="cad-timeline-metrics-chip truncate" title={`Daylight duration: ${siteDaylight.durationHours.toFixed(1)}h`}>
                      <span>☀️ Daylight: {formatSolarHour(siteDaylight.sunrise)}–{formatSolarHour(siteDaylight.sunset)}</span>
                    </div>
                  )}
                </div>

                {/* Right: Quick Hour Jump Micro-Pills, Date Picker & Minimize */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <div className="cad-timeline-quick-hours hidden md:flex items-center gap-1">
                    {[
                      { h: 0, label: "00h", title: "Midnight Freeze" },
                      { h: 6, label: "06h", title: "Sunrise Dawn" },
                      { h: 12, label: "12h", title: "Peak Solar Noon" },
                      { h: 18, label: "18h", title: "Sunset Dusk" },
                    ].map((item) => (
                      <button
                        key={item.h}
                        type="button"
                        className="cad-timeline-quick-btn"
                        data-active={Math.abs(sunTime - item.h) < 0.3}
                        title={`Jump to ${item.title}`}
                        onClick={() => setSolarTime(item.h)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <label className="cad-timeline-date-btn" title={`Solar simulation date: ${solarDate}`}>
                    <CalendarDays className="size-3 text-slate-300" />
                    <input
                      type="date"
                      value={solarDate}
                      onChange={(e) => setSolarDate(e.target.value)}
                      aria-label="Solar simulation date"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setTimelineMinimized(true)}
                    className="cad-timeline-btn cad-timeline-min-btn shrink-0"
                    title="Minimize timeline"
                    aria-label="Minimize timeline"
                  >
                    <Minimize2 className="size-3" />
                  </button>
                </div>
              </div>

              {/* Row 2: Slender Scrubber Track with 24h Hour Marker Ticks */}
              <div className="cad-timeline-slider-row">
                <div className="cad-timeline-slider-wrap">
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="0.1"
                    value={sunTime}
                    onChange={(e) => setSolarTime(Number(e.target.value))}
                    className="cad-timeline-slider"
                    aria-label="Hour of day slider"
                  />
                </div>
                <div className="cad-timeline-ticks px-1 sm:px-1.5">
                  <span>00:00</span>
                  <span>03:00</span>
                  <span>06:00</span>
                  <span>09:00</span>
                  <span>12:00</span>
                  <span>15:00</span>
                  <span>18:00</span>
                  <span>21:00</span>
                  <span>24:00</span>
                </div>
              </div>
            </div>
          )
        ) : null}
        {!materialsOpen && settings.visualization === "model" && (
          <div className="cad-metrics">
            <span><small>Floor area</small><strong>{area.toFixed(1)} m²</strong></span>
            <span><small>Volume</small><strong>{volume.toFixed(1)} m³</strong></span>
            <span><small>South Glazing</small><strong>{southGlazingRatio.toFixed(1)}% WWR</strong></span>
            <span><small>Solar Harvest</small><strong>~{estDailySolarGainKwh} kWh/d</strong></span>
            <span><small>Openings</small><strong>{model.windows.length}W / {model.doors.length}D</strong></span>
          </div>
        )}
        <button
          className="cad-inspector-toggle"
          aria-label={rightOpen ? "Collapse inspector panel" : "Expand inspector panel"}
          title={rightOpen ? "Collapse inspector (maximize 3D canvas)" : "Show inspector panel"}
          data-open={rightOpen}
          onClick={() => setRightOpen(!rightOpen)}
        >
          <PanelRight className="size-4" />
        </button>
      </main>

      <aside className="cad-property-panel" data-open={rightOpen}>
        <PropertyInspector
          model={model}
          selected={selected}
          currentStep={step}
          onSelect={setSelected}
          onUpdate={update}
          onSimulate={onSimulate}
          onOpenMaterials={() => setMaterialsOpen(true)}
        />
      </aside>
    </div>

    <footer className="cad-statusbar">
      <div className="flex items-center gap-2">
        <span className="cad-status-dot" />
        <span className="font-semibold text-foreground/90 uppercase text-[10px] tracking-wider">
          {settings.visualization === "model" ? "3D Geometry Model" : `${settings.visualization.toUpperCase()} Mode`}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md">
          {settings.visualization === "thermal"
            ? "FLIR IR Thermography · Stefan-Boltzmann Radiation"
            : settings.visualization === "solar"
            ? `Solar Irradiance · ${model.location.region} · ${solarDate}`
            : settings.visualization === "heat-flow"
            ? "Envelope Thermal Bridges & ISO Conduction Map"
            : "Canonical Geometry Synchronized · Autosave Active"}
        </span>
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
