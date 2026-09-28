import type { Questionnaire } from "./questionnaire";

type RecommendationInput = Pick<
  Questionnaire,
  "age" | "height" | "weight" | "sex" | "activityLevel" | "trainingDays" | "goal"
>;

export type NutritionRecommendation = {
  maintenanceCalories: number;
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
};

const activityFactors: Record<Questionnaire["activityLevel"], number> = {
  "Principalmente sentado": 1.2,
  "Algo activo": 1.375,
  "Muy activo": 1.55,
};

const goalFactors: Record<Questionnaire["goal"], number> = {
  "Perder grasa": 0.85,
  "Mantener peso": 1,
  "Ganar masa muscular": 1.1,
  "Mejorar hábitos": 1,
};

const sexAdjustment: Record<Questionnaire["sex"], number> = {
  Masculino: 5,
  Femenino: -161,
  "Prefiero no decirlo": -78,
};

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function recommendNutrition(input: Partial<RecommendationInput>): NutritionRecommendation | null {
  const { age, height, weight, sex, activityLevel, trainingDays, goal } = input;
  if (
    age == null || age < 18 || height == null || weight == null || sex == null ||
    activityLevel == null || trainingDays == null || goal == null ||
    ![age, height, weight, trainingDays].every(Number.isFinite)
  ) return null;

  // Mifflin-St Jeor estimates resting energy expenditure. The questionnaire's
  // daily activity and training frequency then provide an initial activity estimate.
  const restingCalories = 10 * weight + 6.25 * height - 5 * age + sexAdjustment[sex];
  const trainingAdjustment = Math.min(Math.max(trainingDays, 0), 6) * 0.025;
  const maintenanceCalories = roundTo(restingCalories * (activityFactors[activityLevel] + trainingAdjustment), 50);
  const calorieGoal = Math.max(1200, roundTo(maintenanceCalories * goalFactors[goal], 50));
  const proteinPerKg = trainingDays > 0 || goal === "Perder grasa" || goal === "Ganar masa muscular" ? 1.6 : 1.2;
  const proteinGoal = roundTo(weight * proteinPerKg, 5);
  const fatGoal = roundTo((calorieGoal * 0.25) / 9, 5);
  const carbGoal = Math.max(0, roundTo((calorieGoal - proteinGoal * 4 - fatGoal * 9) / 4, 5));

  return { maintenanceCalories, calorieGoal, proteinGoal, carbGoal, fatGoal };
}

export function hasCompleteGoals(input: Partial<Questionnaire>) {
  return [input.calorieGoal, input.proteinGoal, input.carbGoal, input.fatGoal]
    .every((value) => typeof value === "number" && Number.isFinite(value));
}
