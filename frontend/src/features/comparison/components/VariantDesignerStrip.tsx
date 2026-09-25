"use client";

import React from "react";
import {
  Sliders,
  Sparkles,
  Plus,
  Trash2,
  Layers,
  Box,
  Sun,
  ShieldCheck,
  Thermometer,
  Zap,
} from "lucide-react";
import { ShelterVariant, VariantMetrics } from "../variant-calculator";
import { MaterialItem } from "@/lib/store/use-shelter-store";

interface VariantDesignerStripProps {
  variants: ShelterVariant[];
  metrics: VariantMetrics[];
  materials: MaterialItem[];
  onUpdateVariant: (index: number, updated: ShelterVariant) => void;
  onAddVariant: () => void;
  onRemoveVariant: (index: number) => void;
}

const WALL_INSULATION_OPTIONS = [
  { id: "mat-eps-insulation", name: "Expanded Polystyrene (EPS)", k: "0.035" },
  { id: "mat-polyurethane-foam", name: "Rigid Polyurethane (PIR/PUR)", k: "0.024" },
  { id: "mat-xps-insulation", name: "Extruded Polystyrene (XPS)", k: "0.029" },
  { id: "mat-spray-puf", name: "Spray Polyurethane Foam (SPF)", k: "0.022" },
  { id: "mat-mineral-wool", name: "High-Density Rockwool", k: "0.038" },
  { id: "mat-aerogel-blanket", name: "Silica Aerogel Blanket", k: "0.015" },
  { id: "mat-hemp-fiber-board", name: "Hemp Fiber Board (Bio)", k: "0.040" },
  { id: "mat-wood-fiber-insulation", name: "Rigid Wood Fiber Board", k: "0.038" },
];

const THERMAL_MASS_OPTIONS = [
  { id: "mat-rammed-earth", name: "Stabilized Rammed Earth (Local)", k: "1.25" },
  { id: "mat-adobe-block", name: "Compressed Earth Block (CSEB / Adobe)", k: "0.75" },
  { id: "mat-concrete-slab", name: "Heavy Concrete Slab", k: "1.40" },
  { id: "mat-granite-stone", name: "Granite Stone Masonry", k: "2.80" },
  { id: "mat-sandstone-masonry", name: "Sandstone Ashlar Masonry", k: "1.60" },
  { id: "mat-ferrocement-panel", name: "Precast Ferrocement Panel", k: "1.35" },
];

const ROOF_INSULATION_OPTIONS = [
  { id: "mat-eps-insulation", name: "EPS Continuous Insulation", k: "0.035" },
  { id: "mat-polyurethane-foam", name: "PIR / Polyurethane Rigid Core", k: "0.024" },
  { id: "mat-mineral-wool", name: "Rockwool Stone Wool Batt", k: "0.038" },
  { id: "mat-xps-insulation", name: "XPS Moisture-Proof Deck", k: "0.029" },
];

const GLAZING_OPTIONS = [
  { id: "mat-triple-low-e-krypton", name: "Triple Glazed Low-E Krypton", u: "0.78 W/m²K" },
  { id: "mat-double-low-e", name: "Double Glazed Low-E Argon", u: "1.40 W/m²K" },
  { id: "mat-double-clear-glass", name: "Double Glazed Clear Float", u: "2.80 W/m²K" },
  { id: "mat-single-clear-glass", name: "Single Clear Float (Baseline)", u: "5.70 W/m²K" },
  { id: "mat-quad-glazing", name: "Quadruple Glazed Ultra-Alpine", u: "0.45 W/m²K" },
];

