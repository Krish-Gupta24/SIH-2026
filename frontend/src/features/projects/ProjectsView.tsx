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
} from "lucide-react";
import { useShelterStore } from "@/lib/store/use-shelter-store";
import type { ShelterModel } from "@/types/shelter";
import { ActionButton, DataPair, EmptyState, PageIntro } from "@/components/v0/platform-components";
import { NewProjectModal } from "./NewProjectModal";

export function ProjectsView() {
  const router = useRouter();
  const {
    projects,
    simulations,
    activeProjectId,
    setActiveProject,
    addProject,
    deleteProject,
    saveProjectVersion,
  } = useShelterStore();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "region">("name");
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const filteredProjects = [...projects]
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
    const newModel: ShelterModel = base
      ? JSON.parse(JSON.stringify(base))
      : {
          schemaVersion: "1.0.0",
          id,
          project: {
            id,
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
    newModel.project.id = id;
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
          <ActionButton onClick={() => setIsNewProjectModalOpen(true)}>
            <Plus className="size-4" />
            New project
          </ActionButton>
        }
      />

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
            const isActive = project.id === activeProjectId;

            return (
              <article
                key={project.id}
                className={`project-card group flex min-h-[320px] flex-col rounded-2xl border bg-card p-7 sm:p-9 shadow-[0_10px_30px_rgba(0,0,0,.03)] transition-all hover:-translate-y-1 hover:border-[#6E818F] hover:shadow-[0_18px_45px_rgba(0,0,0,.08)] ${
                  isActive ? "border-foreground" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    0{index + 1} · {projectRegion} {isActive ? "· Active" : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => duplicateProject(project)}
                      className="flex size-9 items-center justify-center rounded-full border border-border opacity-70 transition-all hover:opacity-100 hover:bg-secondary"
                      aria-label={`Duplicate ${projectName}`}
                      title="Duplicate project"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete project "${projectName}"?`)) {
                            deleteProject(project.id);
                          }
                        }}
                        className="flex size-9 items-center justify-center rounded-full border border-border text-red-500 opacity-50 transition-all hover:opacity-100 hover:bg-red-50"
                        aria-label={`Delete ${projectName}`}
                        title="Delete project"
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

                <dl className="mt-auto grid grid-cols-3 border-t border-border pt-6">
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
    </div>
  );
}
