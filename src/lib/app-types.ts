export type MealCategory = "Desayuno" | "Almuerzo" | "Merienda" | "Cena" | "Otros";
export type MealEntry = { id: string; date: string; category: MealCategory; name: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number; source: "manual" | "ai_photo" | "recipe" | "favorite"; estimated?: boolean };
export type WeightEntry = { id: string; date: string; weightKg: number };
export type ActivityEntry = { id: string; date: string; type: "Gym" | "CrossFit" | "Caminata" | "Otro"; duration: number; detail?: string };
export type Profile = { name: string; age: number; height: number; timezone: string; calorieGoal: number; proteinGoal: number; fatGoal: number; carbGoal: number };
export type AppData = { meals: MealEntry[]; weights: WeightEntry[]; activities: ActivityEntry[]; profile: Profile };
