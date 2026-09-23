"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Cpu,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCw,
  Eye,
  GitCompare,
  Trash2,
  Zap,
  Sparkles,
  Flame,
  Calendar,
  ArrowRight,
  FolderKanban,
  X,
  Box,
  Download,
} from "lucide-react";
import { useShelterStore, SimulationJobItem, transformBackendJobToItem } from "@/lib/store/use-shelter-store";
import { simulationApi } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  ActionButton,
  DataPair,
  EmptyState,
  PageIntro,
  Status,
} from "@/components/v0/platform-components";
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";
import { AnsysDeckExportModal } from "@/components/modals/AnsysDeckExportModal";

export function SimulationsView() {
  const searchParams = useSearchParams();
  const newWithId = searchParams.get("newWith");

  const {
    projects,
    activeProjectId,
    setActiveProject,
    simulations,
    addProject,
    addSimulationJob,
    updateSimulationJob,
    removeSimulationJob,
    toggleComparisonJobId,
    comparisonJobIds,
    activeWeatherId,
    weatherDatasets,
    settings,
  } = useShelterStore();

  const [isQueueing, setIsQueueing] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [lastQueuedJobId, setLastQueuedJobId] = useState<string | null>(null);

  const [confirmTestDataModal, setConfirmTestDataModal] = useState<boolean>(false);
  const [pendingSimProject, setPendingSimProject] = useState<any>(null);
  const [ansysModalOpen, setAnsysModalOpen] = useState(false);
  const [completedSimModal, setCompletedSimModal] = useState<{
    simId: string;
    projectName: string;
    projectId?: string;
    durationSeconds?: number;
  } | null>(null);

  // Poll active simulation jobs until completion
  const pollSimulationStatus = React.useCallback(
    (simId: string, proj: any) => {
      let attempts = 0;
      const maxAttempts = 120; // Up to 5 minutes
      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusData = await simulationApi.status(simId);
          if (statusData.status === "completed") {
            clearInterval(interval);
            if (proj) {
              addProject(proj);
            }
            try {
              const results = await simulationApi.results(simId);
              const transformed = transformBackendJobToItem({ ...statusData, results }, projects);
              updateSimulationJob(simId, {
                status: "completed",
                results: transformed.results,
                completedAt: statusData.completed_at || new Date().toISOString(),
                durationSeconds: statusData.duration_seconds,
              });
            } catch (rErr) {
              console.error("Failed to fetch completed results:", rErr);
              updateSimulationJob(simId, {
                status: "completed",
                completedAt: statusData.completed_at || new Date().toISOString(),
                durationSeconds: statusData.duration_seconds,
              });
            }

            // Trigger closeable modal popup to invite user to inspect live 3D thermal field
            setCompletedSimModal({
              simId,
              projectName: proj?.project?.name || "Canonical Shelter",
              projectId: proj?.id,
              durationSeconds: statusData.duration_seconds,
            });
          } else if (statusData.status === "failed" || statusData.status === "cancelled") {
            clearInterval(interval);
            updateSimulationJob(simId, {
              status: "failed",
              error: statusData.error_message || "Simulation failed during execution.",
            });
          } else {
            updateSimulationJob(simId, {
              status: statusData.status || "running",
              durationSeconds: statusData.duration_seconds,
            });
          }
        } catch (pollErr) {
          console.warn(`Polling simulation ${simId} check warning:`, pollErr);
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 2500);
    },
    [projects, updateSimulationJob, addProject]
  );

  // Auto-resume polling for any active simulation jobs in the store
  React.useEffect(() => {
    const activeJobs = simulations.filter(
      (s) => s.status === "queued" || s.status === "preparing" || s.status === "running"
    );
    activeJobs.forEach((job) => {
      pollSimulationStatus(job.id, job.shelterModel);
    });
  }, [simulations, pollSimulationStatus]);

  // Simulation Period & Timestep Configuration State
  const [periodPreset, setPeriodPreset] = useState<"quick" | "multi_3" | "multi_7" | "monthly" | "full_year" | "custom">("quick");
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(15);
  const [startMonth, setStartMonth] = useState<number>(1);
  const [startDay, setStartDay] = useState<number>(1);
  const [endMonth, setEndMonth] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(3);
  const [timestep, setTimestep] = useState<number>(4);

  const targetProject = newWithId
    ? projects.find((p) => p.id === newWithId || p.project?.id === newWithId)
    : projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  // Build unified station catalog including any synthesized microclimate EPW associated with current project
  const availableStations = React.useMemo(() => {
    const list = [...weatherDatasets];
    const projEpw = targetProject?.location?.weatherSource;
    if (projEpw && !list.some((w) => w.epwFileName === projEpw) && projEpw.startsWith("MICROCLIMATE_")) {
      const elev = targetProject?.location?.elevation || 3500;
      const reg = targetProject?.location?.region || targetProject?.project?.name || "Custom Himalayan Outpost";
      list.unshift({
        id: `wx-proj-custom-${targetProject.id}`,
        name: `${reg.split(",")[0]} (${Math.round(elev)}m · Synthesized ML EPW)`,
        region: `${reg} (Project Weather Source)`,
        latitude: targetProject?.location?.latitude || 34.15,
        longitude: targetProject?.location?.longitude || 77.58,
        elevationM: elev,
        climateZone: elev > 4500 ? "Extreme Cold Alpine (ASHRAE 8)" : "Cold / Sub-Arctic",
        sourceType: "EPW",
        provenanceStatus: "REAL_DATA",
        isTestData: false,
        designWinterMinC: targetProject?.location?.designTempWinter || -25.0,
        designSummerMaxC: targetProject?.location?.designTempSummer || 22.0,
        annualHDD18: 5500,
        epwFileName: projEpw,
      });
    }
    return list;
  }, [weatherDatasets, targetProject]);

  const [selectedStationId, setSelectedStationId] = useState<string>(activeWeatherId || "wx-leh-427053");

  // Keep selected station in sync when target project changes or specifies a custom weather source
  React.useEffect(() => {
    if (targetProject?.location?.weatherSource) {
      const match = availableStations.find((w) => w.epwFileName === targetProject.location?.weatherSource);
      if (match) {
        setSelectedStationId(match.id);
        return;
      }
    }
    if (activeWeatherId && availableStations.some((w) => w.id === activeWeatherId)) {
      setSelectedStationId(activeWeatherId);
    } else if (availableStations[0]) {
      setSelectedStationId(availableStations[0].id);
    }
  }, [targetProject, activeWeatherId, availableStations]);

  const handleQueueSimulation = async (
    projToSim = targetProject || projects[0],
    allowTestData = false,
    overrideStationId?: string
  ) => {
    if (!projToSim) return;

    const stationIdToUse = overrideStationId || selectedStationId || activeWeatherId;
    const matchedStation =
      availableStations.find((w) => w.id === stationIdToUse) ||
      availableStations.find((w) => w.epwFileName === projToSim.location?.weatherSource) ||
      availableStations[0];

    const weatherFileName =
      matchedStation?.epwFileName ||
      projToSim.location?.weatherSource ||
      "IND_JK_Leh.427053_TMYx.epw";

    const isTestData =
      weatherFileName.toLowerCase().includes("test_weather") || Boolean(matchedStation?.isTestData);

    // Weather Data Policy Enforcement: Never silently use test weather
    if (isTestData && !allowTestData) {
      setPendingSimProject(projToSim);
      setConfirmTestDataModal(true);
      return;
    }

    setIsQueueing(true);
    setQueueError(null);
    setConfirmTestDataModal(false);

    try {
      let periodType = "quick";
      let runPeriodDays = 1;
      let sMonth = startMonth;
      let sDay = startDay;
      let eMonth = endMonth;
      let eDay = endDay;
      let isAnnual = false;

      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const maxDaysThisMonth = daysInMonth[selectedMonth - 1] || 31;

      if (periodPreset === "quick") {
        periodType = "quick";
        runPeriodDays = 1;
        sMonth = selectedMonth;
        sDay = Math.min(maxDaysThisMonth, Math.max(1, selectedDay));
        eMonth = selectedMonth;
        eDay = sDay;
      } else if (periodPreset === "multi_3") {
        periodType = "multi_day";
        runPeriodDays = 3;
        sMonth = selectedMonth;
        sDay = Math.min(Math.max(1, maxDaysThisMonth - 2), Math.max(1, selectedDay));
        eMonth = selectedMonth;
        eDay = sDay + 2;
      } else if (periodPreset === "multi_7") {
        periodType = "multi_day";
        runPeriodDays = 7;
        sMonth = selectedMonth;
        sDay = Math.min(Math.max(1, maxDaysThisMonth - 6), Math.max(1, selectedDay));
        eMonth = selectedMonth;
        eDay = sDay + 6;
      } else if (periodPreset === "monthly") {
        periodType = "monthly";
        sMonth = selectedMonth;
        sDay = 1;
        eMonth = selectedMonth;
        eDay = maxDaysThisMonth;
        runPeriodDays = eDay;
      } else if (periodPreset === "full_year") {
        periodType = "full_year";
        isAnnual = true;
        runPeriodDays = 365;
        sMonth = 1;
        sDay = 1;
        eMonth = 12;
        eDay = 31;
      } else if (periodPreset === "custom") {
        periodType = "custom";
        sMonth = startMonth;
        sDay = startDay;
        eMonth = endMonth;
        eDay = endDay;
        runPeriodDays = Math.max(1, (endMonth - startMonth) * 30 + (endDay - startDay + 1));
      }

      const payload = {
        shelter_model: projToSim,
        weather_file: weatherFileName,
        period_type: periodType,
        run_period_days: runPeriodDays,
        start_month: sMonth,
        start_day: sDay,
        end_month: eMonth,
        end_day: eDay,
        timestep: timestep,
        is_annual: isAnnual,
        timeout_seconds: isAnnual ? 1800 : 600,
        allow_test_data: allowTestData,
      };

      const data = await simulationApi.queue(payload);
      const simId = data.simulation_id || `sim-${Date.now().toString().slice(-6)}`;
      setLastQueuedJobId(simId);

      const isTest = isTestData || matchedStation?.isTestData;

      const newJob: SimulationJobItem = {
        id: simId,
        projectId: projToSim.id,
        projectName: projToSim.project?.name || "Canonical Shelter",
        shelterModel: projToSim,
        weatherDatasetId: matchedStation?.id || activeWeatherId,
        weatherDatasetName: matchedStation?.name || weatherFileName,
        weatherProvenance: {
          weather_source: isTest ? "TEST_DATA" : "REAL_DATA",
          status: isTest ? "TEST_DATA" : "REAL_DATA",
          is_test_data: isTest,
        },
        simulationPeriod: {
          period_type: periodType,
          is_annual: isAnnual,
          start_month: sMonth,
          start_day: sDay,
          end_month: eMonth,
          end_day: eDay,
          run_period_days: runPeriodDays,
          timestep_per_hour: timestep,
          timestep_minutes: 60 / timestep,
        },
        allowTestData: isTest,
        engine: "ThermoShelter Core",
        engineVersion: "3.0.0",
        status: "queued",
        queuedAt: new Date().toISOString(),
      };

      addProject(projToSim);
      addSimulationJob(newJob);
      pollSimulationStatus(simId, projToSim);
    } catch (err: any) {
      console.error("Queueing simulation failed:", err);
      setQueueError(err.message || "Failed to dispatch simulation to ThermoShelter engine.");
    } finally {
      setIsQueueing(false);
      setPendingSimProject(null);
    }
  };

  const handleExportModelJson = () => {
    const proj = targetProject || projects[0];
    if (!proj) return;
    const filename = `shelter_${(proj.project?.name || proj.name || "model").toLowerCase().replace(/[^a-z0-9]/g, "_")}_spec.json`;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(proj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const [filterTab, setFilterTab] = useState<"all" | "active" | "completed" | "failed">("all");

  const totalRuns = simulations.length;
  const completedRuns = simulations.filter((s) => s.status === "completed").length;
  const activeRuns = simulations.filter(
    (s) => s.status === "running" || s.status === "queued" || s.status === "preparing"
  ).length;
  const failedRuns = simulations.filter((s) => s.status === "failed").length;

  const filteredSimulations = React.useMemo(() => {
    switch (filterTab) {
      case "active":
        return simulations.filter(
          (s) => s.status === "running" || s.status === "queued" || s.status === "preparing"
        );
      case "completed":
        return simulations.filter((s) => s.status === "completed");
      case "failed":
        return simulations.filter((s) => s.status === "failed");
      default:
        return simulations;
    }
  }, [simulations, filterTab]);

  const renderStatusBadge = (status: string, error?: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="size-3 text-emerald-600" />
            Completed
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300 border border-sky-500/30 animate-pulse">
            <RotateCw className="size-3 animate-spin text-sky-600" />
            Running
          </span>
        );
      case "queued":
      case "preparing":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground border border-border px-2.5 py-0.5 text-[10px] font-semibold">
            <Clock className="size-3" />
            Queued
          </span>
        );
      case "failed":
        return (
          <div className="flex flex-col gap-0.5">
            <span
              title={error || "Simulation failed during execution"}
              className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm cursor-help"
            >
              <AlertCircle className="size-3" />
              Failed
            </span>
            {error && (
              <span className="text-[9px] text-rose-400 font-mono max-w-[170px] truncate" title={error}>
                {error}
              </span>
            )}
          </div>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground border border-border px-2.5 py-0.5 text-[10px] font-semibold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* V0 Page Intro */}
      <PageIntro
        eyebrow="Validated ThermoShelter Core Dispatch"
        title="Run thermal simulation"
        description="Send the canonical model to the physics simulation engine with explicit period, timestep resolution, and authentic weather provenance."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <ActionButton
              tone="secondary"
              onClick={handleExportModelJson}
              className="rounded-full text-xs font-semibold"
            >
              <Download className="size-3.5" />
              Export Model JSON
            </ActionButton>
            <ActionButton
              tone="secondary"
              onClick={() => setAnsysModalOpen(true)}
              className="rounded-full text-xs font-semibold"
            >
              <Cpu className="size-3.5" />
              Export ANSYS Deck (.jou / .mac)
            </ActionButton>
            <Link href="/designer">
              <ActionButton tone="primary" className="rounded-full text-xs font-semibold">
                <Play className="size-3.5" />
                Designer Wizard
              </ActionButton>
            </Link>
          </div>
        }
      />

      {/* 4-Stage Progress Banner */}
      <div className="grid grid-cols-4 gap-3">
        {["Validate Model", "Prepare IDF", "Dispatch Engine", "Process Outputs"].map(
          (stage, index) => (
            <div key={stage} className="rounded-xl border border-border bg-card p-3">
              <div
                className={`h-1 rounded-full ${
                  isQueueing && index < 3
                    ? "bg-[#6E818F] animate-pulse"
                    : index === 0
                    ? "bg-foreground"
                    : "bg-border"
                }`}
              />
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                0{index + 1} · {stage}
              </p>
            </div>
          )
        )}
      </div>

      {/* Latest Completed Run Milestone Banner */}
      {(() => {
        const latestRun = simulations.find(
          (s) => s.projectId === targetProject?.id && s.status === "completed" && s.results
        ) || simulations.find((s) => s.status === "completed" && s.results);

        if (!latestRun) return null;

        return (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Status strong>Simulation Validated · Run {latestRun.id}</Status>
                <span className="text-[10px] text-[#6E818F]">ThermoShelter Core Solver</span>
              </div>
              <h3 className="font-editorial text-2xl font-medium tracking-tight text-foreground">
                Thermal Performance Ready for Analysis
              </h3>
              <p className="text-xs text-[#536772]">
                Achieves <strong className="text-foreground">{latestRun.results?.summary.comfortHoursPct}%</strong> comfort hours with <strong className="text-foreground">{latestRun.results?.summary.heatingDemandKwhM2} kWh/m²</strong> heating demand under Leh Ladakh winter conditions.
              </p>
            </div>
            <Link
              href={`/results?jobId=${latestRun.id}`}
              className="group inline-flex items-center gap-2.5 rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6E818F] shrink-0"
            >
              <Sparkles className="size-3.5 text-[#CBDCE6]" />
              <span>View Results Analytics</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        );
      })()}

      {/* Quick Simulation Dispatch Card for Targeted Project */}
      {targetProject && (
        <div className="rounded-[2rem] border border-border bg-card p-7 sm:p-9 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Status strong>Model ready</Status>
                  <span className="font-mono text-xs text-muted-foreground">{targetProject.id}</span>
                </div>
                <h2 className="mt-3 text-2xl font-medium tracking-tight">
                  {targetProject.project?.name || targetProject.id}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Geometry: {targetProject.geometry?.length}m × {targetProject.geometry?.width}m × {targetProject.geometry?.height}m · Weather: {availableStations.find((w) => w.id === selectedStationId)?.name || targetProject.location?.weatherSource || "Leh WMO Station 427053 (TMYx)"}
                </p>
              </div>

              <ActionButton
                onClick={() => handleQueueSimulation(targetProject)}
                disabled={isQueueing}
                tone="primary"
                className="rounded-full px-6 text-xs font-bold shrink-0"
              >
                {isQueueing ? (
                  <>
                    <RotateCw className="size-4 animate-spin" />
                    Dispatching ThermoShelter Core…
                  </>
                ) : (
                  <>
                    <Play className="size-4" />
                    Queue Simulation
                  </>
                )}
              </ActionButton>
            </div>

            {/* Period & Timestep Configuration Controls */}
            <div className="border-t border-border pt-5 space-y-4">
              <div>
                <span className="micro-label block mb-2">Simulation Period</span>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "quick", label: "24h (1 Day)" },
                    { id: "multi_3", label: "3 Days" },
                    { id: "multi_7", label: "7 Days" },
                    { id: "monthly", label: "1 Month" },
                    { id: "full_year", label: "Full Year (8,760h)" },
                    { id: "custom", label: "Custom Range" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriodPreset(p.id as any)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                        periodPreset === p.id
                          ? "bg-foreground text-background"
                          : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

                {/* Sub-inputs for 24h Quick Run */}
                {periodPreset === "quick" && (
                  <div className="space-y-2 bg-secondary/50 p-3.5 rounded-2xl border border-border text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-muted-foreground font-medium">24h Simulation Date:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px]">Month:</span>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="bg-card border border-border text-foreground rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#6E818F]"
                        >
                          {[
                            "January (Peak Winter Heating)", "February (Late Winter)", "March (Spring Thaw)", "April (Early Spring)",
                            "May (Spring Transition)", "June (Early Summer)", "July (Peak Summer Solar)", "August (Late Summer)",
                            "September (Autumn Transition)", "October (Early Cold)", "November (Pre-Winter Freeze)", "December (Deep Winter)"
                          ].map((mName, idx) => (
                            <option key={idx + 1} value={idx + 1}>{mName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px]">Day:</span>
                        <input
                          type="number"
                          min={1}
                          max={[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][selectedMonth - 1] || 31}
                          value={selectedDay}
                          onChange={(e) => setSelectedDay(Math.max(1, Math.min([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][selectedMonth - 1] || 31, Number(e.target.value))))}
                          className="w-14 bg-card border border-border rounded-xl px-2.5 py-1 text-center text-foreground text-xs"
                        />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        {selectedMonth === 1 ? "❄️ ASHRAE 99.6% Winter Sizing Datum" : selectedMonth === 7 ? "☀️ Peak Summer Solar Check" : "🍃 Shoulder Season"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {selectedMonth === 1 && selectedDay === 15
                        ? "Default is Jan 15 (standard ASHRAE 99.6% / ISHRAE peak winter heating design day benchmark for Leh/Ladakh). You can switch to July for summer overheating or any other month."
                        : `Simulating a 24-hour diurnal cycle for Month ${selectedMonth}, Day ${selectedDay}.`}
                    </p>
                  </div>
                )}

                {/* Sub-inputs for Multi-Day (3 or 7 Days) */}
                {(periodPreset === "multi_3" || periodPreset === "multi_7") && (
                  <div className="space-y-2 bg-secondary/50 p-3.5 rounded-2xl border border-border text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-muted-foreground font-medium">Start Date:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px]">Month:</span>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="bg-card border border-border text-foreground rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#6E818F]"
                        >
                          {[
                            "January", "February", "March", "April",
                            "May", "June", "July", "August",
                            "September", "October", "November", "December"
                          ].map((mName, idx) => (
                            <option key={idx + 1} value={idx + 1}>{mName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px]">Start Day:</span>
                        <input
                          type="number"
                          min={1}
                          max={([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][selectedMonth - 1] || 31) - (periodPreset === "multi_3" ? 2 : 6)}
                          value={selectedDay}
                          onChange={(e) => setSelectedDay(Math.max(1, Math.min(28, Number(e.target.value))))}
                          className="w-14 bg-card border border-border rounded-xl px-2.5 py-1 text-center text-foreground text-xs"
                        />
                      </div>
                      <span className="text-muted-foreground text-[11px]">
                        ({periodPreset === "multi_3" ? "3 consecutive days" : "7 consecutive days"} starting {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][selectedMonth - 1]} {selectedDay})
                      </span>
                    </div>
                  </div>
                )}

                {/* Sub-inputs for Monthly */}
                {periodPreset === "monthly" && (
                  <div className="flex items-center gap-3 bg-secondary/50 p-3 rounded-2xl border border-border text-xs">
                    <span className="text-muted-foreground font-medium">Select Month:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-card border border-border text-foreground rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#6E818F]"
                    >
                      {[
                        "January (31d)", "February (28d)", "March (31d)", "April (30d)",
                        "May (31d)", "June (30d)", "July (31d)", "August (31d)",
                        "September (30d)", "October (31d)", "November (30d)", "December (31d)"
                      ].map((mName, idx) => (
                        <option key={idx + 1} value={idx + 1}>{mName}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sub-inputs for Custom */}
                {periodPreset === "custom" && (
                  <div className="flex flex-wrap items-center gap-4 bg-secondary/50 p-3 rounded-2xl border border-border text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Start (Month / Day):</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={startMonth}
                        onChange={(e) => setStartMonth(Number(e.target.value))}
                        className="w-12 bg-card border border-border rounded-lg px-2 py-1 text-center text-foreground text-xs"
                      />
                      <span>/</span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={startDay}
                        onChange={(e) => setStartDay(Number(e.target.value))}
                        className="w-12 bg-card border border-border rounded-lg px-2 py-1 text-center text-foreground text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">End (Month / Day):</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={endMonth}
                        onChange={(e) => setEndMonth(Number(e.target.value))}
                        className="w-12 bg-card border border-border rounded-lg px-2 py-1 text-center text-foreground text-xs"
                      />
                      <span>/</span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={endDay}
                        onChange={(e) => setEndDay(Number(e.target.value))}
                        className="w-12 bg-card border border-border rounded-lg px-2 py-1 text-center text-foreground text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Timestep selection */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mr-1">
                    <Clock className="h-3.5 w-3.5 text-[#6E818F]" />
                    Timestep:
                  </span>
                  {[
                    { steps: 4, label: "15 min (4 / hr)" },
                    { steps: 1, label: "60 min (1 / hr)" },
                    { steps: 2, label: "30 min (2 / hr)" },
                    { steps: 6, label: "10 min (6 / hr)" },
                  ].map((ts) => (
                    <button
                      key={ts.steps}
                      type="button"
                      onClick={() => setTimestep(ts.steps)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        timestep === ts.steps
                          ? "bg-foreground text-background shadow-sm"
                          : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {ts.label}
                    </button>
                  ))}
                </div>

                {/* Weather Station selection */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <span className="micro-label block">Target Climate & Weather Station</span>
                    {targetProject?.location?.weatherSource?.startsWith("MICROCLIMATE_") && (
                      <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                        <Sparkles className="size-3 text-sky-500 animate-pulse" />
                        Custom Physics-Informed Microclimate EPW Active
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {availableStations.map((ws) => {
                      const isCustomEpw =
                        ws.epwFileName?.startsWith("MICROCLIMATE_") ||
                        ws.id.startsWith("wx-proj-custom-") ||
                        ws.id.startsWith("wx-micro-") ||
                        ws.sourceType === "MICROCLIMATE_PIML";
                      const isSelected = selectedStationId === ws.id;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => setSelectedStationId(ws.id)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-2 ${
                            isSelected
                              ? isCustomEpw
                                ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-400/40 font-bold"
                                : "bg-foreground text-background shadow-sm"
                              : isCustomEpw
                              ? "border border-sky-400/50 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
                              : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <span
                            className={`inline-block size-2 rounded-full ${
                              ws.isTestData ? "bg-amber-400" : isCustomEpw ? "bg-cyan-400 animate-pulse" : "bg-emerald-400"
                            }`}
                          />
                          {isCustomEpw && <Sparkles className="size-3 text-cyan-300 shrink-0" />}
                          <span>{ws.name}</span>
                          {isCustomEpw && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold ${
                                isSelected
                                  ? "bg-white/25 text-white"
                                  : "bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200"
                              }`}
                            >
                              Synthesized
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {queueError && (
                <div className="mt-3 rounded-2xl border-2 border-rose-500/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-900 dark:text-rose-100 flex items-start gap-3 shadow-md">
                  <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-rose-700 dark:text-rose-300">Simulation Queue Error</p>
                    <p className="leading-relaxed font-mono text-[11px] text-rose-800 dark:text-rose-300 bg-white/70 dark:bg-black/40 p-2.5 rounded-xl border border-rose-300 dark:border-rose-900">
                      {queueError}
                    </p>
                  </div>
                </div>
              )}

              {lastQueuedJobId && (
                <div className="mt-3 rounded-2xl border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs text-emerald-950 dark:text-emerald-100 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Simulation job <strong className="font-mono text-foreground font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-black/50 border border-emerald-500/30">{lastQueuedJobId}</strong> dispatched successfully!
                    </span>
                  </div>
                  <Link href={`/results?jobId=${lastQueuedJobId}`}>
                    <ActionButton tone="primary" className="rounded-full px-4 py-1.5 text-xs font-bold shadow-sm">
                      <Eye className="size-3.5" />
                      View Results
                    </ActionButton>
                  </Link>
                </div>
              )}
            </div>
          </div>
      )}

      {/* Queue Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setFilterTab("active")}
          className={`rounded-[2rem] border text-left p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)] transition-all cursor-pointer ${
            filterTab === "active"
              ? "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/20"
              : "border-border bg-card hover:border-sky-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Queue</span>
            {activeRuns > 0 && <RotateCw className="size-3.5 text-sky-500 animate-spin" />}
          </div>
          <div className="text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400 mt-2">{activeRuns}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Executing in background</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("completed")}
          className={`rounded-[2rem] border text-left p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)] transition-all cursor-pointer ${
            filterTab === "completed"
              ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
              : "border-border bg-card hover:border-emerald-500/50"
          }`}
        >
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completed Runs</div>
          <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-2">{completedRuns}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Validated thermal records</p>
        </button>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Engine In Use</div>
          <div className="text-base font-bold text-foreground mt-2">ThermoShelter Core</div>
          <p className="text-[10px] text-muted-foreground mt-1">High-altitude solver & heat balance</p>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Selected for Compare</div>
          <div className="text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400 mt-2">{comparisonJobIds.length}</div>
          <Link href="/comparison" className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline mt-1 inline-block font-semibold">
            Open Comparison &rarr;
          </Link>
        </div>
      </div>

      {/* Active Queue Live Progress Banner */}
      {activeRuns > 0 && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <RotateCw className="size-4 text-sky-500 animate-spin shrink-0" />
            <div>
              <span className="font-bold text-foreground">
                {activeRuns} {activeRuns === 1 ? "simulation is" : "simulations are"} currently active in the execution queue.
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ThermoShelter thermodynamic balance equations are executing in isolated processes. Results will auto-update upon convergence.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilterTab("active")}
            className="rounded-full text-xs font-semibold shrink-0 cursor-pointer"
          >
            View Active Queue ({activeRuns})
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 p-1">
          {[
            { id: "all", label: `All Jobs (${totalRuns})` },
            { id: "active", label: `Active Queue (${activeRuns})` },
            { id: "completed", label: `Completed (${completedRuns})` },
            { id: "failed", label: `Failed (${failedRuns})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id as any)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                filterTab === tab.id
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          Showing {filteredSimulations.length} of {totalRuns} jobs
        </span>
      </div>

      {/* Simulations Table */}
      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Project Model</TableHead>
                <TableHead>Weather Station</TableHead>
                <TableHead>Period & Timestep</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSimulations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    {filterTab === "active"
                      ? "No active simulations in queue. Dispatch one above or from the 3D Designer."
                      : filterTab === "completed"
                      ? "No completed simulation runs found."
                      : filterTab === "failed"
                      ? "No failed simulation runs."
                      : "No simulation jobs found. Launch one from the Designer or Project Details."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSimulations.map((sim) => {
                  const isCompared = comparisonJobIds.includes(sim.id);
                  return (
                    <TableRow key={sim.id}>
                      <TableCell className="font-mono text-xs text-slate-300 font-semibold">
                        {sim.id}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-white text-xs">{sim.projectName}</div>
                        <div className="text-[10px] text-slate-500">{sim.shelterModel?.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-300 font-medium">{sim.weatherDatasetName}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {sim.weatherProvenance?.is_test_data || sim.allowTestData ? (
                            <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-500 ring-1 ring-inset ring-amber-500/20">
                              TEST DATA
                            </span>
                          ) : sim.weatherProvenance?.weather_source === "USER_DEFINED" ? (
                            <span className="inline-flex items-center rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-bold text-purple-400 ring-1 ring-inset ring-purple-500/20">
                              USER-DEFINED
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                              REAL DATA
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-slate-200">
                            {sim.simulationPeriod?.is_annual
                              ? "Full Year (8,760h)"
                              : sim.simulationPeriod?.period_type === "quick"
                              ? `24 Hours (${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(sim.simulationPeriod.start_month || 1) - 1]} ${sim.simulationPeriod.start_day || 15})`
                              : sim.simulationPeriod?.period_type === "monthly"
                              ? `1 Month (${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(sim.simulationPeriod.start_month || 1) - 1]})`
                              : `${sim.simulationPeriod?.run_period_days || 3} Days (${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(sim.simulationPeriod?.start_month || 1) - 1]} ${sim.simulationPeriod?.start_day || 1})`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sim.simulationPeriod?.timestep_minutes
                              ? `${sim.simulationPeriod.timestep_minutes}m (${sim.simulationPeriod.timestep_per_hour}/hr)`
                              : "15m (4/hr)"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-400">
                          {sim.engine === "EnergyPlus" ? "ThermoShelter Core" : (sim.engine || "ThermoShelter Core")}
                        </span>
                        <span className="ml-1 text-[10px] text-slate-500">
                          v{sim.engine === "EnergyPlus" ? "3.0.0" : (sim.engineVersion || "3.0.0")}
                        </span>
                      </TableCell>
                      <TableCell>{renderStatusBadge(sim.status, sim.error)}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {sim.durationSeconds ? `${sim.durationSeconds.toFixed(1)}s` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {sim.shelterModel && (
                            projects.some((p) => p.id === sim.shelterModel?.id || p.id === sim.projectId) ? (
                              <span
                                className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                                title="Project is saved in Projects library"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Saved
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (sim.shelterModel) {
                                    addProject(sim.shelterModel);
                                  }
                                }}
                                className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40"
                                title="Save this model to Projects library"
                              >
                                <FolderKanban className="h-3 w-3" />
                                Save
                              </Button>
                            )
                          )}
                          {sim.status === "completed" && (
                            <>
                              <Link href={`/results?jobId=${sim.id}`}>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                                  <Eye className="h-3.5 w-3.5 text-blue-400" />
                                  Results
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant={isCompared ? "default" : "secondary"}
                                onClick={() => toggleComparisonJobId(sim.id)}
                                className="h-7 text-xs gap-1"
                              >
                                <GitCompare className="h-3 w-3" />
                                {isCompared ? "Compared" : "Compare"}
                              </Button>
                            </>
                          )}
                          {sim.status === "failed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const proj = sim.shelterModel || targetProject;
                                if (proj) {
                                  handleQueueSimulation(proj, sim.allowTestData, sim.weatherDatasetId);
                                }
                              }}
                              className="h-7 text-xs gap-1 border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
                              title="Re-run simulation with verified weather dataset"
                            >
                              <RotateCw className="h-3 w-3" />
                              Retry
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSimulationJob(sim.id)}
                            className="h-7 w-7 p-0 text-red-400 hover:bg-red-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </div>

      {/* Weather Data Policy: Explicit Confirmation Modal for Test Datasets */}
      {confirmTestDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-7 shadow-2xl space-y-4 text-foreground">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-semibold text-foreground">Weather Data Policy Confirmation</h3>
            </div>
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                The selected weather dataset is classified as <span className="font-semibold text-amber-600 dark:text-amber-400">TEST DATA</span> (synthetic Denver fixture).
              </p>
              <p className="rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                Under platform engineering policy, production building simulations must NEVER silently use synthetic test weather.
                Real high-altitude thermal sizing requires authentic climate data (EPW or NASA POWER).
              </p>
              <p>
                Do you explicitly confirm that you want to execute a test simulation using this dataset?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <ActionButton
                tone="quiet"
                onClick={() => {
                  setConfirmTestDataModal(false);
                  setPendingSimProject(null);
                }}
              >
                Cancel
              </ActionButton>
              <ActionButton
                tone="primary"
                onClick={() => {
                  if (pendingSimProject) {
                    handleQueueSimulation(pendingSimProject, true);
                  }
                }}
              >
                Confirm & Run With Test Data
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* ANSYS Validation Deck Export Modal */}
      <AnsysDeckExportModal open={ansysModalOpen} onOpenChange={setAnsysModalOpen} />

      {/* Simulation Completed: Go to 3D Thermal Designer Popup Modal */}
      {completedSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-lg rounded-[2.5rem] border border-amber-500/40 bg-card p-8 shadow-[0_25px_70px_rgba(0,0,0,0.5)] space-y-6 text-foreground">
            {/* Close Button 'X' */}
            <button
              type="button"
              onClick={() => setCompletedSimModal(null)}
              className="absolute top-6 right-6 h-8 w-8 rounded-full border border-border bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Badge & Icon */}
            <div className="flex items-start gap-4 pr-8">
              <div className="size-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/25 to-red-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-inner shrink-0">
                <Flame className="size-7 text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    SIMULATION COMPLETED
                  </span>
                  {completedSimModal.durationSeconds && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {completedSimModal.durationSeconds.toFixed(1)}s
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  3D Live Thermal Field Ready
                </h3>
                <p className="text-xs text-muted-foreground">
                  Job <span className="font-mono font-bold text-foreground">{completedSimModal.simId}</span> · {completedSimModal.projectName}
                </p>
              </div>
            </div>

            {/* Explanation & Features Card */}
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-2.5">
              <p className="text-xs text-foreground leading-relaxed font-medium">
                ThermoShelter Core has finished computing all envelope heat fluxes, solar aperture harvests, and surface temperatures.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-background/60 border border-border">
                  <Eye className="size-3.5 text-orange-500 shrink-0" />
                  <span>FLIR thermal contour map</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-background/60 border border-border">
                  <Clock className="size-3.5 text-sky-500 shrink-0" />
                  <span>24-Hour hourly scrubber</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-background/60 border border-border">
                  <Box className="size-3.5 text-purple-500 shrink-0" />
                  <span>ISO 10211 thermal bridge vectors</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-background/60 border border-border">
                  <Flame className="size-3.5 text-amber-500 shrink-0" />
                  <span>Real surface temperatures</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setCompletedSimModal(null)}
                className="w-full sm:w-auto rounded-full text-xs font-semibold px-5 h-10 border-border hover:bg-secondary"
              >
                Close & Stay Here
              </Button>
              <Link
                href={`/designer/3d?mode=thermal${completedSimModal.projectId ? `&projectId=${completedSimModal.projectId}` : ""}`}
                onClick={() => {
                  if (completedSimModal.projectId) {
                    setActiveProject(completedSimModal.projectId);
                  }
                  setCompletedSimModal(null);
                }}
                className="w-full sm:w-auto"
              >
                <Button
                  className="w-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white font-bold text-xs px-6 h-10 shadow-lg shadow-orange-500/25 hover:from-amber-600 hover:via-orange-600 hover:to-rose-700 gap-2"
                >
                  <Box className="size-4" />
                  Open 3D Thermal Designer &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Connected Linear Workflow Footer */}
      <WorkflowFooter customNextLabel="Analyze Thermal Results" customNextHref="/results" />
    </div>
  );
}
