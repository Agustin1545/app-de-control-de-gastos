"use strict";
let draft=null;
function openTxSheet(existing){
  draft = existing ? {...existing} : {id:null,type:"expense",amount:"",categoryId:null,date:todayISO(),note:""};
  renderTxSheet();
}
function renderTxSheet(){
  const cats = state.categories.filter(c=>c.kind===draft.type);
  if(!draft.categoryId || !cats.find(c=>c.id===draft.categoryId)) draft.categoryId = cats[0]?.id || null;
  const body = `
    <div class="grab"></div>
    <h3>${draft.id?'Editar movimiento':'Nuevo movimiento'}<button class="x" data-close>×</button></h3>
    <div class="typetog">
      <button class="${draft.type==='expense'?'on-out':''}" data-dtype="expense">Gasto</button>
      <button class="${draft.type==='income'?'on-in':''}" data-dtype="income">Ingreso</button>
    </div>
    <div class="amtbox">
      <span class="cur">$</span><input id="dAmt" inputmode="decimal" placeholder="0" value="${draft.amount!==''&&draft.amount!=null?draft.amount:''}" autocomplete="off">
      <div class="barline"></div>
    </div>
    <div class="fld"><label>Categoría</label>
      <div class="catgrid">
        ${cats.map(c=>`<button class="catpick ${c.id===draft.categoryId?'on':''}" data-dcat="${c.id}">
          <span class="ci" style="background:${hexA(c.color,.16)};color:${c.color}">${c.icon}</span>
          <span class="cn">${esc(c.name)}</span></button>`).join("")}
        <button class="catpick add" data-action="new-cat-inline"><span class="ci">+</span><span class="cn">Nueva</span></button>
      </div>
    </div>
    <div class="row2">
      <div class="fld"><label>Fecha</label><input type="date" id="dDate" value="${draft.date}"></div>
      <div class="fld"><label>Nota (opcional)</label><input type="text" id="dNote" value="${esc(draft.note||'')}" placeholder="Ej: compra semanal"></div>
    </div>
    <button class="btn" id="dSave" data-action="save-tx">${draft.id?'Guardar cambios':'Agregar'}</button>
    ${draft.id?`<div class="btnrow"><button class="btn danger" data-action="del-tx">Eliminar movimiento</button></div>`:''}
  `;
  showSheet(body);
  el("dAmt").addEventListener("input",e=>{ draft.amount=e.target.value.replace(/[^\d.,]/g,""); });
  el("dDate").addEventListener("change",e=> draft.date=e.target.value);
  el("dNote").addEventListener("input",e=> draft.note=e.target.value);
  if(!draft.id) setTimeout(()=>el("dAmt").focus(),320);
}
function parseAmt(v){ if(v==null) return NaN; return parseFloat(String(v).replace(/\./g,"").replace(",",".")); }
function saveTx(){
  const amt=parseAmt(draft.amount);
  if(!(amt>0)){ toast("Ingresá un monto válido"); el("dAmt").focus(); return; }
  if(!draft.categoryId){ toast("Elegí una categoría"); return; }
  if(draft.id){
    const t=state.transactions.find(x=>x.id===draft.id);
    Object.assign(t,{type:draft.type,amount:amt,categoryId:draft.categoryId,date:draft.date,note:draft.note.trim()});
    toast("Movimiento actualizado ✓");
  }else{
    state.transactions.push({id:uid(),type:draft.type,amount:amt,categoryId:draft.categoryId,date:draft.date,note:draft.note.trim(),createdAt:Date.now()});
    toast(draft.type==='income'?"Ingreso agregado ✓":"Gasto agregado ✓");
  }
  ui.month = ymOf(draft.date);
  save(); closeSheet(); render();
}
function delTx(){
  state.transactions = state.transactions.filter(t=>t.id!==draft.id);
  save(); closeSheet(); render(); toast("Eliminado");
}

