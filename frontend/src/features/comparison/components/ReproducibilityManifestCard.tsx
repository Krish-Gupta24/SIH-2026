"use client";

import React, { useState } from "react";
import {
  FileCode,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  CloudSun,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReproducibilityManifest } from "../types";

interface ReproducibilityManifestCardProps {
  manifest: ReproducibilityManifest;
}

export function ReproducibilityManifestCard({
  manifest,
}: ReproducibilityManifestCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Engineering Scientific Reproducibility Manifest
              </span>
              <Badge variant="outline" className="text-[10px] font-mono bg-sky-950/50 text-sky-400 border-sky-800/50 py-0">
                {manifest.manifestId}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Immutable provenance recording model versioning, boundary conditions, and simulation engine execution parameters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyJson}
            className="h-7 px-2.5 text-xs gap-1.5 border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "Copied" : "Copy Manifest JSON"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Grid of Provenance Parameters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-sans font-semibold">
            <Cpu className="h-3.5 w-3.5 text-sky-400" />
            <span>Simulation Engine</span>
          </div>
          <div className="font-bold text-sky-300">
            {manifest.engineName} v{manifest.engineVersion}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Tolerance: {manifest.simulationSettings.solverTolerance}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-sans font-semibold">
            <CloudSun className="h-3.5 w-3.5 text-amber-400" />
            <span>Meteorological Weather</span>
          </div>
          <div className="font-bold text-amber-300 truncate">
            {manifest.weatherDatasetName}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Elev: {manifest.elevationM}m · ({manifest.coordinates.latitude}°N, {manifest.coordinates.longitude}°E)
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-sans font-semibold">
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span>Temporal Discretization</span>
          </div>
          <div className="font-bold text-indigo-300">
            {manifest.simulationSettings.timestepsPerHour} Steps/Hour
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Period: {manifest.simulationSettings.runPeriodDays} Continuous Days ({manifest.simulationSettings.timestepsPerHour * manifest.simulationSettings.runPeriodDays * 24} total timesteps)
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-sans font-semibold">
            <FileCode className="h-3.5 w-3.5 text-emerald-400" />
            <span>Compared Versions</span>
          </div>
          <div className="font-bold text-emerald-300">
            {manifest.modelsCompared.length} Validated Designs
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Timestamp: {new Date(manifest.generatedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Expanded JSON Inspector */}
      {expanded && (
        <div className="pt-2">
          <pre className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}
