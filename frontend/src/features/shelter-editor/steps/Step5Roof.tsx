import React, { useState } from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { Home, Plus, Trash2, ArrowUpDown } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

const ROOF_MATERIALS = [
  { id: "mat-standing-seam-aluminum", name: "Standing Seam Aluminum (High Reflectance)", conductivity: 160.0 },
  { id: "mat-galvanized-steel", name: "Corrugated Galvanized Steel (CGI)", conductivity: 45.0 },
  { id: "mat-aerogel-blanket", name: "Silica Aerogel Thermal Blanket", conductivity: 0.015 },
  { id: "mat-vip-panel", name: "Vacuum Insulation Panel (VIP)", conductivity: 0.007 },
  { id: "mat-polyurethane-foam", name: "Rigid Polyisocyanurate Foam (PIR)", conductivity: 0.024 },
  { id: "mat-xps-insulation", name: "Extruded Polystyrene (XPS)", conductivity: 0.029 },
  { id: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", conductivity: 0.035 },
  { id: "mat-mineral-wool", name: "Mineral Wool / Rockwool Roof Board", conductivity: 0.038 },
  { id: "mat-sheep-wool", name: "Himalayan Sheep Wool Batt", conductivity: 0.039 },
  { id: "mat-radiant-barrier", name: "Reflective Radiant Barrier Foil", conductivity: 220.0 },
  { id: "mat-timber-deck", name: "Pine Wood Tongue & Groove Ceiling Deck", conductivity: 0.13 },
  { id: "mat-clt-panel", name: "Cross-Laminated Timber (CLT) Roof Slab", conductivity: 0.13 },
  { id: "mat-asphalt-shingle", name: "Bitumen Waterproofing Membrane", conductivity: 0.17 },
  { id: "mat-epdm-membrane", name: "EPDM Cold-Weather Roofing Membrane", conductivity: 0.25 },
];

export function Step5Roof({ form, advancedMode }: StepProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const layers = watch("roof.layers") || [];
  const overhang = watch("roof.overhang") || 0;

  // Compute thermal transmittance (U-value) for roof (Rsi=0.10, Rse=0.04)
  const rValue = layers.reduce((acc, lyr) => {
    const mat = ROOF_MATERIALS.find((m) => m.id === lyr.materialId);
    const k = mat ? mat.conductivity : 0.04;
    return acc + (lyr.thickness / k);
  }, 0.14);
  const uValue = (1.0 / rValue).toFixed(3);

  const addLayer = () => {
    setValue("roof.layers", [
      ...layers,
      { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.10 },
    ]);
  };

  const removeLayer = (index: number) => {
    if (layers.length <= 1) {
      alert("Roof construction requires at least one layer.");
      return;
    }
    setValue("roof.layers", layers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Roof Assembly & Thermal Envelope</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure overhead multilayer insulation, solar absorptance, and protective eaves overhang.
          </p>
        </div>
      </div>

      {/* Roof U-Value Badge */}
      <div className="flex items-center justify-between rounded-lg border border-sky-200/60 bg-sky-50/40 px-4 py-3 dark:border-sky-900/30 dark:bg-sky-950/20">
        <div>
          <span className="text-xs font-semibold text-slate-900 dark:text-white">Roof Assembly U-Value</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Critical thermal barrier: up to 40% of building heat loss in alpine shelters occurs through the roof.
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400">
            {uValue} <span className="text-xs font-normal text-slate-500">W/(m²·K)</span>
          </span>
          <p className="text-[10px] text-slate-400">
            {Number(uValue) < 0.20 ? "High Thermal Protection" : "Increased Insulation Recommended"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldWrapper
          label="Roof Eaves Overhang"
          unit="m"
          tooltip="Horizontal extension of roof rafters beyond wall surface. Shields walls from wind-driven snow and provides summer shading."
          error={errors.roof?.overhang?.message}
          warning={overhang < 0.3 ? "Minimal overhang (<0.3m) exposes walls to heavy snow drift." : undefined}
        >
          <input
            {...register("roof.overhang", { valueAsNumber: true })}
            type="number"
            step="0.05"
            min="0"
            max="2.5"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Exterior Solar Absorptance"
          unit="α"
          tooltip="Fraction of incident solar radiation absorbed by outer roof cladding (0.0 = total reflection, 1.0 = total absorption). Darker roofs (α > 0.7) provide valuable passive solar heating in sub-zero winters."
          error={errors.roof?.solarAbsorptance?.message}
        >
          <input
            {...register("roof.solarAbsorptance", { valueAsNumber: true })}
            type="number"
            step="0.05"
            min="0"
            max="1.0"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>
      </div>

      {/* Layer Stack */}
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-900 dark:text-slate-400">
          Roof Multi-Layer Materials (Outer Weather Cladding Top → Interior Ceiling Bottom)
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
                    const selected = ROOF_MATERIALS.find((m) => m.id === e.target.value);
                    const updated = [...layers];
                    updated[idx] = { ...updated[idx], materialId: e.target.value, name: selected?.name };
                    setValue("roof.layers", updated);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {ROOF_MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (k = {m.conductivity} W/m·K)
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-32">
                <input
                  type="number"
                  step="0.005"
                  min="0.001"
                  max="1.0"
                  value={layer.thickness}
                  onChange={(e) => {
                    const updated = [...layers];
                    updated[idx] = { ...updated[idx], thickness: Number(e.target.value) };
                    setValue("roof.layers", updated);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-500 hover:text-sky-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-sky-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Roof Layer
          </button>
        </div>
      </div>
    </div>
  );
}
