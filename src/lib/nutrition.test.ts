import { describe, expect, it } from "vitest";
import { calculateFoodNutrition, calculateMealNutrition, calculateRecipeNutrition, carbsFromRemainingCalories } from "./nutrition";

describe("nutrition engine", () => {
  it("scales nutrition by portion", () => expect(calculateFoodNutrition({ servingAmount: 100, quantity: 150, calories: 200, protein: 20, carbs: 10, fat: 5 })).toEqual({ calories: 300, protein: 30, carbs: 15, fat: 7.5 }));
  it("adds daily meal totals deterministically", () => expect(calculateMealNutrition([{ calories: 100, protein: 10, carbs: 5, fat: 2 }, { calories: 250, protein: 25, carbs: 20, fat: 8 }])).toEqual({ calories: 350, protein: 35, carbs: 25, fat: 10 }));
  it("calculates recipe total and serving", () => expect(calculateRecipeNutrition([{ servingAmount: 100, quantity: 100, calories: 400, protein: 20, carbs: 60, fat: 8 }], 4).perServing).toEqual({ calories: 100, protein: 5, carbs: 15, fat: 2 }));
  it("derives remaining carbohydrates", () => expect(carbsFromRemainingCalories(2400, 180, 75)).toBe(251.3));
});
