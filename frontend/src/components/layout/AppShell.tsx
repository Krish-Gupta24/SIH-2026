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
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { useAuthStore } from "@/lib/store/use-auth-store";
import { filterProjectsForUser } from "@/lib/store/shelter-auth-filter";
import { AuthAccountModal } from "@/features/auth/AuthAccountModal";
import { BrandMark, Status } from "@/components/v0/platform-components";
import { WORKFLOW_PIPELINE, getWorkflowStepIndex } from "@/components/layout/workflow-pipeline";
import { WorkflowFloatingDock } from "@/components/layout/WorkflowFloatingDock";
import { usePlatformInit } from "@/hooks/use-platform-init";
import { motion, AnimatePresence } from "framer-motion";
import { PageMotionWrapper, PulseBeacon } from "@/components/motion/MotionWrappers";

interface NavItem {
  id: string;
  label: string;
  href: string;
}

const GLOBAL_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "ai-designer", label: "AI Studio", href: "/ai-designer" },
  { id: "projects", label: "Projects", href: "/projects" },
  { id: "fuel-costs", label: "Fuel & Costs", href: "/fuel-costs" },
  { id: "materials", label: "Materials", href: "/materials" },
  { id: "settings", label: "Settings", href: "/settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  usePlatformInit();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  const { currentUser, setAuthModalOpen } = useAuthStore();

  const {
    projects,
    activeProjectId,
    setActiveProject,
    resetProjectsToDefault,
    simulations,
    comparisonJobIds,
    settings,
    updateSettings,
  } = useShelterStore();

  // Filter projects by authenticated user isolation
  const visibleProjects = filterProjectsForUser(projects, currentUser?.id);
  const activeProject = visibleProjects.find((p) => p.id === activeProjectId) || visibleProjects[0] || projects[0];

  // Self-heal projects & activeProjectId if deleted across tabs or empty or switched user
  useEffect(() => {
    if (projects.length === 0) {
      resetProjectsToDefault();
    } else if (!activeProjectId || !visibleProjects.some((p) => p.id === activeProjectId)) {
      if (visibleProjects.length > 0) {
        setActiveProject(visibleProjects[0].id);
      } else if (projects.length > 0) {
        setActiveProject(projects[0].id);
      }
    }
  }, [projects, visibleProjects, activeProjectId, setActiveProject, resetProjectsToDefault]);

  // Determine if this is a project-specific workflow view
  const currentStepIndex = getWorkflowStepIndex(pathname);
  const isProjectView = currentStepIndex !== -1;
  const isImmersiveDesigner = pathname === "/designer/3d";

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
        return Boolean(activeProject && activeProject.project?.name);
      case "climate":
        return Boolean(activeProject?.location?.weatherSource && (activeProject.location.elevation ?? 0) > 0);
      case "designer":
        return Boolean(
          activeProject?.envelope?.walls?.north?.layers?.length &&
          activeProject?.envelope?.walls?.south?.layers?.length &&
          activeProject?.envelope?.roof?.layers?.length
        );
      case "3d":
        return Boolean(
          activeProject?.geometry?.length &&
          activeProject?.geometry?.width &&
          activeProject?.geometry?.height
        );
      case "simulate":
        return completedRuns.length > 0;
      case "results":
        return completedRuns.some((r) => r.results?.summary);
      case "optimize":
        return simulations.some(
          (s) => s.projectId === activeProject?.id && (s.status === "completed" || s.engine?.includes("AI") || s.engine?.includes("OPT"))
        );
      case "compare":
        return comparisonJobIds.length >= 2 || simulations.length >= 2;
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
                  className={`relative rounded-full px-4 py-2 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? "text-background font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeGlobalNavTab"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute inset-0 rounded-full bg-foreground z-0"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Authenticated Defense Identity Pill */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="group flex items-center gap-2 rounded-full border border-border bg-card/90 py-1 pl-1.5 pr-2.5 sm:pr-3 text-left transition-all hover:border-[#6E818F] hover:bg-secondary/70 shadow-xs"
              title="Defense Access Control & Identity Switcher"
              aria-label="Defense Access Control & Identity Switcher"
            >
              <div className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-foreground group-hover:text-[#6E818F] transition-colors truncate max-w-[125px]">
                    {currentUser?.name || "Demo Officer"}
                  </span>
                  {currentUser?.isDemoDefault && (
                    <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Demo
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-muted-foreground font-mono truncate max-w-[125px]">
                  {currentUser?.callsign || currentUser?.id}
                </div>
              </div>
            </button>

            {/* Unit System Toggle (SI vs IP) */}
            <div className="flex items-center rounded-full border border-border bg-secondary/60 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => updateSettings({ unitSystem: "SI" })}
                className={`rounded-full px-3 py-1 transition-colors ${settings.unitSystem === "SI"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                SI
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ unitSystem: "IP" })}
                className={`rounded-full px-3 py-1 transition-colors ${settings.unitSystem === "IP"
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
            {/* Mobile Active Identity Card */}
            <div className="mb-4 rounded-xl border border-border bg-secondary/30 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span className="text-xs font-bold text-foreground">{currentUser?.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {currentUser?.callsign}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{currentUser?.unit}</p>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setAuthModalOpen(true);
                }}
                className="mt-2.5 w-full rounded-lg border border-border bg-card py-1.5 text-center text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Switch Officer Identity / Account
              </button>
            </div>

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

        {/* Project Bar (Streamlined: Identity, Live Progress & Next Step CTA) */}
        {isProjectView && activeProject && (
          <div className="project-bar border-t border-border bg-background/95">
            <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
              <div className="flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                {/* Active Project Identification */}
                <div className="flex min-w-0 items-center gap-3">
                  <Link
                    href="/projects"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary"
                    aria-label="Back to projects"
                  >
                    <ArrowLeft className="size-3.5" />
                  </Link>

                  <div className="relative min-w-0">
                    <button
                      onClick={() => setProjectPickerOpen(!projectPickerOpen)}
                      className="group flex items-center gap-2 text-left"
                    >
                      <PulseBeacon color="emerald" size="sm" />
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
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                          <p className="micro-label">Switch Project</p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {visibleProjects.length} visible
                          </span>
                        </div>
                        <div className="max-h-64 overflow-y-auto py-1">
                          {visibleProjects.length > 0 ? (
                            visibleProjects.map((p) => {
                              const isOwner = p.project?.userId === currentUser?.id || (p as any).userId === currentUser?.id;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    setActiveProject(p.id);
                                    setProjectPickerOpen(false);
                                  }}
                                  className={`flex w-full flex-col rounded-xl px-3 py-2 text-left text-xs transition-colors ${p.id === activeProject?.id
                                    ? "bg-secondary font-semibold"
                                    : "hover:bg-black/5"
                                    }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="truncate">{p.project.name}</span>
                                    {isOwner && (
                                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1">
                                        Mine
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">{p.location.region}</span>
                                </button>
                              );
                            })
                          ) : (
                            <p className="px-3 py-2 text-xs text-muted-foreground">No shelters available</p>
                          )}
                        </div>
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
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Connected Workspace Layout: Left Sidebar + Main Content */}
      <div className="flex flex-1 min-h-[calc(100vh-124px)]">
        {/* Engineering Workflow Left Sidebar */}
        {isProjectView && activeProject && (
          <WorkflowFloatingDock
            completedStepIds={WORKFLOW_PIPELINE.filter((step) => getStepStatus(step.id)).map((s) => s.id)}
            activeProjectName={activeProject.project?.name}
            is3dView={isImmersiveDesigner}
          />
        )}

        {/* Main Page Workspace Content */}
        <main
          className={
            isImmersiveDesigner
              ? "flex-1 min-w-0 workspace-content designer-3d-workspace-content"
              : "flex-1 min-w-0 workspace-content mx-auto max-w-[1500px] px-5 py-6 sm:px-8 sm:py-8 lg:px-12"
          }
        >
          <PageMotionWrapper key={pathname}>
            {children}
          </PageMotionWrapper>
        </main>
      </div>

      {/* Defense Identity & Access Control Modal */}
      <AuthAccountModal />
    </div>
  );
}
