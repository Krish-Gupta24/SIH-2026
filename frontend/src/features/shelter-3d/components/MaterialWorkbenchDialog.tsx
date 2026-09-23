"use client";

import { useMemo, useState } from "react";
import { Check, Layers3, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AssemblyModel, LayerModel, ShelterModel } from "@/types/shelter";
import type { WallOrientation } from "../types";
import { materialAppearance } from "../procedural-textures";

type AssemblyTarget = "walls" | "roof" | "floor";

const materials = [
  { id: "mat-aerogel-blanket", name: "Aerogel blanket", category: "Super insulation", conductivity: 0.015, carbon: "Low", tone: "ice" },
  { id: "mat-eps-insulation", name: "Rigid EPS insulation", category: "Insulation", conductivity: 0.036, carbon: "Medium", tone: "blue" },
  { id: "mat-xps-insulation", name: "XPS insulation", category: "Ground insulation", conductivity: 0.029, carbon: "Medium", tone: "blue" },
  { id: "mat-rammed-earth", name: "Stabilized rammed earth", category: "Thermal mass", conductivity: 1.25, carbon: "Low", tone: "earth" },
  { id: "mat-stone-masonry", name: "Local granite masonry", category: "Structure", conductivity: 2.2, carbon: "Low", tone: "stone" },
  { id: "mat-timber-deck", name: "Pine timber deck", category: "Bio-based", conductivity: 0.13, carbon: "Very low", tone: "wood" },
  { id: "mat-concrete-slab", name: "Heavy concrete slab", category: "Thermal mass", conductivity: 1.7, carbon: "High", tone: "stone" },
  { id: "mat-galvanized-steel", name: "Galvanized steel", category: "Weather layer", conductivity: 50, carbon: "High", tone: "metal" },
  { id: "mat-weather-barrier", name: "Breathable weather barrier", category: "Air / weather control", conductivity: 0.19, carbon: "Low", tone: "blue" },
  { id: "mat-vapor-control", name: "Vapor control membrane", category: "Moisture control", conductivity: 0.22, carbon: "Low", tone: "blue" },
  { id: "mat-timber-frame", name: "Timber structural frame", category: "Structure", conductivity: 0.13, carbon: "Very low", tone: "wood" },
];

const presets: Record<AssemblyTarget, { name: string; description: string; layers: LayerModel[] }[]> = {
  walls: [
    { name: "Alpine mass wall", description: "Cladding, weather control, frame, continuous insulation and internal thermal mass.", layers: [{ materialId: "mat-galvanized-steel", name: "Exterior cladding", thickness: 0.008 }, { materialId: "mat-weather-barrier", name: "Weather / air barrier", thickness: 0.006 }, { materialId: "mat-timber-frame", name: "Structural frame", thickness: 0.09 }, { materialId: "mat-eps-insulation", name: "Continuous insulation", thickness: 0.15 }, { materialId: "mat-rammed-earth", name: "Thermal mass core", thickness: 0.3 }, { materialId: "mat-vapor-control", name: "Vapor control layer", thickness: 0.004 }, { materialId: "mat-timber-deck", name: "Interior lining", thickness: 0.018 }] },
    { name: "Ultra-light envelope", description: "Slim, high-performance assembly for constrained sites.", layers: [{ materialId: "mat-aerogel-blanket", name: "Aerogel blanket", thickness: 0.06 }, { materialId: "mat-timber-deck", name: "Pine timber deck", thickness: 0.04 }] },
  ],
  roof: [
    { name: "Cold-climate roof", description: "Standing-seam cladding, weather control, insulated structure and finished ceiling.", layers: [{ materialId: "mat-galvanized-steel", name: "Exterior roof cladding", thickness: 0.005 }, { materialId: "mat-weather-barrier", name: "Weather / air barrier", thickness: 0.006 }, { materialId: "mat-timber-frame", name: "Roof structural frame", thickness: 0.12 }, { materialId: "mat-eps-insulation", name: "Continuous insulation", thickness: 0.18 }, { materialId: "mat-vapor-control", name: "Vapor control layer", thickness: 0.004 }, { materialId: "mat-timber-deck", name: "Interior ceiling lining", thickness: 0.025 }] },
    { name: "Compact aerogel roof", description: "Reduced depth with premium thermal resistance.", layers: [{ materialId: "mat-galvanized-steel", name: "Galvanized steel", thickness: 0.005 }, { materialId: "mat-aerogel-blanket", name: "Aerogel blanket", thickness: 0.08 }, { materialId: "mat-timber-deck", name: "Pine timber deck", thickness: 0.025 }] },
  ],
  floor: [
    { name: "Insulated ground slab", description: "Durable inner finish over mass core, moisture protection and sub-slab insulation.", layers: [{ materialId: "mat-timber-deck", name: "Interior floor finish", thickness: 0.025 }, { materialId: "mat-concrete-slab", name: "Thermal mass core", thickness: 0.15 }, { materialId: "mat-vapor-control", name: "Ground moisture barrier", thickness: 0.006 }, { materialId: "mat-xps-insulation", name: "Sub-slab insulation", thickness: 0.1 }] },
    { name: "Low-carbon floor", description: "Timber surface over high-performance insulation.", layers: [{ materialId: "mat-timber-deck", name: "Pine timber deck", thickness: 0.05 }, { materialId: "mat-aerogel-blanket", name: "Aerogel blanket", thickness: 0.06 }] },
  ],
};