function openBudgetSheet(catId){
  const c=catById(catId); const cur=state.budgets[catId]||"";
  const body=`<div class="grab"></div>
    <h3>Presupuesto<button class="x" data-close>×</button></h3>
    <div class="fld" style="text-align:center;margin-bottom:10px">
      <div class="ci" style="width:52px;height:52px;border-radius:15px;margin:0 auto 8px;display:grid;place-items:center;font-size:26px;background:${hexA(c.color,.16)};color:${c.color}">${c.icon}</div>
      <div style="font-family:var(--dsp);font-weight:700;font-size:17px">${esc(c.name)}</div>
    </div>
    <div class="fld"><label>Límite mensual (dejá en 0 para quitar)</label>
      <input type="text" inputmode="decimal" id="bAmt" value="${cur}" placeholder="0" autocomplete="off"></div>
    <button class="btn" data-action="save-budget" data-id="${catId}">Guardar</button>`;
  showSheet(body);
  setTimeout(()=>el("bAmt").focus(),320);
}
function saveBudget(catId){
  const v=parseAmt(el("bAmt").value);
  if(!v || v<=0) delete state.budgets[catId];
  else state.budgets[catId]=v;
  save(); closeSheet(); render(); toast("Presupuesto guardado ✓");
}

const EMOJIS=["🛒","🍔","🍕","🍜","☕","🥗","🍺","🍷","🚌","🚗","⛽","🚕","✈️","🏠","🏢","💡","🔌","📱","💻","🖥️","💊","🏥","🩺","👕","👟","💄","🎬","🎮","🎧","📚","✏️","🎓","🐾","🌱","🎁","🎉","💐","🏖️","🏋️","⚽","🎸","💰","💼","🏷️","📈","💳","🎯","🔧","🧾","🍎","🥑","🧴","🚿","🧹","💈","🎂","📦","➕"];
const COLORS=["#4CAF7D","#178A5A","#2E9E8F","#3FA9A0","#4C8FE0","#5EA0B8","#8E7CDD","#B45CC9","#D65D6E","#E06A8C","#C2603F","#E5893B","#D9A93B","#B98A4E","#647587","#8A908A"];
let catDraft=null;
function openCatManager(){
  const list = k => state.categories.filter(c=>c.kind===k).map(c=>`
    <div class="mitem">
      <div class="ci" style="background:${hexA(c.color,.16)};color:${c.color}">${c.icon}</div>
      <div class="nm">${esc(c.name)}</div>
      <button class="del" data-action="del-cat" data-id="${c.id}" aria-label="Eliminar">🗑</button>
    </div>`).join("");
  const body=`<div class="grab"></div>
    <h3>Categorías<button class="x" data-close>×</button></h3>
    <div class="sec-title" style="margin-top:4px">Gastos <button data-action="new-cat" data-kind="expense">+ Nueva</button></div>
    <div class="mlist">${list("expense")}</div>
    <div class="sec-title">Ingresos <button data-action="new-cat" data-kind="income">+ Nueva</button></div>
    <div class="mlist">${list("income")}</div>
    <div class="note-info" style="margin-top:14px">Al eliminar una categoría, sus movimientos pasan a "Otros".</div>`;
  showSheet(body);
}
function openCatEdit(kind){
  catDraft={name:"",icon:EMOJIS[0],color:COLORS[0],kind};
  const body=`<div class="grab"></div>
    <h3>Nueva categoría<button class="x" data-close>×</button></h3>
    <div class="fld"><label>Nombre</label><input type="text" id="cName" placeholder="Ej: Farmacia" autocomplete="off"></div>
    <div class="fld"><label>Ícono</label><div class="emojigrid" id="cEmoji">
      ${EMOJIS.map(e=>`<button data-emoji="${e}" class="${e===catDraft.icon?'on':''}">${e}</button>`).join("")}
    </div></div>
    <div class="fld"><label>Color</label><div class="colorgrid" id="cColor">
      ${COLORS.map(c=>`<button data-color="${c}" style="background:${c}" class="${c===catDraft.color?'on':''}"></button>`).join("")}
    </div></div>
    <button class="btn" data-action="save-cat">Crear categoría</button>`;
  showSheet(body);
  setTimeout(()=>el("cName")?.focus(),320);
}
function saveCat(){
  const name=el("cName").value.trim();
  if(!name){ toast("Poné un nombre"); return; }
  const c={id:uid(),name,icon:catDraft.icon,color:catDraft.color,kind:catDraft.kind};
  state.categories.push(c); save();
  if(draft){ draft.categoryId=c.id; closeSheet(); renderTxSheet(); }
  else { closeSheet(); openCatManager(); }
  toast("Categoría creada ✓");
}
function delCat(id){
  const c=catById(id);
  const others=state.categories.find(x=>x.name==="Otros"&&x.kind===c.kind) || state.categories.find(x=>x.kind===c.kind && x.id!==id);
  state.transactions.forEach(t=>{ if(t.categoryId===id) t.categoryId=others?others.id:id; });
  delete state.budgets[id];
  (state.recurring||[]).forEach(r=>{ if(r.categoryId===id && others) r.categoryId=others.id; });
  state.categories=state.categories.filter(x=>x.id!==id);
  save(); openCatManager(); render();
}

