"use client";

import React, { useState } from "react";
import { Flame, Sliders, Zap, Sparkles } from "lucide-react";
import { EnergyOptimizationView } from "./EnergyOptimizationView";
import { OptimizationView } from "./OptimizationView";

export function OptimizationPageContainer() {
  const [activeTab, setActiveTab] = useState<"energy_fuel" | "parametric_sweep">("energy_fuel");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Secondary Tab Switcher */}
      <div className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("energy_fuel")}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === "energy_fuel"
                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/[0.04]"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Thermal, Fuel & Cost Optimization
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Primary
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("parametric_sweep")}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === "parametric_sweep"
                  ? "border-cyan-500 text-cyan-400 bg-cyan-500/[0.04]"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Parametric Sensitivity Sweep
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Optimization Mode */}
      <div className="flex-1">
        {activeTab === "energy_fuel" ? (
          <EnergyOptimizationView />
        ) : (
          <OptimizationView />
        )}
      </div>
    </div>
  );
}
