"use client";

import React, { useState } from "react";
import {
  Sliders,
  Sun,
  Flame,
  Truck,
  Building,
  Thermometer,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ComfortConfig,
  EnergySystemConfig,
  KeroseneBackupConfig,
  FuelLogisticsConfig,
  BaselineShelterConfig,
  TransportMode,
} from "../energy-types";
import { ShelterModel } from "@/types/shelter";

interface EnergySetupPanelProps {
  model: ShelterModel;
  comfortConfig: ComfortConfig;
  onUpdateComfort: (cfg: ComfortConfig) => void;
  energyConfig: EnergySystemConfig;
  onUpdateEnergy: (cfg: EnergySystemConfig) => void;
  keroseneConfig: KeroseneBackupConfig;
  onUpdateKerosene: (cfg: KeroseneBackupConfig) => void;
  logisticsConfig: FuelLogisticsConfig;
  onUpdateLogistics: (cfg: FuelLogisticsConfig) => void;
  baselineConfig: BaselineShelterConfig;
  onUpdateBaseline: (cfg: BaselineShelterConfig) => void;
  outdoorMinC: number;
  outdoorMaxC: number;
  onChangeOutdoorTemps: (minC: number, maxC: number) => void;
  onResetDefaults: () => void;
}

export function EnergySetupPanel({
  model,
  comfortConfig,
  onUpdateComfort,
  energyConfig,
  onUpdateEnergy,
  keroseneConfig,
  onUpdateKerosene,
  logisticsConfig,
  onUpdateLogistics,
  baselineConfig,
  onUpdateBaseline,
  outdoorMinC,
  outdoorMaxC,
  onChangeOutdoorTemps,
  onResetDefaults,
}: EnergySetupPanelProps) {
  const [openSection, setOpenSection] = useState<string>("energy");

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? "" : id));
  };

  const L = model.geometry?.length || 6.0;
  const W = model.geometry?.width || 4.0;
  const H = model.geometry?.height || 2.8;
  const floorArea = (L * W).toFixed(1);
  const volume = (L * W * H).toFixed(1);
  const winArea = (model.windows || []).reduce((sum, w) => sum + (w.width || 1.2) * (w.height || 1.0), 0) || 3.2;
  const totalWallArea = 2 * (L * H) + 2 * (W * H);
  const wwrPct = ((winArea / totalWallArea) * 100).toFixed(1);
  const orientation = model.geometry?.orientation ?? 0;
  const occupants = (model.internalLoads as any)?.occupantsCount ?? 3;

  const roofPanels = model.envelope?.roof?.solarPanels;
  const bipvWindowsCount = (model.windows || []).filter((w) => w.solarPane?.enabled).length;

  return (
    <div className="space-y-4">
      {/* Header with Reset Defaults */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Simulation Parameters & Logistics Assumptions
          </h3>
          <p className="text-xs text-slate-400">
            Configure comfort bounds, rooftop solar & window BIPV panes, kerosene backup, and mountain logistics costs.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetDefaults}
          className="h-8 text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset Assumptions
        </Button>
      </div>

      {/* SECTION 1: Comfort Target & Climate Bounds */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("comfort")}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Thermometer className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              1. Comfort Target & Outdoor Climate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] text-emerald-400 border-emerald-500/30">
              {comfortConfig.comfortMinC}°C – {comfortConfig.comfortMaxC}°C
            </Badge>
            {openSection === "comfort" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {openSection === "comfort" && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400">Comfort Min Temp (°C)</label>
              <Input
                type="number"
                step="0.5"
                value={comfortConfig.comfortMinC}
                onChange={(e) => onUpdateComfort({ ...comfortConfig, comfortMinC: parseFloat(e.target.value) || 16 })}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Heater triggers if indoor &lt; Min</span>
            </div>

            <div>
              <label className="text-xs text-slate-400">Comfort Max Temp (°C)</label>
              <Input
                type="number"
                step="0.5"
                value={comfortConfig.comfortMaxC}
                onChange={(e) => onUpdateComfort({ ...comfortConfig, comfortMaxC: parseFloat(e.target.value) || 24 })}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Upper thermal comfort ceiling</span>
            </div>

            <div>
              <label className="text-xs text-slate-400">Diurnal Min Ambient (°C)</label>
              <Input
                type="number"
                step="1"
                value={outdoorMinC}
                onChange={(e) => onChangeOutdoorTemps(parseFloat(e.target.value) || -20, outdoorMaxC)}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Pre-dawn alpine trough</span>
            </div>

            <div>
              <label className="text-xs text-slate-400">Diurnal Max Ambient (°C)</label>
              <Input
                type="number"
                step="1"
                value={outdoorMaxC}
                onChange={(e) => onChangeOutdoorTemps(outdoorMinC, parseFloat(e.target.value) || -2)}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Midday peak ambient</span>
            </div>
          </div>
        )}
      </Card>

      {/* SECTION 2: Energy System (Solar PV + BIPV Panes + Battery + Heater + Household) */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("energy")}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Sun className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              2. Renewable Solar (Roof + Window BIPV) & Electric Storage
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] text-yellow-400 border-yellow-500/30">
              {energyConfig.solarPvCapacityKw} kWp Solar | {energyConfig.batteryCapacityKwh} kWh BESS
            </Badge>
            {openSection === "energy" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {openSection === "energy" && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 space-y-4">
            {/* Solar Hardware Activation Toggles */}
            <div className="flex flex-wrap items-center gap-6 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={energyConfig.includeRooftopSolar}
                  onChange={(e) => onUpdateEnergy({ ...energyConfig, includeRooftopSolar: e.target.checked })}
                  className="rounded border-slate-700 text-yellow-500 focus:ring-yellow-400 h-4 w-4"
                />
                <span className="font-medium">Enable Rooftop PV Array</span>
                {roofPanels?.panelCount && (
                  <Badge className="bg-yellow-500/20 text-yellow-300 text-[10px] ml-1">
                    {roofPanels.panelCount} Modules
                  </Badge>
                )}
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={energyConfig.includeWindowSolarPanes}
                  onChange={(e) => onUpdateEnergy({ ...energyConfig, includeWindowSolarPanes: e.target.checked })}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 h-4 w-4"
                />
                <span className="font-medium">Enable Window Solar Panes (BIPV Glazing)</span>
                {bipvWindowsCount > 0 && (
                  <Badge className="bg-cyan-500/20 text-cyan-300 text-[10px] ml-1">
                    {bipvWindowsCount} Panes Active
                  </Badge>
                )}
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400">Total Solar PV Baseline (kW)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={energyConfig.solarPvCapacityKw}
                  onChange={(e) => onUpdateEnergy({ ...energyConfig, solarPvCapacityKw: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Rooftop array rated capacity</span>
              </div>

              <div>
                <label className="text-xs text-slate-400">Solar Performance Ratio</label>
                <Input
                  type="number"
                  step="0.02"
                  min="0.5"
                  max="1.0"
                  value={energyConfig.solarPerformanceRatio}
                  onChange={(e) => onUpdateEnergy({ ...energyConfig, solarPerformanceRatio: parseFloat(e.target.value) || 0.8 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Albedo & low-temp inverter derate</span>
              </div>

              <div>
                <label className="text-xs text-slate-400">Battery Capacity (kWh)</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={energyConfig.batteryCapacityKwh}
                  onChange={(e) => onUpdateEnergy({ ...energyConfig, batteryCapacityKwh: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Cold-rated LiFePO4 storage</span>
              </div>

              <div>
                <label className="text-xs text-slate-400">Battery Round-Trip Efficiency (%)</label>
                <Input
                  type="number"
                  step="1"
                  value={energyConfig.batteryEfficiencyPct}
                  onChange={(e) => onUpdateEnergy({ ...energyConfig, batteryEfficiencyPct: parseFloat(e.target.value) || 90 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Charge/discharge cycle efficiency</span>
              </div>

              <div>
                <label className="text-xs text-slate-400">Electric Heater Capacity (kW)</label>
                <Input
                  type="number"
                  step="0.2"
                  min="0"
                  value={energyConfig.electricHeaterCapacityKw}
                  onChange={(e) => onUpdateEnergy({ ...energyConfig, electricHeaterCapacityKw: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Radiant electric element rating</span>
              </div>

              <div>
                <label className="text-xs text-slate-400">Household Electric Load (Watts)</label>
                <Input
                  type="number"
                  step="20"
                  min="0"
                  value={energyConfig.householdBaseLoadW}
                  onChange={(e) => onUpdateEnergy({ ...energyConfig, householdBaseLoadW: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
                <span className="text-[10px] text-amber-400/90 mt-1 block">Separate from space heating load</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* SECTION 3: Kerosene Backup Heater Configuration */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("kerosene")}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              3. Kerosene Backup Heater & Fuel Specifications
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] text-orange-400 border-orange-500/30">
              ₹{keroseneConfig.kerosenePricePerLitre}/L (Base) | {keroseneConfig.heaterEfficiencyPct}% Eff
            </Badge>
            {openSection === "kerosene" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {openSection === "kerosene" && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400">Heater Efficiency (%)</label>
              <Input
                type="number"
                step="1"
                value={keroseneConfig.heaterEfficiencyPct}
                onChange={(e) => onUpdateKerosene({ ...keroseneConfig, heaterEfficiencyPct: parseFloat(e.target.value) || 80 })}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Flued space heater conversion</span>
            </div>

            <div>
              <label className="text-xs text-slate-400">Specific Energy (kWh/L)</label>
              <Input
                type="number"
                step="0.1"
                value={keroseneConfig.specificEnergyKwhPerLitre}
                onChange={(e) => onUpdateKerosene({ ...keroseneConfig, specificEnergyKwhPerLitre: parseFloat(e.target.value) || 9.8 })}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">High-density aviation kerosene</span>
            </div>

            <div>
              <label className="text-xs text-slate-400">
                Purchase Price (₹/L) <span className="text-[10px] text-amber-400">*Assumed</span>
              </label>
              <Input
                type="number"
                step="1"
                value={keroseneConfig.kerosenePricePerLitre}
                onChange={(e) => onUpdateKerosene({ ...keroseneConfig, kerosenePricePerLitre: parseFloat(e.target.value) || 0 })}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Base purchase before transit</span>
            </div>

            <div>
              <label className="text-xs text-slate-400">Handling & Storage Cost (₹/L)</label>
              <Input
                type="number"
                step="0.5"
                value={keroseneConfig.handlingStorageCostPerLitre}
                onChange={(e) => onUpdateKerosene({ ...keroseneConfig, handlingStorageCostPerLitre: parseFloat(e.target.value) || 0 })}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Cold decanting & drum handling</span>
            </div>
          </div>
        )}
      </Card>

      {/* SECTION 4: Fuel Logistics & Remote Transportation */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("logistics")}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              4. Remote Fuel Logistics & Transport Model
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] text-purple-400 border-purple-500/30">
              {logisticsConfig.transportMode.toUpperCase()} | {logisticsConfig.transportDistanceKm} km
            </Badge>
            {openSection === "logistics" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {openSection === "logistics" && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-purple-400" />
              <span>
                All transport and freight rates are <strong>user-defined / assumed values</strong> to permit modeling across
                diverse global alpine outposts. Do NOT treat as real-world Ladakh fixed quotes.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-400">Transport Mode</label>
                <select
                  value={logisticsConfig.transportMode}
                  onChange={(e) => onUpdateLogistics({ ...logisticsConfig, transportMode: e.target.value as TransportMode })}
                  className="mt-1.5 w-full h-8 text-xs bg-slate-900 border border-slate-700 rounded-md px-2 text-slate-200"
                >
                  <option value="road">Road Transit (Mountain Convoy)</option>
                  <option value="air">Air Lift / Rotary Sortie</option>
                  <option value="mixed">Mixed Multimodal</option>
                  <option value="custom">Custom Logistics Rate</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">One-Way Distance (km)</label>
                <Input
                  type="number"
                  step="10"
                  value={logisticsConfig.transportDistanceKm}
                  onChange={(e) => onUpdateLogistics({ ...logisticsConfig, transportDistanceKm: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Transit Rate (₹/km/trip)</label>
                <Input
                  type="number"
                  step="5"
                  value={logisticsConfig.transportCostPerKmPerTrip}
                  onChange={(e) => onUpdateLogistics({ ...logisticsConfig, transportCostPerKmPerTrip: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Vehicle / Sortie Capacity (L)</label>
                <Input
                  type="number"
                  step="100"
                  value={logisticsConfig.vehicleCapacityLitres}
                  onChange={(e) => onUpdateLogistics({ ...logisticsConfig, vehicleCapacityLitres: parseFloat(e.target.value) || 1000 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Loading/Unloading per Trip (₹)</label>
                <Input
                  type="number"
                  step="200"
                  value={logisticsConfig.loadingUnloadingCostPerTrip}
                  onChange={(e) => onUpdateLogistics({ ...logisticsConfig, loadingUnloadingCostPerTrip: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Fixed Monthly Storage Cost (₹)</label>
                <Input
                  type="number"
                  step="200"
                  value={logisticsConfig.storageInfrastructureCostMonthly}
                  onChange={(e) => onUpdateLogistics({ ...logisticsConfig, storageInfrastructureCostMonthly: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Alpine Terrain Premium (%)</label>
                <Input
                  type="number"
                  step="5"
                  value={logisticsConfig.remoteAreaLogisticsPremiumPct}
                  onChange={(e) => onUpdateLogistics({ ...logisticsConfig, remoteAreaLogisticsPremiumPct: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Winter Season Multiplier</label>
                <Input
                  type="number"
                  step="0.05"
                  value={logisticsConfig.winterLogisticsMultiplier}
                  onChange={(e) => onUpdateLogistics({ ...logisticsConfig, winterLogisticsMultiplier: parseFloat(e.target.value) || 1 })}
                  className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* SECTION 5: Baseline Conventional Shelter Properties */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("baseline")}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Building className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              5. Conventional Shelter Baseline Configuration
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] text-rose-400 border-rose-500/30">
              U-Wall: {baselineConfig.wallUValueWm2k} | ACH: {baselineConfig.infiltrationAch}
            </Badge>
            {openSection === "baseline" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {openSection === "baseline" && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400">Baseline Wall U-Value (W/m²K)</label>
              <Input
                type="number"
                step="0.1"
                value={baselineConfig.wallUValueWm2k}
                onChange={(e) => onUpdateBaseline({ ...baselineConfig, wallUValueWm2k: parseFloat(e.target.value) || 2.4 })}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Uninsulated masonry / corrugated sheet</span>
            </div>

            <div>
              <label className="text-xs text-slate-400">Baseline Roof U-Value (W/m²K)</label>
              <Input
                type="number"
                step="0.1"
                value={baselineConfig.roofUValueWm2k}
                onChange={(e) => onUpdateBaseline({ ...baselineConfig, roofUValueWm2k: parseFloat(e.target.value) || 3.2 })}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Single GI sheet roof deck</span>
            </div>

            <div>
              <label className="text-xs text-slate-400">Baseline Infiltration (ACH)</label>
              <Input
                type="number"
                step="0.1"
                value={baselineConfig.infiltrationAch}
                onChange={(e) => onUpdateBaseline({ ...baselineConfig, infiltrationAch: parseFloat(e.target.value) || 1.6 })}
                className="mt-1.5 h-8 text-xs bg-slate-900 border-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Leaky joints without air barrier</span>
            </div>
          </div>
        )}
      </Card>

      {/* Active Shelter Geometry & Envelope Context Card */}
      <Card className="p-4 bg-slate-900/40 border-slate-800 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 text-slate-400">
          <span>Active 3D Model: <strong>{L}m × {W}m × {H}m</strong> ({floorArea} m² floor, {volume} m³)</span>
          <span>Window Area: <strong>{winArea} m²</strong> (WWR {wwrPct}%)</span>
          <span>Azimuth: <strong>{orientation}°</strong></span>
          <span>Occupants: <strong>{occupants} persons</strong></span>
        </div>
      </Card>
    </div>
  );
}
