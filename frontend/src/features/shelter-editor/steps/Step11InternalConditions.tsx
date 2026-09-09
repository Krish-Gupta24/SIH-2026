import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { Users, Zap, Lightbulb, Flame } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

export function Step11InternalConditions({ form, advancedMode }: StepProps) {
  const { register, watch, formState: { errors } } = form;

  const occupants = watch("internalLoads.occupantsCount") || 0;
  const activityWatts = watch("internalLoads.activityLevelWatts") || 120;
  const lightingWpm2 = watch("internalLoads.lightingPowerDensityWpm2") || 3.0;
  const equipmentWatts = watch("internalLoads.equipmentPowerWatts") || 150;
  const floorArea = (watch("geometry.length") || 6) * (watch("geometry.width") || 4);

  // Total internal heat gain
  const occupantTotalWatts = occupants * activityWatts;
  const lightingTotalWatts = lightingWpm2 * floorArea;
  const totalInternalWatts = occupantTotalWatts + lightingTotalWatts + equipmentWatts;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Internal Heat Gains & Occupancy Loads</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Account for human metabolic heat generation, LED lighting density, and plug load equipment dissipation.
          </p>
        </div>
      </div>

      {/* Internal Heat Generation Summary Card */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 rounded-lg border border-violet-200/60 bg-violet-50/40 p-3.5 dark:border-violet-900/30 dark:bg-violet-950/20">
        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Occupant Heat Gain</span>
          <p className="text-base font-bold text-violet-700 dark:text-violet-300">{occupantTotalWatts} W</p>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Lighting Heat</span>
          <p className="text-base font-bold text-violet-700 dark:text-violet-300">{lightingTotalWatts.toFixed(0)} W</p>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Plug Load Equipment</span>
          <p className="text-base font-bold text-violet-700 dark:text-violet-300">{equipmentWatts} W</p>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Internal Heat</span>
          <p className="text-base font-bold text-violet-700 dark:text-violet-300">
            {totalInternalWatts.toFixed(0)} W <span className="text-xs font-normal">({(totalInternalWatts / 1000).toFixed(2)} kW)</span>
          </p>
        </div>
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
          label="Occupant Activity Metabolic Rate"
          unit="W/person"
          tooltip="Sensible + latent heat emitted per person. Resting = 100W, Office/Seated = 120W, Light manual task = 160W."
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
          tooltip="Average artificial lighting power dissipated per square meter of floor. Modern LED lighting typically 2.5–4.0 W/m²."
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
          tooltip="Continuous electrical heat dissipation from communication radios, medical gear, cooking, and electronics."
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
            tooltip="Temporal distribution profile of human presence and equipment usage."
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
  );
}
