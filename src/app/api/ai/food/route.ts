import { auth } from "@/auth";
import { getAIProvider } from "@/server/ai";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]); const max = 8 * 1024 * 1024;
export async function POST(request: Request) {
  const session = await auth(); if (!session?.user.id) return Response.json({ error: "No autorizado" }, { status: 401 });
  const form = await request.formData(); const file = form.get("image");
  if (!(file instanceof File)) return Response.json({ error: "Falta la imagen" }, { status: 400 });
  if (!allowed.has(file.type) || file.size > max) return Response.json({ error: "Formato inválido o archivo mayor a 8 MB" }, { status: 415 });
  try { const result = await getAIProvider().detectFood({ bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type }); return Response.json(result, { headers: { "Cache-Control": "no-store, private" } }); }
  catch (error) { const missingKey = error instanceof Error && error.message === "GEMINI_API_KEY_MISSING"; console.error("Food analysis failed", { code: missingKey ? "GEMINI_API_KEY_MISSING" : "AI_ERROR" }); return Response.json({ error: missingKey ? "El análisis por foto no está configurado." : "No pudimos analizar la imagen. Podés reintentar o registrar manualmente." }, { status: 503 }); }
}
