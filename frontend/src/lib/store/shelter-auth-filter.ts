import type { ShelterModel } from "@/types/shelter";
import { DEMO_USER_ACCOUNT } from "./use-auth-store";

export const CANONICAL_PRESET_IDS = new Set([
  "shelter-ladakh-01",
  "shelter-kargil-02",
  "shelter-spiti-03",
  "shelter-tawang-04",
  "shelter-baseline-tin",
]);

/**
 * Determines whether a shelter is visible to the currently authenticated user.
 * - Standard reference templates (Leh, Kargil, Spiti, Tawang, Tin Baseline) are accessible to all users.
 * - Custom made or cloned shelters are visible ONLY to their creator/owner.
 */
export function isProjectVisibleToUser(project: ShelterModel, userId?: string): boolean {
  if (!project) return false;
  const activeUserId = userId || DEMO_USER_ACCOUNT.id;

  // Standard templates are visible to everyone
  if (
    project.isSystemPreset ||
    project.project?.isSystemPreset ||
    CANONICAL_PRESET_IDS.has(project.id) ||
    project.id === "shelter-ladakh-01" ||
    project.id === "shelter-kargil-02" ||
    project.id === "shelter-spiti-03" ||
    project.id === "shelter-tawang-04" ||
    project.id === "shelter-baseline-tin"
  ) {
    return true;
  }

  // Check explicit owner ID
  const owner = project.project?.userId || project.userId;
  if (!owner) {
    // Shelters created without an explicit owner tag belong to the primary demo account
    return activeUserId === DEMO_USER_ACCOUNT.id;
  }

  return owner === activeUserId;
}

/**
 * Filter a list of shelters to only those visible to the given user ID.
 */
export function filterProjectsForUser(projects: ShelterModel[], userId?: string): ShelterModel[] {
  return projects.filter((p) => isProjectVisibleToUser(p, userId));
}
