"use client";

import React from "react";
import { Cpu, Zap, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { OptimizationJobStatus } from "../types";

interface SearchProgressPanelProps {
  job: OptimizationJobStatus;
}

export function SearchProgressPanel({ job }: SearchProgressPanelProps) {
  const isRunning = job.status === "OPTIMIZING" || job.status === "QUEUED";
  const isCompleted = job.status === "COMPLETED";
  const isFailed = job.status === "FAILED";

  const percent = Math.min(100, Math.max(0, Math.round(job.progress_pct)));

  return (
    <div className="rounded-[2rem] border border-border bg-card/80 backdrop-blur-md p-6 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-8 items-center justify-center rounded-xl text-white ${
              isRunning
                ? "bg-amber-500 animate-pulse"
                : isCompleted
                ? "bg-emerald-600"
                : isFailed
                ? "bg-rose-600"
                : "bg-muted-foreground"
            }`}
          >
            {isRunning ? (
              <Activity className="size-4 animate-spin" />
            ) : isCompleted ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">
                {isRunning
                  ? "AI Genetic Search In Progress..."
                  : isCompleted
                  ? "Pareto Optimization Completed"
                  : "Search Error"}
              </h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                Job #{job.job_id.slice(-8)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isRunning
                ? `Evolving generation ${job.current_generation} of ${job.total_generations} using surrogate gradient heuristics.`
                : isCompleted
                ? `Discovered ${job.candidates_count} non-dominated global Pareto candidates in ${job.elapsed_seconds.toFixed(2)}s.`
                : job.error_message || "Encountered an unexpected error during generation."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border">
            <Zap className="size-3.5 text-amber-500" />
            <span className="font-semibold">{job.evaluations_count.toLocaleString()}</span>
            <span className="text-muted-foreground">evaluations</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border">
            <Cpu className="size-3.5 text-emerald-500" />
            <span className="font-semibold">{job.elapsed_seconds.toFixed(2)}s</span>
            <span className="text-muted-foreground">elapsed</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-muted-foreground">
            Progress: {job.current_generation} / {job.total_generations} Generations
          </span>
          <span className="font-mono font-bold">{percent}%</span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden border border-border/50">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isCompleted
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
