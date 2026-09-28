import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { Questionnaire } from "@/components/questionnaire";
import { questionnaireSchema } from "@/lib/questionnaire";

export default async function OnboardingPage() {
  const session = await auth(); if (!session?.user.id) redirect("/sign-in");
  const [user, goal, weight] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: session.user.id }, include: { profile: true } }),
    db.nutritionGoal.findFirst({ where: { userId: session.user.id, validUntil: null }, orderBy: { validFrom: "desc" } }),
    db.weightEntry.findFirst({ where: { userId: session.user.id }, orderBy: { recordedAt: "desc" } }),
  ]);
  const p = user.profile;
  const previous = questionnaireSchema.partial().safeParse(p?.questionnaire);
  const now = new Date().getTime();
  return <Questionnaire required={!p?.onboardingCompletedAt || p.heightCm == null} initial={{
    ...(previous.success ? previous.data : {}), name: user.name ?? "", sex: p?.sex === "MALE" ? "Masculino" : p?.sex === "FEMALE" ? "Femenino" : "Prefiero no decirlo", height: p?.heightCm ?? undefined,
    age: p?.birthDate ? Math.floor((now - p.birthDate.getTime()) / 31557600000) : undefined,
    weight: weight?.weightKg ?? p?.initialWeightKg ?? undefined, timezone: p?.timezone,
    calorieGoal: goal?.calories, proteinGoal: goal?.protein, carbGoal: goal?.carbs ?? undefined, fatGoal: goal?.fat,
  }} />;
}
