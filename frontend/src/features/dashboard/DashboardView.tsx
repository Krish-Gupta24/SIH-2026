"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Box,
  CloudSun,
  Cpu,
  Layers,
  Mountain,
  Wand2,
  ChevronDown,
  FolderKanban,
  Check,
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
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";
import { motion } from "framer-motion";
import { PulseBeacon } from "@/components/motion/MotionWrappers";

export function DashboardView() {
  const router = useRouter();
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [showEnvironment, setShowEnvironment] = useState(true);

  const {
    projects,
    activeProjectId,
    setActiveProject,
    weatherDatasets,
    activeWeatherId,
    setActiveWeather,
    simulations,
  } = useShelterStore();

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  // Dynamically resolve the weather station corresponding to the active project
  const projectWeather = useMemo(() => {
    if (!activeProject) return weatherDatasets[0];
    const src = activeProject.location?.weatherSource?.toLowerCase() || "";
    const reg = activeProject.location?.region?.toLowerCase() || "";

    const byEpw = weatherDatasets.find(
      (w) => w.epwFileName && src.includes(w.epwFileName.toLowerCase())
    );
    if (byEpw) return byEpw;

    const byId = weatherDatasets.find(
      (w) => w.id && (src === w.id.toLowerCase() || w.id.toLowerCase().includes(src))
    );
    if (byId) return byId;

    const byRegion = weatherDatasets.find(
      (w) =>
        (w.region && reg && (reg.includes(w.region.toLowerCase()) || w.region.toLowerCase().includes(reg))) ||
        (w.name && reg && (reg.includes(w.name.toLowerCase()) || w.name.toLowerCase().includes(reg)))
    );
    if (byRegion) return byRegion;

    return weatherDatasets.find((w) => w.id === activeWeatherId) || weatherDatasets[0];
  }, [activeProject, weatherDatasets, activeWeatherId]);

  const handleSelectProject = (projectId: string) => {
    setActiveProject(projectId);
    setProjectPickerOpen(false);

    const target = projects.find((p) => p.id === projectId);
    if (target?.location?.weatherSource) {
      const matchWx = weatherDatasets.find(
        (w) =>
          (w.epwFileName && target.location.weatherSource.toLowerCase().includes(w.epwFileName.toLowerCase())) ||
          w.id === target.location.weatherSource
      );
      if (matchWx) {
        setActiveWeather(matchWx.id);
      }
    }
  };

  const projectRuns = simulations.filter(
    (s) => s.projectId === activeProject?.id
  );
  const latestRun =
    projectRuns.find((s) => s.status === "completed" && s.results) || null;
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

  const geomLength = Number(activeProject.geometry?.length ?? (activeProject.geometry as any)?.lengthM ?? 6);
  const geomWidth = Number(activeProject.geometry?.width ?? (activeProject.geometry as any)?.widthM ?? 4);
  const geomHeight = Number(activeProject.geometry?.height ?? (activeProject.geometry as any)?.wallHeightM ?? 2.8);
  const roofType = activeProject.geometry?.roofType || "Gable";
  const floorArea = (geomLength * geomWidth).toFixed(1);

  const windows = activeProject.windows || activeProject.openings?.windows || [];
  const doors = activeProject.doors || activeProject.openings?.doors || [];
  const infiltrationVal =
    activeProject.ventilation?.infiltrationACH ??
    (activeProject.ventilation as any)?.infiltrationRateAch ??
    0.25;

  return (
    <div className="space-y-10">
      <PageIntro
        title="Overview"
        description="Canonical model readiness, climate context, latest thermal performance, and traceable validation sequence."
        action={
          <div className="relative">
            <button
              type="button"
              onClick={() => setProjectPickerOpen(!projectPickerOpen)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-secondary cursor-pointer"
            >
              <FolderKanban className="size-3.5 text-foreground" />
              <span className="font-semibold max-w-[200px] truncate">{activeProject.project?.name || activeProject.name}</span>
              <ChevronDown className={`size-3 transition-transform ${projectPickerOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        }
      />

      {/* Main Feature Grid: 3D Scene + Immediate Judgment */}
      <div className="workspace-feature-grid grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative min-h-[480px] overflow-hidden rounded-[2rem] border border-border bg-[#c9d8e4] shadow-[0_24px_70px_rgba(0,0,0,.08)] hover:shadow-[0_28px_80px_rgba(0,0,0,.12)] transition-shadow"
        >
          <ShelterScene project={activeProject} wireframe={false} showEnvironment={showEnvironment} />
          <div className="absolute left-5 top-5 flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 backdrop-blur shadow-sm border border-black/5">
              <PulseBeacon color="emerald" size="sm" />
              <Status strong>Model ready</Status>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-[11px] font-mono font-bold text-[#101820] backdrop-blur shadow-sm border border-black/5">
              <span>
                {geomLength.toFixed(1)} × {geomWidth.toFixed(1)} × {geomHeight.toFixed(1)} m · {roofType}
              </span>
            </div>
          </div>
          <div className="absolute bottom-5 right-5 flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => setShowEnvironment((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold backdrop-blur shadow-sm border transition-all cursor-pointer ${
                showEnvironment
                  ? "border-sky-500/30 bg-slate-900/90 text-white hover:bg-black"
                  : "border-black/10 bg-white/90 text-[#101820] hover:bg-white"
              }`}
              title="Toggle Himalayan site terrain and mountain environment"
            >
              <Mountain className={`size-3.5 ${showEnvironment ? "text-sky-400" : "text-muted-foreground"}`} />
              <span>{showEnvironment ? "Himalayan Site ON" : "Site: Off"}</span>
            </motion.button>
            <Link
              href="/designer/3d"
              className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-white/90 px-4 py-2 text-xs font-semibold text-black backdrop-blur hover:bg-white hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm"
            >
              <Box className="size-3.5" />
              Open 3D CAD
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="workspace-panel flex flex-col justify-between rounded-[2rem] border border-border bg-card p-7 sm:p-9 shadow-[0_20px_55px_rgba(0,0,0,.04)] hover:shadow-md transition-shadow"
        >
          <div>
            <p className="micro-label">Immediate judgment</p>
            <h2 className="mt-4 font-editorial text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
              {summary
                ? summary.comfortHoursPct >= 80
                  ? "Promising winter thermal response."
                  : "Comfort target requires envelope tuning."
                : "Ready for ThermoShelter validation."}
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#536772]">
              {summary
                ? `Latest case achieves ${summary.comfortHoursPct}% comfort hours with ${summary.heatingDemandKwhM2} kWh/m² heating demand.`
                : "Run a simulation against Ladakh winter design conditions to establish the first baseline."}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-border pt-6">
              <DataPair
                label="Winter design"
                value={`${activeProject.location?.designTempWinter ?? projectWeather?.designWinterMinC ?? -20.5} °C`}
              />
              <DataPair
                label="Floor area"
                value={`${floorArea} m²`}
              />
              <DataPair
                label="Geometry"
                value={`${geomLength.toFixed(1)} × ${geomWidth.toFixed(1)} × ${geomHeight.toFixed(1)} m`}
              />
              <DataPair
                label="Weather"
                value={projectWeather?.name || activeProject.location?.region || "Leh, Ladakh (WMO 427053)"}
              />
              <DataPair
                label="Openings"
                value={`${windows.length} windows · ${doors.length} doors`}
              />
              <DataPair
                label="Infiltration"
                value={`${infiltrationVal} ACH`}
              />
            </dl>
          </div>

          <div className="mt-8">
            <NextStep
              bold
              label={latestRun ? "Refine model" : "Prepare first run"}
              detail={
                latestRun
                  ? "Adjust envelope insulation and solar aperture in Designer"
                  : "Confirm weather provenance and dispatch ThermoShelter"
              }
              onClick={() => router.push(latestRun ? "/designer" : "/simulations")}
            />
          </div>
        </motion.div>
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
      {/* Connected Pipeline Footer */}
      <WorkflowFooter customNextLabel="Review Climate & Site" customNextHref="/weather" />
    </div>
  );
}
