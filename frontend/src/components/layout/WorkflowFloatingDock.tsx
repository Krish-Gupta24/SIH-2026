"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  MapPin,
  Sliders,
  Box,
  Play,
  BarChart3,
  Sparkles,
  GitCompare,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Flame,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
} from "lucide-react";
import { WORKFLOW_PIPELINE, getWorkflowStepIndex, WorkflowStep } from "./workflow-pipeline";
import { motion, AnimatePresence } from "framer-motion";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { useAuthStore } from "@/lib/store/use-auth-store";
import { filterProjectsForUser } from "@/lib/store/shelter-auth-filter";
import { PulseBeacon, springs } from "@/components/motion/MotionWrappers";

interface WorkflowFloatingDockProps {
  completedStepIds: string[];
  activeProjectName?: string;
  is3dView?: boolean;
}

const STEP_ICONS: Record<string, React.ElementType> = {
  overview: FolderKanban,
  climate: MapPin,
  designer: Sliders,
  "3d": Box,
  simulate: Play,
  results: BarChart3,
  optimize: Sparkles,
  compare: GitCompare,
  report: FileText,
};

const PIPELINE_GROUPS = [
  {
    id: "spec",
    name: "Specification",
    stepIds: ["overview", "climate", "designer", "3d"],
  },
  {
    id: "physics",
    name: "Physics Engine",
    stepIds: ["simulate", "results"],
  },
  {
    id: "decisions",
    name: "Tactical Decisions",
    stepIds: ["optimize", "compare", "report"],
  },
];

