"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function GoogleSignInButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function openGoogle() {
    setBusy(true);
    setError(false);

    try {
      await signIn("google", { redirectTo: "/" });
    } catch {
      setBusy(false);
      setError(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="primary-button"
        disabled={busy}
        onClick={() => void openGoogle()}
      >
        {busy ? "Abriendo Google…" : "Continuar con Google"}
      </button>
      {error && <p role="alert">No pudimos abrir Google. Intentá nuevamente.</p>}
    </div>
  );
}
