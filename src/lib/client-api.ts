export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { method, cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) }); }
  catch { throw new Error(method === "GET" ? "No hay conexión con el servidor. Podés reintentar la consulta." : "No pudimos confirmar la respuesta del servidor. Conservamos el formulario; al reconectarte, revisá el historial antes de volver a guardar para evitar duplicados."); }
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "No se pudo guardar. Intentá nuevamente.");
  return result as T;
}
