"use client";

import React from "react";
import Link from "next/link";
import {
  ThermometerSnowflake,
  FolderKanban,
  Cpu,
  Layers,
  CloudSun,
  ArrowRight,
  Wand2,
  TrendingDown,
  ShieldCheck,
  Zap,
  Activity,
  Compass,
  Sparkles,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DashboardView() {
  const { projects, simulations, weatherDatasets, setActiveProject } = useShelterStore();

  const totalShelters = projects.length;
  const completedSims = simulations.filter((s) => s.status === "completed").length;
  const activeJobs = simulations.filter(
    (s) => s.status === "running" || s.status === "queued" || s.status === "preparing"
  ).length;

  const simulationJobs = simulations;

  const completedWithSummary = simulationJobs.filter(
    (j) => j.status === "completed" && j.results?.summary
  );

  const avgDamping =
    completedWithSummary.length > 0
      ? Math.round(
          completedWithSummary.reduce(
            (acc, j) => acc + (j.results?.summary?.diurnalSwingDampingPct ?? 0),
            0
          ) / completedWithSummary.length
        )
      : null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/40 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Smart India Hackathon 2026 • Problem 26051</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Area-Specific High-Altitude Shelter Thermal Platform
            </h1>
            <p className="text-sm text-slate-400">
              Parametric envelope design, local rammed-earth & mass thermal inertia, sub-zero winter comfort simulation, and EnergyPlus integration engineered for Leh, Ladakh, Kargil, and Dras.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/demo">
              <Button size="lg" className="gap-2 font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30">
                <Sparkles className="h-4 w-4" />
                SIH Judge Demo (20 Steps)
              </Button>
            </Link>
            <Link href="/designer">
              <Button size="lg" variant="outline" className="gap-2 font-bold border-blue-500/40 hover:bg-blue-500/10 text-white">
                <Wand2 className="h-4 w-4 text-blue-400" />
                13-Step Designer
              </Button>
            </Link>
            <Link href="/simulations">
              <Button variant="outline" size="lg" className="gap-2 font-semibold">
                <Cpu className="h-4 w-4 text-blue-400" />
                View Queue ({activeJobs})
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Primary Top-Level Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Modeled Shelters
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalShelters}</div>
            <p className="mt-1 text-xs text-slate-500">Alpine & high-altitude models</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Avg. Envelope U-Value
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-300">
              {completedWithSummary.length > 0 ? "Metric unavailable from this simulation" : "Pending simulation"}
            </div>
            <p className="mt-1 text-xs text-slate-500">ECBC Cold Zone requirement (≤ 0.30)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Diurnal Damping Ratio
            </CardTitle>
            <Activity className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {avgDamping !== null ? `${avgDamping}% Buffer` : "Pending simulation"}
            </div>
            <p className="mt-1 text-xs text-slate-500">Thermal mass stabilized night temp</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Simulation Runs
            </CardTitle>
            <Cpu className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{completedSims} Done</div>
            <p className="mt-1 text-xs text-slate-500">{activeJobs} active in Celery queue</p>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Layout: Active Projects & Regional Weather Stations */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Projects Preview (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">Configured Shelter Models</h2>
            </div>
            <Link href="/projects" className="text-xs font-semibold text-blue-400 hover:underline">
              View all ({projects.length}) &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all cursor-pointer"
                onClick={() => setActiveProject(p.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-bold text-white line-clamp-1">{p.project?.name || p.id}</CardTitle>
                    <Badge variant="cold" className="text-[10px]">
                      v{p.project?.version || "1.0"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{p.project?.description}</p>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-950/60 p-2.5 text-center text-[11px]">
                    <div>
                      <div className="text-slate-500">Floor Area</div>
                      <div className="font-mono font-bold text-slate-200">{(p.geometry.length * p.geometry.width).toFixed(1)} m²</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Volume</div>
                      <div className="font-mono font-bold text-slate-200">{(p.geometry.length * p.geometry.width * p.geometry.height).toFixed(1)} m³</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Overall U</div>
                      <div className="font-mono text-[10px] text-slate-400 truncate">
                        {completedWithSummary.find((j) => j.projectId === p.id)
                          ? "Metric unavailable"
                          : "Pending simulation"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Compass className="h-3 w-3 text-slate-400" />
                      {p.location.region}
                    </span>
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      Inspect
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* High-Altitude Climate Snapshot (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudSun className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Target High-Altitude Climates</h2>
            </div>
            <Link href="/weather" className="text-xs font-semibold text-blue-400 hover:underline">
              Manage &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {weatherDatasets.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{w.name}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {w.elevationM} m
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">{w.climateZone}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-500">Winter Min: </span>
                    <span className="font-mono font-bold text-blue-400">{w.designWinterMinC}°C</span>
                  </div>
                  <div>
                    <span className="text-slate-500">HDD18: </span>
                    <span className="font-mono font-bold text-amber-400">{w.annualHDD18}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
