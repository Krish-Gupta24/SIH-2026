import { describe, it, expect } from "vitest";
import {
  shelterFormSchema,
  defaultShelterFormValues,
  windowSchema,
  doorSchema,
} from "./schema";

describe("Shelter Schema Validation Unit Tests", () => {
  it("validates default shelter form values successfully", () => {
    const parseResult = shelterFormSchema.safeParse(defaultShelterFormValues);
    expect(parseResult.success).toBe(true);
  });

  it("rejects negative or sub-minimum geometry dimensions", () => {
    const invalidValues = {
      ...defaultShelterFormValues,
      geometry: {
        ...defaultShelterFormValues.geometry,
        length: -5.0,
      },
    };
    const result = shelterFormSchema.safeParse(invalidValues);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some((i) => i.path.includes("length"))).toBe(true);
    }
  });

  it("rejects orientation >= 360 degrees or negative", () => {
    const invalidOrientation = {
      ...defaultShelterFormValues,
      geometry: {
        ...defaultShelterFormValues.geometry,
        orientation: 360,
      },
    };
    const result = shelterFormSchema.safeParse(invalidOrientation);
    expect(result.success).toBe(false);
  });

  it("rejects window dimensions exceeding structural limits", () => {
    const oversizedWindow = {
      id: "win-giant",
      wall: "south" as const,
      positionX: 0,
      width: 15.0, // max is 10.0
      height: 2.0,
      sillHeight: 0.8,
      glazingType: "Double_LowE_Argon" as const,
      frameType: "UPVC_Insulated" as const,
      shadingOverhang: 0.2,
    };
    const result = windowSchema.safeParse(oversizedWindow);
    expect(result.success).toBe(false);
  });

  it("rejects door with negative position or zero width", () => {
    const invalidDoor = {
      id: "door-bad",
      wall: "north" as const,
      positionX: -1.0,
      width: 0,
      height: 2.0,
      construction: "Standard Wood",
      airTightness: "Standard" as const,
    };
    const result = doorSchema.safeParse(invalidDoor);
    expect(result.success).toBe(false);
  });

  it("rejects design targets where min comfort is greater than max comfort", () => {
    const invalidComfort = {
      ...defaultShelterFormValues,
      designTargets: {
        ...defaultShelterFormValues.designTargets,
        comfortTempMinC: 25.0,
        comfortTempMaxC: 18.0, // min > max
      },
    };
    const result = shelterFormSchema.safeParse(invalidComfort);
    expect(result.success).toBe(false);
  });
});
