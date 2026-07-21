"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Award, BookOpen, CalendarDays, Camera,
  Check, ChevronRight, Clock3, CloudSun, Download, Flame, Home,
  Image as ImageIcon, Leaf, MapPin, Pencil, Play, Plus, RefreshCw,
  Sparkles, Sun, Sunrise, Sunset, Target, TrendingUp,
  UserRound, X, Zap, LocateFixed, Navigation, ShieldCheck, Smartphone
} from "lucide-react";
import { COUNTRY_LOCATIONS, countryCoords, getSolarSchedule } from "./solarSchedule";

const STORAGE_KEY = "metodo-solar-v1";
const initialData = { onboarded: false, profile: {}, location: null, entries: [], photos: [], totalSoles: 0 };

const practices = [
  ["La ceremonia de apertura", "Encuentra luz natural y observa tu respiración.", "¿Cómo llegas a este recorrido?"],
  ["Los cinco sentidos", "Observa 5 cosas, escucha 4 sonidos y reconoce 3 sensaciones.", "¿Qué detalle habría pasado inadvertido?"],
  ["La primera luz disponible", "Recibe claridad durante la primera parte de tu jornada.", "Compara tu energía antes y después."],
  ["Luz y movimiento", "Camina con atención, relaja los hombros y mira a lo lejos.", "¿Qué cambió después de moverte?"],
  ["Colores que transforman", "Mira cómo la luz modifica un color de tu entorno.", "¿Qué emoción despierta ese color?"],
  ["Una pausa sin pantallas", "Aparta el teléfono y deja descansar la atención.", "¿Qué ocurre al bajar los estímulos?"],
  ["Primera revisión", "Elige tu práctica favorita y revisa tu primera semana.", "¿Qué quieres ajustar esta semana?"],
  ["Una intención para la jornada", "Formula una intención concreta y amable.", "Hoy quiero tratarme con…"],
  ["Un espacio orientado al día", "Acerca una actividad cotidiana a una zona luminosa.", "¿Cómo cambia la percepción del espacio?"],
  ["Caminar para despejar", "Usa una caminata breve como transición.", "¿Qué pensamiento perdió intensidad?"],
  ["Luz compartida", "Comparte un momento diurno con otra persona.", "¿Cómo influyó la compañía?"],
  ["Respirar la pausa", "Haz seis respiraciones lentas y afloja el cuerpo.", "¿Dónde acumulabas tensión?"],
  ["La tarea agradable", "Lleva algo que disfrutas a un lugar con luz natural.", "¿Pudiste disfrutar sin exigencia?"],
  ["Atardecer y segunda revisión", "Busca el último momento luminoso del día.", "¿Qué práctica deseas repetir?"],
  ["Escuchar el cuerpo", "Recorre el cuerpo y observa sin juzgar.", "¿Qué necesitaba tu cuerpo hoy?"],
  ["Recuperar la curiosidad", "Mira un lugar conocido como si fuera la primera vez.", "¿Qué apareció al mirar con curiosidad?"],
  ["Una acción que devuelve capacidad", "Haz una acción breve vinculada con la luz.", "¿Qué demuestra sobre tu capacidad de comenzar?"],
  ["Contraste entre día y noche", "Recibe luz de día y reduce iluminación al anochecer.", "¿Cómo se sintió la transición?"],
  ["El momento especial", "Reserva un encuentro más largo con amanecer o atardecer.", "¿Qué emoción despertó la belleza?"],
  ["Elegir lo que permanece", "Repite la práctica que más te ayudó.", "¿Cómo puedes conservar este hábito?"],
  ["Ceremonia de cierre", "Revisa tu álbum y celebra el recorrido.", "¿Qué hábito concreto continuará contigo?"]
];

