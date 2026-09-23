"use client";

import React, { useState } from "react";
import { Sliders, Zap } from "lucide-react";
import { FuelCostsView } from "@/features/fuel-costs/FuelCostsView";
import { OptimizationView } from "./OptimizationView";

export function OptimizationPageContainer() {
  const [activeTab, setActiveTab] = useState<"energy_fuel" | "parametric_sweep">("energy_fuel");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Secondary Tab Switcher */}
      <div className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("energy_fuel")}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "energy_fuel"
                  ? "border-primary text-foreground bg-primary/[0.04]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              Thermal, Fuel & Cost Optimization
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border font-mono">
                Fuel & Costs
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("parametric_sweep")}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "parametric_sweep"
                  ? "border-primary text-foreground bg-primary/[0.04]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-primary" />
              Parametric Sensitivity Sweep
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Optimization Mode */}
      <div className="flex-1">
        {activeTab === "energy_fuel" ? (
          <FuelCostsView />
        ) : (
          <OptimizationView />
        )}
      </div>
    </div>
  );
}
