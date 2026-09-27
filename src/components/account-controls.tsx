"use client";
import { signIn, signOut } from "next-auth/react";

export function AccountControls({ cloud, googleEnabled }: { cloud: boolean; googleEnabled: boolean }) {
  return (
    <section className="section" style={{ marginTop: 24 }}>
      <h2>Mi cuenta</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cloud ? (
          <>
            <a className="primary-button" href="/onboarding" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
              Editar datos / repetir cuestionario
            </a>
            <p className="subtle" style={{ margin: "2px 0 8px" }}>
              Tus respuestas actuales estarán precargadas. Los registros anteriores se conservan.
            </p>
            {googleEnabled && (
              <button
                type="button"
                style={{
                  width: "100%",
                  minHeight: 48,
                  borderRadius: 14,
                  border: "1px solid var(--line)",
                  background: "var(--card)",
                  color: "var(--ink)",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
                onClick={() => void signIn("google", { callbackUrl: "/" })}
              >
                Vincular mi cuenta de Google
              </button>
            )}
            <button
              type="button"
              style={{
                width: "100%",
                minHeight: 48,
                borderRadius: 14,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                marginTop: 4,
              }}
              onClick={() => void signOut({ callbackUrl: "/sign-in" })}
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <a className="primary-button" href="/sign-in" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            Iniciar sesión
          </a>
        )}
      </div>
    </section>
  );
}

