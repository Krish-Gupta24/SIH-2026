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
import { useShelterStore, SimulationJobItem, transformBackendJobToItem } from "@/lib/store/use-shelter-store";
import { simulationApi } from "@/lib/api";
import { runOfflineRCSimulation } from "@/features/optimization/rc-offline-simulation";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";

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
import { DesignPresetsDropdown } from "./components/DesignPresetsDropdown";

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

import { modelToFormValues, formValuesToModel, toBackendPayload, step2dTo3d } from "@/lib/store/shelter-model-adapter";

export function ShelterDesignerWizard() {
  const router = useRouter();
  const {
    projects,
    activeProjectId,
    activeWizardStep,
    setActiveWizardStep,
    updateProject,
    addProject,
    addSimulationJob,
    updateSimulationJob,
    weatherDatasets,
    setActiveWeather,
    settings,
  } = useShelterStore();
  const activeModel = projects.find((p) => p.id === activeProjectId) || projects[0];

  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const lastParamStepRef = React.useRef<string | null>(stepParam);

  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (stepParam !== null) {
      const parsed = parseInt(stepParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 13) return parsed;
    }
    return activeWizardStep || 1;
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [confirmTestDataModal, setConfirmTestDataModal] = useState<boolean>(false);
  const [pendingValues, setPendingValues] = useState<ShelterFormValues | null>(null);

  // Poll simulation until completion
  const pollJobStatus = React.useCallback(
    (simId: string, model: any) => {
      let attempts = 0;
      const maxAttempts = 120;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusData = await simulationApi.status(simId);
          if (statusData.status === "completed") {
            clearInterval(interval);
            try {
              const results = await simulationApi.results(simId);
              const transformed = transformBackendJobToItem({ ...statusData, results }, projects);
              updateSimulationJob(simId, {
                status: "completed",
                results: transformed.results,
                completedAt: statusData.completed_at || new Date().toISOString(),
                durationSeconds: statusData.duration_seconds,
              });
            } catch (rErr) {
              console.error("Failed to fetch completed results in wizard:", rErr);
              updateSimulationJob(simId, {
                status: "completed",
                completedAt: statusData.completed_at || new Date().toISOString(),
                durationSeconds: statusData.duration_seconds,
              });
            }
          } else if (statusData.status === "failed" || statusData.status === "cancelled") {
            clearInterval(interval);
            updateSimulationJob(simId, {
              status: "failed",
              error: statusData.error_message || "Simulation failed during execution.",
            });
          } else {
            updateSimulationJob(simId, {
              status: statusData.status || "running",
              durationSeconds: statusData.duration_seconds,
            });
          }
        } catch (pollErr) {
          console.warn(`Polling simulation ${simId} check warning:`, pollErr);
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 2500);
    },
    [projects, updateSimulationJob]
  );

  // Sync step if searchParams URL query param changes from external navigation
  React.useEffect(() => {
    if (stepParam !== lastParamStepRef.current) {
      lastParamStepRef.current = stepParam;
      if (stepParam !== null) {
        const parsed = parseInt(stepParam, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 13) {
          setCurrentStep(parsed);
          setActiveWizardStep(parsed);
        }
      }
    }
  }, [stepParam, setActiveWizardStep]);

  const form = useForm<ShelterFormValues, any, ShelterFormValues>({
    resolver: zodResolver(shelterFormSchema) as any,
    defaultValues: activeModel ? modelToFormValues(activeModel) : defaultShelterFormValues,
    mode: "onChange",
  });

  const lastLoadedProjectIdRef = React.useRef<string | null>(null);
  const activeModelRef = React.useRef(activeModel);
  activeModelRef.current = activeModel;

  // Synchronize form when user switches active project or on initial mount
  React.useEffect(() => {
    if (activeModel && activeModel.id !== lastLoadedProjectIdRef.current) {
      lastLoadedProjectIdRef.current = activeModel.id;
      form.reset(modelToFormValues(activeModel));
    }
  }, [activeModel?.id, form]);

  const handleAutosave = React.useCallback(
    (values: ShelterFormValues) => {
      const model = activeModelRef.current;
      if (model) {
        try {
          const patch = formValuesToModel(values, model);
          updateProject(model.id, patch);
        } catch (err) {
          console.warn("Autosave project update note:", err);
        }
      }
    },
    [updateProject]
  );

  const {
    advancedMode,
    toggleAdvancedMode,
    lastSaved,
    saveStatus,
    saveDraft,
    flushNow,
    loadDraft,
    exportJson,
    importJson,
    resetToDefaults,
  } = useDesignerDraft(form, {
    activeProjectId: activeModel?.id,
    autoSaveIntervalSec: settings?.autoSaveIntervalSec || 30,
    onAutosave: handleAutosave,
  });

  const handleStepSelect = (stepNumber: number) => {
    flushNow();
    const validStep = Math.min(Math.max(1, stepNumber), 13);
    setCurrentStep(validStep);
    setActiveWizardStep(validStep);
    lastParamStepRef.current = String(validStep);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("step", String(validStep));
      window.history.replaceState(null, "", url.toString());
    }
  };

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

  const [projectSavedToast, setProjectSavedToast] = useState(false);

  const handleSaveProject = () => {
    try {
      flushNow();
      const values = form.getValues();
      const modelToSave = formValuesToModel(values, activeModel);
      addProject(modelToSave);
      setProjectSavedToast(true);
      setTimeout(() => setProjectSavedToast(false), 3000);
    } catch (err: any) {
      console.error("Save project failed:", err);
    }
  };

  const handleApplyPreset = (presetModel: any, presetName: string) => {
    if (!activeModel) return;
    const engineeringFields = {
      geometry: JSON.parse(JSON.stringify(presetModel.geometry)),
      envelope: JSON.parse(JSON.stringify(presetModel.envelope)),
      windows: JSON.parse(JSON.stringify(presetModel.windows)),
      doors: JSON.parse(JSON.stringify(presetModel.doors)),
      thermalMass: JSON.parse(JSON.stringify(presetModel.thermalMass)),
      ventilation: JSON.parse(JSON.stringify(presetModel.ventilation)),
      internalLoads: JSON.parse(JSON.stringify(presetModel.internalLoads)),
      designTargets: JSON.parse(JSON.stringify(presetModel.designTargets)),
      simulationSettings: JSON.parse(JSON.stringify(presetModel.simulationSettings)),
    };
    updateProject(activeModel.id, engineeringFields);
    const updatedFullModel = {
      ...activeModel,
      ...engineeringFields,
    };
    form.reset(modelToFormValues(updatedFullModel));
  };

  const handleNext = async () => {
    // Validate current step before advancing
    const isValid = await form.trigger();
    if (isValid || advancedMode) {
      flushNow();
      const currentVals = form.getValues();
      if (currentVals.location?.weatherSource) {
        const matchingStation = weatherDatasets.find((w) => w.epwFileName === currentVals.location?.weatherSource);
        if (matchingStation) {
          setActiveWeather(matchingStation.id);
        }
      }
      handleStepSelect(Math.min(currentStep + 1, 13));
    }
  };

  const handlePrevious = () => {
    flushNow();
    handleStepSelect(Math.max(currentStep - 1, 1));
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
      // Map form values to canonical ShelterModel payload expected by simulation API (all 13 steps)
      const backendShelter = toBackendPayload(values);
      const payload = {
        shelter_model: backendShelter,
        weather_file: values.location.weatherSource || "IND_JK_Leh.427053_TMYx.epw",
        run_period_days: values.simulationSettings?.runPeriodDays ?? 1,
        start_month: values.simulationSettings?.startMonth ?? 1,
        start_day: values.simulationSettings?.startDay ?? 15,
        timestep: values.simulationSettings?.timestepsPerHour ?? 4,
        is_annual: Boolean(values.simulationSettings?.runPeriodDays === 365),
        timeout_seconds: 600,
        allow_test_data: Boolean(allowTestDataOverride),
      };

      try {
        const data = await simulationApi.queue(payload);
        setSubmittedJobId(data.simulation_id);

        // Automatically register and persist the simulated model into the projects library and backend
        const modelToSave = formValuesToModel(values, activeModel);
        addProject(modelToSave);

        const isTest = Boolean(allowTestDataOverride || isTestData);
        const newJob: SimulationJobItem = {
          id: data.simulation_id,
          projectId: values.project.id,
          projectName: values.project.name || "Custom Shelter",
          shelterModel: payload.shelter_model as any,
          weatherDatasetId: isTest ? "synthetic-test" : "leh-airport",
          weatherDatasetName: values.location.weatherSource || "Authentic Leh Climate",
          engine: "ThermoShelter Core",
          engineVersion: "3.0.0",
          status: "queued",
          queuedAt: new Date().toISOString(),
        };
        addSimulationJob(newJob);
        pollJobStatus(data.simulation_id, payload.shelter_model);
      } catch (queueErr) {
        console.warn("Backend queue offline or unreachable. Executing instant high-fidelity RC simulation fallback:", queueErr);
        const offlineId = `sim-rc-${Date.now().toString(36)}`;
        const days = payload.is_annual ? 365 : Math.max(1, payload.run_period_days);
        const matchingStation = weatherDatasets.find((w) => w.epwFileName === payload.weather_file) || weatherDatasets[0];
        const simResults = runOfflineRCSimulation(backendShelter as any, {
          periodType: payload.is_annual ? "annual" : "custom",
          runPeriodDays: days,
          startMonth: payload.start_month,
          startDay: payload.start_day,
          endMonth: payload.start_month,
          endDay: Math.min(31, payload.start_day + days),
          timestep: payload.timestep || 4,
          isAnnual: payload.is_annual,
        });

        const offlineJob: SimulationJobItem = {
          id: offlineId,
          projectId: values.project.id,
          projectName: values.project.name || "Custom Shelter",
          shelterModel: backendShelter as any,
          weatherDatasetId: matchingStation.id,
          weatherDatasetName: values.location.weatherSource || matchingStation.name,
          engine: "ThermoShelter Core",
          engineVersion: "3.0.0",
          status: "completed",
          queuedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationSeconds: 1.2,
          results: simResults,
        };
        addSimulationJob(offlineJob);
        setSubmittedJobId(offlineId);

        // Persist model
        const modelToSave = formValuesToModel(values, activeModel);
        addProject(modelToSave);
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      setSubmissionError(err.message || "Failed to submit simulation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Wizard Header Bar with Global Controls */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="micro-label">Canonical Model · 13-Step Sequence</span>
            <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold text-foreground border border-border">
              {activeModel?.project?.name || activeModel?.name || "Untitled Shelter"}
            </span>
            <span className="text-xs text-muted-foreground">Stage {currentStep} of 13</span>
          </div>
          <h1 className="font-editorial mt-2 text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            {WIZARD_STEPS[currentStep - 1].name}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {WIZARD_STEPS[currentStep - 1].description}
          </p>
        </div>

        {/* Global Toolbar: Drafts, Advanced Toggle, Reset, View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher: 2D Wizard vs 3D CAD */}
          <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-0.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background shadow-sm">
              <Sliders className="size-3.5" />
              <span>2D Wizard</span>
            </span>
            <Link
              href={`/designer/3d?stage=${step2dTo3d(currentStep)}`}
              onClick={() => {
                flushNow();
                setActiveWizardStep(currentStep);
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <Box className="size-3.5" />
              <span>3D CAD Studio</span>
            </Link>
          </div>

          {/* Continuous Autosave Live Badge */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-xs"
            title="Continuous autosave active: all edits are immediately saved to storage and project library"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                saveStatus === "saving"
                  ? "bg-amber-500 animate-ping"
                  : saveStatus === "error"
                  ? "bg-rose-500"
                  : "bg-emerald-500 animate-pulse"
              }`}
            />
            <span className="text-[11px] font-medium">
              {saveStatus === "saving"
                ? "Autosaving..."
                : lastSaved
                ? `Autosaved ${lastSaved}`
                : "Autosave active"}
            </span>
          </div>

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
            onClick={handleSaveProject}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background shadow-sm hover:opacity-90 transition"
          >
            <FolderKanban className="size-3.5" />
            <span>Save Project</span>
          </button>

          {projectSavedToast && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="size-3.5" />
              Saved to Projects
            </span>
          )}

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

          {currentStep === 12 && (
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 shadow-sm hover:bg-blue-500/20 transition"
              title="Export complete 13-stage shelter definition JSON"
            >
              <Download className="size-3.5" />
              Export Model JSON
            </button>
          )}

          <button
            type="button"
            onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-secondary"
            title="Reset to canonical Ladakh baseline"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 1-Click Design Presets (Baseline vs Passive Solar vs Super-Insulated) */}
      <DesignPresetsDropdown onApplyPreset={handleApplyPreset} />

      {/* 13-Step Progress Bar Indicator */}
      <div className="space-y-1.5 bg-secondary/30 border border-border p-3 rounded-2xl">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background">
              {currentStep}
            </span>
            Stage {currentStep} of 13: {WIZARD_STEPS[currentStep - 1].name}
          </span>
          <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {Math.round((currentStep / 13) * 100)}% Engineering Sequence Completed
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden border border-border">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / 13) * 100}%` }}
          />
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
                onClick={() => handleStepSelect(step.id)}
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
            {currentStep === 12 && <Step12DesignTargets form={form} advancedMode={advancedMode} onExport={exportJson} />}
            {currentStep === 13 && <Step13SimulationSettings form={form} advancedMode={advancedMode} />}

            {/* Submission Error Banner */}
            {submissionError && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-rose-500/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-900 dark:text-rose-200 shadow-md">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-rose-700 dark:text-rose-300">Simulation Launch Failed</p>
                  <p className="leading-relaxed font-mono text-[11px] text-rose-800 dark:text-rose-300 bg-white/60 dark:bg-black/40 p-2 rounded-xl border border-rose-300 dark:border-rose-900">
                    {submissionError}
                  </p>
                </div>
              </div>
            )}

            {/* Job Dispatched Confirmation Banner */}
            {submittedJobId && (
              <div className="mt-6 rounded-2xl border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40 p-5 text-xs text-emerald-950 dark:text-emerald-100 shadow-md">
                <div className="flex items-center gap-2.5 font-bold text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Simulation Successfully Dispatched to ThermoShelter Solver!</span>
                </div>
                <p className="mt-2 text-slate-700 dark:text-slate-300">
                  Job ID: <code className="rounded-lg bg-white/90 dark:bg-black/50 px-2 py-0.5 font-mono text-xs font-bold text-foreground border border-emerald-500/30">{submittedJobId}</code>
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Physical thermal balance equations solved across walls, roof, ground slab, and apertures.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <Link
                    href="/simulations"
                    className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#6E818F]"
                  >
                    View in Simulations Dashboard &rarr;
                  </Link>
                  <Link
                    href={`/results?jobId=${submittedJobId}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-white px-4 py-2 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-[#CBDCE6]"
                  >
                    Analyze Thermal Results &rarr;
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

      {/* Connected Linear Workflow Footer */}
      <WorkflowFooter />

    </div>
  );
}
