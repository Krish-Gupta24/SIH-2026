"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Box,
  CloudSun,
  Cpu,
  Layers,
  Wand2,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import {
  DataPair,
  IndoorTemperatureChart,
  NextStep,
  PageIntro,
  ShelterScene,
  Status,
} from "@/components/v0/platform-components";

export function DashboardView() {
  const router = useRouter();
  const {
    projects,
    activeProjectId,
    weatherDatasets,
    activeWeatherId,
    simulations,
  } = useShelterStore();

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];
  const activeWeather =
    weatherDatasets.find((w) => w.id === activeWeatherId) || weatherDatasets[0];

  const projectRuns = simulations.filter(
    (s) => s.projectId === activeProject?.id
  );
  const latestRun =
    projectRuns.find((s) => s.status === "completed" && s.results) ||
    simulations.find((s) => s.status === "completed" && s.results);
  const summary = latestRun?.results?.summary;

  if (!activeProject) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No active shelter project found.</p>
        <Link href="/projects" className="mt-4 inline-block font-semibold underline">
          Go to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageIntro
        eyebrow={`Project ${activeProject.project.version} · DRDO PS 26051`}
        title="Engineering overview"
        description="Canonical model readiness, climate context, latest thermal performance, and traceable validation sequence."
      />

      {/* Main Feature Grid: 3D Scene + Immediate Judgment */}
      <div className="workspace-feature-grid grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative min-h-[480px] overflow-hidden rounded-[2rem] bg-[#CBDCE6] shadow-[0_24px_70px_rgba(0,0,0,.08)]">
          <ShelterScene project={activeProject} wireframe={false} />
          <div className="absolute left-5 top-5 rounded-full bg-white/90 px-4 py-2 backdrop-blur">
            <Status strong>Model ready</Status>
          </div>
          <div className="absolute bottom-5 right-5">
            <Link
              href="/designer/3d"
              className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-white/90 px-4 py-2 text-xs font-semibold text-black backdrop-blur hover:bg-white transition-colors"
            >
              <Box className="size-3.5" />
              Open 3D CAD
            </Link>
          </div>
        </div>

        <div className="workspace-panel flex flex-col justify-between rounded-[2rem] border border-border bg-card p-7 sm:p-9 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
          <div>
            <p className="micro-label">Immediate judgment</p>
            <h2 className="mt-4 font-editorial text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
              {summary
                ? summary.comfortHoursPct >= 80
                  ? "Promising winter thermal response."
                  : "Comfort target requires envelope tuning."
                : "Ready for EnergyPlus validation."}
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#536772]">
              {summary
                ? `Latest case achieves ${summary.comfortHoursPct}% comfort hours with ${summary.heatingDemandKwhM2} kWh/m² heating demand.`
                : "Run a simulation against Ladakh winter design conditions to establish the first baseline."}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-border pt-6">
              <DataPair
                label="Winter design"
                value={`${activeProject.location.designTempWinter ?? -20.5} °C`}
              />
              <DataPair
                label="Floor area"
                value={`${(activeProject.geometry.length * activeProject.geometry.width).toFixed(1)} m²`}
              />
              <DataPair
                label="Geometry"
                value={`${activeProject.geometry.length} × ${activeProject.geometry.width} × ${activeProject.geometry.height} m`}
              />
              <DataPair
                label="Weather"
                value={activeWeather?.name || "Leh, Ladakh (WMO 427053)"}
              />
              <DataPair
                label="Openings"
                value={`${activeProject.windows.length} windows · ${activeProject.doors.length} doors`}
              />
              <DataPair
                label="Infiltration"
                value={`${activeProject.ventilation.infiltrationACH} ACH`}
              />
            </dl>
          </div>

          <div className="mt-8">
            <NextStep
              label={latestRun ? "Refine canonical model" : "Prepare first run"}
              detail={
                latestRun
                  ? "Adjust envelope insulation and solar aperture in Designer"
                  : "Confirm weather provenance and dispatch EnergyPlus"
              }
              onClick={() => router.push(latestRun ? "/designer" : "/simulations")}
            />
          </div>
        </div>
      </div>

      {/* Latest Time-series response */}
      {summary && latestRun && (
        <div className="rounded-[2rem] border border-border bg-[#CBDCE6]/50 p-6 sm:p-9">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="micro-label">Hourly response</p>
              <h2 className="text-xl font-medium">Indoor temperature curve</h2>
            </div>
            <span className="micro-label">Run {latestRun.id}</span>
          </div>
          <IndoorTemperatureChart run={latestRun} compact />
        </div>
      )}

      {/* Quick Launch Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/designer"
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-[0_10px_30px_rgba(0,0,0,.03)] transition-all hover:-translate-y-1 hover:border-[#6E818F]"
        >
          <div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
              <Wand2 className="size-5 text-foreground" />
            </span>
            <h3 className="mt-4 text-base font-semibold">13-Step Designer</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Guided sequence for geometry, walls, roof, mass, and targets.
            </p>
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            Launch wizard <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/weather"
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-[0_10px_30px_rgba(0,0,0,.03)] transition-all hover:-translate-y-1 hover:border-[#6E818F]"
        >
          <div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
              <CloudSun className="size-5 text-foreground" />
            </span>
            <h3 className="mt-4 text-base font-semibold">Weather Intelligence</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              NASA POWER and authentic Leh EPW climate files with full provenance.
            </p>
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            View climate <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/simulations"
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-[0_10px_30px_rgba(0,0,0,.03)] transition-all hover:-translate-y-1 hover:border-[#6E818F]"
        >
          <div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
              <Cpu className="size-5 text-foreground" />
            </span>
            <h3 className="mt-4 text-base font-semibold">EnergyPlus Simulation</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Sub-hourly physics-based heat balance and comfort calculations.
            </p>
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            Dispatch run <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/materials"
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-[0_10px_30px_rgba(0,0,0,.03)] transition-all hover:-translate-y-1 hover:border-[#6E818F]"
        >
          <div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
              <Layers className="size-5 text-foreground" />
            </span>
            <h3 className="mt-4 text-base font-semibold">Material Library</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Aerogel, rammed earth, and mass materials with verified properties.
            </p>
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            Explore library <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </div>
  );
}
