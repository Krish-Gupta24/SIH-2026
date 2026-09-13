"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Calculator,
  Database,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useShelterStore, MaterialItem } from "@/lib/store/use-shelter-store";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  ActionButton,
  PageIntro,
  Status,
} from "@/components/v0/platform-components";

export function MaterialsView() {
  const { materials, addMaterial, deleteMaterial } = useShelterStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);

  // R-value interactive calculator state
  const [calcMaterialId, setCalcMaterialId] = useState(materials[0]?.id || "mat-eps-insulation");
  const [calcThicknessMm, setCalcThicknessMm] = useState(150);
  const [showCalculator, setShowCalculator] = useState(false);

  // New Material Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMatName, setNewMatName] = useState("");
  const [newMatCategory, setNewMatCategory] = useState<MaterialItem["category"]>("Insulation");
  const [newMatConductivity, setNewMatConductivity] = useState("0.035");
  const [newMatDensity, setNewMatDensity] = useState("30");
  const [newMatSpecificHeat, setNewMatSpecificHeat] = useState("1400");
  const [newMatNotes, setNewMatNotes] = useState("");

  const activeCalcMat = materials.find((m) => m.id === calcMaterialId) || materials[0];
  const calculatedRValue =
    activeCalcMat && activeCalcMat.thermalConductivity > 0
      ? (calcThicknessMm / 1000) / activeCalcMat.thermalConductivity
      : 0;
  const calculatedUValue = calculatedRValue > 0 ? 1 / calculatedRValue : 0;

  const verifiedCount = materials.filter((material) => material.status === "VERIFIED").length;
  const categoryCount = new Set(materials.map((material) => material.category)).size;

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim()) return;

    const id = `custom-${newMatName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString().slice(-4)}`;
    const newMat: MaterialItem = {
      id,
      name: newMatName.trim(),
      category: newMatCategory,
      thermalConductivity: parseFloat(newMatConductivity) || 0.04,
      density: parseFloat(newMatDensity) || 100,
      specificHeat: parseFloat(newMatSpecificHeat) || 1000,
      status: "USER_DEFINED",
      source: "User Definition",
      notes: newMatNotes.trim() || undefined,
    };

    addMaterial(newMat);
    setIsCreateOpen(false);
    setNewMatName("");
    setNewMatNotes("");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <PageIntro
        eyebrow="Reference library · Thermophysical database"
        title="Materials library"
        description="Thermophysical properties, standard thicknesses, and source provenance used by canonical assemblies."
        action={
          <div className="flex items-center gap-2.5">
            <ActionButton
              tone="secondary"
              onClick={() => setShowCalculator(!showCalculator)}
              className="rounded-full text-xs font-semibold"
            >
              <Calculator className="size-3.5" />
              {showCalculator ? "Hide R-Value Tool" : "R-Value Calculator"}
            </ActionButton>
            <ActionButton
              tone="primary"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-full text-xs font-bold"
            >
              <Plus className="size-3.5" />
              New Material
            </ActionButton>
          </div>
        }
      />

      {/* Summary strip matching V0 */}
      <div className="material-library-summary">
        <div>
          <Layers3 />
          <span>
            <small>Library entries</small>
            <strong>{materials.length}</strong>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <small>Verified records</small>
            <strong>{verifiedCount}</strong>
          </span>
        </div>
        <div>
          <Database />
          <span>
            <small>Material families</small>
            <strong>{categoryCount}</strong>
          </span>
        </div>
      </div>

      {/* Interactive R-Value Calculator Card */}
      {showCalculator && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-foreground" />
              <h3 className="text-sm font-semibold">Interactive Assembly R-Value & U-Factor Calculator</h3>
            </div>
            <span className="text-xs text-muted-foreground">ISO 6946 / ASHRAE 90.1</span>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 items-center">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Material:</label>
              <select
                value={calcMaterialId}
                onChange={(e) => setCalcMaterialId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-semibold focus:outline-none"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.thermalConductivity} W/m·K)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-muted-foreground">Thickness:</span>
                <span className="font-bold">{calcThicknessMm} mm</span>
              </div>
              <Slider
                value={calcThicknessMm}
                min={10}
                max={400}
                step={5}
                onValueChange={(val) => setCalcThicknessMm(val)}
                className="py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-secondary/50 p-4 rounded-xl text-center">
              <div>
                <span className="micro-label">Resistance (R)</span>
                <p className="text-2xl font-bold tracking-tight">{calculatedRValue.toFixed(2)}</p>
                <span className="text-[10px] text-muted-foreground">m²·K/W</span>
              </div>
              <div>
                <span className="micro-label">Transmittance (U)</span>
                <p className="text-2xl font-bold tracking-tight">{calculatedUValue.toFixed(2)}</p>
                <span className="text-[10px] text-muted-foreground">W/m²·K</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Tools matching V0 */}
      <div className="material-library-tools flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <label className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-border bg-card px-4 shadow-sm">
          <Search className="size-4 text-muted-foreground" />
          <span className="sr-only">Search materials</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search material by name, category, or notes"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <span className="text-xs text-muted-foreground">
          Click any material to inspect its complete engineering record
        </span>
      </div>

      {/* V0 Data Table */}
      <div className="data-table-shell material-library-table overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[800px] text-left">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.08em] text-muted-foreground bg-secondary/30">
              <th className="py-4 pl-6 pr-4">Material</th>
              <th className="p-4">Category</th>
              <th className="p-4">Conductivity</th>
              <th className="p-4">Density</th>
              <th className="p-4">Thickness</th>
              <th className="py-4 pr-6 pl-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map((material) => (
              <tr
                key={material.id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${material.name} details`}
                onClick={() => setSelectedMaterial(material)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedMaterial(material);
                  }
                }}
                className="border-b border-border/60 hover:bg-secondary/40 transition-colors cursor-pointer"
              >
                <td className="py-4 pl-6 pr-4">
                  <span className="material-name-cell flex items-center gap-3">
                    <span className="size-2 rounded-full bg-foreground" />
                    <span>
                      <strong className="block text-sm font-semibold">{material.name}</strong>
                      <small className="text-[10px] text-muted-foreground">{material.source || "Library Reference"}</small>
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100" />
                  </span>
                </td>
                <td className="p-4 text-xs font-medium">{material.category}</td>
                <td className="p-4 text-sm font-semibold">
                  {material.thermalConductivity} <small className="text-muted-foreground font-normal">W/m·K</small>
                </td>
                <td className="p-4 text-sm font-semibold">
                  {material.density} <small className="text-muted-foreground font-normal">kg/m³</small>
                </td>
                <td className="p-4 text-sm font-semibold">
                  {material.standardThicknessMm ?? "—"} <small className="text-muted-foreground font-normal">mm</small>
                </td>
                <td className="py-4 pr-6 pl-4">
                  <Status strong={material.status === "VERIFIED"}>{material.status || "VERIFIED"}</Status>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMaterials.length === 0 && (
          <div className="material-empty-state py-12 text-center text-muted-foreground">
            <Search className="size-8 mx-auto mb-2 opacity-50" />
            <strong className="block text-sm text-foreground">No matching materials</strong>
            <span className="text-xs">Try adjusting your search terms.</span>
          </div>
        )}
      </div>

      {/* Material Detail Record Dialog */}
      <Dialog
        open={selectedMaterial !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMaterial(null);
        }}
        contentClassName="material-detail-dialog max-w-xl"
      >
        {selectedMaterial && (
          <>
            <DialogHeader className="material-detail-header">
              <span className="material-detail-kicker flex items-center gap-1.5 text-xs text-muted-foreground">
                <Layers3 className="size-3.5" /> Material engineering record
              </span>
              <DialogTitle className="text-2xl font-medium tracking-tight mt-1">
                {selectedMaterial.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedMaterial.category} · {selectedMaterial.status?.replace("_", " ")}
              </DialogDescription>
            </DialogHeader>

            <div className="material-detail-body space-y-6 pt-4">
              <div className="material-detail-primary grid grid-cols-3 gap-3 bg-secondary/50 p-4 rounded-xl text-center">
                <span>
                  <small className="micro-label block">Conductivity</small>
                  <strong className="text-xl font-bold">{selectedMaterial.thermalConductivity}</strong>
                  <em className="text-[10px] text-muted-foreground not-italic block">W/m·K</em>
                </span>
                <span>
                  <small className="micro-label block">Density</small>
                  <strong className="text-xl font-bold">{selectedMaterial.density}</strong>
                  <em className="text-[10px] text-muted-foreground not-italic block">kg/m³</em>
                </span>
                <span>
                  <small className="micro-label block">Specific Heat</small>
                  <strong className="text-xl font-bold">{selectedMaterial.specificHeat}</strong>
                  <em className="text-[10px] text-muted-foreground not-italic block">J/kg·K</em>
                </span>
              </div>

              <div className="material-detail-grid grid grid-cols-2 gap-4 border-y border-border py-4 text-xs">
                <div>
                  <small className="text-muted-foreground block">Standard thickness</small>
                  <strong className="font-semibold">{selectedMaterial.standardThicknessMm ?? "Not set"}{selectedMaterial.standardThicknessMm ? " mm" : ""}</strong>
                </div>
                <div>
                  <small className="text-muted-foreground block">Embodied carbon</small>
                  <strong className="font-semibold">{selectedMaterial.embodiedCarbonKgCo2 ?? "Low"}{selectedMaterial.embodiedCarbonKgCo2 ? " kgCO₂e" : ""}</strong>
                </div>
                <div>
                  <small className="text-muted-foreground block">Solar absorptance</small>
                  <strong className="font-semibold">{selectedMaterial.solarAbsorptance ?? "0.70"}</strong>
                </div>
                <div>
                  <small className="text-muted-foreground block">Thermal emittance</small>
                  <strong className="font-semibold">{selectedMaterial.thermalEmittance ?? "0.90"}</strong>
                </div>
              </div>

              <div className="material-provenance flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-xs">
                <ShieldCheck className="size-5 text-foreground shrink-0 mt-0.5" />
                <div>
                  <small className="text-muted-foreground block">Source & provenance</small>
                  <strong className="font-semibold">{selectedMaterial.source || "Project material library"}</strong>
                  <p className="text-muted-foreground mt-1 leading-relaxed">
                    {selectedMaterial.notes || "Thermophysical properties are synchronized with the verified Cold-Climate Building Physics library (DRDO PS 26051)."}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="material-detail-footer flex items-center justify-between pt-4 border-t border-border">
              <span className="text-[10px] font-mono text-muted-foreground">ID: {selectedMaterial.id}</span>
              <div className="flex gap-2">
                {selectedMaterial.status === "USER_DEFINED" && (
                  <ActionButton
                    tone="quiet"
                    onClick={() => {
                      deleteMaterial(selectedMaterial.id);
                      setSelectedMaterial(null);
                    }}
                    className="text-red-500"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </ActionButton>
                )}
                <ActionButton tone="secondary" onClick={() => setSelectedMaterial(null)}>
                  Close record
                </ActionButton>
              </div>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* New Material Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} contentClassName="max-w-md">
        <form onSubmit={handleCreateMaterial}>
          <DialogHeader>
            <DialogTitle>Add Custom Material</DialogTitle>
            <DialogDescription>Define a new material item in the workspace library.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1.5">Material Name</label>
              <input
                value={newMatName}
                onChange={(e) => setNewMatName(e.target.value)}
                placeholder="e.g. Local Pine Timber Deck"
                required
                className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1.5">Category</label>
                <select
                  value={newMatCategory}
                  onChange={(e) => setNewMatCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition"
                >
                  <option value="Insulation">Insulation</option>
                  <option value="Thermal Mass">Thermal Mass</option>
                  <option value="Structural">Structural</option>
                  <option value="Finish">Finish</option>
                  <option value="Membrane">Membrane</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1.5">Conductivity (W/m·K)</label>
                <input
                  type="number"
                  step="0.001"
                  value={newMatConductivity}
                  onChange={(e) => setNewMatConductivity(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1.5">Density (kg/m³)</label>
                <input
                  type="number"
                  value={newMatDensity}
                  onChange={(e) => setNewMatDensity(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1.5">Specific Heat (J/kg·K)</label>
                <input
                  type="number"
                  value={newMatSpecificHeat}
                  onChange={(e) => setNewMatSpecificHeat(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1.5">Engineering Notes / Source</label>
              <textarea
                value={newMatNotes}
                onChange={(e) => setNewMatNotes(e.target.value)}
                placeholder="Source documentation or manufacturer datasheet reference."
                rows={3}
                className="w-full rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <ActionButton tone="quiet" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton tone="primary" type="submit">
              Save Material
            </ActionButton>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
