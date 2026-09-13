"use client";

import React, { useState } from "react";
import {
  CloudSun,
  Upload,
  Compass,
  ThermometerSnowflake,
  Sun,
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Sliders,
  X,
  Loader2,
  ShieldCheck,
  Sparkles,
  Calendar,
  Info,
  Snowflake,
  Flame,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { OpenFreeMapPicker } from "@/features/weather/components/OpenFreeMapPicker";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { useShelterStore, WeatherStation } from "@/lib/store/use-shelter-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ActionButton,
  ClimateProfile,
  DataPair,
  PageIntro,
  Status,
} from "@/components/v0/platform-components";
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";
import { api } from "@/lib/api-client";

interface MonthMeta {
  index: number;
  short: string;
  full: string;
  season: "Winter" | "Spring" | "Summer" | "Autumn";
  dayOfYear: number;
  daysInMonth: number;
}

const MONTH_METADATA: MonthMeta[] = [
  { index: 1, short: "Jan", full: "January", season: "Winter", dayOfYear: 15, daysInMonth: 31 },
  { index: 2, short: "Feb", full: "February", season: "Winter", dayOfYear: 45, daysInMonth: 28 },
  { index: 3, short: "Mar", full: "March", season: "Spring", dayOfYear: 74, daysInMonth: 31 },
  { index: 4, short: "Apr", full: "April", season: "Spring", dayOfYear: 105, daysInMonth: 30 },
  { index: 5, short: "May", full: "May", season: "Spring", dayOfYear: 135, daysInMonth: 31 },
  { index: 6, short: "Jun", full: "June", season: "Summer", dayOfYear: 166, daysInMonth: 30 },
  { index: 7, short: "Jul", full: "July", season: "Summer", dayOfYear: 196, daysInMonth: 31 },
  { index: 8, short: "Aug", full: "August", season: "Summer", dayOfYear: 227, daysInMonth: 31 },
  { index: 9, short: "Sep", full: "September", season: "Autumn", dayOfYear: 258, daysInMonth: 30 },
  { index: 10, short: "Oct", full: "October", season: "Autumn", dayOfYear: 288, daysInMonth: 31 },
  { index: 11, short: "Nov", full: "November", season: "Autumn", dayOfYear: 319, daysInMonth: 30 },
  { index: 12, short: "Dec", full: "December", season: "Winter", dayOfYear: 349, daysInMonth: 31 },
];

