import React from "react";
import { Info, AlertTriangle } from "lucide-react";

interface FieldWrapperProps {
  label: string;
  unit?: string;
  tooltip?: string;
  error?: string;
  warning?: string;
  description?: string;
  isAdvanced?: boolean;
  children: React.ReactNode;
}

export function FieldWrapper({
  label,
  unit,
  tooltip,
  error,
  warning,
  description,
  isAdvanced,
  children,
}: FieldWrapperProps) {
  return (
    <div className={`space-y-1.5 ${isAdvanced ? "rounded-md border border-amber-500/20 bg-amber-500/5 p-3" : ""}`}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <span>{label}</span>
          {unit && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {unit}
            </span>
          )}
          {tooltip && (
            <span className="group relative cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Info className="h-3.5 w-3.5" />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-48 -translate-x-1/2 rounded bg-slate-900 px-2.5 py-1.5 text-[11px] leading-tight text-white shadow-lg group-hover:block dark:bg-slate-800">
                {tooltip}
              </span>
            </span>
          )}
        </label>
        {isAdvanced && (
          <span className="text-[10px] font-medium tracking-wide uppercase text-amber-600 dark:text-amber-400">
            Advanced
          </span>
        )}
      </div>

      {description && <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>}

      <div className="relative">{children}</div>

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">
          <AlertTriangle className="size-3 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {warning && !error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-3 shrink-0 text-amber-600" />
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
}
