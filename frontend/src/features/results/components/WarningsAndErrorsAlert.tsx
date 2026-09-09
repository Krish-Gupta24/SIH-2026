"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  durationSeconds = 12.4,
  engineName = "EnergyPlus",
  engineVersion = "24.1.0",
  completedAt,
  warnings = [
    "Zone 'LIVING_ZONE' has 2 hours with unmet heating deadband during peak sub-zero night hours (Day 2 at 04:00).",
    "Surface 'WALL_NORTH' thermal boundary condition assigned to exterior ambient with local wind speed modifier 1.15.",
    "Natural infiltration rate 0.35 ACH maintained across simulation run period.",
  ],
  errors = [],
  rawError,
}: WarningsAndErrorsAlertProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasWarnings = warnings && warnings.length > 0;
  const hasErrors = errors && errors.length > 0 || !!rawError;

  return (
    <Card className="border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Status & Engine Provenance */}
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              status === "completed"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : status === "failed"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
            }`}
          >
            {status === "completed" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : status === "failed" ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4 animate-spin" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Simulation Execution Status:
              </span>
              <Badge
                variant={status === "completed" ? "outline" : "secondary"}
                className={`text-[10px] font-mono capitalize ${
                  status === "completed"
                    ? "bg-emerald-950/70 text-emerald-400 border-emerald-700/60"
                    : status === "failed"
                    ? "bg-rose-950/70 text-rose-400 border-rose-700/60"
                    : "bg-amber-950/70 text-amber-400 border-amber-700/60"
                }`}
              >
                {status}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Engine: {engineName} v{engineVersion} · Duration: {durationSeconds}s
              {completedAt && ` · Timestamp: ${completedAt}`}
            </p>
          </div>
        </div>

        {/* Action Toggle for Warnings & Diagnostics */}
        <div className="flex items-center gap-2">
          {hasErrors && (
            <Badge variant="destructive" className="text-[10px] font-semibold">
              {errors.length || 1} Fatal Errors
            </Badge>
          )}

          {hasWarnings && (
            <Badge variant="outline" className="text-[10px] bg-amber-950/50 text-amber-400 border-amber-800/40">
              {warnings.length} Engine Warnings
            </Badge>
          )}

          {!hasWarnings && !hasErrors && (
            <Badge variant="outline" className="text-[10px] bg-emerald-950/50 text-emerald-400 border-emerald-800/40">
              Zero Warnings
            </Badge>
          )}

          {(hasWarnings || hasErrors) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-7 px-2 text-xs text-slate-300 hover:text-white"
            >
              <span>{isOpen ? "Hide Diagnostics" : "View Diagnostics"}</span>
              {isOpen ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Diagnostics Drawer */}
      {isOpen && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3 text-xs">
          {/* Errors Section */}
          {hasErrors && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/30 p-3 text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-400">
                <ShieldAlert className="h-4 w-4" />
                <span>Simulation Exceptions:</span>
              </div>
              {rawError && <p className="font-mono text-[11px]">{rawError}</p>}
              {errors.map((err, i) => (
                <p key={i} className="font-mono text-[11px]">• {err}</p>
              ))}
            </div>
          )}

          {/* Warnings Section */}
          {hasWarnings && (
            <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 text-amber-300 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>EnergyPlus Model Warnings & Convergence Notices:</span>
              </div>
              <ul className="space-y-1 text-[11px] font-mono text-amber-200/90 list-disc list-inside">
                {warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