export function WorkflowFloatingDock({
  completedStepIds,
  activeProjectName,
  is3dView = false,
}: WorkflowFloatingDockProps) {
  const pathname = usePathname();
  const currentStepIndex = getWorkflowStepIndex(pathname);

  const { currentUser } = useAuthStore();
  const {
    projects,
    activeProjectId,
    setActiveProject,
    simulations,
  } = useShelterStore();

  const visibleProjects = filterProjectsForUser(projects, currentUser?.id);
  const activeProject =
    visibleProjects.find((p) => p.id === activeProjectId) || visibleProjects[0] || projects[0];

  const isBaselineTin =
    activeProject?.id === "shelter-baseline-tin" ||
    activeProject?.project?.name?.toLowerCase().includes("cgi tin");

  const latestSim = simulations.find(
    (s) => s.projectId === activeProject?.id && s.status === "completed" && s.results
  );

  const isSimulating = simulations.some(
    (s) =>
      s.projectId === activeProject?.id &&
      (s.status === "running" || s.status === "queued" || s.status === "preparing")
  );

  const completedRuns = simulations.filter(
    (s) => s.projectId === activeProject?.id && s.status === "completed"
  );
  const hasNoSimulation = completedRuns.length === 0;
  const SIMULATION_GATED_STEPS = ["results", "optimize", "compare", "report"];

  // Defaults to expanded: true so pipeline stages are prominently visible
  const [expanded, setExpanded] = useState<boolean>(true);
  const [projectPickerOpen, setProjectPickerOpen] = useState<boolean>(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Hydrate persistence from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("thermoshelter_sidebar_expanded");
      if (saved !== null) {
        setExpanded(saved === "true");
      }
    } catch {
      // fallback to true
    }
  }, []);

  // Close project picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setProjectPickerOpen(false);
      }
    }
    if (projectPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [projectPickerOpen]);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("thermoshelter_sidebar_expanded", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const completedPct = Math.round((completedStepIds.length / WORKFLOW_PIPELINE.length) * 100);

  return (
    <aside
      aria-label="Engineering Workflow Navigation Sidebar"
      className={`shrink-0 hidden md:flex flex-col justify-between transition-all duration-300 ease-in-out select-none ${
        expanded ? "w-64 lg:w-72" : "w-18"
      } sticky top-[124px] h-[calc(100vh-124px)] border-r border-border/70 bg-card/80 backdrop-blur-2xl z-30 p-3 shadow-xs`}
    >
      {/* 1. Top Section: Active Project Card & Switcher */}
      <div className="border-b border-border/60 pb-3" ref={pickerRef}>
        <div className="flex items-center justify-between gap-1.5">
          {expanded ? (
            <div className="relative min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setProjectPickerOpen(!projectPickerOpen)}
                className="group flex w-full items-center justify-between rounded-xl p-1.5 text-left transition hover:bg-secondary/70 border border-transparent hover:border-border/60"
                title="Switch active project"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-sky-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
                    {isBaselineTin ? (
                      <AlertTriangle className="size-4 text-amber-600" />
                    ) : (
                      <Box className="size-4 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-foreground group-hover:text-foreground">
                        {activeProject?.project?.name || activeProjectName || "Active Shelter"}
                      </span>
                      <ChevronDown
                        className={`size-3 text-muted-foreground transition-transform duration-200 ${
                          projectPickerOpen ? "rotate-180 text-foreground" : ""
                        }`}
                      />
                    </div>
                    <span className="block truncate text-[10px] text-muted-foreground font-mono">
                      {activeProject?.location?.region || "Leh Ladakh"} · {activeProject?.location?.elevation ?? 3500}m
                    </span>
                  </div>
                </div>
              </button>

              {/* Fast Project Switcher Dropdown */}
              <AnimatePresence>
                {projectPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={springs.snappy}
                    className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-card p-2 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Switch Active Project
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {visibleProjects.length} visible
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                      {visibleProjects.map((p) => {
                        const isSelected = p.id === activeProject?.id;
                        const isOwner = p.project?.userId === currentUser?.id || (p as any).userId === currentUser?.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setActiveProject(p.id);
                              setProjectPickerOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                              isSelected
                                ? "bg-foreground text-background font-bold shadow-xs"
                                : "hover:bg-secondary text-foreground"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="truncate font-semibold flex items-center gap-1.5">
                                <span className="truncate">{p.project?.name}</span>
                                {isOwner && (
                                  <span className={`text-[8px] font-bold px-1 py-0.2 rounded shrink-0 ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  }`}>
                                    Mine
                                  </span>
                                )}
                              </div>
                              <div
                                className={`text-[10px] truncate ${
                                  isSelected ? "text-background/80" : "text-muted-foreground"
                                }`}
                              >
                                {p.location?.region} · {p.location?.elevation ?? 3500}m
                              </div>
                            </div>
                            {isSelected && (
                              <div className="size-2 rounded-full bg-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-border/60 pt-1.5 mt-1 px-1">
                      <Link
                        href="/projects"
                        onClick={() => setProjectPickerOpen(false)}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <span>Manage all projects in library</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="mx-auto flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-sky-500/20 border border-amber-500/30 text-amber-600 shadow-xs">
              <Box className="size-4" />
            </div>
          )}

          {/* Toggle Expand / Collapse Button */}
          <motion.button
            type="button"
            onClick={toggleExpanded}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground border border-border/40"
            title={expanded ? "Collapse Sidebar to icons" : "Expand Sidebar (Show Tab Names)"}
            aria-label={expanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {expanded ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </motion.button>
        </div>
      </div>

      {/* 2. Middle Section: Categorized Engineering Pipeline */}
      <nav
        className="my-3 flex-1 flex flex-col gap-4 overflow-y-auto pr-1 overflow-x-hidden"
        aria-label="Workflow pipeline stages"
      >
        {PIPELINE_GROUPS.map((group) => {
          const groupSteps = WORKFLOW_PIPELINE.filter((s) => group.stepIds.includes(s.id));

          return (
            <div key={group.id} className="space-y-1">
              {/* Category Micro-Label */}
              {expanded ? (
                <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between">
                  <span>{group.name}</span>
                  <span className="font-mono text-[8px] text-muted-foreground/60">
                    {groupSteps.filter((s) => completedStepIds.includes(s.id)).length}/{groupSteps.length}
                  </span>
                </div>
              ) : (
                <div className="h-px bg-border/50 mx-2 my-1.5" />
              )}

              {/* Step Navigation Items */}
              <div className="space-y-0.5">
                {groupSteps.map((step: WorkflowStep) => {
                  const Icon = STEP_ICONS[step.id] || Box;
                  const stepIndex = getWorkflowStepIndex(step.href);
                  const isActive = stepIndex === currentStepIndex;
                  const isDone = completedStepIds.includes(step.id);
                  const isSimStepRunning = step.id === "simulate" && isSimulating;
                  const isLocked = hasNoSimulation && SIMULATION_GATED_STEPS.includes(step.id);

                  return (
                    <div key={step.id} className="relative group">
                      <Link href={step.href}>
                        <motion.div
                          whileHover={{ x: 3, transition: { type: "spring", stiffness: 450, damping: 25 } }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative flex items-center gap-2.5 rounded-xl transition-colors duration-200 ${
                            expanded ? "px-2.5 py-2 text-xs" : "size-10 justify-center p-0 mx-auto"
                          } ${
                            isActive
                              ? "text-background font-bold shadow-xs"
                              : isDone
                              ? "text-foreground hover:bg-secondary/70 font-medium"
                              : isLocked
                              ? "text-muted-foreground/75 hover:bg-secondary/40 hover:text-foreground font-normal"
                              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground font-normal"
                          }`}
                        >
                          {/* Active sliding background pill */}
                          {isActive && (
                            <motion.span
                              layoutId="activeWorkflowStepPill"
                              transition={{ type: "spring", stiffness: 450, damping: 32 }}
                              className="absolute inset-0 rounded-xl bg-foreground z-0 shadow-md shadow-foreground/15"
                            />
                          )}

                          {/* Step Icon */}
                          <div className="relative z-10 shrink-0 flex items-center justify-center">
                            {isSimStepRunning ? (
                              <RotateCw className="size-4 animate-spin text-sky-400" />
                            ) : (
                              <Icon className={`size-4 ${isActive ? "text-background" : isLocked ? "text-muted-foreground/70" : "text-foreground/80"}`} />
                            )}

                            {/* Completed Mini Indicator Dot when collapsed */}
                            {isDone && !isActive && !expanded && (
                              <span className="absolute -bottom-1 -right-1 flex size-2.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                                <span className="block size-1 rounded-full bg-white" />
                              </span>
                            )}

                            {/* Locked Mini Indicator Dot when collapsed */}
                            {isLocked && !isDone && !isActive && !expanded && (
                              <span className="absolute -bottom-1 -right-1 flex size-2.5 items-center justify-center rounded-full bg-amber-500/25 ring-2 ring-card" title="Locked - requires simulation">
                                <Lock className="size-1.5 text-amber-500" />
                              </span>
                            )}
                          </div>

                          {/* Prominently Visible Tab Name & Step Number in Expanded Mode */}
                          {expanded && (
                            <div className="relative z-10 min-w-0 flex-1 flex items-center justify-between gap-1.5">
                              <span className="truncate font-semibold text-xs leading-tight">
                                {step.label}
                              </span>
                              <span className="shrink-0 flex items-center gap-1">
                                {isSimStepRunning ? (
                                  <span className="flex items-center gap-1 text-[9px] font-mono text-sky-500 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded-full">
                                    <PulseBeacon color="sky" size="sm" />
                                    RUNNING
                                  </span>
                                ) : isDone ? (
                                  <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    ✓
                                  </span>
                                ) : isLocked ? (
                                  <span
                                    className="flex items-center gap-1 text-[9px] font-mono font-medium text-amber-500/90 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20"
                                    title="Locked: Run physics simulation to populate live metrics"
                                  >
                                    <Lock className="size-2.5" />
                                    <span>Lock</span>
                                  </span>
                                ) : (
                                  <span
                                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                                      isActive
                                        ? "bg-background/20 text-background"
                                        : "text-muted-foreground bg-secondary/80"
                                    }`}
                                  >
                                    0{step.stepNumber}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      </Link>

                      {/* Hover Tooltip when collapsed */}
                      {!expanded && (
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 hidden group-hover:flex flex-col whitespace-nowrap rounded-2xl border border-border bg-popover px-3 py-2 text-xs shadow-xl animate-in fade-in zoom-in-95">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {step.stepNumber}. {step.label}
                            </span>
                            {isDone ? (
                              <CheckCircle2 className="size-3.5 text-emerald-500" />
                            ) : isLocked ? (
                              <span className="flex items-center gap-0.5 text-[9px] font-mono font-semibold text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                                <Lock className="size-2" /> Locked
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] whitespace-normal">
                            {isLocked
                              ? "Run a simulation for this project first to unlock full data."
                              : step.description}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* 3. Bottom Section: Mini Thermal Telemetry & Pipeline Validation Metric */}
      <div className="border-t border-border/60 pt-3 space-y-2.5">
        {expanded ? (
          <>
            {/* Live Quick Thermal Card */}
            <div className="rounded-2xl border border-border/70 bg-secondary/40 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  Thermal Response
                </span>
                {latestSim ? (
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {latestSim.results?.summary?.comfortHoursPct}% Comfort
                  </span>
                ) : (
                  <span className="text-muted-foreground">Unsimulated</span>
                )}
              </div>

              {latestSim ? (
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-0.5">
                  <span>Heating Load:</span>
                  <span className="font-bold text-foreground">
                    {latestSim.results?.summary?.heatingDemandKwhM2} kWh/m²
                  </span>
                </div>
              ) : (
                <Link
                  href="/simulations"
                  className="flex items-center justify-between text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline pt-0.5"
                >
                  <span>Queue simulation run</span>
                  <ArrowRight className="size-3" />
                </Link>
              )}
            </div>

            {/* Pipeline Progress Meter */}
            <div className="space-y-1.5 px-0.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                <span>Validation Progress</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  {completedPct}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden border border-border/50">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${completedPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-0.5">
                <span>{completedStepIds.length} of {WORKFLOW_PIPELINE.length} Stages Validated</span>
                <span className="font-mono text-[9px] text-muted-foreground/80">IS 3792</span>
              </div>
            </div>
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-1 py-1"
            title={`${completedStepIds.length} of ${WORKFLOW_PIPELINE.length} steps validated`}
          >
            <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {completedStepIds.length}/9
            </div>
            <span className="text-[8px] font-mono text-muted-foreground">{completedPct}%</span>
          </div>
        )}
      </div>
    </aside>
  );
}

// Re-export alias for clean naming
export { WorkflowFloatingDock as WorkflowSidebar };