const todayKey = () => new Date().toISOString().slice(0, 10);
const dateLabel = (date) => new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`));

async function storageGet(key) {
  try {
    if (window.storage?.get) {
      const result = await Promise.race([
        window.storage.get(key),
        new Promise(resolve => setTimeout(() => resolve(null), 700))
      ]);
      return result?.value ?? result ?? localStorage.getItem(key);
    }
    return localStorage.getItem(key);
  } catch { return localStorage.getItem(key); }
}

async function storageSet(key, value) {
  localStorage.setItem(key, value);
  try {
    if (window.storage?.set) await Promise.race([
      window.storage.set(key, value),
      new Promise(resolve => setTimeout(resolve, 700))
    ]);
  } catch { /* local mirror already saved */ }
}

function SunMark({ small = false }) {
  return <div className={`sun-mark ${small ? "small" : ""}`} aria-hidden="true"><span /></div>;
}

function EmptyIllustration({ type = "history" }) {
  return (
    <svg className="empty-art" viewBox="0 0 220 138" role="img" aria-label="Ilustración de un paisaje al sol">
      <defs><linearGradient id={`sky-${type}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#FFF2C7"/><stop offset="1" stopColor="#FFF9EC"/></linearGradient></defs>
      <rect x="12" y="8" width="196" height="122" rx="28" fill={`url(#sky-${type})`}/>
      <circle cx="157" cy="47" r="19" fill="#F7B733" opacity=".92"/>
      <path d="M12 100c34-32 58-30 89-4 28-31 62-35 107-5v39H12z" fill="#EAD99C"/>
      <path d="M12 112c39-18 74-14 105 7 31-13 61-12 91 0v11H12z" fill="#B7C89B"/>
      {type === "photos" && <path d="M92 74h36a7 7 0 017 7v25a7 7 0 01-7 7H92a7 7 0 01-7-7V81a7 7 0 017-7zm6-7h24l4 7H94z" fill="#FFFDF7" stroke="#8E7B55" strokeWidth="2"/>}
      {type === "history" && <path d="M95 74h30v38H95zM90 80h40M103 69h14" fill="#FFFDF7" stroke="#8E7B55" strokeWidth="2" strokeLinecap="round"/>}
    </svg>
  );
}

function Stepper({ step, total }) {
  return <div className="stepper"><div className="stepper-top"><span>Paso {step} de {total}</span><span>{Math.round(step / total * 100)}%</span></div><div className="progress"><span style={{ width: `${step / total * 100}%` }} /></div></div>;
}

