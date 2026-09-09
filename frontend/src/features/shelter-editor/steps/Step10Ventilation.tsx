import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { Wind, Gauge, ShieldAlert } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

export function Step10Ventilation({ form, advancedMode }: StepProps) {
  const { register, watch, formState: { errors } } = form;

  const infiltrationACH = watch("ventilation.infiltrationACH") || 0.5;
  const naturalEnabled = watch("ventilation.naturalVentilationEnabled");
  const mechanicalEnabled = watch("ventilation.mechanicalVentilationEnabled");
  const volume = (watch("geometry.length") || 6) * (watch("geometry.width") || 4) * (watch("geometry.height") || 3);
  const airLeakageFlowLps = ((infiltrationACH * volume * 1000) / 3600).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400">
          <Wind className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Infiltration & Controlled Ventilation</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure envelope airtightness (ACH), passive natural purging, and mechanical heat recovery systems (HRV/ERV).
          </p>
        </div>
      </div>

      {/* Airtightness Gauge */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Infiltration Air Changes</span>
          <p className="text-base font-bold text-cyan-600 dark:text-cyan-400">{infiltrationACH} ACH</p>
          <span className="text-[10px] text-slate-400">Equivalent to {airLeakageFlowLps} L/s unconditioned airflow</span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Airtightness Standard</span>
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {infiltrationACH <= 0.2 ? "Passivhaus / Super-Insulated" : infiltrationACH <= 0.5 ? "Good Construction (NBC 2016)" : "Leaky / High Infiltration Risk"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Ventilation Mode</span>
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {mechanicalEnabled ? "Mechanical HRV" : naturalEnabled ? "Natural Openings" : "Infiltration Only"}
          </p>
        </div>
      </div>

      {infiltrationACH > 0.8 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <span>
            Caution: Infiltration &gt; 0.8 ACH in sub-zero alpine conditions causes extreme sensible heat draft loss, freezing indoor floors and overriding thermal insulation.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldWrapper
          label="Infiltration Rate (Air Changes per Hour)"
          unit="ACH (1/h)"
          tooltip="Air changes per hour at ambient atmospheric pressure through envelope seams, joints, and micro-cracks."
          error={errors.ventilation?.infiltrationACH?.message}
          warning={infiltrationACH < 0.1 ? "Extremely tight (<0.1 ACH) requires mechanical ventilation to prevent CO2 buildup." : undefined}
        >
          <div className="space-y-1">
            <input
              {...register("ventilation.infiltrationACH", { valueAsNumber: true })}
              type="number"
              step="0.05"
              min="0.05"
              max="10.0"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <input
              type="range"
              min="0.05"
              max="3.0"
              step="0.05"
              value={infiltrationACH}
              onChange={(e) => form.setValue("ventilation.infiltrationACH", Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-cyan-600 dark:bg-slate-700"
            />
          </div>
        </FieldWrapper>

        <div className="space-y-3 rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              {...register("ventilation.naturalVentilationEnabled")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700"
            />
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Natural Window Venting Enabled</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Allows occupants to open windows according to schedule for fresh air purge.
              </p>
            </div>
          </label>

          {naturalEnabled && (
            <FieldWrapper label="Natural Venting Schedule" tooltip="Operational schedule governing window openings.">
              <select
                {...register("ventilation.naturalSchedule")}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="DayOnly">Daytime Only (Avoids Night Freezing)</option>
                <option value="TemperatureControlled">Temperature Controlled (Only when T_in &gt; 22°C)</option>
                <option value="NightPurge">Summer Night Purge</option>
                <option value="Always">Continuous Crack Venting</option>
              </select>
            </FieldWrapper>
          )}
        </div>

        <div className="col-span-1 md:col-span-2 space-y-3 rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              {...register("ventilation.mechanicalVentilationEnabled")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700"
            />
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Mechanical Heat Recovery Ventilation (HRV/ERV)</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Continuous fresh air fan supply with cross-flow heat exchanger recovering heat from exhaust air.
              </p>
            </div>
          </label>

          {mechanicalEnabled && (
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <FieldWrapper
                label="Mechanical Airflow Rate"
                unit="L/s"
                tooltip="Supply airflow rate in liters per second (typically 5–10 L/s per occupant per ASHRAE 62.1)."
              >
                <input
                  {...register("ventilation.mechanicalFlowRateLps", { valueAsNumber: true })}
                  type="number"
                  step="1"
                  min="0"
                  max="300"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </FieldWrapper>

              <FieldWrapper
                label="Heat Exchanger Sensible Efficiency"
                unit="%"
                tooltip="Sensible heat exchange efficiency (0.60 to 0.90 for modern high-performance counterflow cores)."
              >
                <input
                  {...register("ventilation.heatRecoveryEfficiency", { valueAsNumber: true })}
                  type="number"
                  step="0.05"
                  min="0.30"
                  max="0.95"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </FieldWrapper>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
