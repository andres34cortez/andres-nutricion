// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Food } from "@/lib/app-types";
import type { RecordInput } from "@/lib/record-validation";
import type { DetectedMeal } from "@/lib/validation";
import { FoodScanner } from "./food-scanner";

type EditorProps = { initial: Extract<RecordInput, { kind: "meal" }>; missingNutrition: number[]; onBack: () => void };
const { editor } = vi.hoisted(() => ({ editor: vi.fn() }));

vi.mock("./record-editor", () => ({
  blankItem: { name: "", quantity: 100, unit: "g", calories: 0, protein: 0, carbs: 0, fat: 0, source: "manual", estimated: false },
  RecordEditor: (props: EditorProps) => {
    editor(props);
    return <section aria-label="Editor de nutrición"><button type="button" onClick={props.onBack}>Volver a ingredientes</button></section>;
  },
}));

const food: Food = { id: "rice", name: "Arroz cocido", servingAmount: 100, servingUnit: "g", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, favorite: true };
const detected: DetectedMeal = {
  foods: [{ name: "Arroz", estimatedQuantity: 150, unit: "g", preparation: "cocido", needsClarification: false }],
  questions: [], warnings: ["La porción es aproximada."],
};

function mockAnalysis(value: unknown = detected) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => value });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function props(): EditorProps {
  return editor.mock.lastCall![0] as EditorProps;
}

async function analyze() {
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText("Foto de comida"), new File(["image bytes"], "almuerzo.jpg", { type: "image/jpeg" }));
  await user.click(screen.getByRole("button", { name: "Analizar y revisar" }));
  await screen.findByRole("heading", { name: "Confirmá los ingredientes" });
  return user;
}

