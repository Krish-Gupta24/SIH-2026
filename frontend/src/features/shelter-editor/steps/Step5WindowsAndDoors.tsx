import React, { useState } from "react";
import { ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import {
  AppWindow,
  DoorOpen,
  Plus,
  Trash2,
  Sun,
  AlertTriangle,
  ShieldCheck,
  Layers,
  Zap,
} from "lucide-react";
import { findNextAvailableOpeningPosition } from "@/features/shelter-3d/geometry-math";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

export function Step5WindowsAndDoors({ form, advancedMode }: StepProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const [activeTab, setActiveTab] = useState<"all" | "windows" | "doors">("all");

  const windows = watch("windows") || [];
  const doors = watch("doors") || [];
  const length = watch("geometry.length") || 6.0;
  const width = watch("geometry.width") || 4.0;
  const height = watch("geometry.height") || 3.0;

  // Calculate gross wall area and window metrics
  const grossWallArea = 2 * (length * height) + 2 * (width * height);
  const totalWindowArea = windows.reduce((acc, w) => acc + w.width * w.height, 0);
  const wwr = grossWallArea > 0 ? ((totalWindowArea / grossWallArea) * 100).toFixed(1) : "0.0";

  // Solar orientation balance
  const southWinArea = windows
    .filter((w) => w.wall === "south")
    .reduce((acc, w) => acc + w.width * w.height, 0);
  const northWinArea = windows
    .filter((w) => w.wall === "north")
    .reduce((acc, w) => acc + w.width * w.height, 0);

  const addWindow = () => {
    const nextIdx = windows.length + 1;
    const wall = "south";
    const wallOpenings = windows
      .filter((w) => w.wall === wall)
      .map((w) => ({ positionX: w.positionX, width: w.width }));
    const posX = findNextAvailableOpeningPosition(length, wallOpenings, 1.4);
    setValue("windows", [
      ...windows,
      {
        id: `win-${nextIdx}`,
        wall,
        positionX: posX,
        width: 1.4,
        height: 1.2,
        sillHeight: 0.9,
        glazingType: "Double_LowE_Argon",
        frameType: "UPVC_Insulated",
        shadingOverhang: 0.4,
      },
    ]);
  };

  const removeWindow = (index: number) => {
    setValue("windows", windows.filter((_, i) => i !== index));
  };

  const addDoor = () => {
    const nextIdx = doors.length + 1;
    const wall = "east";
    const wallOpenings = doors
      .filter((d) => d.wall === wall)
      .map((d) => ({ positionX: d.positionX, width: d.width }));
    const posX = findNextAvailableOpeningPosition(width, wallOpenings, 0.95);
    setValue("doors", [
      ...doors,
      {
        id: `door-${nextIdx}`,
        wall,
        positionX: posX,
        width: 0.95,
        height: 2.1,
        construction: "Insulated Heavy Timber Door with Dual Weatherstrips",
        airTightness: "HighPerformance_Airtight",
      },
    ]);
  };

  const removeDoor = (index: number) => {
    setValue("doors", doors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <AppWindow className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Windows & Ingress Doors
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure passive solar glazing apertures, cardinal coordinates, shading overhangs, and airtight ingress doors.
            </p>
          </div>
        </div>

        {/* Sub-tab Pill Switcher */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeTab === "all"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="size-3" />
            <span>All Openings ({windows.length + doors.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("windows")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeTab === "windows"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AppWindow className="size-3" />
            <span>Windows ({windows.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("doors")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeTab === "doors"
                ? "bg-red-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <DoorOpen className="size-3" />
            <span>Doors ({doors.length})</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: WINDOWS & GLAZING */}
      {(activeTab === "all" || activeTab === "windows") && (
        <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/30 p-4 dark:border-slate-800/80 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">
                🪟
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Windows & Passive Glazing Openings ({windows.length})
              </h4>
            </div>
            {windows.length > 0 && (
              <button
                type="button"
                onClick={addWindow}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600"
              >
                <Plus className="h-3 w-3" />
                Add Window
              </button>
            )}
          </div>

          {/* WWR & Solar Balance Metrics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Glazed Area</span>
              <p className="text-base font-bold text-slate-900 dark:text-white">{totalWindowArea.toFixed(2)} m²</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Window-to-Wall Ratio (WWR)</span>
              <p className="text-base font-bold text-amber-600 dark:text-amber-400">{wwr} %</p>
              <span className="text-[10px] text-slate-400">Recommended 10%–20% for cold regions</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">South vs North Solar Ratio</span>
              <p className="text-base font-bold text-slate-900 dark:text-white">
                {southWinArea.toFixed(1)} m² S / {northWinArea.toFixed(1)} m² N
              </p>
              <span className="text-[10px] text-slate-400">Maximize South for solar capture</span>
            </div>
          </div>

          {northWinArea > southWinArea && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                Engineering Warning: North window area exceeds South window area. In high-altitude cold climates, excessive north glazing creates large nighttime thermal losses without daytime solar heat gain.
              </span>
            </div>
          )}

          {/* Windows List */}
          <div className="space-y-3">
            {windows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-800">
                <Sun className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">No windows currently added</p>
                <p className="text-[11px] text-slate-400">Add window openings to enable daylighting and passive solar heat gain.</p>
                <button
                  type="button"
                  onClick={addWindow}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Window
                </button>
              </div>
            ) : (
              windows.map((win, idx) => {
                const hostWallLen = win.wall === "north" || win.wall === "south" ? length : width;
                const exceedsWall = win.positionX + win.width > hostWallLen;
                const exceedsHeight = win.sillHeight + win.height > height;

                return (
                  <div
                    key={win.id || idx}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Window #{idx + 1}
                        </span>
                        <input
                          {...register(`windows.${idx}.id`)}
                          type="text"
                          className="rounded border border-transparent px-2 py-0.5 text-xs font-semibold text-slate-900 hover:border-slate-300 focus:border-amber-500 focus:outline-none dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWindow(idx)}
                        className="text-slate-400 hover:text-rose-600 transition"
                        title="Remove window"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <FieldWrapper label="Host Wall" tooltip="Cardinal wall hosting this fenestration.">
                        <select
                          {...register(`windows.${idx}.wall`)}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="south">South (High Solar Gain)</option>
                          <option value="east">East (Morning Sun)</option>
                          <option value="west">West (Afternoon Sun)</option>
                          <option value="north">North (Diffused Light)</option>
                        </select>
                      </FieldWrapper>

                      <FieldWrapper
                        label="Position Along Wall"
                        unit="m"
                        tooltip="Distance from the left wall corner in meters."
                        warning={exceedsWall ? `Window exceeds host wall length (${hostWallLen}m)` : undefined}
                      >
                        <input
                          {...register(`windows.${idx}.positionX`, { valueAsNumber: true })}
                          type="number"
                          step="0.1"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Width" unit="m" tooltip="Horizontal opening width.">
                        <input
                          {...register(`windows.${idx}.width`, { valueAsNumber: true })}
                          type="number"
                          step="0.1"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Height"
                        unit="m"
                        tooltip="Vertical opening height."
                        warning={exceedsHeight ? `Sill + Height exceeds wall height (${height}m)` : undefined}
                      >
                        <input
                          {...register(`windows.${idx}.height`, { valueAsNumber: true })}
                          type="number"
                          step="0.1"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Sill Height" unit="m" tooltip="Height above finished floor to window sill.">
                        <input
                          {...register(`windows.${idx}.sillHeight`, { valueAsNumber: true })}
                          type="number"
                          step="0.05"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Glazing Construction" tooltip="Glazing layer and gas cavity specification.">
                        <select
                          {...register(`windows.${idx}.glazingType`)}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="Double_LowE_Argon">Double Low-E Argon (U=1.4 W/m²K, SHGC=0.45)</option>
                          <option value="Triple_LowE_Krypton">Triple Low-E Krypton (U=0.8 W/m²K, SHGC=0.35)</option>
                          <option value="Single_Clear">Single Clear (U=5.8 W/m²K, High Heat Loss)</option>
                        </select>
                      </FieldWrapper>

                      <FieldWrapper label="Frame Type" tooltip="Frame material and thermal break.">
                        <select
                          {...register(`windows.${idx}.frameType`)}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="UPVC_Insulated">Insulated Multi-Chamber UPVC</option>
                          <option value="Wood_HighPerformance">High-Performance Engineered Wood</option>
                          <option value="Aluminum_ThermalBreak">Thermally Broken Aluminum</option>
                        </select>
                      </FieldWrapper>

                      <FieldWrapper label="Shading Overhang" unit="m" tooltip="External horizontal overhang depth for summer solar control.">
                        <input
                          {...register(`windows.${idx}.shadingOverhang`, { valueAsNumber: true })}
                          type="number"
                          step="0.05"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </FieldWrapper>
                    </div>

                    {/* BIPV Solar Pane Glass Option */}
                    {(() => {
                      const solarPane = win.solarPane || {
                        enabled: false,
                        transparencyPct: 30,
                        powerDensityWpM2: 90,
                        efficiencyPct: 12.5,
                        shgc: 0.35,
                        uValue: 1.20,
                      };
                      const hasSolarPane = solarPane.enabled === true;
                      const wArea = ((win.width || 1.4) * (win.height || 1.2)).toFixed(2);
                      const peakW = (Number(wArea) * (solarPane.powerDensityWpM2 ?? 90)).toFixed(1);

                      return (
                        <div className="mt-3.5 rounded-lg border border-sky-300/80 bg-sky-50/50 p-3 dark:border-sky-900/60 dark:bg-sky-950/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                Photovoltaic Solar Window Pane (BIPV)
                              </span>
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-semibold text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                                See-Through Solar Glazing
                              </span>
                            </div>

                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={hasSolarPane}
                                onChange={(e) => {
                                  const updated = [...windows];
                                  updated[idx] = {
                                    ...updated[idx],
                                    solarPane: {
                                      ...solarPane,
                                      enabled: e.target.checked,
                                    },
                                  };
                                  setValue("windows", updated);
                                }}
                                className="peer sr-only"
                              />
                              <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-slate-700"></div>
                              <span className="ml-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                {hasSolarPane ? "BIPV Active" : "Standard Glass"}
                              </span>
                            </label>
                          </div>

                          {hasSolarPane && (
                            <div className="mt-3 space-y-3">
                              <div className="flex flex-wrap items-center gap-4 rounded-md border border-sky-200 bg-white/80 px-3 py-1.5 text-[11px] dark:border-sky-900/50 dark:bg-slate-900/80">
                                <span>Glass Area: <strong>{wArea} m²</strong></span>
                                <span>Peak Power: <strong className="text-sky-600 dark:text-sky-400">{peakW} Wp</strong></span>
                                <span>VLT Transmittance: <strong>{solarPane.transparencyPct ?? 30}%</strong></span>
                                <span>Thermal U-Value: <strong>{solarPane.uValue ?? 1.20} W/m²K</strong></span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                <FieldWrapper label="Transparency (VLT)" unit="%" tooltip="Visible light transmittance through the see-through photovoltaic glazing.">
                                  <input
                                    type="number"
                                    min={5}
                                    max={80}
                                    step={5}
                                    value={solarPane.transparencyPct ?? 30}
                                    onChange={(e) => {
                                      const updated = [...windows];
                                      updated[idx] = {
                                        ...updated[idx],
                                        solarPane: {
                                          ...solarPane,
                                          transparencyPct: Number(e.target.value) || 30,
                                        },
                                      };
                                      setValue("windows", updated);
                                    }}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </FieldWrapper>

                                <FieldWrapper label="Power Density" unit="Wp/m²" tooltip="Electrical power output rating per square meter of window glass.">
                                  <input
                                    type="number"
                                    min={20}
                                    max={250}
                                    step={5}
                                    value={solarPane.powerDensityWpM2 ?? 90}
                                    onChange={(e) => {
                                      const updated = [...windows];
                                      updated[idx] = {
                                        ...updated[idx],
                                        solarPane: {
                                          ...solarPane,
                                          powerDensityWpM2: Number(e.target.value) || 90,
                                        },
                                      };
                                      setValue("windows", updated);
                                    }}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </FieldWrapper>

                                <FieldWrapper label="Cell Efficiency" unit="%" tooltip="Photovoltaic micro-cell conversion efficiency.">
                                  <input
                                    type="number"
                                    min={5}
                                    max={25}
                                    step={0.5}
                                    value={solarPane.efficiencyPct ?? 12.5}
                                    onChange={(e) => {
                                      const updated = [...windows];
                                      updated[idx] = {
                                        ...updated[idx],
                                        solarPane: {
                                          ...solarPane,
                                          efficiencyPct: Number(e.target.value) || 12.5,
                                        },
                                      };
                                      setValue("windows", updated);
                                    }}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </FieldWrapper>

                                <FieldWrapper label="Solar SHGC" tooltip="Solar heat gain coefficient with BIPV micro-cell layer.">
                                  <input
                                    type="number"
                                    min={0.15}
                                    max={0.80}
                                    step={0.02}
                                    value={solarPane.shgc ?? 0.35}
                                    onChange={(e) => {
                                      const updated = [...windows];
                                      updated[idx] = {
                                        ...updated[idx],
                                        solarPane: {
                                          ...solarPane,
                                          shgc: Number(e.target.value) || 0.35,
                                        },
                                      };
                                      setValue("windows", updated);
                                    }}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </FieldWrapper>

                                <FieldWrapper label="U-Value" unit="W/m²K" tooltip="Thermal transmittance coefficient of the insulating BIPV double/triple glazed unit.">
                                  <input
                                    type="number"
                                    min={0.5}
                                    max={2.5}
                                    step={0.05}
                                    value={solarPane.uValue ?? 1.20}
                                    onChange={(e) => {
                                      const updated = [...windows];
                                      updated[idx] = {
                                        ...updated[idx],
                                        solarPane: {
                                          ...solarPane,
                                          uValue: Number(e.target.value) || 1.20,
                                        },
                                      };
                                      setValue("windows", updated);
                                    }}
                                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                  />
                                </FieldWrapper>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: DOORS & INGRESS */}
      {(activeTab === "all" || activeTab === "doors") && (
        <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/30 p-4 dark:border-slate-800/80 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">
                🚪
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Doors & Exterior Ingress ({doors.length})
              </h4>
            </div>
            {doors.length > 0 && (
              <button
                type="button"
                onClick={addDoor}
                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
              >
                <Plus className="h-3 w-3" />
                Add Door
              </button>
            )}
          </div>

          <div className="space-y-3">
            {doors.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-800">
                <DoorOpen className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">No doors currently added</p>
                <p className="text-[11px] text-slate-400">Every shelter requires at least one primary entrance door.</p>
                <button
                  type="button"
                  onClick={addDoor}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Primary Door
                </button>
              </div>
            ) : (
              doors.map((door, idx) => {
                const hostWallLen = door.wall === "north" || door.wall === "south" ? length : width;
                const exceedsWall = door.positionX + door.width > hostWallLen;
                const exceedsHeight = door.height > height;

                return (
                  <div
                    key={door.id || idx}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800 dark:bg-red-950 dark:text-red-300">
                          Door #{idx + 1}
                        </span>
                        <input
                          {...register(`doors.${idx}.id`)}
                          type="text"
                          className="rounded border border-transparent px-2 py-0.5 text-xs font-semibold text-slate-900 hover:border-slate-300 focus:border-red-500 focus:outline-none dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDoor(idx)}
                        className="text-slate-400 hover:text-rose-600 transition"
                        title="Remove door"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <FieldWrapper label="Host Wall" tooltip="Cardinal wall hosting this entrance door.">
                        <select
                          {...register(`doors.${idx}.wall`)}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="east">East (Leeward Morning Ingress)</option>
                          <option value="south">South (Sunny Facade)</option>
                          <option value="west">West (Windward Facing)</option>
                          <option value="north">North (Sheltered Airlock)</option>
                        </select>
                      </FieldWrapper>

                      <FieldWrapper
                        label="Position Along Wall"
                        unit="m"
                        tooltip="Distance from left corner in meters."
                        warning={exceedsWall ? `Door exceeds host wall length (${hostWallLen}m)` : undefined}
                      >
                        <input
                          {...register(`doors.${idx}.positionX`, { valueAsNumber: true })}
                          type="number"
                          step="0.05"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Width" unit="m" tooltip="Door frame width.">
                        <input
                          {...register(`doors.${idx}.width`, { valueAsNumber: true })}
                          type="number"
                          step="0.05"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Height"
                        unit="m"
                        tooltip="Clear door opening height."
                        warning={exceedsHeight ? `Door exceeds wall height (${height}m)` : undefined}
                      >
                        <input
                          {...register(`doors.${idx}.height`, { valueAsNumber: true })}
                          type="number"
                          step="0.05"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Construction Core" tooltip="Door slab insulation and structural core.">
                        <select
                          {...register(`doors.${idx}.construction`)}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="Insulated Heavy Timber Door with Dual Weatherstrips">
                            Insulated Heavy Timber Door (U=1.4 W/m²K)
                          </option>
                          <option value="Polyurethane Foam Core Steel Door with Thermal Break">
                            PUF Core Steel Door (U=1.1 W/m²K)
                          </option>
                          <option value="Vacuum Insulated Defense Ingress Panel">
                            VIP Defense Ingress Panel (U=0.6 W/m²K)
                          </option>
                          <option value="Standard Solid Wood Door (Uninsulated)">
                            Solid Wood Uninsulated (U=2.8 W/m²K)
                          </option>
                        </select>
                      </FieldWrapper>

                      <FieldWrapper label="Airtightness Rating" tooltip="Weatherstripping and infiltration gasket seal.">
                        <select
                          {...register(`doors.${idx}.airTightness`)}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="HighPerformance_Airtight">
                            High-Performance Airtight (Dual Gasket, Pressurized Latch)
                          </option>
                          <option value="Standard">Standard Weatherstrip (0.5 m³/h·m leakage)</option>
                        </select>
                      </FieldWrapper>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
