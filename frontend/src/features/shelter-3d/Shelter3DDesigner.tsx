"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Eye,
  Sliders,
  Grid,
  Ruler,
  Compass,
  Play,
  RotateCcw,
  CheckCircle2,
  Maximize2,
  FileCode,
  Flame,
  Layers,
  Sparkles,
  ArrowRight,
  Shield,
  HelpCircle,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { ShelterModel, WindowModel, DoorModel } from "@/types/shelter";
import { SelectedElement, CameraPreset, ViewerSettings } from "./types";
import { ShelterCanvas } from "./components/ShelterCanvas";
import { ParametricSidebar } from "./components/ParametricSidebar";
import { PropertyInspector } from "./components/PropertyInspector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Shelter3DDesigner() {
  const router = useRouter();
  const { projects, activeProjectId, updateProject, setActiveProject } = useShelterStore();

  // Active project selection or fallback to first project
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Selected element in the 3D scene
  const [selected, setSelected] = useState<SelectedElement>(null);

  // Camera preset
  const [activePreset, setActivePreset] = useState<CameraPreset>("iso");

  // Visualizer settings
  const [settings, setSettings] = useState<ViewerSettings>({
    showGrid: true,
    showDimensions: true,
    showCompass: true,
    showSunShadows: true,
    wireframe: false,
    transparentWalls: false,
  });

  // Sidebar visibility on compact screens
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(true);

  if (!activeProject) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center space-y-4 text-center">
        <Box className="h-12 w-12 text-slate-500 animate-pulse" />
        <h2 className="text-xl font-bold text-white">No Active Shelter Project</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Please select or create a project to start interactive 3D parametric design.
        </p>
        <Button asChild>
          <Link href="/projects">Go to Projects</Link>
        </Button>
      </div>
    );
  }

  // Real-time mutations to ShelterModel
  const handleUpdateModel = (updates: Partial<ShelterModel>) => {
    updateProject(activeProject.id, updates);
  };

  const handleAddWindow = (newWin: WindowModel) => {
    const updatedWindows = [...activeProject.windows, newWin];
    handleUpdateModel({ windows: updatedWindows });
    setSelected({ type: "window", id: newWin.id });
  };

  const handleDeleteWindow = (id: string) => {
    const updatedWindows = activeProject.windows.filter((w) => w.id !== id);
    handleUpdateModel({ windows: updatedWindows });
    if (selected?.type === "window" && selected.id === id) {
      setSelected(null);
    }
  };

  const handleAddDoor = (newDoor: DoorModel) => {
    const updatedDoors = [...activeProject.doors, newDoor];
    handleUpdateModel({ doors: updatedDoors });
    setSelected({ type: "door", id: newDoor.id });
  };

  const handleDeleteDoor = (id: string) => {
    const updatedDoors = activeProject.doors.filter((d) => d.id !== id);
    handleUpdateModel({ doors: updatedDoors });
    if (selected?.type === "door" && selected.id === id) {
      setSelected(null);
    }
  };

  // Helper from Inspector to quick-add a window/door to clicked wall
  const handleAddWindowToWall = (wall: "north" | "south" | "east" | "west") => {
    const wallLength =
      wall === "north" || wall === "south"
        ? activeProject.geometry.length
        : activeProject.geometry.width;
    const newWin: WindowModel = {
      id: `win-${wall}-${Date.now().toString().slice(-4)}`,
      wall,
      positionX: Math.max(0.5, Number((wallLength * 0.35).toFixed(2))),
      width: 1.5,
      height: 1.2,
      sillHeight: 0.9,
      glazingType: "Double_LowE_Argon",
      frameType: "UPVC_Insulated",
      shadingOverhang: 0.4,
    };
    handleAddWindow(newWin);
  };

  const handleAddDoorToWall = (wall: "north" | "south" | "east" | "west") => {
    const wallLength =
      wall === "north" || wall === "south"
        ? activeProject.geometry.length
        : activeProject.geometry.width;
    const newDoor: DoorModel = {
      id: `door-${wall}-${Date.now().toString().slice(-4)}`,
      wall,
      positionX: Math.max(0.5, Number((wallLength * 0.2).toFixed(2))),
      width: 0.95,
      height: 2.1,
      construction: "Airtight Thermal Break Insulated Timber Door (U=1.2)",
      airTightness: "HighPerformance_Airtight",
    };
    handleAddDoor(newDoor);
  };

  // Real-time geometric summary calculations
  const { length, width, height } = activeProject.geometry;
  const floorArea = length * width;
  const grossVolume = length * width * height;
  const totalWindowArea = activeProject.windows.reduce((acc, w) => acc + w.width * w.height, 0);
  const totalWallArea = 2 * (length * height) + 2 * (width * height);
  const wwr = totalWallArea > 0 ? (totalWindowArea / totalWallArea) * 100 : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Box className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-tight">
                  {activeProject.project.name}
                </span>
                <Badge variant="outline" className="text-[10px] bg-sky-950/60 text-sky-400 border-sky-800/50 py-0">
                  Parametric 3D
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-emerald-950/60 text-emerald-400 border-emerald-800/50 py-0">
                  Single Source of Truth
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {activeProject.geometry.length}m × {activeProject.geometry.width}m × {activeProject.geometry.height}m · {activeProject.geometry.roofType} Roof
              </p>
            </div>
          </div>
        </div>

        {/* Viewport Camera Preset Selector */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-[11px] text-slate-500 px-2 font-medium">Views:</span>
          {(
            [
              { id: "iso", label: "3D Iso" },
              { id: "top", label: "Plan (Top)" },
              { id: "south", label: "South" },
              { id: "north", label: "North" },
              { id: "east", label: "East" },
              { id: "west", label: "West" },
            ] as const
          ).map((view) => (
            <button
              key={view.id}
              onClick={() => setActivePreset(view.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                activePreset === view.id
                  ? "bg-sky-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* View Options & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Overlay Toggles */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettings((s) => ({ ...s, showGrid: !s.showGrid }))}
              title="Toggle Ground Grid"
              className={`h-7 px-2 text-xs ${settings.showGrid ? "text-sky-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Grid className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline text-[11px]">Grid</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettings((s) => ({ ...s, showDimensions: !s.showDimensions }))}
              title="Toggle Dimensions"
              className={`h-7 px-2 text-xs ${settings.showDimensions ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Ruler className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline text-[11px]">Dims</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettings((s) => ({ ...s, showCompass: !s.showCompass }))}
              title="Toggle Compass Rose"
              className={`h-7 px-2 text-xs ${settings.showCompass ? "text-rose-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Compass className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline text-[11px]">Compass</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettings((s) => ({ ...s, wireframe: !s.wireframe }))}
              title="Toggle Wireframe Mode"
              className={`h-7 px-2 text-xs ${settings.wireframe ? "text-amber-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline text-[11px]">Wire</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettings((s) => ({ ...s, transparentWalls: !s.transparentWalls }))}
              title="Toggle X-Ray / Transparent Walls"
              className={`h-7 px-2 text-xs ${settings.transparentWalls ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline text-[11px]">X-Ray</span>
            </Button>
          </div>

          {/* Quick Simulation Link */}
          <Button
            size="sm"
            onClick={() => router.push(`/simulations?newWith=${activeProject.id}`)}
            className="h-8 gap-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-sky-900/30"
          >
            <Flame className="h-3.5 w-3.5 text-amber-300" />
            <span>Simulate Model</span>
          </Button>
        </div>
      </div>

      {/* 2. Main Studio Body */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Sidebar: Parametric Sliders & Opening Modals */}
        <div
          className={`absolute left-0 top-0 bottom-0 z-10 w-80 lg:relative transition-transform duration-200 border-r border-slate-800 bg-slate-900/95 backdrop-blur-md ${
            showSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full overflow-hidden flex flex-col">
            <ParametricSidebar
              model={activeProject}
              onUpdateModel={handleUpdateModel}
              onAddWindow={handleAddWindow}
              onAddDoor={handleAddDoor}
            />
          </div>
        </div>

        {/* Center: Interactive 3D Canvas */}
        <div className="relative flex-1 h-full w-full overflow-hidden">
          <ShelterCanvas
            model={activeProject}
            selected={selected}
            onSelect={setSelected}
            settings={settings}
            activePreset={activePreset}
          />

          {/* Bottom HUD: Real-time Live Metrics Overlay */}
          <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 px-3 py-2 rounded-xl text-[11px] shadow-xl">
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
              <span className="text-slate-400">Floor Area:</span>
              <span className="font-mono font-bold text-sky-300">{floorArea.toFixed(1)} m²</span>
            </div>
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
              <span className="text-slate-400">Internal Vol:</span>
              <span className="font-mono font-bold text-emerald-300">{grossVolume.toFixed(1)} m³</span>
            </div>
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
              <span className="text-slate-400">WWR:</span>
              <span className="font-mono font-bold text-indigo-300">{wwr.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Windows:</span>
              <span className="font-mono font-bold text-amber-300">{activeProject.windows.length}</span>
              <span className="text-slate-500 ml-1">Doors:</span>
              <span className="font-mono font-bold text-amber-300">{activeProject.doors.length}</span>
            </div>
          </div>

          {/* Bottom-right Interaction Guide Pill */}
          <div className="hidden md:flex absolute bottom-4 right-4 z-10 items-center gap-2 bg-slate-900/80 backdrop-blur-sm border border-slate-800/60 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-400">
            <span>🖱️ Left-click: Rotate / Select</span>
            <span>·</span>
            <span>Right-click: Pan</span>
            <span>·</span>
            <span>Scroll: Zoom</span>
          </div>
        </div>

        {/* Right Panel: Contextual Element Property Inspector */}
        <div
          className={`absolute right-0 top-0 bottom-0 z-10 w-80 lg:relative transition-transform duration-200 border-l border-slate-800 bg-slate-900/95 backdrop-blur-md overflow-y-auto p-4 ${
            showInspector ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}
        >
          <PropertyInspector
            model={activeProject}
            selected={selected}
            onClose={() => setSelected(null)}
            onDeleteWindow={handleDeleteWindow}
            onDeleteDoor={handleDeleteDoor}
            onAddWindowToWall={handleAddWindowToWall}
            onAddDoorToWall={handleAddDoorToWall}
          />
        </div>
      </div>
    </div>
  );
}
