import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";
const schema=z.object({type:z.enum(["Gym","CrossFit","Caminata","Otro"]),duration:z.number().int().positive().max(1440),detail:z.string().max(500).optional()});
const types={Gym:"GYM",CrossFit:"CROSSFIT",Caminata:"WALK",Otro:"OTHER"} as const;
export async function POST(request:Request){const session=await auth();if(!session?.user.id)return Response.json({error:"No autorizado"},{status:401});const parsed=schema.safeParse(await request.json());if(!parsed.success)return Response.json({error:"Actividad inválida"},{status:400});const entry=await db.activity.create({data:{userId:session.user.id,type:types[parsed.data.type],occurredAt:new Date(),durationMinutes:parsed.data.duration,notes:parsed.data.detail}});return Response.json(entry,{status:201})}
