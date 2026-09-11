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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="micro-label text-foreground">
                Scientific Reproducibility Manifest
              </span>
              <Badge variant="outline" className="text-[10px] font-mono py-0 font-medium">
                {manifest.manifestId}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Immutable provenance recording model versioning, boundary conditions, and solver execution parameters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyJson}
            className="h-8 px-3 text-xs gap-1.5 rounded-full font-medium"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy JSON"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0 rounded-full"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Grid of Provenance Parameters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
            <Cpu className="h-3.5 w-3.5 text-sky-500" />
            <span>Simulation Engine</span>
          </div>
          <div className="font-semibold text-foreground">
            {manifest.engineName} v{manifest.engineVersion}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Tolerance: {manifest.simulationSettings.solverTolerance}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
            <CloudSun className="h-3.5 w-3.5 text-amber-500" />
            <span>Meteorological Data</span>
          </div>
          <div className="font-semibold text-foreground truncate">
            {manifest.weatherDatasetName}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Elev: {manifest.elevationM}m · ({manifest.coordinates.latitude}°N, {manifest.coordinates.longitude}°E)
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>Discretization</span>
          </div>
          <div className="font-semibold text-foreground">
            {manifest.simulationSettings.timestepsPerHour} Steps/Hour
          </div>
          <div className="text-[11px] text-muted-foreground">
            Period: {manifest.simulationSettings.runPeriodDays} Days ({manifest.simulationSettings.timestepsPerHour * manifest.simulationSettings.runPeriodDays * 24} total steps)
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
            <FileCode className="h-3.5 w-3.5 text-emerald-500" />
            <span>Compared Versions</span>
          </div>
          <div className="font-semibold text-foreground">
            {manifest.modelsCompared.length} Validated Designs
          </div>
          <div className="text-[11px] text-muted-foreground">
            Timestamp: {new Date(manifest.generatedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Expanded JSON Inspector */}
      {expanded && (
        <div className="pt-2">
          <pre className="rounded-xl border border-border bg-muted/40 p-4 text-[11px] font-mono text-foreground overflow-x-auto max-h-64">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
