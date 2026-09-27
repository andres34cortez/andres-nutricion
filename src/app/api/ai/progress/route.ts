import { auth } from "@/auth";
import { getAppData } from "@/server/app-data";
import { periodSummary } from "@/lib/period-summary";
import { getAIProvider } from "@/server/ai";
import { z } from "zod";
const schema=z.object({start:z.string().date(),end:z.string().date()}).refine(v=>v.start<=v.end&&(Date.parse(v.end)-Date.parse(v.start))<=366*86400000);
export async function POST(request:Request) {
  const session=await auth();if(!session?.user.id)return Response.json({error:"No autorizado"},{status:401});
  const p=schema.safeParse(await request.json().catch(()=>null));if(!p.success)return Response.json({error:"Período inválido"},{status:400});
  const report=periodSummary(await getAppData(session.user.id),p.data.start,p.data.end);
  const {daily,weightChart,...summary}=report;void daily;void weightChart;
  try{return Response.json({text:await getAIProvider().analyzeProgress(summary)},{headers:{"Cache-Control":"no-store, private"}});}catch{return Response.json({error:"La IA no está disponible. Las estadísticas siguen disponibles."},{status:503});}
}
