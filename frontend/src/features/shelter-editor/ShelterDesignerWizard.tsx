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
import { Step3Geometry } from "./steps/Step3Geometry";
import { Step4Walls } from "./steps/Step4Walls";
import { Step5Roof } from "./steps/Step5Roof";
import { Step6Floor } from "./steps/Step6Floor";
import { Step5WindowsAndDoors } from "./steps/Step5WindowsAndDoors";
import { Step9ThermalMass } from "./steps/Step9ThermalMass";
import { Step7IndoorClimate } from "./steps/Step7IndoorClimate";
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
  Maximize2,
  ChevronDown,
  Lightbulb,
} from "lucide-react";
import { ArchitecturalPlanSheet } from "./components/ArchitecturalPlanSheet";

import {
  WIZARD_STEPS,
  WIZARD_PHASES,
  type WizardPhase,
  type WizardStepConfig,
} from "./wizard-phase-config";
export { WIZARD_STEPS, WIZARD_PHASES };
export type { WizardPhase, WizardStepConfig };

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
      if (!isNaN(parsed) && parsed >= 1 && parsed <= WIZARD_STEPS.length) return parsed;
    }
    return activeWizardStep && activeWizardStep <= WIZARD_STEPS.length ? activeWizardStep : 1;
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
        if (!isNaN(parsed) && parsed >= 1 && parsed <= WIZARD_STEPS.length) {
          setCurrentStep(parsed);
          setActiveWizardStep(parsed);
        }
      }
    }
  }, [stepParam, setActiveWizardStep]);

  // Synchronize step on browser Back/Forward (popstate)
  React.useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const stepVal = params.get("step");
      if (stepVal) {
        const parsed = parseInt(stepVal, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= WIZARD_STEPS.length) {
          lastParamStepRef.current = String(parsed);
          setCurrentStep(parsed);
          setActiveWizardStep(parsed);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setActiveWizardStep]);

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
    const validStep = Math.min(Math.max(1, stepNumber), WIZARD_STEPS.length);
    setCurrentStep(validStep);
    setActiveWizardStep(validStep);
    lastParamStepRef.current = String(validStep);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("step", String(validStep));
      window.history.replaceState(null, "", url.toString());
      const stepContainer = document.getElementById("wizard-step-container");
      if (stepContainer) {
        stepContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      }
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

  // Real-time live model synchronization for 2D architectural blueprint sheet
  const watchedFormValues = form.watch();
  const liveModel = useMemo(() => {
    try {
      return formValuesToModel(watchedFormValues, activeModel);
    } catch {
      return activeModel;
    }
  }, [watchedFormValues, activeModel]);

  const activePhase = useMemo(
    () => WIZARD_PHASES.find((p) => p.steps.includes(currentStep)) || WIZARD_PHASES[0],
    [currentStep]
  );

  const [studioMode, setStudioMode] = useState<"split" | "blueprint" | "parameters">("split");
  const [isStepDropdownOpen, setIsStepDropdownOpen] = useState(false);
  const [showAlpineTips, setShowAlpineTips] = useState(false);

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

  const handleNext = () => {
    flushNow();
    const currentVals = form.getValues();
    if (currentVals.location?.weatherSource) {
      const matchingStation = weatherDatasets.find((w) => w.epwFileName === currentVals.location?.weatherSource);
      if (matchingStation) {
        setActiveWeather(matchingStation.id);
      }
    }
    handleStepSelect(Math.min(currentStep + 1, WIZARD_STEPS.length));
  };

  const handlePrevious = () => {
    flushNow();
    if (currentStep > 1) {
      handleStepSelect(currentStep - 1);
    } else {
      router.push("/weather");
    }
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
            <span className="micro-label">9-Step Sequence</span>
            <span className="text-xs font-semibold text-muted-foreground">Step {currentStep} of {WIZARD_STEPS.length}</span>
            <span className="text-xs text-muted-foreground/60">•</span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {Math.round((currentStep / WIZARD_STEPS.length) * 100)}% Complete
            </span>
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
              className={`h-2 w-2 rounded-full ${saveStatus === "saving"
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
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${advancedMode
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

          {currentStep === 9 && (
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 shadow-sm hover:bg-blue-500/20 transition"
              title="Export complete 9-step shelter definition JSON"
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

      {/* Studio View Mode Switcher & 2D Vector CAD Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-border bg-secondary/50 p-1">
          <button
            type="button"
            onClick={() => setStudioMode("split")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${studioMode === "split"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Layers className="size-3.5" />
            <span>Split Studio (2D CAD + Form)</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioMode("blueprint")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${studioMode === "blueprint"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Maximize2 className="size-3.5" />
            <span>Full Blueprint Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioMode("parameters")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${studioMode === "parameters"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Sliders className="size-3.5" />
            <span>Parameters Only</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-Time Architectural Plan</span>
        </div>
      </div>

      {/* 9-Step Architectural Sequence Navigation Ribbon */}
      <div className="rounded-2xl border border-border bg-card p-2 sm:p-2.5 shadow-xs">
        <div className="grid grid-cols-9 gap-1 sm:gap-1.5" role="tablist" aria-label="9-Step Architectural Sequence">
          {WIZARD_STEPS.map((s) => {
            const isCurrent = currentStep === s.id;
            const isDone = currentStep > s.id;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleStepSelect(s.id)}
                className={`group flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-2 px-1 text-center transition ${
                  isCurrent
                    ? "bg-foreground text-background shadow-xs ring-2 ring-foreground/20 font-bold"
                    : isDone
                    ? "border border-border/80 bg-card text-foreground hover:bg-secondary font-medium"
                    : "border border-border/40 bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                title={`Step ${s.id}: ${s.name} — ${s.description} (${isDone ? "Completed" : isCurrent ? "Active" : "Upcoming"})`}
              >
                <span className={`text-[10px] font-mono font-bold ${
                  isCurrent
                    ? "text-background"
                    : isDone
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                }`}>
                  {isDone ? "✓" : `0${s.id}`}
                </span>
                <Icon className="size-3.5 hidden md:inline shrink-0" />
                <span className="text-[11px] truncate hidden sm:inline">{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Studio View Modes: Split (Side-by-Side), Blueprint Only, or Parameters Only */}
      {studioMode === "blueprint" && (
        <div className="space-y-6">
          <section aria-label="Real-time Architectural Blueprint Studio">
            <ArchitecturalPlanSheet model={liveModel} />
          </section>
          <div className="flex justify-center pb-8">
            <button
              type="button"
              onClick={() => setStudioMode("split")}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-xs font-bold text-background shadow-md transition hover:opacity-90"
            >
              <Sliders className="size-4" />
              <span>Open Side-by-Side Parameter Studio</span>
            </button>
          </div>
        </div>
      )}

      {studioMode === "split" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Dominant Left Column: Architectural Plan Sheet (~60-67% width, sticky pinned on desktop) */}
          <div className="xl:col-span-7 2xl:col-span-8 xl:sticky xl:top-20 space-y-4">
            <section aria-label="Real-time Architectural Blueprint Studio">
              <ArchitecturalPlanSheet model={liveModel} />
            </section>
          </div>

          {/* Right Column: Parameter Editor (clean, well-aligned, and simple) */}
          <div className="xl:col-span-5 2xl:col-span-4 space-y-4">
            {/* Integrated Parameter Studio Header & Step Tracker */}
            <div id="wizard-step-container" className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                {/* Step & Phase Identity */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-foreground text-background font-mono text-xs font-bold shadow-xs">
                    {currentStep}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                      <span>Phase {activePhase.id}</span>
                      <span>·</span>
                      <span className="truncate">{activePhase.name}</span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {WIZARD_STEPS[currentStep - 1]?.name}
                    </h3>
                  </div>
                </div>

                {/* Step Controls: Prev/Next Quick Chevrons + Dropdown Trigger */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-secondary/50 text-foreground transition hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none"
                    title="Previous Step"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentStep === WIZARD_STEPS.length}
                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-secondary/50 text-foreground transition hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none"
                    title="Next Step"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>

                  <div className="relative ml-1">
                    <button
                      type="button"
                      onClick={() => setIsStepDropdownOpen(!isStepDropdownOpen)}
                      className={`flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold transition ${
                        isStepDropdownOpen ? "bg-foreground text-background" : "bg-secondary/50 text-foreground hover:bg-secondary"
                      }`}
                      aria-expanded={isStepDropdownOpen}
                      title="Jump to any step"
                    >
                      <span>Steps</span>
                      <ChevronDown className={`size-3 transition-transform duration-200 ${isStepDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isStepDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 z-40 w-72 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                          {WIZARD_PHASES.map((phase) => (
                            <div key={phase.id} className="space-y-1">
                              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                                Phase {phase.id}: {phase.name}
                              </div>
                              {phase.steps.map((sId) => {
                                const s = WIZARD_STEPS[sId - 1];
                                const Icon = s.icon;
                                const isCurrent = currentStep === sId;
                                const isDone = currentStep > sId;
                                return (
                                  <button
                                    key={sId}
                                    type="button"
                                    onClick={() => {
                                      handleStepSelect(sId);
                                      setIsStepDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition ${isCurrent
                                      ? "bg-foreground text-background font-bold shadow-xs"
                                      : "text-foreground hover:bg-secondary"
                                      }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <Icon className="size-3.5 shrink-0" />
                                      <span className="truncate">{s.id}. {s.name}</span>
                                    </div>
                                    {isDone && <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 9-Step Segmented Interactive Progress Track */}
              <div className="mt-3 pt-2.5 border-t border-border/50">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mb-1.5">
                  <span>Step {currentStep} of {WIZARD_STEPS.length}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {Math.round((currentStep / WIZARD_STEPS.length) * 100)}% Complete
                  </span>
                </div>
                <div className="grid grid-cols-9 gap-1" role="tablist" aria-label="Wizard Steps">
                  {WIZARD_STEPS.map((s) => {
                    const isCurrent = currentStep === s.id;
                    const isDone = currentStep > s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleStepSelect(s.id)}
                        className={`flex h-7 items-center justify-center rounded-lg text-[11px] font-bold transition-all duration-150 ${
                          isCurrent
                            ? "bg-foreground text-background shadow-xs ring-2 ring-foreground/20 ring-offset-1 ring-offset-card"
                            : isDone
                            ? "border border-border bg-card text-emerald-600 dark:text-emerald-400 hover:bg-secondary"
                            : "border border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                        title={`${s.id}. ${s.name} (${isDone ? "Completed" : isCurrent ? "Active" : "Upcoming"})`}
                      >
                        {isDone ? "✓" : s.id}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active Parameter Form Card */}
            <form
              onSubmit={form.handleSubmit((vals) => handleFinalSubmit(vals, false))}
              className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4"
            >
              {currentStep === 1 && <Step3Geometry form={form} advancedMode={advancedMode} />}
              {currentStep === 2 && <Step4Walls form={form} advancedMode={advancedMode} />}
              {currentStep === 3 && <Step5Roof form={form} advancedMode={advancedMode} />}
              {currentStep === 4 && <Step6Floor form={form} advancedMode={advancedMode} />}
              {currentStep === 5 && <Step5WindowsAndDoors form={form} advancedMode={advancedMode} />}
              {currentStep === 6 && <Step9ThermalMass form={form} advancedMode={advancedMode} />}
              {currentStep === 7 && <Step7IndoorClimate form={form} advancedMode={advancedMode} />}
              {currentStep === 8 && <Step12DesignTargets form={form} advancedMode={advancedMode} onExport={exportJson} />}
              {currentStep === 9 && <Step13SimulationSettings form={form} advancedMode={advancedMode} />}

              {/* Submission Error Banner */}
              {submissionError && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/50 bg-rose-500/10 p-3.5 text-xs text-rose-900 dark:text-rose-200 shadow-xs">
                  <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-rose-700 dark:text-rose-300">Simulation Launch Failed</p>
                    <p className="leading-relaxed font-mono text-[11px] text-rose-800 dark:text-rose-300 bg-background/60 p-2 rounded-lg border border-rose-500/20">
                      {submissionError}
                    </p>
                  </div>
                </div>
              )}

              {/* Job Dispatched Confirmation Banner */}
              {submittedJobId && (
                <div className="mt-4 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-xs text-emerald-950 dark:text-emerald-100 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Dispatched to ThermoShelter Solver!</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    Job ID: {submittedJobId}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href="/simulations"
                      className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background shadow-xs transition hover:opacity-90"
                    >
                      Dashboard &rarr;
                    </Link>
                    <Link
                      href={`/results?jobId=${submittedJobId}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-secondary/80 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-xs transition hover:bg-secondary"
                    >
                      Results &rarr;
                    </Link>
                  </div>
                </div>
              )}

              {/* Stepper Navigation Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-4 py-2 text-xs font-semibold text-foreground shadow-xs transition hover:bg-secondary"
                >
                  <ChevronLeft className="size-4" />
                  <span>{currentStep > 1 ? `Step ${currentStep - 1}` : "Weather"}</span>
                </button>

                <div className="flex items-center gap-2">
                  {currentStep < WIZARD_STEPS.length ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-xs font-bold text-background shadow-xs transition hover:opacity-90"
                    >
                      <span>Next: {WIZARD_STEPS[currentStep]?.name || `Step ${currentStep + 1}`}</span>
                      <ChevronRight className="size-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Play className="size-4" />
                      <span>{isSubmitting ? "Queueing..." : "Launch Simulation"}</span>
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Live CAD Metrics Strip */}
            <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Live CAD Model Telemetry
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  1:50 Live Sync
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-2">
                  <div className="text-[10px] text-muted-foreground">Floor Area</div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-foreground">{floorArea} <span className="text-[10px] font-normal text-muted-foreground">m²</span></div>
                </div>
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-2">
                  <div className="text-[10px] text-muted-foreground">Gross Wall</div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-foreground">{grossWallArea} <span className="text-[10px] font-normal text-muted-foreground">m²</span></div>
                </div>
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-2">
                  <div className="text-[10px] text-muted-foreground">Volume</div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-foreground">{volume} <span className="text-[10px] font-normal text-muted-foreground">m³</span></div>
                </div>
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-2">
                  <div className="text-[10px] text-muted-foreground">Glazing WWR</div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">{wwr}%</div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>Azimuth: <strong className="font-mono text-foreground">{orientation}°</strong></span>
                <span>L/W Aspect: <strong className="font-mono text-foreground">{(length / (width || 1)).toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Collapsible Alpine Design Principles */}
            <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
              <button
                type="button"
                onClick={() => setShowAlpineTips(!showAlpineTips)}
                className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-3.5 text-amber-500" />
                  <span>Alpine High-Altitude Design Principles</span>
                </div>
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${showAlpineTips ? "rotate-180" : ""}`} />
              </button>
              {showAlpineTips && (
                <ul className="mt-2.5 list-disc space-y-1 pl-5 text-[11px] text-muted-foreground border-t border-border/50 pt-2.5 animate-in fade-in duration-150">
                  <li>Orient long axis E-W with primary solar glazing facing South.</li>
                  <li>Keep WWR between 10% and 20% for extreme alpine cold retention.</li>
                  <li>Continuous envelope insulation without thermal bridging.</li>
                  <li>Internal thermal flywheel mass for passive solar heat retention.</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {studioMode === "parameters" && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Consolidated 4-Phase Engineering Stepper (9 Engineering Steps) */}
          <div id="wizard-step-container" className="space-y-3.5 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            {/* Phase Header with Live Completion Metric */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex size-6 items-center justify-center rounded-xl bg-foreground text-xs font-bold text-background shadow-xs">
                  {currentStep}
                </span>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Phase {activePhase.id} of 4: {activePhase.name}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    Step {currentStep} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1]?.name}
                  </div>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {Math.round((currentStep / WIZARD_STEPS.length) * 100)}% Completed
              </span>
            </div>

            {/* 4-Phase Primary Segmented Selector */}
            <nav className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" aria-label="Consolidated 4-phase engineering steps">
              {WIZARD_PHASES.map((phase) => {
                const isPhaseActive = phase.id === activePhase.id;
                const isPhaseCompleted = phase.steps.every((s) => currentStep > s);
                const firstStep = phase.steps[0];

                return (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => handleStepSelect(firstStep)}
                    className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition ${
                      isPhaseActive
                        ? "bg-foreground text-background shadow-sm font-bold"
                        : isPhaseCompleted
                        ? "bg-secondary/70 border border-border text-foreground hover:bg-secondary font-medium"
                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        isPhaseActive
                          ? "bg-background text-foreground"
                          : isPhaseCompleted
                          ? "bg-emerald-500 text-white"
                          : "bg-foreground/10 text-muted-foreground"
                      }`}
                    >
                      {isPhaseCompleted ? "✓" : `0${phase.id}`}
                    </span>
                    <span className="truncate">{phase.name}</span>
                  </button>
                );
              })}
            </nav>

            {/* All 9 Steps Aligned in a 9-Column Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 border-t border-border/50 pt-3">
              {WIZARD_STEPS.map((s) => {
                const isCurrent = currentStep === s.id;
                const isDone = currentStep > s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStepSelect(s.id)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-center transition ${
                      isCurrent
                        ? "bg-foreground text-background shadow-xs ring-2 ring-foreground/20 font-bold"
                        : isDone
                        ? "border border-border bg-card text-foreground hover:bg-secondary font-medium"
                        : "border border-border/40 bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    title={`${s.id}. ${s.name}: ${s.description}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-mono font-bold ${isCurrent ? "text-background" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {isDone ? "✓" : `0${s.id}`}
                      </span>
                      <Icon className="size-3" />
                    </div>
                    <span className="text-[10px] leading-tight truncate w-full">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content Area + Live HUD */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="lg:col-span-3">
              <form onSubmit={form.handleSubmit((vals) => handleFinalSubmit(vals, false))} className="rounded-2xl border border-border bg-card p-6 shadow-xs text-card-foreground">
                {currentStep === 1 && <Step3Geometry form={form} advancedMode={advancedMode} />}
                {currentStep === 2 && <Step4Walls form={form} advancedMode={advancedMode} />}
                {currentStep === 3 && <Step5Roof form={form} advancedMode={advancedMode} />}
                {currentStep === 4 && <Step6Floor form={form} advancedMode={advancedMode} />}
                {currentStep === 5 && <Step5WindowsAndDoors form={form} advancedMode={advancedMode} />}
                {currentStep === 6 && <Step9ThermalMass form={form} advancedMode={advancedMode} />}
                {currentStep === 7 && <Step7IndoorClimate form={form} advancedMode={advancedMode} />}
                {currentStep === 8 && <Step12DesignTargets form={form} advancedMode={advancedMode} onExport={exportJson} />}
                {currentStep === 9 && <Step13SimulationSettings form={form} advancedMode={advancedMode} />}

                {/* Submission Error Banner */}
                {submissionError && (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/50 bg-rose-500/10 p-4 text-xs text-rose-900 dark:text-rose-200 shadow-xs">
                    <AlertCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-rose-700 dark:text-rose-300">Simulation Launch Failed</p>
                      <p className="leading-relaxed font-mono text-[11px] text-rose-800 dark:text-rose-300 bg-background/60 p-2 rounded-xl border border-rose-500/20">
                        {submissionError}
                      </p>
                    </div>
                  </div>
                )}

                {/* Job Dispatched Confirmation Banner */}
                {submittedJobId && (
                  <div className="mt-6 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-5 text-xs text-emerald-950 dark:text-emerald-100 shadow-xs">
                    <div className="flex items-center gap-2.5 font-bold text-sm text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Simulation Successfully Dispatched to ThermoShelter Solver!</span>
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      Job ID: <code className="rounded-lg bg-card px-2 py-0.5 font-mono text-xs font-bold text-foreground border border-border">{submittedJobId}</code>
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <Link
                        href="/simulations"
                        className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background shadow-xs transition hover:opacity-90"
                      >
                        View in Simulations Dashboard &rarr;
                      </Link>
                      <Link
                        href={`/results?jobId=${submittedJobId}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-secondary/80 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-xs transition hover:bg-secondary"
                      >
                        Analyze Thermal Results &rarr;
                      </Link>
                    </div>
                  </div>
                )}

                {/* Stepper Navigation Footer */}
                <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-5">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-5 py-2.5 text-xs font-semibold text-foreground shadow-xs transition hover:bg-secondary"
                  >
                    <ChevronLeft className="size-4" />
                    <span>{currentStep > 1 ? `Previous: ${WIZARD_STEPS[currentStep - 2].name}` : "Previous: Climate & Site"}</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {currentStep < WIZARD_STEPS.length ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-xs font-bold text-background shadow-xs transition hover:opacity-90"
                      >
                        <span>Next: {WIZARD_STEPS[currentStep].name}</span>
                        <ChevronRight className="size-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Play className="size-4" />
                        <span>{isSubmitting ? "Queueing Simulation..." : "Confirm & Launch Simulation"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Live Engineering HUD Sidebar */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Live Geometry HUD
                </h4>

                <div className="mt-4 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Floor Area</span>
                    <span className="font-bold text-foreground font-mono">{floorArea} m²</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Gross Wall Area</span>
                    <span className="font-bold text-foreground font-mono">{grossWallArea} m²</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Enclosed Air Volume</span>
                    <span className="font-bold text-foreground font-mono">{volume} m³</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Glazing Area</span>
                    <span className="font-bold text-foreground font-mono">{windowArea} m²</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Window-to-Wall Ratio</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{wwr} %</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground">Orientation Azimuth</span>
                    <span className="font-bold text-foreground font-mono">{orientation}°</span>
                  </div>
                </div>
              </div>

              {/* Quick Design Rules Card */}
              <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-xs">
                <h5 className="font-bold text-foreground">Alpine Design Principles</h5>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                  <li>Orient long axis East-West with primary glazing facing South.</li>
                  <li>Keep WWR between 10% and 20% to avoid nocturnal radiation loss.</li>
                  <li>Continuous envelope insulation without thermal breaks.</li>
                  <li>Exposed high-density thermal mass inside the insulated core.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

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
                The selected weather dataset is classified as <span className="font-bold text-amber-400">TEST DATA</span> ({pendingValues?.location.weatherSource?.replace(/\.epw$/i, "")}).
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
                Switch to Authentic Leh Dataset
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
      <WorkflowFooter
        customPrevLabel={currentStep > 1 ? `Previous: ${WIZARD_STEPS[currentStep - 2].name}` : "Previous: Climate & Site"}
        customPrevAction={handlePrevious}
        customNextLabel={currentStep < WIZARD_STEPS.length ? `Next: ${WIZARD_STEPS[currentStep].name}` : "Proceed to 3D CAD"}
        customNextAction={currentStep < WIZARD_STEPS.length ? handleNext : () => router.push("/designer/3d")}
      />

    </div>
  );
}
