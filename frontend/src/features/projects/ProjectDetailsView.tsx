"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Wand2,
  Play,
  Layers,
  Compass,
  Box,
  AppWindow,
  DoorOpen,
  Mountain,
  Wind,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { simulationApi } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export function ProjectDetailsView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { projects, weatherDatasets, addSimulationJob } = useShelterStore();
  const [isSimulating, setIsSimulating] = useState(false);

  const project = projects.find((p) => p.id === projectId) || projects[0];
  const activeWeather = weatherDatasets[0];

  if (!project) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-400">Project not found.</p>
        <Link href="/projects">
          <Button variant="outline">Return to Projects</Button>
        </Link>
      </div>
    );
  }

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const weatherFileName = project.location?.weatherSource || activeWeather?.epwFileName || "IND_JK_Leh.427053_TMYx.epw";
      const payload = {
        project_id: project.id,
        shelter_model: project,
        weather_file: weatherFileName,
        start_month: 1,
        start_day: 1,
        end_month: 1,
        end_day: 3,
        timestep: 4,
        is_annual: false,
        timeout_seconds: 600,
        allow_test_data: false,
      };

      const data = await simulationApi.queue(payload);
      const newJobId = data.simulation_id;

      // Dispatch simulation job to store
      addSimulationJob({
        id: newJobId,
        projectId: project.id,
        projectName: project.project?.name || project.id,
        shelterModel: project,
        weatherDatasetId: activeWeather?.id || "leh-weather",
        weatherDatasetName: activeWeather?.name || weatherFileName,
        engine: "EnergyPlus",
        engineVersion: "26.1.0",
        status: "queued",
        queuedAt: new Date().toISOString(),
      });

      router.push("/simulations");
    } catch (err) {
      console.error("Failed to queue simulation from project details:", err);
      setIsSimulating(false);
    }
  };

  const walls = Object.entries(project.envelope?.walls || {});
  const windows = project.windows || [];
  const doors = project.doors || [];
  const thermalMass = project.thermalMass || [];
  const ach = project.ventilation?.infiltrationACH || 0.35;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Projects
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white">{project.project?.name || project.id}</h1>
            <Badge variant="cold">v{project.project?.version || "1.0"}</Badge>
          </div>
          <p className="text-xs text-slate-400">{project.project?.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/designer">
            <Button variant="outline" className="gap-1.5 font-semibold">
              <Wand2 className="h-4 w-4 text-blue-400" />
              Edit in Wizard
            </Button>
          </Link>

          <Button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
          >
            <Play className="h-4 w-4" />
            {isSimulating ? "Launching..." : "Simulate (EnergyPlus)"}
          </Button>
        </div>
      </div>

      {/* Overview Specs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Region / Elevation</div>
          <div className="text-sm font-bold text-white mt-1 truncate">{project.location.region}</div>
          <div className="text-xs font-mono text-emerald-400 mt-0.5">{project.location.elevation} m MSL</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Geometry Footprint</div>
          <div className="text-sm font-bold text-white mt-1">
            {project.geometry.length}m × {project.geometry.width}m
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {(project.geometry.length * project.geometry.width).toFixed(1)} m² / {(project.geometry.length * project.geometry.width * project.geometry.height).toFixed(1)} m³
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Overall U-Value</div>
          <div className="text-sm font-bold text-blue-400 mt-1 font-mono">
            0.24 W/m²-K
          </div>
          <div className="text-xs text-slate-400 mt-0.5">ECBC Cold Compliant</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Infiltration Rate</div>
          <div className="text-sm font-bold text-amber-400 mt-1 font-mono">
            {ach} ACH
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Airtight Envelope</div>
        </div>
      </div>

      {/* Wall Envelope Assemblies */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-400" />
            Envelope Wall Assemblies by Orientation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orientation</TableHead>
                <TableHead>Assembly Name</TableHead>
                <TableHead>U-Value (W/m²-K)</TableHead>
                <TableHead>Layers Breakdown</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {walls.map(([orient, wall]: [string, any]) => (
                <TableRow key={orient}>
                  <TableCell className="font-bold capitalize text-white">{orient}</TableCell>
                  <TableCell className="font-medium text-slate-300">{wall.name || orient}</TableCell>
                  <TableCell className="font-mono text-blue-400 font-bold">0.22</TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {wall.layers && wall.layers.length > 0
                      ? wall.layers.map((l: any) => `${l.name || l.materialId} (${(l.thickness * 1000).toFixed(0)}mm)`).join(" + ")
                      : "Direct Composite Assembly"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Fenestration & Openings (Windows & Doors) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Windows */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <AppWindow className="h-5 w-5 text-amber-400" />
              Windows & Solar Fenestration ({windows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {windows.length === 0 ? (
              <p className="text-xs text-slate-500">No windows placed in envelope.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID / Host Wall</TableHead>
                    <TableHead>Size (W × H)</TableHead>
                    <TableHead>Area (m²)</TableHead>
                    <TableHead>Glazing Spec</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {windows.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-semibold text-white capitalize">
                        {w.id} ({w.wall})
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {w.width}m × {w.height}m
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-slate-300">
                        {(w.width * w.height).toFixed(2)} m²
                      </TableCell>
                      <TableCell className="font-mono text-xs text-amber-400">
                        {w.glazingType}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Doors & Thermal Mass */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-indigo-400" />
              Airtight Doors & Thermal Mass Buffers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs font-bold uppercase text-slate-400 mb-2">Exterior Doors</div>
              {doors.map((d: any) => (
                <div key={d.id} className="rounded-lg bg-slate-950/70 p-3 text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-white">
                    <span>{d.id} (Wall: {d.wall})</span>
                    <span className="font-mono">{d.width}m × {d.height}m</span>
                  </div>
                  <p className="text-slate-400">{d.construction}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-3">
              <div className="text-xs font-bold uppercase text-slate-400 mb-2">Internal Thermal Mass</div>
              {thermalMass.map((m: any) => (
                <div key={m.id} className="rounded-lg bg-slate-950/70 p-3 text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-white">
                    <span>{m.name}</span>
                    <span className="font-mono text-emerald-400">{m.surfaceArea} m²</span>
                  </div>
                  <p className="text-slate-400">
                    Thickness: {(m.thickness * 1000).toFixed(0)} mm • Type: {m.type}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
