import { describe, expect, it } from "vitest";
import { requiresOnboarding } from "./onboarding-state";

describe("requiresOnboarding", () => {
  it("sends a new Google user to the questionnaire", () => {
    expect(requiresOnboarding(null)).toBe(true);
  });

  it("keeps an incomplete profile in the questionnaire", () => {
    expect(requiresOnboarding({ onboardingCompletedAt: null, heightCm: null })).toBe(true);
    expect(requiresOnboarding({ onboardingCompletedAt: new Date(), heightCm: null })).toBe(true);
  });

  it("lets an existing complete user enter the app", () => {
    expect(requiresOnboarding({ onboardingCompletedAt: new Date(), heightCm: 175 })).toBe(false);
  });
});
