import React, { useState } from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { Home, Plus, Trash2, ArrowUpDown, Sun, Zap } from "lucide-react";

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

      {/* ROOFTOP SOLAR PV ARRAY SECTION */}
      {(() => {
        const solarPanels = watch("roof.solarPanels");
        const isEnabled = solarPanels?.enabled === true;
        const count = solarPanels?.panelCount ?? 6;
        const wattage = solarPanels?.panelWattageW ?? 400;
        const efficiency = solarPanels?.panelEfficiencyPct ?? 21.5;
        const tilt = solarPanels?.tiltAngleDeg ?? 30;
        const mounting = solarPanels?.mountingType ?? "UnistrutElevated";
        const totalKw = ((count * wattage) / 1000).toFixed(2);
        const estArea = (count * 1.95).toFixed(1);
        const estDailyKwh = (Number(totalKw) * 4.8 * (efficiency / 21.5)).toFixed(1);

        const toggleSolar = (enabledState: boolean) => {
          setValue("roof.solarPanels", {
            enabled: enabledState,
            panelCount: count,
            panelWattageW: wattage,
            panelEfficiencyPct: efficiency,
            tiltAngleDeg: tilt,
            mountingType: mounting,
          });
        };

        return (
          <div className={`rounded-xl border-2 transition-all shadow-sm ${
            isEnabled
              ? "border-amber-400 bg-amber-50/50 p-5 dark:border-amber-700 dark:bg-amber-950/25"
              : "border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40"
          }`}>
            {/* Header & Prominent High-Visibility Mode Switcher */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-xs transition ${
                  isEnabled
                    ? "bg-amber-500 text-white shadow-amber-500/25 ring-2 ring-amber-400/40"
                    : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}>
                  <Sun className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Rooftop Solar Photovoltaic (PV) Option
                    </h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isEnabled
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500/30"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {isEnabled ? "● Active & Generating" : "Optional · Not Installed"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Passive design is the foundation. Rooftop solar PV is an optional upgrade to generate on-site electricity for heaters and batteries.
                  </p>
                </div>
              </div>

              {/* HIGH-VISIBILITY 2-WAY SEGMENTED PILL SWITCH */}
              <div className="flex items-center rounded-xl border border-slate-300 bg-white p-1 shadow-xs dark:border-slate-700 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => toggleSolar(true)}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    isEnabled
                      ? "bg-amber-500 text-white shadow-xs ring-1 ring-amber-600"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Installed (Active)</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSolar(false)}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    !isEnabled
                      ? "bg-slate-700 text-white shadow-xs dark:bg-slate-800"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <span>Disabled (No Solar)</span>
                </button>
              </div>
            </div>

            {/* DISABLED STATE: Prominent 1-Click Banner */}
            {!isEnabled && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center sm:flex-row sm:text-left dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Rooftop Solar PV is currently disabled for this shelter
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Operating in 100% passive solar mode. Enable solar panels anytime to simulate on-site electric generation.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSolar(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 active:scale-95 transition"
                >
                  <Zap className="h-3.5 w-3.5" />
                  + Install Rooftop Solar Panels
                </button>
              </div>
            )}

            {isEnabled && (
              <div className="mt-4 space-y-4">
                {/* Live Real-time Telemetry Bar */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg border border-amber-200 bg-white/80 p-3 shadow-xs dark:border-amber-900/60 dark:bg-slate-900/80">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Array Capacity</span>
                    <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                      {totalKw} <span className="text-xs font-normal text-slate-500">kWp</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Module Count</span>
                    <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                      {count} <span className="text-xs font-normal text-slate-500">panels</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Collector Area</span>
                    <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                      {estArea} <span className="text-xs font-normal text-slate-500">m²</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Est. Daily Yield (Ladakh)</span>
                    <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      ~{estDailyKwh} <span className="text-xs font-normal text-slate-500">kWh/day</span>
                    </p>
                  </div>
                </div>

                {/* Parameter Inputs */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <FieldWrapper
                    label="Panel Count"
                    unit="modules"
                    tooltip="Number of standard 1.95m² solar photovoltaic panels installed on the roof."
                  >
                    <input
                      type="number"
                      min={1}
                      max={48}
                      step={1}
                      value={count}
                      onChange={(e) => {
                        setValue("roof.solarPanels", {
                          ...solarPanels,
                          panelCount: Math.max(1, Number(e.target.value) || 1),
                        });
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </FieldWrapper>

                  <FieldWrapper
                    label="Module Rated Power"
                    unit="Wp"
                    tooltip="Nominal peak output rating per individual panel (standard tier: 400Wp, high performance: 550Wp)."
                  >
                    <input
                      type="number"
                      min={100}
                      max={750}
                      step={10}
                      value={wattage}
                      onChange={(e) => {
                        setValue("roof.solarPanels", {
                          ...solarPanels,
                          panelWattageW: Math.max(100, Number(e.target.value) || 400),
                        });
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </FieldWrapper>

                  <FieldWrapper
                    label="Module Efficiency"
                    unit="%"
                    tooltip="Solar cell conversion efficiency (monocrystalline PERC: 20-22%, TOPCon/HJT: 22-24%)."
                  >
                    <input
                      type="number"
                      min={10}
                      max={30}
                      step={0.1}
                      value={efficiency}
                      onChange={(e) => {
                        setValue("roof.solarPanels", {
                          ...solarPanels,
                          panelEfficiencyPct: Math.max(10, Number(e.target.value) || 21.5),
                        });
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </FieldWrapper>

                  <FieldWrapper
                    label="Racking Tilt Angle"
                    unit="°"
                    tooltip="Tilt relative to horizontal horizon. In high-altitude Ladakh (lat ~34°N), 30° to 45° optimizes winter harvest and self-clearing snow shed."
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={75}
                          step={1}
                          value={tilt}
                          onChange={(e) => {
                            setValue("roof.solarPanels", {
                              ...solarPanels,
                              tiltAngleDeg: Number(e.target.value),
                            });
                          }}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-amber-500 dark:bg-slate-700"
                        />
                        <input
                          type="number"
                          min={0}
                          max={85}
                          step={1}
                          value={tilt}
                          onChange={(e) => {
                            setValue("roof.solarPanels", {
                              ...solarPanels,
                              tiltAngleDeg: Math.max(0, Math.min(85, Number(e.target.value) || 30)),
                            });
                          }}
                          className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <button type="button" onClick={() => setValue("roof.solarPanels", { ...solarPanels, tiltAngleDeg: 15 })} className="hover:text-amber-500 transition">15°</button>
                        <button type="button" onClick={() => setValue("roof.solarPanels", { ...solarPanels, tiltAngleDeg: 30 })} className="hover:text-amber-500 font-semibold text-amber-600 transition">30° (Std)</button>
                        <button type="button" onClick={() => setValue("roof.solarPanels", { ...solarPanels, tiltAngleDeg: 45 })} className="hover:text-amber-500 transition">45° (Winter)</button>
                        <button type="button" onClick={() => setValue("roof.solarPanels", { ...solarPanels, tiltAngleDeg: 60 })} className="hover:text-amber-500 transition">60° (Snow)</button>
                      </div>
                    </div>
                  </FieldWrapper>

                  <FieldWrapper
                    label="Racking Mounting System"
                    tooltip="Structural mounting hardware anchored to roof framing or ballasted against alpine wind loads."
                  >
                    <select
                      value={mounting}
                      onChange={(e) => {
                        setValue("roof.solarPanels", {
                          ...solarPanels,
                          mountingType: e.target.value as any,
                        });
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="UnistrutElevated">Elevated Unistrut Frame (300mm Snow Clearance)</option>
                      <option value="FlushMount">Flush Roof Mounting (Seam Clamped)</option>
                      <option value="BallastedRacking">Heavy Ballasted Non-Penetrating Racking</option>
                    </select>
                  </FieldWrapper>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-amber-100/60 p-2.5 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <Zap className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong>Real-time dispatch impact:</strong> This {totalKw} kWp rooftop array directly feeds the thermal battery bank and electric radiant heating coils, slashing diurnal heating deficit before kerosene backup is initiated.
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
