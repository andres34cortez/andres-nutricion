import { auth } from "@/auth";
import { db } from "@/server/db";
import { mealItemSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await auth(); if (!session?.user.id) return Response.json({ error: "No autorizado" }, { status: 401 });
  const parsed = mealItemSchema.safeParse(await request.json()); if (!parsed.success) return Response.json({ error: "Datos inválidos", issues: parsed.error.flatten() }, { status: 400 });
  const { category, notes, ...item } = parsed.data;
  const meal = await db.meal.create({ data: { userId: session.user.id, category, eatenAt: new Date(), notes, items: { create: { ...item, source: "MANUAL", estimated: false } } }, include: { items: true } });
  return Response.json(meal, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth(); if (!session?.user.id) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = zId(await request.json()); if (!id) return Response.json({ error: "ID inválido" }, { status: 400 });
  const meal = await db.meal.findFirst({ where: { id, userId: session.user.id } }); if (!meal) return Response.json({ error: "No encontrado" }, { status: 404 });
  await db.meal.delete({ where: { id } }); return new Response(null, { status: 204 });
}
const zId = (value: unknown) => typeof value === "object" && value !== null && "id" in value && typeof value.id === "string" ? { id: value.id } : { id: "" };