let recDraft=null;
function openRecurring(){
  const list=(state.recurring||[]).map(r=>{
    const c=catById(r.categoryId);
    return `<div class="mitem">
      <div class="ci" style="background:${hexA(c.color,.16)};color:${c.color}">${c.icon}</div>
      <div class="nm">${esc(r.note||c.name)}<div class="sub num">${r.type==='income'?'+':'−'}${money(r.amount)} · día ${r.day}</div></div>
      <button class="del" data-action="del-rec" data-id="${r.id}" aria-label="Eliminar">🗑</button>
    </div>`;
  }).join("");
  const body=`<div class="grab"></div>
    <h3>Recurrentes 🔁<button class="x" data-close>×</button></h3>
    <div class="note-info" style="margin-bottom:12px">Se agregan solos cada mes (sueldos, alquiler, suscripciones).</div>
    <div class="mlist">${list||'<div class="mitem"><span style="color:var(--ink-faint)">Todavía no tenés recurrentes</span></div>'}</div>
    <div class="btnrow" style="margin-top:14px"><button class="btn" data-action="new-rec">+ Nuevo recurrente</button></div>`;
  showSheet(body);
}
function openRecEdit(){
  recDraft={type:"expense",amount:"",categoryId:null,note:"",day:1};
  renderRecEdit();
}
function renderRecEdit(){
  const cats=state.categories.filter(c=>c.kind===recDraft.type);
  if(!recDraft.categoryId||!cats.find(c=>c.id===recDraft.categoryId)) recDraft.categoryId=cats[0]?.id;
  const body=`<div class="grab"></div>
    <h3>Nuevo recurrente<button class="x" data-close>×</button></h3>
    <div class="typetog">
      <button class="${recDraft.type==='expense'?'on-out':''}" data-rtype="expense">Gasto fijo</button>
      <button class="${recDraft.type==='income'?'on-in':''}" data-rtype="income">Ingreso fijo</button>
    </div>
    <div class="amtbox"><span class="cur">$</span><input id="rAmt" inputmode="decimal" placeholder="0" value="${recDraft.amount||''}"><div class="barline"></div></div>
    <div class="fld"><label>Categoría</label><select id="rCat">
      ${cats.map(c=>`<option value="${c.id}" ${c.id===recDraft.categoryId?'selected':''}>${c.icon} ${esc(c.name)}</option>`).join("")}
    </select></div>
    <div class="row2">
      <div class="fld"><label>Día del mes</label><input type="number" id="rDay" min="1" max="31" value="${recDraft.day}"></div>
      <div class="fld"><label>Nombre</label><input type="text" id="rNote" placeholder="Ej: Alquiler" value="${esc(recDraft.note)}"></div>
    </div>
    <button class="btn" data-action="save-rec">Guardar recurrente</button>`;
  showSheet(body);
}
function saveRec(){
  const amt=parseAmt(el("rAmt").value); if(!(amt>0)){toast("Monto inválido");return;}
  const day=Math.min(31,Math.max(1,parseInt(el("rDay").value)||1));
  state.recurring=state.recurring||[];
  state.recurring.push({id:uid(),type:recDraft.type,amount:amt,categoryId:el("rCat").value,note:el("rNote").value.trim(),day,lastYM:""});
  save(); runRecurring(); closeSheet(); openRecurring(); render(); toast("Recurrente guardado ✓");
}

