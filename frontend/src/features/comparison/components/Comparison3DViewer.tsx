"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Layers,
  Eye,
  Maximize2,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { SimulationJobItem } from "@/lib/store/use-shelter-store";
import { ShelterModel } from "@/types/shelter";
import type { CameraPreset, SelectedElement, ViewerSettings } from "@/features/shelter-3d/types";
import { TRACE_COLORS } from "./ConfigurationComparisonStrip";

// Dynamically import ShelterCanvas with ssr: false for Three.js WebGL stability
const ShelterCanvas = dynamic(
  () => import("@/features/shelter-3d/components/ShelterCanvas").then((mod) => mod.ShelterCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full min-h-[380px] items-center justify-center bg-secondary/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <span>Loading 3D Visual Physics Engine...</span>
        </div>
      </div>
    ),
  }
);

interface Comparison3DViewerProps {
  jobs: SimulationJobItem[];
}

export function Comparison3DViewer({ jobs }: Comparison3DViewerProps) {
  if (!jobs || jobs.length === 0) return null;

  // Active configuration tab index (default to Candidate 1 if available, or Baseline)
  const [selectedJobIndex, setSelectedJobIndex] = useState(jobs.length > 1 ? 1 : 0);
  const activeJob = jobs[selectedJobIndex] || jobs[0];
  const activeModel: ShelterModel = activeJob.shelterModel;

  // 3D Canvas States
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("iso");
  const [selectedElement, setSelectedElement] = useState<SelectedElement>({
    type: "wall",
    orientation: "south",
  });

  const [viewerSettings, setViewerSettings] = useState<ViewerSettings>({
    showGrid: true,
    showDimensions: false,
    showCompass: true,
    showSunShadows: true,
    showEnvironment: true,
    explodedView: false,
    wireframe: false,
    transparentWalls: false,
    revealLayers: true,
    visualization: "model",
  });

  // Extract selected component layer specs
  const getSelectedComponentDetails = () => {
    if (!activeModel?.envelope) {
      return {
        title: "Whole Shelter Envelope",
        uValue: 0.28,
        layers: [
          { name: "High-Altitude Composite Envelope", thickness: 0.25, k: 0.035, density: 1200 },
        ],
        thermalNote: "Balanced cold-climate envelope designed for sub-zero alpine conditions.",
      };
    }

    if (selectedElement?.type === "wall") {
      const orient = selectedElement.orientation;
      const wall = activeModel.envelope.walls?.[orient];
      const isSouth = orient === "south";
      const isTin = activeModel.id?.includes("tin");

      return {
        title: `${orient.toUpperCase()} Wall (${wall?.name || "Exterior Wall"})`,
        uValue: (wall as any)?.uValue ?? (isTin ? 3.2 : isSouth ? 0.28 : 0.24),
        heatCapacity: (wall as any)?.heatCapacity ?? (isTin ? 15 : isSouth ? 250 : 180),
        layers: wall?.layers?.length
          ? wall.layers.map((l: any) => ({
              name: l.name || "Insulation Layer",
              thickness: l.thickness || 0.15,
              k: (l as any).thermalConductivity ?? 0.035,
              density: (l as any).density ?? 1100,
            }))
          : [
              {
                name: isTin ? "Corrugated Galvanized Iron (CGI)" : "Expanded Polystyrene (EPS)",
                thickness: isTin ? 0.005 : 0.15,
                k: isTin ? 50.0 : 0.033,
                density: isTin ? 7850 : 25,
              },
              {
                name: isTin ? "Air Gap (Drafty)" : "Stabilized Rammed Earth Core",
                thickness: isTin ? 0.02 : 0.25,
                k: isTin ? 0.18 : 1.25,
                density: isTin ? 1.2 : 1950,
              },
            ],
        thermalNote: isTin
          ? "Uninsulated metal envelope conducts heat directly to sub-zero exterior with zero thermal inertia."
          : isSouth
          ? "300mm rammed earth mass acts as a passive solar battery, absorbing solar radiation during day and re-radiating warmth into the living space at night."
          : "Composite insulation barrier prevents convective and conductive frost penetration from northern winds.",
      };
    }

    if (selectedElement?.type === "roof") {
      const roof = activeModel.envelope.roof;
      const isTin = activeModel.id?.includes("tin");
      return {
        title: `Roof Shell (${roof?.name || "Standing Seam"})`,
        uValue: (roof as any)?.uValue ?? (isTin ? 4.1 : 0.16),
        heatCapacity: (roof as any)?.heatCapacity ?? (isTin ? 12 : 120),
        layers: roof?.layers?.length
          ? roof.layers.map((l: any) => ({
              name: l.name || "Roof Layer",
              thickness: l.thickness || 0.2,
              k: (l as any).thermalConductivity ?? 0.035,
              density: (l as any).density ?? 150,
            }))
          : [
              {
                name: isTin ? "Bare Corrugated Tin Sheet" : "Galvanized Standing Seam Metal",
                thickness: 0.005,
                k: 50.0,
                density: 7850,
              },
              {
                name: isTin ? "Uninsulated Joist" : "200mm High-Density EPS Insulation",
                thickness: isTin ? 0.01 : 0.2,
                k: isTin ? 0.15 : 0.033,
                density: isTin ? 500 : 28,
              },
            ],
        thermalNote: isTin
          ? "Massive thermal buoyancy loss as heated air escapes through uninsulated steel roof joints."
          : "200mm continuous insulation prevents thermal bridges and retains rising thermal buoyancy plumes.",
      };
    }

    if (selectedElement?.type === "floor") {
      const floor = activeModel.envelope.floor;
      const isTin = activeModel.id?.includes("tin");
      return {
        title: "Ground Floor Foundation & Slab",
        uValue: (floor as any)?.uValue ?? (isTin ? 2.8 : 0.2),
        heatCapacity: (floor as any)?.heatCapacity ?? (isTin ? 50 : 200),
        layers: [
          { name: "Heavy Concrete Slab on Grade", thickness: 0.15, k: 1.4, density: 2300 },
          { name: isTin ? "Uninsulated Earth Bed" : "Extruded Polystyrene Sub-Slab XPS", thickness: isTin ? 0.05 : 0.1, k: isTin ? 1.5 : 0.028, density: 35 },
        ],
        thermalNote: isTin
          ? "Uninsulated ground contact pulls heat continuously into frozen permafrost ground."
          : "Continuous sub-slab XPS thermal break decouples interior slab from freezing permafrost temperatures.",
      };
    }

    return {
      title: "South Glazed Solar Aperture",
      uValue: activeModel.id?.includes("tin") ? 5.8 : 1.4,
      heatCapacity: 45,
      layers: [
        { name: "Exterior Low-E Toughened Glass", thickness: 0.006, k: 0.9, density: 2500 },
        { name: "16mm Argon Gas Fill Gap (90%)", thickness: 0.016, k: 0.016, density: 1.7 },
        { name: "Interior Float Glass Layer", thickness: 0.006, k: 0.9, density: 2500 },
      ],
      thermalNote: "Double Low-E Argon glazing transmits 78% of incoming solar infrared rays while restricting conductive back-radiation.",
    };
  };

  const compDetails = getSelectedComponentDetails();

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="micro-label">Visual CAD Inspection</span>
          <h2 className="font-editorial text-xl sm:text-2xl font-medium tracking-tight text-foreground">
            3D Spatial & Envelope Inspection
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single polished 3D viewer with configuration switching. Select any wall or roof layer to inspect physical cross-sections.
          </p>
        </div>

        {/* Configuration Switching Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-full border border-border bg-secondary/50 self-start sm:self-center">
          {jobs.map((job, idx) => {
            const isSelected = idx === selectedJobIndex;
            const color = TRACE_COLORS[idx % TRACE_COLORS.length];
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobIndex(idx)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="truncate max-w-[140px]">
                  {idx === 0 ? "Baseline" : job.projectName.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 3D Workspace Grid: 3D Viewport (8 cols) + Component Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* 3D Viewport Box */}
        <div className="lg:col-span-8 rounded-[2rem] border border-border bg-slate-100 dark:bg-slate-900/60 overflow-hidden relative shadow-xs flex flex-col min-h-[460px]">
          {/* Viewport Top Bar Controls */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            {/* Camera Presets */}
            <div className="flex items-center gap-1 bg-card/90 backdrop-blur-md border border-border p-1 rounded-full shadow-md pointer-events-auto">
              {(["iso", "south", "north", "top"] as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCameraPreset(preset)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all ${
                    cameraPreset === preset
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* View Modes (Exploded, Wireframe) */}
            <div className="flex items-center gap-1 bg-card/90 backdrop-blur-md border border-border p-1 rounded-full shadow-md pointer-events-auto">
              <button
                type="button"
                onClick={() =>
                  setViewerSettings((s) => ({ ...s, explodedView: !s.explodedView }))
                }
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all ${
                  viewerSettings.explodedView
                    ? "bg-emerald-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {viewerSettings.explodedView ? "Exploded Active" : "Exploded View"}
              </button>
            </div>
          </div>

          {/* Interactive 3D Canvas */}
          <div className="flex-1 size-full min-h-[420px]">
            {activeModel && (
              <ShelterCanvas
                model={activeModel}
                selected={selectedElement}
                onSelect={setSelectedElement}
                settings={viewerSettings}
                activePreset={cameraPreset}
                solarDate="2026-01-15"
                sunHour={13}
                suppressHtmlLabels
              />
            )}
          </div>

          {/* Viewport Bottom Quick Component Selection Pills */}
          <div className="bg-card/90 backdrop-blur-md border-t border-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Select Envelope Face:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedElement({ type: "wall", orientation: "south" })}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all ${
                  selectedElement?.type === "wall" && selectedElement.orientation === "south"
                    ? "bg-foreground text-background border-foreground font-bold"
                    : "border-border text-muted-foreground hover:text-foreground bg-secondary/50"
                }`}
              >
                South Wall (Trombe)
              </button>
              <button
                type="button"
                onClick={() => setSelectedElement({ type: "wall", orientation: "north" })}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all ${
                  selectedElement?.type === "wall" && selectedElement.orientation === "north"
                    ? "bg-foreground text-background border-foreground font-bold"
                    : "border-border text-muted-foreground hover:text-foreground bg-secondary/50"
                }`}
              >
                North Wall
              </button>
              <button
                type="button"
                onClick={() => setSelectedElement({ type: "roof" })}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all ${
                  selectedElement?.type === "roof"
                    ? "bg-foreground text-background border-foreground font-bold"
                    : "border-border text-muted-foreground hover:text-foreground bg-secondary/50"
                }`}
              >
                Roof Shell
              </button>
              <button
                type="button"
                onClick={() => setSelectedElement({ type: "floor" })}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all ${
                  selectedElement?.type === "floor"
                    ? "bg-foreground text-background border-foreground font-bold"
                    : "border-border text-muted-foreground hover:text-foreground bg-secondary/50"
                }`}
              >
                Ground Slab
              </button>
            </div>
          </div>
        </div>

        {/* SIDE PANEL: Component Layer Inspector (4 cols) */}
        <div className="lg:col-span-4 rounded-[2rem] border border-border bg-card p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="micro-label">Envelope Material Stack</span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                U = {compDetails.uValue} W/m²K
              </span>
            </div>

            <h3 className="text-base font-bold text-foreground mt-3">
              {compDetails.title}
            </h3>

            {/* Layer Stack Visualizer */}
            <div className="mt-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Physical Layers (Exterior → Interior)
              </span>

              <div className="space-y-2">
                {compDetails.layers.map((layer: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/80 bg-secondary/20 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate">
                        {i + 1}. {layer.name}
                      </span>
                      <span className="font-mono text-muted-foreground text-[10px] shrink-0">
                        {Math.round(layer.thickness * 1000)} mm
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                      <span>k = {layer.k} W/m·K</span>
                      <span>·</span>
                      <span>ρ = {layer.density} kg/m³</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Thermal Impact Explanation */}
          <div className="pt-3 border-t border-border/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Info className="size-3.5 text-foreground" />
              <span>Thermal Function in this Model:</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {compDetails.thermalNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
