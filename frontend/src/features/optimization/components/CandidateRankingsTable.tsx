"use client";

import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Layers } from "lucide-react";
import { CandidateResult } from "../types";

interface CandidateRankingsTableProps {
  candidates: CandidateResult[];
  onApplyCandidate: (c: CandidateResult) => void;
}

export function CandidateRankingsTable({
  candidates,
  onApplyCandidate,
}: CandidateRankingsTableProps) {
  const [page, setPage] = useState(1);
  const rowsPerPage = 15;

  const totalPages = Math.ceil(candidates.length / rowsPerPage) || 1;
  const paginated = candidates.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleExportCsv = () => {
    const headers = [
      "Rank",
      "Candidate_ID",
      "Feasible",
      "Score",
      "Heating_Demand_kWh_m2",
      "Comfort_Hours_Pct",
      "Indoor_Min_C",
      "Peak_Heat_Loss_W",
      "Wall_Thickness_m",
      "Parameters",
    ];

    const rows = candidates.map((c) => [
      c.rank,
      c.id,
      c.isFeasible ? "Yes" : "No",
      c.objectiveScore.toFixed(2),
      c.metrics.heatingDemandKwhM2,
      c.metrics.comfortHoursPct,
      c.metrics.indoorMinC,
      c.metrics.peakHeatLossW,
      c.metrics.wallThicknessM,
      JSON.stringify(c.parameters).replace(/"/g, "'"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `optimization_parameter_sweep_rankings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,.04)] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-secondary flex items-center justify-center text-foreground border border-border">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="micro-label">Evaluated Design Space</span>
            <h3 className="font-editorial text-2xl font-medium text-foreground tracking-tight mt-0.5">
              Design Space Candidate Rankings
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              All evaluated parameter combinations ranked by objective score with full physical constraint audits.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="rounded-full h-9 gap-2 text-xs border-border bg-card hover:bg-secondary text-foreground font-semibold px-4 shadow-sm"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Rankings CSV</span>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader className="bg-secondary/60">
            <TableRow className="border-b border-border text-xs">
              <TableHead className="w-16 font-semibold text-muted-foreground">Rank</TableHead>
              <TableHead className="w-24 font-semibold text-muted-foreground">Candidate</TableHead>
              <TableHead className="font-semibold text-foreground">Objective Score</TableHead>
              <TableHead className="font-semibold text-foreground">Parameters</TableHead>
              <TableHead className="font-semibold text-rose-600 dark:text-rose-400">Heating Demand</TableHead>
              <TableHead className="font-semibold text-emerald-600 dark:text-emerald-400">Comfort %</TableHead>
              <TableHead className="font-semibold text-sky-600 dark:text-sky-400">Night Min</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Constraints</TableHead>
              <TableHead className="w-24 text-right font-semibold text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((c) => (
              <TableRow
                key={c.id}
                className={`border-b border-border hover:bg-secondary/40 text-xs font-mono transition-colors ${
                  c.rank === 1 ? "bg-emerald-500/10 font-semibold" : ""
                }`}
              >
                <TableCell className="font-bold">
                  {c.rank === 1 ? (
                    <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">
                      ★ #1
                    </span>
                  ) : (
                    <span className="text-muted-foreground">#{c.rank}</span>
                  )}
                </TableCell>
                <TableCell className="font-semibold text-foreground">
                  <div className="flex items-center gap-1.5">
                    <span>{c.id}</span>
                    {c.isPareto && (
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" title="Pareto Optimal" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-bold text-purple-600 dark:text-purple-400">
                  {c.objectiveScore.toFixed(1)}
                </TableCell>
                <TableCell className="text-muted-foreground font-sans text-[11px] max-w-xs truncate">
                  {Object.entries(c.parameters)
                    .map(([k, v]) => `${k.slice(0, 5)}:${v}`)
                    .join(" · ")}
                </TableCell>
                <TableCell className="text-rose-600 dark:text-rose-400 font-semibold">
                  {c.metrics.heatingDemandKwhM2} <span className="text-[10px] text-muted-foreground">kWh/m²</span>
                </TableCell>
                <TableCell className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {c.metrics.comfortHoursPct}%
                </TableCell>
                <TableCell className="text-sky-600 dark:text-sky-400 font-semibold">
                  {c.metrics.indoorMinC}°C
                </TableCell>
                <TableCell>
                  {c.isFeasible ? (
                    <Badge variant="outline" className="text-[9px] py-0 font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      Passed
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[9px] py-0 font-mono" title={c.violations.join("; ")}>
                      Violated ({c.violations.length})
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onApplyCandidate(c)}
                    className="h-7 px-3 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-full"
                  >
                    Apply
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, candidates.length)} of{" "}
            {candidates.length} candidate designs
          </span>
          <div className="flex items-center gap-1 font-mono">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 text-xs rounded-lg"
            >
              Prev
            </Button>
            <span className="px-2 text-foreground font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2.5 text-xs rounded-lg"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
