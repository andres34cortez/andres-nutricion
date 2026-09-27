"use client";

import { useEffect, useRef, useState } from "react";
import type { Food } from "@/lib/app-types";
import type { RecordInput } from "@/lib/record-validation";
import { detectedMealSchema, type DetectedMeal } from "@/lib/validation";
import { calculateFoodNutrition } from "@/lib/nutrition";
import { RecordEditor, blankItem } from "./record-editor";

type MealDraft = Extract<RecordInput, { kind: "meal" }>;
type DetectedFood = DetectedMeal["foods"][number];
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

function sameUnit(first: string | undefined, second: string) {
  return Boolean(first?.trim()) && first?.trim().toLowerCase() === second.trim().toLowerCase();
}

export function FoodScanner({ foods, timezone, onSave }: { foods: Food[]; timezone: string; onSave: (value: RecordInput) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DetectedMeal | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<boolean[]>([]);
  const [matches, setMatches] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ meal: MealDraft; missingNutrition: number[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => {
    pending.current?.abort();
    pending.current = null;
  }, []);

  function clearFile() {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function analyze() {
    if (!file || pending.current) return;
    setError("");
    if (file.size > 8 * 1024 * 1024 || !allowedTypes.has(file.type)) {
      setError("Elegí JPG, PNG, WebP o HEIC de hasta 8 MB.");
      clearFile();
      return;
    }

    const body = new FormData();
    body.append("image", file);
    const controller = new AbortController();
    pending.current = controller;
    const timeout = setTimeout(() => controller.abort(), 60000);
    setBusy(true);
    // The image exists only in this request; review and saved records contain text and numbers.
    clearFile();
    try {
      const response = await fetch("/api/ai/food", { method: "POST", body, signal: controller.signal, cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "No pudimos analizar la imagen.";
        throw new Error(message);
      }
      const parsed = detectedMealSchema.safeParse(data);
      if (!parsed.success) throw new Error("El análisis no devolvió ingredientes válidos.");
      if (pending.current !== controller) return;
      setResult(parsed.data);
      setSelected(parsed.data.foods.map(() => true));
      setAnswers({});
      setMatches({});
    } catch (cause) {
      if (pending.current !== controller) return;
      const message = controller.signal.aborted ? "El análisis tardó demasiado." : cause instanceof Error ? cause.message : "No pudimos analizar la imagen.";
      setError(`${message} Volvé a elegir la foto para reintentar o registrá la comida manualmente.`);
    } finally {
      clearTimeout(timeout);
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  function updateFood(index: number, patch: Partial<DetectedFood>) {
    setResult((current) => current && { ...current, foods: current.foods.map((food, i) => i === index ? { ...food, ...patch } : food) });
  }

  const validIngredients = result?.foods.every((food, i) => !selected[i] || (
    food.name.trim().length > 0 && food.name.trim().length <= 120 &&
    food.estimatedQuantity !== undefined && food.estimatedQuantity > 0 && food.estimatedQuantity <= 10000 &&
    Boolean(food.unit?.trim()) && (food.unit?.trim().length ?? 0) <= 30
  ));
  const canContinue = selected.some(Boolean) && validIngredients && !result?.questions.some((question) => !answers[question.id]);

  function prepareDraft() {
    if (!result || !canContinue) return;
    const missingNutrition: number[] = [];
    const items = result.foods.flatMap((food, i) => {
      if (!selected[i]) return [];
      const source = foods.find((candidate) => candidate.id === matches[i]);
      const compatible = source && sameUnit(food.unit, source.servingUnit);
      const quantity = food.estimatedQuantity!;
      const item = {
        ...blankItem,
        name: food.name.trim(),
        quantity,
        unit: food.unit!.trim(),
        ...(compatible ? calculateFoodNutrition({ ...source, quantity }) : {}),
        source: "ai_photo" as const,
        estimated: true,
      };
      return [{ item, missing: !compatible }];
    });
    items.forEach(({ missing }, index) => { if (missing) missingNutrition.push(index); });
    setDraft({
      meal: {
        kind: "meal", timestamp: new Date().toISOString(), category: "Almuerzo",
        notes: result.questions.map((question) => `${question.question}: ${answers[question.id]}`).join("\n"),
        items: items.map(({ item }) => item),
      },
      missingNutrition,
    });
  }

  if (draft) return <RecordEditor initial={draft.meal} missingNutrition={draft.missingNutrition} timezone={timezone} onSave={onSave} onBack={() => setDraft(null)} />;

  return <div className="form">
    <h2>{result ? "Confirmá los ingredientes" : "Fotografiá tu comida"}</h2>
    {!result ? <>
      <label className="upload">Tomar o elegir una foto
        <input ref={fileInput} aria-label="Foto de comida" type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" disabled={busy} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }} />
        {file?.name}
      </label>
      <p className="notice">La foto se envía a Gemini para analizarla. La aplicación no guarda la imagen: solo los datos que confirmes.</p>
      <button type="button" className="primary-button" disabled={!file || busy} onClick={analyze}>{busy ? "Analizando…" : "Analizar y revisar"}</button>
      {busy && <button type="button" onClick={() => { pending.current?.abort(); pending.current = null; setBusy(false); setError("Análisis cancelado. Elegí una foto para volver a intentar."); }}>Cancelar análisis</button>}
    </> : <>
      {result.warnings.map((warning, i) => <p key={i} className="notice">{warning}</p>)}
      {result.foods.map((food, i) => {
        const source = foods.find((candidate) => candidate.id === matches[i]);
        const incompatible = source && !sameUnit(food.unit, source.servingUnit);
        return <fieldset key={i} className="editor-item">
          <legend>Ingrediente {i + 1}</legend>
          <label><input type="checkbox" checked={selected[i]} onChange={(event) => setSelected((current) => current.map((value, index) => index === i ? event.target.checked : value))} /> Incluir ingrediente {i + 1}</label>
          <label className="field"><span>Ingrediente detectado</span><input disabled={!selected[i]} maxLength={120} value={food.name} onChange={(event) => updateFood(i, { name: event.target.value })} /></label>
          {food.preparation && <p>{food.preparation}</p>}
          <div className="form-grid">
            <label className="field"><span>Cantidad estimada</span><input disabled={!selected[i]} type="number" min="0.1" max="10000" step="any" placeholder="Confirmar cantidad" value={food.estimatedQuantity ?? ""} onChange={(event) => updateFood(i, { estimatedQuantity: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
            <label className="field"><span>Unidad</span><input disabled={!selected[i]} maxLength={30} placeholder="Ej. g, ml o unidad" value={food.unit ?? ""} onChange={(event) => updateFood(i, { unit: event.target.value })} /></label>
          </div>
          <label className="field"><span>Usar valores de mi catálogo</span><select disabled={!selected[i]} value={matches[i] ?? ""} onChange={(event) => setMatches((current) => ({ ...current, [i]: event.target.value }))}>
            <option value="">Completar macros manualmente</option>
            {foods.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.servingAmount} {candidate.servingUnit}</option>)}
          </select></label>
          {selected[i] && incompatible && <p className="notice">Unidades incompatibles: detectado {food.unit || "sin unidad"}, catálogo en {source.servingUnit}. No convertimos unidades automáticamente. Ingresá una cantidad medida en {source.servingUnit} y cambiá la unidad, o completá los macros manualmente.</p>}
          {selected[i] && !source && <p>Sin referencia nutricional: en el próximo paso deberás completar calorías, proteínas, carbos y grasas.</p>}
          {selected[i] && source && !incompatible && <p>Se calcularán los macros de {source.name} para la cantidad indicada. Revisá que coincidan el alimento y su preparación.</p>}
        </fieldset>;
      })}
      <button type="button" onClick={() => { setResult((current) => current && { ...current, foods: [...current.foods, { name: "", needsClarification: false }] }); setSelected((current) => [...current, true]); }}>+ Agregar ingrediente no detectado</button>
      {result.questions.map((question) => <label className="field" key={question.id}><span>{question.question}</span><select value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}>
        <option value="">Seleccionar</option>{question.options.map((option) => <option key={option}>{option}</option>)}
      </select></label>)}
      <p>Confirmá ingredientes, cantidades, unidades y preguntas. La foto no permite conocer los macros con precisión; usá tu catálogo o una etiqueta/fuente nutricional. Los valores faltantes quedarán vacíos, no en cero.</p>
      <button type="button" className="primary-button" disabled={!canContinue} onClick={prepareDraft}>Confirmar y completar nutrición</button>
      <button type="button" onClick={() => { setResult(null); setSelected([]); setAnswers({}); setMatches({}); setError(""); clearFile(); }}>Elegir otra foto</button>
    </>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}
