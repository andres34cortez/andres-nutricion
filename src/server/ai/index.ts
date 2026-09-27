import type { AIProvider } from "./provider";
import { GeminiAIProvider } from "./gemini";
export function getAIProvider(): AIProvider { const provider = process.env.AI_PROVIDER || "gemini"; if (provider === "gemini") return new GeminiAIProvider(); throw new Error("AI_PROVIDER_UNSUPPORTED"); }
