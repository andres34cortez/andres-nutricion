import type { ActivityType, MealCategory } from "@prisma/client";
import type { AppData, MealCategory as Label } from "@/lib/app-types";
import { carbsFromRemainingCalories } from "@/lib/nutrition";
import { dateKeyInTimeZone } from "@/lib/reports";
import { db } from "./db";

const mealLabels: Record<MealCategory, Label> = { BREAKFAST: "Desayuno", LUNCH: "Almuerzo", SNACK: "Merienda", DINNER: "Cena", OTHER: "Otros" };
const activityLabels: Record<ActivityType, AppData["activities"][number]["type"]> = { GYM: "Gym", CROSSFIT: "CrossFit", WALK: "Caminata", OTHER: "Otro" };

export async function getAppData(userId: string): Promise<AppData> {
  const [user, goal, meals, weights, activities] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } }),
    db.nutritionGoal.findFirst({ where: { userId, validFrom: { lte: new Date() }, OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] }, orderBy: { validFrom: "desc" } }),
    db.meal.findMany({ where: { userId }, include: { items: true }, orderBy: { eatenAt: "desc" }, take: 150 }),
    db.weightEntry.findMany({ where: { userId }, orderBy: { recordedAt: "asc" }, take: 180 }),
    db.activity.findMany({ where: { userId }, orderBy: { occurredAt: "desc" }, take: 180 }),
  ]);
  const timezone = user.profile?.timezone || process.env.APP_TIMEZONE || "America/Argentina/San_Juan";
  const profile = { name: user.name || "Andrés", age: user.profile?.birthDate ? Math.floor((Date.now() - user.profile.birthDate.getTime()) / 31557600000) : 29, height: user.profile?.heightCm || 178, timezone, calorieGoal: goal?.calories || 2400, proteinGoal: goal?.protein || 180, fatGoal: goal?.fat || 75, carbGoal: goal?.carbs || carbsFromRemainingCalories(goal?.calories || 2400, goal?.protein || 180, goal?.fat || 75) };
  return {
    profile,
    meals: meals.flatMap((meal) => meal.items.map((item) => ({ id: meal.id, date: dateKeyInTimeZone(meal.eatenAt, timezone), category: mealLabels[meal.category], name: item.name, quantity: item.quantity, unit: item.unit, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, source: item.source.toLowerCase() as AppData["meals"][number]["source"], estimated: item.estimated }))),
    weights: weights.map((entry) => ({ id: entry.id, date: dateKeyInTimeZone(entry.recordedAt, timezone), weightKg: entry.weightKg })),
    activities: activities.map((entry) => ({ id: entry.id, date: dateKeyInTimeZone(entry.occurredAt, timezone), type: activityLabels[entry.type], duration: entry.durationMinutes || 0, detail: entry.routineDay || entry.notes || undefined })),
  };
}
