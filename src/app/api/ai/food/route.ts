import { auth } from "@/auth";
import { getAIProvider } from "@/server/ai";
import { GeminiRequestError } from "@/server/ai/gemini";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
// Keep the multipart request safely below Vercel's function body limit.
const max = 3 * 1024 * 1024;

function publicAIError(error: unknown) {
  const code = error instanceof GeminiRequestError ? error.code : "AI_ERROR";
  if (code === "GEMINI_API_KEY_MISSING" || code === "AI_AUTH_ERROR") {
    return { status: 503, code, error: "El análisis por foto no está configurado correctamente." };
  }
  if (code === "AI_TEMPORARILY_UNAVAILABLE" || code === "AI_RATE_LIMITED") {
    return { status: 503, code, error: "Gemini está con alta demanda en este momento. Esperá unos segundos y reintentá." };
  }
  if (code === "AI_INVALID_RESPONSE") {
    return { status: 502, code, error: "Gemini no pudo interpretar esta foto. Podés reintentar o elegir otra imagen." };
  }
  return { status: 503, code, error: "No pudimos analizar la imagen. Podés reintentar o registrar manualmente." };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user.id) return Response.json({ error: "No autorizado", code: "UNAUTHORIZED" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "No pudimos leer la foto enviada.", code: "INVALID_FORM" }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) return Response.json({ error: "Falta la imagen", code: "IMAGE_MISSING" }, { status: 400 });
  if (!allowed.has(file.type)) return Response.json({ error: "Formato de imagen no compatible.", code: "IMAGE_TYPE" }, { status: 415 });
  if (file.size > max) return Response.json({ error: "La foto es demasiado pesada para enviarla.", code: "IMAGE_TOO_LARGE" }, { status: 413 });

  try {
    const result = await getAIProvider().detectFood({ bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type });
    return Response.json(result, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const response = publicAIError(error);
    // Privacy: log only a stable error code, never the image, prompt, user or API key.
    console.error("Food analysis failed", { code: response.code });
    return Response.json({ error: response.error, code: response.code }, { status: response.status });
  }
}