const Choice = ({ selected, onClick, icon: Icon, children, sub }) => (
  <button type="button" className={`choice ${selected ? "selected" : ""}`} onClick={onClick}>
    {Icon && <Icon size={19}/>}<span><strong>{children}</strong>{sub && <small>{sub}</small>}</span>{selected && <Check size={17}/>} 
  </button>
);

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", country: "Uruguay", outingType: "ciudad", weekly: "4", duration: "10", moment: "mañana", dailyGoal: "10 minutos", objective: "", restrictions: [] });
  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const toggleRestriction = value => update("restrictions", form.restrictions.includes(value) ? form.restrictions.filter(x => x !== value) : [...form.restrictions, value]);
  const next = () => step < 4 ? setStep(s => s + 1) : onComplete(form);
  return (
    <main className="onboarding-shell">
      <div className="onboarding-card">
        <header className="brand-row"><div className="brand"><SunMark small/><span>Método Solar</span></div>{step > 1 && <button className="icon-button" onClick={() => setStep(s => s - 1)} aria-label="Volver"><ArrowLeft size={20}/></button>}</header>
        <Stepper step={step} total={4}/>
        <section className="step-content" key={step}>
          {step === 1 && <>
            <div className="onboard-hero"><SunMark/><span className="orbit orbit-one"/><span className="orbit orbit-two"/></div>
            <p className="eyebrow">TU RITMO, TU LUZ</p><h1>Un pequeño encuentro con el día puede cambiar cómo lo transitas.</h1>
            <p className="lead">Te acompañaremos durante 21 días con prácticas breves, registro amable y logros que sí importan.</p>
            <label className="field"><span>¿Cómo quieres que te llamemos?</span><input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Tu nombre" autoFocus/></label>
          </>}
          {step === 2 && <><p className="eyebrow">TU SALIDA POSIBLE</p><h1>¿Dónde encuentras tu luz?</h1><p className="lead">No hace falta perseguir el Sol. Vamos a adaptarlo a tu vida.</p>
            <label className="field"><span>País de referencia</span><select value={form.country} onChange={e=>update("country",e.target.value)}>{Object.keys(COUNTRY_LOCATIONS).map(country=><option key={country}>{country}</option>)}</select><small className="field-help">Lo usaremos si prefieres no compartir tu ubicación exacta.</small></label>
            <div className="choice-grid">{[["playa",Sunrise],["campo",Leaf],["ciudad",MapPin],["bosque",CloudSun]].map(([x,I])=><Choice key={x} icon={I} selected={form.outingType===x} onClick={()=>update("outingType",x)}>{x[0].toUpperCase()+x.slice(1)}</Choice>)}</div>
            <div className="field-grid"><label className="field"><span>Días por semana</span><input type="range" min="1" max="7" value={form.weekly} onChange={e=>update("weekly",e.target.value)}/><b className="range-value">{form.weekly} días</b></label><label className="field"><span>Duración habitual</span><select value={form.duration} onChange={e=>update("duration",e.target.value)}><option value="2">Salida fugaz</option><option value="5">5 minutos</option><option value="10">10 minutos</option><option value="15">15 minutos</option><option value="20">20 minutos</option></select></label></div>
            <label className="field"><span>Momento preferido</span><div className="segmented roomy">{["amanecer","mañana","tarde","atardecer"].map(x=><button type="button" className={form.moment===x?"active":""} onClick={()=>update("moment",x)} key={x}>{x}</button>)}</div></label>
          </>}
          {step === 3 && <><p className="eyebrow">UNA META AMABLE</p><h1>¿Qué cuenta como logro?</h1><p className="lead">Elige una meta que puedas sostener incluso en días imperfectos.</p>
            <div className="goal-list">{[["Salida fugaz","1–2 min, para mantener el hábito"],["5 minutos","Nivel esencial"],["10 minutos","Luz y presencia"],["15 minutos","Luz y movimiento"]].map(([x,sub])=><Choice key={x} icon={Target} selected={form.dailyGoal===x} onClick={()=>update("dailyGoal",x)} sub={sub}>{x}</Choice>)}</div>
            <label className="field"><span>¿Qué te gustaría encontrar en estos 21 días?</span><textarea value={form.objective} onChange={e=>update("objective",e.target.value)} placeholder="Ej. dormir con más regularidad, sentir más calma…" rows="3"/></label>
          </>}
          {step === 4 && <><p className="eyebrow">PLAN B, SIN CULPA</p><h1>¿Qué suele interponerse?</h1><p className="lead">Prepararemos una práctica fugaz para esos días. Puedes elegir más de una.</p>
            <div className="goal-list">{["Mal tiempo","Estoy enfermo","Estoy enferma","Mucho trabajo"].map(x=><Choice key={x} icon={x==="Mal tiempo"?CloudSun:x==="Mucho trabajo"?Clock3:Zap} selected={form.restrictions.includes(x)} onClick={()=>toggleRestriction(x)}>{x}</Choice>)}</div>
            <div className="kind-note"><Sparkles size={19}/><p><strong>Tu regla esencial</strong><br/>Acércate a la luz, permanece presente y registra una palabra. Un minuto también cuenta.</p></div>
          </>}
        </section>
        <footer className="onboard-footer"><button className="primary-button" disabled={step===1 && !form.name.trim()} onClick={next}>{step===4?"Comenzar mis 21 días":"Continuar"}<ArrowRight size={18}/></button>{step===1&&<small>Tu información queda guardada solo en este dispositivo.</small>}</footer>
      </div>
    </main>
  );
}

function CircularProgress({ value, size=68 }) {
  const r=27, c=2*Math.PI*r, dash=c*(value/100);
  return <div className="circle-progress" style={{width:size,height:size}}><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r={r}/><circle className="value" cx="32" cy="32" r={r} strokeDasharray={`${dash} ${c-dash}`}/></svg><b>{Math.round(value)}%</b></div>;
}

function PhotoPicker({ onPhoto, compact=false }) {
  const ref=useRef(null);
  return <><button className={compact?"photo-mini":"photo-button"} onClick={()=>ref.current?.click()}><Camera size={compact?18:21}/><span>{compact?"Agregar foto":"Subir foto del día"}</span>{!compact&&<Plus size={18}/>}</button><input ref={ref} className="sr-only" type="file" accept="image/*" capture="environment" onChange={e=>e.target.files?.[0]&&onPhoto(e.target.files[0])}/></>;
}

