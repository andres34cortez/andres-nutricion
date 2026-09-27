import type { AppData } from "./app-types";
import { dateKeyInTimeZone } from "./reports";
export function shiftDate(date:string,days:number) { const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10); }
export function periodSummary(data:AppData,start:string,end:string) {
  const totalDays=Math.round((new Date(`${end}T12:00:00Z`).getTime()-new Date(`${start}T12:00:00Z`).getTime())/86400000)+1;
  const dates=Array.from({length:Math.max(0,totalDays)},(_,i)=>shiftDate(start,i));
  const daily=dates.map(date=>{
    const meals=data.meals.filter(m=>m.date===date);
    const goal=data.goals?.find(g=>dateKeyInTimeZone(new Date(g.validFrom),data.profile.timezone)<=date&&(!g.validUntil||dateKeyInTimeZone(new Date(g.validUntil),data.profile.timezone)>=date));
    return {date,logged:meals.length>0,calories:meals.reduce((s,m)=>s+m.calories,0),protein:meals.reduce((s,m)=>s+m.protein,0),carbs:meals.reduce((s,m)=>s+m.carbs,0),fat:meals.reduce((s,m)=>s+m.fat,0),calorieGoal:goal?.calories??null};
  });
  const logged=daily.filter(d=>d.logged); const weights=data.weights.filter(w=>w.date>=start&&w.date<=end).sort((a,b)=>(a.timestamp??a.date).localeCompare(b.timestamp??b.date)); const activities=data.activities.filter(a=>a.date>=start&&a.date<=end);
  const mean=(key:"calories"|"protein"|"carbs"|"fat")=>logged.length?Math.round(logged.reduce((s,d)=>s+d[key],0)/logged.length):null;
  const dailyWeights=dates.map(date=>{const points=weights.filter(w=>w.date===date);return {date,weightKg:points.length?points.reduce((s,w)=>s+w.weightKg,0)/points.length:null};});
  const weightChart=dailyWeights.map((point,i)=>{const window=dailyWeights.slice(Math.max(0,i-6),i+1);return {...point,movingAverage:window.length===7&&window.every(w=>w.weightKg!==null)?Number((window.reduce((s,w)=>s+w.weightKg!,0)/7).toFixed(1)):null};});
  return {start,end,totalDays,daysLogged:logged.length,coverage:totalDays?Math.round(logged.length/totalDays*100):0,averageCalories:mean("calories"),averageProtein:mean("protein"),averageCarbs:mean("carbs"),averageFat:mean("fat"),startWeight:weights[0]?.weightKg??null,endWeight:weights.at(-1)?.weightKg??null,weightChange:weights.length>1?Number((weights.at(-1)!.weightKg-weights[0].weightKg).toFixed(1)):null,trainingSessions:activities.filter(a=>a.type==="Gym"||a.type==="CrossFit").length,activeMinutes:activities.reduce((s,a)=>s+a.duration,0),daily,weightChart};
}
