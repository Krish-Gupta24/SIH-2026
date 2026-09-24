"use client";

import React from "react";
import {
  Layers,
  ArrowRight,
  Sparkles,
  GitCompare,
  Sliders,
  Wind,
  Sun,
  Box,
  Flame,
  Check,
} from "lucide-react";
import { SimulationJobItem } from "@/lib/store/use-shelter-store";
import { ShelterModel } from "@/types/shelter";
import { TRACE_COLORS } from "./ConfigurationComparisonStrip";

interface WhatChangedDiffProps {
  jobs: SimulationJobItem[];
}

interface ParamDiffItem {
  id: string;
  category: "Opaque Envelope" | "Glazing & Solar" | "Ventilation & Air" | "Thermal Mass";
  name: string;
  description: string;
  values: {
    jobId: string;
    jobName: string;
    value: string;
    subtext?: string;
    isBaseline: boolean;
    deltaTag?: string;
    isImprovement?: boolean;
  }[];
}

export function WhatChangedDiff({ jobs }: WhatChangedDiffProps) {
  if (!jobs || jobs.length < 2) return null;

  const baseline = jobs[0];
  const candidates = jobs.slice(1);

  // Extract parametric values for each job
  const extractParams = (job: SimulationJobItem) => {
    const m = job.shelterModel;
    const isTin = m?.id?.includes("tin") || job.projectName.toLowerCase().includes("cgi tin");
    const isKargil = m?.id?.includes("kargil") || job.projectName.toLowerCase().includes("kargil");
    const isSpiti = m?.id?.includes("spiti") || job.projectName.toLowerCase().includes("spiti");
    const isTawang = m?.id?.includes("tawang") || job.projectName.toLowerCase().includes("tawang");
    const isLadakh = !isTin && !isKargil && !isSpiti && !isTawang;

    // Walls
    const wallU = isTin ? 3.2 : isKargil ? 0.14 : isSpiti ? 0.16 : isTawang ? 0.17 : 0.28;
    const wallDesc = isTin
      ? "Bare Galvanized Steel Sheet (0mm insulation)"
      : isKargil
      ? "120mm Vacuum PIR + 250mm Granite Mass"
      : isSpiti
      ? "150mm Rigid PIR Foam Core"
      : isTawang
      ? "160mm Hydrophobic Rockwool + Aerogel"
      : "150mm EPS + 250mm Rammed Earth Core";

    // South wall / Solar aperture
    const southDesc = isTin
      ? "Uninsulated Tin (High heat leak)"
      : isLadakh
      ? "300mm Rammed Earth Trombe Thermal Storage Wall"
      : isSpiti
      ? "High-Solar South Clerestory (22° shed)"
      : "Standard South Insulated Wall";

    // Roof
    const roofU = isTin ? 4.1 : isKargil ? 0.11 : isSpiti ? 0.12 : isTawang ? 0.13 : 0.16;
    const roofDesc = isTin
      ? "Uninsulated Bare CGI Metal (0mm)"
      : isKargil
      ? "180mm PIR Vacuum Panel Composite"
      : isSpiti
      ? "150mm PIR with High-Angle Solar Shed"
      : isTawang
      ? "160mm Rockwool with Timber Decking"
      : "200mm EPS Sandwich Metal Roof";

    // Windows
    const winU = isTin ? 5.8 : isKargil ? 0.78 : isSpiti ? 1.3 : isTawang ? 0.8 : 1.4;
    const winDesc = isTin
      ? "Single Glazed Clear 4mm (Drafty frame)"
      : isKargil
      ? "Triple Low-E Krypton-Filled (Thermally broken)"
      : isSpiti
      ? "Double Low-E Argon Clerestory"
      : isTawang
      ? "Triple Low-E Krypton Hardwood Timber"
      : "Double Low-E Argon-Filled Solar Aperture";

    // Infiltration
    const ach = isTin ? 1.8 : 0.25;
    const hrv = isTin ? 0 : isKargil ? 88 : isSpiti ? 85 : isTawang ? 86 : 85;

    // Thermal mass
    const massDesc = isTin
      ? "Zero Thermal Mass (Instant temperature swings)"
      : isLadakh
      ? "300mm Rammed Earth Trombe Mass (250 kJ/m²K)"
      : isKargil
      ? "250mm Local Granite Core (Permafrost barrier)"
      : isSpiti
      ? "Phase Change Material (PCM Salt Hydrate 21°C)"
      : "Himalayan Cedar Mass Timber Frame (31.5 m²)";

    return {
      wallU,
      wallDesc,
      southDesc,
      roofU,
      roofDesc,
      winU,
      winDesc,
      ach,
      hrv,
      massDesc,
    };
  };

  const baselineP = extractParams(baseline);

  const diffItems: ParamDiffItem[] = [];

  // Check Wall Insulation
  const allWallDesc = jobs.map((j) => extractParams(j).wallDesc);
  const wallDiffers = new Set(allWallDesc).size > 1;
  if (wallDiffers) {
    diffItems.push({
      id: "wall-insulation",
      category: "Opaque Envelope",
      name: "Exterior Wall Assembly & Insulation",
      description: "Controls conductive heat loss across north, east, and west cold vertical envelope faces.",
      values: jobs.map((job, idx) => {
        const p = extractParams(job);
        const isB = idx === 0;
        const uDelta = !isB && baselineP.wallU > p.wallU ? Math.round(((baselineP.wallU - p.wallU) / baselineP.wallU) * 100) : 0;
        return {
          jobId: job.id,
          jobName: job.projectName,
          value: p.wallDesc,
          subtext: `U-Value: ${p.wallU} W/m²K`,
          isBaseline: isB,
          deltaTag: isB ? "Reference Baseline" : `-${uDelta}% Heat Loss (U=${p.wallU})`,
          isImprovement: !isB && p.wallU < baselineP.wallU,
        };
      }),
    });
  }

  // Check South Wall / Passive Aperture
  const allSouthDesc = jobs.map((j) => extractParams(j).southDesc);
  const southDiffers = new Set(allSouthDesc).size > 1;
  if (southDiffers) {
    diffItems.push({
      id: "south-wall",
      category: "Glazing & Solar",
      name: "South Facade Passive Solar Strategy",
      description: "Harnesses daytime alpine solar irradiance to charge passive thermal storage.",
      values: jobs.map((job, idx) => {
        const p = extractParams(job);
        const isB = idx === 0;
        const isTrombe = p.southDesc.includes("Trombe");
        return {
          jobId: job.id,
          jobName: job.projectName,
          value: p.southDesc,
          subtext: isTrombe ? "Sensible Thermal Delay: 6.5 Hours" : "Standard Direct Wall",
          isBaseline: isB,
          deltaTag: isB ? "Reference" : isTrombe ? "+Trombe Storage Wall" : "+Insulated South",
          isImprovement: !isB,
        };
      }),
    });
  }

  // Check Roof Assembly
  const allRoofDesc = jobs.map((j) => extractParams(j).roofDesc);
  const roofDiffers = new Set(allRoofDesc).size > 1;
  if (roofDiffers) {
    diffItems.push({
      id: "roof-assembly",
      category: "Opaque Envelope",
      name: "Roof Thermal Shell & Pitch",
      description: "Prevents thermal buoyancy loss and sheds severe sub-zero snow loads.",
      values: jobs.map((job, idx) => {
        const p = extractParams(job);
        const isB = idx === 0;
        const uDelta = !isB && baselineP.roofU > p.roofU ? Math.round(((baselineP.roofU - p.roofU) / baselineP.roofU) * 100) : 0;
        return {
          jobId: job.id,
          jobName: job.projectName,
          value: p.roofDesc,
          subtext: `U-Value: ${p.roofU} W/m²K`,
          isBaseline: isB,
          deltaTag: isB ? "Reference" : `-${uDelta}% Heat Loss (U=${p.roofU})`,
          isImprovement: !isB && p.roofU < baselineP.roofU,
        };
      }),
    });
  }

  // Check Window Glazing
  const allWinDesc = jobs.map((j) => extractParams(j).winDesc);
  const winDiffers = new Set(allWinDesc).size > 1;
  if (winDiffers) {
    diffItems.push({
      id: "window-glazing",
      category: "Glazing & Solar",
      name: "Window Glazing & Frame Specification",
      description: "Balances visible solar heat gain coefficient (SHGC) against conductive nighttime glazing heat loss.",
      values: jobs.map((job, idx) => {
        const p = extractParams(job);
        const isB = idx === 0;
        const uDelta = !isB && baselineP.winU > p.winU ? Math.round(((baselineP.winU - p.winU) / baselineP.winU) * 100) : 0;
        return {
          jobId: job.id,
          jobName: job.projectName,
          value: p.winDesc,
          subtext: `U-Value: ${p.winU} W/m²K`,
          isBaseline: isB,
          deltaTag: isB ? "Single Glass (Drafty)" : `-${uDelta}% Window Loss (U=${p.winU})`,
          isImprovement: !isB && p.winU < baselineP.winU,
        };
      }),
    });
  }

  // Check Infiltration & Ventilation
  const allAch = jobs.map((j) => `${extractParams(j).ach}-${extractParams(j).hrv}`);
  const achDiffers = new Set(allAch).size > 1;
  if (achDiffers) {
    diffItems.push({
      id: "ventilation-ach",
      category: "Ventilation & Air",
      name: "Air Infiltration & Heat Recovery (HRV)",
      description: "Controls sub-zero cold draft penetration and recovers heat from exhausted stale air.",
      values: jobs.map((job, idx) => {
        const p = extractParams(job);
        const isB = idx === 0;
        const achDelta = !isB ? Math.round(((baselineP.ach - p.ach) / baselineP.ach) * 100) : 0;
        return {
          jobId: job.id,
          jobName: job.projectName,
          value: `${p.ach} ACH Infiltration · ${p.hrv > 0 ? `${p.hrv}% HRV Active` : "No Heat Recovery"}`,
          subtext: p.hrv > 0 ? "Continuous airtight mechanical ventilation" : "Uncontrolled crack leakage",
          isBaseline: isB,
          deltaTag: isB ? "Drafty (High Leakage)" : `-${achDelta}% Air Infiltration (+${p.hrv}% HRV)`,
          isImprovement: !isB && (p.ach < baselineP.ach || p.hrv > baselineP.hrv),
        };
      }),
    });
  }

  // Check Thermal Mass
  const allMassDesc = jobs.map((j) => extractParams(j).massDesc);
  const massDiffers = new Set(allMassDesc).size > 1;
  if (massDiffers) {
    diffItems.push({
      id: "thermal-mass",
      category: "Thermal Mass",
      name: "Internal Thermal Mass & Latent Heat Storage",
      description: "Absorbs daytime solar heat and discharges thermal energy back into the room during coldest night hours.",
      values: jobs.map((job, idx) => {
        const p = extractParams(job);
        const isB = idx === 0;
        return {
          jobId: job.id,
          jobName: job.projectName,
          value: p.massDesc,
          subtext: isB ? "Low thermal inertia" : "High thermal inertia buffer",
          isBaseline: isB,
          deltaTag: isB ? "No Thermal Mass" : "+Thermal Inertia Buffer",
          isImprovement: !isB,
        };
      }),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="micro-label">Parametric Comparison</span>
          <h2 className="font-editorial text-xl sm:text-2xl font-medium tracking-tight text-foreground">
            What Changed? (Visual Diff)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Only parameters that physically differ between configurations are highlighted below. Identical variables are omitted to eliminate clutter.
          </p>
        </div>
        <span className="rounded-full bg-secondary/80 border border-border px-3 py-1 text-[11px] font-mono font-semibold text-muted-foreground">
          {diffItems.length} Differing Parameters
        </span>
      </div>

      <div className="space-y-3">
        {diffItems.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all hover:border-border/90"
          >
            {/* Diff Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5 pb-2.5 border-b border-border/50">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  {item.category}
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  {item.name}
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground max-w-md">
                {item.description}
              </p>
            </div>

            {/* Side-by-Side Values for each configuration */}
            <div className={`grid gap-3 grid-cols-1 sm:grid-cols-${Math.min(jobs.length, 4)}`}>
              {item.values.map((val, idx) => {
                const color = TRACE_COLORS[idx % TRACE_COLORS.length];
                return (
                  <div
                    key={val.jobId}
                    className={`rounded-xl border p-3.5 flex flex-col justify-between ${
                      val.isBaseline
                        ? "border-border/70 bg-secondary/20"
                        : "border-border bg-card shadow-3xs"
                    }`}
                  >
                    <div>
                      {/* Job Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                            {val.isBaseline ? "Baseline" : `Candidate ${idx}`}
                          </span>
                        </div>
                        {val.deltaTag && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold shrink-0 ${
                              val.isBaseline
                                ? "bg-secondary text-muted-foreground"
                                : val.isImprovement
                                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : "bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400"
                            }`}
                          >
                            {val.deltaTag}
                          </span>
                        )}
                      </div>

                      {/* Main Parametric Value */}
                      <div className="text-xs font-semibold text-foreground leading-snug">
                        {val.value}
                      </div>
                    </div>

                    {/* Subtext info */}
                    {val.subtext && (
                      <div className="mt-2.5 pt-2 border-t border-border/40 text-[10px] text-muted-foreground font-mono">
                        {val.subtext}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
