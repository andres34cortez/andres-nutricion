// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Questionnaire } from "./questionnaire";

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

describe("Questionnaire recommendation", () => {
  it("proposes goals from the answers and still lets the user change or restore them", async () => {
    const user = userEvent.setup();
    render(<Questionnaire required initial={{
      name: "Andrés",
      age: 30,
      sex: "Femenino",
      height: 165,
      weight: 60,
      goal: "Perder grasa",
      timezone: "America/Argentina/San_Juan",
      occupation: "Oficina",
      activityLevel: "Algo activo",
      trainingDays: 3,
      training: "Gimnasio",
      mealsPerDay: 4,
      usualBreakfast: "Tostadas",
      usualLunch: "Arroz",
      usualDinner: "Carne",
      snacks: "Fruta",
      waterLiters: 2,
      knownDailyCalories: null,
      dietaryPreferences: "",
      restrictions: "",
    }} />);

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText(/tu mantenimiento estimado es de 1\.900 kcal/i)).toBeVisible();
    expect(screen.getByText(/te propongo/i)).toHaveTextContent("1.600 kcal por día");
    const calories = screen.getByLabelText("Objetivo de calorías");
    expect(calories).toHaveValue(1600);
    expect(screen.getByLabelText("Objetivo de proteína (g)")).toHaveValue(95);

    await user.clear(calories);
    await user.type(calories, "1750");
    expect(calories).toHaveValue(1750);
    await user.click(screen.getByRole("button", { name: "Usar recomendación" }));
    expect(calories).toHaveValue(1600);
  });
});
