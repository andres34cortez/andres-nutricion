import { auth } from "@/auth";
import { db } from "@/server/db";
import { recordSchema } from "@/lib/record-validation";
import type { MealSource } from "@prisma/client";
const categories = { Desayuno: "BREAKFAST", Almuerzo: "LUNCH", Merienda: "SNACK", Cena: "DINNER", Otros: "OTHER" } as const;
const types = { Gym: "GYM", CrossFit: "CROSSFIT", Caminata: "WALK", Otro: "OTHER" } as const;

async function save(request: Request, editing: boolean) {
  const session = await auth(); if (!session?.user.id) return Response.json({ error: "No autorizado" }, { status: 401 });
  const raw = await request.json().catch(() => null);
  const parsed = recordSchema.safeParse(raw);
  if (!parsed.success || (editing && typeof raw?.id !== "string")) return Response.json({ error: "Revisá los campos del registro." }, { status: 400 });
  const p = parsed.data; const userId = session.user.id;
  const id = editing ? raw.id as string : undefined;
  const result = await db.$transaction(async (tx) => {
    if (editing) {
      const where = { id, userId };
      const owned = p.kind === "meal" ? await tx.meal.findFirst({ where }) : p.kind === "weight" ? await tx.weightEntry.findFirst({ where }) : await tx.activity.findFirst({ where });
      if (!owned) return null;
    }
    if (p.kind === "meal") {
      const data = { category: categories[p.category], eatenAt: new Date(p.timestamp), notes: p.notes, items: { create: p.items.map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, estimated: item.estimated, source: item.source.toUpperCase() as MealSource })) } };
      if (id) { await tx.mealItem.deleteMany({ where: { mealId: id } }); return tx.meal.update({ where: { id }, data }); }
      return tx.meal.create({ data: { ...data, userId } });
    }
    if (p.kind === "weight") {
      const data = { weightKg: p.weightKg, recordedAt: new Date(p.timestamp) };
      return id ? tx.weightEntry.update({ where: { id }, data }) : tx.weightEntry.create({ data: { ...data, userId } });
    }
    const data = { type: types[p.type], occurredAt: new Date(p.timestamp), durationMinutes: p.duration, notes: p.detail, distanceKm: p.distanceKm ?? null, steps: p.steps ?? null };
    return id ? tx.activity.update({ where: { id }, data }) : tx.activity.create({ data: { ...data, userId } });
  });
  return result ? Response.json({ id: result.id }, { status: editing ? 200 : 201 }) : Response.json({ error: "Registro no encontrado" }, { status: 404 });
}
export const POST = (request: Request) => save(request, false);
export const PUT = (request: Request) => save(request, true);
export async function DELETE(request: Request) {
  const session = await auth(); if (!session?.user.id) return Response.json({ error: "No autorizado" }, { status: 401 });
  const p = await request.json().catch(() => null);
  if (typeof p?.id !== "string" || !["meal", "weight", "activity"].includes(p?.kind)) return Response.json({ error: "Registro inválido" }, { status: 400 });
  const where = { id: p.id, userId: session.user.id };
  const result = p.kind === "meal" ? await db.meal.deleteMany({ where }) : p.kind === "weight" ? await db.weightEntry.deleteMany({ where }) : await db.activity.deleteMany({ where });
  return result.count ? new Response(null, { status: 204 }) : Response.json({ error: "Registro no encontrado" }, { status: 404 });
}
