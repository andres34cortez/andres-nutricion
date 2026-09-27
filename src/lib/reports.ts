import type { Nutrition } from "./nutrition";

export type DailyNutrition = Nutrition & { date: string };
export type WeightPoint = { date: string; weightKg: number };

export function averageLoggedDays(days: DailyNutrition[], totalDays: number) {
  if (!days.length) return { averages: null, daysLogged: 0, totalDays, coverage: 0 };
  const divisor = days.length;
  const sum = days.reduce((a, d) => ({ calories: a.calories + d.calories, protein: a.protein + d.protein, carbs: a.carbs + d.carbs, fat: a.fat + d.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  return { averages: { calories: Math.round(sum.calories / divisor), protein: one(sum.protein / divisor), carbs: one(sum.carbs / divisor), fat: one(sum.fat / divisor) }, daysLogged: divisor, totalDays, coverage: Math.round((divisor / totalDays) * 100) };
}

export function movingAverage7(points: WeightPoint[]) {
  return points.map((point, index) => {
    const window = points.slice(Math.max(0, index - 6), index + 1);
    return { ...point, movingAverage: window.length === 7 ? one(window.reduce((sum, item) => sum + item.weightKg, 0) / 7) : null };
  });
}

export function weightTrend(points: WeightPoint[]) {
  if (!points.length) return null;
  const ordered = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return { start: ordered[0].weightKg, end: ordered.at(-1)!.weightKg, change: one(ordered.at(-1)!.weightKg - ordered[0].weightKg), average: one(ordered.reduce((sum, item) => sum + item.weightKg, 0) / ordered.length) };
}

export type HistoricalGoal = { validFrom: Date; validUntil: Date | null; calories: number; protein: number; fat: number };
export function goalForDate(goals: HistoricalGoal[], date: Date) {
  return goals.find((goal) => goal.validFrom <= date && (!goal.validUntil || goal.validUntil >= date)) ?? null;
}

export function dateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

const one = (value: number) => Math.round(value * 10) / 10;
