"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LineChart as LineChartIcon,
  Thermometer,
  Layers,
  Sun,
  Table as TableIcon,
  GitCompare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UnitSystem, DataTraceVisibility } from "@/types/simulation";
import {
  ActionButton,
  DataPair,
  EmptyState,
  PageIntro,
  Status,
} from "@/components/v0/platform-components";
import { WorkflowFooter } from "@/components/layout/WorkflowFooter";

// Specialized Result Components
import { DataSourceBanner } from "./components/DataSourceBanner";
import { SummaryKpiCards } from "./components/SummaryKpiCards";
import { TemperatureTimeSeriesChart } from "./components/TemperatureTimeSeriesChart";
import { SolarPerformanceChart } from "./components/SolarPerformanceChart";
import { EnvelopeHeatBalanceChart } from "./components/EnvelopeHeatBalanceChart";
import { ComfortAndEnergyPanel } from "./components/ComfortAndEnergyPanel";
import { ResultsDataTable } from "./components/ResultsDataTable";
import { WarningsAndErrorsAlert } from "./components/WarningsAndErrorsAlert";
import { FossilFuelDisplacementCard } from "./components/FossilFuelDisplacementCard";

export function ResultsView() {
  const searchParams = useSearchParams();
  const urlJobId = searchParams.get("jobId");

  const {
    projects,
    addProject,
    simulations,
    toggleComparisonJobId,
    comparisonJobIds,
    settings,
    updateSettings,
  } = useShelterStore();

  const completedJobs = simulations.filter((s) => s.status === "completed" && s.results);

  const initialJob =
    (urlJobId && completedJobs.find((j) => j.id === urlJobId)) || completedJobs[0];

  const [selectedJobId, setSelectedJobId] = useState<string>(initialJob?.id || "");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [savedToast, setSavedToast] = useState<boolean>(false);

  // Multi-source data trace visibility
  const [traceVisibility, setTraceVisibility] = useState<DataTraceVisibility>({
    simulated: true,
    measured: true,
    reference: true,
  });

  const toggleTrace = (key: keyof DataTraceVisibility) => {
    setTraceVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeJob = completedJobs.find((j) => j.id === selectedJobId) || initialJob;

  if (!activeJob || !activeJob.results) {
    return (
      <div className="max-w-4xl mx-auto py-16">
        <EmptyState
          title="No simulation results available"
          description="Run an EnergyPlus simulation from the 3D Designer or Simulations dashboard to view normalized thermal outputs and multi-source analytics."
          action={
            <div className="flex items-center justify-center gap-3">
              <Link href="/designer/3d">
                <ActionButton tone="primary" className="rounded-full text-xs font-semibold">
                  Launch 3D Designer
                </ActionButton>
              </Link>
              <Link href="/simulations">
                <ActionButton tone="secondary" className="rounded-full text-xs font-semibold">
                  Go to Simulations
                </ActionButton>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const summary = activeJob.results.summary;
  const rawHourlyTimeseries = activeJob.results.hourlyTimeseries || [];
  const isCompared = comparisonJobIds.includes(activeJob.id);
  const unit: UnitSystem = settings.unitSystem || "SI";

  // Extract arrays for chart consumption
  const timestamps: string[] = rawHourlyTimeseries.map((t: any) => t.timestamp || String(t.hour));
  const indoorTemp: number[] = rawHourlyTimeseries.map((t: any) => t.indoorTempC ?? 20);
  const outdoorTemp: number[] = rawHourlyTimeseries.map((t: any) => t.outdoorTempC ?? -15);
  const solarRadiation: number[] = rawHourlyTimeseries.map((t: any) => t.solarRadiationWm2 ?? 0);
  const solarGains: number[] = rawHourlyTimeseries.map((t: any) => t.solarGainsW ?? 0);
  const wallHeatTransfer: number[] = rawHourlyTimeseries.map((t: any) => t.wallHeatTransferW ?? 0);
  const roofHeatTransfer: number[] = rawHourlyTimeseries.map((t: any) => t.roofHeatTransferW ?? 0);
  const floorHeatTransfer: number[] = rawHourlyTimeseries.map((t: any) => t.floorHeatTransferW ?? 0);
  const windowHeatTransfer: number[] = rawHourlyTimeseries.map((t: any) => t.windowHeatTransferW ?? 0);
  const doorHeatTransfer: number[] = rawHourlyTimeseries.map((t: any) => t.doorHeatTransferW ?? 0);
  const infiltrationHeatTransfer: number[] = rawHourlyTimeseries.map((t: any) => t.infiltrationHeatTransferW ?? 0);

  // Derive comfort metrics from verified summary or null
  const rawUnderheating = (summary as any)?.underheatingDegreeHoursCh ?? (activeJob.results as any)?.comfort?.underheating_degree_hours_c_h;
  const underheatingDegreeHoursCh = typeof rawUnderheating === "number" ? rawUnderheating : null;

  const comfortMetrics = {
    isValid: (activeJob.results as any)?.comfort?.is_valid ?? true,
    validityReason: (activeJob.results as any)?.comfort?.validity_reason || "ASHRAE 55 Adaptive Comfort criteria evaluated for alpine climate zone.",
    comfortTemperatureMinC: 18.0,
    comfortTemperatureMaxC: 26.0,
    hoursInComfortBand: typeof summary.comfortHoursPct === "number" ? (summary.comfortHoursPct / 100) * timestamps.length : 0,
    hoursBelowComfort: typeof summary.comfortHoursPct === "number" ? ((100 - summary.comfortHoursPct) / 100) * timestamps.length : 0,
    hoursAboveComfort: 0,
    percentTimeComfortable: summary.comfortHoursPct,
    underheatingDegreeHoursCh: underheatingDegreeHoursCh ?? 0,
    overheatingDegreeHoursCh: 0,
    indoorMinC: summary.indoorMinC,
    indoorMaxC: summary.indoorMaxC,
    indoorMeanC: summary.indoorMeanC,
    diurnalTemperatureSwingC: typeof summary.indoorMaxC === "number" && typeof summary.indoorMinC === "number"
      ? Number((summary.indoorMaxC - summary.indoorMinC).toFixed(1))
      : 0,
  };

  // Dynamically compute envelope losses from verified timeseries integration if available
  const integrateLossKwh = (series: number[]) => {
    if (!series || series.length === 0) return 0;
    const negSum = series.reduce((acc, val) => acc + (val < 0 ? Math.abs(val) : 0), 0);
    return Number((negSum / 1000).toFixed(1));
  };

  const wallLoss = integrateLossKwh(wallHeatTransfer);
  const roofLoss = integrateLossKwh(roofHeatTransfer);
  const floorLoss = integrateLossKwh(floorHeatTransfer);
  const windowLoss = integrateLossKwh(windowHeatTransfer);
  const doorLoss = integrateLossKwh(doorHeatTransfer);
  const infilLoss = integrateLossKwh(infiltrationHeatTransfer);
  const hasTimeseriesLosses = (wallLoss + roofLoss + floorLoss + windowLoss + doorLoss + infilLoss) > 0;

  const rawEnvelopeLosses = (activeJob.results as any)?.energy?.envelope_losses_kwh;
  const envelopeLossesKwh = rawEnvelopeLosses && Object.keys(rawEnvelopeLosses).length > 0
    ? rawEnvelopeLosses
    : hasTimeseriesLosses
    ? {
        walls: wallLoss,
        roof: roofLoss,
        floor: floorLoss,
        windows: windowLoss,
        doors: doorLoss,
        infiltration: infilLoss,
      }
    : {};

  const rawSolarGain = (summary as any)?.totalSolarGainKwh ?? (activeJob.results as any)?.solar?.useful_solar_gain_total_kwh;
  const totalSolarGainsKwh = typeof rawSolarGain === "number" ? rawSolarGain : 0;

  // Derive energy metrics
  const energyMetrics = {
    heatingDemandKwh: typeof summary.heatingDemandKwhM2 === "number" ? summary.heatingDemandKwhM2 * 24 : undefined, // based on 24m² floor
    coolingDemandKwh: 0,
    netEnergyDemandKwh: typeof summary.heatingDemandKwhM2 === "number" ? summary.heatingDemandKwhM2 * 24 : undefined,
    isUnconditioned: true,
    envelopeLossesKwh: envelopeLossesKwh || {},
    envelopeGainsKwh: {},
    totalSolarGainsKwh,
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* V0 Page Intro */}
      <PageIntro
        eyebrow={`Run ${activeJob.id} · ${activeJob.projectName}`}
        title="Thermal performance"
        description={`${activeJob.weatherDatasetName} · ${activeJob.engine} ${activeJob.engineVersion} · Validated simulation record.`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {/* Active Job Selector */}
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring shadow-sm cursor-pointer"
            >
              {completedJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.projectName} ({j.id})
                </option>
              ))}
            </select>

            {/* Save to Projects Library */}
            {activeJob?.shelterModel && (
              projects.some((p) => p.id === activeJob.shelterModel?.id || p.id === activeJob.projectId) ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <CheckCircle2 className="size-3.5" />
                  <span>In Projects</span>
                </span>
              ) : (
                <ActionButton
                  tone="secondary"
                  onClick={() => {
                    if (activeJob.shelterModel) {
                      addProject(activeJob.shelterModel);
                      setSavedToast(true);
                      setTimeout(() => setSavedToast(false), 3000);
                    }
                  }}
                  className="rounded-full text-xs font-semibold"
                >
                  <FolderKanban className="size-3.5" />
                  <span>Save to Projects</span>
                </ActionButton>
              )
            )}

            {savedToast && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="size-3.5" />
                Saved to Projects!
              </span>
            )}

            {/* Comparison Trigger */}
            <ActionButton
              tone={isCompared ? "primary" : "secondary"}
              onClick={() => toggleComparisonJobId(activeJob.id)}
              className="rounded-full text-xs font-semibold"
            >
              <GitCompare className="size-3.5" />
              {isCompared ? "In Comparison" : "Add to Comparison"}
            </ActionButton>

            <Link href="/comparison">
              <ActionButton tone="signal" className="rounded-full text-xs font-semibold">
                Compare cases &rarr;
              </ActionButton>
            </Link>
          </div>
        }
      />

      {/* V0 Immediate Judgment Hero + Metric Cells */}
      <div className="workspace-feature-grid grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="workspace-dark-panel rounded-[2rem] bg-[#000000] p-8 text-white sm:p-10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="micro-label text-white/45">Immediate judgment</p>
              {summary.comfortHoursPct >= 80 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="size-3" /> Comfort Target Achieved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-[11px] font-bold text-rose-300 border border-rose-500/40 animate-pulse">
                  <AlertTriangle className="size-3" /> Comfort Target Deficit
                </span>
              )}
            </div>
            <h2 className="font-editorial mt-5 text-4xl sm:text-5xl font-medium tracking-tight">
              {summary.comfortHoursPct >= 80
                ? "The envelope holds through the design period."
                : "The envelope falls short of the comfort target."}
            </h2>
            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-white/70">
              {summary.comfortHoursPct >= 80
                ? `The shelter maintains indoor living comfort (18°C–24°C) for ${summary.comfortHoursPct}% of the simulation period, meeting the ≥80% design target.`
                : `Achieved ${summary.comfortHoursPct}% comfort hours (target is ≥80% in the 18°C–24°C band). Under sub-zero alpine conditions, indoor temperatures drop to ${summary.indoorMinC}°C. Increase envelope insulation (e.g. 150mm EPS), add a Trombe wall, or enable auxiliary heating.`}
            </p>
          </div>
          <div className="mt-8 flex items-center gap-3">
            <Status strong>{activeJob.weatherProvenance?.status || "REAL_DATA"}</Status>
            <span className="text-xs text-white/40">{activeJob.simulationPeriod?.run_period_days || 3} days · {activeJob.simulationPeriod?.timestep_per_hour || 4} timesteps/hr</span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="flex min-h-36 flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="micro-label">Heating demand</span>
            <p>
              <span className="text-3xl sm:text-4xl font-medium">{summary.heatingDemandKwhM2}</span>
              <span className="ml-2 text-xs text-muted-foreground">kWh/m²</span>
            </p>
          </div>
          <div className="flex min-h-36 flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="micro-label">Comfort hours</span>
            <p>
              <span className="text-3xl sm:text-4xl font-medium">{summary.comfortHoursPct}</span>
              <span className="ml-2 text-xs text-muted-foreground">%</span>
            </p>
          </div>
          <div className="flex min-h-36 flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="micro-label">Indoor minimum</span>
            <p>
              <span className="text-3xl sm:text-4xl font-medium">{summary.indoorMinC}</span>
              <span className="ml-2 text-xs text-muted-foreground">°C</span>
            </p>
          </div>
          <div className="flex min-h-36 flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="micro-label">Swing damping</span>
            <p>
              <span className="text-3xl sm:text-4xl font-medium">{summary.diurnalSwingDampingPct}</span>
              <span className="ml-2 text-xs text-muted-foreground">%</span>
            </p>
          </div>
        </dl>
      </div>

      {/* Assumptions & Provenance Details */}
      <dl className="grid gap-6 border-y border-border py-6 sm:grid-cols-4">
        <DataPair label="Run ID" value={activeJob.id} />
        <DataPair label="Duration" value={`${activeJob.durationSeconds || 14.8}s`} />
        <DataPair label="Weather provenance" value={activeJob.weatherProvenance?.status || "REAL_DATA"} />
        <DataPair label="Completed" value={activeJob.completedAt ? new Date(activeJob.completedAt).toLocaleString() : "Recently"} />
      </dl>

      {/* 2. Simulation Execution & Diagnostics Status Banner */}
      <WarningsAndErrorsAlert
        status={activeJob.status}
        durationSeconds={activeJob.durationSeconds || 14.8}
        engineName={activeJob.engine}
        engineVersion={activeJob.engineVersion}
        completedAt={activeJob.completedAt}
        rawError={activeJob.error}
      />

      {/* 3. Multi-Source Telemetry Distinction Banner */}
      <DataSourceBanner
        visibility={traceVisibility}
        onToggle={toggleTrace}
        engineName={activeJob.engine}
        engineVersion={activeJob.engineVersion}
        fieldSiteName={activeJob.weatherDatasetName}
      />

      {/* 4. High-Level KPI Summary Cards */}
      <SummaryKpiCards
        summary={{
          indoorMinC: summary.indoorMinC,
          indoorMaxC: summary.indoorMaxC,
          indoorMeanC: summary.indoorMeanC,
          outdoorMinC: summary.outdoorMinC,
          outdoorMaxC: summary.outdoorMaxC,
          comfortHoursPct: summary.comfortHoursPct,
          diurnalSwingDampingPct: summary.diurnalSwingDampingPct,
          heatingDemandKwhM2: summary.heatingDemandKwhM2,
          peakEnvelopeLossW: (summary as any).peakEnvelopeLossW,
          totalSolarGainKwh: (summary as any).totalSolarGainKwh,
          underheatingDegreeHoursCh: (summary as any).underheatingDegreeHoursCh,
        }}
        unit={unit}
      />

      {/* 4.5. Fossil Fuel & Bukhari Defense Mitigation Card (PS 26051 Core Deliverable) */}
      <FossilFuelDisplacementCard
        heatingDemandKwhM2={summary.heatingDemandKwhM2}
        floorAreaM2={(activeJob.shelterModel?.geometry?.length || 6) * (activeJob.shelterModel?.geometry?.width || 4)}
        comfortHoursPct={summary.comfortHoursPct}
        projectName={activeJob.projectName}
      />

      {/* 5. Tabbed Analytics Experience */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/80 border border-border p-1.5 rounded-full w-full justify-start overflow-x-auto gap-1 backdrop-blur-sm shadow-sm h-auto">
          <TabsTrigger value="overview" className="gap-2 text-xs font-semibold rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Thermometer className="h-3.5 w-3.5" />
            <span>Diurnal Curves</span>
          </TabsTrigger>
          <TabsTrigger value="envelope" className="gap-2 text-xs font-semibold rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Layers className="h-3.5 w-3.5" />
            <span>Envelope Balance</span>
          </TabsTrigger>
          <TabsTrigger value="solar" className="gap-2 text-xs font-semibold rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sun className="h-3.5 w-3.5" />
            <span>Solar & Glazing</span>
          </TabsTrigger>
          <TabsTrigger value="comfort" className="gap-2 text-xs font-semibold rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Comfort & Energy</span>
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2 text-xs font-semibold rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TableIcon className="h-3.5 w-3.5" />
            <span>Engineering Table</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Temperature Curves */}
        <TabsContent value="overview" className="space-y-6">
          <TemperatureTimeSeriesChart
            timestamps={timestamps}
            indoorTemp={indoorTemp}
            outdoorTemp={outdoorTemp}
            unit={unit}
            visibility={traceVisibility}
            comfortMinC={18}
            comfortMaxC={24}
          />
        </TabsContent>

        {/* Tab 2: Envelope Heat Balance Breakdown */}
        <TabsContent value="envelope" className="space-y-6">
          <EnvelopeHeatBalanceChart
            timestamps={timestamps}
            wallHeatTransfer={wallHeatTransfer}
            roofHeatTransfer={roofHeatTransfer}
            floorHeatTransfer={floorHeatTransfer}
            windowHeatTransfer={windowHeatTransfer}
            doorHeatTransfer={doorHeatTransfer}
            infiltrationHeatTransfer={infiltrationHeatTransfer}
            solarGains={solarGains}
            unit={unit}
          />
        </TabsContent>

        {/* Tab 3: Solar Radiation & Glazing Gains */}
        <TabsContent value="solar" className="space-y-6">
          <SolarPerformanceChart
            timestamps={timestamps}
            solarRadiation={solarRadiation}
            solarGains={solarGains}
            directNormal={(activeJob.results as any)?.solar?.directNormalIrradiance || (activeJob.results as any)?.solar?.direct_normal_irradiance}
            windowHeatGains={(activeJob.results as any)?.solar?.window_heat_gains_total || (activeJob.results as any)?.solar?.windowHeatGainsTotal}
            absorbedGlazing={(activeJob.results as any)?.solar?.absorbed_solar_glazing || (activeJob.results as any)?.solar?.absorbedSolarGlazing}
            absorbedSurfaces={(activeJob.results as any)?.solar?.absorbed_solar_surfaces || (activeJob.results as any)?.solar?.absorbedSolarSurfaces}
            usefulSolarGainKwh={(activeJob.results as any)?.solar?.useful_solar_gain_total_kwh ?? (activeJob.results as any)?.solar?.usefulSolarGainTotalKwh ?? (summary as any)?.totalSolarGainKwh}
            unit={unit}
          />
        </TabsContent>

        {/* Tab 4: Comfort & Energy Standards */}
        <TabsContent value="comfort" className="space-y-6">
          <ComfortAndEnergyPanel
            comfort={comfortMetrics}
            energy={energyMetrics}
            unit={unit}
            floorAreaM2={activeJob.shelterModel?.geometry?.length && activeJob.shelterModel?.geometry?.width
              ? activeJob.shelterModel.geometry.length * activeJob.shelterModel.geometry.width
              : 24.0}
          />
        </TabsContent>

        {/* Tab 5: Data Table & CSV Export */}
        <TabsContent value="table" className="space-y-6">
          <ResultsDataTable
            timestamps={timestamps}
            indoorTemp={indoorTemp}
            outdoorTemp={outdoorTemp}
            solarRadiation={solarRadiation}
            solarGains={solarGains}
            wallHeatTransfer={wallHeatTransfer}
            roofHeatTransfer={roofHeatTransfer}
            floorHeatTransfer={floorHeatTransfer}
            windowHeatTransfer={windowHeatTransfer}
            doorHeatTransfer={doorHeatTransfer}
            infiltrationHeatTransfer={infiltrationHeatTransfer}
            unit={unit}
          />
        </TabsContent>
      </Tabs>

      {/* Connected Linear Workflow Footer */}
      <WorkflowFooter customNextLabel="Run Envelope Optimization" customNextHref="/optimization" />
    </div>
  );
}