beforeEach(() => { editor.mockClear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("FoodScanner", () => {
  it("preserves corrections and clarification answers, calculates a compatible catalog portion and never persists the photo", async () => {
    const fetchMock = mockAnalysis({ ...detected, questions: [{ id: "oil", question: "¿Agregaste aceite?", options: ["Sí", "No"] }] });
    const persist = vi.spyOn(Storage.prototype, "setItem");
    render(<FoodScanner foods={[food]} timezone="America/Argentina/San_Juan" onSave={vi.fn()} />);
    const user = await analyze();

    expect(screen.getByText("La porción es aproximada.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirmar y completar nutrición" })).toBeDisabled();
    await user.clear(screen.getByLabelText("Ingrediente detectado"));
    await user.type(screen.getByLabelText("Ingrediente detectado"), "Arroz integral cocido");
    await user.selectOptions(screen.getByLabelText("Usar valores de mi catálogo"), food.id);
    await user.selectOptions(screen.getByLabelText("¿Agregaste aceite?"), "No");
    await user.click(screen.getByRole("button", { name: "Confirmar y completar nutrición" }));

    expect(props().initial.items[0]).toMatchObject({ name: "Arroz integral cocido", quantity: 150, unit: "g", calories: 195, protein: 4.1, carbs: 42, fat: 0.5, source: "ai_photo", estimated: true });
    expect(props().initial.notes).toBe("¿Agregaste aceite?: No");
    expect(props().missingNutrition).toEqual([]);
    expect(persist).not.toHaveBeenCalled();
    expect(JSON.stringify(props().initial)).not.toContain("almuerzo.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/ai/food", expect.objectContaining({ method: "POST", cache: "no-store" }));
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("image")).toBeInstanceOf(File);

    await user.click(screen.getByRole("button", { name: "Volver a ingredientes" }));
    expect(screen.getByLabelText("Ingrediente detectado")).toHaveValue("Arroz integral cocido");
    expect(screen.getByLabelText("¿Agregaste aceite?")).toHaveValue("No");
    expect(screen.getByLabelText("Usar valores de mi catálogo")).toHaveValue(food.id);
    expect(screen.queryByLabelText("Foto de comida")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not convert incompatible units or silently populate missing macros", async () => {
    mockAnalysis({ ...detected, foods: [{ ...detected.foods[0], estimatedQuantity: 1.5, unit: "tazas" }] });
    render(<FoodScanner foods={[food]} timezone="UTC" onSave={vi.fn()} />);
    const user = await analyze();
    await user.selectOptions(screen.getByLabelText("Usar valores de mi catálogo"), food.id);
    expect(screen.getByText(/Unidades incompatibles/)).toHaveTextContent("No convertimos unidades automáticamente");
    await user.click(screen.getByRole("button", { name: "Confirmar y completar nutrición" }));
    expect(props().missingNutrition).toEqual([0]);
    expect(props().initial.items[0]).toMatchObject({ quantity: 1.5, unit: "tazas", calories: 0 });
  });

  it("requires the user to supply missing quantity and unit without assuming grams from a catalog entry", async () => {
    mockAnalysis({ ...detected, foods: [{ name: "Arroz", needsClarification: true }] });
    render(<FoodScanner foods={[food]} timezone="UTC" onSave={vi.fn()} />);
    const user = await analyze();
    await user.selectOptions(screen.getByLabelText("Usar valores de mi catálogo"), food.id);
    expect(screen.getByLabelText("Cantidad estimada")).toHaveValue(null);
    expect(screen.getByLabelText("Unidad")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Confirmar y completar nutrición" })).toBeDisabled();
    await user.type(screen.getByLabelText("Cantidad estimada"), "200");
    expect(screen.getByRole("button", { name: "Confirmar y completar nutrición" })).toBeDisabled();
    await user.type(screen.getByLabelText("Unidad"), "g");
    await user.click(screen.getByRole("button", { name: "Confirmar y completar nutrición" }));
    expect(props().initial.items[0]).toMatchObject({ quantity: 200, unit: "g", calories: 260 });
    expect(props().missingNutrition).toEqual([]);
  });

  it("reindexes missing-nutrition markers after excluding ingredients and supports ingredients missed by AI", async () => {
    mockAnalysis({ ...detected, foods: [detected.foods[0], { name: "Pollo", estimatedQuantity: 100, unit: "g", needsClarification: false }] });
    render(<FoodScanner foods={[food]} timezone="UTC" onSave={vi.fn()} />);
    const user = await analyze();
    await user.click(screen.getByLabelText("Incluir ingrediente 1"));
    await user.click(screen.getByRole("button", { name: "+ Agregar ingrediente no detectado" }));
    expect(screen.getByRole("button", { name: "Confirmar y completar nutrición" })).toBeDisabled();
    await user.type(screen.getAllByLabelText("Ingrediente detectado")[2], "Aceite");
    await user.type(screen.getAllByLabelText("Cantidad estimada")[2], "10");
    await user.type(screen.getAllByLabelText("Unidad")[2], "ml");
    await user.click(screen.getByRole("button", { name: "Confirmar y completar nutrición" }));
    expect(props().initial.items.map((item) => item.name)).toEqual(["Pollo", "Aceite"]);
    expect(props().missingNutrition).toEqual([0, 1]);
  });

  it("clears the image on errors and lets the user retry with a newly selected photo", async () => {
    const fetchMock = mockAnalysis({ foods: [] });
    render(<FoodScanner foods={[food]} timezone="UTC" onSave={vi.fn()} />);
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Foto de comida"), new File(["image bytes"], "fallo.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("button", { name: "Analizar y revisar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El análisis no devolvió ingredientes válidos");
    expect(screen.getByLabelText("Foto de comida")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Analizar y revisar" })).toBeDisabled();
    expect(screen.queryByText("fallo.jpg")).not.toBeInTheDocument();

    fetchMock.mockResolvedValue({ ok: true, json: async () => detected });
    await analyze();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Elegir otra foto" }));
    expect(screen.getByLabelText("Foto de comida")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Analizar y revisar" })).toBeDisabled();
  });

  it.each(["invalid", "oversized"])("rejects an %s upload without calling the analysis endpoint", async (reason) => {
    const fetchMock = mockAnalysis();
    render(<FoodScanner foods={[]} timezone="UTC" onSave={vi.fn()} />);
    const file = new File(["content"], "archivo", { type: reason === "invalid" ? "application/pdf" : "image/jpeg" });
    if (reason === "oversized") Object.defineProperty(file, "size", { value: 8 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText("Foto de comida"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Analizar y revisar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("de hasta 8 MB");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cancels a pending upload and discards its late result", async () => {
    let finish: ((response: unknown) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<FoodScanner foods={[]} timezone="UTC" onSave={vi.fn()} />);
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Foto de comida"), new File(["image"], "comida.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("button", { name: "Analizar y revisar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar análisis" }));
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    finish?.({ ok: true, json: async () => detected });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Análisis cancelado"));
    expect(screen.queryByRole("heading", { name: "Confirmá los ingredientes" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analizar y revisar" })).toBeDisabled();
  });
});
