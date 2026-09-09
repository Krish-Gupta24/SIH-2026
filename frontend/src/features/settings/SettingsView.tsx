"use client";

import React, { useState } from "react";
import {
  Settings,
  Sliders,
  Cpu,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  Server,
  Download,
  Upload,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export function SettingsView() {
  const { settings, updateSettings } = useShelterStore();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const [unitSystem, setUnitSystem] = useState(settings.unitSystem);
  const [energyPlusVersion, setEnergyPlusVersion] = useState(settings.energyPlusVersion);
  const [autoSaveSec, setAutoSaveSec] = useState(settings.autoSaveIntervalSec);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      apiUrl,
      unitSystem,
      energyPlusVersion,
      autoSaveIntervalSec: autoSaveSec,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all engineering preferences and caches to factory defaults?")) {
      localStorage.removeItem("shelter_thermal_engineering_store_v1");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-slate-400" />
            Engineering Settings & Environment
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure unit standards, EnergyPlus runtime flags, and FastAPI / Celery worker connections.
          </p>
        </div>

        {savedSuccess && (
          <Badge variant="success" className="gap-1.5 py-1 px-3 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Preferences Saved
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Unit Systems */}
        <Card className="border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-base font-bold text-white">Engineering Unit System</CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                unitSystem === "SI"
                  ? "border-blue-500 bg-blue-950/20"
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}
            >
              <input
                type="radio"
                name="unitSystem"
                value="SI"
                checked={unitSystem === "SI"}
                onChange={() => setUnitSystem("SI")}
                className="mt-1"
              />
              <div className="text-xs space-y-1">
                <div className="font-bold text-white">Metric SI (Recommended)</div>
                <p className="text-slate-400">
                  Temperature in °C • Conductivity in W/m-K • U-value in W/m²-K • Dimensions in meters. Standard for SIH 26051.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                unitSystem === "IP"
                  ? "border-blue-500 bg-blue-950/20"
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}
            >
              <input
                type="radio"
                name="unitSystem"
                value="IP"
                checked={unitSystem === "IP"}
                onChange={() => setUnitSystem("IP")}
                className="mt-1"
              />
              <div className="text-xs space-y-1">
                <div className="font-bold text-white">Imperial IP</div>
                <p className="text-slate-400">
                  Temperature in °F • U-value in Btu/h-ft²-°F • Dimensions in feet.
                </p>
              </div>
            </label>
          </div>
        </Card>

        {/* Engine & Computation Backend */}
        <Card className="border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-400" />
            <CardTitle className="text-base font-bold text-white">EnergyPlus Engine & Worker Runtime</CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">EnergyPlus Version</label>
              <select
                value={energyPlusVersion}
                onChange={(e) => setEnergyPlusVersion(e.target.value)}
                className="w-full mt-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                <option value="24.1.0">EnergyPlus v24.1.0 (Latest Canonical)</option>
                <option value="23.2.0">EnergyPlus v23.2.0 (LTS)</option>
                <option value="rc-fast">Simplified High-Speed RC Model</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">FastAPI Server Endpoint</label>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="mt-1.5 bg-slate-950 border-slate-800 font-mono text-xs"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300">Celery Worker / Redis Queue Broker</span>
            </div>
            <Badge variant="success" className="text-[10px]">
              Ready (redis://localhost:6379/0)
            </Badge>
          </div>
        </Card>

        {/* Draft & Local Storage Persistence */}
        <Card className="border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" />
            <CardTitle className="text-base font-bold text-white">Persistence & Auto-Save</CardTitle>
          </div>

          <Slider
            label="Designer Draft Auto-Save Interval"
            value={autoSaveSec}
            onValueChange={setAutoSaveSec}
            min={10}
            max={120}
            step={5}
            unit="seconds"
          />

          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Clear all project drafts and restored models from browser storage:
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleResetDefaults}
              className="gap-1.5 text-xs font-bold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All Defaults
            </Button>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" size="lg" className="font-bold gap-2 shadow-lg shadow-blue-600/25">
            <Save className="h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
