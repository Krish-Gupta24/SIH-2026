"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Layers,
  Sun,
  Wind,
  Target,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronDown,
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeStepItem = DESIGNER_9_STEPS[currentStep] || DESIGNER_9_STEPS[0];
  const activePhase =
    WORKFLOW_PHASES.find((p) => p.stepIndices.includes(currentStep)) ||
    WORKFLOW_PHASES[0];

  const progressPercent = Math.round(
    ((currentStep + 1) / DESIGNER_9_STEPS.length) * 100
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <nav
      className={`relative z-20 mb-1 rounded-xl border border-border bg-card/95 px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-xs backdrop-blur-xs transition-all ${className}`}
      aria-label="3D Parametric Workflow Stepper"
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Active Stage Selector with Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary transition shadow-xs"
            title="Click to view all stages"
            aria-expanded={dropdownOpen}
          >
            <span className="flex size-4.5 items-center justify-center rounded bg-foreground text-background font-mono text-[9px] font-bold">
              {currentStep + 1}
            </span>
            <span className="font-bold text-foreground text-xs hidden sm:inline">
              {activeStepItem.name}
            </span>
            <span className="text-[10px] text-muted-foreground hidden xl:inline">
              · {activePhase.shortName}
            </span>
            <ChevronDown
              className={`size-3 text-muted-foreground transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Compact Dropdown Popover */}
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 rounded-2xl border border-border bg-card p-2.5 shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/70 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  3D Parametric Workflow
                </span>
                <span className="text-[10px] font-mono font-bold text-muted-foreground">
                  {progressPercent}% Complete
                </span>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5 no-scrollbar">
                {WORKFLOW_PHASES.map((phase) => (
                  <div key={phase.id} className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1.5 pt-1">
                      {phase.name}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {phase.stepIndices.map((idx) => {
                        const s = DESIGNER_9_STEPS[idx];
                        const isCurrent = idx === currentStep;
                        const isDone = idx < currentStep;
                        const StepIcon = s.icon;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              onStepChange(idx);
                              setDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition text-left ${
                              isCurrent
                                ? "bg-foreground text-background font-bold shadow-xs"
                                : isDone
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={`flex size-4 items-center justify-center rounded-sm font-mono text-[9px] font-bold ${
                                  isCurrent
                                    ? "bg-background text-foreground"
                                    : isDone
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {isDone ? "✓" : `0${s.id}`}
                              </span>
                              <StepIcon className="size-3.5 shrink-0 opacity-70" />
                              <span className="truncate">{s.name}</span>
                            </div>
                            <span className="text-[10px] opacity-70 ml-2 shrink-0 hidden sm:inline">
                              {s.shortName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: Clean, Minimal Stage Pills (Evenly distributed, zero horizontal scrolling) */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center max-w-4xl mx-2 lg:mx-4 overflow-hidden">
          {DESIGNER_9_STEPS.map((s) => {
            const isCurrent = currentStep === s.index;
            const isDone = currentStep > s.index;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onStepChange(s.index)}
                className={`group flex items-center justify-center gap-1 rounded-full px-2 py-0.5 lg:px-2.5 lg:py-1 text-xs transition min-w-0 flex-1 max-w-[105px] select-none ${
                  isCurrent
                    ? "bg-foreground text-background font-bold shadow-xs ring-1 ring-foreground/20"
                    : isDone
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground font-medium"
                }`}
                title={`Stage ${s.id}: ${s.name} — ${s.description}`}
              >
                <span className="font-mono text-[10px] font-bold shrink-0">
                  {isDone ? (
                    <Check className="size-3 text-emerald-600 dark:text-emerald-400 inline" />
                  ) : (
                    `0${s.id}`
                  )}
                </span>
                <span className="text-[11px] truncate hidden lg:inline">
                  {s.shortName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Progress Indicator + Prev / Next Controls */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Progress Percent Bar */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-xs"
            title={`${currentStep + 1} of 9 stages (${progressPercent}%)`}
          >
            <div className="h-1.5 w-8 rounded-full bg-border overflow-hidden hidden xl:block">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono text-[10px] font-bold text-muted-foreground">
              {currentStep + 1}/9
            </span>
          </div>

          {/* Compact Prev / Next Group */}
          <div className="flex items-center rounded-full border border-border bg-card p-0.5 shadow-xs">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={() => onStepChange(Math.max(0, currentStep - 1))}
              className="inline-flex items-center justify-center size-6 rounded-full text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition"
              title="Previous stage"
              aria-label="Previous stage"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <div className="h-3 w-px bg-border" />
            <button
              type="button"
              disabled={currentStep === DESIGNER_9_STEPS.length - 1}
              onClick={() =>
                onStepChange(
                  Math.min(DESIGNER_9_STEPS.length - 1, currentStep + 1)
                )
              }
              className={`inline-flex items-center justify-center size-6 rounded-full transition ${
                currentStep < DESIGNER_9_STEPS.length - 1
                  ? "bg-foreground text-background shadow-xs hover:opacity-90 font-bold"
                  : "text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none"
              }`}
              title="Next stage"
              aria-label="Next stage"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
