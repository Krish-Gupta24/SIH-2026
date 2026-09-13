import React, { useState } from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { Layers, Plus, Trash2, ArrowUpDown } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

const VERIFIED_MATERIALS = [
  { id: "mat-aerogel-blanket", name: "Silica Aerogel Blanket (Superinsulation)", conductivity: 0.015, density: 160 },
  { id: "mat-vip-panel", name: "Vacuum Insulation Panel (VIP)", conductivity: 0.007, density: 190 },
  { id: "mat-polyurethane-foam", name: "Polyisocyanurate / Polyurethane Foam (PIR)", conductivity: 0.024, density: 32 },
  { id: "mat-xps-insulation", name: "Extruded Polystyrene (XPS)", conductivity: 0.029, density: 35 },
  { id: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", conductivity: 0.035, density: 25 },
  { id: "mat-mineral-wool", name: "High-Density Rockwool / Mineral Wool", conductivity: 0.038, density: 60 },
  { id: "mat-sheep-wool", name: "Himalayan Sheep Wool Batt (Indigenous)", conductivity: 0.039, density: 30 },
  { id: "mat-glass-wool", name: "Glass Wool Blanket", conductivity: 0.040, density: 24 },
  { id: "mat-straw-insulation", name: "Compressed Straw Bale Insulation", conductivity: 0.065, density: 110 },
  { id: "mat-rammed-earth", name: "Stabilized Rammed Earth (Local Ladakh)", conductivity: 1.25, density: 2000 },
  { id: "mat-granite-stone", name: "Local Granite Stone Masonry", conductivity: 2.80, density: 2600 },
  { id: "mat-stone-masonry", name: "Granite Stone Masonry", conductivity: 2.15, density: 2400 },
  { id: "mat-dense-brick", name: "Dense Kiln Burnt Clay Brick", conductivity: 0.84, density: 1800 },
  { id: "mat-aac-block", name: "Autoclaved Aerated Concrete (AAC)", conductivity: 0.16, density: 550 },
  { id: "mat-concrete-block", name: "Hollow Concrete Block (CMU)", conductivity: 0.90, density: 1400 },
  { id: "mat-pcm-salt-hydrate", name: "Phase Change Material (PCM Salt Hydrate 21°C)", conductivity: 0.54, density: 1500 },
  { id: "mat-clt-panel", name: "Cross-Laminated Timber (CLT)", conductivity: 0.13, density: 480 },
  { id: "mat-timber-cedar", name: "Himalayan Cedar (Deodar) Timber", conductivity: 0.12, density: 550 },
  { id: "mat-timber-stud", name: "Softwood Timber Framing", conductivity: 0.13, density: 500 },
  { id: "mat-gypsum-board", name: "Gypsum Wallboard (Drywall)", conductivity: 0.16, density: 800 },
  { id: "mat-lime-plaster", name: "Hydraulic Lime Sand Plaster", conductivity: 0.70, density: 1600 },
  { id: "mat-mud-straw-plaster", name: "Traditional Mud & Straw Plaster (Pharka)", conductivity: 0.45, density: 1300 },
];

export function Step4Walls({ form, advancedMode }: StepProps) {
  const { watch, setValue } = form;
  const [activeFace, setActiveFace] = useState<"north" | "south" | "east" | "west">("north");
  const [uniformAllWalls, setUniformAllWalls] = useState<boolean>(false);

  const walls = watch("envelopeWalls");
  const currentLayers = walls?.[activeFace]?.layers || [];

  // Compute thermal resistance and U-value estimate (Rsi=0.13, Rse=0.04)
  const rValue = currentLayers.reduce((acc, lyr) => {
    const mat = VERIFIED_MATERIALS.find((m) => m.id === lyr.materialId);
    const k = mat ? mat.conductivity : 0.5;
    return acc + (lyr.thickness / k);
  }, 0.17); // 0.13 inside + 0.04 outside air film
  const uValue = (1.0 / rValue).toFixed(3);

  const addLayer = () => {
    const newLayers = [
      ...currentLayers,
      { materialId: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", thickness: 0.05 },
    ];
    updateLayers(newLayers);
  };

  const removeLayer = (index: number) => {
    if (currentLayers.length <= 1) {
      alert("A wall assembly must have at least one physical layer.");
      return;
    }
    const newLayers = currentLayers.filter((_, i) => i !== index);
    updateLayers(newLayers);
  };

  const updateLayers = (newLayers: typeof currentLayers) => {
    if (uniformAllWalls) {
      setValue("envelopeWalls.north.layers", newLayers);
      setValue("envelopeWalls.south.layers", newLayers);
      setValue("envelopeWalls.east.layers", newLayers);
      setValue("envelopeWalls.west.layers", newLayers);
    } else {
      setValue(`envelopeWalls.${activeFace}.layers`, newLayers);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Wall Assemblies & Multilayer Constructions</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure insulation, masonry, and thermal mass layers for each cardinal wall orientation (Exterior to Interior).
          </p>
        </div>
      </div>

      {/* Uniform vs Orientation Switch */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          {(["north", "south", "east", "west"] as const).map((face) => (
            <button
              key={face}
              type="button"
              onClick={() => setActiveFace(face)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                activeFace === face
                  ? "bg-white text-orange-600 shadow-sm dark:bg-slate-800 dark:text-orange-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {face} Wall
            </button>
          ))}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={uniformAllWalls}
            onChange={(e) => setUniformAllWalls(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 dark:border-slate-700"
          />
          Apply same construction to all 4 walls
        </label>
      </div>

      {/* Real-Time Thermal Performance Gauge */}
      <div className="flex items-center justify-between rounded-lg border border-orange-200/60 bg-orange-50/40 px-4 py-3 dark:border-orange-900/30 dark:bg-orange-950/20">
        <div>
          <span className="text-xs font-semibold text-slate-900 dark:text-white capitalize">{activeFace} Wall U-Value</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Overall thermal transmittance including standard air boundary film resistances.
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-extrabold text-orange-600 dark:text-orange-400">
            {uValue} <span className="text-xs font-normal text-slate-500">W/(m²·K)</span>
          </span>
          <p className="text-[10px] text-slate-400">
            {Number(uValue) < 0.25 ? "Excellent Passivhaus Level" : Number(uValue) < 0.4 ? "High-Altitude Compliant" : "High Heat Loss Risk"}
          </p>
        </div>
      </div>

      {/* Layer Stack Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-900 dark:text-slate-400 flex items-center justify-between">
          <span>Layer Ordering (Exterior Face Top → Interior Face Bottom)</span>
          <span className="text-[10px] text-slate-400">{currentLayers.length} Layers Defined</span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {currentLayers.map((layer, idx) => (
            <div key={idx} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {idx + 1}
              </span>

              <div className="flex-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Verified Material</label>
                <select
                  value={layer.materialId}
                  onChange={(e) => {
                    const selected = VERIFIED_MATERIALS.find((m) => m.id === e.target.value);
                    const updated = [...currentLayers];
                    updated[idx] = { ...updated[idx], materialId: e.target.value, name: selected?.name };
                    updateLayers(updated);
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {VERIFIED_MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (k = {m.conductivity} W/m·K)
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-32">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Thickness (m)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.005"
                  max="1.5"
                  value={layer.thickness}
                  onChange={(e) => {
                    const updated = [...currentLayers];
                    updated[idx] = { ...updated[idx], thickness: Number(e.target.value) };
                    updateLayers(updated);
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-end pt-5 sm:pt-0">
                <button
                  type="button"
                  onClick={() => removeLayer(idx)}
                  className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  title="Remove layer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50/50 p-3 text-center dark:bg-slate-900/30">
          <button
            type="button"
            onClick={addLayer}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-orange-500 hover:text-orange-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Material Layer
          </button>
        </div>
      </div>
    </div>
  );
}
