import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
const schema = z.object({ weightKg: z.number().min(30).max(300) });
export async function POST(request: Request) { const session=await auth(); if(!session?.user.id)return Response.json({error:"No autorizado"},{status:401}); const parsed=schema.safeParse(await request.json()); if(!parsed.success)return Response.json({error:"Peso inválido"},{status:400}); const entry=await db.weightEntry.create({data:{userId:session.user.id,weightKg:parsed.data.weightKg,recordedAt:new Date()}}); return Response.json(entry,{status:201}); }
