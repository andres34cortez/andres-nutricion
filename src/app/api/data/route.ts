import { auth } from "@/auth";
import { getAppData } from "@/server/app-data";
export async function GET() {
  const session = await auth(); if (!session?.user.id) return Response.json({ error: "No autorizado" }, { status: 401 });
  return Response.json(await getAppData(session.user.id), { headers: { "Cache-Control": "no-store, private" } });
}
