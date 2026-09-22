import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { Cpu, Play, CheckCircle2, FileCheck } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

export function Step13SimulationSettings({ form, advancedMode }: StepProps) {
  const { register, watch, formState: { errors } } = form;

  const engine = watch("simulationSettings.engine");
  const runDays = watch("simulationSettings.runPeriodDays");
  const timesteps = watch("simulationSettings.timestepsPerHour");

  // Summary data for pre-flight check
  const projectName = watch("project.name");
  const length = watch("geometry.length");
  const width = watch("geometry.width");
  const height = watch("geometry.height");
  const roofType = watch("geometry.roofType");
  const winCount = (watch("windows") || []).length;
  const doorCount = (watch("doors") || []).length;
  const region = watch("location.region");
  const ach = watch("ventilation.infiltrationACH");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
          <Cpu className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Simulation Engine & Execution Parameters</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select the physics engine, calculation resolution, and time horizon before generating simulation input files.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FieldWrapper
          label="Simulation Engine"
          tooltip="Integrated Conduction, Convection & Solar Radiation Thermal Solver configured for high-altitude shelters."
          error={errors.simulationSettings?.engine?.message}
        >
          <select
            {...register("simulationSettings.engine")}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="EnergyPlus">ThermoShelter Integrated Solver (High-Altitude Finite Difference)</option>
            <option value="ANSYS">ANSYS Parametric Deck Export Mode</option>
          </select>
        </FieldWrapper>

        <FieldWrapper
          label="Timesteps Per Hour"
          unit="Steps/h"
          tooltip="Calculation frequency for transient conduction finite difference solver. 4 timesteps = 15 minute increments."
          error={errors.simulationSettings?.timestepsPerHour?.message}
        >
          <select
            {...register("simulationSettings.timestepsPerHour", { valueAsNumber: true })}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value={1}>1 Timestep/hour (Hourly)</option>
            <option value={4}>4 Timesteps/hour (15-minute resolution - Recommended)</option>
            <option value={6}>6 Timesteps/hour (10-minute resolution)</option>
            <option value={12}>12 Timesteps/hour (5-minute resolution)</option>
          </select>
        </FieldWrapper>

        <FieldWrapper
          label="Simulation Run Horizon"
          unit="Days"
          tooltip="Duration of weather run period. Short multiday runs (1–7 days) validate geometry; annual runs (365 days) compute seasonal demand."
          error={errors.simulationSettings?.runPeriodDays?.message}
        >
          <select
            {...register("simulationSettings.runPeriodDays", { valueAsNumber: true })}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value={1}>1 Day (Quick Pre-flight Diagnostic)</option>
            <option value={3}>3 Days (Controlled Winter Peak Period)</option>
            <option value={7}>7 Days (1 Week Thermal Response)</option>
            <option value={30}>30 Days (Full Month Cold Cycle)</option>
            <option value={365}>365 Days (Full Annual Simulation)</option>
          </select>
        </FieldWrapper>

        <FieldWrapper label="Start Month" unit="Month (1-12)" tooltip="Calendar starting month.">
          <input
            {...register("simulationSettings.startMonth", { valueAsNumber: true })}
            type="number"
            min="1"
            max="12"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper label="Start Day" unit="Day (1-31)" tooltip="Calendar starting day.">
          <input
            {...register("simulationSettings.startDay", { valueAsNumber: true })}
            type="number"
            min="1"
            max="31"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <div className="flex items-center pt-6">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              {...register("simulationSettings.detailedComponentOutputs")}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
            />
            Request Detailed Component Conduction & Solar Breakdown
          </label>
        </div>
      </div>

      {/* Pre-Flight Design Review Panel */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
          <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Pre-Flight Engineering Summary & Model Checklist
          </h4>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Design Name:</span>
            <p className="font-semibold text-slate-900 dark:text-white truncate">{projectName}</p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Dimensions (L×W×H):</span>
            <p className="font-semibold text-slate-900 dark:text-white">{length}m × {width}m × {height}m</p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Roof Profile:</span>
            <p className="font-semibold text-slate-900 dark:text-white">{roofType}</p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Location:</span>
            <p className="font-semibold text-slate-900 dark:text-white truncate">{region}</p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Windows:</span>
            <p className="font-semibold text-slate-900 dark:text-white">{winCount} Openings</p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Doors:</span>
            <p className="font-semibold text-slate-900 dark:text-white">{doorCount} Doors</p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Infiltration:</span>
            <p className="font-semibold text-slate-900 dark:text-white">{ach} ACH</p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Engine & Steps:</span>
            <p className="font-semibold text-slate-900 dark:text-white">{engine === "EnergyPlus" ? "ThermoShelter Core" : engine} ({timesteps * 24 * runDays} Timesteps)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
