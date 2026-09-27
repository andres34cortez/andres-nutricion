// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Library } from "@/components/library";
import type { AppData } from "@/lib/app-types";

const mockAppData: AppData = {
  meals: [],
  weights: [],
  activities: [],
  profile: {
    name: "Andrés",
    age: 35,
    height: 178,
    timezone: "America/Argentina/San_Juan",
    calorieGoal: 2400,
    proteinGoal: 180,
    fatGoal: 75,
    carbGoal: 260,
  },
  foods: [
    {
      id: "f-1",
      name: "Avena",
      servingAmount: 100,
      servingUnit: "g",
      calories: 389,
      protein: 16.9,
      carbs: 66.3,
      fat: 6.9,
      favorite: true,
    },
    {
      id: "f-2",
      name: "Huevos",
      servingAmount: 1,
      servingUnit: "unidad",
      calories: 75,
      protein: 6.3,
      carbs: 0.4,
      fat: 5.2,
      favorite: false,
    },
  ],
  recipes: [
    {
      id: "r-1",
      name: "Omelette simple",
      servings: 1,
      ingredients: [
        { foodId: "f-2", quantity: 2, unit: "unidad" },
      ],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Library Component", () => {
  it("renders foods and recipes list correctly", () => {
    render(
      <Library
        data={mockAppData}
        cloud={false}
        refresh={async () => {}}
        onChoose={() => {}}
      />
    );

    expect(screen.getByText("★ Avena")).toBeInTheDocument();
    expect(screen.getByText("Huevos")).toBeInTheDocument();
    expect(screen.getByText("Omelette simple")).toBeInTheDocument();
  });

  it("adds a favorite food to the diary via onChoose callback", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(
      <Library
        data={mockAppData}
        cloud={false}
        refresh={async () => {}}
        onChoose={onChoose}
      />
    );

    const addButtons = screen.getAllByRole("button", { name: "Agregar al diario" });
    await user.click(addButtons[0]);

    expect(onChoose).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "meal",
        items: [
          expect.objectContaining({
            name: "Avena",
            quantity: 100,
            unit: "g",
            calories: 389,
            protein: 16.9,
            source: "favorite",
          }),
        ],
      })
    );
  });

  it("adds a recipe to the diary with calculated per-serving macros", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(
      <Library
        data={mockAppData}
        cloud={false}
        refresh={async () => {}}
        onChoose={onChoose}
      />
    );

    const addButtons = screen.getAllByRole("button", { name: "Agregar al diario" });
    // Third add button is for recipe (after Avena and Huevos)
    await user.click(addButtons[2]);

    expect(onChoose).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "meal",
        items: [
          expect.objectContaining({
            name: "Omelette simple",
            quantity: 1,
            unit: "porción",
            calories: 150, // 2 * 75
            protein: 12.6, // 2 * 6.3
            source: "recipe",
          }),
        ],
      })
    );
  });
});