function SolarTimesCard({ profile, location, onUseLocation, onCountryChange, locating, locationError }) {
  const country = profile.country || "Uruguay";
  const coords = location?.lat ? location : countryCoords(country);
  const schedule = getSolarSchedule(coords);
  if (!schedule) return null;
  return <section className="solar-times-card">
    <div className="solar-times-head"><div><span className="eyebrow">HORARIO SOLAR DE HOY</span><h3>{schedule.status.title}</h3><p>{schedule.status.detail}</p></div><div className={`solar-now ${schedule.status.tone}`}><Sun size={19}/></div></div>
    <div className="solar-windows"><div><Sunrise size={19}/><span>Mañana<strong>{schedule.morningLabel}</strong></span></div><div><Sunset size={19}/><span>Atardecer<strong>{schedule.eveningLabel}</strong></span></div></div>
    <div className="solar-meta"><span><Navigation size={14}/>{location?.lat ? "Ubicación precisa" : `Referencia: ${country}`}</span><span>Amanecer {schedule.sunriseLabel} · Atardecer {schedule.sunsetLabel}</span></div>
    {!location?.lat && <div className="location-actions"><label><span>País</span><select value={country} onChange={e=>onCountryChange(e.target.value)}>{Object.keys(COUNTRY_LOCATIONS).map(name=><option key={name}>{name}</option>)}</select></label><button onClick={onUseLocation} disabled={locating}><LocateFixed size={17}/>{locating?"Buscando…":"Usar mi ubicación"}</button></div>}
    {locationError&&<p className="location-error">No pudimos acceder a tu ubicación. Seguimos usando {country} como referencia.</p>}
    <div className="uv-note"><ShieldCheck size={16}/><span>Son ventanas de luz natural suave, no una indicación para broncearse. Evita mirar directamente al Sol y usa protección según el índice UV local.</span></div>
  </section>;
}

function HomeTab({ data, onOpenCheckin, onPhoto, loadingPhoto, onUseLocation, onCountryChange, locating, locationError }) {
  const completed=data.entries.length, todayDone=data.entries.some(e=>e.date===todayKey()), day=Math.max(1,Math.min(todayDone?completed:completed+1,21)), practice=practices[day-1]||practices[20];
  const streak=useMemo(()=>calculateStreak(data.entries),[data.entries]);
  return <div className="tab-page fade-in">
    <header className="topbar"><div><span className="date-kicker">{new Intl.DateTimeFormat("es-UY",{weekday:"long",day:"numeric",month:"long"}).format(new Date())}</span><h1>Hola, {data.profile.name || "Sol"}</h1></div><button className="avatar" aria-label="Perfil">{(data.profile.name||"S")[0].toUpperCase()}</button></header>
    <section className="hero-card"><div className="hero-glow"/><div className="hero-top"><div><span className="pill"><Sunrise size={15}/> Día {day} de 21</span><h2>{todayDone?"Tu luz de hoy ya cuenta":"Un momento de luz para ti"}</h2><p>{todayDone?"La constancia se construye así: un día posible a la vez.":practice[0]}</p></div><CircularProgress value={Math.min(completed/21*100,100)}/></div>
      <div className="hero-actions">{todayDone?<button className="done-button"><Check size={18}/> Práctica completada</button>:<button className="light-button" onClick={onOpenCheckin}><Play size={18}/> Comenzar práctica</button>}<PhotoPicker onPhoto={onPhoto} compact/></div>
    </section>
    {loadingPhoto&&<section className="thinking-card"><div className="skeleton-photo"/><div className="thinking-lines"><span/><span/><p><Sparkles size={16}/> Leyendo tu foto…</p></div></section>}
    <SolarTimesCard profile={data.profile} location={data.location} onUseLocation={onUseLocation} onCountryChange={onCountryChange} locating={locating} locationError={locationError}/>
    <section className="section-block"><div className="section-title"><div><span className="eyebrow">PROPUESTA DE HOY</span><h3>{practice[0]}</h3></div><span className="time-tag"><Clock3 size={15}/>{data.profile.duration||10} min</span></div><p className="practice-copy">{practice[1]}</p><div className="prompt-line"><Sparkles size={18}/><span>{practice[2]}</span></div></section>
    <section className="stats-row"><article><div className="stat-icon warm"><Flame size={19}/></div><span>Racha actual</span><strong>{streak} {streak===1?"día":"días"}</strong></article><article><div className="stat-icon green"><Sun size={19}/></div><span>Soles ganados</span><strong>{data.totalSoles}</strong></article><article><div className="stat-icon clay"><CalendarDays size={19}/></div><span>Esta semana</span><strong>{weekCount(data.entries)}/7</strong></article></section>
    <section className="gentle-card"><CloudSun size={24}/><div><strong>¿Un día difícil?</strong><p>Una ventana, tres respiraciones y una palabra. Tu salida fugaz también mantiene vivo el hábito.</p></div><ChevronRight size={20}/></section>
  </div>;
}

