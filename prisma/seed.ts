import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();
async function main() {
  const email = (process.env.SEED_USER_EMAIL || "andres@example.com").toLowerCase();
  const passwordHash = await hash(process.env.SEED_USER_PASSWORD || "cambiar-esta-clave", 12);
  const user = await db.user.upsert({ where: { email }, update: {}, create: { email, name: "Andrés", passwordHash } });
  await db.profile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, sex: "MALE", birthDate: new Date("1997-01-01T12:00:00Z"), heightCm: 178, initialWeightKg: 92, occupation: "Programador, principalmente sedentario", timezone: "America/Argentina/San_Juan" } });
  if (!(await db.nutritionGoal.count({ where: { userId: user.id } }))) await db.nutritionGoal.create({ data: { userId: user.id, calories: 2400, protein: 180, carbs: 251, fat: 75, validFrom: new Date("2026-09-01T03:00:00Z") } });
  const foods = [
    { name: "Star Nutrition Whey Protein Frutilla", brand: "Star Nutrition", servingAmount: 30, servingUnit: "scoop", calories: 120, protein: 25, carbs: 2, fat: 1.5, favorite: true },
    { name: "Avena", servingAmount: 100, servingUnit: "g", calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, favorite: true },
    { name: "Huevo", servingAmount: 1, servingUnit: "unidad", calories: 75, protein: 6.3, carbs: 0.4, fat: 5.2, favorite: true },
    { name: "Mantequilla de maní", servingAmount: 15, servingUnit: "cucharada", calories: 90, protein: 3.8, carbs: 3, fat: 7.5, favorite: true },
  ];
  if (!(await db.food.count({ where: { userId: user.id } }))) {
    const created = await Promise.all(foods.map((food) => db.food.create({ data: { ...food, userId: user.id, demo: true } })));
    await db.recipe.create({ data: { userId: user.id, name: "Pancakes proteicos", description: "Avena, whey y huevos. Rinde aproximadamente 8 pancakes.", servings: 8, demo: true, ingredients: { create: [{ foodId: created[1].id, quantity: 100, unit: "g" }, { foodId: created[0].id, quantity: 60, unit: "g" }, { foodId: created[2].id, quantity: 2, unit: "unidad" }] } } });
  }
}
main().finally(() => db.$disconnect());
