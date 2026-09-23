"use client";

import React from "react";
import { Sparkles, Shield, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import {
  useShelterStore,
  DEFAULT_LADAKH_PROJECT,
  DEFAULT_BASELINE_TIN_PROJECT,
  DEFAULT_KARGIL_PROJECT,
  DEFAULT_SPITI_PROJECT,
  DEFAULT_TAWANG_PROJECT,
} from "@/lib/store/use-shelter-store";
import { Badge } from "@/components/ui/badge";

export interface DesignPresetsDropdownProps {
  onApplyPreset?: (presetModel: any, presetName: string) => void;
}

export function DesignPresetsDropdown({ onApplyPreset }: DesignPresetsDropdownProps = {}) {
  const { projects, activeProjectId, updateProject } = useShelterStore();
  const [appliedPresetMessage, setAppliedPresetMessage] = React.useState<string | null>(null);

  const presets = [
    {
      id: "shelter-ladakh-01",
      name: "Leh Ladakh Outpost",
      comfort: "92% Comfort",
      tag: "Passive Solar",
      tagTone: "emerald",
      desc: "Engineered passive solar design with 300mm rammed earth Trombe wall, 150mm EPS composite envelope, and Low-E solar aperture.",
    },
    {
      id: "shelter-kargil-02",
      name: "Dras-Kargil Bunkhouse",
      comfort: "88% Comfort",
      tag: "VIP Sub-Zero",
      tagTone: "cyan",
      desc: "Sub-zero -35°C fortress with local granite bedrock thermal mass, 120mm PIR and VIP panels, triple Low-E krypton glazing, and 88% heat recovery.",
    },
    {
      id: "shelter-spiti-03",
      name: "Spiti Clerestory",
      comfort: "91% Comfort",
      tag: "PCM Latent",
      tagTone: "purple",
      desc: "Cold desert high-altitude shelter with 22° south clerestory solar roof, 150mm PIR insulation, and PCM Salt Hydrate 21°C latent thermal storage.",
    },
    {
      id: "shelter-tawang-04",
      name: "Tawang Timber Cabin",
      comfort: "93% Comfort",
      tag: "Mass Timber",
      tagTone: "amber",
      desc: "Himalayan Cedar mass timber frame with 160mm hydrophobic rockwool & aerogel blanket, 30° snow-shedding gable roof, and elevated deck.",
    },
    {
      id: "shelter-baseline-tin",
      name: "CGI Tin Barrack",
      comfort: "15% Comfort",
      tag: "Baseline",
      tagTone: "rose",
      desc: "Standard uninsulated corrugated steel with drafty single glazing. Freezes at -15°C at night demanding continuous Bukhari fuel burning.",
    },
  ];

  const handleSelect = (id: string) => {
    const presetMap: Record<string, typeof DEFAULT_LADAKH_PROJECT> = {
      "shelter-ladakh-01": DEFAULT_LADAKH_PROJECT,
      "shelter-kargil-02": DEFAULT_KARGIL_PROJECT,
      "shelter-spiti-03": DEFAULT_SPITI_PROJECT,
      "shelter-tawang-04": DEFAULT_TAWANG_PROJECT,
      "shelter-baseline-tin": DEFAULT_BASELINE_TIN_PROJECT,
    };
    const presetModel = presetMap[id];
    if (!presetModel) return;

    const presetInfo = presets.find((p) => p.id === id);
    const presetName = presetInfo?.name || "Preset";

    if (onApplyPreset) {
      onApplyPreset(presetModel, presetName);
    } else {
      // Direct store update if used standalone: copy engineering parameters into active project
      if (activeProjectId) {
        updateProject(activeProjectId, {
          geometry: presetModel.geometry,
          envelope: presetModel.envelope,
          windows: presetModel.windows,
          doors: presetModel.doors,
          thermalMass: presetModel.thermalMass,
          ventilation: presetModel.ventilation,
          internalLoads: presetModel.internalLoads,
          designTargets: presetModel.designTargets,
          simulationSettings: presetModel.simulationSettings,
        });
      }
    }

    setAppliedPresetMessage(`Copied "${presetName}" specs to current project`);
    setTimeout(() => {
      setAppliedPresetMessage(null);
    }, 3500);
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
                className={`h-2 w-2 rounded-full shrink-0 ${
                  preset.tagTone === "rose"
                    ? "bg-rose-500"
                    : preset.tagTone === "emerald"
                    ? "bg-emerald-500"
                    : preset.tagTone === "cyan"
                    ? "bg-cyan-500"
                    : preset.tagTone === "purple"
                    ? "bg-purple-500"
                    : "bg-amber-500"
                }`}
              />
              <span>{preset.name}</span>
              <span className="text-[10px] opacity-70 font-mono hidden sm:inline">{preset.comfort}</span>
            </button>
          );
        })}

        {appliedPresetMessage && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span>{appliedPresetMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
