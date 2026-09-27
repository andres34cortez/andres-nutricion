import { auth } from "@/auth";
import { getAIProvider } from "@/server/ai";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]); const max = 8 * 1024 * 1024;
export async function POST(request: Request) {
  const session = await auth(); if (!session?.user.id) return Response.json({ error: "No autorizado" }, { status: 401 });
  const form = await request.formData(); const file = form.get("image");
  if (!(file instanceof File)) return Response.json({ error: "Falta la imagen" }, { status: 400 });
  if (!allowed.has(file.type) || file.size > max) return Response.json({ error: "Formato inválido o archivo mayor a 8 MB" }, { status: 415 });
  try { const result = await getAIProvider().detectFood({ bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type }); return Response.json(result); }
  catch (error) { const code = error instanceof Error ? error.message : "AI_ERROR"; console.error("Food analysis failed", { code, userId: session.user.id }); return Response.json({ error: code === "GEMINI_API_KEY_MISSING" ? "El análisis por foto no está configurado." : "No pudimos analizar la imagen. Podés reintentar o registrar manualmente." }, { status: 503 }); }
}
