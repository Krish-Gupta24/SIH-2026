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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, AlertTriangle, Layers, ArrowUpDown } from "lucide-react";
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
    <Card className="border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-400" />
            <span>Complete Candidate Design Space Rankings</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            All evaluated parameter combinations ranked by objective score with constraint compliance audits.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="h-8 gap-1.5 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-semibold"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Rankings CSV</span>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <Table>
          <TableHeader className="bg-slate-950/80">
            <TableRow className="border-slate-800 text-xs">
              <TableHead className="w-16 font-bold text-slate-400">Rank</TableHead>
              <TableHead className="w-24 font-bold text-slate-400">Candidate</TableHead>
              <TableHead className="font-bold text-purple-400">Objective Score</TableHead>
              <TableHead className="font-bold text-slate-300">Parameters</TableHead>
              <TableHead className="font-bold text-rose-400">Heating Demand</TableHead>
              <TableHead className="font-bold text-emerald-400">Comfort %</TableHead>
              <TableHead className="font-bold text-blue-400">Night Min</TableHead>
              <TableHead className="font-bold text-slate-400">Constraints</TableHead>
              <TableHead className="w-24 text-right font-bold text-slate-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((c) => (
              <TableRow
                key={c.id}
                className={`border-slate-800/60 hover:bg-slate-800/40 text-xs font-mono transition-colors ${
                  c.rank === 1 ? "bg-purple-950/20" : ""
                }`}
              >
                <TableCell className="font-bold">
                  {c.rank === 1 ? (
                    <span className="flex items-center gap-1 text-purple-400 font-bold">
                      ★ #1
                    </span>
                  ) : (
                    <span className="text-slate-400">#{c.rank}</span>
                  )}
                </TableCell>
                <TableCell className="font-semibold text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span>{c.id}</span>
                    {c.isPareto && (
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400" title="Pareto Optimal" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-bold text-purple-300">
                  {c.objectiveScore.toFixed(1)}
                </TableCell>
                <TableCell className="text-slate-300 font-sans text-[11px] max-w-xs truncate">
                  {Object.entries(c.parameters)
                    .map(([k, v]) => `${k.slice(0, 5)}:${v}`)
                    .join(" · ")}
                </TableCell>
                <TableCell className="text-rose-400 font-semibold">
                  {c.metrics.heatingDemandKwhM2} <span className="text-[10px] text-slate-500">kWh/m²</span>
                </TableCell>
                <TableCell className="text-emerald-400 font-semibold">
                  {c.metrics.comfortHoursPct}%
                </TableCell>
                <TableCell className="text-blue-400 font-semibold">
                  {c.metrics.indoorMinC}°C
                </TableCell>
                <TableCell>
                  {c.isFeasible ? (
                    <Badge variant="outline" className="text-[9px] py-0 font-mono text-emerald-400 border-emerald-800/50 bg-emerald-950/40">
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
                    className="h-6 px-2 text-[11px] font-bold text-purple-400 hover:text-white hover:bg-purple-600"
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
        <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
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
              className="h-7 px-2.5 text-xs"
            >
              Prev
            </Button>
            <span className="px-2 text-slate-300">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2.5 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
