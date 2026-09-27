// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsView } from "@/components/reports-view";
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

const mockData: AppData = {
  meals: [
    {
      id: "m-1",
      date: "2026-09-27",
      name: "Almuerzo",
      quantity: 1,
      unit: "porción",
      calories: 650,
      protein: 45,
      carbs: 70,
      fat: 15,
      category: "Almuerzo",
      source: "manual",
    },
  ],
  weights: [
    { id: "w-1", date: "2026-09-27", weightKg: 80.5 },
  ],
  activities: [
    { id: "a-1", date: "2026-09-27", type: "Gym", duration: 60 },
  ],
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
  goals: [
    { validFrom: "2026-09-01T00:00:00.000Z", validUntil: null, calories: 2400, protein: 180, fat: 75, carbs: 260 },
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

describe("ReportsView", () => {
  it("renders calendar week mode by default with period controls", () => {
    render(<ReportsView data={mockData} cloud={false} />);

    expect(screen.getByRole("button", { name: "Semana" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "Período anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Período siguiente" })).toBeDisabled();
    expect(screen.getByText(/Semana:/)).toBeInTheDocument();
    expect(screen.getByText("Calorías promedio")).toBeInTheDocument();
  });

  it("navigates to previous week when clicking ← Anterior", async () => {
    const user = userEvent.setup();
    render(<ReportsView data={mockData} cloud={false} />);

    const prevButton = screen.getByRole("button", { name: "Período anterior" });
    await user.click(prevButton);

    expect(screen.getByRole("button", { name: "Período siguiente" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Hoy" })).toBeInTheDocument();
  });

  it("switches modes to Mes and 30 días", async () => {
    const user = userEvent.setup();
    render(<ReportsView data={mockData} cloud={false} />);

    await user.click(screen.getByRole("button", { name: "Mes" }));
    expect(screen.getByRole("button", { name: "Mes" })).toHaveClass("active");
    expect(screen.getByText(/Mes:/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "30 días" }));
    expect(screen.getByRole("button", { name: "30 días" })).toHaveClass("active");
  });
});
