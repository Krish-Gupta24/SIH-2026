import { describe, it, expect, beforeEach, vi } from "vitest";
import { useShelterStore } from "@/lib/store/use-shelter-store";

// Mock api.projects.create
vi.mock("@/lib/api-client", () => ({
  api: {
    projects: {
      create: vi.fn().mockResolvedValue({ success: true }),
      getAll: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe("AI Generative Designer Sequential Naming & Project Creation", () => {
  beforeEach(() => {
    // Reset store state
    useShelterStore.setState({
      projects: [],
      deletedProjectIds: [],
      activeProjectId: "",
      activeWizardStep: 1,
    });
  });

  it("increments ThermoShelter_AI_OPT_001 to ThermoShelter_AI_OPT_002 as a new project", () => {
    const store = useShelterStore.getState();

    // Setup initial project named ThermoShelter_AI_OPT_001
    useShelterStore.setState({
      projects: [
        {
          id: "shelter_829111",
          name: "ThermoShelter_AI_OPT_001",
          project: {
            id: "shelter_829111",
            name: "ThermoShelter_AI_OPT_001",
            version: "1.0.0",
          },
        } as any,
      ],
      activeProjectId: "shelter_829111",
    });

    // Call applyAICandidate with candidate
    const candidatePayload = {
      id: "shelter_829111",
      name: "ThermoShelter_AI_OPT_001",
      geometry: { length: 6, width: 4, height: 2.8 },
      envelope: {},
    };

    const newProjId = store.applyAICandidate(candidatePayload);

    expect(newProjId).toBe("shelter-ai-opt-002");

    const updatedState = useShelterStore.getState();
    expect(updatedState.activeProjectId).toBe("shelter-ai-opt-002");
    expect(updatedState.projects.length).toBe(2);

    const createdProject = updatedState.projects.find((p) => p.id === "shelter-ai-opt-002");
    expect(createdProject).toBeDefined();
    expect(createdProject?.name).toBe("ThermoShelter_AI_OPT_002");
    expect(createdProject?.project?.name).toBe("ThermoShelter_AI_OPT_002");

    // Existing 001 project is preserved intact
    const originalProject = updatedState.projects.find((p) => p.id === "shelter_829111");
    expect(originalProject).toBeDefined();
    expect(originalProject?.name).toBe("ThermoShelter_AI_OPT_001");
  });

  it("sequentially increments 002 to 003 on subsequent AI candidate loading", () => {
    const store = useShelterStore.getState();

    // Prepopulate with 001 and 002
    useShelterStore.setState({
      projects: [
        {
          id: "shelter-ai-opt-001",
          name: "ThermoShelter_AI_OPT_001",
          project: { id: "shelter-ai-opt-001", name: "ThermoShelter_AI_OPT_001" },
        } as any,
        {
          id: "shelter-ai-opt-002",
          name: "ThermoShelter_AI_OPT_002",
          project: { id: "shelter-ai-opt-002", name: "ThermoShelter_AI_OPT_002" },
        } as any,
      ],
      activeProjectId: "shelter-ai-opt-002",
    });

    const candidatePayload = {
      name: "ThermoShelter_AI_OPT_001", // Incoming candidate name from generator
      geometry: { length: 6, width: 4, height: 2.8 },
      envelope: {},
    };

    const newProjId = store.applyAICandidate(candidatePayload);

    expect(newProjId).toBe("shelter-ai-opt-003");

    const updatedState = useShelterStore.getState();
    expect(updatedState.activeProjectId).toBe("shelter-ai-opt-003");
    expect(updatedState.projects.length).toBe(3);

    const createdProject = updatedState.projects.find((p) => p.id === "shelter-ai-opt-003");
    expect(createdProject?.name).toBe("ThermoShelter_AI_OPT_003");
    expect(createdProject?.project?.name).toBe("ThermoShelter_AI_OPT_003");
  });

  it("handles empty store by starting from 002 if incoming is 001 (interpreting 001 as wrong/baseline)", () => {
    const store = useShelterStore.getState();

    useShelterStore.setState({
      projects: [],
      activeProjectId: "",
    });

    const candidatePayload = {
      name: "ThermoShelter_AI_OPT_001",
      geometry: { length: 6, width: 4, height: 2.8 },
      envelope: {},
    };

    const newProjId = store.applyAICandidate(candidatePayload);

    expect(newProjId).toBe("shelter-ai-opt-002");

    const updatedState = useShelterStore.getState();
    expect(updatedState.activeProjectId).toBe("shelter-ai-opt-002");
    expect(updatedState.projects.length).toBe(1);
    expect(updatedState.projects[0].name).toBe("ThermoShelter_AI_OPT_002");
  });
});
