import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { detectedMealSchema, type DetectedMeal } from "@/lib/validation";
import type { AIProvider } from "./provider";

const prompt = `Analizá esta foto de comida o bebida. Detectá alimentos e ingredientes comestibles, preparación visible, cantidad estimada y unidad.

Reglas importantes:
- Nunca listes el recipiente como alimento: taza, vaso, plato, bowl, cubiertos y envases solo sirven para estimar tamaño.
- El nombre debe describir el contenido. Ejemplo: "Café con leche", no "Taza" ni "Taza de café".
- Para una bebida mezclada cuya proporción no pueda verse (por ejemplo café con leche), devolvela como un alimento compuesto y preguntá solo lo que cambia sus macros: tipo de leche/bebida vegetal y azúcar u otros agregados.
- Usá g o ml cuando la foto permita una estimación razonable. Usá taza o vaso únicamente si no podés estimar el volumen. En ese caso no preguntes su capacidad: la aplicación lo hará con tamaños estandarizados.
- Separá ingredientes cuando sean visibles y nutricionalmente relevantes. No separes agua ni componentes despreciables.
- Generá preguntas solo para ambigüedades relevantes como aceite, fritura, queso, mayonesa, azúcar, salsas, tipo de leche o tamaño del recipiente.
- No calcules calorías ni inventes ingredientes.

Respondé JSON con foods, questions y warnings. Cada food incluye name, preparation opcional, estimatedQuantity opcional, unit opcional, confidence 0-1 y needsClarification.`;

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
    const configuredFallbacks = process.env.GEMINI_FALLBACK_MODELS
      ?.split(",")
      .map((model) => model.trim())
      .filter(Boolean);
    const fallbackModels = configuredFallbacks?.length
      ? configuredFallbacks
      : process.env.GEMINI_FALLBACK_MODEL
        ? [process.env.GEMINI_FALLBACK_MODEL]
        : ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
    this.models = [...new Set([
      process.env.GEMINI_MODEL || "gemini-3.8-flash",
      ...fallbackModels,
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
