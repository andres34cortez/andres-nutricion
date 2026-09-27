import { z } from "zod";

export const questionnaireSchema = z.object({
  name: z.string().trim().min(1).max(80),
  age: z.number().int().min(14).max(120),
  height: z.number().min(100).max(250),
  weight: z.number().min(30).max(300),
  goal: z.enum(["Perder grasa", "Mantener peso", "Ganar masa muscular", "Mejorar hábitos"]),
  occupation: z.string().max(200),
  activityLevel: z.enum(["Principalmente sentado", "Algo activo", "Muy activo"]),
  trainingDays: z.number().int().min(0).max(7),
  training: z.string().max(500),
  mealsPerDay: z.number().int().min(1).max(12),
  usualBreakfast: z.string().max(500),
  usualLunch: z.string().max(500),
  usualDinner: z.string().max(500),
  snacks: z.string().max(500),
  waterLiters: z.number().min(0).max(15),
  dietaryPreferences: z.string().max(500),
  restrictions: z.string().max(500),
  knownDailyCalories: z.number().min(0).max(15000).nullable().default(null),
  timezone: z.string().refine((value) => { try { new Intl.DateTimeFormat("es", { timeZone: value }); return true; } catch { return false; } }, "Zona horaria inválida"),
  calorieGoal: z.number().int().min(1000).max(10000),
  proteinGoal: z.number().min(0).max(1000),
  carbGoal: z.number().min(0).max(1500),
  fatGoal: z.number().min(0).max(500),
});
export type Questionnaire = z.infer<typeof questionnaireSchema>;
