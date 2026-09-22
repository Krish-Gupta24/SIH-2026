import { describe, it, expect } from "vitest";
import { getWorkflowStepIndex, WORKFLOW_PIPELINE } from "./workflow-pipeline";

describe("Workflow Pipeline Routing Logic", () => {
  it("correctly identifies all 9 active project workflow steps", () => {
    expect(getWorkflowStepIndex("/dashboard")).toBe(0);
    expect(getWorkflowStepIndex("/weather")).toBe(1);
    expect(getWorkflowStepIndex("/designer")).toBe(2);
    expect(getWorkflowStepIndex("/designer/3d")).toBe(3);
    expect(getWorkflowStepIndex("/simulations")).toBe(4);
    expect(getWorkflowStepIndex("/results")).toBe(5);
    expect(getWorkflowStepIndex("/optimization")).toBe(6);
    expect(getWorkflowStepIndex("/comparison")).toBe(7);
    expect(getWorkflowStepIndex("/reports")).toBe(8);
  });

  it("returns -1 for non-workflow pages so active project bar is never shown", () => {
    expect(getWorkflowStepIndex("/projects")).toBe(-1);
    expect(getWorkflowStepIndex("/projects/new")).toBe(-1);
    expect(getWorkflowStepIndex("/materials")).toBe(-1);
    expect(getWorkflowStepIndex("/settings")).toBe(-1);
    expect(getWorkflowStepIndex("/ai-designer")).toBe(-1);
    expect(getWorkflowStepIndex("/")).toBe(-1);
    expect(getWorkflowStepIndex("")).toBe(-1);
  });
});
