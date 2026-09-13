"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { BrandMark, Status } from "@/components/v0/platform-components";
import { WORKFLOW_PIPELINE } from "@/components/layout/WorkflowFooter";
import { usePlatformInit } from "@/hooks/use-platform-init";

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

export function AppShell({ children }: { children: React.ReactNode }) {
  usePlatformInit();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  const {
    projects,
    activeProjectId,
    setActiveProject,
    simulations,
    comparisonJobIds,
    settings,
    updateSettings,
  } = useShelterStore();

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Self-heal activeProjectId if deleted across tabs or devices
  useEffect(() => {
    if (projects.length > 0 && (!activeProjectId || !projects.some((p) => p.id === activeProjectId))) {
      setActiveProject(projects[0].id);
    }
  }, [projects, activeProjectId, setActiveProject]);

  // Determine if this is a project-specific workflow view
  const isProjectView = WORKFLOW_PIPELINE.some(
    (tab) => pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href))
  );

  // Determine current active step in pipeline
  const currentStepIndex = WORKFLOW_PIPELINE.findIndex((step) => {
    if (step.href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname === step.href || pathname.startsWith(step.href);
  });

  const nextRecommendedStep =
    currentStepIndex !== -1 && currentStepIndex < WORKFLOW_PIPELINE.length - 1
      ? WORKFLOW_PIPELINE[currentStepIndex + 1]
      : null;

  // Compute step completions for progress metrics
  const completedRuns = simulations.filter(
    (s) => s.projectId === activeProject?.id && s.status === "completed"
  );

  const getStepStatus = (stepId: string) => {
    switch (stepId) {
      case "overview":
        return !!activeProject;
      case "climate":
        return !!activeProject?.location?.weatherSource;
      case "designer":
        return !!activeProject?.geometry && !!activeProject?.envelope;
      case "3d":
        return !!activeProject?.geometry;
      case "simulate":
        return completedRuns.length > 0;
      case "results":
        return completedRuns.length > 0;
      case "optimize":
        return completedRuns.length > 0;
      case "compare":
        return comparisonJobIds.length >= 2 || completedRuns.length >= 2;
      case "report":
        return completedRuns.length > 0;
      default:
        return false;
    }
  };

  const completedCount = WORKFLOW_PIPELINE.filter((step) => getStepStatus(step.id)).length;
  const progressPercent = Math.round((completedCount / WORKFLOW_PIPELINE.length) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-secondary selection:text-foreground">
      {/* Top Workspace Header */}
      <header className="workspace-header sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="workspace-header-row mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
          {/* Brand Identity */}
          <Link href="/" aria-label="Go to ThermoShelter home" className="flex items-center">
            <BrandMark />
          </Link>

          {/* Global Utility Navigation */}
          <nav
            aria-label="Global application navigation"
            className="hidden items-center gap-1 rounded-full border border-border bg-secondary/50 p-1 md:flex"
          >
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
                <p className="micro-label mb-2 mt-4">Connected Engineering Pipeline</p>
                {WORKFLOW_PIPELINE.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between border-b border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <span>{item.stepNumber}. {item.label}</span>
                    {getStepStatus(item.id) && <CheckCircle2 className="size-3 text-emerald-500" />}
                  </Link>
                ))}
              </>
            )}
          </nav>
        )}

        {/* Project Bar with Connected Flow Pipeline (Visible on project workflow routes) */}
        {isProjectView && activeProject && (
          <div className="project-bar border-t border-border bg-background/95">
            <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
              <div className="flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                        {projects.length > 0 ? (
                          projects.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setActiveProject(p.id);
                                setProjectPickerOpen(false);
                              }}
                              className={`flex w-full flex-col rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                                p.id === activeProject?.id
                                  ? "bg-secondary font-semibold"
                                  : "hover:bg-black/5"
                              }`}
                            >
                              <span>{p.project.name}</span>
                              <span className="text-[10px] text-muted-foreground">{p.location.region}</span>
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-xs text-muted-foreground">No projects found</p>
                        )}
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

                {/* Status and Next Recommended Step CTA */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="hidden items-center gap-2 sm:flex">
                    <Status strong>{completedCount} of {WORKFLOW_PIPELINE.length} stages validated</Status>
                  </div>

                  {nextRecommendedStep && (
                    <Link
                      href={nextRecommendedStep.href}
                      className="group inline-flex items-center gap-2 rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6E818F]"
                    >
                      <Sparkles className="size-3 text-[#CBDCE6]" />
                      <span>Next: {nextRecommendedStep.label}</span>
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Connected Chevron Workflow Stepper */}
              <nav
                className="workflow-tabs flex items-center gap-1.5 overflow-x-auto rounded-t-2xl bg-secondary/45 px-3 py-2"
                aria-label="Connected engineering workflow"
              >
                {WORKFLOW_PIPELINE.map((item, idx) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard" || pathname === "/"
                      : pathname === item.href || pathname.startsWith(item.href);
                  const isDone = getStepStatus(item.id);

                  return (
                    <React.Fragment key={item.id}>
                      <Link
                        href={item.href}
                        className={`group relative flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                          isActive
                            ? "bg-black text-white shadow-sm"
                            : isDone
                            ? "bg-white/85 text-black border border-black/10 hover:bg-white"
                            : "text-[#6E818F] hover:bg-white/50 hover:text-black"
                        }`}
                      >
                        {/* Step Number / Checkmark Badge */}
                        <span
                          className={`flex size-4 items-center justify-center rounded-full text-[9px] font-bold ${
                            isActive
                              ? "bg-white text-black"
                              : isDone
                              ? "bg-[#CBDCE6] text-black"
                              : "bg-black/5 text-[#6E818F]"
                          }`}
                        >
                          {isDone ? "✓" : item.stepNumber}
                        </span>

                        <span>{item.label}</span>
                      </Link>

                      {/* Connected Flow Arrow between tabs */}
                      {idx < WORKFLOW_PIPELINE.length - 1 && (
                        <ChevronRight className="size-3 shrink-0 text-[#6E818F]/40" />
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Workspace Content */}
      <main className="workspace-content mx-auto max-w-[1500px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        {children}
      </main>
    </div>
  );
}
