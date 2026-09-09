"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlusCircle,
  Wand2,
  Sparkles,
  Mountain,
  Compass,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const PRESET_TEMPLATES = [
  {
    id: "preset-leh-outpost",
    title: "Leh Ladakh High-Altitude Outpost (3500m)",
    climate: "Cold / Extreme Alpine",
    region: "Leh Ladakh, India",
    description: "Multi-layer passive solar design with stabilized rammed-earth mass, 150mm EPS insulation, and south solar glazing.",
    dimensions: "6.0m × 4.0m × 3.0m (24 m²)",
    insulation: "150mm EPS (R=4.54)",
    thermalMass: "High (Rammed Earth + Concrete Slab)",
    glazing: "Double Low-E Argon (South WWR 28%)",
  },
  {
    id: "preset-kargil-masonry",
    title: "Kargil Border Heavy Masonry Post (2676m)",
    climate: "Extreme Cold Continental",
    region: "Kargil, Ladakh, India",
    description: "Granite fieldstone exterior barrier with 120mm EPS thermal break and airtight vestibule door.",
    dimensions: "5.5m × 3.5m × 2.8m (19.2 m²)",
    insulation: "120mm EPS (R=3.85)",
    thermalMass: "Heavy Stone Masonry",
    glazing: "Double Low-E (South WWR 20%)",
  },
  {
    id: "preset-dras-arctic",
    title: "Dras Valley Sub-Arctic Extreme Shelter (3280m)",
    climate: "Sub-Arctic Alpine (Design Min -35°C)",
    region: "Dras, Kargil District, India",
    description: "Maximum thermal resistance envelope with 200mm XPS insulation, quad-layer thermal breaks, and HRV mechanical air exchange.",
    dimensions: "7.0m × 4.5m × 2.8m (31.5 m²)",
    insulation: "200mm XPS (R=6.90)",
    thermalMass: "Insulated Mass Floor Slab",
    glazing: "Triple Glazed Argon (U=0.8)",
  },
];

export function NewProjectView() {
  const router = useRouter();
  const { addProject } = useShelterStore();

  const [projectName, setProjectName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(PRESET_TEMPLATES[0].id);

  const handleCreateWithPreset = (presetId: string) => {
    // Navigate directly into 13-step wizard
    router.push("/designer");
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <PlusCircle className="h-6 w-6 text-blue-400" />
          Create New Shelter Project
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Choose a pre-engineered cold-climate baseline template or launch the 13-step parametric designer.
        </p>
      </div>

      {/* Recommended Wizard Banner */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/70 to-indigo-950/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Recommended Engineering Flow
            </span>
          </div>
          <h3 className="text-lg font-bold text-white">Full 13-Step Parametric Shelter Designer</h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Step-by-step guidance through geometry, multi-layer wall layers, roof & floor ground coupling, windows, doors, thermal mass, ventilation ACH, and EnergyPlus settings.
          </p>
        </div>

        <Link href="/designer">
          <Button size="lg" className="font-bold gap-2 whitespace-nowrap shadow-lg shadow-blue-600/30">
            <Wand2 className="h-4 w-4" />
            Launch 13-Step Wizard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Cold Climate Engineering Preset Templates */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Regional Cold-Climate Archetype Presets
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRESET_TEMPLATES.map((tpl) => (
            <Card
              key={tpl.id}
              className="border-slate-800 bg-slate-900/60 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Badge variant="cold" className="text-[10px]">
                    {tpl.climate}
                  </Badge>
                  <Mountain className="h-4 w-4 text-blue-400" />
                </div>
                <CardTitle className="text-sm font-bold text-white mt-2">{tpl.title}</CardTitle>
                <p className="text-xs text-slate-400 mt-1">{tpl.description}</p>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                <div className="space-y-1.5 rounded-lg bg-slate-950/60 p-3 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dimensions:</span>
                    <span className="font-mono">{tpl.dimensions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Insulation:</span>
                    <span className="font-mono text-emerald-400">{tpl.insulation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Thermal Mass:</span>
                    <span className="truncate max-w-[130px]">{tpl.thermalMass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fenestration:</span>
                    <span className="truncate max-w-[130px] text-blue-400">{tpl.glazing}</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleCreateWithPreset(tpl.id)}
                  className="w-full font-bold gap-2 text-xs"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Customize in Designer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