function calculateStreak(entries){const dates=new Set(entries.map(e=>e.date));let n=0,d=new Date();if(!dates.has(todayKey()))d.setDate(d.getDate()-1);while(dates.has(d.toISOString().slice(0,10))){n++;d.setDate(d.getDate()-1)}return n}
function weekCount(entries){const now=new Date(), start=new Date(now);start.setDate(now.getDate()-((now.getDay()+6)%7));start.setHours(0,0,0,0);return entries.filter(e=>new Date(`${e.date}T12:00:00`)>=start).length}

function EvolutionTab({ data }) {
  const sorted=[...data.entries].sort((a,b)=>b.date.localeCompare(a.date));
  const avg=key=>sorted.length?(sorted.reduce((s,e)=>s+Number(e[key]||0),0)/sorted.length).toFixed(1):"—";
  return <div className="tab-page fade-in"><header className="page-header"><div><p className="eyebrow">TU RECORRIDO</p><h1>Mi evolución</h1></div><div className="soles-badge"><Sun size={17}/>{data.totalSoles} {data.totalSoles===1?"Sol":"Soles"}</div></header>
    <section className="evolution-hero"><div><span>Progreso del recorrido</span><strong>{data.entries.length}<small>/21 días</small></strong><p>{data.entries.length<7?"Estás creando una base amable.":data.entries.length<14?"Tu ritmo ya empieza a tomar forma.":"Has convertido pequeños gestos en un hábito."}</p></div><CircularProgress value={Math.min(data.entries.length/21*100,100)} size={82}/></section>
    <section className="metric-grid"><article><TrendingUp size={20}/><span>Energía después</span><strong>{avg("energyAfter")}<small>/10</small></strong></article><article><Leaf size={20}/><span>Calma después</span><strong>{avg("calmAfter")}<small>/10</small></strong></article><article><Award size={20}/><span>Mejor racha</span><strong>{calculateStreak(data.entries)}<small>{calculateStreak(data.entries)===1?"día":"días"}</small></strong></article></section>
    <section className="calendar-card"><div className="section-title"><h3>21 días de luz</h3><span>{data.entries.length} {data.entries.length===1?"encuentro":"encuentros"}</span></div><div className="journey-grid">{Array.from({length:21},(_,i)=>{const done=!!data.entries[i];return <div className={`journey-day ${done?"done":""}`} key={i}><span>{i+1}</span>{done&&<Sun size={13}/>}</div>})}</div><div className="legend"><span><i className="complete"/>Completado</span><span><i/>Por vivir</span></div></section>
    <section className="history-section"><div className="section-title"><h3>Historial</h3><span>{sorted.length} {sorted.length===1?"registro":"registros"}</span></div>{!sorted.length?<div className="empty-state"><EmptyIllustration/><h4>Tu historia empieza con un minuto</h4><p>Cuando completes una práctica, aparecerá aquí.</p></div>:<div className="history-list">{sorted.map(e=><article key={e.id}><div className="history-date"><span>{dateLabel(e.date)}</span><b>Día {Math.max(1,data.entries.findIndex(x=>x.id===e.id)+1)}</b></div><div className="history-main"><span className="level-dot"/><div><strong>{e.level}</strong><p>{e.word||e.reflection||"Un momento de presencia"}</p></div></div><div className="history-score"><Sun size={15}/><b>+{e.soles}</b></div></article>)}</div>}</section>
  </div>;
}

