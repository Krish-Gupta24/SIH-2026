"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Award,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Box,
  Compass,
  Layers,
  Home,
  Sun,
  Flame,
  Thermometer,
  Wind,
  Maximize2,
  MapPin,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RecommendationReport, CandidateResult } from "../types";
import { generateMarkdownFromReport } from "../recommendation-engine";

interface RecommendedDesignReportCardProps {
  report: RecommendationReport;
  onApplyToProject: (candidate: CandidateResult) => void;
  rawCandidate: CandidateResult;
}

export function RecommendedDesignReportCard({
  report,
  onApplyToProject,
  rawCandidate,
}: RecommendedDesignReportCardProps) {
  const [activeTab, setActiveTab] = useState("configuration");

  const cfg = report.selectedConfiguration;
  const perf = report.performance;
  const rfs = report.reasonForSelection;
  const lim = report.limitations;

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownFromReport(report);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.reportId}_RECOMMENDED_DESIGN.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.reportId}_RECOMMENDED_DESIGN.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-[2rem] border border-purple-500/30 bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] relative overflow-hidden space-y-6">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Recommended Design Spotlight */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-border">
        <div className="flex items-start gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-sm shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                RECOMMENDED DESIGN
              </span>
              <span className="rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold px-2.5 py-0.5 text-[10px] font-mono">
                Rank #1 (Conditional Optimum)
              </span>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-2.5 py-0.5 text-[10px] font-mono">
                Score: {report.objective.achievedScore.toFixed(1)} pts
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground tracking-tight mt-1">
              {report.conditionalTitle}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Report ID: <span className="font-mono text-foreground font-medium">{report.reportId}</span> · Generated: {new Date(report.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => onApplyToProject(rawCandidate)}
            className="rounded-full text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-sm gap-1.5 px-4 h-9"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Apply to Active Project</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMarkdown}
            className="rounded-full text-xs border-border bg-secondary/80 hover:bg-secondary text-foreground gap-1.5 px-4 h-9"
            title="Download full engineering report as Markdown"
          >
            <Download className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>Report (MD)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJson}
            className="rounded-full text-xs border-border bg-secondary/80 hover:bg-secondary text-foreground gap-1.5 px-3.5 h-9"
            title="Export complete schema JSON"
          >
            <FileText className="h-3.5 w-3.5 text-sky-500" />
            <span>JSON</span>
          </Button>

          <Button variant="outline" size="sm" asChild className="rounded-full text-xs border-border bg-secondary/80 hover:bg-secondary text-foreground gap-1.5 px-4 h-9">
            <Link href="/designer/3d">
              <Box className="h-3.5 w-3.5 text-sky-500" />
              <span>Inspect in 3D</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Mandatory Non-Universal Optimality Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[11px]">
              Engineering Non-Universal Optimality Notice
            </span>
            <p className="text-foreground/85 leading-relaxed text-[11px]">
              {lim.nonUniversalOptimalityDeclaration}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-secondary/60 border border-border p-1 rounded-2xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="configuration" className="rounded-xl text-xs font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2">
            Selected Configuration (10 Items)
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl text-xs font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2">
            Performance Metrics (5 Areas)
          </TabsTrigger>
          <TabsTrigger value="reason" className="rounded-xl text-xs font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2">
            Reason for Selection
          </TabsTrigger>
          <TabsTrigger value="overview" className="rounded-xl text-xs font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2">
            Objective, Constraints & Space
          </TabsTrigger>
          <TabsTrigger value="limitations" className="rounded-xl text-xs font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2">
            Limitations & Boundaries
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Selected Configuration */}
        <TabsContent value="configuration" className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>Specification of Selected Architectural Configuration</span>
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              10 Component Dimensions Verified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. Location */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>1. Location & Ambient</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-foreground font-semibold">{cfg.location.region}</div>
                <div className="text-muted-foreground text-[11px]">
                  {cfg.location.elevationM}m ASL · {cfg.location.climateZone}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Design Winter Min: <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">{cfg.location.designWinterMinC}°C</span>
                </div>
              </div>
            </div>

            {/* 2. Dimensions */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Maximize2 className="h-3.5 w-3.5 text-sky-500" />
                <span>2. Envelope Dimensions</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-foreground font-mono font-semibold">
                  {cfg.dimensions.lengthM}m (L) × {cfg.dimensions.widthM}m (W) × {cfg.dimensions.heightM}m (H)
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Floor Area: <span className="text-foreground font-mono">{cfg.dimensions.floorAreaM2} m²</span> · Aspect: {cfg.dimensions.aspectRatio}:1
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Enclosed Volume: <span className="text-foreground font-mono">{cfg.dimensions.internalVolumeM3} m³</span>
                </div>
              </div>
            </div>

            {/* 3. Orientation */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Compass className="h-3.5 w-3.5 text-amber-500" />
                <span>3. Solar Orientation</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-foreground font-semibold flex items-center gap-1.5">
                  <span>{cfg.orientation.cardinalFacing}</span>
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px] px-2 py-0.5">
                    {cfg.orientation.azimuthDegrees}° Azimuth
                  </span>
                </div>
                <div className="text-muted-foreground text-[11px] leading-tight">
                  {cfg.orientation.solarApertureDescription}
                </div>
              </div>
            </div>

            {/* 4. Wall System */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Home className="h-3.5 w-3.5 text-purple-500" />
                <span>4. Wall Envelope System</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-foreground font-semibold">{cfg.wallSystem.assemblyName.replace(/_/g, " ")}</div>
                <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono font-bold">
                  U = {cfg.wallSystem.uValueWm2k} W/m²·K (R = {cfg.wallSystem.rValueM2kw} m²K/W)
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Insulation: {Math.round(cfg.wallSystem.insulationThicknessM * 1000)}mm {cfg.wallSystem.insulationMaterial}
                </div>
              </div>
            </div>

            {/* 5. Roof System */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                <span>5. Roof & Ceiling System</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-foreground font-semibold">{cfg.roofSystem.assemblyName.replace(/_/g, " ")}</div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                  U = {cfg.roofSystem.uValueWm2k} W/m²·K · Pitch: {cfg.roofSystem.slopeDegrees}°
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Overhang: {cfg.roofSystem.overhangM}m (Snow & solar shading)
                </div>
              </div>
            </div>

            {/* 6. Floor System */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                <span>6. Floor Sub-Structure</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-foreground font-semibold">{cfg.floor.assemblyName}</div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  U = {cfg.floor.uValueWm2k} W/m²·K (Perimeter Sub-Slab XPS)
                </div>
                <div className="text-muted-foreground text-[11px] leading-tight">
                  {cfg.floor.description}
                </div>
              </div>
            </div>

            {/* 7. Windows */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <span>7. Glazing & Fenestration</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-foreground font-semibold">{cfg.windows.glazingType.replace(/_/g, " ")}</div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                  U = {cfg.windows.uValueWm2k} W/m²·K · SHGC: {cfg.windows.shgc}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Area: {cfg.windows.totalAreaM2} m² ({cfg.windows.windowToWallRatioPct}% WWR) · {cfg.windows.distribution}
                </div>
              </div>
            </div>

            {/* 8. Doors */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Home className="h-3.5 w-3.5 text-teal-500" />
                <span>8. Doors & Air-Lock</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-foreground font-semibold">{cfg.doors.construction}</div>
                <div className="text-[11px] text-teal-600 dark:text-teal-400 font-mono font-bold">
                  U = {cfg.doors.uValueWm2k} W/m²·K · {cfg.doors.doorCount} unit
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {cfg.doors.airtightnessRating}
                </div>
              </div>
            </div>

            {/* 9. Thermal Mass */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Flame className="h-3.5 w-3.5 text-rose-500" />
                <span>9. Thermal Mass Strategy</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-foreground font-semibold">{cfg.thermalMass.primaryMaterial}</div>
                <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono font-bold">
                  Capacitance: {cfg.thermalMass.heatCapacitanceKjM2k} kJ/m²·K
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Diurnal Thermal Damping: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{cfg.thermalMass.diurnalDampingPct}%</span>
                </div>
              </div>
            </div>

            {/* 10. Ventilation */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 md:col-span-2 lg:col-span-3 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Wind className="h-3.5 w-3.5 text-cyan-500" />
                <span>10. Ventilation & Envelope Air Leakage Control</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Air Exchange Rate</span>
                  <div className="text-foreground font-mono font-bold text-sm mt-0.5">
                    {cfg.ventilation.designAch} ACH ({cfg.ventilation.airtightnessCategory})
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Heat Recovery Specification</span>
                  <div className="text-foreground/90 text-[11px] mt-0.5">
                    {cfg.ventilation.heatRecoveryType}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Air-Barrier Integrity</span>
                  <div className="text-foreground/90 text-[11px] mt-0.5">
                    {cfg.ventilation.envelopeSealRating}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: Performance Metrics */}
        <TabsContent value="performance" className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Physical Performance Across 5 Core Engineering Domains</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Indoor Temperature Metrics */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                Indoor Temp
              </span>
              <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 font-mono">
                {perf.indoorTemperatureMetrics.indoorMinC}°C
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>Max: <span className="text-foreground font-mono">{perf.indoorTemperatureMetrics.indoorMaxC}°C</span></div>
                <div>Mean: <span className="text-foreground font-mono">{perf.indoorTemperatureMetrics.indoorMeanC}°C</span></div>
                <div>Swing: <span className="text-emerald-600 dark:text-emerald-400 font-mono">±{perf.indoorTemperatureMetrics.diurnalSwingC}°C</span></div>
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                  +{perf.indoorTemperatureMetrics.freezePreventionMarginC}°C above 0°C freeze
                </div>
              </div>
            </div>

            {/* 2. Comfort */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Comfort Band
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {perf.comfort.comfortHoursPct}%
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>Band: <span className="text-foreground">{perf.comfort.operativeComfortBand}</span></div>
                <div className="text-foreground font-medium">{perf.comfort.thermalStabilityRating}</div>
                <div className="text-muted-foreground text-[9px] pt-1 leading-tight">{perf.comfort.standardApplied}</div>
              </div>
            </div>

            {/* 3. Solar Gains */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sun className="h-3 w-3" />
                Solar Harvest
              </span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                {perf.solarGains.totalSolarGainKwh} <span className="text-xs font-normal">kWh</span>
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>Peak Solar: <span className="text-foreground font-mono">{perf.solarGains.peakSolarGainW} W</span></div>
                <div>Useful Fraction: <span className="text-emerald-600 dark:text-emerald-400 font-mono">{perf.solarGains.usefulApertureFractionPct}%</span></div>
                <div className="text-muted-foreground pt-1 leading-tight">{perf.solarGains.overheatingRisk}</div>
              </div>
            </div>

            {/* 4. Heat Loss */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <Flame className="h-3 w-3" />
                Total Heat Loss
              </span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
                {perf.heatLoss.totalHeatLossUaWK} <span className="text-xs font-normal">W/K</span>
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>Envelope: <span className="text-foreground font-mono">{perf.heatLoss.peakEnvelopeLossW} W ({perf.heatLoss.envelopeLossFractionPct}%)</span></div>
                <div>Infiltration: <span className="text-foreground font-mono">{perf.heatLoss.infiltrationLossW} W ({perf.heatLoss.infiltrationLossFractionPct}%)</span></div>
              </div>
            </div>

            {/* 5. Energy Demand */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 hover:bg-secondary/50 transition-colors">
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Heating Demand
              </span>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                {perf.energy.heatingDemandKwhM2} <span className="text-xs font-normal">kWh/m²</span>
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  –{perf.energy.baselineReductionPct}% vs uninsulated
                </div>
                <div>Peak Power: <span className="text-foreground font-mono">{perf.energy.peakHeatingPowerKw} kW</span></div>
                <div>Annual Aux: <span className="text-foreground font-mono">{perf.energy.annualAuxiliaryHeatingKwh} kWh</span></div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Reason for Selection */}
        <TabsContent value="reason" className="space-y-4 pt-1">
          <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Synthesis & Selection Logic
              </span>
              <p className="text-xs text-foreground mt-1 leading-relaxed">
                {rfs.summary}
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-border">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Key Engineering Trade-Offs Resolved:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {rfs.tradeOffResolutions.map((t, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-3.5 space-y-1.5 text-xs shadow-sm">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 text-[11px] block">
                      {t.tradeOff}
                    </span>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {t.resolution}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border text-xs">
              <span className="font-semibold text-foreground uppercase tracking-wider block mb-1">
                Candidate Rejection & Discard Audit:
              </span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {rfs.rejectionRationale}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: Overview (Objective, Constraints, Candidate Space) */}
        <TabsContent value="overview" className="space-y-4 pt-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. Objective */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                1. Objective Formulation
              </span>
              <div className="text-sm font-semibold text-foreground">{report.objective.label}</div>
              <p className="text-xs text-muted-foreground">{report.objective.description}</p>
              <div className="text-xs font-mono text-purple-600 dark:text-purple-400 pt-2 border-t border-border">
                Score: {report.objective.achievedScore.toFixed(2)} pts ({report.objective.higherIsBetter ? "Higher is better" : "Lower is better"})
              </div>
            </div>

            {/* 2. Boundary Constraints Audit */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 lg:col-span-2">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                2. Boundary Constraints & Compliance Audit
              </span>
              <div className="space-y-2 pt-1">
                {report.constraints.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border text-xs shadow-sm"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Limit: {c.operator} {c.threshold}{c.unit} · Actual: <span className="text-sky-600 dark:text-sky-400 font-mono font-medium">{c.actualValue.toFixed(2)}{c.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">{c.safetyMargin}</span>
                      <Badge variant="outline" className="text-[9px] py-0 font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                        PASSED
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Candidate Space Exploration */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2 lg:col-span-3">
              <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                3. Evaluated Candidate Space
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div className="rounded-xl bg-card border border-border p-3 shadow-sm">
                  <span className="text-muted-foreground text-[10px] uppercase font-medium">Combinations</span>
                  <div className="text-lg font-bold text-foreground font-mono mt-0.5">{report.candidateSpace.totalGenerated}</div>
                </div>
                <div className="rounded-xl bg-card border border-border p-3 shadow-sm">
                  <span className="text-muted-foreground text-[10px] uppercase font-medium">Evaluated</span>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5">{report.candidateSpace.validEvaluated}</div>
                </div>
                <div className="rounded-xl bg-card border border-border p-3 shadow-sm">
                  <span className="text-muted-foreground text-[10px] uppercase font-medium">Feasible</span>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{report.candidateSpace.feasibleCount}</div>
                </div>
                <div className="rounded-xl bg-card border border-border p-3 shadow-sm">
                  <span className="text-muted-foreground text-[10px] uppercase font-medium">Variables Swept</span>
                  <div className="text-lg font-bold text-sky-600 dark:text-sky-400 font-mono mt-0.5">{report.candidateSpace.parametersSwept.length}</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                {report.candidateSpace.gridResolutionNotes}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: Limitations */}
        <TabsContent value="limitations" className="space-y-4 pt-1">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Engineering Limitations & Physical Model Boundaries
              </h3>
            </div>

            <div className="space-y-2.5">
              {lim.boundaries.map((b, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card p-3.5 text-xs space-y-1 shadow-sm">
                  <span className="font-semibold text-amber-600 dark:text-amber-400 block text-[11px]">
                    {idx + 1}. {b.category}
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    {b.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Mandatory Verification Step: </span>
              <span>{lim.validationRecommendation}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
