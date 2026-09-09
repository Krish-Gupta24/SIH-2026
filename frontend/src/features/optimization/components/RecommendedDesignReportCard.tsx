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
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  const [isLimitationsExpanded, setIsLimitationsExpanded] = useState(true);

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
    <Card className="border-purple-500/50 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl relative overflow-hidden backdrop-blur-md space-y-6">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Recommended Design Spotlight */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-purple-400">
                RECOMMENDED DESIGN
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono bg-purple-950/60 text-purple-300 border-purple-700/60"
              >
                Rank #1 (Conditional Optimum)
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] font-mono bg-amber-950/40 text-amber-300 border-amber-800/50"
              >
                Score: {report.objective.achievedScore.toFixed(1)} pts
              </Badge>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mt-1">
              {report.conditionalTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Report ID: <span className="font-mono text-slate-300">{report.reportId}</span> · Generated: {new Date(report.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => onApplyToProject(rawCandidate)}
            className="text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Apply to Active Project</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMarkdown}
            className="text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 gap-1.5"
            title="Download full engineering report as Markdown"
          >
            <Download className="h-3.5 w-3.5 text-purple-400" />
            <span>Report (MD)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJson}
            className="text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 gap-1.5"
            title="Export complete schema JSON"
          >
            <FileText className="h-3.5 w-3.5 text-sky-400" />
            <span>JSON</span>
          </Button>

          <Button variant="outline" size="sm" asChild className="text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-white gap-1">
            <Link href="/designer/3d">
              <Box className="h-3.5 w-3.5 text-sky-400" />
              <span>Inspect in 3D</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Mandatory Non-Universal Optimality Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
              Engineering Non-Universal Optimality Notice
            </span>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {lim.nonUniversalOptimalityDeclaration}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation for the 7 Required Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="configuration" className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            4. Selected Configuration (10 Items)
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            5. Performance Metrics (5 Areas)
          </TabsTrigger>
          <TabsTrigger value="reason" className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            6. Reason for Selection
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            1. Objective & 2. Constraints & 3. Space
          </TabsTrigger>
          <TabsTrigger value="limitations" className="text-xs font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            7. Limitations & Boundaries
          </TabsTrigger>
        </TabsList>

        {/* ----------------------------------------------------------------- */}
        {/* TAB 1: 4. SELECTED CONFIGURATION (All 10 Required Items)           */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="configuration" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <span>Complete Specification of the Selected Architectural Configuration</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              10 Component Dimensions Verified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. Location */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <MapPin className="h-3.5 w-3.5 text-rose-400" />
                <span>1. Location & Ambient</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-white font-semibold">{cfg.location.region}</div>
                <div className="text-slate-400 text-[11px]">
                  {cfg.location.elevationM}m ASL · {cfg.location.climateZone}
                </div>
                <div className="text-slate-400 text-[11px]">
                  Design Winter Min: <span className="text-rose-400 font-mono font-bold">{cfg.location.designWinterMinC}°C</span>
                </div>
              </div>
            </div>

            {/* 2. Dimensions */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <Maximize2 className="h-3.5 w-3.5 text-sky-400" />
                <span>2. Envelope Dimensions</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-white font-mono font-semibold">
                  {cfg.dimensions.lengthM}m (L) × {cfg.dimensions.widthM}m (W) × {cfg.dimensions.heightM}m (H)
                </div>
                <div className="text-slate-400 text-[11px]">
                  Floor Area: <span className="text-white font-mono">{cfg.dimensions.floorAreaM2} m²</span> · Aspect: {cfg.dimensions.aspectRatio}:1
                </div>
                <div className="text-slate-400 text-[11px]">
                  Enclosed Volume: <span className="text-white font-mono">{cfg.dimensions.internalVolumeM3} m³</span>
                </div>
              </div>
            </div>

            {/* 3. Orientation */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <Compass className="h-3.5 w-3.5 text-amber-400" />
                <span>3. Solar Orientation</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <span>{cfg.orientation.cardinalFacing}</span>
                  <Badge variant="outline" className="text-[10px] py-0 font-mono text-amber-300 border-amber-800/60">
                    {cfg.orientation.azimuthDegrees}° Azimuth
                  </Badge>
                </div>
                <div className="text-slate-400 text-[11px] leading-tight">
                  {cfg.orientation.solarApertureDescription}
                </div>
              </div>
            </div>

            {/* 4. Wall System */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <Home className="h-3.5 w-3.5 text-purple-400" />
                <span>4. Wall Envelope System</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-white font-semibold">{cfg.wallSystem.assemblyName.replace(/_/g, " ")}</div>
                <div className="text-[11px] text-purple-300 font-mono font-bold">
                  U = {cfg.wallSystem.uValueWm2k} W/m²·K (R = {cfg.wallSystem.rValueM2kw} m²K/W)
                </div>
                <div className="text-slate-400 text-[11px]">
                  Insulation: {Math.round(cfg.wallSystem.insulationThicknessM * 1000)}mm {cfg.wallSystem.insulationMaterial}
                </div>
              </div>
            </div>

            {/* 5. Roof System */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                <span>5. Roof & Ceiling System</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-white font-semibold">{cfg.roofSystem.assemblyName.replace(/_/g, " ")}</div>
                <div className="text-[11px] text-indigo-300 font-mono font-bold">
                  U = {cfg.roofSystem.uValueWm2k} W/m²·K · Pitch: {cfg.roofSystem.slopeDegrees}°
                </div>
                <div className="text-slate-400 text-[11px]">
                  Overhang: {cfg.roofSystem.overhangM}m (Snow & summer solar cut-off)
                </div>
              </div>
            </div>

            {/* 6. Floor System */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                <span>6. Floor Sub-Structure</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-white font-semibold">{cfg.floor.assemblyName}</div>
                <div className="text-[11px] text-emerald-300 font-mono font-bold">
                  U = {cfg.floor.uValueWm2k} W/m²·K (Perimeter Sub-Slab XPS)
                </div>
                <div className="text-slate-400 text-[11px] leading-tight">
                  {cfg.floor.description}
                </div>
              </div>
            </div>

            {/* 7. Windows */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>7. Glazing & Fenestration</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-white font-semibold">{cfg.windows.glazingType.replace(/_/g, " ")}</div>
                <div className="text-[11px] text-amber-300 font-mono font-bold">
                  U = {cfg.windows.uValueWm2k} W/m²·K · SHGC: {cfg.windows.shgc}
                </div>
                <div className="text-slate-400 text-[11px]">
                  Area: {cfg.windows.totalAreaM2} m² ({cfg.windows.windowToWallRatioPct}% WWR) · {cfg.windows.distribution}
                </div>
              </div>
            </div>

            {/* 8. Doors */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <Home className="h-3.5 w-3.5 text-teal-400" />
                <span>8. Doors & Air-Lock</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-white font-semibold">{cfg.doors.construction}</div>
                <div className="text-[11px] text-teal-300 font-mono font-bold">
                  U = {cfg.doors.uValueWm2k} W/m²·K · {cfg.doors.doorCount} unit
                </div>
                <div className="text-slate-400 text-[11px]">
                  {cfg.doors.airtightnessRating}
                </div>
              </div>
            </div>

            {/* 9. Thermal Mass */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <Flame className="h-3.5 w-3.5 text-rose-400" />
                <span>9. Thermal Mass Strategy</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-white font-semibold">{cfg.thermalMass.primaryMaterial}</div>
                <div className="text-[11px] text-rose-300 font-mono font-bold">
                  Capacitance: {cfg.thermalMass.heatCapacitanceKjM2k} kJ/m²·K
                </div>
                <div className="text-slate-400 text-[11px]">
                  Diurnal Thermal Damping: <span className="text-emerald-400 font-bold">{cfg.thermalMass.diurnalDampingPct}%</span>
                </div>
              </div>
            </div>

            {/* 10. Ventilation */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
                <Wind className="h-3.5 w-3.5 text-cyan-400" />
                <span>10. Ventilation & Envelope Air Leakage Control</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Air Exchange Rate</span>
                  <div className="text-white font-mono font-bold text-sm mt-0.5">
                    {cfg.ventilation.designAch} ACH ({cfg.ventilation.airtightnessCategory})
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Heat Recovery Specification</span>
                  <div className="text-slate-300 text-[11px] mt-0.5">
                    {cfg.ventilation.heatRecoveryType}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Air-Barrier Integrity</span>
                  <div className="text-slate-300 text-[11px] mt-0.5">
                    {cfg.ventilation.envelopeSealRating}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* TAB 2: 5. PERFORMANCE METRICS (All 5 Required Areas)              */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="performance" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Evaluated Physical Performance Across 5 Core Engineering Domains</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Indoor Temperature Metrics */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                Indoor Temp
              </span>
              <div className="text-2xl font-black text-blue-400 font-mono">
                {perf.indoorTemperatureMetrics.indoorMinC}°C
              </div>
              <div className="text-[10px] text-slate-400 space-y-0.5">
                <div>Max: <span className="text-slate-200 font-mono">{perf.indoorTemperatureMetrics.indoorMaxC}°C</span></div>
                <div>Mean: <span className="text-slate-200 font-mono">{perf.indoorTemperatureMetrics.indoorMeanC}°C</span></div>
                <div>Swing: <span className="text-emerald-400 font-mono">±{perf.indoorTemperatureMetrics.diurnalSwingC}°C</span></div>
                <div className="text-emerald-400 font-bold pt-1">
                  +{perf.indoorTemperatureMetrics.freezePreventionMarginC}°C above 0°C freeze
                </div>
              </div>
            </div>

            {/* 2. Comfort */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Comfort Band
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {perf.comfort.comfortHoursPct}%
              </div>
              <div className="text-[10px] text-slate-400 space-y-0.5">
                <div>Band: <span className="text-slate-200">{perf.comfort.operativeComfortBand}</span></div>
                <div className="text-slate-300 font-semibold">{perf.comfort.thermalStabilityRating}</div>
                <div className="text-slate-500 text-[9px] pt-1 leading-tight">{perf.comfort.standardApplied}</div>
              </div>
            </div>

            {/* 3. Solar Gains */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sun className="h-3 w-3" />
                Solar Harvest
              </span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {perf.solarGains.totalSolarGainKwh} <span className="text-xs font-normal">kWh</span>
              </div>
              <div className="text-[10px] text-slate-400 space-y-0.5">
                <div>Peak Solar: <span className="text-slate-200 font-mono">{perf.solarGains.peakSolarGainW} W</span></div>
                <div>Useful Fraction: <span className="text-emerald-400 font-mono">{perf.solarGains.usefulApertureFractionPct}%</span></div>
                <div className="text-slate-400 pt-1 leading-tight">{perf.solarGains.overheatingRisk}</div>
              </div>
            </div>

            {/* 4. Heat Loss */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <Flame className="h-3 w-3" />
                Total Heat Loss
              </span>
              <div className="text-2xl font-black text-rose-400 font-mono">
                {perf.heatLoss.totalHeatLossUaWK} <span className="text-xs font-normal">W/K</span>
              </div>
              <div className="text-[10px] text-slate-400 space-y-0.5">
                <div>Peak Envelope: <span className="text-slate-200 font-mono">{perf.heatLoss.peakEnvelopeLossW} W ({perf.heatLoss.envelopeLossFractionPct}%)</span></div>
                <div>Infiltration: <span className="text-slate-200 font-mono">{perf.heatLoss.infiltrationLossW} W ({perf.heatLoss.infiltrationLossFractionPct}%)</span></div>
              </div>
            </div>

            {/* 5. Energy Demand */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Heating Demand
              </span>
              <div className="text-2xl font-black text-indigo-300 font-mono">
                {perf.energy.heatingDemandKwhM2} <span className="text-xs font-normal">kWh/m²</span>
              </div>
              <div className="text-[10px] text-slate-400 space-y-0.5">
                <div className="text-emerald-400 font-bold">
                  –{perf.energy.baselineReductionPct}% vs uninsulated
                </div>
                <div>Peak Aux Power: <span className="text-slate-200 font-mono">{perf.energy.peakHeatingPowerKw} kW</span></div>
                <div>Annual Aux: <span className="text-slate-200 font-mono">{perf.energy.annualAuxiliaryHeatingKwh} kWh/yr</span></div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* TAB 3: 6. REASON FOR SELECTION (Trade-offs & Discard Analysis)     */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="reason" className="space-y-4 pt-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Synthesis & Selection Logic
              </span>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                {rfs.summary}
              </p>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Key Engineering Trade-Offs Resolved:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {rfs.tradeOffResolutions.map((t, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1.5 text-xs">
                    <span className="font-bold text-amber-300 text-[11px] block">
                      {t.tradeOff}
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {t.resolution}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Candidate Rejection & Discard Audit:
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {rfs.rejectionRationale}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* TAB 4: 1. OBJECTIVE, 2. CONSTRAINTS & 3. CANDIDATE SPACE           */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. Objective */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                1. Objective Formulation
              </span>
              <div className="text-sm font-bold text-white">{report.objective.label}</div>
              <p className="text-xs text-slate-400">{report.objective.description}</p>
              <div className="text-xs font-mono text-purple-300 pt-2 border-t border-slate-800">
                Score: {report.objective.achievedScore.toFixed(2)} pts ({report.objective.higherIsBetter ? "Higher is better" : "Lower is better"})
              </div>
            </div>

            {/* 2. Boundary Constraints Audit */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 lg:col-span-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                2. Boundary Constraints & Compliance Audit
              </span>
              <div className="space-y-2 pt-1">
                {report.constraints.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Limit: {c.operator} {c.threshold}{c.unit} · Actual: <span className="text-sky-300 font-mono">{c.actualValue.toFixed(2)}{c.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-400 font-mono">{c.safetyMargin}</span>
                      <Badge variant="outline" className="text-[9px] py-0 font-mono text-emerald-400 border-emerald-800/60 bg-emerald-950/40">
                        PASSED
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Candidate Space Exploration */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 lg:col-span-3">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                3. Evaluated Candidate Space
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div className="rounded bg-slate-900 p-2.5">
                  <span className="text-slate-500 text-[10px] uppercase">Combinations</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">{report.candidateSpace.totalGenerated}</div>
                </div>
                <div className="rounded bg-slate-900 p-2.5">
                  <span className="text-slate-500 text-[10px] uppercase">Evaluated</span>
                  <div className="text-lg font-bold text-purple-300 font-mono mt-0.5">{report.candidateSpace.validEvaluated}</div>
                </div>
                <div className="rounded bg-slate-900 p-2.5">
                  <span className="text-slate-500 text-[10px] uppercase">Feasible</span>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{report.candidateSpace.feasibleCount}</div>
                </div>
                <div className="rounded bg-slate-900 p-2.5">
                  <span className="text-slate-500 text-[10px] uppercase">Variables Swept</span>
                  <div className="text-lg font-bold text-sky-300 font-mono mt-0.5">{report.candidateSpace.parametersSwept.length}</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                {report.candidateSpace.gridResolutionNotes}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* TAB 5: 7. LIMITATIONS & ENGINEERING BOUNDARIES                     */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="limitations" className="space-y-4 pt-2">
          <div className="rounded-xl border border-amber-500/30 bg-slate-950/80 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                7. Engineering Limitations & Physical Model Boundaries
              </h3>
            </div>

            <div className="space-y-3">
              {lim.boundaries.map((b, idx) => (
                <div key={idx} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs space-y-1">
                  <span className="font-bold text-amber-300 block">
                    {idx + 1}. {b.category}
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {b.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
              <span className="font-bold text-slate-300">Mandatory Verification Step: </span>
              <span>{lim.validationRecommendation}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
