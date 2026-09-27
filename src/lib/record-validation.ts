import { z } from "zod";
export const macrosSchema = z.object({ calories: z.number().min(0).max(10000), protein: z.number().min(0).max(1000), carbs: z.number().min(0).max(1500), fat: z.number().min(0).max(1000) });
const date = z.string().datetime({ offset: true });
export const itemSchema = macrosSchema.extend({ name: z.string().trim().min(1).max(120), quantity: z.number().positive().max(10000), unit: z.string().trim().min(1).max(30), source: z.enum(["manual", "ai_photo", "recipe", "favorite"]).default("manual"), estimated: z.boolean().default(false), zeroNutritionConfirmed: z.boolean().optional() }).superRefine((item, ctx) => {
  if (item.calories === 0 && item.protein === 0 && item.carbs === 0 && item.fat === 0 && !item.zeroNutritionConfirmed) {
    ctx.addIssue({ code: "custom", path: ["zeroNutritionConfirmed"], message: "Completá la información nutricional o confirmá que este alimento realmente tiene todos sus valores en cero." });
  }
});
export const recordSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("meal"), timestamp: date, category: z.enum(["Desayuno", "Almuerzo", "Merienda", "Cena", "Otros"]), notes: z.string().max(1000).default(""), items: z.array(itemSchema).min(1).max(50) }),
  z.object({ kind: z.literal("weight"), timestamp: date, weightKg: z.number().min(30).max(300) }),
  z.object({ kind: z.literal("activity"), timestamp: date, type: z.enum(["Gym", "CrossFit", "Caminata", "Otro"]), duration: z.number().int().min(0).max(1440), detail: z.string().max(1000).default(""), distanceKm: z.number().min(0).max(1000).optional(), steps: z.number().int().min(0).max(200000).optional() }),
]);
export type RecordInput = z.infer<typeof recordSchema>;
export const foodSchema = macrosSchema.extend({ name: z.string().trim().min(1).max(120), servingAmount: z.number().positive().max(10000), servingUnit: z.string().min(1).max(30), favorite: z.boolean().default(false) });
export const recipeSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(1000).default(""), servings: z.number().positive().max(1000), ingredients: z.array(z.object({ foodId: z.string().min(1), quantity: z.number().positive().max(10000), unit: z.string().min(1).max(30) })).min(1).max(50) });
