"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  Box,
  Sparkles,
  CloudSun,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  FolderGit2,
  Sliders,
  Play,
  Cpu,
  FileText,
  Search,
  Layers,
  Flame,
  RotateCcw,
} from "lucide-react";
import { BrandMark } from "@/components/v0/platform-components";

interface ModuleDirectoryItem {
  id: string;
  name: string;
  category: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}

const PLATFORM_MODULES: ModuleDirectoryItem[] = [
  {
    id: "projects",
    name: "Shelter Projects Library",
    category: "Models & Library",
    href: "/projects",
    description: "Certified Himalayan baseline presets, user-created variants, and simulation histories.",
    icon: FolderGit2,
    badge: "Active Registry",
  },
  {
    id: "designer-2d",
    name: "2D Parametric Wizard",
    category: "Engineering Designer",
    href: "/designer",
    description: "13-step guided engineering sequence from building geometry to solver settings.",
    icon: Sliders,
    badge: "13 Stages",
  },
  {
    id: "designer-3d",
    name: "3D CAD WebGL Studio",
    category: "Spatial Modeling",
    href: "/designer/3d",
    description: "Interactive Three.js visualizer with diurnal solar tracking and FLIR thermography.",
    icon: Box,
    badge: "Three.js CAD",
  },
  {
    id: "simulations",
    name: "ThermoShelter Simulation Engine",
    category: "Physics Dispatch",
    href: "/simulations",
    description: "Queue, execute, and monitor EnergyPlus and validated physics runs with authentic EPW weather.",
    icon: Play,
    badge: "Solver Ready",
  },
  {
    id: "weather",
    name: "Climate & Site Intelligence",
    category: "Atmospheric Data",
    href: "/weather",
    description: "Authentic sub-zero meteorological data for Leh, Dras-Kargil, Spiti, and Tawang.",
    icon: CloudSun,
    badge: "WMO 427053",
  },
  {
    id: "optimization",
    name: "Envelope Optimization",
    category: "Algorithmic Sizing",
    href: "/optimization",
    description: "Multi-objective genetic optimization balancing thermal comfort and insulation volume.",
    icon: Sparkles,
    badge: "Pareto Frontier",
  },
  {
    id: "comparison",
    name: "Design Comparison Benchmark",
    category: "Validation",
    href: "/comparison",
    description: "Side-by-side delta analysis between baseline tin barracks and optimized passive solar shelters.",
    icon: Layers,
    badge: "Delta Matrix",
  },
  {
    id: "reports",
    name: "Certified Thermal Reports",
    category: "Compliance",
    href: "/reports",
    description: "Download formal engineering documentation, heat loss breakdowns, and NBC 2016 verification.",
    icon: FileText,
    badge: "PDF Export",
  },
];

export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return PLATFORM_MODULES;
    const q = searchQuery.toLowerCase();
    return PLATFORM_MODULES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground flex flex-col justify-between selection:bg-sky-500 selection:text-white transition-colors duration-300">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-sky-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl dark:from-sky-600/15 dark:via-indigo-600/10" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />

        {/* Engineering Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Top Header */}
      <header className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6 sm:px-10 flex items-center justify-between border-b border-border/60 backdrop-blur-md">
        <Link href="/" aria-label="Go to ThermoShelter home" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <BrandMark />
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-secondary transition cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Go Back</span>
          </button>
          <Link
            href="/dashboard"
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background shadow-xs hover:opacity-90 transition flex items-center gap-1.5"
          >
            <span>Dashboard</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </header>

      {/* Main 404 Content Container */}
      <main className="relative z-10 mx-auto my-auto w-full max-w-5xl px-6 py-10 flex flex-col items-center">
        {/* Telemetry Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/40 px-3.5 py-1 text-xs font-mono text-rose-600 dark:text-rose-300 shadow-xs mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <span>404 ERROR // SECTOR COORDINATES UNRESOLVED</span>
        </div>

        {/* Heading Section with Clean Spacing (Zero Text Overlap) */}
        <div className="text-center space-y-2 max-w-2xl">
          <div className="font-mono text-6xl sm:text-7xl font-bold tracking-tight text-foreground/20 select-none">
            404
          </div>
          <h1 className="font-editorial text-3xl sm:text-5xl font-medium tracking-tight text-foreground">
            Thermal Zone & Coordinates Not Found
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            The requested high-altitude shelter model, simulation artifact, or parametric route could not be found.
            At extreme alpine frontiers (-28°C ambient, 4,800m elevation), uncalibrated parameters fall outside registered design envelopes.
          </p>
        </div>

        {/* Fast Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full max-w-xl">
          <button
            type="button"
            onClick={handleGoBack}
            className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-xs font-bold text-background shadow-md hover:opacity-90 transition cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Go Back to Previous Screen</span>
          </button>

          <Link
            href="/designer"
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition"
          >
            <Sliders className="size-4 text-sky-500" />
            <span>2D Wizard</span>
          </Link>

          <Link
            href="/designer/3d"
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition"
          >
            <Box className="size-4 text-emerald-500" />
            <span>3D CAD Studio</span>
          </Link>

          <Link
            href="/projects"
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition"
          >
            <FolderGit2 className="size-4 text-indigo-500" />
            <span>Projects Library</span>
          </Link>
        </div>

        {/* Interactive Search & Platform Module Directory */}
        <div className="mt-10 w-full space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Available Engineering Workspaces</h3>
              <p className="text-xs text-muted-foreground">Jump directly to any platform module or search by feature.</p>
            </div>

            {/* Quick Filter Box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full rounded-full border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredModules.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group flex flex-col justify-between rounded-2xl border border-border bg-card/60 p-4 transition-all hover:bg-card hover:border-foreground/40 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex size-8 items-center justify-center rounded-xl bg-secondary text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                        <Icon className="size-4" />
                      </div>
                      <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">
                        {item.badge}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {item.name}
                      </h4>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-foreground/80 group-hover:text-foreground">
                    <span>Open Module</span>
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Geodesic Telemetry Box */}
        <div className="mt-8 w-full rounded-2xl border border-border bg-secondary/30 p-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border pb-2 text-[10px] text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-foreground font-semibold">
              <ShieldAlert className="size-3.5 text-amber-500" />
              <span>Platform Geodesic Status</span>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">● System Operable</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-3 text-muted-foreground">
            <div>
              <span className="block text-[9px] uppercase text-muted-foreground/70">Default Station</span>
              <span className="text-foreground font-medium">Leh TMYx (427053)</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase text-muted-foreground/70">Elevation Reference</span>
              <span className="text-foreground font-medium">3,500m ASL · Cold Alpine</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase text-muted-foreground/70">Simulation Core</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">ThermoShelter v3.0</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase text-muted-foreground/70">Persistence Mode</span>
              <span className="text-foreground font-medium">Continuous Autosave</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-6 sm:px-10 border-t border-border text-[11px] text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>ThermoShelter — Smart High-Altitude Thermal Architecture</span>
        <span>SIH 2026 Problem Statement 26051</span>
      </footer>
    </div>
  );
}
