"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  Copy,
  Plus,
  Search,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Lock,
  User,
  Sparkles,
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import { useAuthStore } from "@/lib/store/use-auth-store";
import { filterProjectsForUser, CANONICAL_PRESET_IDS } from "@/lib/store/shelter-auth-filter";
import { PulseBeacon } from "@/components/motion/MotionWrappers";
import type { ShelterModel } from "@/types/shelter";
import { ActionButton, DataPair, EmptyState, PageIntro } from "@/components/v0/platform-components";
import { NewProjectModal } from "./NewProjectModal";
import { DeleteProjectModal } from "./DeleteProjectModal";

export function ProjectsView() {
  const router = useRouter();
  const { currentUser, setAuthModalOpen } = useAuthStore();
  const {
    projects,
    simulations,
    activeProjectId,
    setActiveProject,
    addProject,
    deleteProject,
    saveProjectVersion,
    resetProjectsToDefault,
  } = useShelterStore();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "region">("name");
  const [filterTab, setFilterTab] = useState<"all" | "mine" | "templates">("all");
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ShelterModel | null>(null);

  // Helper to distinguish standard military benchmarks vs user-created custom shelters
  const isCustomShelter = (p: ShelterModel) => {
    const isPreset =
      p.isSystemPreset ||
      p.project?.isSystemPreset ||
      CANONICAL_PRESET_IDS.has(p.id) ||
      p.id === "shelter-ladakh-01" ||
      p.id === "shelter-kargil-02" ||
      p.id === "shelter-spiti-03" ||
      p.id === "shelter-tawang-04" ||
      p.id === "shelter-baseline-tin";
    return !isPreset;
  };

  const isOwnedByMe = (p: ShelterModel) => {
    const owner = p.project?.userId || (p as any).userId;
    if (!owner) return currentUser?.id === "MES-14CORPS-DEMO";
    return owner === currentUser?.id;
  };

  // Only shelters belonging to active user or standard templates are accessible
  const userScopedProjects = filterProjectsForUser(projects, currentUser?.id);
  const mySheltersCount = userScopedProjects.filter((p) => isCustomShelter(p) && isOwnedByMe(p)).length;
  const templatesCount = userScopedProjects.filter((p) => !isCustomShelter(p)).length;

  // Filter according to selected tab (All vs Mine vs Standard Templates)
  const tabProjects = userScopedProjects.filter((p) => {
    if (filterTab === "mine") return isCustomShelter(p) && isOwnedByMe(p);
    if (filterTab === "templates") return !isCustomShelter(p);
    return true;
  });

  const filteredProjects = [...tabProjects]
    .filter((project) =>
      `${project.project?.name || project.name || ""} ${project.location?.region || ""} ${project.project?.description || (project as any).description || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sort === "name"
        ? (a.project?.name || a.name || "").localeCompare(b.project?.name || b.name || "")
        : (a.location?.region || "").localeCompare(b.location?.region || "")
    );

  const openProject = (id: string) => {
    setActiveProject(id);
    router.push("/dashboard");
  };

  const duplicateProject = (project: ShelterModel) => {
    const created = saveProjectVersion(
      project.id,
      `Copy ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`,
      `Working copy of ${project.project.name}`
    );
    if (created) {
      openProject(created.id);
    }
  };

  const createProject = () => {
    const base = projects.find((p) => p.id === activeProjectId) || projects[0];
    const id = `shelter-${Date.now().toString().slice(-7)}`;
    const currentUserId = currentUser?.id || "MES-14CORPS-DEMO";
    const newModel: ShelterModel = base
      ? JSON.parse(JSON.stringify(base))
      : {
          schemaVersion: "1.0.0",
          id,
          userId: currentUserId,
          project: {
            id,
            userId: currentUserId,
            name: "New Alpine Shelter",
            version: "0.1.0",
            description: "High-altitude shelter model ready for engineering definition.",
            createdAt: new Date().toISOString(),
          },
          location: {
            name: "Leh Station",
            region: "Ladakh",
            latitude: 34.1526,
            longitude: 77.5771,
            elevation: 3500,
            climateZone: "Extreme Cold Sub-Alpine",
            weatherSource: "Leh Synthetic Hourly",
            designTempWinter: -20.5,
            designTempSummer: 28,
            annualHeatingDegreeDays: 4850,
          },
          geometry: {
            length: 8,
            width: 5,
            height: 3,
            orientation: 180,
            roofType: "Flat",
            roofPitchDeg: 0,
            groundClearanceM: 0,
          },
          envelope: {
            walls: {
              north: { id: "w-n", name: "Rammed Earth Wall", layers: [], uValue: 0.28, heatCapacity: 250 },
              south: { id: "w-s", name: "Rammed Earth Wall", layers: [], uValue: 0.28, heatCapacity: 250 },
              east: { id: "w-e", name: "Rammed Earth Wall", layers: [], uValue: 0.28, heatCapacity: 250 },
              west: { id: "w-w", name: "Rammed Earth Wall", layers: [], uValue: 0.28, heatCapacity: 250 },
            },
            roof: { id: "r-1", name: "Cold Climate Insulated Roof", layers: [], uValue: 0.16, heatCapacity: 120 },
            floor: { id: "f-1", name: "Insulated Ground Slab", layers: [], uValue: 0.2, heatCapacity: 200 },
          },
          windows: [],
          doors: [],
          thermalMass: [],
          ventilation: {
            infiltrationACH: 0.25,
            mechanicalVentilationACH: 0.5,
            heatRecoveryEfficiency: 0.75,
          },
          internalLoads: {
            occupantsCount: 4,
            activityLevelW: 120,
            lightingPowerDensityWPerM2: 5,
            equipmentPowerDensityWPerM2: 3,
          },
          designTargets: {
            comfortTempMinC: 18,
            comfortTempMaxC: 24,
            targetComfortPercent: 85,
            maxAnnualHeatingDemandKwhM2: 35,
          },
        };

    newModel.id = id;
    newModel.userId = currentUserId;
    newModel.project.id = id;
    newModel.project.userId = currentUserId;
    newModel.project.name = "Untitled high-altitude shelter";
    newModel.project.version = "0.1.0";
    newModel.project.createdAt = new Date().toISOString();

    addProject(newModel);
    setActiveProject(id);
    router.push("/designer");
  };

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Engineering workspace"
        title="Shelter projects"
        description="Canonical models, climate context, and simulation history. Continue what needs attention or begin a controlled variant."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              tone="secondary"
              onClick={() => {
                if (window.confirm("Reset projects to certified 1-Year Max Comfort Himalayan Presets (Leh, Dras-Kargil, Spiti, Tawang)? All standard models will be restored.")) {
                  resetProjectsToDefault();
                }
              }}
              className="rounded-full text-xs font-semibold"
            >
              <RotateCcw className="size-3.5 mr-1" />
              Reset Demo Presets
            </ActionButton>
            <ActionButton onClick={() => setIsNewProjectModalOpen(true)}>
              <Plus className="size-4" />
              New project
            </ActionButton>
          </div>
        }
      />

      {/* Defense Workspace Isolation & Active Identity Banner */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-background to-teal-500/10 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <PulseBeacon color="emerald" size="sm" />
                  AUTHENTICATED ACCESS CONTROL
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Officer ID: <strong className="text-foreground">{currentUser?.id}</strong>
                </span>
                {currentUser?.isDemoDefault && (
                  <span className="rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold text-[9px] uppercase px-1.5 py-0.5">
                    Demo Mode Active
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-foreground mt-1">
                {currentUser?.name} · <span className="font-normal text-muted-foreground">{currentUser?.rank}</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentUser?.unit} · <span className="font-mono text-foreground font-semibold">{currentUser?.callsign}</span> · Sector: {currentUser?.sector}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:border-foreground hover:bg-secondary transition-all flex items-center gap-2 shadow-2xs group"
            >
              <User className="size-3.5 text-muted-foreground group-hover:text-foreground" />
              <span>Switch Identity / Call Sign</span>
            </button>
          </div>
        </div>

        {/* Telemetry Footer */}
        <div className="mt-4 pt-3.5 border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Lock className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Shelter Isolation Active: Custom shelters created under <strong className="font-mono text-foreground">{currentUser?.id}</strong> are visible only to this account.
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
            <span className="text-emerald-700 dark:text-emerald-300 font-bold">{mySheltersCount} My Shelters</span>
            <span>·</span>
            <span>{templatesCount} System Templates</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search & Sort */}
      <div className="flex flex-col gap-4">
        {/* Workspace Scope Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filterTab === "all"
                ? "bg-foreground text-background shadow-xs font-bold"
                : "border border-border bg-card/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            All Accessible Shelters ({userScopedProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("mine")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterTab === "mine"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "border border-border bg-card/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Lock className="size-3" />
            My Custom Shelters ({mySheltersCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("templates")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterTab === "templates"
                ? "bg-foreground text-background shadow-xs font-bold"
                : "border border-border bg-card/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <ShieldCheck className="size-3" />
            Standard Templates ({templatesCount})
          </button>
        </div>

        {/* Search & Sort bar */}
        <div className="project-controls grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 shadow-[0_10px_30px_rgba(0,0,0,.04)] transition-shadow focus-within:shadow-[0_14px_38px_rgba(0,0,0,.08)]">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Search projects</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search project, description, or region"
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 text-xs shadow-[0_10px_30px_rgba(0,0,0,.04)]">
            <span className="text-muted-foreground">Sort by</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as "name" | "region")}
              className="bg-transparent font-semibold outline-none cursor-pointer"
            >
              <option value="name">Name</option>
              <option value="region">Region</option>
            </select>
            <ChevronDown className="size-4 text-muted-foreground" />
          </label>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="project-grid grid gap-6 lg:grid-cols-2">
          {filteredProjects.map((project, index) => {
            const run = simulations.find(
              (item) =>
                item.projectId === project.id &&
                item.status === "completed" &&
                item.results
            );
            const updated = project.project?.updatedAt || project.project?.createdAt || (project as any).createdAt;
            const projectName = project.project?.name || project.name || "Untitled Shelter";
            const projectRegion = project.location?.region || "High-Altitude";
            const projectDesc = project.project?.description || (project as any).description || "Canonical shelter definition ready for thermal simulation.";
            const completedStages = [
              Boolean(project.project?.name), // 1. Overview
              Boolean(project.location?.weatherSource), // 2. Climate
              Boolean(project.envelope?.walls?.north?.layers?.length), // 3. 2D Designer
              Boolean(project.geometry?.length && project.geometry?.width), // 4. 3D CAD
              Boolean(run), // 5. Simulate
              Boolean(run?.results?.summary), // 6. Results
              Boolean(simulations.some((s) => s.projectId === project.id && (s.status === "completed" || s.engine?.includes("AI")))), // 7. Optimize
              Boolean(simulations.length >= 2), // 8. Compare
              Boolean(run), // 9. Report
            ].filter(Boolean).length;
            const projectProgressPct = Math.round((completedStages / 9) * 100);
            const isActive = project.id === activeProjectId;
            const isCustom = isCustomShelter(project);
            const isMine = isCustom && isOwnedByMe(project);

            return (
              <article
                key={project.id}
                className={`project-card group flex min-h-[320px] flex-col rounded-2xl border bg-card p-7 sm:p-9 shadow-[0_10px_30px_rgba(0,0,0,.03)] transition-all hover:-translate-y-1 hover:border-[#6E818F] hover:shadow-[0_18px_45px_rgba(0,0,0,.08)] ${
                  isActive ? "border-foreground" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      0{index + 1} · {projectRegion} {isActive ? "· Active" : ""}
                    </span>
                    {isMine ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                        <Lock className="size-2.5" />
                        My Custom Shelter
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                        <ShieldCheck className="size-2.5" />
                        Standard Template
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => duplicateProject(project)}
                      className="flex size-9 items-center justify-center rounded-full border border-border opacity-70 transition-all hover:opacity-100 hover:bg-secondary"
                      aria-label={`Duplicate ${projectName}`}
                      title="Duplicate project"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setProjectToDelete(project);
                        }}
                        className="flex size-9 items-center justify-center rounded-full border border-border text-red-500 opacity-60 transition-all hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30"
                        aria-label={`Delete ${projectName}`}
                        title="Delete custom shelter"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openProject(project.id)}
                  className="mt-8 block text-left"
                >
                  <h2 className="max-w-lg text-2xl font-medium tracking-[-0.04em] sm:text-3xl">
                    {projectName}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                    {projectDesc}
                  </p>
                </button>

                {/* Workflow Stage Progress */}
                <div className="mt-4 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                    <span>Workflow Progress</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {completedStages}/9 Stages ({projectProgressPct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden border border-border">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${projectProgressPct}%` }}
                    />
                  </div>
                </div>

                <dl className="mt-auto grid grid-cols-3 border-t border-border pt-4">
                  <DataPair
                    label="Elevation"
                    value={project.location?.elevation ? `${project.location.elevation.toLocaleString()} m` : "3,500 m"}
                  />
                  <DataPair
                    label="Demand"
                    value={
                      run?.results
                        ? `${run.results.summary.heatingDemandKwhM2} kWh/m²`
                        : "Pending"
                    }
                  />
                  <DataPair
                    label="Updated"
                    value={updated ? new Date(updated).toLocaleDateString() : "—"}
                  />
                </dl>

                <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                  <button
                    onClick={() => openProject(project.id)}
                    className="flex items-center gap-2 text-xs font-semibold hover:text-[#6E818F]"
                  >
                    Open project
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </button>

                  <div className="flex gap-2">
                    <Link
                      href="/designer"
                      onClick={() => setActiveProject(project.id)}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Wizard
                    </Link>
                    <span className="text-border">·</span>
                    <Link
                      href="/designer/3d"
                      onClick={() => setActiveProject(project.id)}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      3D CAD
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No projects match your search"
          description="Try changing your search terms or create a new shelter definition."
          action={
            <ActionButton onClick={() => setIsNewProjectModalOpen(true)}>
              <Plus className="size-4" />
              Create new project
            </ActionButton>
          }
        />
      )}

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />

      <DeleteProjectModal
        isOpen={Boolean(projectToDelete)}
        project={projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={async (id) => {
          await deleteProject(id);
        }}
      />
    </div>
  );
}
