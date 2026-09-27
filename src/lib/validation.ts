import { z } from "zod";

export const mealItemSchema = z.object({
  name: z.string().trim().min(1).max(120), quantity: z.coerce.number().positive().max(10000), unit: z.string().min(1).max(30),
  calories: z.coerce.number().nonnegative().max(10000), protein: z.coerce.number().nonnegative().max(1000), carbs: z.coerce.number().nonnegative().max(1000), fat: z.coerce.number().nonnegative().max(1000),
  category: z.enum(["BREAKFAST", "LUNCH", "SNACK", "DINNER", "OTHER"]), notes: z.string().max(500).optional(),
});

export const detectedMealSchema = z.object({
  foods: z.array(z.object({ name: z.string().min(1), preparation: z.string().optional(), estimatedQuantity: z.number().positive().optional(), unit: z.string().optional(), confidence: z.number().min(0).max(1).optional(), needsClarification: z.boolean() })).min(1),
  questions: z.array(z.object({ id: z.string(), question: z.string(), options: z.array(z.string()).min(2), foodName: z.string().optional() })).default([]),
  warnings: z.array(z.string()).default([]),
});

export type DetectedMeal = z.infer<typeof detectedMealSchema>;
