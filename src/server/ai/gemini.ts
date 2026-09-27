import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { detectedMealSchema, type DetectedMeal } from "@/lib/validation";
import type { AIProvider } from "./provider";

const prompt = `Analizá esta foto de comida. Detectá ingredientes por separado, preparación visible, cantidad estimada y unidad. Generá preguntas solo para ambigüedades nutricionalmente relevantes como aceite, fritura, queso, mayonesa, azúcar o salsas. No calcules calorías. No inventes detalles. Respondé JSON con foods, questions y warnings. Cada food incluye name, preparation opcional, estimatedQuantity opcional, unit opcional, confidence 0-1 y needsClarification.`;

export class GeminiAIProvider implements AIProvider {
  private client: GoogleGenAI; private model: string;
  constructor() { const key = process.env.GEMINI_API_KEY; if (!key) throw new Error("GEMINI_API_KEY_MISSING"); this.client = new GoogleGenAI({ apiKey: key }); this.model = process.env.GEMINI_MODEL || "gemini-3.8-flash"; }
  async detectFood(image: { bytes: Uint8Array; mimeType: string }): Promise<DetectedMeal> {
    const response = await this.client.models.generateContent({ model: this.model, contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: image.mimeType, data: Buffer.from(image.bytes).toString("base64") } }] }], config: { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(detectedMealSchema) } });
    if (!response.text) throw new Error("AI_EMPTY_RESPONSE");
    return detectedMealSchema.parse(JSON.parse(response.text));
  }
  async estimatePortions(input: DetectedMeal) { return input; }
  async generateClarifyingQuestions(input: DetectedMeal) { return input.questions; }
  async analyzeProgress(summary: Record<string, number | string | null>) { const response = await this.client.models.generateContent({ model: this.model, contents: `Interpretá objetivamente este resumen de progreso en español rioplatense, sin culpabilizar ni recalcular valores: ${JSON.stringify(summary)}` }); return response.text || "No fue posible generar el análisis."; }
}
