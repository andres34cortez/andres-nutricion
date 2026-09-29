import { describe, expect, it } from "vitest";
import type { Food, FoodReference } from "./app-types";
import { findNutritionSource, foodContentName, isUnresolvedDrinkContainer, nutritionSources } from "./food-reference";

const personal: Food = { id: "mine", name: "Leche de casa", servingAmount: 100, servingUnit: "ml", calories: 55, protein: 3, carbs: 5, fat: 2.5, favorite: true };
const reference: FoodReference = { id: "ref-coffee-milk", name: "Café con leche entera, mitad leche, sin azúcar", aliases: ["café con leche", "taza de café con leche"], servingAmount: 100, servingUnit: "ml", calories: 31, protein: 1.7, carbs: 2.3, fat: 1.6, source: "USDA" };

describe("food references", () => {
  it("removes the container from the detected food name", () => {
    expect(foodContentName("Taza de café con leche")).toBe("Café con leche");
    expect(foodContentName("vaso de leche")).toBe("Leche");
    expect(foodContentName("Arroz con pollo")).toBe("Arroz con pollo");
  });

  it("matches accents and container phrases while preserving personal-catalog priority", () => {
    const sources = nutritionSources([personal], [reference]);
    expect(findNutritionSource("Taza de cafe con leche", sources)?.id).toBe(reference.id);
    expect(findNutritionSource("Leche de casa", sources)?.id).toBe(personal.id);
    expect(findNutritionSource("Pollo", sources)).toBeUndefined();
  });

  it("requires a real volume before applying an ml reference to a cup", () => {
    const source = nutritionSources([], [reference])[0];
    expect(isUnresolvedDrinkContainer("taza", source)).toBe(true);
    expect(isUnresolvedDrinkContainer("ml", source)).toBe(false);
  });
});
