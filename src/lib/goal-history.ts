import type { Goal } from "./app-types";
import { carbsFromRemainingCalories, type Nutrition } from "./nutrition";
import { dateKeyInTimeZone } from "./reports";

/** Daily reports use the last goal in force during that local day.
 * Validity intervals are [validFrom, validUntil); today's future changes do not apply yet.
 */
export function goalForDay(goals: Goal[], day: string, timezone: string, now = new Date()): Nutrition | null {
  const today = dateKeyInTimeZone(now, timezone);
  if (day > today) return null;
  const applicable = goals.filter(goal => {
    const start = new Date(goal.validFrom);
    const end = goal.validUntil ? new Date(goal.validUntil) : null;
    if (!Number.isFinite(start.getTime()) || (end && (!Number.isFinite(end.getTime()) || end <= start))) return false;
    if (day === today && start > now) return false;
    return dateKeyInTimeZone(start, timezone) <= day && (!end || dateKeyInTimeZone(new Date(end.getTime() - 1), timezone) >= day);
  }).sort((a, b) => Date.parse(b.validFrom) - Date.parse(a.validFrom));
  const goal = applicable[0];
  return goal ? { calories: goal.calories, protein: goal.protein, carbs: goal.carbs ?? carbsFromRemainingCalories(goal.calories, goal.protein, goal.fat), fat: goal.fat } : null;
}