const walls: WallOrientation[] = ["north", "south", "east", "west"];

function materialFor(id: string) {
  return materials.find((material) => material.id === id) ?? materials[1];
}

function assemblyMetrics(layers: LayerModel[]) {
  const resistance = layers.reduce((sum, layer) => sum + layer.thickness / materialFor(layer.materialId).conductivity, 0) + 0.17;
  return {
    thickness: layers.reduce((sum, layer) => sum + layer.thickness, 0),
    resistance,
    uValue: resistance > 0 ? 1 / resistance : 0,
  };
}

interface Props {
  open: boolean;
  model: ShelterModel;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<ShelterModel>) => void;
}

export function MaterialWorkbenchDialog({ open, model, onOpenChange, onUpdate }: Props) {
  const [target, setTarget] = useState<AssemblyTarget>("walls");
  const [wall, setWall] = useState<WallOrientation>("south");

  const assembly: AssemblyModel = target === "walls" ? model.envelope.walls[wall] : model.envelope[target];
  const metrics = useMemo(() => assemblyMetrics(assembly.layers), [assembly.layers]);

  const updateAssembly = (next: AssemblyModel) => {
    if (target === "walls") {
      onUpdate({ envelope: { ...model.envelope, walls: { ...model.envelope.walls, [wall]: next } } });
      return;
    }
    onUpdate({ envelope: { ...model.envelope, [target]: { ...model.envelope[target], ...next } } });
  };

  const updateLayer = (index: number, patch: Partial<LayerModel>) => {
    updateAssembly({ ...assembly, layers: assembly.layers.map((layer, layerIndex) => layerIndex === index ? { ...layer, ...patch } : layer) });
  };

  const applyPreset = (preset: (typeof presets)[AssemblyTarget][number]) => {
    updateAssembly({ ...assembly, constructionId: `custom-${target}-${Date.now()}`, name: preset.name, layers: structuredClone(preset.layers) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} contentClassName="max-w-4xl w-[calc(100vw-2rem)] p-0 overflow-hidden border border-border bg-card rounded-2xl shadow-2xl">
      {/* Header */}
      <div className="border-b border-border bg-muted/20 px-6 py-5 pr-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers3 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-foreground">
                  Material Assembly Workbench
                </h2>
                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border">
                  Envelope Spec
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure layered assemblies and inspect thermal resistance across envelope surfaces.
              </p>
            </div>
          </div>

          {/* Quick Metrics Chips */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="rounded-xl border border-border bg-background px-3 py-1.5 text-center shadow-xs">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Thickness</div>
              <div className="text-xs font-mono font-bold text-foreground">{Math.round(metrics.thickness * 1000)} mm</div>
            </div>
            <div className="rounded-xl border border-border bg-background px-3 py-1.5 text-center shadow-xs">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">R-Value</div>
              <div className="text-xs font-mono font-bold text-foreground">{metrics.resistance.toFixed(2)} m²K/W</div>
            </div>
            <div className="rounded-xl border border-border bg-background px-3 py-1.5 text-center shadow-xs">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">U-Value</div>
              <div className="text-xs font-mono font-bold text-primary">{metrics.uValue.toFixed(2)} W/m²K</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={target} onValueChange={(value) => setTarget(value as AssemblyTarget)} className="w-full">
        {/* Assembly Tabs Navigation */}
        <div className="flex items-center justify-between border-b border-border bg-muted/10 px-6 py-2.5">
          <TabsList className="h-9 p-1 bg-muted/60 rounded-xl gap-1">
            <TabsTrigger value="walls" className="rounded-lg text-xs font-semibold px-3.5 py-1">Wall Systems</TabsTrigger>
            <TabsTrigger value="roof" className="rounded-lg text-xs font-semibold px-3.5 py-1">Roof System</TabsTrigger>
            <TabsTrigger value="floor" className="rounded-lg text-xs font-semibold px-3.5 py-1">Floor System</TabsTrigger>
          </TabsList>

          {target === "walls" && (
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border text-xs font-semibold">
              <span className="text-[11px] text-muted-foreground px-2">Orientation:</span>
              {walls.map((orientation) => (
                <button
                  key={orientation}
                  type="button"
                  data-active={wall === orientation}
                  onClick={() => setWall(orientation)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    wall === orientation
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  {orientation.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <TabsContent value={target} className="m-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] max-h-[58vh] overflow-y-auto">
            {/* Left Side: Layer Stack Editor */}
            <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Build-Up Layers</h3>
                  <div className="text-sm font-semibold text-foreground mt-0.5">{assembly.name || `${target} assembly`}</div>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">Exterior face → Interior face</span>
              </div>

              <div className="space-y-2.5">
                {assembly.layers.map((layer, index) => {
                  const material = materialFor(layer.materialId);
                  const appearance = materialAppearance(layer.materialId, layer.name);
                  const layerResistance = layer.thickness / material.conductivity;

                  return (
                    <div
                      key={`${layer.materialId}-${index}`}
                      className="rounded-xl border border-border bg-background p-3.5 shadow-xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-5 shrink-0 rounded-md border border-black/10 shadow-inner"
                            style={{ backgroundColor: appearance.color }}
                            title={`${layer.name} visual material`}
                          />
                          <span className="flex size-5 items-center justify-center rounded-md bg-muted text-[10px] font-bold font-mono text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="text-[11px] font-bold text-foreground">{layer.name}</span>
                          <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4 font-normal text-muted-foreground">
                            {material.category}
                          </Badge>
                        </div>

                        <button
                          type="button"
                          aria-label={`Remove layer ${index + 1}`}
                          disabled={assembly.layers.length === 1}
                          onClick={() =>
                            updateAssembly({
                              ...assembly,
                              layers: assembly.layers.filter((_, layerIndex) => layerIndex !== index),
                            })
                          }
                          className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-20"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                        {/* Material Selector */}
                        <div className="sm:col-span-7">
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Material</label>
                          <select
                            aria-label={`Layer ${index + 1} material`}
                            value={layer.materialId}
                            onChange={(event) => {
                              const next = materialFor(event.target.value);
                              updateLayer(index, { materialId: next.id, name: next.name });
                            }}
                            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                          >
                            {materials.map((option) => (
                              <option value={option.id} key={option.id}>
                                {option.name} (λ = {option.conductivity} W/mK)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Thickness Input */}
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Thickness (mm)</label>
                          <div className="relative">
                            <input
                              aria-label={`Layer ${index + 1} thickness`}
                              type="number"
                              min="1"
                              max="600"
                              step="5"
                              value={Math.round(layer.thickness * 1000)}
                              onChange={(event) =>
                                updateLayer(index, {
                                  thickness: Math.max(0.001, Number(event.target.value) / 1000),
                                })
                              }
                              className="w-full rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-xs font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                              R {layerResistance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() =>
                    updateAssembly({
                      ...assembly,
                      layers: [
                        ...assembly.layers,
                        { materialId: materials[1].id, name: materials[1].name, thickness: 0.05 },
                      ],
                    })
                  }
                  className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/40 transition"
                >
                  <Plus className="size-4" /> Add Construction Layer
                </button>
              </div>
            </div>

            {/* Right Side: Performance Presets */}
            <div className="lg:col-span-5 p-6 bg-muted/15 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Curated Presets</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">High-altitude certified assemblies</p>
                </div>
                <Sparkles className="size-4 text-primary" />
              </div>

              <div className="space-y-2.5">
                {presets[target].map((preset) => {
                  const presetMetrics = assemblyMetrics(preset.layers);
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="w-full text-left rounded-xl border border-border bg-background p-3.5 shadow-xs hover:border-primary/50 hover:bg-muted/20 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {preset.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                          U {presetMetrics.uValue.toFixed(2)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2 font-mono">
                        <span>{Math.round(presetMetrics.thickness * 1000)} mm depth</span>
                        <span>{preset.layers.length} layers</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border/80 bg-background/60 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  All layers automatically export to standard ThermoShelter material constructions and thermal conductivity models.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="border-t border-border bg-muted/20 px-6 py-4 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Check className="size-4 text-emerald-600" />
          Changes synchronized to <strong className="text-foreground font-semibold">{model.project.name}</strong>
        </span>
        <Button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-xl px-5 py-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Done
        </Button>
      </div>
    </Dialog>
  );
}
