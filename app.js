"use strict";
const KEY = "pesoapeso.v1";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const CUR = new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0});
const CUR2 = new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2,maximumFractionDigits:2});
const money = (n,dec) => (dec ? CUR2 : CUR).format(Math.round((n||0)*(dec?100:1))/(dec?100:1));
const todayISO = () => new Date().toISOString().slice(0,10);
const ymOf = iso => iso.slice(0,7);

let state = load();
let ui = { tab:"home", month: ymOf(todayISO()) };

function load(){
  try{ const raw = localStorage.getItem(KEY); if(raw) return JSON.parse(raw); }catch(e){}
  return seed();
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){ toast("No se pudo guardar 😕"); } }

function seed(){
  const cats = [
    ["Súper","🛒","#4CAF7D","expense"],["Restaurantes","🍔","#E5893B","expense"],
    ["Transporte","🚌","#4C8FE0","expense"],["Nafta","⛽","#8E7CDD","expense"],
    ["Servicios","💡","#D9A93B","expense"],["Alquiler","🏠","#C2603F","expense"],
    ["Salud","💊","#E06A8C","expense"],["Educación","📚","#3FA9A0","expense"],
    ["Entretenimiento","🎬","#B45CC9","expense"],["Ropa","👕","#5EA0B8","expense"],
    ["Tecnología","💻","#647587","expense"],["Mascotas","🐾","#B98A4E","expense"],
    ["Regalos","🎁","#D65D6E","expense"],["Otros","📦","#8A908A","expense"],
    ["Sueldo","💰","#178A5A","income"],["Freelance","💼","#2E9E8F","income"],
    ["Ventas","🏷️","#4C8FE0","income"],["Extras","➕","#8A908A","income"],
  ].map(([name,icon,color,kind])=>({id:uid(),name,icon,color,kind}));
  const cid = n => cats.find(c=>c.name===n).id;

  const d = new Date(); const y=d.getFullYear(), m=d.getMonth();
  const iso = (yy,mm,dd)=> new Date(yy,mm,dd).toISOString().slice(0,10);
  const T=[];
  const add=(t,amt,cat,day,note,mm=m,yy=y)=>T.push({id:uid(),type:t,amount:amt,categoryId:cid(cat),date:iso(yy,mm,day),note:note||"",createdAt:Date.now(),seed:true});
  add("income",850000,"Sueldo",1,"Sueldo neto");
  add("expense",384000,"Alquiler",5,"Alquiler mensual");
  add("expense",26400,"Súper",2,"Compra semanal");
  add("expense",31500,"Nafta",2,"Tanque lleno");
  add("expense",4200,"Restaurantes",3,"Café con Meli");
  add("expense",6500,"Entretenimiento",1,"Netflix");
  add("expense",18900,"Servicios",4,"Edenor");
  add("income",120000,"Freelance",3,"Trabajo diseño");
  for(let k=1;k<=5;k++){
    const pm = m-k<0 ? 12+(m-k) : m-k; const py = m-k<0 ? y-1 : y;
    add("income",850000,"Sueldo",1,"",pm,py);
    add("expense",380000+k*4000,"Alquiler",5,"",pm,py);
    add("expense",95000+((k*137)%40000),"Súper",8,"",pm,py);
    add("expense",42000+((k*211)%22000),"Nafta",12,"",pm,py);
    add("expense",30000+((k*97)%25000),"Restaurantes",15,"",pm,py);
    add("expense",18000+((k*53)%9000),"Servicios",18,"",pm,py);
  }

  const budgets = {};
  budgets[cid("Súper")]=140000; budgets[cid("Restaurantes")]=45000;
  budgets[cid("Nafta")]=60000; budgets[cid("Servicios")]=90000;
  budgets[cid("Entretenimiento")]=25000;

  const nowYM = ymOf(todayISO());
  const recurring = [
    {id:uid(),type:"expense",amount:384000,categoryId:cid("Alquiler"),note:"Alquiler mensual",day:5,lastYM:nowYM,seed:true},
    {id:uid(),type:"expense",amount:6500,categoryId:cid("Entretenimiento"),note:"Netflix",day:1,lastYM:nowYM,seed:true},
    {id:uid(),type:"income",amount:850000,categoryId:cid("Sueldo"),note:"Sueldo neto",day:1,lastYM:nowYM,seed:true},
  ];
  return {categories:cats, transactions:T, budgets, recurring, settings:{theme:"auto"}, seeded:true};
}

