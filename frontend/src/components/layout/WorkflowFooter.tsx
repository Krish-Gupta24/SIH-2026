"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  RotateCw,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { Status } from "@/components/v0/platform-components";

import {
  type WorkflowStep,
  WORKFLOW_PIPELINE,
  getWorkflowStepIndex,
} from "./workflow-pipeline";

export {
  type WorkflowStep,
  WORKFLOW_PIPELINE,
  getWorkflowStepIndex,
};

interface WorkflowFooterProps {
  customNextHref?: string;
  customNextLabel?: string;
  customNextAction?: () => void;
  isNextLoading?: boolean;
  customPrevHref?: string;
  customPrevLabel?: string;
  customPrevAction?: () => void;
}

export function WorkflowFooter({
  customNextHref,
  customNextLabel,
  customNextAction,
  isNextLoading = false,
  customPrevHref,
  customPrevLabel,
  customPrevAction,
}: WorkflowFooterProps) {
  const pathname = usePathname();
  const { projects, activeProjectId, simulations } = useShelterStore();

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const completedRuns = simulations.filter(
    (s) => s.projectId === activeProject?.id && s.status === "completed"
  );

  // Determine current step index accurately
  const currentIndex = getWorkflowStepIndex(pathname);

  const currentStep = currentIndex !== -1 ? WORKFLOW_PIPELINE[currentIndex] : WORKFLOW_PIPELINE[0];
  const prevStep = currentIndex > 0 ? WORKFLOW_PIPELINE[currentIndex - 1] : null;
  const nextStep = currentIndex < WORKFLOW_PIPELINE.length - 1 ? WORKFLOW_PIPELINE[currentIndex + 1] : null;

  return (
    <div className="mt-14 border-t border-border pt-8 pb-4 print:hidden">
      <div className="flex flex-col gap-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8 shadow-[0_20px_55px_rgba(0,0,0,.04)] sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Previous Step */}
        <div>
          {customPrevAction ? (
            <button
              type="button"
              onClick={customPrevAction}
              className="group inline-flex items-center gap-3 rounded-full border border-black/20 bg-white px-5 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-[#CBDCE6]"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <div className="text-left">
                <p className="micro-label text-[8px] leading-tight">Previous Step</p>
                <p className="font-semibold leading-tight">{customPrevLabel || (prevStep ? prevStep.label : "Back")}</p>
              </div>
            </button>
          ) : prevStep ? (
            <Link
              href={customPrevHref || prevStep.href}
              className="group inline-flex items-center gap-3 rounded-full border border-black/20 bg-white px-5 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-[#CBDCE6]"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <div className="text-left">
                <p className="micro-label text-[8px] leading-tight">Step 0{prevStep.stepNumber}</p>
                <p className="font-semibold leading-tight">{customPrevLabel || prevStep.label}</p>
              </div>
            </Link>
          ) : (
            <div className="px-3 py-1">
              <Status>Origin · Step 01</Status>
            </div>
          )}
        </div>

        {/* Center: Progress & Current Stage Identity */}
        <div className="flex flex-col items-center justify-center text-center gap-1">
          <p className="micro-label">
            Pipeline Stage 0{currentStep.stepNumber} of 0{WORKFLOW_PIPELINE.length}
          </p>
          <h3 className="font-editorial text-xl font-medium tracking-tight text-foreground sm:text-2xl">
            {currentStep.label}
          </h3>
          <p className="max-w-md text-xs text-[#536772]">
            {currentStep.description}
          </p>
        </div>

        {/* Right: Next Step or Action */}
        <div>
          {customNextAction ? (
            <button
              onClick={customNextAction}
              disabled={isNextLoading}
              className="group inline-flex items-center gap-3 rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6E818F] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isNextLoading ? (
                <RotateCw className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5 text-[#CBDCE6]" />
              )}
              <div className="text-left">
                <p className="text-[8px] font-bold uppercase tracking-wider text-[#CBDCE6]">
                  {nextStep ? `Continue to 0${nextStep.stepNumber}` : "Proceed"}
                </p>
                <p className="font-semibold leading-tight">{customNextLabel || (nextStep ? nextStep.label : "Proceed")}</p>
              </div>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : nextStep ? (
            <Link
              href={customNextHref || nextStep.href}
              className="group inline-flex items-center gap-3 rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6E818F]"
            >
              <div className="text-left">
                <p className="text-[8px] font-bold uppercase tracking-wider text-[#CBDCE6]">
                  Next Step 0{nextStep.stepNumber}
                </p>
                <p className="font-semibold leading-tight">{customNextLabel || nextStep.label}</p>
              </div>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <Link
              href="/reports"
              className="group inline-flex items-center gap-3 rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6E818F]"
            >
              <div className="text-left">
                <p className="text-[8px] font-bold uppercase tracking-wider text-[#CBDCE6]">
                  Final Deliverable
                </p>
                <p className="font-semibold leading-tight">Export Certified Report</p>
              </div>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
