import { auth } from "@/auth";
import { db } from "@/server/db";
import { questionnaireSchema } from "@/lib/questionnaire";
import { saveGoal } from "@/server/goals";
const schema = questionnaireSchema.pick({ name:true, age:true, height:true, timezone:true, calorieGoal:true, proteinGoal:true, carbGoal:true, fatGoal:true });
export async function PUT(request:Request) {
  const session=await auth(); if(!session?.user.id)return Response.json({error:"No autorizado"},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return Response.json({error:"Revisá el perfil, la zona horaria y los objetivos."},{status:400});
  const p=parsed.data; const userId=session.user.id;
  await db.$transaction(async tx=>{
    await tx.user.update({where:{id:userId},data:{name:p.name}});
    const current=await tx.profile.findUnique({where:{userId}});
    const birthDate=current?.birthDate??new Date();
    const age=Math.floor((Date.now()-birthDate.getTime())/31557600000);
    if(age!==p.age) {birthDate.setTime(Date.now());birthDate.setUTCFullYear(birthDate.getUTCFullYear()-p.age);}
    const fields={heightCm:p.height,birthDate,timezone:p.timezone,deletePhotosAfterAnalysis:true};
    await tx.profile.upsert({where:{userId},update:fields,create:{userId,...fields}});
    await saveGoal(tx,userId,p);
  });
  return Response.json({ok:true});
}
