"use client";

import React, { useState } from "react";
import {
  Sliders,
  AppWindow,
  DoorOpen,
  Plus,
  Box,
  Compass,
  Home,
  Layers,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { ShelterModel, WindowModel, DoorModel } from "@/types/shelter";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ParametricSidebarProps {
  model: ShelterModel;
  onUpdateModel: (updates: Partial<ShelterModel>) => void;
  onAddWindow: (win: WindowModel) => void;
  onAddDoor: (door: DoorModel) => void;
}

export function ParametricSidebar({
  model,
  onUpdateModel,
  onAddWindow,
  onAddDoor,
}: ParametricSidebarProps) {
  // Modal states
  const [isAddWinOpen, setIsAddWinOpen] = useState(false);
  const [winWall, setWinWall] = useState<"north" | "south" | "east" | "west">("south");
  const [winWidth, setWinWidth] = useState(1.5);
  const [winHeight, setWinHeight] = useState(1.2);
  const [winSill, setWinSill] = useState(0.9);
  const [winPosX, setWinPosX] = useState(1.0);

  const [isAddDoorOpen, setIsAddDoorOpen] = useState(false);
  const [doorWall, setDoorWall] = useState<"north" | "south" | "east" | "west">("east");
  const [doorWidth, setDoorWidth] = useState(0.95);
  const [doorHeight, setDoorHeight] = useState(2.1);
  const [doorPosX, setDoorPosX] = useState(1.0);

  const handleDimensionChange = (key: "length" | "width" | "height" | "orientation" | "roofAngle", val: number) => {
    onUpdateModel({
      geometry: {
        ...model.geometry,
        [key]: val,
      },
    });
  };

  const handleRoofTypeChange = (type: "Flat" | "Shed" | "Gable") => {
    onUpdateModel({
      geometry: {
        ...model.geometry,
        roofType: type,
      },
    });
  };

  const handleCreateNewWindow = (e: React.FormEvent) => {
    e.preventDefault();
    const newWin: WindowModel = {
      id: `win-${winWall}-${Date.now().toString().slice(-4)}`,
      wall: winWall,
      positionX: winPosX,
      width: winWidth,
      height: winHeight,
      sillHeight: winSill,
      glazingType: "Double_LowE_Argon",
      frameType: "UPVC_Insulated",
      shadingOverhang: 0.4,
    };
    onAddWindow(newWin);
    setIsAddWinOpen(false);
  };

  const handleCreateNewDoor = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoor: DoorModel = {
      id: `door-${doorWall}-${Date.now().toString().slice(-4)}`,
      wall: doorWall,
      positionX: doorPosX,
      width: doorWidth,
      height: doorHeight,
      construction: "Airtight Thermal Break Timber Door (U=1.2)",
      airTightness: "HighPerformance_Airtight",
    };
    onAddDoor(newDoor);
    setIsAddDoorOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Footprint Dimensions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Box className="h-4 w-4 text-blue-400" />
            Shelter Footprint (Meters)
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            {(model.geometry.length * model.geometry.width).toFixed(1)} m²
          </span>
        </div>

        <Slider
          label="Length (East-West)"
          value={model.geometry.length}
          onValueChange={(v) => handleDimensionChange("length", v)}
          min={3.0}
          max={15.0}
          step={0.25}
          unit="m"
        />

        <Slider
          label="Width (North-South)"
          value={model.geometry.width}
          onValueChange={(v) => handleDimensionChange("width", v)}
          min={2.0}
          max={10.0}
          step={0.25}
          unit="m"
        />

        <Slider
          label="Wall Height"
          value={model.geometry.height}
          onValueChange={(v) => handleDimensionChange("height", v)}
          min={2.2}
          max={4.5}
          step={0.1}
          unit="m"
        />
      </div>

      {/* 2. Orientation & Roof Pitch */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Compass className="h-4 w-4 text-amber-400" />
            Solar Orientation & Roof
          </div>
          <span className="text-[11px] font-mono text-amber-400 font-bold">
            {model.geometry.orientation}° Azimuth
          </span>
        </div>

        <Slider
          label="Orientation Azimuth (0° True North)"
          value={model.geometry.orientation}
          onValueChange={(v) => handleDimensionChange("orientation", v)}
          min={0}
          max={360}
          step={5}
          unit="°"
        />

        <div>
          <label className="text-xs font-semibold text-slate-300">Roof Profile Shape</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            {(["Flat", "Shed", "Gable"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleRoofTypeChange(t)}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  model.geometry.roofType === t
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-950/60 text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {model.geometry.roofType !== "Flat" && (
          <Slider
            label="Roof Pitch Slope"
            value={model.geometry.roofAngle || 0}
            onValueChange={(v) => handleDimensionChange("roofAngle", v)}
            min={5}
            max={45}
            step={1}
            unit="°"
          />
        )}
      </div>

      {/* 3. Openings & Fenestrations Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <AppWindow className="h-4 w-4 text-emerald-400" />
            Openings ({(model.windows || []).length} Win, {(model.doors || []).length} Door)
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={() => setIsAddWinOpen(true)}
            className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Window
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddDoorOpen(true)}
            className="gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Door
          </Button>
        </div>
      </div>

      {/* Add Window Modal */}
      <Dialog open={isAddWinOpen} onOpenChange={setIsAddWinOpen}>
        <form onSubmit={handleCreateNewWindow} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add Window Fenestration</DialogTitle>
            <DialogDescription>
              Specify host wall coordinate and window dimensions for passive solar design.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-300">Host Wall Orientation</label>
              <select
                value={winWall}
                onChange={(e) => setWinWall(e.target.value as any)}
                className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-950 p-2 text-white"
              >
                <option value="south">South Wall (Recommended for High Solar Gain)</option>
                <option value="north">North Wall (Minimal Solar)</option>
                <option value="east">East Wall (Morning Sun)</option>
                <option value="west">West Wall (Afternoon Sun)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-300">Width (m)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.4"
                  max="3.0"
                  value={winWidth}
                  onChange={(e) => setWinWidth(parseFloat(e.target.value) || 1.0)}
                  className="mt-1 bg-slate-950 border-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300">Height (m)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.4"
                  max="2.5"
                  value={winHeight}
                  onChange={(e) => setWinHeight(parseFloat(e.target.value) || 1.0)}
                  className="mt-1 bg-slate-950 border-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-300">Position X on Wall (m)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.2"
                  max="10.0"
                  value={winPosX}
                  onChange={(e) => setWinPosX(parseFloat(e.target.value) || 0.5)}
                  className="mt-1 bg-slate-950 border-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300">Sill Height (m)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="1.8"
                  value={winSill}
                  onChange={(e) => setWinSill(parseFloat(e.target.value) || 0.9)}
                  className="mt-1 bg-slate-950 border-slate-800"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddWinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="font-bold bg-amber-600 hover:bg-amber-700">
              Insert Window
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Add Door Modal */}
      <Dialog open={isAddDoorOpen} onOpenChange={setIsAddDoorOpen}>
        <form onSubmit={handleCreateNewDoor} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add Exterior Door</DialogTitle>
            <DialogDescription>
              Place an insulated, airtight door on an envelope host wall.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-300">Host Wall</label>
              <select
                value={doorWall}
                onChange={(e) => setDoorWall(e.target.value as any)}
                className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-950 p-2 text-white"
              >
                <option value="east">East Wall (Protected Entrance)</option>
                <option value="south">South Wall</option>
                <option value="north">North Wall</option>
                <option value="west">West Wall</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-300">Width (m)</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0.7"
                  max="1.5"
                  value={doorWidth}
                  onChange={(e) => setDoorWidth(parseFloat(e.target.value) || 0.95)}
                  className="mt-1 bg-slate-950 border-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300">Height (m)</label>
                <Input
                  type="number"
                  step="0.05"
                  min="1.8"
                  max="2.4"
                  value={doorHeight}
                  onChange={(e) => setDoorHeight(parseFloat(e.target.value) || 2.1)}
                  className="mt-1 bg-slate-950 border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-300">Position X from Corner (m)</label>
              <Input
                type="number"
                step="0.1"
                min="0.2"
                max="8.0"
                value={doorPosX}
                onChange={(e) => setDoorPosX(parseFloat(e.target.value) || 1.0)}
                className="mt-1 bg-slate-950 border-slate-800"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDoorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="font-bold bg-indigo-600 hover:bg-indigo-700">
              Insert Door
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
