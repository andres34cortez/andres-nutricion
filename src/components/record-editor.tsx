"use client";

import { useRef, useState } from "react";
import { recordSchema, type RecordInput } from "@/lib/record-validation";
import { localDateTime, toTimestamp } from "@/lib/dates";
import { calculateFoodNutrition, calculateMealNutrition, type Nutrition } from "@/lib/nutrition";

type MealItem = Extract<RecordInput, { kind: "meal" }>["items"][number];
const macroKeys = ["calories", "protein", "carbs", "fat"] as const;
const labels = { calories: "Calorías", protein: "Proteína (g)", carbs: "Carbos (g)", fat: "Grasas (g)" };
const limits = { calories: 10000, protein: 1000, carbs: 1500, fat: 1000 };
export const blankItem: MealItem = { name: "", quantity: 100, unit: "g", calories: 0, protein: 0, carbs: 0, fat: 0, source: "manual", estimated: false };
type Row = {
  id: number;
  item: MealItem;
  quantity: string;
  macros: Record<keyof Nutrition, string>;
  basis: (Nutrition & { servingAmount: number }) | null;
  missing: boolean;
};

function nutritionFromFields(fields: Row["macros"]): Nutrition | null {
  if (macroKeys.some(key => fields[key].trim() === "" || !Number.isFinite(Number(fields[key])) || Number(fields[key]) < 0)) return null;
  return { calories: Number(fields.calories), protein: Number(fields.protein), carbs: Number(fields.carbs), fat: Number(fields.fat) };
}
function fieldsFromNutrition(n: Nutrition): Row["macros"] {
  return { calories: String(n.calories), protein: String(n.protein), carbs: String(n.carbs), fat: String(n.fat) };
}
function makeRow(item: MealItem, id: number, missing = false): Row {
  const incomplete = missing || !item.name;
  return { id, item: { ...item }, quantity: String(item.quantity), macros: incomplete ? { calories: "", protein: "", carbs: "", fat: "" } : fieldsFromNutrition(item), basis: incomplete ? null : { ...item, servingAmount: item.quantity }, missing: incomplete };
}

