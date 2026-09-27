// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecordEditor } from "@/components/record-editor";
import type { RecordInput } from "@/lib/record-validation";

type MealRecord = Extract<RecordInput, { kind: "meal" }>;
const timezone = "America/Argentina/San_Juan";
const macroLabels = ["Calorías", "Proteína (g)", "Carbos (g)", "Grasas (g)"] as const;

function meal(): MealRecord {
  return {
    kind: "meal",
    timestamp: "2026-09-28T02:30:00.000Z",
    category: "Cena",
    notes: "",
    items: [{
      name: "Alimento de prueba",
      quantity: 100,
      unit: "g",
      calories: 111,
      protein: 3.3,
      carbs: 4.4,
      fat: 5.5,
      source: "manual",
      estimated: false,
    }],
  };
}

function macros() {
  return macroLabels.map(label => screen.getByRole("spinbutton", { name: label }));
}

afterEach(cleanup);

describe("RecordEditor", () => {
  it("rescales 100 → 200 → 100 from the original basis without accumulating rounding drift", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RecordEditor initial={meal()} timezone={timezone} onSave={onSave} />);
    const quantity = screen.getByRole("spinbutton", { name: "Cantidad" });

    await user.clear(quantity);
    await user.type(quantity, "200");
    [222, 6.6, 8.8, 11].forEach((value, i) => expect(macros()[i]).toHaveValue(value));
    await user.clear(quantity);
    await user.type(quantity, "100");
    [111, 3.3, 4.4, 5.5].forEach((value, i) => expect(macros()[i]).toHaveValue(value));

    // A fractional intermediate portion would expose calculations based on rounded results.
    await user.clear(quantity);
    await user.type(quantity, "33");
    await user.clear(quantity);
    await user.type(quantity, "100");
    [111, 3.3, 4.4, 5.5].forEach((value, i) => expect(macros()[i]).toHaveValue(value));
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith(meal());
  });

  it("allows clearing the quantity and rewriting it without losing the nutrition basis", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RecordEditor initial={meal()} timezone={timezone} onSave={onSave} />);
    const quantity = screen.getByRole("spinbutton", { name: "Cantidad" });

    await user.clear(quantity);
    expect(quantity).toHaveValue(null);
    expect(macros()[0]).toHaveValue(111);
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).not.toHaveBeenCalled();

    await user.type(quantity, "250");
    expect(quantity).toHaveValue(250);
    [278, 8.3, 11, 13.8].forEach((value, i) => expect(macros()[i]).toHaveValue(value));
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      items: [expect.objectContaining({ quantity: 250, calories: 278, protein: 8.3, carbs: 11, fat: 13.8 })],
    }));
  });

  it("rebases proportional calculations after a manual macro correction", async () => {
    const user = userEvent.setup();
    render(<RecordEditor initial={meal()} timezone={timezone} onSave={vi.fn()} />);
    const quantity = screen.getByRole("spinbutton", { name: "Cantidad" });
    await user.clear(quantity);
    await user.type(quantity, "200");
    await user.clear(macros()[0]);
    await user.type(macros()[0], "300");

    await user.clear(quantity);
    await user.type(quantity, "100");
    [150, 3.3, 4.4, 5.5].forEach((value, i) => expect(macros()[i]).toHaveValue(value));
    await user.clear(quantity);
    await user.type(quantity, "200");
    [300, 6.6, 8.8, 11].forEach((value, i) => expect(macros()[i]).toHaveValue(value));
  });

  it("leaves all four unknown macros blank and refuses to save incomplete nutrition", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<RecordEditor initial={meal()} timezone={timezone} onSave={onSave} missingNutrition={[0]} />);
    macros().forEach(input => expect(input).toHaveValue(null));
    expect(screen.getByText(/No interpretamos un dato vacío como cero/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).not.toHaveBeenCalled();
    // Also exercise the JS guard if native form validation is bypassed.
    fireEvent.submit(container.querySelector("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("Completá los cuatro valores nutricionales");
    expect(onSave).not.toHaveBeenCalled();
    await user.type(macros()[0], "111");
    await user.type(macros()[1], "3.3");
    await user.type(macros()[2], "4.4");
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).not.toHaveBeenCalled();
    await user.type(macros()[3], "5.5");
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("invalidates macros and the scaling basis when the unit changes", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RecordEditor initial={meal()} timezone={timezone} onSave={onSave} />);
    const unit = screen.getByRole("textbox", { name: "Unidad" });
    await user.clear(unit);
    await user.type(unit, "porción");
    macros().forEach(input => expect(input).toHaveValue(null));

    const quantity = screen.getByRole("spinbutton", { name: "Cantidad" });
    await user.clear(quantity);
    await user.type(quantity, "2");
    macros().forEach(input => expect(input).toHaveValue(null));
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).not.toHaveBeenCalled();

    for (const [i, value] of [400, 20, 40, 12].entries()) await user.type(macros()[i], String(value));
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      items: [expect.objectContaining({ quantity: 2, unit: "porción", calories: 400, protein: 20, carbs: 40, fat: 12 })],
    }));
  });

  it("requires explicit confirmation for an ingredient with all nutrition values at zero", async () => {
    const user = userEvent.setup();
    const initial = meal();
    initial.items[0] = { ...initial.items[0], name: "Agua", calories: 0, protein: 0, carbs: 0, fat: 0 };
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RecordEditor initial={initial} timezone={timezone} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("confirmá que este alimento realmente tiene todos sus valores en cero");
    await user.click(screen.getByRole("checkbox", { name: /Confirmo que este alimento tiene 0 kcal/ }));
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      items: [expect.objectContaining({ name: "Agua", calories: 0, protein: 0, carbs: 0, fat: 0, zeroNutritionConfirmed: true })],
    }));
  });

  it("keeps the entered values after a failed save and lets the user retry", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValueOnce(new Error("Sin conexión, intentá de nuevo.")).mockResolvedValueOnce(undefined);
    render(<RecordEditor initial={meal()} timezone={timezone} onSave={onSave} />);
    const name = screen.getByRole("textbox", { name: "Nombre" });
    await user.clear(name);
    await user.type(name, "Cena corregida");
    await user.type(screen.getByRole("textbox", { name: "Notas" }), "Conservar este detalle");
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión, intentá de nuevo.");
    expect(name).toHaveValue("Cena corregida");
    expect(screen.getByRole("textbox", { name: "Notas" })).toHaveValue("Conservar este detalle");
    [111, 3.3, 4.4, 5.5].forEach((value, i) => expect(macros()[i]).toHaveValue(value));
    expect(screen.getByRole("button", { name: "Guardar comida" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave.mock.calls[1][0]).toEqual(onSave.mock.calls[0][0]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("blocks duplicate submits while saving and unlocks the form once finished", async () => {
    let resolveSave!: () => void;
    const pending = new Promise<void>(resolve => { resolveSave = resolve; });
    const onSave = vi.fn().mockReturnValue(pending);
    const { container } = render(<RecordEditor initial={meal()} timezone={timezone} onSave={onSave} />);
    const form = container.querySelector("form")!;

    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(onSave).toHaveBeenCalledOnce();
    expect(form).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Cantidad" })).toBeDisabled();
    fireEvent.submit(form);
    expect(onSave).toHaveBeenCalledOnce();

    await act(async () => resolveSave());
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar comida" })).toBeEnabled());
    expect(form).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("spinbutton", { name: "Cantidad" })).toBeEnabled();
  });

  it("displays and saves 23:30 in Argentina as 02:30 UTC on the following day", async () => {
    const user = userEvent.setup();
    const initial = meal();
    initial.timestamp = "2026-09-27T15:00:00.000Z";
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RecordEditor initial={initial} timezone={timezone} onSave={onSave} />);
    const date = screen.getByLabelText(`Fecha y hora (${timezone})`);
    expect(date).toHaveValue("2026-09-27T12:00");

    fireEvent.change(date, { target: { value: "2026-09-27T23:30" } });
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ timestamp: "2026-09-28T02:30:00.000Z" }));
  });
});
