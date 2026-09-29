"use client";
import { useEffect, useState } from "react";
import { Home, History, Plus, TrendingUp, UserRound, X } from "lucide-react";
import type { AppData, MealEntry } from "@/lib/app-types";
import type { RecordInput } from "@/lib/record-validation";
import { createDemoData } from "@/lib/demo-data";
import { goalForDay } from "@/lib/goal-history";
import { dateKeyInTimeZone } from "@/lib/reports";
import { calculateMealNutrition } from "@/lib/nutrition";
import { api } from "@/lib/client-api";
import { RecordEditor, blankItem } from "./record-editor";
import { FoodScanner } from "./food-scanner";
import { Library } from "./library";
import { ReportsView } from "./reports-view";
import { ProfileView } from "./profile-view";

type Tab = "Hoy" | "Historial" | "Progreso" | "Perfil";
type Composer = "menu" | "meal" | "weight" | "activity" | "photo" | "library" | null;
const storageKey = "nutricion-andres-v1";
const fmt = new Intl.NumberFormat("es-AR");

export function NutritionApp({ initialData, cloud = false, googleEnabled = false }: { initialData?: AppData; cloud?: boolean; googleEnabled?: boolean }) {
  const [data, setData] = useState(initialData ?? createDemoData);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("Hoy");
  const [composer, setComposer] = useState<Composer>(null);
  const [editing, setEditing] = useState<{ id?: string; input: RecordInput } | null>(null);
  const [notice, setNotice] = useState("");
  const [refreshNeeded, setRefreshNeeded] = useState(false);
  const [selected, setSelected] = useState(() => dateKeyInTimeZone(new Date(), data.profile.timezone));
  useEffect(() => {
    const timer = window.setTimeout(() => { if (!cloud) { try { const saved = localStorage.getItem(storageKey) ?? localStorage.getItem("andres-nutricion-v1"); if (saved) setData(JSON.parse(saved)); } catch { /* keep initial data */ } } setReady(true); }, 0);
    return () => window.clearTimeout(timer);
  }, [cloud]);
  useEffect(() => { if (ready && !cloud) localStorage.setItem(storageKey, JSON.stringify(data)); }, [ready, cloud, data]);
  const today = dateKeyInTimeZone(new Date(), data.profile.timezone);
  const day = tab === "Hoy" ? today : selected;
  const meals = data.meals.filter(m => m.date === day);
  const total = calculateMealNutrition(meals);
  const activeGoal = goalForDay(data.goals ?? [], day, data.profile.timezone);
  async function refresh() { if (cloud) setData(await api<AppData>("/api/data")); }
  async function refreshAfterMutation(success: string) {
    try { await refresh(); setRefreshNeeded(false); return success; }
    catch { setRefreshNeeded(true); return `${success} No pudimos actualizar la pantalla. Reintentá la actualización; no vuelvas a guardar el registro.`; }
  }
  async function save(input: RecordInput) {
    let message = "Registro guardado.";
    if (cloud) {
      const recordId = editing?.id ?? crypto.randomUUID();
      await api("/api/records", editing?.id ? "PUT" : "POST", { ...input, id: recordId });
      message = await refreshAfterMutation(message);
    }
    else {
      const id = editing?.id ?? crypto.randomUUID(); const date = dateKeyInTimeZone(new Date(input.timestamp), data.profile.timezone);
      setData(old => input.kind === "meal" ? { ...old, meals: [...old.meals.filter(m => (m.mealId ?? m.id) !== id), ...input.items.map((item, i) => ({ ...item, id: `${id}-${i}`, mealId: id, date, timestamp: input.timestamp, notes: input.notes, category: input.category }))] } : input.kind === "weight" ? { ...old, weights: [...old.weights.filter(w => w.id !== id), { id, date, ...input }] } : { ...old, activities: [...old.activities.filter(a => a.id !== id), { id, date, ...input }] });
    }
    setComposer(null); setEditing(null); setNotice(message);
  }
  async function remove(kind: "meal" | "weight" | "activity", id: string) {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try { let message = "Registro eliminado."; if (cloud) { await api("/api/records", "DELETE", { kind, id }); message = await refreshAfterMutation(message); } else setData(old => ({ ...old, meals: kind === "meal" ? old.meals.filter(m => (m.mealId ?? m.id) !== id) : old.meals, weights: kind === "weight" ? old.weights.filter(w => w.id !== id) : old.weights, activities: kind === "activity" ? old.activities.filter(a => a.id !== id) : old.activities })); setNotice(message); }
    catch(e) { setNotice(e instanceof Error ? e.message : "No se pudo eliminar."); }
  }
  function edit(id: string, input: RecordInput) { setNotice(""); setEditing({ id, input }); setComposer(input.kind); }
  function editMeal(m: MealEntry) {
    const id = m.mealId ?? m.id;
    edit(id, { kind: "meal", timestamp: m.timestamp ?? `${m.date}T15:00:00Z`, category: m.category, notes: m.notes ?? "", items: data.meals.filter(i => (i.mealId ?? i.id) === id).map(i => ({ ...i, estimated: i.estimated ?? false })) });
  }
  function open(view: Composer) { setNotice(""); setEditing(null); setComposer(view); }
  function moveMonth(amount: number) { const date = new Date(`${selected}T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount, 1); setSelected(date.toISOString().slice(0,10)); }
  return <main className="app-frame"><div className="screen"><header className="screen-header"><div><p className="eyebrow">NUTRICIÓN ANDRÉS</p><h1>{tab}</h1><p className="subtle">{tab === "Hoy" ? new Intl.DateTimeFormat("es-AR", { timeZone: data.profile.timezone, dateStyle: "full" }).format(new Date()) : "Tus datos, a tu ritmo"}</p></div><span className="avatar">{data.profile.name.split(" ").map(n => n[0]).slice(0,2).join("")}</span></header>
    {(tab === "Hoy" || tab === "Historial") && <>
      {tab === "Historial" && <section className="calendar-card"><div className="month-row"><button aria-label="Mes anterior" onClick={() => moveMonth(-1)}>‹</button><label className="field"><span>Elegir fecha</span><input type="date" value={selected} onChange={e => setSelected(e.target.value)} /></label><button aria-label="Mes siguiente" onClick={() => moveMonth(1)}>›</button></div></section>}
      {activeGoal ? (
        <>
          <section className="hero-card"><p className="hero-label">CALORÍAS</p><p className="hero-value">{fmt.format(total.calories)} <span>/ {fmt.format(activeGoal.calories)} kcal</span></p><progress aria-label="Objetivo de calorías" max={activeGoal.calories} value={Math.min(total.calories, activeGoal.calories)} /><p>{total.calories <= activeGoal.calories ? `Te quedan aproximadamente ${fmt.format(activeGoal.calories-total.calories)} kcal` : `Superaste el objetivo en ${fmt.format(total.calories-activeGoal.calories)} kcal`}</p></section>
          <div className="macro-grid">{(["protein", "carbs", "fat"] as const).map(k => <section className="macro-card" key={k}><p>{{protein:"Proteína",carbs:"Carbos",fat:"Grasas"}[k]}</p><strong>{total[k]} g</strong><small>Objetivo {k === "protein" ? activeGoal.protein : k === "carbs" ? activeGoal.carbs : activeGoal.fat} g</small></section>)}</div>
        </>
      ) : (
        <>
          <section className="hero-card"><p className="hero-label">CALORÍAS</p><p className="hero-value">{fmt.format(total.calories)} <span>kcal</span></p><p className="hero-note">Sin objetivo registrado para esta fecha</p></section>
          <div className="macro-grid">{(["protein", "carbs", "fat"] as const).map(k => <section className="macro-card" key={k}><p>{{protein:"Proteína",carbs:"Carbos",fat:"Grasas"}[k]}</p><strong>{total[k]} g</strong><small>Sin objetivo</small></section>)}</div>
        </>
      )}
      <section className="section"><h2>{tab === "Hoy" ? "Registro de hoy" : day}</h2>{meals.length === 0 && <p className="empty-inline">Sin alimentación registrada. Un día vacío no se cuenta como 0 kcal.</p>}{["Desayuno","Almuerzo","Merienda","Cena","Otros"].map(category => <section className="meal-group" key={category}><div className="meal-title"><h3>{category}</h3><span>{meals.filter(m => m.category === category).reduce((s,m)=>s+m.calories,0)} kcal</span></div>{meals.filter(m=>m.category===category).map(m => <article className="meal-item" key={m.id}><div className="grow"><p className="item-name">{m.name}</p><p className="subtle">{m.quantity} {m.unit} · {m.protein} g proteína{m.timestamp ? ` · ${new Intl.DateTimeFormat("es-AR",{timeZone:data.profile.timezone,hour:"2-digit",minute:"2-digit"}).format(new Date(m.timestamp))}` : ""}</p></div><button aria-label={`Editar ${m.name}`} onClick={()=>editMeal(m)}>Editar</button><button aria-label={`Eliminar ${m.name}`} onClick={()=>void remove("meal",m.mealId??m.id)}><X size={16}/></button></article>)}</section>)}</section>
      <section className="section"><h2>Peso y actividad</h2>{data.weights.filter(w=>w.date===day).map(w=><article className="list-row" key={w.id}><strong>{w.weightKg} kg</strong><button onClick={()=>edit(w.id,{kind:"weight",timestamp:w.timestamp??`${w.date}T15:00:00Z`,weightKg:w.weightKg})}>Editar peso</button><button onClick={()=>void remove("weight",w.id)}>Eliminar peso</button></article>)}{data.activities.filter(a=>a.date===day).map(a=><article className="list-row" key={a.id}><div><strong>{a.type}</strong><p>{a.duration} min · {a.detail}</p></div><button onClick={()=>edit(a.id,{kind:"activity",timestamp:a.timestamp??`${a.date}T15:00:00Z`,type:a.type,duration:a.duration,detail:a.detail??"",distanceKm:a.distanceKm,steps:a.steps})}>Editar</button><button onClick={()=>void remove("activity",a.id)}>Eliminar</button></article>)}</section>
    </>}
    {tab === "Progreso" && <ReportsView data={data} cloud={cloud} />}
    {tab === "Perfil" && <ProfileView data={data} googleEnabled={googleEnabled} cloud={cloud} onSave={async profile => { if(cloud){await api("/api/profile","PUT",profile);await refresh();}else setData(old=>({...old,profile}));setNotice("Perfil guardado."); }} />}
  </div>{notice && <div className="save-notice" role="status">{notice}{refreshNeeded && <button onClick={async()=>{try{await refresh();setRefreshNeeded(false);setNotice("Datos actualizados.");}catch{setNotice("Todavía no pudimos actualizar la pantalla. El registro ya fue guardado o eliminado.");}}}>Reintentar actualización</button>}<button aria-label="Cerrar aviso" onClick={()=>setNotice("")}>×</button></div>}
  <nav className="bottom-nav" aria-label="Navegación principal">{(["Hoy","Historial","+","Progreso","Perfil"] as const).map((label,i)=>label==="+"?<button key={label} className="add" aria-label="Agregar registro" onClick={()=>open("menu")}><Plus/></button>:<button key={label} className={tab===label?"active":""} onClick={()=>setTab(label)}>{[<Home key="h"/>,<History key="i"/>,null,<TrendingUp key="t"/>,<UserRound key="u"/>][i]}<span>{label}</span></button>)}</nav>
  {composer && <div className="sheet-backdrop"><section className="sheet" role="dialog" aria-modal="true" aria-label="Agregar registro"><button className="close" aria-label="Cerrar" onClick={()=>setComposer(null)}><X/></button>
    {composer==="menu"?<><h2>¿Qué querés agregar?</h2><div className="action-list">{([ ["photo","Analizar comida con foto"],["meal","Agregar comida manual"],["library","Alimentos y recetas"],["weight","Registrar peso"],["activity","Registrar actividad"] ] as [Composer,string][]).map(([view,label])=><button key={view} onClick={()=>open(view)}>{label}</button>)}</div></>:composer==="photo"?<FoodScanner foods={data.foods??[]} references={data.foodReferences??[]} timezone={data.profile.timezone} onSave={save}/>:composer==="library"?<Library data={data} cloud={cloud} refresh={refresh} onChoose={input=>{setEditing({input});setComposer("meal");}}/>:<RecordEditor timezone={data.profile.timezone} onSave={save} initial={editing?.input??(composer==="meal"?{kind:"meal",timestamp:new Date().toISOString(),category:"Almuerzo",notes:"",items:[{...blankItem}]}:composer==="weight"?{kind:"weight",timestamp:new Date().toISOString(),weightKg:data.weights.at(-1)?.weightKg??70}:{kind:"activity",timestamp:new Date().toISOString(),type:"Gym",duration:60,detail:""})}/>}
  </section></div>}
  </main>;
}
