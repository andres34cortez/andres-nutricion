import { describe, expect, it } from "vitest";
import { hasCompleteGoals, recommendNutrition } from "./nutrition-recommendation";

describe("recommendNutrition", () => {
  it("proposes maintenance calories and editable macros from questionnaire answers", () => {
    expect(recommendNutrition({
      age: 30,
      height: 180,
      weight: 80,
      sex: "Masculino",
      activityLevel: "Principalmente sentado",
      trainingDays: 0,
      goal: "Mantener peso",
    })).toEqual({
      maintenanceCalories: 2150,
      calorieGoal: 2150,
      proteinGoal: 95,
      carbGoal: 310,
      fatGoal: 60,
    });
  });

  it("applies a moderate starting deficit for a fat-loss goal", () => {
    expect(recommendNutrition({
      age: 30,
      height: 165,
      weight: 60,
      sex: "Femenino",
      activityLevel: "Algo activo",
      trainingDays: 3,
      goal: "Perder grasa",
    })).toEqual({
      maintenanceCalories: 1900,
      calorieGoal: 1600,
      proteinGoal: 95,
      carbGoal: 205,
      fatGoal: 45,
    });
  });

  it("does not calculate adult targets for incomplete data or a minor", () => {
    expect(recommendNutrition({ age: 17 })).toBeNull();
    expect(recommendNutrition({ age: 30, weight: 80 })).toBeNull();
  });
});

describe("hasCompleteGoals", () => {
  it("distinguishes an existing custom plan from a new questionnaire", () => {
    expect(hasCompleteGoals({ calorieGoal: 2000, proteinGoal: 150, carbGoal: 210, fatGoal: 60 })).toBe(true);
    expect(hasCompleteGoals({ calorieGoal: 2000, proteinGoal: 150 })).toBe(false);
  });
});
