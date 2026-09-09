import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { AppWindow, Plus, Trash2, Sun, AlertTriangle } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

export function Step7Windows({ form, advancedMode }: StepProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const windows = watch("windows") || [];
  const length = watch("geometry.length") || 6.0;
  const width = watch("geometry.width") || 4.0;
  const height = watch("geometry.height") || 3.0;

  // Calculate gross wall area and total window area
  const grossWallArea = 2 * (length * height) + 2 * (width * height);
  const totalWindowArea = windows.reduce((acc, w) => acc + (w.width * w.height), 0);
  const wwr = grossWallArea > 0 ? ((totalWindowArea / grossWallArea) * 100).toFixed(1) : "0.0";

  // Check orientation balance (passive solar best practice)
  const southWinArea = windows.filter((w) => w.wall === "south").reduce((acc, w) => acc + (w.width * w.height), 0);
  const northWinArea = windows.filter((w) => w.wall === "north").reduce((acc, w) => acc + (w.width * w.height), 0);

  const addWindow = () => {
    const nextIdx = windows.length + 1;
    setValue("windows", [
      ...windows,
      {
        id: `win-${nextIdx}`,
        wall: "south",
        positionX: 1.0,
        width: 1.5,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          <AppWindow className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Windows & Glazing Openings</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Design window fenestrations, host wall coordinates, high-performance glazing, and overhang shading.
          </p>
        </div>
      </div>

      {/* WWR & Solar Balance Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Glazed Area</span>
          <p className="text-base font-bold text-slate-900 dark:text-white">{totalWindowArea.toFixed(2)} m²</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Window-to-Wall Ratio (WWR)</span>
          <p className="text-base font-bold text-amber-600 dark:text-amber-400">{wwr} %</p>
          <span className="text-[10px] text-slate-400">Recommended 10%–20% for cold regions</span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">South vs North Ratio</span>
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {southWinArea.toFixed(1)} m² S / {northWinArea.toFixed(1)} m² N
          </p>
          <span className="text-[10px] text-slate-400">Maximize South for solar heat gain</span>
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
      <div className="space-y-4">
        {windows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
            <Sun className="mx-auto h-8 w-8 text-slate-400" />
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
            const hostWallLen = (win.wall === "north" || win.wall === "south") ? length : width;
            const exceedsWall = (win.positionX + win.width) > hostWallLen;
            const exceedsHeight = (win.sillHeight + win.height) > height;

            return (
              <div
                key={win.id || idx}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
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
                    className="text-slate-400 hover:text-rose-600"
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
              </div>
            );
          })
        )}

        {windows.length > 0 && (
          <button
            type="button"
            onClick={addWindow}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-amber-500 hover:text-amber-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-amber-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Another Window
          </button>
        )}
      </div>
    </div>
  );
}
