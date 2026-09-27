"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Questionnaire as Answers } from "@/lib/questionnaire";
import { HeightField } from "./height-field";

export function Questionnaire({ initial, required = false }: { initial: Partial<Answers>; required?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({ goal: "Mejorar hábitos", activityLevel: "Principalmente sentado", trainingDays: 0, training: "", occupation: "", mealsPerDay: 3, usualBreakfast: "", usualLunch: "", usualDinner: "", snacks: "", waterLiters: 0, dietaryPreferences: "", restrictions: "", knownDailyCalories: null, timezone: "America/Argentina/San_Juan", ...initial });
  const groups: { title: string; fields: (keyof Answers)[] }[] = [
    { title: "Conozcamos tu punto de partida", fields: ["name", "age", "height", "weight", "goal", "timezone"] },
    { title: "Tu día y actividad habitual", fields: ["occupation", "activityLevel", "trainingDays", "training"] },
    { title: "Cómo comés habitualmente", fields: ["mealsPerDay", "usualBreakfast", "usualLunch", "usualDinner", "snacks", "waterLiters", "knownDailyCalories", "dietaryPreferences", "restrictions"] },
    { title: "Confirmá tus objetivos diarios", fields: ["calorieGoal", "proteinGoal", "carbGoal", "fatGoal"] },
  ];
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (step < groups.length - 1) { setStep(step + 1); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/onboarding", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(answers) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      setSaved(true); router.push("/"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar. Intentá nuevamente."); }
    finally { setBusy(false); }
  }
  return <main className="app-frame"><div className="screen"><p className="eyebrow">TU PERFIL · PASO {step + 1} DE 4</p><h1>{groups[step].title}</h1><p className="subtle">{required ? "Completá tu perfil para empezar." : "Podés actualizar tus respuestas. Tus registros anteriores se conservan."}</p><form onSubmit={submit} className="settings" key={step}>
    {step === 2 && <p>Si no conocés tus calorías habituales, dejá ese campo vacío. Las respuestas describen tus hábitos; no agregan comidas al diario.</p>}
    {step === 3 && <p>Ingresá los objetivos que querés seguir. Podés usar los acordados con tu nutricionista y modificarlos después desde Perfil.</p>}
    {groups[step].fields.map((key) => key === "height" ? <HeightField key={key} disabled={busy} value={answers.height == null ? "" : String(answers.height)} onChange={value => setAnswers(old => ({ ...old, height: value === "" ? undefined : Number(value) }))} /> : <label className="field" key={key}><span>{labels[key]}</span>{options[key] ? <select value={String(answers[key] ?? "")} onChange={(e) => setAnswers({ ...answers, [key]: e.target.value })}>{options[key]!.map((v) => <option key={v}>{v}</option>)}</select> : numeric.has(key) ? <input type="number" required={key !== "knownDailyCalories"} min={limits[key]?.[0] ?? 0} max={limits[key]?.[1] ?? 15000} step={integer.has(key) ? "1" : "0.1"} value={answers[key] == null ? "" : String(answers[key])} onChange={(e) => setAnswers({ ...answers, [key]: e.target.value === "" ? undefined : Number(e.target.value) })} /> : <input required={key === "name" || key === "timezone"} maxLength={key === "name" ? 80 : 500} value={String(answers[key] ?? "")} onChange={(e) => setAnswers({ ...answers, [key]: e.target.value })} />}</label>)}
    {error && <p role="alert">{error}</p>}{saved && <p role="status">Perfil guardado.</p>}<div className="two">{step > 0 && <button type="button" onClick={() => setStep(step - 1)}>Anterior</button>}<button className="primary-button" disabled={busy}>{busy ? "Guardando…" : step === 3 ? "Guardar mi perfil" : "Continuar"}</button></div>
    {!required && <button type="button" onClick={() => router.push("/")}>Volver sin guardar</button>}
  </form></div></main>;
}
const numeric = new Set<keyof Answers>(["age", "height", "weight", "trainingDays", "mealsPerDay", "waterLiters", "knownDailyCalories", "calorieGoal", "proteinGoal", "carbGoal", "fatGoal"]);
const integer = new Set<keyof Answers>(["age", "trainingDays", "mealsPerDay", "calorieGoal"]);
const limits: Partial<Record<keyof Answers, number[]>> = { age: [14,120], height: [100,250], weight: [30,300], trainingDays: [0,7], mealsPerDay: [1,12], waterLiters: [0,15], calorieGoal: [1000,10000], proteinGoal: [0,1000], carbGoal: [0,1500], fatGoal: [0,500] };
const options: Partial<Record<keyof Answers, string[]>> = { goal: ["Perder grasa", "Mantener peso", "Ganar masa muscular", "Mejorar hábitos"], activityLevel: ["Principalmente sentado", "Algo activo", "Muy activo"] };
const labels: Record<keyof Answers, string> = { name: "Nombre", age: "Edad", height: "Altura (cm)", weight: "Peso actual (kg)", goal: "Objetivo personal", occupation: "Trabajo / actividad diaria", activityLevel: "Movimiento durante el día", trainingDays: "Días de entrenamiento por semana", training: "Entrenamiento habitual (gym, caminata, etc.)", mealsPerDay: "Comidas por día", usualBreakfast: "Desayuno habitual", usualLunch: "Almuerzo habitual", usualDinner: "Cena habitual", snacks: "Meriendas, snacks y bebidas habituales", waterLiters: "Agua diaria aproximada (litros)", dietaryPreferences: "Preferencias alimentarias", restrictions: "Alimentos que evitás o alergias (opcional)", knownDailyCalories: "Consumo habitual estimado (kcal, opcional)", timezone: "Zona horaria", calorieGoal: "Objetivo de calorías", proteinGoal: "Objetivo de proteína (g)", carbGoal: "Objetivo de carbohidratos (g)", fatGoal: "Objetivo de grasas (g)" };
