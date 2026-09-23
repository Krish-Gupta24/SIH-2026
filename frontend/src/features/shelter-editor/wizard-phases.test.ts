import { describe, it, expect } from "vitest";
import { WIZARD_PHASES, WIZARD_STEPS } from "./wizard-phase-config";
import { DESIGNER_9_STEPS } from "@/features/shelter-3d/designer-3d-config";
import { step2dTo3d, step3dTo2d } from "@/lib/store/shelter-model-adapter";

describe("Wizard 4-Phase Streamlined Consolidation (9 Steps)", () => {
  it("clubs 9 direct engineering steps into 4 cohesive phases", () => {
    expect(WIZARD_PHASES).toHaveLength(4);

    const allStepsInPhases = WIZARD_PHASES.flatMap((p) => p.steps);
    expect(allStepsInPhases).toHaveLength(9);

    // Verify all engineering steps 1 through 9 are present without gaps
    for (let step = 1; step <= 9; step++) {
      expect(allStepsInPhases).toContain(step);
    }
  });

  it("maps each phase to the correct engineering domain", () => {
    const [p1, p2, p3, p4] = WIZARD_PHASES;

    expect(p1.name).toBe("Building Envelope");
    expect(p1.steps).toEqual([1, 2, 3, 4]);

    expect(p2.name).toBe("Apertures & Solar");
    expect(p2.steps).toEqual([5, 6]);

    expect(p3.name).toBe("Indoor Climate");
    expect(p3.steps).toEqual([7]);

    expect(p4.name).toBe("Simulation");
    expect(p4.steps).toEqual([8, 9]);
  });

  it("provides matching step labels for all phase sub-assemblies", () => {
    WIZARD_PHASES.forEach((phase) => {
      expect(phase.stepNames).toHaveLength(phase.steps.length);
      phase.steps.forEach((stepId) => {
        expect(stepId).toBeGreaterThanOrEqual(1);
        expect(stepId).toBeLessThanOrEqual(9);
        expect(WIZARD_STEPS[stepId - 1]).toBeDefined();
      });
    });
  });

  it("synchronizes 2D designer steps 1:1 with 3D CAD designer stages", () => {
    expect(DESIGNER_9_STEPS).toHaveLength(9);

    for (let step2d = 1; step2d <= 9; step2d++) {
      const stage3d = step2dTo3d(step2d);
      expect(stage3d).toBe(step2d - 1);
      expect(step3dTo2d(stage3d)).toBe(step2d);

      // Verify domain names match between 2D and 3D step lists
      expect(WIZARD_STEPS[step2d - 1].name).toBe(DESIGNER_9_STEPS[stage3d].name);
    }
  });
});
