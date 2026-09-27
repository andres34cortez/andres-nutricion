import { describe,it,expect } from "vitest";
import { periodSummary } from "./period-summary";
import { localDateTime,toTimestamp } from "./dates";
import { questionnaireSchema } from "./questionnaire";
import type { AppData } from "./app-types";
const data:AppData={profile:{name:"Test",age:29,height:178,timezone:"America/Argentina/San_Juan",calorieGoal:2400,proteinGoal:180,carbGoal:251,fatGoal:75},meals:[],weights:[],activities:[]};
describe("periods and dates",()=>{
 it("roundtrips a late evening in Argentina across the UTC date boundary",()=>{const iso=toTimestamp("2026-09-27T23:30",data.profile.timezone);expect(iso).toBe("2026-09-28T02:30:00.000Z");expect(localDateTime(iso,data.profile.timezone)).toBe("2026-09-27T23:30");});
 it("excludes out-of-period meals and preserves missing days",()=>{const meal={id:"1",name:"Comida",date:"2026-09-27",category:"Cena" as const,quantity:100,unit:"g",calories:2000,protein:150,carbs:200,fat:70,source:"manual" as const};const report=periodSummary({...data,meals:[meal,{...meal,id:"2",date:"2026-08-01",calories:9000}]},"2026-09-21","2026-09-27");expect(report.averageCalories).toBe(2000);expect(report.daysLogged).toBe(1);expect(report.coverage).toBe(14);});
 it("requires seven calendar days for a moving average",()=>{const report=periodSummary({...data,weights:Array.from({length:7},(_,i)=>({id:String(i),date:`2026-09-${String(1+i*2).padStart(2,"0")}`,weightKg:90}))},"2026-09-01","2026-09-14");expect(report.weightChart.every(p=>p.movingAverage===null)).toBe(true);});
 it("does not accept a malformed questionnaire or unknown timezone",()=>{expect(questionnaireSchema.safeParse({name:"A",timezone:"Mars/Example"}).success).toBe(false);});
});