export function VariantDesignerStrip({
  variants,
  metrics,
  materials,
  onUpdateVariant,
  onAddVariant,
  onRemoveVariant,
}: VariantDesignerStripProps) {
  const getBadgeColor = (idx: number) => {
    switch (idx) {
      case 0:
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case 1:
        return "bg-sky-500/10 text-sky-600 border-sky-500/20";
      case 2:
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case 3:
      default:
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <span>Shelter Design Variants Configurator</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test different materials, thicknesses, glazing, and dimensions on the same base habitat model.
          </p>
        </div>

        {variants.length < 4 && (
          <button
            type="button"
            onClick={onAddVariant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Add Variant</span>
          </button>
        )}
      </div>

      {/* Grid of Variant Config Cards */}
      <div
        className={`grid gap-4 ${
          variants.length === 2
            ? "grid-cols-1 md:grid-cols-2"
            : variants.length === 3
            ? "grid-cols-1 md:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {variants.map((v, idx) => {
          const m = metrics[idx];
          const badgeClass = getBadgeColor(idx);
          const letter = String.fromCharCode(65 + idx); // 'A', 'B', 'C', 'D'

          return (
            <div
              key={v.id}
              className="rounded-3xl bg-card border border-border/80 p-4 shadow-xs flex flex-col justify-between space-y-4 relative group"
            >
              {/* Header */}
              <div className="space-y-2 border-b border-border/60 pb-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider border ${badgeClass}`}
                  >
                    Variant {letter}
                  </span>

                  <div className="flex items-center gap-1">
                    {variants.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onRemoveVariant(idx)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Remove Variant"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={v.name}
                  onChange={(e) => onUpdateVariant(idx, { ...v, name: e.target.value })}
                  className="w-full text-xs font-bold text-foreground bg-transparent outline-none border-b border-transparent focus:border-primary transition"
                  placeholder={`Variant ${letter} Name`}
                />

                {/* Instant Live Metrics Pill */}
                {m && (
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground font-semibold">
                      Wall U: {m.wallUValue} W/m²K
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      {m.estimatedComfortPct}% Comfort
                    </span>
                  </div>
                )}
              </div>

              {/* Form Controls */}
              <div className="space-y-3.5 text-xs">
                {/* 1. Wall Insulation */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Wall Insulation</span>
                    <span className="font-mono text-foreground font-semibold">{v.wallInsulationThicknessMm} mm</span>
                  </label>
                  <select
                    value={v.wallInsulationMatId}
                    onChange={(e) => onUpdateVariant(idx, { ...v, wallInsulationMatId: e.target.value })}
                    className="w-full bg-secondary/70 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer"
                  >
                    {WALL_INSULATION_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-popover text-foreground">
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="range"
                    min="50"
                    max="250"
                    step="25"
                    value={v.wallInsulationThicknessMm}
                    onChange={(e) =>
                      onUpdateVariant(idx, { ...v, wallInsulationThicknessMm: parseInt(e.target.value) })
                    }
                    className="w-full accent-primary cursor-pointer h-1.5 bg-secondary rounded-lg"
                  />
                </div>

                {/* 2. Internal Thermal Mass */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Thermal Mass Wall</span>
                    <span className="font-mono text-foreground font-semibold">{v.wallMassThicknessMm} mm</span>
                  </label>
                  <select
                    value={v.wallMassMatId}
                    onChange={(e) => onUpdateVariant(idx, { ...v, wallMassMatId: e.target.value })}
                    className="w-full bg-secondary/70 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer"
                  >
                    {THERMAL_MASS_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-popover text-foreground">
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="range"
                    min="100"
                    max="400"
                    step="50"
                    value={v.wallMassThicknessMm}
                    onChange={(e) =>
                      onUpdateVariant(idx, { ...v, wallMassThicknessMm: parseInt(e.target.value) })
                    }
                    className="w-full accent-primary cursor-pointer h-1.5 bg-secondary rounded-lg"
                  />
                </div>

                {/* 3. Roof Insulation */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Roof Insulation</span>
                    <span className="font-mono text-foreground font-semibold">{v.roofInsulationThicknessMm} mm</span>
                  </label>
                  <select
                    value={v.roofInsulationMatId}
                    onChange={(e) => onUpdateVariant(idx, { ...v, roofInsulationMatId: e.target.value })}
                    className="w-full bg-secondary/70 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer"
                  >
                    {ROOF_INSULATION_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-popover text-foreground">
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="range"
                    min="100"
                    max="300"
                    step="25"
                    value={v.roofInsulationThicknessMm}
                    onChange={(e) =>
                      onUpdateVariant(idx, { ...v, roofInsulationThicknessMm: parseInt(e.target.value) })
                    }
                    className="w-full accent-primary cursor-pointer h-1.5 bg-secondary rounded-lg"
                  />
                </div>

                {/* 4. Solar Glazing */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Solar Aperture Glazing
                  </label>
                  <select
                    value={v.glazingMatId}
                    onChange={(e) => onUpdateVariant(idx, { ...v, glazingMatId: e.target.value })}
                    className="w-full bg-secondary/70 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer"
                  >
                    {GLAZING_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-popover text-foreground">
                        {opt.name} ({opt.u})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Size (L x W x H) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Shelter Size (L × W × H)</span>
                    <span className="font-mono text-foreground font-semibold">
                      {v.length}×{v.width}×{v.height} m
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <span className="text-[9px] text-muted-foreground">L (m)</span>
                      <input
                        type="number"
                        min="3"
                        max="15"
                        step="0.5"
                        value={v.length}
                        onChange={(e) =>
                          onUpdateVariant(idx, { ...v, length: parseFloat(e.target.value) || 6 })
                        }
                        className="w-full bg-secondary/70 border border-border rounded-lg px-2 py-1 text-xs text-foreground font-mono outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground">W (m)</span>
                      <input
                        type="number"
                        min="2.5"
                        max="10"
                        step="0.5"
                        value={v.width}
                        onChange={(e) =>
                          onUpdateVariant(idx, { ...v, width: parseFloat(e.target.value) || 4 })
                        }
                        className="w-full bg-secondary/70 border border-border rounded-lg px-2 py-1 text-xs text-foreground font-mono outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground">H (m)</span>
                      <input
                        type="number"
                        min="2.2"
                        max="4"
                        step="0.1"
                        value={v.height}
                        onChange={(e) =>
                          onUpdateVariant(idx, { ...v, height: parseFloat(e.target.value) || 2.8 })
                        }
                        className="w-full bg-secondary/70 border border-border rounded-lg px-2 py-1 text-xs text-foreground font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. PCM Phase Change Thermal Battery */}
                <div className="pt-1 flex items-center justify-between border-t border-border/50">
                  <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3 text-amber-500" />
                    <span>21°C PCM Battery</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.hasPcm}
                      onChange={(e) => onUpdateVariant(idx, { ...v, hasPcm: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