function runRecurring(){
  const nowYM = ymOf(todayISO());
  const today = new Date(); const dnum = today.getDate();
  let created=0;
  (state.recurring||[]).forEach(r=>{
    if(r.lastYM===nowYM) return;
    if(dnum < r.day) return;
    const [Y,M] = nowYM.split("-").map(Number);
    const day = Math.min(r.day, new Date(Y,M,0).getDate());
    const date = `${nowYM}-${String(day).padStart(2,"0")}`;
    state.transactions.push({id:uid(),type:r.type,amount:r.amount,categoryId:r.categoryId,date,note:r.note,createdAt:Date.now(),fromRecurring:r.id});
    r.lastYM = nowYM; created++;
  });
  if(created){ save(); }
}

const catById = id => state.categories.find(c=>c.id===id) || {name:"—",icon:"❓",color:"#8A908A",kind:"expense"};
const txOfMonth = ym => state.transactions.filter(t=>ymOf(t.date)===ym);
function monthTotals(ym){
  let inc=0,exp=0; txOfMonth(ym).forEach(t=> t.type==="income"?inc+=t.amount:exp+=t.amount);
  return {inc,exp,bal:inc-exp};
}
function monthLabel(ym){
  const [y,m]=ym.split("-").map(Number);
  const dt=new Date(y,m-1,1);
  const long = dt.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
  return {long, month: dt.toLocaleDateString('es-AR',{month:'long'}), year:y};
}
function relDay(iso){
  const t=new Date(iso+"T00:00:00"); const n=new Date(); n.setHours(0,0,0,0);
  const diff=Math.round((n-t)/86400000);
  if(diff===0) return "Hoy";
  if(diff===1) return "Ayer";
  return t.toLocaleDateString('es-AR',{weekday:'long', day:'numeric', month:'short'});
}
function shiftMonth(ym,delta){
  let [y,m]=ym.split("-").map(Number); m+=delta;
  while(m<1){m+=12;y--;} while(m>12){m-=12;y++;}
  return `${y}-${String(m).padStart(2,"0")}`;
}

const el = id => document.getElementById(id);
function render(){
  const {long}=monthLabel(ui.month);
  el("monthLabel").innerHTML = `${long}`;
  document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("on", a.dataset.tab===ui.tab));
  const v = el("view");
  v.innerHTML = ({home:viewHome, tx:viewTx, budget:viewBudget, reports:viewReports}[ui.tab])();
}

function viewHome(){
  const {inc,exp,bal}=monthTotals(ui.month);
  const txs = txOfMonth(ui.month).sort((a,b)=> b.date.localeCompare(a.date) || b.createdAt-a.createdAt);
  const recent = txs.slice(0,5);
  const budgeted = Object.values(state.budgets||{}).reduce((a,b)=>a+ (b||0),0);
  const spentBudgeted = txs.filter(t=>t.type==="expense" && state.budgets[t.categoryId]).reduce((a,t)=>a+t.amount,0);
  const pct = budgeted? Math.min(100, spentBudgeted/budgeted*100):0;
  const over = budgeted && spentBudgeted>budgeted;
  const warn = !over && pct>=80;

  let mini = "";
  if(budgeted>0){
    mini = `<div class="card bmini">
      <div class="row"><b>Presupuesto del mes</b><span>${money(spentBudgeted)} / ${money(budgeted)}</span></div>
      <div class="bar ${over?'over':warn?'warn':''}"><i style="width:${pct}%"></i></div>
      <div class="foot ${over?'over':''}">${over? '⚠️ Te pasaste por '+money(spentBudgeted-budgeted) : 'Te queda '+money(budgeted-spentBudgeted)}</div>
    </div>`;
  } else {
    mini = `<div class="card bmini"><div class="row"><b>Presupuesto del mes</b></div>
      <div class="foot">Todavía no cargaste presupuestos. <a data-action="goto-budget" style="color:var(--brand);font-weight:700">Definirlos →</a></div></div>`;
  }

  return `
    <div class="hero">
      <div class="lbl">Balance del mes</div>
      <div class="bal num ${bal<0?'neg':''}">${money(bal)}</div>
      <div class="sub">${bal>=0? 'Vas ahorrando este mes 🌱':'Gastaste más de lo que entró'}</div>
      <div class="flowrow">
        <div class="flow in"><div class="ic">↓</div><div><div class="k">Ingresos</div><div class="v num">${money(inc)}</div></div></div>
        <div class="flow out"><div class="ic">↑</div><div><div class="k">Gastos</div><div class="v num">${money(exp)}</div></div></div>
      </div>
    </div>
    ${mini}
    <div class="sec-title">Últimos movimientos ${txs.length>5?`<button data-action="goto-tx">Ver todos</button>`:''}</div>
    ${recent.length? `<div class="txlist">${recent.map(txRow).join("")}</div>`
      : `<div class="empty"><div class="em">🧾</div><p><b>Sin movimientos este mes</b></p><p>Tocá el botón + para cargar tu primer gasto o ingreso.</p></div>`}
  `;
}

