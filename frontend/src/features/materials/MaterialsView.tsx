"use client";

import React, { useState } from "react";
import {
  Layers,
  Plus,
  Search,
  Trash2,
  HelpCircle,
  Calculator,
  ShieldCheck,
} from "lucide-react";
import { useShelterStore, MaterialItem } from "@/lib/store/use-shelter-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function MaterialsView() {
  const { materials, addMaterial, deleteMaterial } = useShelterStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // R-value interactive calculator state
  const [calcMaterialId, setCalcMaterialId] = useState(materials[0]?.id || "mat-eps-insulation");
  const [calcThicknessMm, setCalcThicknessMm] = useState(150);

  // Modal state
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

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim()) return;

    const k = parseFloat(newMatConductivity) || 0.035;
    const rho = parseFloat(newMatDensity) || 30;
    const cp = parseFloat(newMatSpecificHeat) || 1400;

    addMaterial({
      id: `mat-custom-${Date.now().toString().slice(-6)}`,
      name: newMatName.trim(),
      category: newMatCategory,
      thermalConductivity: k,
      density: rho,
      specificHeat: cp,
      notes: newMatNotes.trim() || "User-defined custom engineering material.",
    });

    setIsCreateOpen(false);
    setNewMatName("");
    setNewMatNotes("");
  };

  const categories = ["All", "Insulation", "Mass / Masonry", "Structure / Metal", "Wood / Finish", "Glazing"];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-blue-400" />
            Thermal Materials Database
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Physical thermal properties (k, ρ, Cp) verified for high-altitude cold climate envelopes.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 font-bold shadow-sm">
          <Plus className="h-4 w-4" />
          Add Custom Material
        </Button>
      </div>

      {/* Interactive Thermal R-Value & U-Value Calculator */}
      <Card className="border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4 max-w-md w-full">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Calculator className="h-4 w-4" />
              Live Thermal Resistance Calculator
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Selected Material</label>
              <select
                value={calcMaterialId}
                onChange={(e) => setCalcMaterialId(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.thermalConductivity} W/m-K)
                  </option>
                ))}
              </select>
            </div>

            <Slider
              label="Layer Thickness"
              value={calcThicknessMm}
              onValueChange={setCalcThicknessMm}
              min={10}
              max={400}
              step={5}
              unit="mm"
            />
          </div>

          {/* Calculator Output KPI badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full lg:w-auto">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-center min-w-[130px]">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Conductivity (k)</div>
              <div className="text-lg font-mono font-bold text-white mt-1">
                {activeCalcMat?.thermalConductivity}
              </div>
              <div className="text-[10px] text-slate-500">W/m-K</div>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-4 text-center min-w-[130px]">
              <div className="text-[10px] font-bold text-blue-400 uppercase">Thermal R-Value</div>
              <div className="text-xl font-mono font-bold text-blue-400 mt-1">
                {calculatedRValue.toFixed(2)}
              </div>
              <div className="text-[10px] text-blue-400/80">m²-K / W</div>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center min-w-[130px]">
              <div className="text-[10px] font-bold text-emerald-400 uppercase">Thermal U-Value</div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                {calculatedUValue.toFixed(3)}
              </div>
              <div className="text-[10px] text-emerald-400/80">W / m²-K</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search materials by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="text-xs"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Materials Table */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Conductivity (W/m-K)</TableHead>
                <TableHead>Density (kg/m³)</TableHead>
                <TableHead>Specific Heat (J/kg-K)</TableHead>
                <TableHead>Standard Thickness</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-bold text-white">{m.name}</div>
                    {m.notes && <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{m.notes}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {m.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-blue-400">
                    {m.thermalConductivity}
                  </TableCell>
                  <TableCell className="font-mono text-slate-300">{m.density}</TableCell>
                  <TableCell className="font-mono text-slate-300">{m.specificHeat}</TableCell>
                  <TableCell className="font-mono text-slate-400">
                    {m.standardThicknessMm ? `${m.standardThicknessMm} mm` : "Custom"}
                  </TableCell>
                  <TableCell className="text-right">
                    {m.id.startsWith("mat-custom") ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMaterial(m.id)}
                        className="text-red-400 hover:bg-red-950/40 h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Core</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Custom Material Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <form onSubmit={handleCreateMaterial} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add Custom Thermal Material</DialogTitle>
            <DialogDescription>
              Define physical engineering parameters for your envelope assembly layers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Material Name</label>
              <Input
                placeholder="e.g. Local Himalayan Sheep Wool Insulation"
                value={newMatName}
                onChange={(e) => setNewMatName(e.target.value)}
                required
                className="mt-1 bg-slate-950 border-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Category</label>
              <select
                value={newMatCategory}
                onChange={(e) => setNewMatCategory(e.target.value as any)}
                className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                <option value="Insulation">Insulation</option>
                <option value="Mass / Masonry">Mass / Masonry</option>
                <option value="Structure / Metal">Structure / Metal</option>
                <option value="Wood / Finish">Wood / Finish</option>
                <option value="Glazing">Glazing</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-300">k (W/m-K)</label>
                <Input
                  type="number"
                  step="0.001"
                  value={newMatConductivity}
                  onChange={(e) => setNewMatConductivity(e.target.value)}
                  required
                  className="mt-1 bg-slate-950 border-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">ρ (kg/m³)</label>
                <Input
                  type="number"
                  step="1"
                  value={newMatDensity}
                  onChange={(e) => setNewMatDensity(e.target.value)}
                  required
                  className="mt-1 bg-slate-950 border-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Cp (J/kg-K)</label>
                <Input
                  type="number"
                  step="10"
                  value={newMatSpecificHeat}
                  onChange={(e) => setNewMatSpecificHeat(e.target.value)}
                  required
                  className="mt-1 bg-slate-950 border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Engineering Notes / Source</label>
              <Input
                placeholder="e.g. Tested at NIT Srinagar / ASHRAE Fundamentals table"
                value={newMatNotes}
                onChange={(e) => setNewMatNotes(e.target.value)}
                className="mt-1 bg-slate-950 border-slate-800"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="font-bold">
              Save Material
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
