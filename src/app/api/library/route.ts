import { auth } from "@/auth";
import { db } from "@/server/db";
import { foodSchema, recipeSchema } from "@/lib/record-validation";

async function save(request: Request, edit: boolean) {
  const session = await auth(); if (!session?.user.id) return Response.json({ error: "No autorizado" }, { status: 401 });
  const userId = session.user.id;
  const raw = await request.json().catch(() => null);
  if (!raw || !["food", "recipe"].includes(raw.kind) || (edit && typeof raw.id !== "string")) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  if (raw.kind === "food") {
    const parsed = foodSchema.safeParse(raw); if (!parsed.success) return Response.json({ error: "Revisá el alimento." }, { status: 400 });
    if (edit) {
      const result = await db.food.updateMany({ where: { id: raw.id, userId }, data: parsed.data });
      return Response.json({ ok: result.count > 0 }, { status: result.count ? 200 : 404 });
    }
    return Response.json(await db.food.create({ data: { ...parsed.data, userId } }), { status: 201 });
  }
  const parsed = recipeSchema.safeParse(raw); if (!parsed.success) return Response.json({ error: "Revisá la receta y sus ingredientes." }, { status: 400 });
  const { ingredients, ...data } = parsed.data;
  const foods = await db.food.findMany({ where: { id: { in: ingredients.map((i) => i.foodId) }, userId } });
  if (ingredients.some((i) => !foods.some((f) => f.id === i.foodId && f.servingUnit === i.unit))) return Response.json({ error: "Usá alimentos propios y la unidad indicada en el catálogo." }, { status: 400 });
  const result = await db.$transaction(async (tx) => {
    if (edit) {
      if (!(await tx.recipe.findFirst({ where: { id: raw.id, userId } }))) return null;
      await tx.recipeIngredient.deleteMany({ where: { recipeId: raw.id } });
      return tx.recipe.update({ where: { id: raw.id }, data: { ...data, ingredients: { create: ingredients } } });
    }
    return tx.recipe.create({ data: { ...data, userId, ingredients: { create: ingredients } } });
  });
  return Response.json(result ?? { error: "No encontrado" }, { status: result ? edit ? 200 : 201 : 404 });
}
export const POST = (r: Request) => save(r, false);
export const PUT = (r: Request) => save(r, true);
export async function DELETE(request: Request) {
  const session = await auth(); if (!session?.user.id) return Response.json({ error: "No autorizado" }, { status: 401 });
  const p = await request.json().catch(() => null);
  if (typeof p?.id !== "string" || !["food", "recipe"].includes(p.kind)) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    const where = { id: p.id, userId: session.user.id };
    const result = p.kind === "food" ? await db.food.deleteMany({ where }) : await db.recipe.deleteMany({ where });
    return Response.json({ ok: result.count > 0 }, { status: result.count ? 200 : 404 });
  } catch { return Response.json({ error: "Este alimento está en una receta. Editá primero la receta." }, { status: 409 }); }
}
