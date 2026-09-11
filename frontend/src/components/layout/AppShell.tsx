"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { BrandMark, Status } from "@/components/v0/platform-components";

interface NavItem {
  id: string;
  label: string;
  href: string;
}

const GLOBAL_NAV: NavItem[] = [
  { id: "projects", label: "Projects", href: "/projects" },
  { id: "materials", label: "Materials", href: "/materials" },
  { id: "settings", label: "Settings", href: "/settings" },
];

const WORKFLOW_TABS: NavItem[] = [
  { id: "overview", label: "Overview", href: "/dashboard" },
  { id: "designer", label: "Designer", href: "/designer" },
  { id: "3d", label: "3D CAD", href: "/designer/3d" },
  { id: "weather", label: "Climate", href: "/weather" },
  { id: "simulation", label: "Simulate", href: "/simulations" },
  { id: "results", label: "Results", href: "/results" },
  { id: "compare", label: "Compare", href: "/comparison" },
  { id: "optimize", label: "Optimize", href: "/optimization" },
  { id: "reports", label: "Report", href: "/reports" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  const {
    projects,
    activeProjectId,
    setActiveProject,
    settings,
    updateSettings,
  } = useShelterStore();

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Determine if this is a project-specific workflow view
  const isProjectView = WORKFLOW_TABS.some((tab) => pathname === tab.href || pathname.startsWith(tab.href + "/"));

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-secondary selection:text-foreground">
      {/* Top Workspace Header */}
      <header className="workspace-header sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="workspace-header-row mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
          {/* Brand Identity */}
          <Link href="/" aria-label="Go to ThermoShelter home" className="flex items-center">
            <BrandMark />
          </Link>

          {/* Desktop Global Navigation Pills */}
          <nav className="workspace-global-nav hidden items-center gap-2 md:flex" aria-label="Global navigation">
            {GLOBAL_NAV.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Unit System Toggle (SI vs IP) */}
            <div className="flex items-center rounded-full border border-border bg-secondary/60 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => updateSettings({ unitSystem: "SI" })}
                className={`rounded-full px-3 py-1 transition-colors ${
                  settings.unitSystem === "SI"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                SI
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ unitSystem: "IP" })}
                className={`rounded-full px-3 py-1 transition-colors ${
                  settings.unitSystem === "IP"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                IP
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex size-10 items-center justify-center rounded-full border border-border md:hidden hover:bg-secondary"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <nav
            className="mx-5 mb-4 rounded-[1.5rem] border border-border bg-card p-5 shadow-xl md:hidden"
            aria-label="Mobile navigation"
          >
            <p className="micro-label mb-2">Global Navigation</p>
            {GLOBAL_NAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block border-b border-border py-3 text-sm font-medium hover:text-[#6E818F]"
              >
                {item.label}
              </Link>
            ))}

            {activeProject && (
              <>
                <p className="micro-label mb-2 mt-4">Project Workflow</p>
                {WORKFLOW_TABS.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block border-b border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        )}
      </header>

      {/* Project Bar (Visible on project workflow routes) */}
      {isProjectView && activeProject && (
        <div className="project-bar border-b border-border bg-background">
          <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
            <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Active Project Identification */}
              <div className="flex min-w-0 items-center gap-4">
                <Link
                  href="/projects"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary"
                  aria-label="Back to projects"
                >
                  <ArrowLeft className="size-4" />
                </Link>

                <div className="relative min-w-0">
                  <button
                    onClick={() => setProjectPickerOpen(!projectPickerOpen)}
                    className="group flex items-center gap-2 text-left"
                  >
                    <span className="truncate text-sm font-semibold group-hover:text-[#6E818F]">
                      {activeProject.project.name}
                    </span>
                    <ChevronDown className="size-3 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
                  </button>

                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    {activeProject.location.region} · {activeProject.location.elevation.toLocaleString()} m · v{activeProject.project.version}
                  </p>

                  {/* Project Picker Dropdown */}
                  {projectPickerOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-card p-2 shadow-2xl animate-in zoom-in-95">
                      <p className="micro-label px-3 py-2">Switch Project</p>
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setActiveProject(p.id);
                            setProjectPickerOpen(false);
                          }}
                          className={`flex w-full flex-col rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                            p.id === activeProject.id
                              ? "bg-secondary font-semibold"
                              : "hover:bg-black/5"
                          }`}
                        >
                          <span>{p.project.name}</span>
                          <span className="text-[10px] text-muted-foreground">{p.location.region}</span>
                        </button>
                      ))}
                      <div className="mt-1 border-t border-border pt-1">
                        <Link
                          href="/projects"
                          onClick={() => setProjectPickerOpen(false)}
                          className="block rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-black/5"
                        >
                          Manage all projects →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center gap-3">
                <Status strong>Canonical model ready</Status>
              </div>
            </div>

            {/* Workflow Navigation Tabs */}
            <nav
              className="workflow-tabs flex gap-1 overflow-x-auto rounded-t-2xl bg-secondary/45 px-2 pt-2"
              aria-label="Project workflow"
            >
              {WORKFLOW_TABS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`shrink-0 rounded-t-xl border-b-2 px-3 pb-3 pt-2 text-[11px] font-semibold transition-colors ${
                      isActive
                        ? "border-foreground bg-background text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Page Workspace Content */}
      <main className="workspace-content mx-auto max-w-[1500px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        {children}
      </main>
    </div>
  );
}
