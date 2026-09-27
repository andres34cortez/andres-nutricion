export type Nutrition = { calories: number; protein: number; carbs: number; fat: number };
export type FoodPortion = Nutrition & { servingAmount: number; quantity: number };

export const zeroNutrition = (): Nutrition => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });

export function calculateFoodNutrition(food: FoodPortion): Nutrition {
  if (food.servingAmount <= 0 || food.quantity < 0) throw new Error("Invalid food portion");
  const factor = food.quantity / food.servingAmount;
  return roundNutrition({ calories: food.calories * factor, protein: food.protein * factor, carbs: food.carbs * factor, fat: food.fat * factor });
}

export function calculateMealNutrition(items: Nutrition[]): Nutrition {
  return roundNutrition(items.reduce((sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.protein, carbs: sum.carbs + item.carbs, fat: sum.fat + item.fat }), zeroNutrition()));
}

export function calculateRecipeNutrition(ingredients: FoodPortion[], servings: number) {
  if (servings <= 0) throw new Error("Recipe servings must be positive");
  const total = calculateMealNutrition(ingredients.map(calculateFoodNutrition));
  return { total, perServing: roundNutrition({ calories: total.calories / servings, protein: total.protein / servings, carbs: total.carbs / servings, fat: total.fat / servings }) };
}

export function carbsFromRemainingCalories(calories: number, protein: number, fat: number) {
  return Math.max(0, Math.round(((calories - protein * 4 - fat * 9) / 4) * 10) / 10);
}

export function roundNutrition(value: Nutrition): Nutrition {
  return { calories: Math.round(value.calories), protein: Math.round(value.protein * 10) / 10, carbs: Math.round(value.carbs * 10) / 10, fat: Math.round(value.fat * 10) / 10 };
}
