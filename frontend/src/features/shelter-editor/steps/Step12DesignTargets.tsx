import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { Target, Thermometer, ShieldCheck } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

export function Step12DesignTargets({ form, advancedMode }: StepProps) {
  const { register, watch, formState: { errors } } = form;

  const minComfort = watch("designTargets.comfortTempMinC");
  const maxComfort = watch("designTargets.comfortTempMaxC");
  const targetPercent = watch("designTargets.targetComfortPercent") || 80;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Design Targets & Comfort Criteria</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define quantitative engineering objectives for thermal comfort boundaries, degree-hours, and allowable heating loads.
          </p>
        </div>
      </div>

      {/* Target Comfort Range Graphic */}
      <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 dark:text-white">Operational Thermal Comfort Band</span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Target: ≥ {targetPercent}% of hours
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="font-semibold text-blue-600 dark:text-blue-400">Underheating &lt; {minComfort}°C</span>
          <span className="rounded bg-emerald-600 px-3 py-1 font-bold text-white shadow-sm">
            Comfort Zone: {minComfort}°C — {maxComfort}°C
          </span>
          <span className="font-semibold text-rose-600 dark:text-rose-400">Overheating &gt; {maxComfort}°C</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldWrapper
          label="Lower Comfort Temperature Boundary"
          unit="°C"
          tooltip="Minimum indoor operative temperature below which underheating degree-hours accumulate (ASHRAE 55 / NBC 2016 Adaptive standard)."
          error={errors.designTargets?.comfortTempMinC?.message}
          warning={minComfort < 16 ? "Target < 16°C poses hypothermia health risks during prolonged occupancy." : undefined}
        >
          <input
            {...register("designTargets.comfortTempMinC", { valueAsNumber: true })}
            type="number"
            step="0.5"
            min="0"
            max="24"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Upper Comfort Temperature Boundary"
          unit="°C"
          tooltip="Maximum indoor operative temperature above which overheating degree-hours accumulate."
          error={errors.designTargets?.comfortTempMaxC?.message}
        >
          <input
            {...register("designTargets.comfortTempMaxC", { valueAsNumber: true })}
            type="number"
            step="0.5"
            min="18"
            max="32"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Target Hours in Comfort Band"
          unit="%"
          tooltip="Minimum acceptable percentage of annual or seasonal simulated hours within the comfort band."
          error={errors.designTargets?.targetComfortPercent?.message}
        >
          <div className="space-y-1">
            <input
              {...register("designTargets.targetComfortPercent", { valueAsNumber: true })}
              type="number"
              step="1"
              min="50"
              max="100"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <input
              type="range"
              min="50"
              max="100"
              step="1"
              value={targetPercent}
              onChange={(e) => form.setValue("designTargets.targetComfortPercent", Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-emerald-600 dark:bg-slate-700"
            />
          </div>
        </FieldWrapper>

        <FieldWrapper
          label="Maximum Allowable Heating Demand"
          unit="kWh/(m²·a)"
          tooltip="Space heating energy intensity cap per square meter of floor area. Passivhaus standard requires <= 15 kWh/(m²·a); alpine shelters typically target <= 120 kWh/(m²·a)."
          error={errors.designTargets?.maxAnnualHeatingDemandKwhM2?.message}
        >
          <input
            {...register("designTargets.maxAnnualHeatingDemandKwhM2", { valueAsNumber: true })}
            type="number"
            step="5"
            min="10"
            max="400"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>
      </div>
    </div>
  );
}
