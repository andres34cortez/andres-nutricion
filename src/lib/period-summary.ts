import type { AppData } from "./app-types";
import { goalForDay } from "./goal-history";
import { dayCount, shiftDate } from "./report-period";

export { shiftDate } from "./report-period";

export function periodSummary(data: AppData, start: string, end: string, now = new Date()) {
  const totalDays = dayCount(start, end);
  if (totalDays > 366) throw new Error("Elegí un período de hasta 366 días.");
  const dates = Array.from({ length: totalDays }, (_, i) => shiftDate(start, i));
  const daily = dates.map(date => {
    const meals = data.meals.filter(meal => meal.date === date);
    const goal = goalForDay(data.goals ?? [], date, data.profile.timezone, now);
    return {
      date, logged: meals.length > 0,
      calories: meals.reduce((sum, meal) => sum + meal.calories, 0),
      protein: meals.reduce((sum, meal) => sum + meal.protein, 0),
      carbs: meals.reduce((sum, meal) => sum + meal.carbs, 0),
      fat: meals.reduce((sum, meal) => sum + meal.fat, 0),
      calorieGoal: goal?.calories ?? null,
      proteinGoal: goal?.protein ?? null,
      carbGoal: goal?.carbs ?? null,
      fatGoal: goal?.fat ?? null,
    };
  });
  const logged = daily.filter(day => day.logged);
  const activities = data.activities.filter(activity => activity.date >= start && activity.date <= end);
  const mean = (key: "calories" | "protein" | "carbs" | "fat") => logged.length ? Math.round(logged.reduce((sum, day) => sum + day[key], 0) / logged.length) : null;

  // Include six preceding days for the first visible moving average, not in period statistics.
  const weightStart = shiftDate(start, -6);
  const weights = data.weights.filter(weight => weight.date >= weightStart && weight.date <= end);
  const dailyWeights = Array.from({ length: totalDays + 6 }, (_, i) => {
    const date = shiftDate(weightStart, i);
    const points = weights.filter(weight => weight.date === date);
    return { date, weightKg: points.length ? points.reduce((sum, weight) => sum + weight.weightKg, 0) / points.length : null };
  });
  const weightChart = dailyWeights.map((point, i) => {
    const window = dailyWeights.slice(Math.max(0, i - 6), i + 1);
    return { ...point, movingAverage: window.length === 7 && window.every(weight => weight.weightKg !== null) ? Number((window.reduce((sum, weight) => sum + weight.weightKg!, 0) / 7).toFixed(1)) : null };
  }).slice(6);
  const measuredDays = weightChart.filter((point): point is typeof point & { weightKg: number } => point.weightKg !== null);
  const startWeight = measuredDays[0]?.weightKg ?? null;
  const endWeight = measuredDays.at(-1)?.weightKg ?? null;
  return {
    start, end, totalDays, daysLogged: logged.length, coverage: Math.round(logged.length / totalDays * 100),
    averageCalories: mean("calories"), averageProtein: mean("protein"), averageCarbs: mean("carbs"), averageFat: mean("fat"),
    startWeight, endWeight,
    weightChange: measuredDays.length > 1 ? Number((endWeight! - startWeight!).toFixed(1)) : null,
    trainingSessions: activities.filter(activity => activity.type === "Gym" || activity.type === "CrossFit").length,
    activeMinutes: activities.reduce((sum, activity) => sum + activity.duration, 0),
    daily, weightChart,
  };
}