function txRow(t){
  const c=catById(t.categoryId);
  const rec = t.fromRecurring? ` <span class="rec">🔁</span>`:"";
  return `<div class="tx" data-action="edit-tx" data-id="${t.id}">
    <div class="ci" style="background:${hexA(c.color,.16)};color:${c.color}">${c.icon}</div>
    <div class="mid"><div class="cat">${esc(c.name)}${rec}</div>${t.note?`<div class="note">${esc(t.note)}</div>`:''}</div>
    <div class="amt ${t.type==='income'?'in':'out'} num">${t.type==='income'?'+':'−'}${money(t.amount)}</div>
  </div>`;
}

function viewTx(){
  const txs = txOfMonth(ui.month).sort((a,b)=> b.date.localeCompare(a.date) || b.createdAt-a.createdAt);
  if(!txs.length) return `<div class="empty"><div class="em">🗂️</div><p><b>Nada por acá</b></p><p>No hay movimientos en ${monthLabel(ui.month).long}.</p></div>`;
  const groups={};
  txs.forEach(t=>{ (groups[t.date]=groups[t.date]||[]).push(t); });
  return Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(date=>{
    const day=groups[date];
    const net=day.reduce((a,t)=>a+(t.type==='income'?t.amount:-t.amount),0);
    return `<div class="daygroup">
      <div class="dayhead"><span class="d">${relDay(date)}</span><span class="t num" style="color:${net<0?'var(--expense)':'var(--income)'}">${net>=0?'+':'−'}${money(Math.abs(net))}</span></div>
      <div class="txlist">${day.map(txRow).join("")}</div>
    </div>`;
  }).join("");
}

function viewBudget(){
  const spentByCat = {};
  txOfMonth(ui.month).filter(t=>t.type==="expense").forEach(t=> spentByCat[t.categoryId]=(spentByCat[t.categoryId]||0)+t.amount);
  const expCats = state.categories.filter(c=>c.kind==="expense");
  const withB = expCats.filter(c=>state.budgets[c.id]>0);
  const totalB = withB.reduce((a,c)=>a+state.budgets[c.id],0);
  const totalS = withB.reduce((a,c)=>a+(spentByCat[c.id]||0),0);
  const others = expCats.filter(c=>!(state.budgets[c.id]>0));

  const rowB = c=>{
    const b=state.budgets[c.id], s=spentByCat[c.id]||0, pct=Math.min(100,s/b*100), over=s>b, warn=!over&&pct>=80;
    return `<div class="brow" data-action="set-budget" data-id="${c.id}">
      <div class="top">
        <div class="ci" style="background:${hexA(c.color,.16)};color:${c.color}">${c.icon}</div>
        <div class="nm">${esc(c.name)}</div>
        <div class="fig"><b class="num" style="color:${over?'var(--expense)':'inherit'}">${money(s)}</b><span class="num">de ${money(b)}</span></div>
      </div>
      <div class="bar ${over?'over':warn?'warn':''}"><i style="width:${pct}%"></i></div>
      ${over?`<div class="foot over" style="margin-top:7px;font-size:11.5px">Te pasaste ${money(s-b)}</div>`:''}
    </div>`;
  };
  const rowNo = c=>`<div class="brow noset" data-action="set-budget" data-id="${c.id}">
      <div class="top">
        <div class="ci" style="background:${hexA(c.color,.16)};color:${c.color}">${c.icon}</div>
        <div class="nm">${esc(c.name)}</div>
        <div class="fig"><b>+ Definir</b></div>
      </div></div>`;

  const totPct = totalB? Math.min(100,totalS/totalB*100):0; const totOver=totalS>totalB;
  return `
    ${totalB>0?`<div class="card bmini" style="margin-top:6px">
      <div class="row"><b>Total presupuestado</b><span class="num">${money(totalS)} / ${money(totalB)}</span></div>
      <div class="bar ${totOver?'over':totPct>=80?'warn':''}"><i style="width:${totPct}%"></i></div>
      <div class="foot ${totOver?'over':''}">${totOver?'Te pasaste '+money(totalS-totalB):'Disponible '+money(totalB-totalS)}</div>
    </div>`:`<div class="note-info" style="padding:8px 2px 4px">Definí cuánto querés gastar por categoría. Te aviso cuando te estés pasando.</div>`}
    ${withB.length?`<div class="sec-title">Con presupuesto</div><div class="card">${withB.map(rowB).join("")}</div>`:''}
    <div class="sec-title">${withB.length?'Otras categorías':'Elegí una categoría'}</div>
    <div class="card">${others.map(rowNo).join("")||'<div class="brow"><span style="color:var(--ink-faint)">Ya asignaste todas 🎉</span></div>'}</div>
  `;
}

