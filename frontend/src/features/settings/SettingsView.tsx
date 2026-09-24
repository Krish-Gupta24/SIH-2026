"use client";

import React, { useState } from "react";
import { Check, Save } from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { ActionButton, PageIntro } from "@/components/v0/platform-components";

export function SettingsView() {
  const { settings, updateSettings } = useShelterStore();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const [unitSystem, setUnitSystem] = useState(settings.unitSystem);
  const [thermoShelterVersion, setThermoShelterVersion] = useState(
    settings.thermoShelterVersion || "v3.0.0"
  );
  const [autoSaveSec, setAutoSaveSec] = useState(settings.autoSaveIntervalSec);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      apiUrl,
      unitSystem,
      thermoShelterVersion,
      autoSaveIntervalSec: autoSaveSec,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <PageIntro
        eyebrow="Workspace preferences"
        title="Settings"
        description="Engineering preferences, calculation standards, and backend execution configurations."
      />

      <form onSubmit={handleSave} className="grid gap-12 py-6 lg:grid-cols-[.6fr_1.4fr]">
        <div>
          <p className="micro-label">Configuration</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Preferences are persisted in the workspace store. New simulation dispatches inherit these defaults; stored historical evidence remains immutable.
          </p>
        </div>

        <div className="workspace-panel flex flex-col gap-8 rounded-2xl border border-border bg-card p-7 sm:p-9 shadow-sm">
          {/* Unit System */}
          <label>
            <span className="micro-label block mb-2">Unit System</span>
            <select
              value={unitSystem}
              onChange={(e) => setUnitSystem(e.target.value as "SI" | "IP")}
              className="h-12 w-full border-b border-border bg-transparent text-sm font-semibold outline-none cursor-pointer"
            >
              <option value="SI">SI · Metric (W/m²·K, °C, m, kg)</option>
              <option value="IP">IP · Imperial (Btu/h·ft²·°F, °F, ft, lb)</option>
            </select>
          </label>

          {/* ThermoShelter Engine Version */}
          <label>
            <span className="micro-label block mb-2">ThermoShelter Engine Version</span>
            <input
              type="text"
              value={thermoShelterVersion}
              onChange={(e) => setThermoShelterVersion(e.target.value)}
              className="h-12 w-full border-b border-border bg-transparent text-sm font-semibold outline-none"
            />
          </label>

          {/* Autosave Interval */}
          <label>
            <span className="micro-label block mb-2">Autosave Interval · Seconds</span>
            <input
              type="number"
              min="5"
              max="3600"
              value={autoSaveSec}
              onChange={(e) => setAutoSaveSec(Number(e.target.value))}
              className="h-12 w-full border-b border-border bg-transparent text-sm font-semibold outline-none"
            />
          </label>

          {/* Backend API Endpoint */}
          <label>
            <span className="micro-label block mb-2">Backend Physics Service URL</span>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="h-12 w-full border-b border-border bg-transparent text-sm font-semibold outline-none font-mono"
            />
          </label>

          <div className="flex items-center justify-between border-t border-border pt-6">
            <span className="text-xs text-muted-foreground">
              {savedSuccess ? "Preferences saved successfully!" : "Changes persist automatically."}
            </span>
            <ActionButton tone="primary" type="submit" className="rounded-full px-7">
              {savedSuccess ? <Check className="size-4" /> : <Save className="size-4" />}
              {savedSuccess ? "Saved" : "Save Preferences"}
            </ActionButton>
          </div>
        </div>
      </form>
    </div>
  );
}
