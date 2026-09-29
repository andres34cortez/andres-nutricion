import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { detectedMealSchema, type DetectedMeal } from "@/lib/validation";
import type { AIProvider } from "./provider";

const prompt = `Analizá esta foto de comida. Detectá ingredientes por separado, preparación visible, cantidad estimada y unidad. Generá preguntas solo para ambigüedades nutricionalmente relevantes como aceite, fritura, queso, mayonesa, azúcar o salsas. No calcules calorías. No inventes detalles. Respondé JSON con foods, questions y warnings. Cada food incluye name, preparation opcional, estimatedQuantity opcional, unit opcional, confidence 0-1 y needsClarification.`;

export type GeminiErrorCode = "GEMINI_API_KEY_MISSING" | "AI_TEMPORARILY_UNAVAILABLE" | "AI_RATE_LIMITED" | "AI_AUTH_ERROR" | "AI_MODEL_ERROR" | "AI_INVALID_RESPONSE" | "AI_ERROR";

export class GeminiRequestError extends Error {
  constructor(public readonly code: GeminiErrorCode, public readonly status?: number) {
    super(code);
    this.name = "GeminiRequestError";
  }
}

function providerStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : undefined;
}

function normalizeProviderError(error: unknown) {
  if (error instanceof GeminiRequestError) return error;
  if (error instanceof SyntaxError || error instanceof z.ZodError) return new GeminiRequestError("AI_INVALID_RESPONSE");
  const status = providerStatus(error);
  if (status === 429) return new GeminiRequestError("AI_RATE_LIMITED", status);
  if (status !== undefined && status >= 500) return new GeminiRequestError("AI_TEMPORARILY_UNAVAILABLE", status);
  if (status === 401 || status === 403) return new GeminiRequestError("AI_AUTH_ERROR", status);
  if (status === 404) return new GeminiRequestError("AI_MODEL_ERROR", status);
  return new GeminiRequestError("AI_ERROR", status);
}

function isTemporary(error: unknown) {
  const status = providerStatus(error);
  return status === 429 || (status !== undefined && status >= 500);
}

export class GeminiAIProvider implements AIProvider {
  private client: GoogleGenAI; private models: string[];
  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new GeminiRequestError("GEMINI_API_KEY_MISSING");
    this.client = new GoogleGenAI({ apiKey: key });
    this.models = [...new Set([
      process.env.GEMINI_MODEL || "gemini-3.8-flash",
      process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash",
    ])];
  }

  private async withFallback<T>(run: (model: string) => Promise<T>) {
    let lastError: unknown;
    for (const [index, model] of this.models.entries()) {
      try {
        return await run(model);
      } catch (error) {
        lastError = error;
        if (!isTemporary(error) || index === this.models.length - 1) break;
      }
    }
    throw normalizeProviderError(lastError);
  }

  async detectFood(image: { bytes: Uint8Array; mimeType: string }): Promise<DetectedMeal> {
    const response = await this.withFallback((model) => this.client.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: image.mimeType, data: Buffer.from(image.bytes).toString("base64") } }] }], config: { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(detectedMealSchema) } }));
    if (!response.text) throw new GeminiRequestError("AI_INVALID_RESPONSE");
    try {
      return detectedMealSchema.parse(JSON.parse(response.text));
    } catch (error) {
      throw normalizeProviderError(error);
    }
  }
  async estimatePortions(input: DetectedMeal) { return input; }
  async generateClarifyingQuestions(input: DetectedMeal) { return input.questions; }
  async analyzeProgress(summary: Record<string, number | string | null>) { const response = await this.withFallback((model) => this.client.models.generateContent({ model, contents: `Interpretá objetivamente este resumen de progreso en español rioplatense, sin culpabilizar ni recalcular valores: ${JSON.stringify(summary)}` })); return response.text || "No fue posible generar el análisis."; }
}