function PhotosTab({ data, onPhoto, loadingPhoto }) {
  const [selected,setSelected]=useState(null);
  const saveImage=(p)=>{const a=document.createElement("a");a.href=p.src;a.download=`mis-21-dias-de-luz-${p.date}.jpg`;a.click()};
  return <div className="tab-page fade-in"><header className="page-header"><div><p className="eyebrow">MIS 21 DÍAS DE LUZ</p><h1>Fototeca</h1></div><PhotoPicker onPhoto={onPhoto} compact/></header>
    {loadingPhoto&&<section className="photo-loading"><div className="shimmer"/><Sparkles size={20}/><h3>Leyendo tu foto…</h3><p>Reconociendo la luz y los colores de tu momento.</p></section>}
    {!data.photos.length&&!loadingPhoto?<div className="empty-state large"><EmptyIllustration type="photos"/><h3>Guarda cómo se sintió la luz</h3><p>No buscamos fotos perfectas. Buscamos momentos que quieras volver a mirar.</p><PhotoPicker onPhoto={onPhoto}/></div>:<div className="photo-grid">{data.photos.map(p=><button key={p.id} onClick={()=>setSelected(p)}><img src={p.src} alt={p.title||"Momento de luz"}/><span>{dateLabel(p.date)}</span>{p.aiNote&&<i><Sparkles size={13}/></i>}</button>)}</div>}
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="photo-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}><X size={20}/></button><img src={selected.src} alt="Momento de luz ampliado"/><div className="photo-caption"><span>{dateLabel(selected.date)}</span><h3>{selected.title||"El cielo de hoy"}</h3><p><Sparkles size={16}/>{selected.aiNote}</p><button className="secondary-button" onClick={()=>saveImage(selected)}><Download size={18}/>Guardar en el dispositivo</button></div></div></div>}
  </div>;
}

function ProfileTab({ data, onEdit, onReset, onInstall, installed }) {
  return <div className="tab-page fade-in"><header className="page-header"><div><p className="eyebrow">TU ESPACIO</p><h1>Perfil</h1></div><button className="icon-button" onClick={onEdit} aria-label="Editar perfil"><Pencil size={19}/></button></header>
    <section className="profile-card"><div className="profile-avatar">{(data.profile.name||"S")[0].toUpperCase()}</div><div><h2>{data.profile.name||"Tu nombre"}</h2><p>{data.profile.objective||"21 días para reconectar con la luz natural"}</p></div></section>
    <section className="profile-section"><h3>Mi plan solar</h3><div className="profile-list"><div><span><Target size={19}/>Meta diaria</span><strong>{data.profile.dailyGoal}</strong></div><div><span><MapPin size={19}/>Entorno preferido</span><strong>{data.profile.outingType}</strong></div><div><span><Sunrise size={19}/>Momento</span><strong>{data.profile.moment}</strong></div><div><span><CalendarDays size={19}/>Frecuencia</span><strong>{data.profile.weekly} días/semana</strong></div></div></section>
    <section className="install-card"><Smartphone size={24}/><div><strong>{installed?"Método Solar está instalada":"Lleva Método Solar a tu inicio"}</strong><p>{installed?"Puedes abrirla como cualquier otra aplicación.":"Acceso rápido, pantalla completa y funcionamiento básico sin conexión."}</p></div>{!installed&&<button onClick={onInstall}>Instalar</button>}</section>
    <section className="profile-section"><h3>Principios del método</h3><div className="principle"><Sun size={20}/><p><strong>Continuidad, no perfección</strong><br/>Si un día no puedes, retomas al siguiente. Nunca vuelves a cero.</p></div><div className="principle"><CloudSun size={20}/><p><strong>Los días nublados cuentan</strong><br/>La claridad natural sigue siendo una señal para tu organismo.</p></div><div className="principle"><Leaf size={20}/><p><strong>Presencia antes que rendimiento</strong><br/>El álbum es memoria, no prueba de cumplimiento.</p></div></section>
    <section className="safety-note"><BookOpen size={20}/><p><strong>Cuidado responsable</strong><br/>No mires directamente al Sol. Busca sombra y protección adecuada. El método acompaña el bienestar; no reemplaza atención médica o psicológica.</p></section>
    <button className="reset-link" onClick={onReset}><RefreshCw size={16}/>Reiniciar datos de demostración</button>
  </div>;
}