function openSettings(){
  const th=state.settings?.theme||"auto";
  const body=`<div class="grab"></div>
    <h3>Ajustes<button class="x" data-close>×</button></h3>
    <div class="sec-title" style="margin-top:2px">Apariencia</div>
    <div class="seg">
      ${["auto","light","dark"].map(t=>`<button class="${th===t?'on':''}" data-theme-set="${t}">${({auto:'Auto',light:'Claro',dark:'Oscuro'})[t]}</button>`).join("")}
    </div>
    <div class="sec-title">Categorías</div>
    <div class="card"><div class="mitem" data-action="open-cats" style="border-radius:var(--r)"><div class="ci" style="background:var(--brand-soft);color:var(--brand)">🏷️</div><div class="nm">Administrar categorías</div><span style="color:var(--ink-faint)">›</span></div></div>
    <div class="sec-title">Tus datos</div>
    <div class="note-info" style="margin-bottom:10px">Todo se guarda solo en este teléfono. Copiá el respaldo de vez en cuando y guardalo (mail, notas). Para pasar a otro teléfono, pegá ese texto en "Restaurar".</div>
    <div class="btnrow"><button class="btn ghost" data-action="backup">📋 Copiar respaldo</button><button class="btn ghost" data-action="restore">📥 Restaurar</button></div>
    ${state.seeded?`<div class="btnrow" style="margin-top:10px"><button class="btn ghost" data-action="clear-samples">🧹 Borrar datos de ejemplo</button></div>`:''}
    <div class="btnrow" style="margin-top:10px"><button class="btn danger" data-action="wipe">Borrar todo y empezar de cero</button></div>
    <div class="note-info" style="text-align:center;margin-top:16px;color:var(--ink-faint)">Peso a Peso · v1 · hecho para vos</div>`;
  showSheet(body);
}
function setTheme(t){
  state.settings=state.settings||{}; state.settings.theme=t; save();
  applyTheme(); openSettings();
}
function applyTheme(){
  const t=state.settings?.theme||"auto";
  if(t==="auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme",t);
}
function backup(){
  const text=JSON.stringify(state);
  navigator.clipboard?.writeText(text).then(()=>toast("Respaldo copiado 📋"),()=>promptCopy(text));
}
function promptCopy(text){
  const body=`<div class="grab"></div><h3>Respaldo<button class="x" data-close>×</button></h3>
    <div class="note-info" style="margin-bottom:8px">Copiá todo este texto y guardalo:</div>
    <textarea class="inp" rows="6" readonly onclick="this.select()">${esc(text)}</textarea>`;
  showSheet(body);
}
function restore(){
  const body=`<div class="grab"></div><h3>Restaurar datos<button class="x" data-close>×</button></h3>
    <div class="note-info" style="margin-bottom:8px">Pegá acá el texto de respaldo. Reemplaza los datos actuales.</div>
    <textarea class="inp" id="restoreTxt" rows="6" placeholder="Pegá el respaldo..."></textarea>
    <button class="btn" data-action="do-restore" style="margin-top:12px">Restaurar</button>`;
  showSheet(body);
}
function doRestore(){
  try{
    const d=JSON.parse(el("restoreTxt").value.trim());
    if(!d.transactions||!d.categories) throw 0;
    state=d; state.settings=state.settings||{theme:"auto"};
    save(); applyTheme(); closeSheet(); render(); toast("Datos restaurados ✓");
  }catch(e){ toast("El texto no es válido 😕"); }
}
function clearSamples(){
  state.transactions=state.transactions.filter(t=>!t.seed);
  state.recurring=(state.recurring||[]).filter(r=>!r.seed);
  state.seeded=false; save(); closeSheet(); render(); toast("Ejemplos borrados ✓");
}
function wipe(){
  if(!confirm("¿Seguro? Se borra TODO (movimientos, categorías, presupuestos) y no se puede deshacer.")) return;
  localStorage.removeItem(KEY); state=seed(); state.seeded=false; state.transactions=[]; state.recurring=[];
  save(); closeSheet(); render(); toast("Todo borrado");
}