function viewReports(){
  const ym=ui.month;
  const txs=txOfMonth(ym).filter(t=>t.type==="expense");
  const byCat={};
  txs.forEach(t=> byCat[t.categoryId]=(byCat[t.categoryId]||0)+t.amount);
  const total=Object.values(byCat).reduce((a,b)=>a+b,0);
  const items=Object.entries(byCat).map(([id,v])=>({c:catById(id),v})).sort((a,b)=>b.v-a.v);

  let donut="";
  if(total>0){
    const R=80, C=2*Math.PI*R; let off=0;
    const segs=items.map(it=>{
      const frac=it.v/total, len=C*frac;
      const s=`<circle r="${R}" cx="100" cy="100" fill="none" stroke="${it.c.color}" stroke-width="26"
        stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"/>`;
      off+=len; return s;
    }).join("");
    donut=`<div class="donut">
      <svg viewBox="0 0 200 200" width="200" height="200">
        <circle r="80" cx="100" cy="100" fill="none" stroke="var(--surface-3)" stroke-width="26"/>
        ${segs}
      </svg>
      <div class="center"><small>Gastos del mes</small><b class="num">${money(total)}</b></div>
    </div>`;
  }

  const months=[]; for(let i=5;i>=0;i--) months.push(shiftMonth(ym,-i));
  const evo=months.map(m=>({m, exp:monthTotals(m).exp, cur:m===ym}));
  const maxE=Math.max(1,...evo.map(e=>e.exp));

  return `
    <div class="seg">
      <button class="on">Por categoría</button>
    </div>
    ${total>0? `
      <div class="card">
        <div class="donut-wrap">${donut}</div>
        <div class="legend">
          ${items.map(it=>`<div class="lg" data-action="cat-report" data-id="${it.c.id}">
            <span class="dot" style="background:${it.c.color}"></span>
            <span class="nm">${it.c.icon} ${esc(it.c.name)}</span>
            <span class="pc num">${Math.round(it.v/total*100)}%</span>
            <span class="vl num">${money(it.v)}</span>
          </div>`).join("")}
        </div>
      </div>`
      : `<div class="empty"><div class="em">📊</div><p><b>Sin gastos este mes</b></p><p>Cargá movimientos para ver el desglose.</p></div>`}

    <div class="sec-title">Evolución de gastos</div>
    <div class="card evo">
      <div class="bars">
        ${evo.map(e=>{
          const h=Math.max(3, e.exp/maxE*100);
          const lab=new Date(e.m+"-01T00:00:00").toLocaleDateString('es-AR',{month:'short'});
          return `<div class="col" title="${money(e.exp)}">
            <div class="stack"><div class="b ${e.cur?'cur':''}" style="height:${h}%"></div></div>
            <div class="cl">${lab}</div>
          </div>`;
        }).join("")}
      </div>
      <div class="note-info" style="text-align:center;margin-top:10px">Barra verde = mes que estás viendo</div>
    </div>
  `;
}
