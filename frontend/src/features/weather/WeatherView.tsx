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
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function WeatherView() {
  const { weatherDatasets, activeWeatherId, setActiveWeather } = useShelterStore();
  const [selectedStationId, setSelectedStationId] = useState(activeWeatherId);

  const activeStation =
    weatherDatasets.find((w) => w.id === selectedStationId) || weatherDatasets[0];

  // Synthesize 24-hour design day dry-bulb and solar profile for the station
  const hourlyData = React.useMemo(() => {
    const data = [];
    const minT = activeStation.designWinterMinC;
    const maxT = minT + 12; // Diurnal range ~12°C

    for (let h = 0; h < 24; h++) {
      // Temp diurnal curve dipping at 05:00 and peaking at 14:00
      const temp = minT + ((maxT - minT) / 2) * (1 + Math.sin(((h - 8) / 24) * 2 * Math.PI));
      // Direct solar normal peaking at solar noon
      const solar = h >= 7 && h <= 17 ? Math.sin(((h - 7) / 10) * Math.PI) * 820 : 0;

      data.push({
        hour: `${String(h).padStart(2, "0")}:00`,
        temperatureC: Math.round(temp * 10) / 10,
        solarRadiationWm2: Math.round(solar),
      });
    }
    return data;
  }, [activeStation]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CloudSun className="h-6 w-6 text-amber-400" />
            Weather & Climate Datasets
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardized high-altitude meteorological data (EPW, NASA POWER, CSV) for alpine thermal simulation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 text-xs font-semibold">
            <Upload className="h-3.5 w-3.5" />
            Upload EPW File
          </Button>
          <Button variant="default" className="gap-2 text-xs font-bold">
            <Compass className="h-3.5 w-3.5" />
            Query NASA POWER
          </Button>
        </div>
      </div>

      {/* Station Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {weatherDatasets.map((stn) => {
          const isSelected = stn.id === activeStation.id;
          return (
            <Card
              key={stn.id}
              onClick={() => {
                setSelectedStationId(stn.id);
                setActiveWeather(stn.id);
              }}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "border-blue-500 bg-slate-900 shadow-md shadow-blue-500/10"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <Badge variant={isSelected ? "default" : "outline"} className="text-[10px]">
                    {stn.sourceType}
                  </Badge>
                  <span className="font-mono text-xs text-emerald-400 font-bold">
                    {stn.elevationM} m
                  </span>
                </div>
                <CardTitle className="text-sm font-bold text-white mt-2 line-clamp-1">
                  {stn.name}
                </CardTitle>
                <p className="text-[11px] text-slate-400">{stn.region}</p>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="flex justify-between text-xs pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500">Winter Min: </span>
                    <span className="font-mono font-bold text-blue-400">
                      {stn.designWinterMinC}°C
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">HDD18: </span>
                    <span className="font-mono font-bold text-amber-400">{stn.annualHDD18}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Station Meteorological Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="h-4 w-4 text-blue-400" />
              Meteorological Station Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Coordinates:</span>
                <span className="font-mono font-semibold text-white">
                  {activeStation.latitude.toFixed(4)}°N, {activeStation.longitude.toFixed(4)}°E
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Station Elevation:</span>
                <span className="font-mono font-semibold text-emerald-400">
                  {activeStation.elevationM} meters MSL
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Climate Zone:</span>
                <span className="font-semibold text-white">{activeStation.climateZone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Extreme Design Winter Dry-Bulb:</span>
                <span className="font-mono font-bold text-blue-400">
                  {activeStation.designWinterMinC} °C
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Design Summer Dry-Bulb:</span>
                <span className="font-mono font-bold text-amber-400">
                  {activeStation.designSummerMaxC} °C
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Annual Heating Degree Days (HDD18):</span>
                <span className="font-mono font-bold text-white">{activeStation.annualHDD18}</span>
              </div>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-slate-300">
              <span className="font-bold text-blue-400">High Altitude Solar Benefit:</span>
              <p className="mt-1 text-[11px] text-slate-400">
                Atmospheric clearness at {activeStation.elevationM}m yields direct solar irradiance exceeding 800 W/m² on clear winter days, providing strong passive solar heating potential.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: 24-Hour Design Day Diurnal Temperature & Solar Irradiance Charts */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ThermometerSnowflake className="h-4 w-4 text-blue-400" />
                  Extreme Winter Design Day Dry-Bulb Profile (°C)
                </h3>
                <p className="text-[11px] text-slate-400">
                  24-hour diurnal ambient temperature variation in {activeStation.name}
                </p>
              </div>
              <Badge variant="cold" className="font-mono">
                Min {activeStation.designWinterMinC}°C
              </Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={["auto", "auto"]} unit="°C" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperatureC"
                    name="Dry-Bulb Temp (°C)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-400" />
                  Direct Normal Solar Radiation (W/m²)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Clear-sky high-altitude winter solar radiation curve
                </p>
              </div>
              <Badge variant="warning" className="font-mono">
                Peak 820 W/m²
              </Badge>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit=" W/m²" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="solarRadiationWm2"
                    name="Direct Solar (W/m²)"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
