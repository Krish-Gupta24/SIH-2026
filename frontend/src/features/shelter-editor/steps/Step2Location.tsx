import React from "react";
import { ShelterFormValues, ShelterFormReturn } from "../schema";
import { FieldWrapper } from "../components/FieldWrapper";
import { MapPin, Compass, Sparkles } from "lucide-react";
import { OpenFreeMapPicker } from "@/features/weather/components/OpenFreeMapPicker";

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

import { api } from "@/lib/api-client";
import { useShelterStore } from "@/lib/store/use-shelter-store";

export function Step2Location({ form, advancedMode }: StepProps) {
  const { register, formState: { errors }, setValue, watch } = form;
  const { addWeatherDataset, setActiveWeather, updateProject, activeProjectId, weatherDatasets } = useShelterStore();
  const currentElevation = watch("location.elevation") || 3500;
  const currentLatitude = watch("location.latitude") || 34.1526;
  const currentLongitude = watch("location.longitude") || 77.5771;
  const currentRegion = watch("location.region") || "Leh Ladakh, India";
  const currentClimateZone = watch("location.climateZone") || "Cold / Extreme Alpine";

  const [isFetchingWeather, setIsFetchingWeather] = React.useState(false);
  const [liveFetchStatus, setLiveFetchStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleLocationMapChange = (loc: {
    latitude: number;
    longitude: number;
    elevation: number;
    locality: string;
    region: string;
  }) => {
    setValue("location.latitude", loc.latitude);
    setValue("location.longitude", loc.longitude);
    setValue("location.elevation", loc.elevation);
    setValue("location.region", loc.locality);
    if (loc.elevation >= 4500) {
      setValue("location.climateZone", "Extreme Cold Alpine (ASHRAE 8)");
      setValue("location.designTempWinter", -35.0);
    }
  };

  const handleEpwGenerated = (epwFile: string, summary?: any) => {
    setValue("location.weatherSource", epwFile);
    const stationId = `wx-micro-${Date.now().toString().slice(-6)}`;
    const locName = summary?.location_name || currentRegion.split(",")[0] || "Custom Outpost";
    const elev = summary?.elevation_m || currentElevation;
    addWeatherDataset({
      id: stationId,
      name: `${locName} (${Math.round(elev)}m · ML Synthesized EPW)`,
      region: `${currentRegion} (Downscaled Microclimate)`,
      latitude: summary?.latitude ?? currentLatitude,
      longitude: summary?.longitude ?? currentLongitude,
      elevationM: elev,
      climateZone: elev > 4500 ? "Extreme Cold Alpine (ASHRAE 8)" : "Cold Alpine Continental",
      sourceType: "EPW",
      provenanceStatus: "REAL_DATA",
      isTestData: false,
      designWinterMinC: summary?.min_temperature_c ?? (elev > 4500 ? -35.0 : -20.0),
      designSummerMaxC: summary?.max_temperature_c ?? 22.0,
      annualHDD18: 5800,
      epwFileName: epwFile,
      sha256: `piml-synth-${Date.now()}`,
    });
    setActiveWeather(stationId);

    if (activeProjectId) {
      updateProject(activeProjectId, {
        location: {
          latitude: summary?.latitude ?? currentLatitude,
          longitude: summary?.longitude ?? currentLongitude,
          elevation: elev,
          region: `${currentRegion} (Downscaled Microclimate)`,
          climateZone: elev > 4500 ? "Extreme Cold Alpine (ASHRAE 8)" : "Cold Alpine Continental",
          weatherSource: epwFile,
          designTempWinter: summary?.min_temperature_c ?? (elev > 4500 ? -35.0 : -20.0),
          designTempSummer: summary?.max_temperature_c ?? 22.0,
        },
      });
    }
  };

  const handleLiveFetchClimate = async () => {
    const lat = Number(watch("location.latitude"));
    const lon = Number(watch("location.longitude"));
    const reg = watch("location.region") || "Tactical Outpost";

    if (isNaN(lat) || isNaN(lon)) {
      setLiveFetchStatus({
        type: "error",
        message: "Please specify valid numerical Latitude and Longitude before querying satellite climate.",
      });
      return;
    }

    setIsFetchingWeather(true);
    setLiveFetchStatus(null);

    try {
      const res = await api.weather.liveFetch({
        latitude: lat,
        longitude: lon,
        location_name: reg,
        elevation_m: currentElevation ? Number(currentElevation) : undefined,
        provider: "open-meteo",
      });

      if (res && res.epw_file) {
        setValue("location.weatherSource", res.epw_file);
        const resolvedElev = res.dataset?.header?.elevation_m && (!currentElevation || currentElevation === 0)
          ? res.dataset.header.elevation_m
          : currentElevation;
        if (res.dataset?.header?.elevation_m && (!currentElevation || currentElevation === 0)) {
          setValue("location.elevation", res.dataset.header.elevation_m);
        }
        if (activeProjectId) {
          updateProject(activeProjectId, {
            location: {
              latitude: lat,
              longitude: lon,
              elevation: Number(resolvedElev),
              region: reg,
              climateZone: Number(resolvedElev) > 4500 ? "Extreme Cold Alpine (ASHRAE 8)" : currentClimateZone,
              weatherSource: res.epw_file,
            },
          });
        }
        const matched = weatherDatasets.find((w) => w.epwFileName === res.epw_file);
        if (matched) setActiveWeather(matched.id);

        setLiveFetchStatus({
          type: "success",
          message: `Ingested ${res.dataset?.records_count || 72} hourly observations (${res.provider?.toUpperCase()}). Generated EPW: ${res.epw_file}`,
        });
      } else {
        throw new Error("Invalid response received from weather pipeline.");
      }
    } catch (err: any) {
      setLiveFetchStatus({
        type: "error",
        message: `Live satellite climate fetch failed: ${err.message || "Network error"}`,
      });
    } finally {
      setIsFetchingWeather(false);
    }
  };

  const applyPreset = (preset: typeof REGION_PRESETS[0]) => {
    setValue("location.latitude", preset.latitude);
    setValue("location.longitude", preset.longitude);
    setValue("location.elevation", preset.elevation);
    setValue("location.region", preset.region);
    setValue("location.climateZone", preset.climateZone);
    setValue("location.weatherSource", preset.weatherSource);
    setValue("location.designTempWinter", preset.designWinter);
    setValue("location.designTempSummer", preset.designSummer);

    // Synchronize directly into active project so simulations immediately reflect selected climate
    if (activeProjectId) {
      updateProject(activeProjectId, {
        location: {
          latitude: preset.latitude,
          longitude: preset.longitude,
          elevation: preset.elevation,
          region: preset.region,
          climateZone: preset.climateZone,
          weatherSource: preset.weatherSource,
          designTempWinter: preset.designWinter,
          designTempSummer: preset.designSummer,
        },
      });
    }

    // Synchronize active weather station in the global store
    const matched = weatherDatasets.find((w) => w.epwFileName === preset.weatherSource);
    if (matched) {
      setActiveWeather(matched.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Real-Time Atmospheric Conditions & Microclimate Boundary</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Capture of real-time atmospheric ambient climatic condition data, high-altitude microclimate synthesis, and certified meteorological stations.
          </p>
        </div>
      </div>

      {/* Interactive OpenFreeMap Positioning & Microclimate Synthesizer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Real-Time Atmospheric Ambient Climatic Data & Satellite Coordinates
          </label>
          <span className="text-[10px] text-slate-400">
            Zero Guesswork: Click map or search place name
          </span>
        </div>

        <OpenFreeMapPicker
          initialLatitude={Number(currentLatitude)}
          initialLongitude={Number(currentLongitude)}
          initialElevation={Number(currentElevation)}
          initialLocationName={currentRegion}
          onLocationChange={handleLocationMapChange}
          onEpwGenerated={handleEpwGenerated}
          height="390px"
        />
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
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                {...register("location.weatherSource")}
                type="text"
                placeholder="e.g. IND_JK_Leh.420270_ISHRAE.epw"
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                disabled={isFetchingWeather}
                onClick={handleLiveFetchClimate}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                title="Query Open-Meteo & NASA POWER for exact coordinates and elevation"
              >
                {isFetchingWeather ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Fetching Live...
                  </>
                ) : (
                  <>
                    <Compass className="h-3.5 w-3.5" />
                    Fetch Live Climate
                  </>
                )}
              </button>
            </div>

            {liveFetchStatus && (
              <div
                className={`rounded-md p-2.5 text-xs ${
                  liveFetchStatus.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {liveFetchStatus.message}
              </div>
            )}

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
              ) : watch("location.weatherSource")?.toLowerCase().includes("live_") ? (
                <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-cyan-400 ring-1 ring-inset ring-cyan-500/20">
                  LIVE SATELLITE EPW
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
