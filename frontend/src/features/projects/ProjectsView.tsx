"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Search,
  Wand2,
  Trash2,
  ExternalLink,
  Layers,
  Compass,
  Box,
  Thermometer,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProjectsView() {
  const { projects, deleteProject, setActiveProject } = useShelterStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("all");

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      (p.project?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.project?.description && p.project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.project?.tags && p.project.tags.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesZone =
      selectedZone === "all" ||
      (selectedZone === "cold" && p.location.climateZone.toLowerCase().includes("cold"));

    return Boolean(matchesSearch && matchesZone);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FolderKanban className="h-6 w-6 text-blue-400" />
            Shelter Projects Repository
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Parametric cold-climate shelter definitions with multi-layer envelope constructions and EnergyPlus mappings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/projects/new">
            <Button className="gap-1.5 font-bold shadow-sm">
              <Plus className="h-4 w-4" />
              New Shelter
            </Button>
          </Link>
          <Link href="/designer">
            <Button variant="outline" className="gap-1.5 font-semibold text-blue-400 border-blue-500/30">
              <Wand2 className="h-4 w-4" />
              13-Step Wizard
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by shelter title, climate, or engineering tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={selectedZone === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedZone("all")}
          >
            All Climates
          </Button>
          <Button
            variant={selectedZone === "cold" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedZone("cold")}
          >
            Extreme Cold / Alpine
          </Button>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((p) => {
          const windowCount = p.windows ? p.windows.length : 0;
          const doorCount = p.doors ? p.doors.length : 0;
          const ach = p.ventilation ? p.ventilation.infiltrationACH : 0.5;

          return (
            <Card
              key={p.id}
              className="border-slate-800 bg-slate-900/60 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-white hover:text-blue-400 transition">
                      <Link href={`/projects/${p.id}`}>{p.project?.name || p.id}</Link>
                    </CardTitle>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                      <Compass className="h-3 w-3 text-blue-400" />
                      <span>{p.location.region}</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-400">{p.location.elevation}m</span>
                    </div>
                  </div>
                  <Badge variant="cold" className="text-[10px]">
                    v{p.project?.version || "1.0"}
                  </Badge>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mt-2">
                  {p.project?.description || "No description provided."}
                </p>

                {p.project?.tags && p.project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {p.project.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Physical Metrics */}
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-950/70 p-2.5 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Area</div>
                    <div className="font-mono font-bold text-slate-200">
                      {(p.geometry.length * p.geometry.width).toFixed(1)} m²
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Volume</div>
                    <div className="font-mono font-bold text-slate-200">
                      {(p.geometry.length * p.geometry.width * p.geometry.height).toFixed(1)} m³
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">U-Value</div>
                    <div className="font-mono font-bold text-blue-400">
                      0.24
                    </div>
                  </div>
                </div>

                {/* Construction details summary */}
                <div className="space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Envelope Openings:</span>
                    <span className="font-medium text-slate-200">
                      {windowCount} Windows, {doorCount} Door
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Air Tightness:</span>
                    <span className="font-medium text-slate-200">{ach} ACH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>South Passive Glazing:</span>
                    <span className="font-medium text-emerald-400">
                      {windowCount > 0 ? "Integrated (Low-E)" : "None"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <Link
                    href={`/projects/${p.id}`}
                    onClick={() => setActiveProject(p.id)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    Inspect Layers
                    <ExternalLink className="h-3 w-3" />
                  </Link>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProject(p.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/40 p-1.5 h-7 w-7"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
