import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { MapPin, Compass } from "lucide-react";

interface StepProps {
  form: ShelterFormReturn;
  advancedMode: boolean;
}

const REGION_PRESETS = [
  {
    name: "Leh, Ladakh (3500m)",
    latitude: 34.1526,
    longitude: 77.5771,
    elevation: 3500.0,
    region: "Leh Ladakh, India",
    climateZone: "Cold / Extreme Alpine",
    weatherSource: "IND_JK_Leh.427053_TMYx.epw",
    designWinter: -20.0,
    designSummer: 28.0,
  },
  {
    name: "Dras, Kargil (3280m - Second Coldest Inhabited)",
    latitude: 34.4300,
    longitude: 75.7500,
    elevation: 3280.0,
    region: "Dras, Kargil, India",
    climateZone: "Sub-Arctic Continental",
    weatherSource: "dras_kargil.epw",
    designWinter: -35.0,
    designSummer: 24.0,
  },
  {
    name: "Spiti Valley, HP (3800m)",
    latitude: 32.2460,
    longitude: 78.0340,
    elevation: 3800.0,
    region: "Kaza, Spiti Valley, India",
    climateZone: "Cold Desert",
    weatherSource: "spiti_valley.epw",
    designWinter: -25.0,
    designSummer: 22.0,
  },
  {
    name: "Tawang, Arunachal Pradesh (3048m)",
    latitude: 27.5860,
    longitude: 91.8650,
    elevation: 3048.0,
    region: "Tawang, Arunachal, India",
    climateZone: "Montane Temperate",
    weatherSource: "tawang.epw",
    designWinter: -10.0,
    designSummer: 20.0,
  },
];

export function Step2Location({ form, advancedMode }: StepProps) {
  const { register, formState: { errors }, setValue, watch } = form;
  const currentElevation = watch("location.elevation");

  const applyPreset = (preset: typeof REGION_PRESETS[0]) => {
    setValue("location.latitude", preset.latitude);
    setValue("location.longitude", preset.longitude);
    setValue("location.elevation", preset.elevation);
    setValue("location.region", preset.region);
    setValue("location.climateZone", preset.climateZone);
    setValue("location.weatherSource", preset.weatherSource);
    setValue("location.designTempWinter", preset.designWinter);
    setValue("location.designTempSummer", preset.designSummer);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Geographic & Climate Boundary</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select high-altitude cold-climate presets or specify precise geographic coordinates and solar parameters.
          </p>
        </div>
      </div>

      {/* Preset Quick Select */}
      <div>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          High-Altitude Regional Presets
        </label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {REGION_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className="flex flex-col rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-left transition hover:border-emerald-500 hover:bg-emerald-50/30 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-emerald-500"
            >
              <span className="text-xs font-semibold text-slate-900 dark:text-white">{preset.name}</span>
              <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {preset.elevation} m | {preset.climateZone}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FieldWrapper
          label="Region / Site Designation"
          tooltip="Descriptive name of the geographic deployment area."
          error={errors.location?.region?.message}
        >
          <input
            {...register("location.region")}
            type="text"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Climate Zone"
          tooltip="ASHRAE 90.1 / NBC 2016 climatic classification."
          error={errors.location?.climateZone?.message}
        >
          <input
            {...register("location.climateZone")}
            type="text"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Elevation Above Sea Level"
          unit="m"
          tooltip="Directly influences atmospheric pressure and air density (reducing convective heat transfer coefficient)."
          error={errors.location?.elevation?.message}
          warning={currentElevation > 4500 ? "Extreme altitude (>4500m): Low air density significantly diminishes convective transfer." : undefined}
        >
          <input
            {...register("location.elevation", { valueAsNumber: true })}
            type="number"
            step="1"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Latitude"
          unit="°N"
          tooltip="Geographic latitude (-90° to +90°). Governs solar zenith and azimuth angles."
          error={errors.location?.latitude?.message}
        >
          <input
            {...register("location.latitude", { valueAsNumber: true })}
            type="number"
            step="0.0001"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Longitude"
          unit="°E"
          tooltip="Geographic longitude (-180° to +180°)."
          error={errors.location?.longitude?.message}
        >
          <input
            {...register("location.longitude", { valueAsNumber: true })}
            type="number"
            step="0.0001"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Weather Source Dataset"
          tooltip="Associated EPW (EnergyPlus Weather) dataset used for annual or design-day simulation."
          error={errors.location?.weatherSource?.message}
          warning={
            watch("location.weatherSource")?.toLowerCase().includes("test_weather")
              ? "TEST DATA ONLY: Production simulation with test weather is blocked unless explicitly confirmed."
              : undefined
          }
        >
          <div className="space-y-1.5">
            <input
              {...register("location.weatherSource")}
              type="text"
              placeholder="e.g. IND_JK_Leh.420270_ISHRAE.epw"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <div className="flex items-center gap-2">
              {watch("location.weatherSource")?.toLowerCase().includes("test_weather") ? (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-500 ring-1 ring-inset ring-amber-500/20">
                  TEST DATA
                </span>
              ) : watch("location.weatherSource")?.toLowerCase().includes("user_defined") ||
                watch("location.weatherSource")?.toLowerCase().includes("manual") ? (
                <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-purple-400 ring-1 ring-inset ring-purple-500/20">
                  USER-DEFINED
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  REAL DATA
                </span>
              )}
              <span className="text-[10px] text-slate-400">Policy: Zero Silent Fallback</span>
            </div>
          </div>
        </FieldWrapper>

        {advancedMode && (
          <>
            <FieldWrapper
              label="99.6% Winter Design Drybulb"
              unit="°C"
              tooltip="ASHRAE 99.6% extreme winter design temperature."
              isAdvanced={true}
            >
              <input
                {...register("location.designTempWinter", { valueAsNumber: true })}
                type="number"
                step="0.5"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </FieldWrapper>

            <FieldWrapper
              label="0.4% Summer Design Drybulb"
              unit="°C"
              tooltip="ASHRAE 0.4% extreme summer design temperature."
              isAdvanced={true}
            >
              <input
                {...register("location.designTempSummer", { valueAsNumber: true })}
                type="number"
                step="0.5"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </FieldWrapper>
          </>
        )}
      </div>
    </div>
  );
}