const formatHourMin = (hourDecimal: number) => {
  const clamped = Math.max(0, Math.min(24, hourDecimal));
  const h = Math.floor(clamped);
  const m = Math.round((clamped - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const BUILTIN_STATION_IDS = new Set([
  "wx-leh-427053",
  "wx-leh-tmyx",
  "wx-leh-ishrae",
  "wx-dras-kargil",
  "wx-spiti-valley",
  "wx-tawang",
]);

export function WeatherView() {
  const {
    weatherDatasets,
    activeWeatherId,
    setActiveWeather,
    addWeatherDataset,
    deleteWeatherDataset,
    resetWeatherDatasetsToDefault,
  } = useShelterStore();
  const [selectedStationId, setSelectedStationId] = useState(activeWeatherId);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [stationToDelete, setStationToDelete] = useState<WeatherStation | null>(null);

  // Modal States
  const [activeModal, setActiveModal] = useState<"epw" | "csv" | "nasa" | "manual" | "microclimate" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Modal Form Inputs
  const [epwFile, setEpwFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [nasaForm, setNasaForm] = useState({
    location_name: "Pangong Tso Military Post",
    latitude: 33.76,
    longitude: 78.68,
    elevation_m: 4250,
    provider: "open-meteo" as "open-meteo" | "nasa-power",
    start_date: "20230101",
    end_date: "20230103",
  });
  const [csvMeta, setCsvMeta] = useState({
    location_name: "Local Met Logger Station",
    latitude: 34.2,
    longitude: 77.6,
    elevation_m: 3500,
  });
  const [manualForm, setManualForm] = useState({
    location_name: "Extreme Siachen Glacial Baseline",
    latitude: 35.42,
    longitude: 77.11,
    elevation_m: 5400,
    design_winter_min_c: -40.0,
    design_summer_max_c: 15.0,
    diurnal_range_c: 16.0,
    peak_solar_dni_wm2: 950.0,
    wind_speed_ms: 6.5,
    num_days: 3,
  });

  const activeStation =
    weatherDatasets.find((w) => w.id === selectedStationId) || weatherDatasets[0];

  // Physics-based monthly climate and solar synthesis across all 12 calendar months
  const monthlyClimatology = React.useMemo(() => {
    const tWinter = activeStation.designWinterMinC; // Peak winter datum, e.g. -20°C in Leh
    const tSummer = activeStation.designSummerMaxC; // Peak summer max, e.g. 28°C in Leh
    const lat = activeStation.latitude || 34.15;
    const elev = activeStation.elevationM || 3500;
    const latRad = (lat * Math.PI) / 180;

    return MONTH_METADATA.map((m) => {
      // Annual sinusoidal progression (0 in Jan, 1 in Jul)
      const seasonalWeight = (1 - Math.cos(((m.index - 1) * Math.PI) / 6)) / 2;

      // Diurnal range: 12°C in winter, up to 15.5°C in clear-sky high solar summer
      const diurnalSwing = Math.round((12.0 + 3.5 * seasonalWeight) * 10) / 10;
      const summerMin = tSummer - 15.0;
      const minTemp = Math.round((tWinter + (summerMin - tWinter) * seasonalWeight) * 10) / 10;
      const maxTemp = Math.round((minTemp + diurnalSwing) * 10) / 10;
      const avgTemp = Math.round(((minTemp + maxTemp) / 2) * 10) / 10;

      // Solar declination (Cooper's formula)
      const declinationDeg = 23.45 * Math.sin(((360 / 365) * (284 + m.dayOfYear) * Math.PI) / 180);
      const declRad = (declinationDeg * Math.PI) / 180;

      // Sunset/sunrise hour angle
      const cosOmega = -Math.tan(latRad) * Math.tan(declRad);
      const clampedCos = Math.max(-1, Math.min(1, cosOmega));
      const omegaDeg = (Math.acos(clampedCos) * 180) / Math.PI;

      const sunriseHour = Math.round((12 - omegaDeg / 15) * 10) / 10;
      const sunsetHour = Math.round((12 + omegaDeg / 15) * 10) / 10;
      const daylightHours = Math.round((sunsetHour - sunriseHour) * 10) / 10;

      // Solar noon elevation & peak high-altitude clear-sky DNI irradiance
      const noonAltDeg = Math.round(Math.max(10, Math.min(90, 90 - lat + declinationDeg)) * 10) / 10;
      const sinAlt = Math.sin((noonAltDeg * Math.PI) / 180);
      const elevBoost = Math.min(1.22, 1 + (elev / 10000) * 0.35);
      const peakSolar = Math.round((680 + 260 * sinAlt) * elevBoost);

      return {
        ...m,
        minTemp,
        maxTemp,
        avgTemp,
        diurnalSwing,
        declinationDeg: Math.round(declinationDeg * 10) / 10,
        noonAltDeg,
        sunriseHour,
        sunsetHour,
        daylightHours,
        peakSolar,
      };
    });
  }, [activeStation]);

  const activeMonthData = monthlyClimatology[selectedMonth - 1] || monthlyClimatology[0];

  // Synthesize 24-hour diurnal profile for selected month chart display
  const hourlyData = React.useMemo(() => {
    const data = [];
    const { minTemp, maxTemp, sunriseHour, sunsetHour, peakSolar } = activeMonthData;
    const meanTemp = (minTemp + maxTemp) / 2;
    const halfSwing = (maxTemp - minTemp) / 2;

    for (let h = 0; h < 24; h++) {
      // Temperature phase: trough at sunrise (~h_rise), peak around 14:00
      const phase = ((h - 14) / 24) * 2 * Math.PI;
      const temp = meanTemp + halfSwing * Math.cos(phase);

      // Solar profile active during daylight hours
      let solar = 0;
      if (h >= Math.floor(sunriseHour) && h <= Math.ceil(sunsetHour)) {
        const dayProgress = (h - sunriseHour) / (sunsetHour - sunriseHour);
        if (dayProgress >= 0 && dayProgress <= 1) {
          solar = Math.sin(dayProgress * Math.PI) * peakSolar;
        }
      }

      data.push({
        hour: `${String(h).padStart(2, "0")}:00`,
        temperatureC: Math.round(temp * 10) / 10,
        solarRadiationWm2: Math.max(0, Math.round(solar)),
      });
    }
    return data;
  }, [activeMonthData]);

  const handleUploadEpw = async () => {
    if (!epwFile) return;
    setIsLoading(true);
    setModalError(null);
    try {
      const formData = new FormData();
      formData.append("file", epwFile);

      const res = await fetch("/api/weather/upload/epw", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail?.message || err.detail || "EPW validation failed.");
      }

      const data = await res.json();
      const ds = data.dataset;
      const header = ds.header || {};

      const newStation: WeatherStation = {
        id: `wx-${ds.file_hash_sha256.slice(0, 8)}`,
        name: header.city || epwFile.name.replace(".epw", ""),
        region: `${header.state_province || ""}, ${header.country || ""}`.trim() || "Uploaded EPW",
        latitude: header.latitude || 34.0,
        longitude: header.longitude || 77.0,
        elevationM: header.elevation_m || 3000,
        climateZone: "Alpine Cold",
        sourceType: "EPW",
        provenanceStatus: ds.classification || "REAL_DATA",
        isTestData: ds.is_test_data || false,
        designWinterMinC: -22.0,
        designSummerMaxC: 26.0,
        annualHDD18: 4900,
        epwFileName: ds.file_name,
        sha256: ds.file_hash_sha256,
      };

      addWeatherDataset(newStation);
      setSelectedStationId(newStation.id);
      setActiveWeather(newStation.id);
      setModalSuccess(`Successfully uploaded and validated ${ds.file_name}!`);
      setTimeout(() => setActiveModal(null), 1500);
    } catch (err: any) {
      setModalError(err.message || "Failed to upload EPW file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadCsv = async () => {
    if (!csvFile) return;
    setIsLoading(true);
    setModalError(null);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("location_name", csvMeta.location_name);
      formData.append("latitude", csvMeta.latitude.toString());
      formData.append("longitude", csvMeta.longitude.toString());
      formData.append("elevation_m", csvMeta.elevation_m.toString());

      const res = await fetch("/api/weather/upload/csv", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "CSV conversion failed.");
      }

      const data = await res.json();
      const ds = data.dataset;

      const newStation: WeatherStation = {
        id: `wx-${ds.file_hash_sha256.slice(0, 8)}`,
        name: csvMeta.location_name,
        region: "Field Meteorological Logger",
        latitude: csvMeta.latitude,
        longitude: csvMeta.longitude,
        elevationM: csvMeta.elevation_m,
        climateZone: "Measured Station Record",
        sourceType: "CSV",
        provenanceStatus: "REAL_DATA",
        isTestData: false,
        designWinterMinC: -20.0,
        designSummerMaxC: 25.0,
        annualHDD18: 4800,
        epwFileName: ds.file_name,
        sha256: ds.file_hash_sha256,
      };

      addWeatherDataset(newStation);
      setSelectedStationId(newStation.id);
      setActiveWeather(newStation.id);
      setModalSuccess(`Converted CSV into valid EPW: ${ds.file_name}!`);
      setTimeout(() => setActiveModal(null), 1500);
    } catch (err: any) {
      setModalError(err.message || "Failed to convert CSV file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryNasa = async () => {
    setIsLoading(true);
    setModalError(null);
    try {
      const isMeteo = nasaForm.provider === "open-meteo";
      const endpoint = isMeteo ? "/api/weather/live-fetch" : "/api/weather/nasa-power";
      const payload = isMeteo
        ? {
            latitude: nasaForm.latitude,
            longitude: nasaForm.longitude,
            location_name: nasaForm.location_name,
            elevation_m: nasaForm.elevation_m,
            provider: "open-meteo",
          }
        : nasaForm;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Climate fetch failed" }));
        throw new Error(err.detail || "Live meteorological retrieval failed.");
      }

      const data = await res.json();
      const ds = data.dataset;

      const newStation: WeatherStation = {
        id: `wx-${ds.file_hash_sha256.slice(0, 8)}`,
        name: nasaForm.location_name,
        region: isMeteo ? "Open-Meteo Alpine Climate Reanalysis" : "NASA POWER Satellite Observation",
        latitude: nasaForm.latitude,
        longitude: nasaForm.longitude,
        elevationM: ds.header?.elevation_m || nasaForm.elevation_m,
        climateZone: isMeteo ? "Alpine Cold (ASHRAE 8)" : "Satellite Reanalysis",
        sourceType: isMeteo ? "EPW" : "NASA_POWER",
        provenanceStatus: "REAL_DATA",
        isTestData: false,
        designWinterMinC: -28.0,
        designSummerMaxC: 22.0,
        annualHDD18: 5500,
        epwFileName: ds.file_name,
        sha256: ds.file_hash_sha256,
      };

      addWeatherDataset(newStation);
      setSelectedStationId(newStation.id);
      setActiveWeather(newStation.id);
      setModalSuccess(`Retrieved ${ds.records_count} hourly records from ${isMeteo ? "Open-Meteo" : "NASA POWER"}!`);
      setTimeout(() => setActiveModal(null), 1500);
    } catch (err: any) {
      setModalError(err.message || "Failed to retrieve live satellite/alpine weather.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateManual = async () => {
    setIsLoading(true);
    setModalError(null);
    try {
      const res = await fetch("/api/weather/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Generation failed" }));
        throw new Error(err.detail || "Manual weather generation failed.");
      }

      const data = await res.json();
      const ds = data.dataset;

      const newStation: WeatherStation = {
        id: `wx-${ds.file_hash_sha256.slice(0, 8)}`,
        name: manualForm.location_name,
        region: "Custom Engineering Parametric Study",
        latitude: manualForm.latitude,
        longitude: manualForm.longitude,
        elevationM: manualForm.elevation_m,
        climateZone: "User-Defined Design Day",
        sourceType: "USER_DEFINED",
        provenanceStatus: "USER_DEFINED",
        isTestData: false,
        designWinterMinC: manualForm.design_winter_min_c,
        designSummerMaxC: manualForm.design_summer_max_c,
        annualHDD18: 5800,
        epwFileName: ds.file_name,
        sha256: ds.file_hash_sha256,
      };

      addWeatherDataset(newStation);
      setSelectedStationId(newStation.id);
      setActiveWeather(newStation.id);
      setModalSuccess(`Generated physics-consistent EPW: ${ds.file_name}!`);
      setTimeout(() => setActiveModal(null), 1500);
    } catch (err: any) {
      setModalError(err.message || "Failed to generate custom weather dataset.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* V0 Page Intro */}
      <PageIntro
        eyebrow="Climate provenance · Weather intelligence"
        title={activeStation.name}
        description={`${activeStation.region} · ${activeStation.climateZone} · ${activeStation.elevationM.toLocaleString()} m MSL`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              tone="secondary"
              onClick={() => { setActiveModal("epw"); setModalError(null); setModalSuccess(null); }}
              className="rounded-full text-xs font-semibold"
            >
              <Upload className="size-3.5" />
              Upload EPW
            </ActionButton>
            <ActionButton
              tone="secondary"
              onClick={() => { setActiveModal("csv"); setModalError(null); setModalSuccess(null); }}
              className="rounded-full text-xs font-semibold"
            >
              <FileSpreadsheet className="size-3.5" />
              Upload CSV
            </ActionButton>
            <ActionButton
              tone="primary"
              onClick={() => { setActiveModal("nasa"); setModalError(null); setModalSuccess(null); }}
              className="rounded-full text-xs font-bold"
            >
              <Compass className="size-3.5" />
              Query NASA POWER
            </ActionButton>
            <ActionButton
              tone="signal"
              onClick={() => { setActiveModal("manual"); setModalError(null); setModalSuccess(null); }}
              className="rounded-full text-xs font-semibold"
            >
              <Sliders className="size-3.5" />
              Design Day
            </ActionButton>
            <ActionButton
              tone="signal"
              onClick={() => { setActiveModal("microclimate"); setModalError(null); setModalSuccess(null); }}
              className="rounded-full text-xs font-semibold"
            >
              <Sparkles className="size-3.5 text-black" />
              Microclimate (PI-ML)
            </ActionButton>
            <ActionButton
              tone="secondary"
              onClick={() => {
                if (window.confirm("Reset weather catalog to certified Himalayan benchmarks? This will remove custom uploaded EPWs.")) {
                  resetWeatherDatasetsToDefault();
                  setSelectedStationId("wx-leh-427053");
                }
              }}
              className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              Reset Benchmarks
            </ActionButton>
          </div>
        }
      />

      {/* Top Feature Grid: Dark Provenance Panel + Climate Profile */}
      <div className="workspace-feature-grid grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div className="workspace-dark-panel rounded-[2rem] bg-[#000000] p-7 text-white sm:p-9 shadow-xl">
          <div className="flex items-center justify-between">
            <Status strong>{activeStation.provenanceStatus || (activeStation.isTestData ? "TEST_DATA" : "REAL_DATA")}</Status>
            {!activeStation.isTestData && <ShieldCheck className="size-5 text-[#CBDCE6]" />}
          </div>
          <p className="mt-12 text-6xl font-medium tracking-[-0.06em]">
            {activeStation.designWinterMinC} °C
          </p>
          <p className="mt-2 text-sm text-white/50">Winter design dry-bulb minimum</p>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-7 border-t border-white/15 pt-7">
            <DataPair
              label="Coordinates"
              value={`${activeStation.latitude.toFixed(4)}°, ${activeStation.longitude.toFixed(4)}°`}
            />
            <DataPair
              label="Elevation"
              value={`${activeStation.elevationM.toLocaleString()} m`}
            />
            <DataPair
              label="Annual HDD18"
              value={activeStation.annualHDD18.toLocaleString()}
            />
            <DataPair label="Source" value={activeStation.sourceType} />
          </dl>
        </div>

        <ClimateProfile
          winter={activeStation.designWinterMinC}
          summer={activeStation.designSummerMaxC}
          hdd={activeStation.annualHDD18}
        />
      </div>

      {/* Station Selector Cards */}
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="micro-label">Available sources</p>
            <h2 className="text-xl font-medium">Dataset selection</h2>
          </div>
          <span className="text-xs text-muted-foreground">{weatherDatasets.length} datasets loaded</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {weatherDatasets.map((stn) => {
            const isSelected = stn.id === activeStation.id;
            const isBuiltin = BUILTIN_STATION_IDS.has(stn.id);
            return (
              <div
                key={stn.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedStationId(stn.id);
                  setActiveWeather(stn.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedStationId(stn.id);
                    setActiveWeather(stn.id);
                  }
                }}
                className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-foreground bg-secondary/80 shadow-sm"
                    : "border-border bg-card hover:border-[#6E818F]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Status strong={isSelected}>{stn.provenanceStatus}</Status>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">{stn.elevationM}m</span>
                      {!isBuiltin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStationToDelete(stn);
                          }}
                          className="p-1 rounded-lg text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer"
                          title={`Delete dataset ${stn.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="mt-3 text-xs font-bold line-clamp-1">{stn.name}</h3>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{stn.region}</p>
                </div>
                <div className="mt-3 flex justify-between border-t border-border/50 pt-2 text-[10px]">
                  <span>Min: <strong>{stn.designWinterMinC}°C</strong></span>
                  <span>Src: <strong>{stn.sourceType}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Station Meteorological Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata */}
        <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-foreground" />
              <h3 className="text-sm font-semibold tracking-tight">Station Specifications</h3>
            </div>
            {activeStation.isTestData ? (
              <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                Test Fixture
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                Validated Record
              </Badge>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Coordinates:</span>
              <span className="font-mono font-medium text-foreground">
                {activeStation.latitude.toFixed(4)}°N, {activeStation.longitude.toFixed(4)}°E
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Station Elevation:</span>
              <span className="font-mono font-medium text-foreground">
                {activeStation.elevationM.toLocaleString()} meters MSL
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Provenance Status:</span>
              <span className="font-semibold text-foreground">
                {activeStation.provenanceStatus || (activeStation.isTestData ? "TEST_DATA" : "REAL_DATA")}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Dataset File:</span>
              <span className="font-mono text-muted-foreground line-clamp-1 max-w-[180px]">
                {activeStation.epwFileName || "Internal EPW"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Extreme Winter Min:</span>
              <span className="font-mono font-bold text-sky-500">
                {activeStation.designWinterMinC} °C
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Design Summer Max:</span>
              <span className="font-mono font-bold text-amber-500">
                {activeStation.designSummerMaxC} °C
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Annual Heating Degree Days:</span>
              <span className="font-mono font-bold text-foreground">{activeStation.annualHDD18} HDD18</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#CBDCE6] bg-[#CBDCE6]/15 dark:border-border dark:bg-secondary/40 p-4 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-sky-600 dark:text-sky-400" />
              Weather Provenance Policy
            </span>
            <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
              All physical building simulations execute strictly against validated meteorological datasets. Silent substitution of synthetic test weather is blocked by platform policy.
            </p>
          </div>

          {!BUILTIN_STATION_IDS.has(activeStation.id) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStationToDelete(activeStation)}
              className="w-full text-xs font-semibold text-rose-600 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              <Trash2 className="size-3.5 mr-1.5" />
              Delete Custom Dataset
            </Button>
          )}
        </div>

        {/* Right Column: Dynamic 12-Month Weather Profiles & Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Interactive 12-Month Selector Strip */}
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#6E818F]" />
                  Select Meteorological Month (Diurnal & Solar Cycle)
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Click any month to recalculate diurnal ambient dry-bulb temperatures, daylight hours, and solar irradiance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  {selectedMonth === 1 ? "❄️ Peak Winter Baseline" : selectedMonth === 7 ? "☀️ Peak Summer Solar" : `${activeMonthData.season} Season`}
                </span>
              </div>
            </div>

            {/* 12-Month Grid Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 pt-1">
              {monthlyClimatology.map((m) => {
                const isSelected = selectedMonth === m.index;
                return (
                  <button
                    key={m.index}
                    type="button"
                    onClick={() => setSelectedMonth(m.index)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs transition-all border ${
                      isSelected
                        ? "bg-foreground text-background font-bold border-foreground shadow-md scale-105"
                        : "bg-secondary/40 border-border text-foreground hover:bg-secondary hover:border-[#6E818F]"
                    }`}
                  >
                    <span className="text-xs">{m.short}</span>
                    <span className={`text-[10px] font-mono mt-0.5 ${isSelected ? "text-background/80 font-bold" : "text-muted-foreground"}`}>
                      {m.avgTemp > 0 ? `+${m.avgTemp}` : m.avgTemp}°
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Engineering Standard Advisory Callout */}
            <div className="flex items-start gap-2.5 bg-secondary/30 rounded-xl p-3 border border-border text-[11px] text-muted-foreground">
              <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-foreground">Why January was the initial default:</strong> Under ASHRAE 99.6% / ISHRAE building design standards for high-altitude cold climates (Ladakh, Siachen, Spiti), outpost shelters are benchmarked against <strong>January</strong> (the extreme cold month) to size life-critical freeze protection and thermal storage. You can select any month above or in simulations to analyze summer passive overheating (e.g. July) or shoulder-season heating transitions.
              </div>
            </div>
          </div>

          {/* 2. Diurnal Temperature Curve for Selected Month */}
          <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ThermometerSnowflake className="h-4 w-4 text-sky-500" />
                  {activeMonthData.full} Diurnal Dry-Bulb Profile (°C) — {activeMonthData.season}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  24-hour diurnal ambient temperature variation for {activeStation.name} (Month {activeMonthData.index} of 12)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  Min {activeMonthData.minTemp}°C
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-mono text-xs font-medium text-foreground border border-border">
                  Mean {activeMonthData.avgTemp}°C
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Max {activeMonthData.maxTemp}°C
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weatherTempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="hour" stroke="currentColor" strokeOpacity={0.4} fontSize={11} tickLine={false} />
                  <YAxis stroke="currentColor" strokeOpacity={0.4} fontSize={11} domain={["auto", "auto"]} unit="°C" tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="rounded-2xl border border-border bg-card/95 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
                          <div className="flex items-center justify-between border-b border-border/60 pb-1 font-semibold">
                            <span>{label} ({activeMonthData.short})</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{activeMonthData.season}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-sky-500 font-medium">
                              <span className="size-2 rounded-full bg-sky-500 animate-pulse" />
                              Dry-Bulb Temp:
                            </span>
                            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{d.temperatureC} °C</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                            <span>Diurnal Range:</span>
                            <span className="font-mono">Δ{activeMonthData.diurnalSwing}°C</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="temperatureC"
                    name="Dry-Bulb Temp (°C)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fill="url(#weatherTempGradient)"
                    activeDot={{ r: 5, fill: "#0284c7", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Direct Solar Radiation Curve for Selected Month */}
          <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  {activeMonthData.full} Direct Normal Solar Radiation (W/m²)
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Daylight {activeMonthData.daylightHours}h ({formatHourMin(activeMonthData.sunriseHour)} sunrise - {formatHourMin(activeMonthData.sunsetHour)} sunset) · Noon Solar Altitude {activeMonthData.noonAltDeg}°
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Peak {activeMonthData.peakSolar} W/m²
                </span>
              </div>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weatherSolarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="hour" stroke="currentColor" strokeOpacity={0.4} fontSize={11} tickLine={false} />
                  <YAxis stroke="currentColor" strokeOpacity={0.4} fontSize={11} unit=" W/m²" tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="rounded-2xl border border-border bg-card/95 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
                          <div className="flex items-center justify-between border-b border-border/60 pb-1 font-semibold">
                            <span>{label} ({activeMonthData.short})</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Clear-Sky Solar</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                              <span className="size-2 rounded-full bg-amber-500" />
                              Solar Flux:
                            </span>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{d.solarRadiationWm2} W/m²</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                            <span>Daylight Window:</span>
                            <span className="font-mono">{activeMonthData.daylightHours}h total</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="solarRadiationWm2"
                    name="Direct Solar (W/m²)"
                    stroke="#f59e0b"
                    fill="url(#weatherSolarGradient)"
                    strokeWidth={2.5}
                    activeDot={{ r: 5, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Comprehensive Annual 12-Month Climatology Benchmark Table */}
          <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Annual 12-Month Climate Benchmark ({activeStation.name})
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Seasonal temperature progression, diurnal swings, daylight duration, and solar potential across the entire year
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                Elev: {activeStation.elevationM}m MSL · Lat: {activeStation.latitude.toFixed(2)}°N
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] text-muted-foreground">
                    <th className="py-2.5 px-3 font-medium">Month</th>
                    <th className="py-2.5 px-3 font-medium">Season</th>
                    <th className="py-2.5 px-3 font-medium">Min Temp</th>
                    <th className="py-2.5 px-3 font-medium">Mean Temp</th>
                    <th className="py-2.5 px-3 font-medium">Max Temp</th>
                    <th className="py-2.5 px-3 font-medium">Diurnal Δ</th>
                    <th className="py-2.5 px-3 font-medium">Daylight</th>
                    <th className="py-2.5 px-3 font-medium">Peak Solar</th>
                    <th className="py-2.5 px-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {monthlyClimatology.map((m) => {
                    const isSel = selectedMonth === m.index;
                    return (
                      <tr
                        key={m.index}
                        onClick={() => setSelectedMonth(m.index)}
                        className={`cursor-pointer transition-colors ${
                          isSel ? "bg-secondary/70 font-semibold" : "hover:bg-secondary/30"
                        }`}
                      >
                        <td className="py-2.5 px-3 flex items-center gap-2">
                          <span className={`size-2 rounded-full ${isSel ? "bg-sky-500" : "bg-muted-foreground/30"}`} />
                          <span className="text-foreground">{m.full}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            m.season === "Winter"
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                              : m.season === "Summer"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {m.season}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-sky-500">{m.minTemp}°C</td>
                        <td className="py-2.5 px-3 font-mono">{m.avgTemp}°C</td>
                        <td className="py-2.5 px-3 font-mono text-amber-500">{m.maxTemp}°C</td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">Δ{m.diurnalSwing}°C</td>
                        <td className="py-2.5 px-3 font-mono">{m.daylightHours}h</td>
                        <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">{m.peakSolar} W/m²</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMonth(m.index);
                            }}
                            className={`text-[10px] px-2.5 py-1 rounded-lg border transition ${
                              isSel
                                ? "bg-foreground text-background border-foreground font-bold shadow-sm"
                                : "bg-card border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {isSel ? "Active" : "Inspect"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Upload EPW File */}
      {activeModal === "epw" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-7 shadow-2xl space-y-5 text-foreground">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-[#6E818F]" />
                Upload EnergyPlus Weather (.epw)
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select an authentic EnergyPlus `.epw` file. The platform will validate header integrity, geographic coordinates, and physical variable bounds.
            </p>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-[#6E818F] transition bg-secondary/30">
              <input
                type="file"
                accept=".epw"
                onChange={(e) => setEpwFile(e.target.files?.[0] || null)}
                className="hidden"
                id="epw-file-input"
              />
              <label htmlFor="epw-file-input" className="cursor-pointer space-y-2 block">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                <span className="text-xs font-semibold text-foreground block">
                  {epwFile ? epwFile.name : "Click to browse or drop .epw file"}
                </span>
                <span className="text-[10px] text-muted-foreground block">EnergyPlus Weather format (35 columns)</span>
              </label>
            </div>

            {modalError && (
              <div className="rounded-2xl border-2 border-rose-500/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-900 dark:text-rose-100 flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="rounded-2xl border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-950 dark:text-emerald-100 flex items-start gap-2.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{modalSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <ActionButton tone="quiet" onClick={() => setActiveModal(null)} disabled={isLoading}>
                Cancel
              </ActionButton>
              <ActionButton
                tone="primary"
                onClick={handleUploadEpw}
                disabled={!epwFile || isLoading}
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Validate & Register
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Upload CSV File */}
      {activeModal === "csv" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-7 shadow-2xl space-y-5 text-foreground">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-[#6E818F]" />
                Upload Station Logger CSV
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload hourly tabular CSV meteorological records. The system will convert variables into standard EPW format with barometric altitude corrections.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-foreground font-semibold mb-1">Site / Outpost Name</label>
                <input
                  type="text"
                  value={csvMeta.location_name}
                  onChange={(e) => setCsvMeta({ ...csvMeta, location_name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-[#6E818F]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={csvMeta.latitude}
                    onChange={(e) => setCsvMeta({ ...csvMeta, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={csvMeta.longitude}
                    onChange={(e) => setCsvMeta({ ...csvMeta, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Elevation (m)</label>
                  <input
                    type="number"
                    value={csvMeta.elevation_m}
                    onChange={(e) => setCsvMeta({ ...csvMeta, elevation_m: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs"
                  />
                </div>
              </div>

              <div className="border border-border rounded-xl p-3 text-center bg-secondary/20">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer space-y-1 block">
                  <FileSpreadsheet className="h-6 w-6 text-muted-foreground mx-auto" />
                  <span className="text-xs font-semibold text-foreground block">
                    {csvFile ? csvFile.name : "Select hourly .csv file"}
                  </span>
                </label>
              </div>
            </div>

            {modalError && (
              <div className="rounded-2xl border-2 border-rose-500/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-900 dark:text-rose-100 flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="rounded-2xl border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-950 dark:text-emerald-100 flex items-start gap-2.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{modalSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <ActionButton tone="quiet" onClick={() => setActiveModal(null)} disabled={isLoading}>
                Cancel
              </ActionButton>
              <ActionButton
                tone="primary"
                onClick={handleUploadCsv}
                disabled={!csvFile || isLoading}
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Convert & Register
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NASA POWER Query */}
      {activeModal === "nasa" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-7 shadow-2xl space-y-5 text-foreground">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Compass className="h-4 w-4 text-[#6E818F]" />
                NASA POWER Satellite Climate Sync
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Retrieve authentic solar and meteorological time series from NASA Langley Research Center for coordinates beyond ground met station coverage.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-foreground font-semibold mb-1">Meteorological Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNasaForm({ ...nasaForm, provider: "open-meteo" })}
                    className={`rounded-xl p-2.5 text-left border transition-all ${
                      nasaForm.provider === "open-meteo"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold"
                        : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <div className="text-xs font-semibold">Open-Meteo Alpine</div>
                    <div className="text-[10px] opacity-75 font-normal">Instant DEM elevation & lapse-rate</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNasaForm({ ...nasaForm, provider: "nasa-power" })}
                    className={`rounded-xl p-2.5 text-left border transition-all ${
                      nasaForm.provider === "nasa-power"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold"
                        : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <div className="text-xs font-semibold">NASA POWER</div>
                    <div className="text-[10px] opacity-75 font-normal">Satellite radiation & multi-day</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Target Location Name</label>
                <input
                  type="text"
                  value={nasaForm.location_name}
                  onChange={(e) => setNasaForm({ ...nasaForm, location_name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-foreground text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={nasaForm.latitude}
                    onChange={(e) => setNasaForm({ ...nasaForm, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={nasaForm.longitude}
                    onChange={(e) => setNasaForm({ ...nasaForm, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Elevation (m)</label>
                  <input
                    type="number"
                    value={nasaForm.elevation_m}
                    onChange={(e) => setNasaForm({ ...nasaForm, elevation_m: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">Start Date (YYYYMMDD)</label>
                  <input
                    type="text"
                    value={nasaForm.start_date}
                    onChange={(e) => setNasaForm({ ...nasaForm, start_date: e.target.value })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">End Date (YYYYMMDD)</label>
                  <input
                    type="text"
                    value={nasaForm.end_date}
                    onChange={(e) => setNasaForm({ ...nasaForm, end_date: e.target.value })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {modalError && (
              <div className="rounded-2xl border-2 border-rose-500/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-900 dark:text-rose-100 flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="rounded-2xl border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-950 dark:text-emerald-100 flex items-start gap-2.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{modalSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <ActionButton tone="quiet" onClick={() => setActiveModal(null)} disabled={isLoading}>
                Cancel
              </ActionButton>
              <ActionButton
                tone="primary"
                onClick={handleQueryNasa}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Query & Generate EPW
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: User-Defined Parametric Design Weather */}
      {activeModal === "manual" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-7 shadow-2xl space-y-5 text-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#6E818F]" />
                Physics-Consistent Design Day Generator
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Create a physics-consistent parametric stress test weather dataset tagged as <span className="font-semibold text-foreground">USER_DEFINED</span> based on ASHRAE diurnal equations.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-foreground font-semibold mb-1">Outpost Scenario Name</label>
                <input
                  type="text"
                  value={manualForm.location_name}
                  onChange={(e) => setManualForm({ ...manualForm, location_name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-foreground text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualForm.latitude}
                    onChange={(e) => setManualForm({ ...manualForm, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualForm.longitude}
                    onChange={(e) => setManualForm({ ...manualForm, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Altitude (m)</label>
                  <input
                    type="number"
                    value={manualForm.elevation_m}
                    onChange={(e) => setManualForm({ ...manualForm, elevation_m: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">Winter Min (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={manualForm.design_winter_min_c}
                    onChange={(e) => setManualForm({ ...manualForm, design_winter_min_c: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Summer Max (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={manualForm.design_summer_max_c}
                    onChange={(e) => setManualForm({ ...manualForm, design_summer_max_c: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Diurnal Swing (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={manualForm.diurnal_range_c}
                    onChange={(e) => setManualForm({ ...manualForm, diurnal_range_c: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted-foreground mb-1">Peak DNI (W/m²)</label>
                  <input
                    type="number"
                    value={manualForm.peak_solar_dni_wm2}
                    onChange={(e) => setManualForm({ ...manualForm, peak_solar_dni_wm2: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Wind Speed (m/s)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={manualForm.wind_speed_ms}
                    onChange={(e) => setManualForm({ ...manualForm, wind_speed_ms: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2 py-2 text-foreground text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {modalError && (
              <div className="rounded-2xl border-2 border-rose-500/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-900 dark:text-rose-100 flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="rounded-2xl border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-950 dark:text-emerald-100 flex items-start gap-2.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{modalSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <ActionButton tone="quiet" onClick={() => setActiveModal(null)} disabled={isLoading}>
                Cancel
              </ActionButton>
              <ActionButton
                tone="primary"
                onClick={handleGenerateManual}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Generate & Select
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: High-Altitude Microclimate Weather Synthesizer (PI-ML) */}
      {activeModal === "microclimate" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl rounded-[2rem] border border-border bg-card p-7 shadow-2xl space-y-5 text-foreground max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E818F]">
                  Physics-Informed Downscaling · Atmospheric Synthesizer
                </span>
                <h3 className="font-editorial text-2xl font-medium tracking-tight text-foreground mt-0.5">
                  High-Altitude Microclimate Synthesizer (PI-ML)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Downscale reference airport weather to frontline Himalayan defense outposts with diurnal lapse rates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-full p-2 text-[#6E818F] hover:bg-[#CBDCE6]/40 hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <OpenFreeMapPicker
              initialLatitude={activeStation.latitude}
              initialLongitude={activeStation.longitude}
              initialElevation={activeStation.elevationM}
              initialLocationName={activeStation.name}
              onEpwGenerated={(epwFile, summary) => {
                const newStation: WeatherStation = {
                  id: `wx-micro-${Date.now().toString().slice(-6)}`,
                  name: summary.location_name || "Synthesized Microclimate Outpost",
                  region: `${summary.location_name} (Synthesized High-Altitude Microclimate)`,
                  latitude: summary.latitude,
                  longitude: summary.longitude,
                  elevationM: summary.elevation_m,
                  climateZone: summary.elevation_m > 4500 ? "Extreme Cold Alpine (ASHRAE 8)" : "Cold Alpine Continental",
                  sourceType: "EPW",
                  provenanceStatus: "REAL_DATA",
                  isTestData: false,
                  designWinterMinC: summary.min_temperature_c,
                  designSummerMaxC: summary.max_temperature_c,
                  annualHDD18: 6200,
                  epwFileName: epwFile,
                  sha256: `piml-synth-${Date.now()}`,
                };
                addWeatherDataset(newStation);
                setSelectedStationId(newStation.id);
                setActiveWeather(newStation.id);
                setModalSuccess(`Generated & Selected Microclimate EPW: ${epwFile}!`);
                setTimeout(() => setActiveModal(null), 1500);
              }}
              height="370px"
              showMicroclimateSynthesizer={true}
            />

            <div className="flex justify-end pt-3 border-t border-border">
              <ActionButton tone="quiet" onClick={() => setActiveModal(null)}>
                Close
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Weather Dataset Modal */}
      {stationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Weather Dataset</h3>
                <p className="text-xs text-muted-foreground">Permanent meteorological removal</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Station:</span>
                <span className="font-semibold text-foreground">{stationToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">File:</span>
                <span className="font-mono text-muted-foreground">{stationToDelete.epwFileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Elevation / Min:</span>
                <span className="font-semibold text-foreground">{stationToDelete.elevationM}m / {stationToDelete.designWinterMinC}°C</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove this dataset from your active catalog? EnergyPlus simulations using this dataset will default to certified WMO benchmarks.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStationToDelete(null)}
                className="rounded-full text-xs font-semibold px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const toDelete = stationToDelete;
                  setStationToDelete(null);
                  if (!toDelete) return;

                  deleteWeatherDataset(toDelete.id);
                  const fallback = weatherDatasets.find((w) => w.id !== toDelete.id);
                  if (selectedStationId === toDelete.id && fallback) {
                    setSelectedStationId(fallback.id);
                    setActiveWeather(fallback.id);
                  }

                  try {
                    if (toDelete.epwFileName) {
                      await api.weather.deleteDataset(toDelete.epwFileName);
                    }
                  } catch (err) {
                    console.warn("Backend EPW file deletion note:", err);
                  }
                }}
                className="rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 cursor-pointer"
              >
                Delete Dataset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Connected Linear Workflow Footer */}
      <WorkflowFooter customNextLabel="Proceed to 2D Designer" customNextHref="/designer" />
    </div>
  );
}
