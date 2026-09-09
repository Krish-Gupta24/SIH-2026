"use client";

import React from "react";
import {
  Layers,
  AppWindow,
  DoorOpen,
  X,
  Trash2,
  Plus,
  ShieldCheck,
  Thermometer,
  Compass,
  Square,
  Home,
  Grid,
} from "lucide-react";
import { ShelterModel } from "@/types/shelter";
import { SelectedElement } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PropertyInspectorProps {
  model: ShelterModel;
  selected: SelectedElement;
  onClose: () => void;
  onDeleteWindow: (id: string) => void;
  onDeleteDoor: (id: string) => void;
  onAddWindowToWall: (wall: "north" | "south" | "east" | "west") => void;
  onAddDoorToWall: (wall: "north" | "south" | "east" | "west") => void;
}

export function PropertyInspector({
  model,
  selected,
  onClose,
  onDeleteWindow,
  onDeleteDoor,
  onAddWindowToWall,
  onAddDoorToWall,
}: PropertyInspectorProps) {
  if (!selected) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-white font-bold">
          <Layers className="h-4 w-4 text-blue-400" />
          <span>Interactive Element Inspector</span>
        </div>
        <p className="text-[11px]">
          Click any wall, roof, floor slab, window, or door in the 3D scene to inspect thermal layers, dimensions, and EnergyPlus mappings.
        </p>
      </div>
    );
  }

  // 1. Wall Inspector
  if (selected.type === "wall") {
    const orient = selected.orientation;
    const wall = model.envelope.walls[orient];
    const wallLength = orient === "north" || orient === "south" ? model.geometry.length : model.geometry.width;
    const wallHeight = model.geometry.height;
    const grossArea = (wallLength * wallHeight).toFixed(2);

    const hostedWindows = (model.windows || []).filter((w) => w.wall === orient);
    const hostedDoors = (model.doors || []).filter((d) => d.wall === orient);

    return (
      <div className="rounded-xl border border-blue-500/30 bg-slate-900/90 backdrop-blur-md p-5 text-xs text-slate-300 space-y-4 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="cold" className="capitalize font-bold">
                {orient} Wall
              </Badge>
              <span className="font-mono text-slate-400 text-[11px]">{grossArea} m²</span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1">{wall.name || `${orient.toUpperCase()} Assembly`}</h4>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Wall Geometry Dimensions */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-lg">
          <div>
            <span className="text-slate-500">Span Length: </span>
            <span className="font-mono font-bold text-white">{wallLength.toFixed(2)} m</span>
          </div>
          <div>
            <span className="text-slate-500">Height: </span>
            <span className="font-mono font-bold text-white">{wallHeight.toFixed(2)} m</span>
          </div>
        </div>

        {/* Multi-layer Construction Spec */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase text-slate-400">Construction Layers</div>
          <div className="space-y-1">
            {wall.layers && wall.layers.length > 0 ? (
              wall.layers.map((lyr, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] bg-slate-950/40 p-2 rounded">
                  <span className="text-slate-200">{lyr.name || lyr.materialId}</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {(lyr.thickness * 1000).toFixed(0)} mm
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-500">Single composite wall assembly.</p>
            )}
          </div>
        </div>

        {/* Hosted Openings */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>Openings ({hostedWindows.length} win, {hostedDoors.length} door)</span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddWindowToWall(orient)}
                className="h-6 text-[10px] px-2 gap-1 text-amber-400 border-amber-500/30"
              >
                <Plus className="h-3 w-3" />
                Win
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddDoorToWall(orient)}
                className="h-6 text-[10px] px-2 gap-1 text-indigo-400 border-indigo-500/30"
              >
                <Plus className="h-3 w-3" />
                Door
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Roof Inspector
  if (selected.type === "roof") {
    const roof = model.envelope.roof;
    return (
      <div className="rounded-xl border border-blue-500/30 bg-slate-900/90 backdrop-blur-md p-5 text-xs text-slate-300 space-y-4 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="cold" className="font-bold">
                Roof Envelope
              </Badge>
              <span className="text-xs font-mono text-slate-400">
                {model.geometry.roofType} ({model.geometry.roofAngle}°)
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1">{roof.name || "Roof Assembly"}</h4>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-lg">
          <div>
            <span className="text-slate-500">Overhang: </span>
            <span className="font-mono font-bold text-white">{roof.overhang || 0.4} m</span>
          </div>
          <div>
            <span className="text-slate-500">Solar Abs.: </span>
            <span className="font-mono font-bold text-amber-400">{roof.solarAbsorptance || 0.7}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase text-slate-400">Roof Insulation Layers</div>
          <div className="space-y-1">
            {roof.layers && roof.layers.length > 0 ? (
              roof.layers.map((lyr, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] bg-slate-950/40 p-2 rounded">
                  <span className="text-slate-200">{lyr.name || lyr.materialId}</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {(lyr.thickness * 1000).toFixed(0)} mm
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-500">Composite insulated roof assembly.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Floor Inspector
  if (selected.type === "floor") {
    const floor = model.envelope.floor;
    const area = (model.geometry.length * model.geometry.width).toFixed(2);

    return (
      <div className="rounded-xl border border-blue-500/30 bg-slate-900/90 backdrop-blur-md p-5 text-xs text-slate-300 space-y-4 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <Badge variant="cold" className="font-bold">
              Ground Slab / Floor
            </Badge>
            <h4 className="text-sm font-bold text-white mt-1">{floor.name || "Insulated Floor Slab"}</h4>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-lg">
          <div>
            <span className="text-slate-500">Floor Area: </span>
            <span className="font-mono font-bold text-white">{area} m²</span>
          </div>
          <div>
            <span className="text-slate-500">Perimeter Ins.: </span>
            <span className="font-bold text-emerald-400">
              {floor.perimeterInsulation ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Window Inspector
  if (selected.type === "window") {
    const win = (model.windows || []).find((w) => w.id === selected.id);
    if (!win) return null;

    return (
      <div className="rounded-xl border border-amber-500/30 bg-slate-900/90 backdrop-blur-md p-5 text-xs text-slate-300 space-y-4 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="font-bold">
                Window
              </Badge>
              <span className="font-mono text-slate-400">{win.id}</span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1 capitalize">Host Wall: {win.wall}</h4>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-lg text-center">
          <div>
            <div className="text-slate-500">Width</div>
            <div className="font-mono font-bold text-white">{win.width} m</div>
          </div>
          <div>
            <div className="text-slate-500">Height</div>
            <div className="font-mono font-bold text-white">{win.height} m</div>
          </div>
          <div>
            <div className="text-slate-500">Sill</div>
            <div className="font-mono font-bold text-white">{win.sillHeight} m</div>
          </div>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Area:</span>
            <span className="font-mono font-bold text-white">{(win.width * win.height).toFixed(2)} m²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Glazing:</span>
            <span className="font-medium text-amber-400">{win.glazingType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Overhang Shading:</span>
            <span className="font-mono">{win.shadingOverhang || 0} m</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDeleteWindow(win.id)}
            className="gap-1 text-xs h-7"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Window
          </Button>
        </div>
      </div>
    );
  }

  // 5. Door Inspector
  if (selected.type === "door") {
    const door = (model.doors || []).find((d) => d.id === selected.id);
    if (!door) return null;

    return (
      <div className="rounded-xl border border-indigo-500/30 bg-slate-900/90 backdrop-blur-md p-5 text-xs text-slate-300 space-y-4 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-bold">
                Exterior Door
              </Badge>
              <span className="font-mono text-slate-400">{door.id}</span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1 capitalize">Host Wall: {door.wall}</h4>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-lg text-center">
          <div>
            <div className="text-slate-500">Width</div>
            <div className="font-mono font-bold text-white">{door.width} m</div>
          </div>
          <div>
            <div className="text-slate-500">Height</div>
            <div className="font-mono font-bold text-white">{door.height} m</div>
          </div>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Construction:</span>
            <span className="text-slate-200 truncate max-w-[150px]">{door.construction}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Airtightness:</span>
            <span className="font-medium text-emerald-400">{door.airTightness}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDeleteDoor(door.id)}
            className="gap-1 text-xs h-7"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Door
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
