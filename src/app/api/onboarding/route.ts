import { auth } from "@/auth";
import { db } from "@/server/db";
import { questionnaireSchema } from "@/lib/questionnaire";
import { saveGoal } from "@/server/goals";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user.id) return Response.json({ error: "No autorizado" }, { status: 401 });
  const parsed = questionnaireSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisá los datos del cuestionario.", issues: parsed.error.flatten() }, { status: 400 });
  const p = parsed.data;
  const userId = session.user.id;
  await db.$transaction(async (tx) => {
    const existing = await tx.profile.findUnique({ where: { userId } });
    const birthDate = new Date(); birthDate.setUTCFullYear(birthDate.getUTCFullYear() - p.age);
    await tx.user.update({ where: { id: userId }, data: { name: p.name } });
    const data = { sex: p.sex === "Masculino" ? "MALE" as const : p.sex === "Femenino" ? "FEMALE" as const : "PREFER_NOT_TO_SAY" as const, heightCm: p.height, birthDate, occupation: p.occupation, timezone: p.timezone, questionnaire: p, onboardingCompletedAt: new Date(), deletePhotosAfterAnalysis: true };
    await tx.profile.upsert({ where: { userId }, update: data, create: { userId, ...data, initialWeightKg: p.weight } });
    if (!existing?.onboardingCompletedAt && !(await tx.weightEntry.count({ where: { userId } }))) {
      await tx.weightEntry.create({ data: { userId, weightKg: p.weight, recordedAt: new Date(), note: "Cuestionario inicial" } });
    }
    await saveGoal(tx, userId, p);
  });
  return Response.json({ ok: true });
}
