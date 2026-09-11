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

export function SimulationsView() {
  const searchParams = useSearchParams();
  const newWithId = searchParams.get("newWith");

  const {
    projects,
    activeProjectId,
    simulations,
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
    [projects, updateSimulationJob]
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
  const [startMonth, setStartMonth] = useState<number>(1);
  const [startDay, setStartDay] = useState<number>(1);
  const [endMonth, setEndMonth] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(3);
  const [timestep, setTimestep] = useState<number>(4);

  const targetProject = newWithId
    ? projects.find((p) => p.id === newWithId || p.project?.id === newWithId)
    : projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  const handleQueueSimulation = async (projToSim = targetProject || projects[0], allowTestData = false) => {
    if (!projToSim) return;

    const weatherFileName = projToSim.location?.weatherSource || "IND_JK_Leh.420270_ISHRAE.epw";
    const isTestData = weatherFileName.toLowerCase().includes("test_weather");

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

      if (periodPreset === "quick") {
        periodType = "quick";
        runPeriodDays = 1;
        sMonth = 1;
        sDay = 1;
        eMonth = 1;
        eDay = 1;
      } else if (periodPreset === "multi_3") {
        periodType = "multi_day";
        runPeriodDays = 3;
        sMonth = 1;
        sDay = 1;
        eMonth = 1;
        eDay = 3;
      } else if (periodPreset === "multi_7") {
        periodType = "multi_day";
        runPeriodDays = 7;
        sMonth = 1;
        sDay = 1;
        eMonth = 1;
        eDay = 7;
      } else if (periodPreset === "monthly") {
        periodType = "monthly";
        sMonth = selectedMonth;
        sDay = 1;
        eMonth = selectedMonth;
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        eDay = daysInMonth[selectedMonth - 1];
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

      const matchedDataset = weatherDatasets.find((w) => w.id === activeWeatherId);
      const isTest = isTestData || matchedDataset?.isTestData;

      const newJob: SimulationJobItem = {
        id: simId,
        projectId: projToSim.id,
        projectName: projToSim.project?.name || "Canonical Shelter",
        shelterModel: projToSim,
        weatherDatasetId: activeWeatherId,
        weatherDatasetName: matchedDataset?.name || weatherFileName,
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
        engine: "EnergyPlus",
        engineVersion: settings.energyPlusVersion || "26.1.0",
        status: "queued",
        queuedAt: new Date().toISOString(),
      };

      addSimulationJob(newJob);
      pollSimulationStatus(simId, projToSim);
    } catch (err: any) {
      console.error("Queueing simulation failed:", err);
      setQueueError(err.message || "Failed to dispatch simulation to EnergyPlus engine.");
    } finally {
      setIsQueueing(false);
      setPendingSimProject(null);
    }
  };

  const totalRuns = simulations.length;
  const completedRuns = simulations.filter((s) => s.status === "completed").length;
  const activeRuns = simulations.filter(
    (s) => s.status === "running" || s.status === "queued" || s.status === "preparing"
  ).length;

  const renderStatusBadge = (status: string) => {
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
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
            <AlertCircle className="size-3" />
            Failed
          </span>
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
        eyebrow="Validated EnergyPlus 26.1 Dispatch"
        title="Run thermal simulation"
        description="Send the canonical model to the physics simulation engine with explicit period, timestep resolution, and authentic weather provenance."
        action={
          <Link href="/designer">
            <ActionButton tone="secondary">
              <Play className="size-3.5" />
              Designer Wizard
            </ActionButton>
          </Link>
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
                <span className="text-[10px] text-[#6E818F]">EnergyPlus 26.1</span>
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
                  Geometry: {targetProject.geometry?.length}m × {targetProject.geometry?.width}m × {targetProject.geometry?.height}m · Weather: {targetProject.location?.weatherSource || "IND_JK_Leh.420270_ISHRAE.epw"}
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
                    Dispatching EnergyPlus…
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
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Queue</div>
          <div className="text-3xl font-bold tracking-tight text-foreground mt-2">{activeRuns}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Executing in background</p>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completed Runs</div>
          <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-2">{completedRuns}</div>
          <p className="text-[10px] text-muted-foreground mt-1">Validated thermal records</p>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Engine In Use</div>
          <div className="text-base font-bold text-foreground mt-2">EnergyPlus 26.1.0</div>
          <p className="text-[10px] text-muted-foreground mt-1">RC Solver & heat balance</p>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_55px_rgba(0,0,0,.04)]">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Selected for Compare</div>
          <div className="text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400 mt-2">{comparisonJobIds.length}</div>
          <Link href="/comparison" className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline mt-1 inline-block font-semibold">
            Open Comparison &rarr;
          </Link>
        </div>
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
              {simulations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No simulation jobs found. Launch one from the Designer or Project Details.
                  </TableCell>
                </TableRow>
              ) : (
                simulations.map((sim) => {
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
                              ? "24 Hours (1 Day)"
                              : sim.simulationPeriod?.period_type === "monthly"
                              ? `1 Month (Month ${sim.simulationPeriod.start_month})`
                              : `${sim.simulationPeriod?.run_period_days || 3} Days`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sim.simulationPeriod?.timestep_minutes
                              ? `${sim.simulationPeriod.timestep_minutes}m (${sim.simulationPeriod.timestep_per_hour}/hr)`
                              : "15m (4/hr)"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-400">{sim.engine}</span>
                        <span className="ml-1 text-[10px] text-slate-500">v{sim.engineVersion}</span>
                      </TableCell>
                      <TableCell>{renderStatusBadge(sim.status)}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {sim.durationSeconds ? `${sim.durationSeconds.toFixed(1)}s` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
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

      {/* Connected Linear Workflow Footer */}
      <WorkflowFooter customNextLabel="Analyze Thermal Results" customNextHref="/results" />
    </div>
  );
}
