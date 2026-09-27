import type { AppData, MealEntry } from "./app-types";

const iso = (offset = 0) => { const date = new Date(); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10); };
const meal = (id: string, date: string, category: MealEntry["category"], name: string, calories: number, protein: number, carbs: number, fat: number): MealEntry => ({ id, date, category, name, quantity: 1, unit: "porción", calories, protein, carbs, fat, source: "manual" });

export function createDemoData(): AppData {
  return {
    profile: { name: "Andrés", age: 29, height: 178, timezone: "America/Argentina/San_Juan", calorieGoal: 2400, proteinGoal: 180, fatGoal: 75, carbGoal: 251, deletePhotos: true },
    meals: [
      meal("m1", iso(), "Desayuno", "Avena con whey y banana", 512, 38, 68, 10), meal("m2", iso(), "Almuerzo", "Pollo, arroz y ensalada", 647, 68, 58, 15),
      meal("m3", iso(-1), "Desayuno", "Huevos con tostadas", 430, 29, 41, 17), meal("m4", iso(-1), "Almuerzo", "Carne magra con papas", 720, 59, 73, 22), meal("m5", iso(-1), "Cena", "Pancakes proteicos", 610, 48, 72, 14),
      meal("m6", iso(-2), "Almuerzo", "Pasta con pollo", 780, 62, 94, 16), meal("m7", iso(-2), "Cena", "Ensalada completa", 540, 45, 38, 23), meal("m8", iso(-3), "Desayuno", "Avena y mantequilla de maní", 560, 34, 66, 20),
    ],
    weights: [{ id: "w1", date: iso(-7), weightKg: 92 }, { id: "w2", date: iso(-5), weightKg: 91.8 }, { id: "w3", date: iso(-3), weightKg: 91.5 }, { id: "w4", date: iso(-1), weightKg: 91.4 }],
    activities: [{ id: "a1", date: iso(-4), type: "Gym", duration: 70, detail: "Día I" }, { id: "a2", date: iso(-2), type: "Caminata", duration: 42, detail: "3,8 km" }, { id: "a3", date: iso(-1), type: "Gym", duration: 65, detail: "Día II" }],
  };
}
