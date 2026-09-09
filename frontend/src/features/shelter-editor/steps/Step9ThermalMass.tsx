import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { Mountain, Plus, Trash2, ShieldAlert } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

const THERMAL_MASS_MATERIALS = [
  { id: "mat-concrete-slab", name: "High-Density Concrete Slab", density: 2300, specificHeat: 1000 },
  { id: "mat-rammed-earth", name: "Stabilized Heavy Rammed Earth", density: 1950, specificHeat: 920 },
  { id: "mat-stone-masonry", name: "Solid Granite Masonry Wall", density: 2400, specificHeat: 850 },
  { id: "mat-dense-brick", name: "Dense Clay Kiln Brick", density: 1800, specificHeat: 840 },
];

export function Step9ThermalMass({ form, advancedMode }: StepProps) {
  const { register, watch, setValue } = form;
  const elements = watch("thermalMass") || [];
  const floorArea = (watch("geometry.length") || 6) * (watch("geometry.width") || 4);

  const totalMassArea = elements.reduce((acc, el) => acc + (el.surfaceArea || 0), 0);

  const addElement = () => {
    const nextIdx = elements.length + 1;
    setValue("thermalMass", [
      ...elements,
      {
        id: `tmass-${nextIdx}`,
        name: `Internal Thermal Mass #${nextIdx}`,
        type: "InternalPartition",
        materialId: "mat-rammed-earth",
        thickness: 0.20,
        surfaceArea: 12.0,
      },
    ]);
  };

  const removeElement = (index: number) => {
    setValue("thermalMass", elements.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300">
          <Mountain className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Physical Thermal Mass Representation</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Model physical internal partitions, exposed concrete slabs, and earth walls to damp extreme diurnal temperature swings.
          </p>
        </div>
      </div>

      {/* Thermal Capacity Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Exposed Thermal Mass Area</span>
          <p className="text-base font-bold text-slate-900 dark:text-white">{totalMassArea.toFixed(1)} m²</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Mass-to-Floor Area Ratio</span>
          <p className="text-base font-bold text-stone-600 dark:text-stone-300">
            {(floorArea > 0 ? totalMassArea / floorArea : 0).toFixed(2)} m²/m²
          </p>
          <span className="text-[10px] text-slate-400">Optimal target 1.5 – 3.0 m²/m² floor</span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Diurnal Damping Effect</span>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
            {totalMassArea > 15 ? "High (6–10°C Swing Reduction)" : "Moderate (2–5°C Swing Reduction)"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {elements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
            <Mountain className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">No thermal mass elements added</p>
            <p className="text-[11px] text-slate-400">
              Without thermal mass, lightweight structures experience extreme night freezing and rapid daytime overheating.
            </p>
            <button
              type="button"
              onClick={addElement}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-stone-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Thermal Mass Element
            </button>
          </div>
        ) : (
          elements.map((el, idx) => (
            <div
              key={el.id || idx}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-800 dark:bg-stone-800 dark:text-stone-300">
                    Element #{idx + 1}
                  </span>
                  <input
                    {...register(`thermalMass.${idx}.name`)}
                    type="text"
                    className="rounded border border-transparent px-2 py-0.5 text-xs font-semibold text-slate-900 hover:border-slate-300 focus:border-stone-500 focus:outline-none dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeElement(idx)}
                  className="text-slate-400 hover:text-rose-600"
                  title="Remove element"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FieldWrapper label="Physical Form" tooltip="Geometric placement and zone exposure.">
                  <select
                    {...register(`thermalMass.${idx}.type`)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-stone-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="FloorSlab">Exposed Floor Slab (Ground Coupled)</option>
                    <option value="InternalPartition">Internal Partition Wall (Dual Sided)</option>
                    <option value="InternalExposedMass">Free-Standing Trombe / Thermal Core</option>
                  </select>
                </FieldWrapper>

                <FieldWrapper label="Material" tooltip="Volumetric heat capacity material.">
                  <select
                    {...register(`thermalMass.${idx}.materialId`)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-stone-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {THERMAL_MASS_MATERIALS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.density} kg/m³)
                      </option>
                    ))}
                  </select>
                </FieldWrapper>

                <FieldWrapper label="Thickness" unit="m" tooltip="Effective thermal penetration depth (typically 0.1m–0.3m).">
                  <input
                    {...register(`thermalMass.${idx}.thickness`, { valueAsNumber: true })}
                    type="number"
                    step="0.02"
                    min="0.05"
                    max="0.8"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-stone-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </FieldWrapper>

                <FieldWrapper label="Exposed Area" unit="m²" tooltip="Total surface area in contact with interior zone air.">
                  <input
                    {...register(`thermalMass.${idx}.surfaceArea`, { valueAsNumber: true })}
                    type="number"
                    step="0.5"
                    min="0.5"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-stone-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </FieldWrapper>
              </div>
            </div>
          ))
        )}

        {elements.length > 0 && (
          <button
            type="button"
            onClick={addElement}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-stone-500 hover:text-stone-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-stone-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Thermal Mass Element
          </button>
        )}
      </div>
    </div>
  );
}
