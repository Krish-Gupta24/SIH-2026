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

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  label: string;
  href: string;
  description: string;
}

export const WORKFLOW_PIPELINE: WorkflowStep[] = [
  {
    id: "overview",
    stepNumber: 1,
    label: "Overview",
    href: "/dashboard",
    description: "Canonical model readiness and core thermal metrics",
  },
  {
    id: "climate",
    stepNumber: 2,
    label: "Climate & Site",
    href: "/weather",
    description: "Leh Ladakh extreme cold weather dataset & authentic EPW",
  },
  {
    id: "designer",
    stepNumber: 3,
    label: "2D Designer",
    href: "/designer",
    description: "13-stage engineering envelope & assembly specification",
  },
  {
    id: "3d",
    stepNumber: 4,
    label: "3D CAD",
    href: "/designer/3d",
    description: "Spatial massing, solar orientation & mesh raycast inspector",
  },
  {
    id: "simulate",
    stepNumber: 5,
    label: "Simulate",
    href: "/simulations",
    description: "Physics-based EnergyPlus heat balance calculation",
  },
  {
    id: "results",
    stepNumber: 6,
    label: "Results",
    href: "/results",
    description: "Hourly operative temperatures, comfort hours & heat flow",
  },
  {
    id: "optimize",
    stepNumber: 7,
    label: "Optimize",
    href: "/optimization",
    description: "Parametric envelope sweep & Pareto optimal recommendations",
  },
  {
    id: "compare",
    stepNumber: 8,
    label: "Compare",
    href: "/comparison",
    description: "Side-by-side benchmark of design alternatives",
  },
  {
    id: "report",
    stepNumber: 9,
    label: "Certified Report",
    href: "/reports",
    description: "Official defense engineering audit & export package",
  },
];

/**
 * Determines the exact matching pipeline step index for a given URL path.
 * Avoids prefix collisions (such as /designer matching /designer/3d).
 */
export function getWorkflowStepIndex(pathname: string): number {
  if (pathname === "/dashboard" || pathname === "/") return 0;
  // Match exact path first
  const exactIdx = WORKFLOW_PIPELINE.findIndex((s) => s.href === pathname);
  if (exactIdx !== -1) return exactIdx;

  // Otherwise, match longest prefix (e.g. /designer/3d matches before /designer)
  let bestIdx = -1;
  let maxLen = 0;
  WORKFLOW_PIPELINE.forEach((step, idx) => {
    if (step.href !== "/dashboard" && (pathname === step.href || pathname.startsWith(step.href + "/"))) {
      if (step.href.length > maxLen) {
        maxLen = step.href.length;
        bestIdx = idx;
      }
    }
  });
  return bestIdx !== -1 ? bestIdx : 0;
}

interface WorkflowFooterProps {
  customNextHref?: string;
  customNextLabel?: string;
  customNextAction?: () => void;
  isNextLoading?: boolean;
}

export function WorkflowFooter({
  customNextHref,
  customNextLabel,
  customNextAction,
  isNextLoading = false,
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
          {prevStep ? (
            <Link
              href={prevStep.href}
              className="group inline-flex items-center gap-3 rounded-full border border-black/20 bg-white px-5 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-[#CBDCE6]"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <div className="text-left">
                <p className="micro-label text-[8px] leading-tight">Step 0{prevStep.stepNumber}</p>
                <p className="font-semibold leading-tight">{prevStep.label}</p>
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
