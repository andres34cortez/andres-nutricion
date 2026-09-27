// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NutritionApp } from "@/components/nutrition-app";
import type { AppData } from "@/lib/app-types";

vi.mock("recharts", () => ({
  Area: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const emptyData: AppData = {
  meals: [],
  weights: [],
  activities: [],
  profile: {
    name: "Andrés Cortez",
    age: 35,
    height: 178,
    timezone: "America/Argentina/San_Juan",
    calorieGoal: 2400,
    proteinGoal: 180,
    fatGoal: 75,
    carbGoal: 260,
  },
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  vi.stubGlobal("crypto", { randomUUID: () => "test-meal-id" });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NutritionApp", () => {
  it("navigates through the main sections and shows the photo privacy rule", async () => {
    const user = userEvent.setup();
    render(<NutritionApp initialData={emptyData} />);

    expect(screen.getByRole("heading", { name: "Hoy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Historial" }));
    expect(screen.getByRole("heading", { name: "Historial" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Progreso" }));
    expect(screen.getByRole("heading", { name: "Progreso" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Perfil" }));
    expect(screen.getByRole("heading", { name: "Perfil" })).toBeInTheDocument();
    expect(screen.getByText("Las fotos nunca se guardan")).toBeInTheDocument();
  });

  it("adds a manual meal, updates today's totals and persists only structured data", async () => {
    const user = userEvent.setup();
    render(<NutritionApp initialData={emptyData} />);

    await user.click(screen.getByRole("button", { name: "Agregar registro" }));
    const dialog = screen.getByRole("dialog", { name: "Agregar registro" });
    await user.click(within(dialog).getByRole("button", { name: /Agregar comida manual/ }));

    await user.type(screen.getByLabelText("Nombre"), "Pollo con arroz");
    await user.clear(screen.getByLabelText("Cantidad"));
    await user.type(screen.getByLabelText("Cantidad"), "250");
    await user.selectOptions(screen.getByLabelText("Comida"), "Cena");
    await user.clear(screen.getByLabelText("Calorías"));
    await user.type(screen.getByLabelText("Calorías"), "620");
    await user.clear(screen.getByLabelText("Proteína (g)"));
    await user.type(screen.getByLabelText("Proteína (g)"), "52");
    await user.clear(screen.getByLabelText("Carbos (g)"));
    await user.type(screen.getByLabelText("Carbos (g)"), "68");
    await user.clear(screen.getByLabelText("Grasas (g)"));
    await user.type(screen.getByLabelText("Grasas (g)"), "14");
    await user.click(screen.getByRole("button", { name: "Guardar comida" }));

    expect(screen.getByText("Pollo con arroz")).toBeInTheDocument();
    expect(screen.getByText((_, element) =>
      element?.classList.contains("hero-value") === true &&
      element.textContent?.replace(/\s+/g, " ").trim() === "620 / 2.400 kcal",
    )).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await waitFor(() => {
      const stored = localStorage.getItem("nutricion-andres-v1");
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored ?? "{}").meals[0]).toMatchObject({
        name: "Pollo con arroz",
        calories: 620,
        protein: 52,
        carbs: 68,
        fat: 14,
      });
      expect(stored).not.toContain("data:image");
      expect(stored).not.toContain("blob:");
    });
  });

  it("keeps photo analysis disabled until a file is selected and explains disposal", async () => {
    const user = userEvent.setup();
    render(<NutritionApp initialData={emptyData} />);

    await user.click(screen.getByRole("button", { name: "Agregar registro" }));
    await user.click(screen.getByRole("button", { name: /Analizar comida con foto/ }));

    expect(screen.getByRole("button", { name: "Analizar y revisar" })).toBeDisabled();
    expect(screen.getByText(/se descarta inmediatamente después/i)).toBeInTheDocument();
    expect(screen.getByText(/Nunca se guarda en la aplicación/i)).toBeInTheDocument();
  });
});
