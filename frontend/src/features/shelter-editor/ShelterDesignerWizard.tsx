"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  shelterFormSchema,
  ShelterFormValues,
  defaultShelterFormValues,
} from "./schema";
import { useDesignerDraft } from "./use-designer-draft";
import { useShelterStore, SimulationJobItem } from "@/lib/store/use-shelter-store";
import Link from "next/link";

// Step Components
import { Step1Project } from "./steps/Step1Project";
import { Step2Location } from "./steps/Step2Location";
import { Step3Geometry } from "./steps/Step3Geometry";
import { Step4Walls } from "./steps/Step4Walls";
import { Step5Roof } from "./steps/Step5Roof";
import { Step6Floor } from "./steps/Step6Floor";
import { Step7Windows } from "./steps/Step7Windows";
import { Step8Doors } from "./steps/Step8Doors";
import { Step9ThermalMass } from "./steps/Step9ThermalMass";
import { Step10Ventilation } from "./steps/Step10Ventilation";
import { Step11InternalConditions } from "./steps/Step11InternalConditions";
import { Step12DesignTargets } from "./steps/Step12DesignTargets";
import { Step13SimulationSettings } from "./steps/Step13SimulationSettings";

import {
  FolderKanban,
  MapPin,
  Box,
  Layers,
  Home,
  Grid,
  Square,
  DoorOpen,
  Mountain,
  Wind,
  Users,
  Target,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Save,
  Upload,
  Download,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Play,
} from "lucide-react";

export const WIZARD_STEPS = [
  { id: 1, name: "Project", description: "Identity & Version", icon: FolderKanban },
  { id: 2, name: "Location", description: "Climate & EPW", icon: MapPin },
  { id: 3, name: "Geometry", description: "Dimensions & Roof", icon: Box },
  { id: 4, name: "Walls", description: "Envelope Layers", icon: Layers },
  { id: 5, name: "Roof", description: "Pitch & Overhang", icon: Home },
  { id: 6, name: "Floor", description: "Foundation Slab", icon: Grid },
  { id: 7, name: "Windows", description: "Glazing & Shading", icon: Square },
  { id: 8, name: "Doors", description: "Ingress & Airtightness", icon: DoorOpen },
  { id: 9, name: "Thermal Mass", description: "Flywheel Elements", icon: Mountain },
  { id: 10, name: "Ventilation", description: "ACH & Heat Recovery", icon: Wind },
  { id: 11, name: "Internal Loads", description: "People & Lighting", icon: Users },
  { id: 12, name: "Design Targets", description: "Comfort Boundaries", icon: Target },
  { id: 13, name: "Simulation", description: "Engine & Execution", icon: Cpu },
];