function CheckinModal({ onClose, onSave, profile }) {
  const [duration,setDuration]=useState(Number(profile.duration)||10), [level,setLevel]=useState("Esencial"), [word,setWord]=useState(""), [reflection,setReflection]=useState(""), [energyBefore,setEB]=useState(5), [energyAfter,setEA]=useState(7), [calmAfter,setCA]=useState(7);
  const soles=level==="Especial"?3:level==="Intermedio"?2:1;
  return <div className="modal-backdrop"><div className="checkin-modal"><header><div><span className="eyebrow">REGISTRO DE HOY</span><h2>¿Cómo fue tu encuentro?</h2></div><button className="modal-close" onClick={onClose}><X size={20}/></button></header>
    <label className="field"><span>Minutos de luz</span><div className="duration-row">{[2,5,10,15,20].map(x=><button type="button" className={duration===x?"active":""} onClick={()=>setDuration(x)} key={x}>{x}</button>)}</div></label>
    <label className="field"><span>Nivel realizado</span><div className="level-row">{[["Esencial",Sun],["Intermedio",Zap],["Especial",Sunset]].map(([x,I])=><button type="button" className={level===x?"active":""} onClick={()=>setLevel(x)} key={x}><I size={17}/>{x}</button>)}</div></label>
    <div className="slider-field"><span>Energía: antes <b>{energyBefore}</b> → después <b>{energyAfter}</b></span><div><input type="range" min="1" max="10" value={energyBefore} onChange={e=>setEB(e.target.value)}/><input type="range" min="1" max="10" value={energyAfter} onChange={e=>setEA(e.target.value)}/></div></div>
    <div className="slider-field"><span>Calma después <b>{calmAfter}/10</b></span><input type="range" min="1" max="10" value={calmAfter} onChange={e=>setCA(e.target.value)}/></div>
    <label className="field"><span>Una palabra para este momento</span><input value={word} onChange={e=>setWord(e.target.value)} placeholder="Calma, claridad, pausa…"/></label>
    <label className="field"><span>Algo que observé</span><textarea rows="2" value={reflection} onChange={e=>setReflection(e.target.value)} placeholder="Opcional, unas pocas palabras alcanzan"/></label>
    <button className="primary-button" onClick={()=>onSave({duration,level,word,reflection,energyBefore:Number(energyBefore),energyAfter:Number(energyAfter),calmAfter:Number(calmAfter),soles})}><Sun size={18}/>Completar y ganar {soles} {soles===1?"Sol":"Soles"}</button>
  </div></div>;
}

function RewardToast({ reward }) { return <div className="reward-toast"><div className="reward-sun"><Sun size={27}/></div><div><span>+{reward} {reward===1?"Sol":"Soles"}</span><strong>Tu momento de luz cuenta</strong></div></div> }

function TabBar({ active, setActive }) { const tabs=[["home","Inicio",Home],["evolution","Mi evolución",TrendingUp],["photos","Fototeca",ImageIcon],["profile","Perfil",UserRound]];return <nav className="tabbar">{tabs.map(([id,label,I])=><button key={id} className={active===id?"active":""} onClick={()=>setActive(id)}><I size={21}/><span>{label}</span></button>)}</nav> }

