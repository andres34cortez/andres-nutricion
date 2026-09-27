// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionStatus } from "@/components/connection-status";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ConnectionStatus", () => {
  it("renders nothing while checking the connection", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    const { container } = render(<ConnectionStatus />);

    expect(container).toBeEmptyDOMElement();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders nothing when the app responds successfully", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<ConnectionStatus />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.objectContaining({ cache: "no-store" }));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Conectado")).not.toBeInTheDocument();
  });

  it("shows only the red offline status when the browser has no connection", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ConnectionStatus />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.getByRole("status")).toHaveClass("offline");
    expect(screen.getByRole("status")).toHaveTextContent("Sin conexión");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["http", "network"])("shows the offline warning on a %s health-check error", async (failure) => {
    const fetchMock = failure === "http"
      ? vi.fn().mockResolvedValue({ ok: false })
      : vi.fn().mockRejectedValue(new Error("Network unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    render(<ConnectionStatus />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.getByRole("status")).toHaveClass("offline");
    expect(screen.getByRole("status")).toHaveTextContent("Sin conexión");
  });

  it("shows the warning on disconnection and removes it once connection returns", async () => {
    const online = vi.spyOn(navigator, "onLine", "get");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    render(<ConnectionStatus />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    online.mockReturnValue(false);
    act(() => window.dispatchEvent(new Event("offline")));
    expect(screen.getByRole("status")).toHaveTextContent("Sin conexión");

    online.mockReturnValue(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Conectado")).not.toBeInTheDocument();
  });
});
