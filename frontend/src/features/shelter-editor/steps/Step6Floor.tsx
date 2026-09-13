import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { Grid, Plus, Trash2 } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

const FLOOR_MATERIALS = [
  { id: "mat-concrete-slab", name: "Heavy Reinforced Concrete Slab", conductivity: 1.40 },
  { id: "mat-granite-stone", name: "Local Granite Stone Bed", conductivity: 2.80 },
  { id: "mat-xps-insulation", name: "Extruded Polystyrene (XPS) High Load", conductivity: 0.029 },
  { id: "mat-polyurethane-foam", name: "Rigid Polyurethane Foam (PIR)", conductivity: 0.024 },
  { id: "mat-aerogel-blanket", name: "Silica Aerogel Thermal Break", conductivity: 0.015 },
  { id: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", conductivity: 0.035 },
  { id: "mat-glass-foam-gravel", name: "Foamed Cellular Glass Gravel (Permafrost Break)", conductivity: 0.08 },
  { id: "mat-gravel-bed", name: "Crushed Stone Hardcore Sub-base", conductivity: 0.85 },
  { id: "mat-timber-flooring", name: "Hardwood Tongue & Groove Plank Flooring", conductivity: 0.14 },
  { id: "mat-clt-panel", name: "Cross-Laminated Timber (CLT) Floor Panel", conductivity: 0.13 },
];

export function Step6Floor({ form, advancedMode }: StepProps) {
  const { register, watch, setValue } = form;
  const layers = watch("floor.layers") || [];
  const groundContact = watch("floor.groundContact");

  // Compute thermal transmittance (U-value) for floor (Rsi=0.17, Rse=0.04)
  const rValue = layers.reduce((acc, lyr) => {
    const mat = FLOOR_MATERIALS.find((m) => m.id === lyr.materialId);
    const k = mat ? mat.conductivity : 0.5;
    return acc + (lyr.thickness / k);
  }, 0.21);
  const uValue = (1.0 / rValue).toFixed(3);

  const addLayer = () => {
    setValue("floor.layers", [
      ...layers,
      { materialId: "mat-xps-insulation", name: "Extruded Polystyrene (XPS) High Load", thickness: 0.08 },
    ]);
  };

  const removeLayer = (index: number) => {
    if (layers.length <= 1) {
      alert("Floor slab requires at least one physical layer.");
      return;
    }
    setValue("floor.layers", layers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
          <Grid className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Floor Foundation & Ground Interface</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define foundation slab layers, sub-grade insulation, and thermal coupling with permafrost or frozen ground.
          </p>
        </div>
      </div>

      {/* Floor Thermal Summary */}
      <div className="flex items-center justify-between rounded-lg border border-teal-200/60 bg-teal-50/40 px-4 py-3 dark:border-teal-900/30 dark:bg-teal-950/20">
        <div>
          <span className="text-xs font-semibold text-slate-900 dark:text-white">Floor Assembly U-Value</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Sub-slab continuous insulation prevents ground thermal bridging and permafrost degradation.
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-extrabold text-teal-600 dark:text-teal-400">
            {uValue} <span className="text-xs font-normal text-slate-500">W/(m²·K)</span>
          </span>
          <p className="text-[10px] text-slate-400">
            {groundContact ? "Direct Ground Coupled" : "Elevated Air Boundary"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:border-teal-500 dark:border-slate-800">
          <input
            type="checkbox"
            {...register("floor.groundContact")}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-700"
          />
          <div>
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Ground Contact (Slab on Grade)</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              When checked, the slab exchanges heat directly with soil. Uncheck for raised stilt structures.
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:border-teal-500 dark:border-slate-800">
          <input
            type="checkbox"
            {...register("floor.perimeterInsulation")}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-700"
          />
          <div>
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Perimeter Frost Skirt Insulation</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Horizontal exterior skirt insulation around perimeter to resist frost penetration.
            </p>
          </div>
        </label>
      </div>

      {/* Layer Stack */}
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-900 dark:text-slate-400">
          Floor Layers (Interior Walkable Surface Top → Ground Sub-base Bottom)
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {layers.map((layer, idx) => (
            <div key={idx} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {idx + 1}
              </span>

              <div className="flex-1">
                <select
                  value={layer.materialId}
                  onChange={(e) => {
                    const selected = FLOOR_MATERIALS.find((m) => m.id === e.target.value);
                    const updated = [...layers];
                    updated[idx] = { ...updated[idx], materialId: e.target.value, name: selected?.name };
                    setValue("floor.layers", updated);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {FLOOR_MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (k = {m.conductivity} W/m·K)
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-32">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1.5"
                  value={layer.thickness}
                  onChange={(e) => {
                    const updated = [...layers];
                    updated[idx] = { ...updated[idx], thickness: Number(e.target.value) };
                    setValue("floor.layers", updated);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => removeLayer(idx)}
                className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-slate-50/50 p-3 text-center dark:bg-slate-900/30">
          <button
            type="button"
            onClick={addLayer}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-500 hover:text-teal-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Floor Layer
          </button>
        </div>
      </div>
    </div>
  );
}
