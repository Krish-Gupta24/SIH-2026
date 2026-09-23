"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FolderKanban,
  MapPin,
  Box as BoxIcon,
  Compass,
  Layers,
  Home,
  Grid,
  Square,
  DoorOpen,
  Sun,
  Mountain,
  Wind,
  Target,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

import {
  DESIGNER_9_STEPS,
  DESIGNER_13_STEPS,
  WORKFLOW_PHASES,
  type StepItem,
} from "../designer-3d-config";

export { DESIGNER_9_STEPS, DESIGNER_13_STEPS, WORKFLOW_PHASES, type StepItem };

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
  const activePhase = WORKFLOW_PHASES.find((p) => p.stepIndices.includes(currentStep)) || WORKFLOW_PHASES[0];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active pill into view when currentStep changes
  useEffect(() => {
    if (activePillRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const pill = activePillRef.current;
      const pillLeft = pill.offsetLeft;
      const pillWidth = pill.offsetWidth;
      const containerWidth = container.offsetWidth;
      const containerScroll = container.scrollLeft;

      if (pillLeft < containerScroll || pillLeft + pillWidth > containerScroll + containerWidth) {
        container.scrollTo({
          left: pillLeft - containerWidth / 2 + pillWidth / 2,
          behavior: "smooth",
        });
      }
    }
  }, [currentStep]);

  const progressPercent = Math.round(((currentStep + 1) / DESIGNER_13_STEPS.length) * 100);

  return (
    <div className={`designer-3d-steps-nav ${className}`}>
      {/* Header bar: Active Step Info + Prev/Next Controls + Expand Toggle */}
      <div className="steps-nav-header">
        <div className="steps-nav-phase-badge">
          <span className="phase-icon">{activePhase.icon}</span>
          <div className="phase-text">
            <span className="phase-tag">Phase {WORKFLOW_PHASES.indexOf(activePhase) + 1} of 4: {activePhase.name}</span>
            <strong className="step-title">
              Stage {currentStep + 1} of {DESIGNER_9_STEPS.length}: {activeStepItem.name}
              <span className="step-desc-inline"> — {activeStepItem.description}</span>
            </strong>
          </div>
        </div>

        <div className="steps-nav-actions">
          {/* Progress Pill */}
          <div className="steps-nav-progress-badge" title={`${progressPercent}% of ${DESIGNER_9_STEPS.length}-stage sequence complete`}>
            <span className="progress-percent font-mono">{progressPercent}%</span>
            <div className="progress-mini-track">
              <div className="progress-mini-bar" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Prev / Next Buttons */}
          <div className="steps-nav-arrows">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={() => onStepChange(Math.max(0, currentStep - 1))}
              className="steps-nav-arrow-btn"
              title="Previous stage (Ctrl+Left)"
              aria-label="Previous stage"
            >
              <ChevronLeft className="size-4" />
              <span className="arrow-text">Prev</span>
            </button>
            <button
              type="button"
              disabled={currentStep === DESIGNER_13_STEPS.length - 1}
              onClick={() => onStepChange(Math.min(DESIGNER_13_STEPS.length - 1, currentStep + 1))}
              className="steps-nav-arrow-btn highlight"
              title="Next stage (Ctrl+Right)"
              aria-label="Next stage"
            >
              <span className="arrow-text">Next</span>
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Toggle Details Button */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={`steps-nav-toggle-btn ${expanded ? "expanded" : ""}`}
            title={expanded ? "Collapse detailed phases" : "Show all 4 phases & details"}
          >
            <span>{expanded ? "Compact" : "Phases"}</span>
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Phase Cards (if open) */}
      {expanded && (
        <div className="steps-nav-expanded-phases">
          {WORKFLOW_PHASES.map((phase, pIdx) => {
            const isPhaseActive = phase.stepIndices.includes(currentStep);
            const completedCount = phase.stepIndices.filter((idx) => idx < currentStep).length;
            const isPhaseComplete = phase.stepIndices.every((idx) => idx < currentStep);

            return (
              <div
                key={phase.id}
                className={`steps-phase-card ${isPhaseActive ? "active" : ""} ${isPhaseComplete ? "completed" : ""}`}
                onClick={() => {
                  if (!isPhaseActive) {
                    onStepChange(phase.stepIndices[0]);
                  }
                }}
              >
                <div className="phase-card-top">
                  <span className="phase-card-icon">{phase.icon}</span>
                  <div className="phase-card-title">
                    <span className="phase-card-number">Phase {pIdx + 1}</span>
                    <h4>{phase.name}</h4>
                  </div>
                  <span className="phase-card-count">
                    {isPhaseComplete ? (
                      <Check className="size-3 text-emerald-400" />
                    ) : (
                      `${completedCount}/${phase.stepIndices.length}`
                    )}
                  </span>
                </div>
                <p className="phase-card-desc">{phase.description}</p>
                <div className="phase-card-chips">
                  {phase.stepIndices.map((idx) => {
                    const stepItem = DESIGNER_13_STEPS[idx];
                    const isStepActive = idx === currentStep;
                    const isStepDone = idx < currentStep;
                    return (
                      <button
                        key={stepItem.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStepChange(idx);
                        }}
                        className={`phase-step-chip ${isStepActive ? "active" : ""} ${isStepDone ? "done" : ""}`}
                      >
                        <span className="chip-idx">{isStepDone ? "✓" : idx + 1}</span>
                        <span>{stepItem.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 13-Step Scrollable Horizontal Stepper Track */}
      <div className="steps-nav-strip-container" ref={scrollContainerRef}>
        <div className="steps-nav-strip">
          {DESIGNER_13_STEPS.map((stepItem) => {
            const Icon = stepItem.icon;
            const isCurrent = currentStep === stepItem.index;
            const isDone = currentStep > stepItem.index;

            return (
              <button
                key={stepItem.id}
                ref={isCurrent ? activePillRef : null}
                type="button"
                onClick={() => onStepChange(stepItem.index)}
                className={`step-pill ${isCurrent ? "active" : ""} ${isDone ? "done" : ""}`}
                title={`Stage ${stepItem.id}: ${stepItem.name} — ${stepItem.description}`}
              >
                <span className="step-pill-indicator">
                  {isDone ? (
                    <Check className="size-3 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <span className="font-mono text-[10px] font-bold">{String(stepItem.id).padStart(2, "0")}</span>
                  )}
                </span>
                <Icon className="size-3.5 step-pill-icon" />
                <span className="step-pill-name">{stepItem.name}</span>
                {isCurrent && <span className="step-active-dot" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
