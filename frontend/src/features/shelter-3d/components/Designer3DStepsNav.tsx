"use client";

import React, { useState } from "react";
import {
  Layers,
  Sun,
  Wind,
  Target,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  DESIGNER_9_STEPS,
  DESIGNER_13_STEPS,
  WORKFLOW_PHASES,
  type StepItem,
} from "../designer-3d-config";

export { DESIGNER_9_STEPS, DESIGNER_13_STEPS, WORKFLOW_PHASES, type StepItem };

const PHASE_ICONS: Record<string, React.ElementType> = {
  envelope: Layers,
  apertures: Sun,
  climate: Wind,
  performance: Target,
};

interface Designer3DStepsNavProps {
  currentStep: number; // 0-indexed (0 to 8)
  onStepChange: (newStep: number) => void;
  className?: string;
}

export function Designer3DStepsNav({
  currentStep,
  onStepChange,
  className = "",
}: Designer3DStepsNavProps) {
  const [expanded, setExpanded] = useState(false);
  const activeStepItem = DESIGNER_9_STEPS[currentStep] || DESIGNER_9_STEPS[0];
  const activePhaseIndex = WORKFLOW_PHASES.findIndex((p) =>
    p.stepIndices.includes(currentStep)
  );
  const activePhase = WORKFLOW_PHASES[activePhaseIndex] || WORKFLOW_PHASES[0];
  const ActivePhaseIcon = PHASE_ICONS[activePhase.id] || Layers;

  const progressPercent = Math.round(
    ((currentStep + 1) / DESIGNER_9_STEPS.length) * 100
  );

  return (
    <nav
      className={`rounded-2xl border border-border bg-card p-2.5 sm:p-3 shadow-xs mb-2 transition-all ${className}`}
      aria-label="3D Parametric Workflow Stepper"
    >
      {/* Header bar: Active Step Info + Prev/Next Controls + Expand Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-border/70">
        {/* Left: Active Stage & Phase Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/70 text-foreground shadow-xs"
            title={`Phase ${activePhaseIndex + 1} of 4: ${activePhase.name}`}
          >
            <ActivePhaseIcon className="size-4 text-foreground" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                Phase {activePhaseIndex + 1} of 4 · {activePhase.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <h2 className="text-xs sm:text-sm font-bold text-foreground truncate m-0">
                Stage {currentStep + 1} of {DESIGNER_9_STEPS.length}: {activeStepItem.name}
              </h2>
              <span className="text-xs text-muted-foreground hidden lg:inline truncate">
                — {activeStepItem.description}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Progress Badge + Prev/Next Navigation + Phase Overview Toggle */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {/* Progress Pill */}
          <div
            className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs"
            title={`${progressPercent}% of 9-stage sequence complete`}
          >
            <span className="font-mono text-[11px] font-bold text-foreground">
              {progressPercent}%
            </span>
            <div className="h-1.5 w-12 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Prev / Next Controls */}
          <div className="flex items-center rounded-full border border-border bg-card p-0.5 shadow-xs">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={() => onStepChange(Math.max(0, currentStep - 1))}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition"
              title="Previous stage"
              aria-label="Previous stage"
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <div className="h-3.5 w-px bg-border" />
            <button
              type="button"
              disabled={currentStep === DESIGNER_9_STEPS.length - 1}
              onClick={() =>
                onStepChange(
                  Math.min(DESIGNER_9_STEPS.length - 1, currentStep + 1)
                )
              }
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                currentStep < DESIGNER_9_STEPS.length - 1
                  ? "bg-foreground text-background shadow-xs hover:opacity-90 font-bold"
                  : "text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none"
              }`}
              title="Next stage"
              aria-label="Next stage"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          {/* Toggle Overview Button */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-xs transition ${
              expanded
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            title={expanded ? "Hide phase overview" : "Show all 4 phases & stage overview"}
          >
            <span>{expanded ? "Hide Overview" : "Phases Overview"}</span>
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Phase Cards Deck (if toggled) */}
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2.5 pb-2 border-b border-border/70 animate-in fade-in slide-in-from-top-1">
          {WORKFLOW_PHASES.map((phase, pIdx) => {
            const isPhaseActive = phase.stepIndices.includes(currentStep);
            const completedCount = phase.stepIndices.filter(
              (idx) => idx < currentStep
            ).length;
            const isPhaseComplete = phase.stepIndices.every(
              (idx) => idx < currentStep
            );
            const PhaseCardIcon = PHASE_ICONS[phase.id] || Layers;

            return (
              <div
                key={phase.id}
                onClick={() => onStepChange(phase.stepIndices[0])}
                className={`rounded-xl border p-2.5 cursor-pointer transition flex flex-col justify-between ${
                  isPhaseActive
                    ? "border-foreground/40 bg-secondary/50 shadow-xs ring-1 ring-foreground/20"
                    : isPhaseComplete
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                    : "border-border bg-card hover:border-foreground/20 hover:bg-secondary/20"
                }`}
                title={`Jump to Phase ${pIdx + 1}: ${phase.name}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <PhaseCardIcon className="size-3.5 text-muted-foreground" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Phase {pIdx + 1}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-secondary text-foreground">
                      {isPhaseComplete ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <Check className="size-3" /> Done
                        </span>
                      ) : (
                        `${completedCount}/${phase.stepIndices.length}`
                      )}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-0.5">{phase.name}</h3>
                  <p className="text-[11px] text-muted-foreground leading-snug mb-2 line-clamp-2">
                    {phase.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                  {phase.stepIndices.map((idx) => {
                    const s = DESIGNER_9_STEPS[idx];
                    const isStepActive = idx === currentStep;
                    const isStepDone = idx < currentStep;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStepChange(idx);
                        }}
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition ${
                          isStepActive
                            ? "bg-foreground text-background font-bold shadow-xs"
                            : isStepDone
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                        title={`Stage ${s.id}: ${s.name}`}
                      >
                        <span>{isStepDone ? "✓" : `0${s.id}`}</span>
                        <span>{s.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 9-Step Full-Width Responsive Stepper Ribbon */}
      <div className="w-full pt-2">
        <div
          className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1 sm:gap-1.5 w-full"
          role="tablist"
          aria-label="3D Parametric 9-Stage Sequence"
        >
          {DESIGNER_9_STEPS.map((s) => {
            const isCurrent = currentStep === s.index;
            const isDone = currentStep > s.index;
            const StepIcon = s.icon;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onStepChange(s.index)}
                className={`group relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl py-2 px-1 text-center transition ${
                  isCurrent
                    ? "bg-foreground text-background shadow-xs ring-2 ring-foreground/20 font-bold scale-[1.01]"
                    : isDone
                    ? "border border-emerald-500/30 bg-emerald-500/5 text-foreground hover:bg-emerald-500/10 font-semibold"
                    : "border border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground font-medium"
                }`}
                title={`Stage ${s.id}: ${s.name} — ${s.description} (${
                  isDone ? "Completed" : isCurrent ? "Active" : "Upcoming"
                })`}
              >
                <span
                  className={`font-mono text-[10px] font-bold ${
                    isCurrent
                      ? "text-background"
                      : isDone
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {isDone ? "✓" : `0${s.id}`}
                </span>
                <StepIcon className="size-3.5 hidden md:inline shrink-0" />
                <span className="text-[11px] truncate hidden sm:inline">
                  {s.name}
                </span>
                {isCurrent && (
                  <span className="size-1 rounded-full bg-sky-400 absolute top-1 right-1 sm:hidden" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
