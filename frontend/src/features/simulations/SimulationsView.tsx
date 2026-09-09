"use client";

import React from "react";
import Link from "next/link";
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
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export function SimulationsView() {
  const { simulations, removeSimulationJob, toggleComparisonJobId, comparisonJobIds } = useShelterStore();

  const totalRuns = simulations.length;
  const completedRuns = simulations.filter((s) => s.status === "completed").length;
  const activeRuns = simulations.filter(
    (s) => s.status === "running" || s.status === "queued" || s.status === "preparing"
  ).length;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success" className="gap-1 text-[10px]">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "running":
        return (
          <Badge variant="warning" className="gap-1 text-[10px] animate-pulse">
            <RotateCw className="h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      case "queued":
      case "preparing":
        return (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Clock className="h-3 w-3 text-blue-400" />
            Queued
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Cpu className="h-6 w-6 text-indigo-400" />
            Simulation Queue & Execution Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Asynchronous EnergyPlus Celery worker jobs with isolated runs, real-time status, and normalized output parsing.
          </p>
        </div>

        <Link href="/designer">
          <Button className="gap-2 font-bold shadow-sm">
            <Play className="h-4 w-4" />
            Run New Simulation
          </Button>
        </Link>
      </div>

      {/* Queue Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Active Celery Jobs</div>
          <div className="text-2xl font-bold text-white mt-1">{activeRuns}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Queued / Executing</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Completed Runs</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{completedRuns}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Parsed & stored</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Engine In Use</div>
          <div className="text-sm font-bold text-white mt-1">EnergyPlus 24.1.0</div>
          <p className="text-[10px] text-slate-500 mt-0.5">IDF Generated & verified</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Selected for Comparison</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{comparisonJobIds.length}</div>
          <Link href="/comparison" className="text-[10px] text-blue-400 hover:underline mt-0.5 inline-block">
            Go to Comparison &rarr;
          </Link>
        </div>
      </div>

      {/* Simulations Table */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Project Model</TableHead>
                <TableHead>Weather Station</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
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
                      <TableCell className="text-xs text-slate-300">
                        {sim.weatherDatasetName}
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
      </Card>
    </div>
  );
}
