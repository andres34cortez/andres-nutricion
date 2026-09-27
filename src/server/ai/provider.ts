import type { DetectedMeal } from "@/lib/validation";

export interface AIProvider {
  detectFood(image: { bytes: Uint8Array; mimeType: string }): Promise<DetectedMeal>;
  estimatePortions(input: DetectedMeal): Promise<DetectedMeal>;
  generateClarifyingQuestions(input: DetectedMeal): Promise<DetectedMeal["questions"]>;
  analyzeProgress(summary: Record<string, number | string | null>): Promise<string>;
}
