"use client";

import { useMemo, useState } from "react";
import { Check, Layers3, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AssemblyModel, LayerModel, ShelterModel } from "@/types/shelter";
import type { WallOrientation } from "../types";

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
];

const presets: Record<AssemblyTarget, { name: string; description: string; layers: LayerModel[] }[]> = {
  walls: [
    { name: "Alpine mass wall", description: "High inertia with continuous exterior insulation.", layers: [{ materialId: "mat-eps-insulation", name: "Rigid EPS insulation", thickness: 0.15 }, { materialId: "mat-rammed-earth", name: "Stabilized rammed earth", thickness: 0.3 }] },
    { name: "Ultra-light envelope", description: "Slim, high-performance assembly for constrained sites.", layers: [{ materialId: "mat-aerogel-blanket", name: "Aerogel blanket", thickness: 0.06 }, { materialId: "mat-timber-deck", name: "Pine timber deck", thickness: 0.04 }] },
  ],
  roof: [
    { name: "Cold-climate roof", description: "Weather skin, deep insulation and timber ceiling deck.", layers: [{ materialId: "mat-galvanized-steel", name: "Galvanized steel", thickness: 0.005 }, { materialId: "mat-eps-insulation", name: "Rigid EPS insulation", thickness: 0.18 }, { materialId: "mat-timber-deck", name: "Pine timber deck", thickness: 0.025 }] },
    { name: "Compact aerogel roof", description: "Reduced depth with premium thermal resistance.", layers: [{ materialId: "mat-galvanized-steel", name: "Galvanized steel", thickness: 0.005 }, { materialId: "mat-aerogel-blanket", name: "Aerogel blanket", thickness: 0.08 }, { materialId: "mat-timber-deck", name: "Pine timber deck", thickness: 0.025 }] },
  ],
  floor: [
    { name: "Insulated ground slab", description: "Exposed mass above continuous sub-slab insulation.", layers: [{ materialId: "mat-concrete-slab", name: "Heavy concrete slab", thickness: 0.15 }, { materialId: "mat-xps-insulation", name: "XPS insulation", thickness: 0.1 }] },
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
    <Dialog open={open} onOpenChange={onOpenChange} contentClassName="cad-material-dialog">
      <DialogHeader className="cad-material-header">
        <div className="cad-material-heading">
          <span className="cad-material-icon"><Layers3 /></span>
          <div>
            <Badge variant="outline">Envelope specification</Badge>
            <DialogTitle>Material assembly workbench</DialogTitle>
            <DialogDescription>Compose build-ups, compare thermal performance, and update the canonical shelter model.</DialogDescription>
          </div>
        </div>
        <div className="cad-material-score">
          <span><small>Assembly</small><strong>{Math.round(metrics.thickness * 1000)} mm</strong></span>
          <span><small>R-value</small><strong>{metrics.resistance.toFixed(2)} m²K/W</strong></span>
          <span><small>Est. U-value</small><strong>{metrics.uValue.toFixed(2)} W/m²K</strong></span>
        </div>
      </DialogHeader>

      <Tabs value={target} onValueChange={(value) => setTarget(value as AssemblyTarget)} className="cad-material-tabs">
        <TabsList className="cad-material-tabs-list">
          <TabsTrigger value="walls">Wall systems</TabsTrigger>
          <TabsTrigger value="roof">Roof system</TabsTrigger>
          <TabsTrigger value="floor">Floor system</TabsTrigger>
        </TabsList>

        <TabsContent value={target} className="cad-material-content">
          <section className="cad-assembly-editor">
            <div className="cad-material-section-heading">
              <div><span>01 · Active build-up</span><h3>{assembly.name || `${target} assembly`}</h3></div>
              {target === "walls" && <div className="cad-wall-selector" aria-label="Wall orientation">{walls.map((orientation) => <button key={orientation} data-active={wall === orientation} onClick={() => setWall(orientation)}>{orientation[0].toUpperCase()}</button>)}</div>}
            </div>

            <div className="cad-layer-editor">
              <div className="cad-layer-axis"><span>Exterior</span><span>Interior</span></div>
              {assembly.layers.map((layer, index) => {
                const material = materialFor(layer.materialId);
                return <div className="cad-layer-row" key={`${layer.materialId}-${index}`}>
                  <span className="cad-material-swatch" data-tone={material.tone} />
                  <span className="cad-layer-index">{String(index + 1).padStart(2, "0")}</span>
                  <label><span>Material</span><select aria-label={`Layer ${index + 1} material`} value={layer.materialId} onChange={(event) => { const next = materialFor(event.target.value); updateLayer(index, { materialId: next.id, name: next.name }); }}>{materials.map((option) => <option value={option.id} key={option.id}>{option.name}</option>)}</select></label>
                  <label className="cad-thickness-field"><span>Thickness</span><div><input aria-label={`Layer ${index + 1} thickness`} type="number" min="1" max="600" step="1" value={Math.round(layer.thickness * 1000)} onChange={(event) => updateLayer(index, { thickness: Math.max(0.001, Number(event.target.value) / 1000) })} /><small>mm</small></div></label>
                  <span className="cad-layer-property"><small>λ</small>{material.conductivity} W/mK</span>
                  <button aria-label={`Remove layer ${index + 1}`} disabled={assembly.layers.length === 1} onClick={() => updateAssembly({ ...assembly, layers: assembly.layers.filter((_, layerIndex) => layerIndex !== index) })}><Trash2 /></button>
                </div>;
              })}
              <button className="cad-add-layer" onClick={() => updateAssembly({ ...assembly, layers: [...assembly.layers, { materialId: materials[1].id, name: materials[1].name, thickness: 0.05 }] })}><Plus /> Add construction layer</button>
            </div>
          </section>

          <aside className="cad-material-library">
            <div className="cad-material-section-heading"><div><span>02 · Curated systems</span><h3>Performance presets</h3></div><Sparkles /></div>
            <div className="cad-preset-list">{presets[target].map((preset) => { const presetMetrics = assemblyMetrics(preset.layers); return <button key={preset.name} onClick={() => applyPreset(preset)}><span className="cad-preset-title"><strong>{preset.name}</strong><Badge variant="secondary">U {presetMetrics.uValue.toFixed(2)}</Badge></span><p>{preset.description}</p><span className="cad-preset-stack">{preset.layers.map((layer) => <i key={layer.materialId} data-tone={materialFor(layer.materialId).tone} style={{ flex: Math.max(1, layer.thickness * 100) }} />)}</span><small>{Math.round(presetMetrics.thickness * 1000)} mm · {preset.layers.length} layers</small></button>; })}</div>
            <div className="cad-material-note"><ShieldCheck /><div><strong>Simulation ready</strong><p>Values are synchronized to the model. Final U-values depend on complete material datasets.</p></div></div>
          </aside>
        </TabsContent>
      </Tabs>

      <DialogFooter className="cad-material-footer">
        <span><Check /> Changes synchronized to {model.project.name}</span>
        <Button type="button" onClick={() => onOpenChange(false)}>Done</Button>
      </DialogFooter>
    </Dialog>
  );
}
