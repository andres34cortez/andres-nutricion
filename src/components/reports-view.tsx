"use client";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AppData } from "@/lib/app-types";
import { dateKeyInTimeZone } from "@/lib/reports";
import { periodSummary } from "@/lib/period-summary";
import { resolveReportPeriod, moveReportAnchor, type ReportPeriod } from "@/lib/report-period";
import { api } from "@/lib/client-api";

export function ReportsView({ data, cloud }: { data: AppData; cloud: boolean }) {
  const today = dateKeyInTimeZone(new Date(), data.profile.timezone);
  const [mode, setMode] = useState<ReportPeriod>("week");
  const [anchor, setAnchor] = useState<string>(today);
  const [analysis, setAnalysis] = useState("");
  const [busy, setBusy] = useState(false);

  const resolved = resolveReportPeriod(mode, anchor, today);
  const report = periodSummary(data, resolved.start, resolved.end);
  const previous = periodSummary(data, resolved.previousStart, resolved.previousEnd);

  const periodLabel = (() => {
    if (mode === "week") {
      return `Semana: ${resolved.start} a ${resolved.calendarEnd}`;
    }
    if (mode === "month") {
      return `Mes: ${resolved.start.slice(0, 7)}`;
    }
    return `${resolved.start} a ${resolved.end}`;
  })();

  const canGoNext = resolved.calendarEnd < today && anchor < today;

  return (
    <>
      <div className="filter-row">
        <select
          aria-label="Período"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as ReportPeriod);
            setAnalysis("");
          }}
          style={{ height: 38, borderRadius: 999, padding: "0 12px", border: "1px solid var(--line)", background: "var(--card)", fontSize: 12, fontWeight: 700, color: "var(--ink)" }}
        >
          <option value="week">Semana</option>
          <option value="month">Mes</option>
          <option value="7d">7d</option>
          <option value="30d">30d</option>
          <option value="90d">90d</option>
        </select>
        {[
          ["week", "Semana"],
          ["month", "Mes"],
          ["7d", "7 días"],
          ["30d", "30 días"],
          ["90d", "3 meses"],
        ].map(([m, label]) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => {
              setMode(m as ReportPeriod);
              setAnalysis("");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="field" style={{ marginBottom: 14 }}>
        <span>Fecha de referencia</span>
        <input
          type="date"
          value={anchor}
          onChange={(e) => {
            setAnchor(e.target.value);
            setAnalysis("");
          }}
        />
      </label>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
        <button
          className="month-row-btn"
          style={{ border: "1px solid var(--line)", background: "var(--card)", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700 }}
          onClick={() => {
            setAnchor(moveReportAnchor(mode, anchor, -1));
            setAnalysis("");
          }}
          aria-label="Período anterior"
        >
          ← Anterior
        </button>

        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>Período seleccionado</h2>
          <strong style={{ fontSize: 13, display: "block", color: "var(--muted)" }}>{periodLabel}</strong>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>{resolved.start} — {resolved.end}</p>
          {resolved.isPartial && (
            <small style={{ fontSize: 11, color: "var(--muted)" }}>
              En curso ({report.daysLogged}/{report.totalDays} días hasta hoy)
            </small>
          )}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {anchor !== today && (
            <button
              style={{ border: "1px solid var(--line)", background: "var(--card)", borderRadius: 10, padding: "8px 10px", fontSize: 12, fontWeight: 700 }}
              onClick={() => {
                setAnchor(today);
                setAnalysis("");
              }}
            >
              Hoy
            </button>
          )}
          <button
            style={{ border: "1px solid var(--line)", background: "var(--card)", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, opacity: canGoNext ? 1 : 0.4 }}
            disabled={!canGoNext}
            onClick={() => {
              if (canGoNext) {
                setAnchor(moveReportAnchor(mode, anchor, 1));
                setAnalysis("");
              }
            }}
            aria-label="Período siguiente"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <div className="summary-grid">
        {[
          ["Calorías promedio", report.averageCalories ? `${report.averageCalories} kcal` : "Sin datos"],
          ["Proteína promedio", report.averageProtein === null ? "Sin datos" : `${report.averageProtein} g`],
          ["Cobertura", `${report.daysLogged} / ${report.totalDays} días (${report.coverage}%)`],
          ["Entrenamientos", report.trainingSessions],
          ["Minutos activos", `${report.activeMinutes} min`],
          ["Cambio de peso", report.weightChange === null ? "Faltan registros" : `${report.weightChange > 0 ? "+" : ""}${report.weightChange} kg`],
        ].map(([label, value]) => (
          <section className="mini" key={label} role="region" aria-label={String(label)}>
            <p>{label}</p>
            <strong>{value}</strong>
          </section>
        ))}
      </div>

      <p className="subtle" style={{ marginBottom: 14 }} role="region" aria-label="Período anterior">
        Período anterior ({resolved.previousStart} — {resolved.previousEnd}): {previous.daysLogged}/{previous.totalDays} días registrados · {previous.averageCalories ? `${previous.averageCalories} kcal` : "Sin datos"}{previous.averageProtein !== null ? ` · ${previous.averageProtein} g proteína` : ""}.
      </p>

      <section className="chart-card">
        <h3>Calorías y objetivos históricos</h3>
        <div style={{ width: "100%", height: 220, minWidth: 0, overflow: "hidden" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.daily.map((d) => ({ ...d, calories: d.logged ? d.calories : null }))}>
              <CartesianGrid stroke="#dce3de" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Area dataKey="calories" name="Calorías" stroke="#168063" fill="#c8ed68" connectNulls={false} />
              <Area dataKey="calorieGoal" name="Objetivo vigente" stroke="#e2a23b" fill="transparent" connectNulls={true} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="chart-card">
        <h3>Peso y promedio de 7 días</h3>
        <div style={{ width: "100%", height: 220, minWidth: 0, overflow: "hidden" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.weightChart}>
              <XAxis dataKey="date" hide />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip />
              <Area dataKey="weightKg" name="Peso" stroke="#168063" fill="#dff1ad" connectNulls={false} />
              <Area dataKey="movingAverage" name="Media móvil" stroke="#d97706" fill="transparent" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {cloud && (
        <section className="section">
          <button
            disabled={busy || !report.daysLogged}
            className="primary-button"
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api<{ text: string }>("/api/ai/progress", "POST", { start: resolved.start, end: resolved.end });
                setAnalysis(result.text);
              } catch (e) {
                setAnalysis(e instanceof Error ? e.message : "No se pudo analizar.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Analizando…" : "Analizar este período con IA"}
          </button>
          <p style={{ whiteSpace: "pre-wrap" }} role="status">
            {analysis}
          </p>
        </section>
      )}
    </>
  );
}

