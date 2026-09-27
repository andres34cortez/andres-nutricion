// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Questionnaire } from "./questionnaire";
import { ProfileView } from "./profile-view";
import type { AppData } from "@/lib/app-types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
afterEach(cleanup);

const data: AppData = {
  meals: [], weights: [], activities: [],
  profile: { name: "Prueba", age: 30, height: 178, timezone: "America/Argentina/San_Juan", calorieGoal: 2400, proteinGoal: 180, carbGoal: 251, fatGoal: 75 },
};

describe("Height collection", () => {
  it("asks for height on the first questionnaire step, without a default", async () => {
    const user = userEvent.setup();
    render(<Questionnaire required initial={{ name: "Prueba", age: 30, weight: 80 }} />);
    const height = screen.getByLabelText("Altura (cm)");
    expect(screen.getByText("¿Cuánto medís?")).toBeInTheDocument();
    expect(height).toBeRequired();
    expect(height).toHaveValue(null);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("heading", { name: "Conozcamos tu punto de partida" })).toBeInTheDocument();
    await user.type(height, "175");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("heading", { name: "Tu día y actividad habitual" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    expect(screen.getByLabelText("Altura (cm)")).toHaveValue(175);
  });

  it("allows editing a saved height in centimeters from Profile", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileView data={data} cloud={false} googleEnabled={false} onSave={onSave} />);
    const height = screen.getByLabelText("Altura (cm)");
    expect(height).toHaveValue(178);
    await user.clear(height);
    await user.type(height, "181.5");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith({ ...data.profile, height: 181.5 });
  });

  it("does not invent a height when the saved profile has none", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ProfileView data={{ ...data, profile: { ...data.profile, height: null } }} cloud={false} googleEnabled={false} onSave={onSave} />);
    expect(screen.getByLabelText("Altura (cm)")).toHaveValue(null);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects meter-style or out-of-range values even if native validation is bypassed", () => {
    const onSave = vi.fn();
    render(<ProfileView data={data} cloud={false} googleEnabled={false} onSave={onSave} />);
    const height = screen.getByLabelText("Altura (cm)");
    fireEvent.change(height, { target: { value: "1.75" } });
    fireEvent.submit(height.closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresá tu altura en centímetros, entre 100 y 250 cm.");
    expect(onSave).not.toHaveBeenCalled();
    expect(height).toHaveValue(1.75);
  });
});