function showSheet(html){
  closeSheet(true);
  const root=el("modalRoot");
  root.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  requestAnimationFrame(()=>{ root.querySelector(".scrim").classList.add("show"); root.querySelector(".sheet").classList.add("show"); });
}
function closeSheet(instant){
  const root=el("modalRoot"); const sh=root.querySelector(".sheet"), sc=root.querySelector(".scrim");
  if(!sh){ return; }
  if(instant){ root.innerHTML=""; return; }
  draft=null; catDraft=null; recDraft=null;
  sh.classList.remove("show"); sc.classList.remove("show");
  setTimeout(()=>root.innerHTML="",260);
}

let toastT;
function toast(msg){ const t=el("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),1900); }

function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
function hexA(hex,a){ const h=hex.replace("#",""); const n=parseInt(h.length===3?h.split("").map(x=>x+x).join(""):h,16); const r=(n>>16)&255,g=(n>>8)&255,b=n&255; return `rgba(${r},${g},${b},${a})`; }

document.addEventListener("click",e=>{
  const nav=e.target.closest("#nav a"); if(nav){ ui.tab=nav.dataset.tab; render(); return; }
  const t=e.target.closest("[data-action], [data-close], [data-dtype], [data-dcat], [data-rtype], [data-emoji], [data-color], [data-theme-set]");
  if(!t) return;
  if(t.hasAttribute("data-close")){ closeSheet(); return; }

  if(t.dataset.dtype){ draft.type=t.dataset.dtype; renderTxSheet(); return; }
  if(t.dataset.dcat){ if(draft){ draft.categoryId=t.dataset.dcat; } document.querySelectorAll('.catpick[data-dcat]').forEach(b=>b.classList.toggle('on', b.dataset.dcat===t.dataset.dcat)); return; }
  if(t.dataset.rtype){ recDraft.type=t.dataset.rtype; recDraft.amount=parseAmt(el("rAmt")?.value)||recDraft.amount; renderRecEdit(); return; }
  if(t.dataset.emoji){ catDraft.icon=t.dataset.emoji; document.querySelectorAll("#cEmoji button").forEach(b=>b.classList.toggle("on",b.dataset.emoji===catDraft.icon)); return; }
  if(t.dataset.color){ catDraft.color=t.dataset.color; document.querySelectorAll("#cColor button").forEach(b=>b.classList.toggle("on",b.dataset.color===catDraft.color)); return; }
  if(t.dataset.themeSet){ setTheme(t.dataset.themeSet); return; }

  const a=t.dataset.action;
  switch(a){
    case "month-prev": ui.month=shiftMonth(ui.month,-1); render(); break;
    case "month-next": ui.month=shiftMonth(ui.month, 1); render(); break;
    case "add": openTxSheet(null); break;
    case "edit-tx": openTxSheet(state.transactions.find(x=>x.id===t.dataset.id)); break;
    case "save-tx": saveTx(); break;
    case "del-tx": delTx(); break;
    case "goto-tx": ui.tab="tx"; render(); break;
    case "goto-budget": case "cat-report": ui.tab= a==="cat-report"?"tx":"budget"; render(); break;
    case "set-budget": openBudgetSheet(t.dataset.id); break;
    case "save-budget": saveBudget(t.dataset.id); break;
    case "open-recurring": openRecurring(); break;
    case "new-rec": openRecEdit(); break;
    case "save-rec": saveRec(); break;
    case "del-rec": state.recurring=state.recurring.filter(r=>r.id!==t.dataset.id); save(); openRecurring(); break;
    case "open-settings": openSettings(); break;
    case "open-cats": openCatManager(); break;
    case "new-cat": openCatEdit(t.dataset.kind); break;
    case "new-cat-inline": openCatEdit(draft.type); break;
    case "save-cat": saveCat(); break;
    case "del-cat": delCat(t.dataset.id); break;
    case "backup": backup(); break;
    case "restore": restore(); break;
    case "do-restore": doRestore(); break;
    case "clear-samples": clearSamples(); break;
    case "wipe": wipe(); break;
  }
});

applyTheme();
runRecurring();
render();
