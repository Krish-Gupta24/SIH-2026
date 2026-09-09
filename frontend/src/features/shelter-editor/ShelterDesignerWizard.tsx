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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

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

  const handleFinalSubmit = async (values: ShelterFormValues) => {
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
      };

      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Failed to queue simulation job." }));
        throw new Error(errorData.detail || "Server error queueing simulation.");
      }

      const data = await res.json();
      setSubmittedJobId(data.simulation_id);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setSubmissionError(err.message || "Failed to submit simulation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Wizard Header Bar with Global Controls */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Parametric Shelter Designer
            </span>
            <span className="text-xs text-slate-400">Step {currentStep} of 13</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {WIZARD_STEPS[currentStep - 1].name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {WIZARD_STEPS[currentStep - 1].description}
          </p>
        </div>

        {/* Global Toolbar: Drafts, Advanced Toggle, Reset */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAdvancedMode}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              advancedMode
                ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            {advancedMode ? "Advanced Mode On" : "Standard Mode"}
          </button>

          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Save className="h-3.5 w-3.5" />
            Save Draft
          </button>

          <button
            type="button"
            onClick={loadDraft}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Upload className="h-3.5 w-3.5" />
            Load Draft
          </button>

          <button
            type="button"
            onClick={exportJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            title="Export JSON file"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>

          <button
            type="button"
            onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900"
            title="Reset to canonical Ladakh baseline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          {saveStatus === "saved" && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Stepper Navigation Strip */}
      <div className="mb-8 overflow-x-auto pb-2">
        <nav className="flex min-w-max items-center gap-1.5">
          {WIZARD_STEPS.map((step) => {
            const Icon = step.icon;
            const isCurrent = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : isCompleted
                    ? "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                    : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isCurrent
                      ? "bg-white text-blue-600"
                      : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
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
          <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
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
                  Simulation Successfully Queued in Celery!
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Job ID: <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px]">{submittedJobId}</code>
                </p>
                <p className="mt-1">
                  The worker is processing this job asynchronously. You can view real-time logs and results in the Simulations dashboard.
                </p>
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
    </div>
  );
}
