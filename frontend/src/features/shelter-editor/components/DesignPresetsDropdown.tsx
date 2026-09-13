"use client";

import React from "react";
import { Sparkles, Shield, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import {
  useShelterStore,
  DEFAULT_LADAKH_PROJECT,
  DEFAULT_BASELINE_TIN_PROJECT,
  DEFAULT_KARGIL_PROJECT,
} from "@/lib/store/use-shelter-store";
import { Badge } from "@/components/ui/badge";

export function DesignPresetsDropdown() {
  const { projects, activeProjectId, setActiveProject, addProject } = useShelterStore();

  const presets = [
    {
      id: "shelter-baseline-tin",
      name: "Conventional CGI Tin Barrack (Baseline)",
      tag: "Uninsulated Baseline",
      tagTone: "rose",
      desc: "Standard uninsulated corrugated steel with drafty single glazing. Freezes at -15°C at night demanding continuous Bukhari fuel burning.",
    },
    {
      id: "shelter-ladakh-01",
      name: "Ladakh Passive Solar Outpost (Our Solution)",
      tag: "Area-Specific Optimum",
      tagTone: "emerald",
      desc: "Engineered passive solar design with 300mm rammed earth Trombe wall, 150mm EPS composite envelope, and Low-E solar aperture.",
    },
    {
      id: "shelter-siachen-03",
      name: "Siachen Super-Insulated Pod (Arctic Extreme)",
      tag: "Vacuum Aerogel",
      tagTone: "cyan",
      desc: "Vacuum aerogel blanket insulation with triple krypton glazing and airtight heat recovery for extreme alpine glacier environments.",
    },
  ];

  const currentPreset = presets.find((p) => p.id === activeProjectId) || presets[1];

  const handleSelect = (id: string) => {
    // Check if project exists in store; if deleted/missing, re-instantiate preset archetype
    const existing = projects.find((p) => p.id === id);
    if (existing) {
      setActiveProject(id);
    } else {
      const presetModel =
        id === "shelter-baseline-tin"
          ? DEFAULT_BASELINE_TIN_PROJECT
          : id === "shelter-siachen-03"
          ? DEFAULT_KARGIL_PROJECT
          : DEFAULT_LADAKH_PROJECT;

      addProject(presetModel);
      setActiveProject(presetModel.id);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-secondary/40 border border-border p-2.5 rounded-2xl">
      <div className="flex items-center gap-2 pl-2">
        <Sparkles className="size-4 text-amber-500 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
          Preset Archetype:
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 flex-1">
        {presets.map((preset) => {
          const isActive = activeProjectId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelect(preset.id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-foreground text-background shadow-sm ring-1 ring-border"
                  : "bg-card text-muted-foreground hover:bg-card/80 hover:text-foreground border border-border"
              }`}
              title={preset.desc}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  preset.tagTone === "rose"
                    ? "bg-rose-500"
                    : preset.tagTone === "emerald"
                    ? "bg-emerald-500"
                    : "bg-cyan-500"
                }`}
              />
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
