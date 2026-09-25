import { describe, it, expect } from "vitest";
import {
  generateThermalAIResponse,
  ProjectContextTelemetry,
} from "./thermal-ai-engine";

describe("thermal-ai-engine page context awareness", () => {
  it("does not show an active project when hasActiveProject is false (e.g. Home page)", () => {
    const context: ProjectContextTelemetry = {
      hasActiveProject: false,
      pageContext: {
        pathname: "/",
        pageTitle: "Platform Overview",
        pageDescription: "Platform Mode · Habitat Engineering",
        hasActiveProject: false,
      },
    };

    const reply = generateThermalAIResponse("what is my project name", context);
    expect(reply).toContain("No Active Shelter Loaded");
    expect(reply).toContain("Platform Overview");
    expect(reply).toContain("/projects");
    expect(reply).not.toContain("Ladakh Passive Solar Outpost");
  });

  it("shows active project specs when hasActiveProject is true (e.g. 3D Designer or Simulations)", () => {
    const context: ProjectContextTelemetry = {
      hasActiveProject: true,
      projectName: "Siachen Forward Bunker",
      locationName: "Siachen Glacier, India",
      elevationM: 5200,
      dimensions: {
        length: 8,
        width: 4,
        height: 2.6,
        floorAreaM2: 32,
        volumeM3: 83.2,
      },
      pageContext: {
        pathname: "/designer/3d",
        pageTitle: "3D Architecture & Envelope",
        hasActiveProject: true,
      },
    };

    const reply = generateThermalAIResponse("what is my shelter specs and dimensions", context);
    expect(reply).toContain("Siachen Forward Bunker");
    expect(reply).toContain("Siachen Glacier, India");
    expect(reply).toContain("5,200m ASL");
    expect(reply).toContain("32 m²");
  });

  it("handles simulation analysis queries without hallucinating a project when on non-project pages", () => {
    const context: ProjectContextTelemetry = {
      hasActiveProject: false,
      pageContext: {
        pathname: "/materials",
        pageTitle: "Materials Library",
        hasActiveProject: false,
      },
    };

    const reply = generateThermalAIResponse("analyze simulation comfort score", context);
    expect(reply).toContain("High-Altitude Thermal Performance Benchmarks");
    expect(reply).toContain("Materials Library");
    expect(reply).toContain(" Mandatory Compliance Benchmarks");
    expect(reply).not.toContain("Active High-Altitude Shelter");
  });

  it("provides live simulation telemetry when a project is active", () => {
    const context: ProjectContextTelemetry = {
      hasActiveProject: true,
      projectName: "Kargil Ridge Outpost",
      simulationResults: {
        comfortHoursPct: 88,
        indoorMinC: 18.5,
        indoorMaxC: 22.1,
        heatingDemandKwhM2: 12.4,
        fuelDisplacementLiters: 1920,
      },
    };

    const reply = generateThermalAIResponse("analyze thermal performance", context);
    expect(reply).toContain("Live Thermal Performance Analysis");
    expect(reply).toContain("Kargil Ridge Outpost");
    expect(reply).toContain("88%");
    expect(reply).toContain("EXCEEDS  TARGET");
  });

  it("displays workspace context rather than a false project in the default fallback when hasActiveProject is false", () => {
    const context: ProjectContextTelemetry = {
      hasActiveProject: false,
      pageContext: {
        pathname: "/",
        pageTitle: "Platform Overview",
        hasActiveProject: false,
      },
    };

    const reply = generateThermalAIResponse("overview of best construction practices", context);
    expect(reply).toContain("**Operational Mode:** General Building Science & Thermal Physics (No active habitat loaded)");
    expect(reply).not.toContain("Ladakh Passive Solar Outpost");
  });
});
