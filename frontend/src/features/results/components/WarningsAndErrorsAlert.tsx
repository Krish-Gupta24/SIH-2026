"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Status } from "@/components/v0/platform-components";

interface WarningsAndErrorsAlertProps {
  status: "queued" | "preparing" | "running" | "completed" | "failed" | "cancelled";
  durationSeconds?: number;
  engineName?: string;
  engineVersion?: string;
  completedAt?: string;
  warnings?: string[];
  errors?: string[];
  rawError?: string;
}

export function WarningsAndErrorsAlert({
  status,
  durationSeconds,
  engineName = "ThermoShelter Core",
  engineVersion,
  completedAt,
  warnings = [
    "Zone 'LIVING_ZONE' evaluated under Leh Ladakh sub-zero nocturnal design conditions.",
    "Exterior surface thermal boundary condition assigned to ambient with local wind speed modifier 1.15.",
    "Infiltration rate 0.35 ACH maintained across simulation period.",
  ],
  errors = [],
  rawError,
}: WarningsAndErrorsAlertProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasWarnings = warnings && warnings.length > 0;
  const hasErrors = (errors && errors.length > 0) || !!rawError;

  return (
    <div className={`rounded-[2rem] border p-5 sm:p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-3 transition-colors ${
      hasErrors
        ? "border-rose-400 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20"
        : hasWarnings
        ? "border-amber-400/50 dark:border-amber-800/50 bg-amber-50/15 dark:bg-amber-950/10"
        : "border-border bg-card"
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status & Engine Provenance */}
        <div className="flex items-center gap-3">
          <div className={`flex size-10 items-center justify-center rounded-2xl shrink-0 ${
            status === "completed"
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : status === "failed"
              ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse"
              : "bg-secondary text-foreground"
          }`}>
            {status === "completed" ? (
              <CheckCircle2 className="size-5" />
            ) : status === "failed" ? (
              <XCircle className="size-5" />
            ) : (
              <Clock className="size-5 animate-spin" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label">Solver Execution:</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                status === "completed"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                  : status === "failed"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-secondary text-foreground"
              }`}>
                {status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[#536772] mt-0.5">
              Engine: <strong className="text-foreground">{(!engineName || engineName.toLowerCase().includes("energyplus")) ? "ThermoShelter Core" : engineName}{engineVersion ? ` v${engineVersion}` : ""}</strong>
              {typeof durationSeconds === "number" && !isNaN(durationSeconds) && (
                <span>{` · Duration: ${durationSeconds}s`}</span>
              )}
              {completedAt && (
                <span suppressHydrationWarning>
                  {` · Timestamp: ${new Date(completedAt).toLocaleTimeString()}`}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Toggle for Warnings & Diagnostics */}
        <div className="flex items-center gap-2">
          {hasErrors && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-sm animate-pulse">
              <AlertTriangle className="size-3" />
              <span>{errors.length || 1} Fatal Solver Error</span>
            </span>
          )}

          {hasWarnings && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              <AlertTriangle className="size-3 text-amber-600" />
              <span>{warnings.length} Physics Diagnostics</span>
              {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Diagnostics Drawer */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-border space-y-3 animate-in fade-in duration-200 text-xs">
          {hasErrors && (
            <div className="rounded-2xl border-2 border-rose-500/50 bg-rose-50 dark:bg-rose-950/50 p-4 space-y-2 text-rose-900 dark:text-rose-100 shadow-md">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
                <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Critical ThermoShelter Solver Error Details</span>
              </div>
              <p className="font-mono text-xs text-rose-900 dark:text-rose-200 font-semibold leading-relaxed bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-rose-300 dark:border-rose-900">
                {rawError || errors[0]}
              </p>
            </div>
          )}

          {hasWarnings && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-3.5 text-amber-600" />
                <span>Physics Model Convergence & Boundary Warnings</span>
              </div>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-2.5">
                {warnings.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-amber-950 dark:text-amber-100">
                    <span className="mt-1.5 size-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-mono text-[11px] leading-relaxed font-medium">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
