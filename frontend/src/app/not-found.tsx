import React from "react";
import Link from "next/link";
import {
  Compass,
  Box,
  Sparkles,
  CloudSun,
  ShieldAlert,
  ArrowRight,
  ChevronRight,
  FolderGit2,
} from "lucide-react";
import { BrandMark } from "@/components/v0/platform-components";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full bg-[#06101E] text-white flex flex-col justify-between selection:bg-sky-500 selection:text-white overflow-hidden">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Deep Alpine Radial Gradients */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-sky-600/15 via-indigo-600/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-blue-700/10 rounded-full blur-[140px]" />

        {/* Tactical Sub-Zero Grid Lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Top Header */}
      <header className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6 sm:px-10 flex items-center justify-between">
        <Link href="/" aria-label="Go to ThermoShelter home" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <BrandMark inverse={true} />
        </Link>

        <Link
          href="/"
          className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white flex items-center gap-1.5"
        >
          <span>Command Center</span>
          <ChevronRight className="size-3.5 text-white/50" />
        </Link>
      </header>

      {/* Main 404 Canvas */}
      <main className="relative z-10 mx-auto my-auto w-full max-w-4xl px-6 py-12 text-center flex flex-col items-center">
        {/* Telemetry Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/40 px-4 py-1 text-xs font-mono text-rose-300 backdrop-blur-md shadow-[0_0_20px_rgba(244,63,94,0.15)] mb-6 animate-in fade-in zoom-in-95 duration-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <span>THERMAL_BOUNDARY_BREACH // ERROR 404</span>
        </div>

        {/* Big Editorial 404 Display */}
        <div className="relative mb-2">
          <span className="font-mono text-8xl sm:text-9xl font-bold tracking-tighter text-white/10 select-none block">
            404
          </span>
          <h1 className="font-editorial text-4xl sm:text-6xl font-medium tracking-tight text-white leading-tight absolute inset-0 flex items-center justify-center">
            Sector Coordinates Unreachable
          </h1>
        </div>

        <p className="max-w-xl text-sm sm:text-base text-white/70 leading-relaxed mt-4 font-normal">
          The requested shelter route, simulation job, or parametric coordinate could not be resolved.
          At extreme high-altitude frontiers (-28°C ambient, 4,800m elevation), uncalibrated vectors fall outside active engineering envelopes.
        </p>

        {/* Tactical HUD Telemetry Box */}
        <div className="my-8 w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left font-mono text-xs backdrop-blur-xl shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[10px] text-white/50 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-sky-400">
              <ShieldAlert className="size-3.5" />
              <span>Geodesic Telemetry Log</span>
            </span>
            <span>Signal: Disconnected</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px] text-white/80 pt-1">
            <div>
              <span className="text-white/40 block text-[9px] uppercase">Default Sector</span>
              <span>Leh Cold Continental (34.15°N, 77.58°E)</span>
            </div>
            <div>
              <span className="text-white/40 block text-[9px] uppercase">Base Elevation</span>
              <span>3,500m ASL · Cold Alpine</span>
            </div>
            <div>
              <span className="text-white/40 block text-[9px] uppercase">Simulation Solver</span>
              <span className="text-emerald-400 font-semibold">ThermoShelter Core Ready</span>
            </div>
            <div>
              <span className="text-white/40 block text-[9px] uppercase">System Status</span>
              <span className="text-amber-400 font-semibold">Self-Healing Pipeline Active</span>
            </div>
          </div>
        </div>

        {/* Fast Redirection Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-lg">
          <Link
            href="/"
            className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-black shadow-[0_10px_25px_rgba(255,255,255,0.15)] transition-all hover:bg-[#CBDCE6] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Compass className="size-4" />
            <span>Return to Base</span>
          </Link>

          <Link
            href="/designer/3d"
            className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Box className="size-4 text-sky-400" />
            <span>Launch 3D CAD</span>
          </Link>

          <Link
            href="/ai-designer"
            className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-5 py-3 text-xs font-semibold text-emerald-300 backdrop-blur-md transition-all hover:bg-emerald-900/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="size-4 text-emerald-400" />
            <span>AI Generative Studio</span>
          </Link>

          <Link
            href="/projects"
            className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold text-white/80 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
          >
            <FolderGit2 className="size-4 text-indigo-400" />
            <span>All Projects</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6 sm:px-10 text-center border-t border-white/5 text-[11px] font-mono text-white/40 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>ThermoShelter — Smart High-Altitude Thermal Architecture</span>
        <span className="text-white/30">SIH 2026 Problem Statement 26051</span>
      </footer>
    </div>
  );
}
