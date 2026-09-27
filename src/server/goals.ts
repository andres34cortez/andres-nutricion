import type { Prisma } from "@prisma/client";

export async function saveGoal(tx: Prisma.TransactionClient, userId: string, p: { calorieGoal: number; proteinGoal: number; carbGoal: number; fatGoal: number }) {
  const active = await tx.nutritionGoal.findFirst({ where: { userId, validUntil: null }, orderBy: { validFrom: "desc" } });
  if (active && active.calories === p.calorieGoal && active.protein === p.proteinGoal && active.carbs === p.carbGoal && active.fat === p.fatGoal) return;
  const now = new Date();
  if (active) await tx.nutritionGoal.update({ where: { id: active.id }, data: { validUntil: now } });
  await tx.nutritionGoal.create({ data: { userId, calories: p.calorieGoal, protein: p.proteinGoal, carbs: p.carbGoal, fat: p.fatGoal, validFrom: now } });
}
