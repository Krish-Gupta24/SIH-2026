"use client";

import React, { useState, useEffect } from "react";
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
  CheckCircle2,
} from "lucide-react";
import { WORKFLOW_PIPELINE, getWorkflowStepIndex, WorkflowStep } from "./workflow-pipeline";

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

export function WorkflowFloatingDock({
  completedStepIds,
  activeProjectName,
  is3dView = false,
}: WorkflowFloatingDockProps) {
  const pathname = usePathname();
  const currentStepIndex = getWorkflowStepIndex(pathname);

  // Defaults to expanded: true so tab names are prominently visible at all times!
  const [expanded, setExpanded] = useState<boolean>(true);

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

  return (
    <aside
      aria-label="Engineering Workflow Navigation Sidebar"
      className={`shrink-0 hidden md:flex flex-col justify-between transition-all duration-300 ease-in-out select-none ${
        expanded ? "w-60 lg:w-64" : "w-16"
      } sticky top-[124px] h-[calc(100vh-124px)] border-r border-border/80 bg-card/75 backdrop-blur-xl z-30 p-2.5 shadow-sm`}
    >
      {/* Top Header / Project Title in Sidebar */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2 px-1">
        {expanded ? (
          <div className="min-w-0 pr-1">
            <span className="block truncate text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Engineering Pipeline
            </span>
            <span className="block truncate text-xs font-bold text-foreground">
              {activeProjectName || "Active Shelter"}
            </span>
          </div>
        ) : (
          <div className="mx-auto flex size-7 items-center justify-center rounded-lg bg-foreground/5 text-foreground font-mono text-[10px] font-bold">
            CAD
          </div>
        )}

        <button
          type="button"
          onClick={toggleExpanded}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          title={expanded ? "Collapse Sidebar to icons" : "Expand Sidebar (Show Tab Names)"}
          aria-label={expanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {expanded ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </div>

      {/* Vertical Navigation Links with Prominent Tab Names */}
      <nav className="my-2 flex-1 flex flex-col gap-1 overflow-y-auto pr-0.5" aria-label="Workflow pipeline stages">
        {WORKFLOW_PIPELINE.map((step: WorkflowStep, idx: number) => {
          const Icon = STEP_ICONS[step.id] || Box;
          const isActive = idx === currentStepIndex;
          const isDone = completedStepIds.includes(step.id);

          return (
            <div key={step.id} className="relative group">
              <Link
                href={step.href}
                className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 ${
                  expanded ? "px-3 py-2.5 text-xs" : "size-10 justify-center p-0 mx-auto"
                } ${
                  isActive
                    ? "bg-foreground text-background font-bold shadow-sm shadow-foreground/15"
                    : isDone
                    ? "text-foreground hover:bg-secondary font-medium"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground font-normal"
                }`}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-500" />
                )}

                {/* Step Icon + Completion Dot */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon className={`size-4 ${isActive ? "text-background" : "text-foreground/80"}`} />
                  {isDone && !isActive && (
                    <span className="absolute -bottom-1 -right-1 flex size-2.5 items-center justify-center rounded-full bg-emerald-500">
                      <span className="block size-1 rounded-full bg-white" />
                    </span>
                  )}
                </div>

                {/* Prominently Visible Tab Name & Step Number */}
                {expanded && (
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-1.5">
                    <span className="truncate font-semibold text-xs leading-tight">
                      {step.label}
                    </span>
                    <span className="shrink-0 flex items-center gap-1">
                      {isDone ? (
                        <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          ✓
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                            isActive
                              ? "bg-background/20 text-background"
                              : "text-muted-foreground bg-secondary"
                          }`}
                        >
                          0{step.stepNumber}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </Link>

              {/* Hover Tooltip when collapsed */}
              {!expanded && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 hidden group-hover:flex flex-col whitespace-nowrap rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-xl animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      {step.stepNumber}. {step.label}
                    </span>
                    {isDone && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] whitespace-normal">
                    {step.description}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer with Live Completion Metric */}
      <div className="border-t border-border/60 pt-2.5 px-1 space-y-1.5">
        {expanded ? (
          <>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
              <span>Pipeline Validation</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                {Math.round((completedStepIds.length / WORKFLOW_PIPELINE.length) * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden border border-border/60">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${(completedStepIds.length / WORKFLOW_PIPELINE.length) * 100}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-0.5">
              <span>{completedStepIds.length} of {WORKFLOW_PIPELINE.length} Validated</span>
              <span className="font-mono text-[9px] text-muted-foreground/70">IS 3792</span>
            </div>
          </>
        ) : (
          <div
            className="flex items-center justify-center text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400"
            title={`${completedStepIds.length} of ${WORKFLOW_PIPELINE.length} steps validated`}
          >
            {completedStepIds.length}/9
          </div>
        )}
      </div>
    </aside>
  );
}

// Re-export alias for clean naming
export { WorkflowFloatingDock as WorkflowSidebar };
