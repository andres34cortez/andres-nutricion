// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionStatus } from "@/components/connection-status";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ConnectionStatus", () => {
  it("shows a green connected status when the app responds", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    render(<ConnectionStatus />);

    const status = (await screen.findByText("Conectado")).closest('[role="status"]');
    expect(status).toHaveClass("online");
  });

  it("shows a red offline status when the browser has no connection", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    render(<ConnectionStatus />);

    const status = (await screen.findByText("Sin conexión")).closest('[role="status"]');
    expect(status).toHaveClass("offline");
  });
});