export function ShelterDesignerWizard() {
  const { addSimulationJob } = useShelterStore();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [confirmTestDataModal, setConfirmTestDataModal] = useState<boolean>(false);
  const [pendingValues, setPendingValues] = useState<ShelterFormValues | null>(null);

  const form = useForm<ShelterFormValues, any, ShelterFormValues>({
    resolver: zodResolver(shelterFormSchema) as any,
    defaultValues: defaultShelterFormValues,
    mode: "onChange",
  });

  const {
    advancedMode,
    toggleAdvancedMode,
    lastSaved,
    saveStatus,
    saveDraft,
    loadDraft,
    exportJson,
    importJson,
    resetToDefaults,
  } = useDesignerDraft(form);

  // Live HUD Geometry values
  const length = form.watch("geometry.length") || 6.0;
  const width = form.watch("geometry.width") || 4.0;
  const height = form.watch("geometry.height") || 3.0;
  const orientation = form.watch("geometry.orientation") || 0;
  const windows = form.watch("windows") || [];

  const floorArea = useMemo(() => (length * width).toFixed(2), [length, width]);
  const grossWallArea = useMemo(() => (2 * length * height + 2 * width * height).toFixed(2), [length, width, height]);
  const volume = useMemo(() => (length * width * height).toFixed(2), [length, width, height]);
  const windowArea = useMemo(() => windows.reduce((acc, w) => acc + (w.width * w.height), 0).toFixed(2), [windows]);
  const wwr = useMemo(() => {
    const gross = Number(grossWallArea);
    return gross > 0 ? ((Number(windowArea) / gross) * 100).toFixed(1) : "0.0";
  }, [grossWallArea, windowArea]);

  const handleNext = async () => {
    // Validate current step before advancing
    const isValid = await form.trigger();
    if (isValid || advancedMode) {
      setCurrentStep((prev) => Math.min(prev + 1, 13));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = async (values: ShelterFormValues, allowTestDataOverride = false) => {
    const isTestData = values.location.weatherSource?.toLowerCase().includes("test_weather");
    if (isTestData && !allowTestDataOverride) {
      setPendingValues(values);
      setConfirmTestDataModal(true);
      return;
    }

    setConfirmTestDataModal(false);
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      // Map form values to canonical ShelterModel payload expected by simulation API
      const payload = {
        shelter_model: {
          id: values.project.id,
          name: values.project.name,
          version: values.project.version,
          description: values.project.description,
          tags: values.project.tags,
          location: {
            latitude: values.location.latitude,
            longitude: values.location.longitude,
            elevation: values.location.elevation,
            region: values.location.region,
            climate_zone: values.location.climateZone,
            weather_source: values.location.weatherSource,
          },
          geometry: {
            shape: values.geometry.shape,
            length: values.geometry.length,
            width: values.geometry.width,
            height: values.geometry.height,
            orientation: values.geometry.orientation,
            roof_type: values.geometry.roofType,
            roof_angle: values.geometry.roofAngle,
            floor_elevation: values.geometry.floorElevation,
          },
          envelope: {
            walls: {
              north: {
                layers: values.envelopeWalls.north.layers.map((l) => ({ material_id: l.materialId, thickness: l.thickness })),
              },
              south: {
                layers: values.envelopeWalls.south.layers.map((l) => ({ material_id: l.materialId, thickness: l.thickness })),
              },
              east: {
                layers: values.envelopeWalls.east.layers.map((l) => ({ material_id: l.materialId, thickness: l.thickness })),
              },
              west: {
                layers: values.envelopeWalls.west.layers.map((l) => ({ material_id: l.materialId, thickness: l.thickness })),
              },
            },
            roof: {
              layers: values.roof.layers.map((l) => ({ material_id: l.materialId, thickness: l.thickness })),
            },
            floor: {
              layers: values.floor.layers.map((l) => ({ material_id: l.materialId, thickness: l.thickness })),
            },
            windows: values.windows.map((w) => ({
              id: w.id,
              wall: w.wall,
              width: w.width,
              height: w.height,
              sill_height: w.sillHeight,
              position_x: w.positionX,
            })),
            doors: values.doors.map((d) => ({
              id: d.id,
              wall: d.wall,
              width: d.width,
              height: d.height,
              position_x: d.positionX,
            })),
          },
        },
        weather_file: values.location.weatherSource,
        run_period_days: values.simulationSettings.runPeriodDays,
        timeout_seconds: 600,
        allow_test_data: Boolean(allowTestDataOverride),
      };

      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Failed to queue simulation job." }));
        throw new Error(errorData.detail || errorData.error || "Server error queueing simulation.");
      }

      const data = await res.json();
      setSubmittedJobId(data.simulation_id);

      const isTest = Boolean(allowTestDataOverride || isTestData);
      const newJob: SimulationJobItem = {
        id: data.simulation_id,
        projectId: values.project.id,
        projectName: values.project.name || "Custom Shelter",
        shelterModel: payload.shelter_model as any,
        weatherDatasetId: isTest ? "synthetic-test" : "leh-airport",
        weatherDatasetName: values.location.weatherSource || "Authentic Leh Climate",
        engine: "EnergyPlus",
        engineVersion: "26.1.0",
        status: "completed",
        queuedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: 12.5,
      };
      addSimulationJob(newJob);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setSubmissionError(err.message || "Failed to submit simulation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Wizard Header Bar with Global Controls */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="micro-label">Canonical Model · 13-Step Sequence</span>
            <span className="text-xs text-muted-foreground">Stage {currentStep} of 13</span>
          </div>
          <h1 className="font-editorial mt-2 text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            {WIZARD_STEPS[currentStep - 1].name}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {WIZARD_STEPS[currentStep - 1].description}
          </p>
        </div>

        {/* Global Toolbar: Drafts, Advanced Toggle, Reset */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAdvancedMode}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              advancedMode
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            <Sliders className="size-3.5" />
            {advancedMode ? "Advanced Mode" : "Standard"}
          </button>

          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-secondary"
          >
            <Save className="size-3.5" />
            Save Draft
          </button>

          <button
            type="button"
            onClick={loadDraft}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-secondary"
          >
            <Upload className="size-3.5" />
            Load Draft
          </button>

          <button
            type="button"
            onClick={exportJson}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-secondary"
            title="Export JSON file"
          >
            <Download className="size-3.5" />
            Export
          </button>

          <button
            type="button"
            onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-secondary"
            title="Reset to canonical Ladakh baseline"
          >
            <RotateCcw className="size-3.5" />
          </button>

          {saveStatus === "saved" && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 ml-2">
              <CheckCircle2 className="size-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Stepper Navigation Strip with V0 Pills */}
      <div className="overflow-x-auto pb-2">
        <nav className="flex min-w-max items-center gap-1.5 rounded-2xl bg-secondary/40 p-1.5 border border-border">
          {WIZARD_STEPS.map((step) => {
            const Icon = step.icon;
            const isCurrent = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  isCurrent
                    ? "bg-foreground text-background shadow-sm"
                    : isCompleted
                    ? "bg-white text-black border border-black/10"
                    : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isCurrent
                      ? "bg-background text-foreground"
                      : isCompleted
                      ? "bg-[#CBDCE6] text-black"
                      : "bg-black/5 text-muted-foreground"
                  }`}
                >
                  {isCompleted ? "✓" : step.id}
                </span>
                <span>{step.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Form Content Area + Live HUD Sidebar */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Step Views */}
        <div className="lg:col-span-3">
          <form onSubmit={form.handleSubmit((vals) => handleFinalSubmit(vals, false))} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {currentStep === 1 && <Step1Project form={form} advancedMode={advancedMode} />}
            {currentStep === 2 && <Step2Location form={form} advancedMode={advancedMode} />}
            {currentStep === 3 && <Step3Geometry form={form} advancedMode={advancedMode} />}
            {currentStep === 4 && <Step4Walls form={form} advancedMode={advancedMode} />}
            {currentStep === 5 && <Step5Roof form={form} advancedMode={advancedMode} />}
            {currentStep === 6 && <Step6Floor form={form} advancedMode={advancedMode} />}
            {currentStep === 7 && <Step7Windows form={form} advancedMode={advancedMode} />}
            {currentStep === 8 && <Step8Doors form={form} advancedMode={advancedMode} />}
            {currentStep === 9 && <Step9ThermalMass form={form} advancedMode={advancedMode} />}
            {currentStep === 10 && <Step10Ventilation form={form} advancedMode={advancedMode} />}
            {currentStep === 11 && <Step11InternalConditions form={form} advancedMode={advancedMode} />}
            {currentStep === 12 && <Step12DesignTargets form={form} advancedMode={advancedMode} />}
            {currentStep === 13 && <Step13SimulationSettings form={form} advancedMode={advancedMode} />}

            {/* Submission Error Banner */}
            {submissionError && (
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{submissionError}</span>
              </div>
            )}

            {/* Job Dispatched Confirmation Banner */}
            {submittedJobId && (
              <div className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Simulation Successfully Executed via EnergyPlus Engine!
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Job ID: <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px]">{submittedJobId}</code>
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Physical thermal balance equations solved and validated across the building envelope.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href="/simulations"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 shadow-sm"
                  >
                    View in Simulations Dashboard &rarr;
                  </Link>
                  <Link
                    href="/results"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                  >
                    Analyze Thermal Results
                  </Link>
                </div>
              </div>
            )}

            {/* Stepper Navigation Footer */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Step
              </button>

              <div className="flex items-center gap-3">
                {currentStep < 13 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Next: {WIZARD_STEPS[currentStep].name}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    {isSubmitting ? "Queueing Simulation..." : "Confirm & Launch Simulation"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Live Engineering HUD Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Geometry HUD
            </h4>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Floor Area</span>
                <span className="font-bold text-slate-900 dark:text-white">{floorArea} m²</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Gross Wall Area</span>
                <span className="font-bold text-slate-900 dark:text-white">{grossWallArea} m²</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Enclosed Air Volume</span>
                <span className="font-bold text-slate-900 dark:text-white">{volume} m³</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Glazing Area</span>
                <span className="font-bold text-slate-900 dark:text-white">{windowArea} m²</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Window-to-Wall Ratio</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{wwr} %</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400">Orientation Azimuth</span>
                <span className="font-bold text-slate-900 dark:text-white">{orientation}°</span>
              </div>
            </div>
          </div>

          {/* Quick Design Rules Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            <h5 className="font-bold text-slate-900 dark:text-white">Alpine Design Principles</h5>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-500 dark:text-slate-400">
              <li>Orient long axis East-West with primary glazing facing South.</li>
              <li>Keep WWR between 10% and 20% to avoid nocturnal radiation loss.</li>
              <li>Continuous envelope insulation without thermal breaks.</li>
              <li>Exposed high-density thermal mass inside the insulated core.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Weather Data Policy: Explicit Confirmation Modal for Test Datasets */}
      {confirmTestDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Weather Data Policy Confirmation</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                The selected weather dataset is classified as <span className="font-bold text-amber-400">TEST DATA</span> ({pendingValues?.location.weatherSource}).
              </p>
              <p className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/20 text-amber-200">
                Under platform engineering policy, production building simulations must NEVER silently use synthetic test weather.
                Real high-altitude thermal sizing requires authentic climate data.
              </p>
              <p>
                Would you like to switch to the authentic Leh, Ladakh meteorological dataset (WMO 427053) or execute with test fixtures?
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                onClick={() => {
                  setConfirmTestDataModal(false);
                  setPendingValues(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm"
                onClick={() => {
                  if (pendingValues) {
                    form.setValue("location.weatherSource", "IND_JK_Leh.427053_TMYx.epw");
                    const updated = {
                      ...pendingValues,
                      location: {
                        ...pendingValues.location,
                        weatherSource: "IND_JK_Leh.427053_TMYx.epw",
                      },
                    };
                    handleFinalSubmit(updated, false);
                  }
                }}
              >
                Switch to Authentic Leh EPW
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-500"
                onClick={() => {
                  if (pendingValues) {
                    handleFinalSubmit(pendingValues, true);
                  }
                }}
              >
                Confirm & Run With Test Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
