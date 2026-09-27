"use client";

import { useId } from "react";

export function HeightField({ value, onChange, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return <fieldset className="editor-item" disabled={disabled}>
    <legend>¿Cuánto medís?</legend>
    <label className="field" htmlFor={id}><span>Altura (cm)</span>
      <input id={id} name="height" type="number" inputMode="decimal" required min="100" max="250" step="0.1" placeholder="Ej. 175" value={value} onChange={event => onChange(event.target.value)} aria-describedby={`${id}-hint`} />
    </label>
    <p id={`${id}-hint`} className="subtle">Ingresá tu altura en centímetros. Si medís 1,75 m, escribí 175. Podés cambiarla desde Perfil.</p>
  </fieldset>;
}
