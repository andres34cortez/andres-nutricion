"use client";
import { signIn, signOut } from "next-auth/react";
export function AccountControls({ googleEnabled }: { googleEnabled: boolean }) {
  return <section className="section"><h2>Mi cuenta</h2><a className="primary-button" href="/onboarding">Editar datos / repetir cuestionario</a><p className="subtle">Tus respuestas actuales estarán precargadas. Los registros anteriores se conservan.</p>{googleEnabled && <button onClick={() => void signIn("google", { callbackUrl: "/" })}>Vincular mi cuenta de Google</button>}<button onClick={() => void signOut({ callbackUrl: "/sign-in" })}>Cerrar sesión</button></section>;
}
