import { describe, expect, it } from "vitest";
import { detectedMealSchema } from "./validation";
describe("AI response validation", () => { it("rejects invalid confidence", () => expect(detectedMealSchema.safeParse({ foods: [{ name: "Arroz", confidence: 4, needsClarification: false }], questions: [], warnings: [] }).success).toBe(false)); });