export default function SolarCoach() {
  const [data,setData]=useState(initialData), [ready,setReady]=useState(false), [active,setActive]=useState("home"), [checkin,setCheckin]=useState(false), [photoLoading,setPhotoLoading]=useState(false), [reward,setReward]=useState(null), [locating,setLocating]=useState(false), [locationError,setLocationError]=useState(""), [installPrompt,setInstallPrompt]=useState(null), [installed,setInstalled]=useState(()=>typeof window!=="undefined"&&(window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true));
  useEffect(()=>{storageGet(STORAGE_KEY).then(raw=>{if(raw){try{setData({...initialData,...JSON.parse(raw)})}catch{}}setReady(true)})},[]);
  useEffect(()=>{if(ready)storageSet(STORAGE_KEY,JSON.stringify(data))},[data,ready]);
  useEffect(()=>{
    if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
    const capture=event=>{event.preventDefault();setInstallPrompt(event)};
    const done=()=>{setInstalled(true);setInstallPrompt(null)};
    window.addEventListener("beforeinstallprompt",capture);
    window.addEventListener("appinstalled",done);
    return()=>{window.removeEventListener("beforeinstallprompt",capture);window.removeEventListener("appinstalled",done)};
  },[]);
  const completeOnboarding=profile=>setData(d=>({...d,onboarded:true,profile}));
  const saveCheckin=entry=>{if(data.entries.some(e=>e.date===todayKey())){setCheckin(false);return}const full={...entry,id:Date.now(),date:todayKey()};setData(d=>({...d,entries:[...d.entries,full],totalSoles:d.totalSoles+entry.soles}));setReward(entry.soles);setCheckin(false);setTimeout(()=>setReward(null),3200)};
  const processPhoto=async file=>{setPhotoLoading(true);try{const src=await compressImage(file);await new Promise(r=>setTimeout(r,1250));const insight=await analyzePhoto(src);const photo={id:Date.now(),date:todayKey(),src,title:insight.title,aiNote:insight.note};setData(d=>({...d,photos:[photo,...d.photos]}));setActive("photos");setReward(1);setTimeout(()=>setReward(null),2800)}finally{setPhotoLoading(false)}};
  const useLocation=()=>{setLocating(true);setLocationError("");if(!navigator.geolocation){setLocationError("Tu dispositivo no ofrece ubicación.");setLocating(false);return}navigator.geolocation.getCurrentPosition(position=>{setData(d=>({...d,location:{lat:position.coords.latitude,lon:position.coords.longitude,accuracy:position.coords.accuracy,updatedAt:Date.now()}}));setLocating(false)},()=>{setLocationError("Permiso no concedido");setLocating(false)},{enableHighAccuracy:false,timeout:10000,maximumAge:86400000})};
  const changeCountry=country=>setData(d=>({...d,profile:{...d.profile,country},location:null}));
  const install=async()=>{if(installPrompt){await installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice.outcome==="accepted")setInstalled(true);setInstallPrompt(null);return}const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent);window.alert(isiOS?"En Safari, toca Compartir y luego ‘Agregar a pantalla de inicio’.":"Abre el menú del navegador y elige ‘Instalar aplicación’ o ‘Agregar a pantalla de inicio’.")};
  const reset=()=>{if(window.confirm("¿Quieres borrar el recorrido guardado en este dispositivo?")){setData(initialData);setActive("home")}};
  if(!ready)return <main className="app-loader"><SunMark/><p>Preparando tu momento de luz…</p><div className="loader-lines"><span/><span/></div></main>;
  if(!data.onboarded)return <Onboarding onComplete={completeOnboarding}/>;
  return <main className="app-shell"><div className="app-frame">{active==="home"&&<HomeTab data={data} onOpenCheckin={()=>setCheckin(true)} onPhoto={processPhoto} loadingPhoto={photoLoading} onUseLocation={useLocation} onCountryChange={changeCountry} locating={locating} locationError={locationError}/>} {active==="evolution"&&<EvolutionTab data={data}/>} {active==="photos"&&<PhotosTab data={data} onPhoto={processPhoto} loadingPhoto={photoLoading}/>} {active==="profile"&&<ProfileTab data={data} onEdit={()=>{setData(d=>({...d,onboarded:false}));}} onReset={reset} onInstall={install} installed={installed}/>}<TabBar active={active} setActive={setActive}/></div>{checkin&&<CheckinModal onClose={()=>setCheckin(false)} onSave={saveCheckin} profile={data.profile}/>} {reward&&<RewardToast reward={reward}/>}</main>;
}

function compressImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onload=()=>{const max=1280,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.78))};img.onerror=reject;img.src=reader.result};reader.readAsDataURL(file)})}

async function analyzePhoto(src){
  // En superficies de Artefactos impulsados por IA se aprovecha el proveedor autenticado.
  // La lectura visual local mantiene la experiencia funcional sin claves ni cuentas externas.
  try{const provider=window.artifactAI||window.ai;if(provider?.analyzeImage){const result=await provider.analyzeImage({image:src,prompt:"Describe con calidez la luz, los colores y la sensación de esta foto en español. Devuelve title y note."});if(result?.title)return result}}catch{}
  return new Promise(resolve=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas"),ctx=c.getContext("2d");c.width=40;c.height=40;ctx.drawImage(img,0,0,40,40);const px=ctx.getImageData(0,0,40,40).data;let r=0,g=0,b=0;for(let i=0;i<px.length;i+=4){r+=px[i];g+=px[i+1];b+=px[i+2]}const n=px.length/4;r/=n;g/=n;b/=n;const warm=r>b*1.12;const bright=(r+g+b)/3>150;resolve({title:warm?"Abrazo dorado":bright?"Claridad":"Volver a mirar",note:warm?"La luz cálida domina la escena. Un momento que invita a bajar el ritmo y estar presente.":bright?"La claridad abre la escena y deja una sensación de amplitud. Guarda qué cambió en ti al detenerte.":"Hay una luz suave y serena. Incluso los días de tonos tranquilos cuentan en tu recorrido."})};img.src=src})}
