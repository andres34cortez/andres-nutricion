// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleSignInButton } from "./google-sign-in-button";

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("next-auth/react", () => ({ signIn }));

describe("GoogleSignInButton", () => {
  beforeEach(() => signIn.mockReset());

  it("opens Google without submitting or validating the local form", () => {
    signIn.mockResolvedValue(undefined);
    render(<GoogleSignInButton />);

    const button = screen.getByRole("button", { name: "Continuar con Google" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.closest("form")).toBeNull();

    fireEvent.click(button);
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/" });
  });
});
