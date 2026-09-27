export type ReportPeriod = "week" | "month" | "7d" | "30d" | "90d";

const DAY_MS = 86_400_000;
const ROLLING_DAYS = { "7d": 7, "30d": 30, "90d": 90 } as const;

/** A calendar date already converted to the user's timezone, not a timestamp. */
export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseDate(value: string): Date {
  if (!isDateKey(value)) throw new RangeError("La fecha debe ser válida y tener formato AAAA-MM-DD.");
  return new Date(`${value}T00:00:00.000Z`);
}

function dateKey(value: Date): string {
  if (!Number.isFinite(value.getTime())) throw new RangeError("La fecha está fuera del rango permitido.");
  const result = value.toISOString().slice(0, 10);
  if (!isDateKey(result)) throw new RangeError("La fecha está fuera del rango permitido.");
  return result;
}

export function shiftDate(date: string, days: number): string {
  if (!Number.isSafeInteger(days)) throw new RangeError("La cantidad de días debe ser un entero.");
  const result = parseDate(date);
  // UTC is used only for arithmetic on calendar keys, avoiding browser timezone/DST changes.
  result.setUTCDate(result.getUTCDate() + days);
  return dateKey(result);
}

export function dayCount(start: string, end: string): number {
  const count = (parseDate(end).getTime() - parseDate(start).getTime()) / DAY_MS + 1;
  if (count < 1) throw new RangeError("La fecha final no puede ser anterior a la inicial.");
  return count;
}

function weekStart(anchor: string): string {
  const weekday = parseDate(anchor).getUTCDay();
  return shiftDate(anchor, -((weekday + 6) % 7));
}

function monthStart(anchor: string, offset = 0): string {
  const result = parseDate(anchor);
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + offset);
  return dateKey(result);
}

function rollingDays(mode: ReportPeriod): number {
  if (mode !== "7d" && mode !== "30d" && mode !== "90d") {
    throw new RangeError("El período seleccionado no es válido.");
  }
  return ROLLING_DAYS[mode];
}

export function resolveReportPeriod(mode: ReportPeriod, anchor: string, today: string) {
  parseDate(anchor);
  parseDate(today);
  const effectiveAnchor = anchor > today ? today : anchor;

  if (mode !== "week" && mode !== "month") {
    const days = rollingDays(mode);
    const end = effectiveAnchor;
    const start = shiftDate(end, 1 - days);
    return {
      start,
      end,
      calendarEnd: end,
      previousStart: shiftDate(start, -days),
      previousEnd: shiftDate(start, -1),
      isPartial: false,
    };
  }

  const start = mode === "week" ? weekStart(effectiveAnchor) : monthStart(effectiveAnchor);
  const calendarEnd = mode === "week" ? shiftDate(start, 6) : shiftDate(monthStart(start, 1), -1);
  const end = calendarEnd > today ? today : calendarEnd;
  const isPartial = end < calendarEnd;
  const previousStart = mode === "week" ? shiftDate(start, -7) : monthStart(start, -1);
  const previousCalendarEnd = shiftDate(start, -1);
  // Complete months compare against the complete previous month, even with different lengths.
  // A current, incomplete period compares only the same elapsed days (capped at prior month end).
  const comparableEnd = isPartial ? shiftDate(previousStart, dayCount(start, end) - 1) : previousCalendarEnd;
  const previousEnd = comparableEnd > previousCalendarEnd ? previousCalendarEnd : comparableEnd;

  return { start, end, calendarEnd, previousStart, previousEnd, isPartial };
}

export function moveReportAnchor(mode: ReportPeriod, anchor: string, direction: -1 | 1): string {
  parseDate(anchor);
  if (direction !== -1 && direction !== 1) throw new RangeError("La dirección no es válida.");
  if (mode === "week") return shiftDate(weekStart(anchor), direction * 7);
  if (mode === "month") return monthStart(anchor, direction);
  return shiftDate(anchor, direction * rollingDays(mode));
}
