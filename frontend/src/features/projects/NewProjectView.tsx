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
import {
  useShelterStore,
  DEFAULT_LADAKH_PROJECT,
  DEFAULT_KARGIL_PROJECT,
  DEFAULT_SPITI_PROJECT,
  DEFAULT_TAWANG_PROJECT,
  DEFAULT_BASELINE_TIN_PROJECT,
} from "@/lib/store/use-shelter-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const PRESET_TEMPLATES = [
  {
    id: "shelter-ladakh-01",
    title: "Leh Ladakh High-Altitude Outpost (92% Comfort)",
    climate: "Cold / Extreme Alpine",
    region: "Leh Ladakh, India",
    description: "300mm rammed earth Trombe wall + 150mm EPS composite envelope, double Low-E argon solar aperture, 85% HRV.",
    dimensions: "6.0m × 4.0m × 3.0m (24 m²)",
    insulation: "150mm EPS (R=4.54)",
    thermalMass: "High (Rammed Earth + Concrete Slab)",
    glazing: "Double Low-E Argon (U=1.4)",
    badge: "92% Comfort",
  },
  {
    id: "shelter-kargil-02",
    title: "Dras-Kargil Extreme Cold Bunkhouse (88% Comfort)",
    climate: "Sub-Arctic Continental (-35°C)",
    region: "Dras-Kargil, UT Ladakh, India",
    description: "250mm local granite mass core, 120mm PIR & VIP vacuum panels, triple Low-E krypton glazing, permafrost barrier.",
    dimensions: "6.0m × 4.0m × 2.8m (24 m²)",
    insulation: "120mm PIR & VIP (R=6.90)",
    thermalMass: "Granite Stone Mass Core",
    glazing: "Triple Low-E Krypton (U=0.78)",
    badge: "88% Comfort",
  },
  {
    id: "shelter-spiti-03",
    title: "Spiti Valley High-Solar Clerestory (91% Comfort)",
    climate: "Cold Desert High-Altitude",
    region: "Kaza, Spiti Valley, HP, India",
    description: "22° south high-gain clerestory shed roof, 150mm PIR rigid insulation, PCM Salt Hydrate 21°C latent thermal panels.",
    dimensions: "6.5m × 4.0m × 3.2m (26 m²)",
    insulation: "150mm PIR Foam (R=6.25)",
    thermalMass: "PCM Latent Heat Panels",
    glazing: "Double Low-E Argon (U=1.3)",
    badge: "91% Comfort",
  },
  {
    id: "shelter-tawang-04",
    title: "Tawang Eastern Himalaya Timber Cabin (93% Comfort)",
    climate: "Montane Temperate Alpine",
    region: "Tawang, Arunachal Pradesh, India",
    description: "Himalayan Cedar mass timber frame with 160mm hydrophobic rockwool & aerogel blanket, 30° snow-shedding gable roof.",
    dimensions: "7.0m × 4.5m × 3.0m (31.5 m²)",
    insulation: "160mm Mineral Wool + Aerogel (R=5.8)",
    thermalMass: "Mass Cedar Timber Framing",
    glazing: "Triple Low-E Krypton (U=0.8)",
    badge: "93% Comfort",
  },
  {
    id: "shelter-baseline-tin",
    title: "CGI Tin Barrack (Baseline Uninsulated - 15% Comfort)",
    climate: "Uninsulated High-Altitude Baseline",
    region: "Leh Ladakh, India",
    description: "Standard corrugated galvanized iron with drafty single glazing. Freezes at -15°C at night demanding continuous fuel burning.",
    dimensions: "6.0m × 4.0m × 2.6m (24 m²)",
    insulation: "0mm (Uninsulated Bare Sheet)",
    thermalMass: "Negligible (Bare Earth/Timber)",
    glazing: "Single Clear 4mm (U=5.8)",
    badge: "15% Comfort",
  },
];

export function NewProjectView() {
  const router = useRouter();
  const { addProject, setActiveProject } = useShelterStore();

  const [projectName, setProjectName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(PRESET_TEMPLATES[0].id);

  const handleCreateWithPreset = (presetId: string) => {
    const presetMap: Record<string, typeof DEFAULT_LADAKH_PROJECT> = {
      "shelter-ladakh-01": DEFAULT_LADAKH_PROJECT,
      "shelter-kargil-02": DEFAULT_KARGIL_PROJECT,
      "shelter-spiti-03": DEFAULT_SPITI_PROJECT,
      "shelter-tawang-04": DEFAULT_TAWANG_PROJECT,
      "shelter-baseline-tin": DEFAULT_BASELINE_TIN_PROJECT,
    };
    const target = presetMap[presetId] || DEFAULT_LADAKH_PROJECT;
    addProject(target);
    setActiveProject(target.id);
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="cold" className="text-[10px]">
                      {tpl.climate}
                    </Badge>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                      {tpl.badge}
                    </span>
                  </div>
                  <Mountain className="h-4 w-4 text-blue-400 shrink-0" />
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