export function RecordEditor({ initial, timezone, onSave, missingNutrition = [], onBack }: {
  initial: RecordInput;
  timezone: string;
  onSave: (value: RecordInput) => Promise<void>;
  missingNutrition?: number[];
  onBack?: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [rows, setRows] = useState(() => initial.kind === "meal" ? initial.items.map((item, i) => makeRow(item, i, missingNutrition.includes(i))) : []);
  const nextRowId = useRef(rows.length);
  const submitting = useRef(false);
  const [date, setDate] = useState(() => localDateTime(initial.timestamp, timezone));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (patch: object) => setValue(old => ({ ...old, ...patch }));
  const updateRow = (id: number, change: (row: Row) => Row) => setRows(old => old.map(row => row.id === id ? change(row) : row));

  function changeQuantity(id: number, quantity: string) {
    updateRow(id, row => {
      const amount = Number(quantity);
      const macros = row.basis && quantity !== "" && Number.isFinite(amount) && amount > 0
        ? fieldsFromNutrition(calculateFoodNutrition({ ...row.basis, quantity: amount })) : row.macros;
      return { ...row, quantity, macros };
    });
  }
  function changeMacro(id: number, key: keyof Nutrition, text: string) {
    updateRow(id, row => {
      const macros = { ...row.macros, [key]: text };
      const nutrition = nutritionFromFields(macros);
      const quantity = Number(row.quantity);
      return { ...row, macros, missing: !nutrition, item: { ...row.item, zeroNutritionConfirmed: false }, basis: nutrition && quantity > 0 ? { ...nutrition, servingAmount: quantity } : null };
    });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    try {
      const items = rows.map(row => {
        const nutrition = nutritionFromFields(row.macros);
        if (!nutrition) throw new Error(`Completá los cuatro valores nutricionales de ${row.item.name || "cada ingrediente"}. Si un valor es cero, ingresá 0.`);
        return { ...row.item, ...nutrition, quantity: row.quantity.trim() ? Number(row.quantity) : NaN };
      });
      const parsed = recordSchema.safeParse({ ...value, ...(value.kind === "meal" ? { items } : {}), timestamp: toTimestamp(date, timezone) });
      if (!parsed.success) throw new Error(parsed.error.issues.find(issue => issue.path.includes("zeroNutritionConfirmed"))?.message ?? "Revisá los campos: cantidades positivas y valores dentro de los límites.");
      submitting.current = true;
      setBusy(true);
      await onSave(parsed.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar. Tus datos siguen en el formulario.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const nutritionComplete = rows.every(row => nutritionFromFields(row.macros));
  const total = calculateMealNutrition(rows.flatMap(row => {
    const nutrition = nutritionFromFields(row.macros);
    return nutrition ? [nutrition] : [];
  }));

  return <form className="form" onSubmit={submit} aria-busy={busy}>
    <h2>{value.kind === "meal" ? "Revisar comida" : value.kind === "weight" ? "Registrar peso" : "Registrar actividad"}</h2>
    {onBack && <button type="button" disabled={busy} onClick={onBack}>Volver a ingredientes</button>}
    <label className="field"><span>Fecha y hora ({timezone})</span><input type="datetime-local" required disabled={busy} value={date} onChange={e => setDate(e.target.value)} /></label>
    {value.kind === "meal" && <>
      <label className="field"><span>Comida</span><select disabled={busy} value={value.category} onChange={e => update({ category: e.target.value })}>{["Desayuno", "Almuerzo", "Merienda", "Cena", "Otros"].map(option => <option key={option}>{option}</option>)}</select></label>
      <p className="subtle">Los macros corresponden a la cantidad indicada. Al cambiarla se recalculan proporcionalmente. Si cambiás la unidad, tenés que ingresar los valores de esa nueva unidad.</p>
      {rows.map((row, i) => {
        const nutrition = nutritionFromFields(row.macros);
        const allZero = nutrition && macroKeys.every(key => nutrition[key] === 0);
        return <fieldset key={row.id} className="editor-item" disabled={busy}>
          <legend>Ingrediente {i + 1}</legend>
          <label className="field"><span>Nombre</span><input required maxLength={120} placeholder="Ej. pechuga de pollo" value={row.item.name} onChange={e => updateRow(row.id, old => ({ ...old, item: { ...old.item, name: e.target.value } }))} /></label>
          <label className="field"><span>Cantidad</span><input type="number" required min="0.1" max="10000" step="any" value={row.quantity} onChange={e => changeQuantity(row.id, e.target.value)} /></label>
          <label className="field"><span>Unidad</span><input required maxLength={30} value={row.item.unit} onChange={e => updateRow(row.id, old => ({ ...old, item: { ...old.item, unit: e.target.value, zeroNutritionConfirmed: false }, macros: { calories: "", protein: "", carbs: "", fat: "" }, basis: null, missing: true }))} /></label>
          {row.missing && <p className="notice">Falta información nutricional: completá los cuatro valores para {row.quantity || "la cantidad indicada"} {row.item.unit}. No interpretamos un dato vacío como cero.</p>}
          {macroKeys.map(key => <label className="field" key={key}><span>{labels[key]}</span><input type="number" required min="0" max={limits[key]} step="any" value={row.macros[key]} onChange={e => changeMacro(row.id, key, e.target.value)} /></label>)}
          {allZero && <label><input type="checkbox" checked={row.item.zeroNutritionConfirmed ?? false} onChange={e => updateRow(row.id, old => ({ ...old, item: { ...old.item, zeroNutritionConfirmed: e.target.checked } }))} /> Confirmo que este alimento tiene 0 kcal y 0 g de proteínas, carbohidratos y grasas (por ejemplo, agua).</label>}
          {rows.length > 1 && <button type="button" onClick={() => setRows(old => old.filter(item => item.id !== row.id))}>Quitar ingrediente</button>}
        </fieldset>;
      })}
      <button type="button" disabled={busy || rows.length >= 50} onClick={() => { const id = nextRowId.current++; setRows(old => [...old, makeRow({ ...blankItem }, id)]); }}>+ Agregar ingrediente</button>
      <label className="field"><span>Notas</span><input disabled={busy} maxLength={1000} value={value.notes} onChange={e => update({ notes: e.target.value })} /></label>
      <p aria-live="polite">{nutritionComplete ? "Total" : "Subtotal (faltan datos)"}: {total.calories} kcal · {total.protein} g proteína · {total.carbs} g carbos · {total.fat} g grasas</p>
      {rows.some(row => row.item.estimated) && <p>Los valores son aproximados. Revisá cantidades y macros antes de guardar.</p>}
    </>}
    {value.kind === "weight" && <label className="field"><span>Peso actual</span><input type="number" required disabled={busy} min="30" max="300" step="0.1" value={value.weightKg} onChange={e => update({ weightKg: Number(e.target.value) })} /></label>}
    {value.kind === "activity" && <>
      <label className="field"><span>Tipo</span><select disabled={busy} value={value.type} onChange={e => update({ type: e.target.value })}>{["Gym", "CrossFit", "Caminata", "Otro"].map(option => <option key={option}>{option}</option>)}</select></label>
      {(["duration", "distanceKm", "steps"] as const).map(key => <label className="field" key={key}><span>{{ duration: "Duración (min)", distanceKm: "Distancia (km)", steps: "Pasos" }[key]}</span><input type="number" disabled={busy} required={key === "duration"} min="0" max={{ duration: 1440, distanceKm: 1000, steps: 200000 }[key]} step={key === "distanceKm" ? "0.1" : "1"} value={value[key] ?? ""} onChange={e => update({ [key]: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>)}
      <label className="field"><span>Detalle opcional</span><input disabled={busy} maxLength={1000} value={value.detail} onChange={e => update({ detail: e.target.value })} /></label>
    </>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <button className="primary-button" disabled={busy}>{busy ? "Guardando…" : value.kind === "meal" ? "Guardar comida" : value.kind === "weight" ? "Guardar peso" : "Guardar actividad"}</button>
  </form>;
}
