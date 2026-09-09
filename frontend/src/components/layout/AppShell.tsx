"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  Layers,
  CloudSun,
  Cpu,
  LineChart,
  GitCompare,
  Sliders,
  FileCheck2,
  Settings,
  Wand2,
  Box,
  ThermometerSnowflake,
  Menu,
  X,
  Compass,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Judge Demo", href: "/demo", icon: Sparkles, badge: "SIH" },
  { name: "3D Designer", href: "/designer/3d", icon: Box, badge: "3D" },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "New Project", href: "/projects/new", icon: PlusCircle },
  { name: "Materials", href: "/materials", icon: Layers },
  { name: "Weather", href: "/weather", icon: CloudSun },
  { name: "Simulations", href: "/simulations", icon: Cpu },
  { name: "Results", href: "/results", icon: LineChart },
  { name: "Comparison", href: "/comparison", icon: GitCompare },
  { name: "Optimization", href: "/optimization", icon: Sliders },
  { name: "Reports", href: "/reports", icon: FileCheck2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    projects,
    activeProjectId,
    setActiveProject,
    simulations,
    settings,
    updateSettings,
  } = useShelterStore();

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const runningJobsCount = simulations.filter(
    (s) => s.status === "running" || s.status === "queued" || s.status === "preparing"
  ).length;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
      {/* Desktop Engineering Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/80 bg-slate-900/70 backdrop-blur-xl z-40">
        {/* Branding */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <ThermometerSnowflake className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-white">ShelterThermal</span>
              <span className="rounded bg-blue-500/20 px-1 py-0.2 text-[9px] font-bold text-blue-400">SIH</span>
            </div>
            <p className="text-[10px] font-medium text-slate-400">Cold-Climate Engineering</p>
          </div>
        </div>

        {/* 13-Step Designer Primary Action */}
        <div className="px-4 py-4">
          <Link
            href="/designer"
            className="group flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-size-200 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-right hover:shadow-blue-600/30"
          >
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 transition-transform group-hover:rotate-12" />
              <span>13-Step Designer</span>
            </div>
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
              Wizard
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Engineering Suite
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href) && item.href !== "/projects/new");
            const isSimulations = item.name === "Simulations";

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {isSimulations && runningJobsCount > 0 && (
                  <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                    {runningJobsCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer / Active Station Status */}
        <div className="border-t border-slate-800/80 p-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-blue-400" />
                Climate Zone
              </span>
              <span className="text-[10px] font-mono text-emerald-400">ASHRAE 8</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400 truncate">
              {activeProject ? activeProject.location.region : "Leh, Ladakh (3500m)"}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Layout */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top Engineering Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Active Project Selector */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Active Project
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <span>{activeProject?.project?.name || "No Project Selected"}</span>
                  <Badge variant="cold" className="text-[9px] py-0 px-1">
                    v{activeProject?.project?.version || "1.0"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Right Header Controls: Unit toggle & Quick Launch */}
          <div className="flex items-center gap-3">
            {/* Unit System Toggle (SI vs IP) */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => updateSettings({ unitSystem: "SI" })}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  settings.unitSystem === "SI"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                SI (W/m²-K)
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ unitSystem: "IP" })}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  settings.unitSystem === "IP"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                IP (Btu/h-ft²-°F)
              </button>
            </div>

            {/* Direct Links to 3D Designer & 13-step wizard */}
            <Link
              href="/designer/3d"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-sky-600/90 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-sky-500 border border-sky-500/30"
            >
              <Box className="h-3.5 w-3.5 text-sky-200" />
              <span>3D Designer</span>
            </Link>

            <Link
              href="/designer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Designer Wizard</span>
            </Link>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-slate-900 p-4 space-y-2">
            <Link
              href="/designer/3d"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-sky-600 p-2.5 text-xs font-bold text-white"
            >
              <Box className="h-4 w-4" />
              <span>Launch 3D Designer</span>
            </Link>
            <Link
              href="/designer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 p-2.5 text-xs font-bold text-white"
            >
              <Wand2 className="h-4 w-4" />
              <span>Launch 13-Step Designer Wizard</span>
            </Link>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                <item.icon className="h-4 w-4 text-slate-400" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Main Work Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
