import React, { useState } from "react";
import { ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import {
  Wind,
  Users,
  ShieldAlert,
  Zap,
  Lightbulb,
  Fan,
  Activity,
  Gauge,
  Sliders,
  Sparkles,
} from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

export function Step7IndoorClimate({ form, advancedMode }: StepProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const [activeTab, setActiveTab] = useState<"all" | "ventilation" | "gains">("all");

  // Ventilation values
  const infiltrationACH = watch("ventilation.infiltrationACH") || 0.5;
  const naturalEnabled = watch("ventilation.naturalVentilationEnabled");
  const mechanicalEnabled = watch("ventilation.mechanicalVentilationEnabled");
  const heatRecoveryEff = watch("ventilation.heatRecoveryEfficiency") ?? 0.75;
  const mechanicalFlowLps = watch("ventilation.mechanicalFlowRateLps") ?? 25;

  // Geometry for derived volume and floor area
  const length = watch("geometry.length") || 6;
  const width = watch("geometry.width") || 4;
  const height = watch("geometry.height") || 3;
  const volume = length * width * height;
  const floorArea = length * width;

  // Airflow math
  const airLeakageFlowLps = ((infiltrationACH * volume * 1000) / 3600).toFixed(1);

  // Internal Gains values
  const occupants = watch("internalLoads.occupantsCount") || 0;
  const activityWatts = watch("internalLoads.activityLevelWatts") || 120;
  const lightingWpm2 = watch("internalLoads.lightingPowerDensityWpm2") || 3.0;
  const equipmentWatts = watch("internalLoads.equipmentPowerWatts") || 150;

  // Total internal heat gain
  const occupantTotalWatts = occupants * activityWatts;
  const lightingTotalWatts = lightingWpm2 * floorArea;
  const totalInternalWatts = occupantTotalWatts + lightingTotalWatts + equipmentWatts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100/70 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400">
            <Wind className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Indoor Climate: Ventilation & Internal Heat Gains
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Control fresh air infiltration, mechanical HRV heat recovery, human occupancy metabolic loads, and equipment dissipation.
            </p>
          </div>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            All Controls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ventilation")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === "ventilation"
                ? "bg-cyan-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Wind className="h-3.5 w-3.5" />
            Ventilation & HRV
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gains")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === "gains"
                ? "bg-violet-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Internal Gains
          </button>
        </div>
      </div>

      {/* Live Engineering Metrics Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-cyan-200/60 bg-cyan-50/40 p-3 dark:border-cyan-900/40 dark:bg-cyan-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Infiltration Rate</span>
            <Gauge className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="mt-1 text-base font-bold text-cyan-700 dark:text-cyan-300">
            {infiltrationACH} <span className="text-xs font-medium">ACH</span>
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {airLeakageFlowLps} L/s uncontrolled draft
          </span>
        </div>

        <div className="rounded-xl border border-cyan-200/60 bg-cyan-50/40 p-3 dark:border-cyan-900/40 dark:bg-cyan-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Ventilation Core</span>
            <Fan className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="mt-1 text-base font-bold text-slate-900 dark:text-white truncate">
            {mechanicalEnabled ? `HRV (${Math.round(heatRecoveryEff * 100)}% Eff)` : naturalEnabled ? "Natural Venting" : "Passive Envelope"}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {mechanicalEnabled ? `${mechanicalFlowLps} L/s fresh airflow` : "Air changes by pressure"}
          </span>
        </div>

        <div className="rounded-xl border border-violet-200/60 bg-violet-50/40 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Occupants & Activity</span>
            <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="mt-1 text-base font-bold text-violet-700 dark:text-violet-300">
            {occupants} <span className="text-xs font-medium">pers ({occupantTotalWatts} W)</span>
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {activityWatts} W/person metabolic rate
          </span>
        </div>

        <div className="rounded-xl border border-violet-200/60 bg-violet-50/40 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Internal Heat</span>
            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="mt-1 text-base font-bold text-violet-700 dark:text-violet-300">
            {totalInternalWatts.toFixed(0)} <span className="text-xs font-medium">W</span>
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            +{(totalInternalWatts / 1000).toFixed(2)} kW thermal gain
          </span>
        </div>
      </div>

      {/* Sub-Zero High Infiltration Alert */}
      {infiltrationACH > 0.8 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <span>
            <strong>Alpine Risk Notice:</strong> Envelope infiltration &gt; 0.8 ACH in freezing conditions creates severe cold drafts, rapidly exhausting interior sensible heat and increasing nighttime freeze risk.
          </span>
        </div>
      )}

      {/* SECTION 1: Infiltration & Controlled Ventilation */}
      {(activeTab === "all" || activeTab === "ventilation") && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300 text-xs font-bold">
                1
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Envelope Airtightness & Fresh Air Ventilation
              </h4>
            </div>
            <span className="rounded-full bg-cyan-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
              {infiltrationACH <= 0.2 ? "Passivhaus Airtight" : infiltrationACH <= 0.5 ? "NBC 2016 Compliant" : "High Leakage"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldWrapper
              label="Envelope Infiltration Rate"
              unit="ACH (1/h)"
              tooltip="Air changes per hour at normal atmospheric pressure through envelope joints, seams, and perimeter seals."
              error={errors.ventilation?.infiltrationACH?.message}
              warning={infiltrationACH < 0.1 ? "Extremely tight (<0.1 ACH) requires mechanical ventilation to prevent CO2 buildup." : undefined}
            >
              <div className="space-y-2">
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
                  max="2.5"
                  step="0.05"
                  value={infiltrationACH}
                  onChange={(e) => setValue("ventilation.infiltrationACH", Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-cyan-600 dark:bg-slate-700"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0.05 (Passivhaus)</span>
                  <span>0.50 (Standard)</span>
                  <span>1.5+ (Leaky)</span>
                </div>
              </div>
            </FieldWrapper>

            <div className="space-y-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  {...register("ventilation.naturalVentilationEnabled")}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Natural Window Venting Enabled
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Allows occupants to purge indoor air through operable windows according to set criteria.
                  </p>
                </div>
              </label>

              {naturalEnabled && (
                <FieldWrapper label="Natural Venting Schedule" tooltip="Operational schedule governing window openings.">
                  <select
                    {...register("ventilation.naturalSchedule")}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="DayOnly">Daytime Only (Prevents Night Freezing)</option>
                    <option value="TemperatureControlled">Temperature Controlled (Only when T_in &gt; 22°C)</option>
                    <option value="NightPurge">Summer Night Purge</option>
                    <option value="Always">Continuous Micro-Crack Venting</option>
                  </select>
                </FieldWrapper>
              )}
            </div>

            {/* Mechanical Ventilation Sub-Card */}
            <div className="col-span-1 md:col-span-2 space-y-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  {...register("ventilation.mechanicalVentilationEnabled")}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Mechanical Heat Recovery Ventilation (HRV / ERV)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Fan-forced balanced ventilation system with counter-flow heat exchanger recovering sensible heat from exhaust air.
                  </p>
                </div>
              </label>

              {mechanicalEnabled && (
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <FieldWrapper
                    label="Mechanical Airflow Rate"
                    unit="L/s"
                    tooltip="Supply airflow rate (ASHRAE 62.1 recommends ~5–10 L/s per occupant)."
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
                    label="HRV Sensible Recovery Efficiency"
                    unit="%"
                    tooltip="Fraction of sensible heat transferred from exhaust air to incoming fresh supply (typically 0.65–0.90)."
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
      )}

      {/* SECTION 2: Internal Heat Gains & Occupancy Loads */}
      {(activeTab === "all" || activeTab === "gains") && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 text-xs font-bold">
                2
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Internal Heat Gains & Occupancy Dissipation
              </h4>
            </div>
            <span className="rounded-full bg-violet-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-300">
              {(totalInternalWatts / 1000).toFixed(2)} kW Base Dissipation
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldWrapper
              label="Design Occupancy Count"
              unit="Persons"
              tooltip="Maximum concurrent human occupants inside the shelter zone."
              error={errors.internalLoads?.occupantsCount?.message}
            >
              <input
                {...register("internalLoads.occupantsCount", { valueAsNumber: true })}
                type="number"
                step="1"
                min="0"
                max="50"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </FieldWrapper>

            <FieldWrapper
              label="Occupant Metabolic Activity Rate"
              unit="W/person"
              tooltip="Sensible + latent heat emitted per person. Resting = 100W, Sedentary = 115W, Active = 140–180W."
              error={errors.internalLoads?.activityLevelWatts?.message}
            >
              <select
                {...register("internalLoads.activityLevelWatts", { valueAsNumber: true })}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value={100}>Sleeping / Reclining (100 W/person)</option>
                <option value={115}>Seated / Sedentary (115 W/person)</option>
                <option value={140}>Moderate Light Activity (140 W/person)</option>
                <option value={180}>Heavy Work / Emergency Readiness (180 W/person)</option>
              </select>
            </FieldWrapper>

            <FieldWrapper
              label="Lighting Power Density"
              unit="W/m²"
              tooltip={`Average artificial lighting power dissipated per square meter of floor. Total lighting load = ${lightingTotalWatts.toFixed(0)} W.`}
              error={errors.internalLoads?.lightingPowerDensityWpm2?.message}
            >
              <input
                {...register("internalLoads.lightingPowerDensityWpm2", { valueAsNumber: true })}
                type="number"
                step="0.2"
                min="0"
                max="25"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </FieldWrapper>

            <FieldWrapper
              label="Equipment & Appliance Plug Loads"
              unit="W"
              tooltip="Continuous electrical heat dissipation from communication equipment, medical gear, computers, and appliances."
              error={errors.internalLoads?.equipmentPowerWatts?.message}
            >
              <input
                {...register("internalLoads.equipmentPowerWatts", { valueAsNumber: true })}
                type="number"
                step="10"
                min="0"
                max="5000"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </FieldWrapper>

            <div className="col-span-1 md:col-span-2">
              <FieldWrapper
                label="Occupancy & Operational Schedule"
                tooltip="Temporal distribution profile of human presence and equipment operation."
              >
                <select
                  {...register("internalLoads.scheduleProfile")}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="DiurnalOccupied">Diurnal (Occupied 08:00 to 22:00, sleep mode at night)</option>
                  <option value="Continuous">Continuous 24/7 (Emergency outpost / hospital station)</option>
                  <option value="Intermittent">Intermittent / Patrol Outpost (4 hours day, 4 hours evening)</option>
                </select>
              </FieldWrapper>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
