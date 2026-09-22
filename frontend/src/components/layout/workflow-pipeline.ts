export interface WorkflowStep {
  id: string;
  stepNumber: number;
  label: string;
  href: string;
  description: string;
}

export const WORKFLOW_PIPELINE: WorkflowStep[] = [
  {
    id: "overview",
    stepNumber: 1,
    label: "Overview",
    href: "/dashboard",
    description: "Canonical model readiness and core thermal metrics",
  },
  {
    id: "climate",
    stepNumber: 2,
    label: "Climate & Site",
    href: "/weather",
    description: "Leh Ladakh extreme cold weather dataset & authentic EPW",
  },
  {
    id: "designer",
    stepNumber: 3,
    label: "2D Designer",
    href: "/designer",
    description: "13-stage engineering envelope & assembly specification",
  },
  {
    id: "3d",
    stepNumber: 4,
    label: "3D CAD",
    href: "/designer/3d",
    description: "Spatial massing, solar orientation & mesh raycast inspector",
  },
  {
    id: "simulate",
    stepNumber: 5,
    label: "Simulate",
    href: "/simulations",
    description: "Physics-based EnergyPlus heat balance calculation",
  },
  {
    id: "results",
    stepNumber: 6,
    label: "Results",
    href: "/results",
    description: "Hourly operative temperatures, comfort hours & heat flow",
  },
  {
    id: "optimize",
    stepNumber: 7,
    label: "Optimize",
    href: "/optimization",
    description: "Parametric envelope sweep & Pareto optimal recommendations",
  },
  {
    id: "compare",
    stepNumber: 8,
    label: "Compare",
    href: "/comparison",
    description: "Side-by-side benchmark of design alternatives",
  },
  {
    id: "report",
    stepNumber: 9,
    label: "Certified Report",
    href: "/reports",
    description: "Official defense engineering audit & export package",
  },
];

/**
 * Determines the exact matching pipeline step index for a given URL path.
 * Returns -1 if the route is NOT part of the active project workflow pipeline
 * (such as /projects, /materials, /settings, /ai-designer, etc.).
 */
export function getWorkflowStepIndex(pathname: string): number {
  if (!pathname || pathname === "/") return -1;
  if (pathname === "/dashboard") return 0;

  // Match exact path first
  const exactIdx = WORKFLOW_PIPELINE.findIndex((s) => s.href === pathname);
  if (exactIdx !== -1) return exactIdx;

  // Otherwise, match longest prefix (e.g. /designer/3d matches before /designer)
  let bestIdx = -1;
  let maxLen = 0;
  WORKFLOW_PIPELINE.forEach((step, idx) => {
    if (step.href !== "/dashboard" && (pathname === step.href || pathname.startsWith(step.href + "/"))) {
      if (step.href.length > maxLen) {
        maxLen = step.href.length;
        bestIdx = idx;
      }
    }
  });

  return bestIdx;
}
