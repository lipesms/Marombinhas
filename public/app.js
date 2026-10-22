(() => {
'use strict';

/* ================= utilidades ================= */
const app = document.getElementById('app');
const sheetRoot = document.getElementById('sheet-root');
const $ = (s, el = document) => el.querySelector(s);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtN = (n, dec = 0) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
const parseNum = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; };
const fieldVal = (n) => String(n || 0).replace('.', ',');
const clone = (o) => JSON.parse(JSON.stringify(o));
const RESERVED = ['api', 'u', 'app', 'admin', 'login', 'entrar', 'criar', 'static', 'public', 'assets', 'logo', 'logo-sm', 'favicon', 'index', 'style', 'healthz', 'robots', 'sitemap', 'www', 'home', 'sobre', 'ajuda', 'exercicios', 'evolucao', 'treino', 'treinos', 'receitas', 'cardapio', 'cardapios'];
const normalizeSlug = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/g, '');
const validSlug = (s) => /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(s) && !RESERVED.includes(s);

const TYPES = [['cafe', 'Café da manhã'], ['almoco', 'Almoço'], ['lanche', 'Lanche'], ['jantar', 'Jantar'], ['ceia', 'Ceia']];
const TYPE_LABEL = { cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar', ceia: 'Ceia', outro: 'Refeição' };
const autoType = () => { const h = new Date().getHours(); return h < 10 ? 'cafe' : h < 14 ? 'almoco' : h < 18 ? 'lanche' : h < 22 ? 'jantar' : 'ceia'; };

const ICONS = {
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2-.5-3 0-5 1-8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
  bars: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  fork: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 4-3 7h3v11"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
};
const icon = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

const LOGO = '<img class="logo" src="/logo-sm.png" width="36" height="36" alt="">';

let T = null;
let R = null; // módulo do cardápio (receitas.js) // módulo de treinos (treino.js), criado depois que api() e toast() existirem

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

async function api(method, url, body) {
  let r;
  try {
    r = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Sem conexão. Confira a internet e tente de novo.');
  }
  let data = null;
  try { data = await r.json(); } catch { /* resposta sem corpo */ }
  if (!r.ok) {
    const fallback = r.status === 413 ? 'As fotos ficaram grandes demais. Envie menos fotos ou fotos menores.' : `Algo deu errado (erro ${r.status}). Tente de novo.`;
    throw Object.assign(new Error((data && data.error) || fallback), { status: r.status });
  }
  return data;
}

T = window.createTreino({ esc, api, toast, icon, logo: LOGO, app });
R = window.createReceitas({ esc, api, toast, icon, logo: LOGO, app }, T.photo);

/* ================= estado ================= */
const state = { code: null, goals: null, profile: null, meals: [], date: today(), tab: 'hoje' };
let draft = null;
let calcResult = null;

/* ================= cálculos ================= */
const dayMeals = (date) => state.meals.filter((m) => m.date === date).sort((a, b) => a.time.localeCompare(b.time));
const sumMeals = (list) => list.reduce((t, m) => ({ kcal: t.kcal + m.kcal, p: t.p + m.p, c: t.c + m.c, f: t.f + m.f, fi: t.fi + (m.fi || 0) }), { kcal: 0, p: 0, c: 0, f: 0, fi: 0 });
const sumItems = (items) => items.reduce((t, i) => ({ kcal: t.kcal + (+i.kcal || 0), p: t.p + (+i.p || 0), c: t.c + (+i.c || 0), f: t.f + (+i.f || 0), fi: t.fi + (+i.fi || 0) }), { kcal: 0, p: 0, c: 0, f: 0, fi: 0 });

function streak() {
  const set = new Set(state.meals.map((m) => m.date));
  let d = today();
  if (!set.has(d)) d = addDays(d, -1);
  let n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

function suggestGoals(p) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
  let kcal = bmr * Number(p.activity);
  if (p.objective === 'perder') kcal -= 500;
  if (p.objective === 'ganhar') kcal += 300;
  kcal = Math.max(p.sex === 'f' ? 1200 : 1500, Math.round(kcal / 10) * 10);
  const protein = Math.round(p.weight * (p.objective === 'perder' ? 2.0 : 1.8));
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((kcal / 1000) * 14);
  return { kcal, protein, carbs, fat, fiber };
}

/* ================= componentes ================= */
function ring(consumed, goal) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const over = goal > 0 && consumed > goal * 1.05;
  return `<svg viewBox="0 0 168 168" role="img" aria-label="${fmtN(consumed)} de ${fmtN(goal)} calorias">
    <circle class="ring-bg" cx="84" cy="84" r="${r}"/>
    <circle class="ring-fg${over ? ' over' : ''}" cx="84" cy="84" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 84 84)"/>
  </svg>`;
}

function macroRow(label, val, goal, color) {
  const pct = goal > 0 ? Math.min(100, (val / goal) * 100) : 0;
  return `<div class="macro"><div class="macro-head"><span>${label}</span><span class="num"><b>${fmtN(val)}</b> / ${fmtN(goal)} g</span></div><div class="bar"><i style="width:${pct.toFixed(1)}%;background:var(${color})"></i></div></div>`;
}

function dayLabel(date) {
  const t = today();
  const long = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseYmd(date));
  if (date === t) return ['Hoje', long];
  if (date === addDays(t, -1)) return ['Ontem', long];
  return [long, ''];
}

/* ================= telas ================= */
function topbar() {
  const s = streak();
  return `<div class="top"><a class="brand" href="/" aria-label="Marombinhas, ir para o início">${LOGO}Marombinhas</a>
    <div class="streak${s ? ' on' : ''}" title="Dias seguidos com refeições registradas">${icon('flame', 18)}<span class="num">${s} ${s === 1 ? 'dia' : 'dias'}</span></div></div>`;
}

function viewHoje() {
  const g = state.goals;
  const list = dayMeals(state.date);
  const t = sumMeals(list);
  const rem = Math.round(g.kcal - t.kcal);
  const over = rem < 0 && t.kcal > g.kcal * 1.05;
  const [l1, l2] = dayLabel(state.date);
  const meals = list.length
    ? list.map((m) => `<button class="meal" data-action="open-meal" data-id="${esc(m.id)}">
        <div class="th">${m.thumb ? `<img src="${esc(m.thumb)}" alt="">` : icon('fork', 24)}</div>
        <div class="meal-main">
          <div class="meal-title">${esc(m.name)}</div>
          <div class="meal-meta">${esc(TYPE_LABEL[m.type] || 'Refeição')} · ${esc(m.time)}</div>
          <div class="meal-macros num"><span><i class="dot p"></i>${fmtN(m.p)}P</span><span><i class="dot c"></i>${fmtN(m.c)}C</span><span><i class="dot f"></i>${fmtN(m.f)}G</span></div>
        </div>
        <div class="meal-kcal num"><b>${fmtN(m.kcal)}</b><small>kcal</small></div>
      </button>`).join('')
    : `<div class="card empty"><b>Nada registrado ${state.date === today() ? 'hoje' : 'neste dia'}</b>Conte o que você comeu ou mande uma foto do prato.</div>`;
  return `${topbar()}
    <div class="datenav">
      <button class="icon-btn" data-action="prev-day" aria-label="Dia anterior">${icon('left')}</button>
      <div class="mid"><b>${esc(l1)}</b>${l2 ? `<span>${esc(l2)}</span>` : ''}</div>
      <button class="icon-btn" data-action="next-day" aria-label="Próximo dia" ${state.date >= today() ? 'disabled' : ''}>${icon('right')}</button>
    </div>
    <section class="card sum" aria-label="Calorias do dia">
      <div class="ring">${ring(t.kcal, g.kcal)}<div class="ring-mid num${over ? ' over' : ''}"><b>${fmtN(Math.abs(rem))}</b><span>${rem >= 0 ? 'kcal restantes' : 'kcal acima da meta'}</span></div></div>
      <div class="sum-side">
        <div class="stat"><small>Consumido</small><b class="num">${fmtN(t.kcal)}<i>kcal</i></b></div>
        <div class="stat"><small>Meta</small><b class="num">${fmtN(g.kcal)}<i>kcal</i></b></div>
      </div>
    </section>
    <section class="card macros" aria-label="Macronutrientes">
      ${macroRow('Proteínas', t.p, g.protein, '--protein')}
      ${macroRow('Carboidratos', t.c, g.carbs, '--carbs')}
      ${macroRow('Gorduras', t.f, g.fat, '--fat')}
      ${g.fiber ? macroRow('Fibras', t.fi, g.fiber, '--fiber') : ''}
    </section>
    <div class="sec"><h2>Refeições</h2><span class="num">${list.length ? `${list.length} ${list.length === 1 ? 'registro' : 'registros'}` : ''}</span></div>
    <div class="meals">${meals}</div>`;
}

function viewSemana() {
  const g = state.goals;
  const H = 150;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today(), -i);
    const list = dayMeals(d);
    days.push({ d, n: list.length, ...sumMeals(list) });
  }
  const max = Math.max(g.kcal * 1.25, ...days.map((x) => x.kcal), 1);
  const cols = days.map((x) => {
    const h = Math.round((x.kcal / max) * H);
    const cls = !x.n ? 'empty' : x.kcal > g.kcal * 1.1 ? 'over' : x.kcal >= g.kcal * 0.9 ? 'hit' : '';
    const v = x.kcal >= 1000 ? `${fmtN(x.kcal / 1000, 1)}k` : fmtN(x.kcal);
    return `<button class="col ${cls}" style="--h:${h}px" data-action="go-day" data-date="${x.d}" aria-label="${esc(dayLabel(x.d)[0])}: ${fmtN(x.kcal)} kcal"><span class="v num">${v}</span><i></i></button>`;
  }).join('');
  const labels = days.map((x) => {
    const w = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(parseYmd(x.d)).replace('.', '');
    return `<span class="${x.d === today() ? 'today' : ''}">${esc(w)}</span>`;
  }).join('');
  const logged = days.filter((x) => x.n > 0);
  const avg = (k) => (logged.length ? logged.reduce((a, x) => a + x[k], 0) / logged.length : 0);
  const hits = logged.filter((x) => x.kcal >= g.kcal * 0.9 && x.kcal <= g.kcal * 1.1).length;
  return `${topbar()}
    <h1 class="page-title">Últimos 7 dias</h1>
    <section class="card">
      <div class="wk-area">
        <div class="wk-goal" style="bottom:${Math.round((g.kcal / max) * H)}px"><span class="num">meta ${fmtN(g.kcal)}</span></div>
        <div class="wk">${cols}</div>
      </div>
      <div class="wk-days">${labels}</div>
      <div class="legend"><span><i style="background:var(--ok)"></i>dentro da meta (±10%)</span><span><i style="background:var(--kcal)"></i>abaixo</span><span><i style="background:var(--over)"></i>acima</span></div>
    </section>
    <div class="stats">
      <div class="card stat"><small>Média diária</small><b class="num">${fmtN(avg('kcal'))}<i>kcal</i></b></div>
      <div class="card stat"><small>Proteína média</small><b class="num">${fmtN(avg('p'))}<i>g</i></b></div>
      <div class="card stat"><small>Dias registrados</small><b class="num">${logged.length}<i>de 7</i></b></div>
      <div class="card stat"><small>Dias na meta</small><b class="num">${hits}<i>de ${logged.length}</i></b></div>
    </div>
    <p class="small" style="padding:0 2px">Toque em uma barra para abrir aquele dia.</p>`;
}

function viewMetas() {
  const g = state.goals || { kcal: 2000, protein: 120, carbs: 230, fat: 65, fiber: 25 };
  const p = state.profile || {};
  const link = `${location.origin}/${state.code}`;
  const unit = (id, label, val) => `<label class="field"><span>${label}</span><div class="with-unit"><input class="in suffix num" id="${id}" inputmode="numeric" value="${esc(val)}"><em>g</em></div></label>`;
  return `${topbar()}
    <h1 class="page-title">Suas metas</h1>
    ${state.goals ? '' : '<div class="welcome"><b>Bem-vindo ao Marombinhas!</b>Defina suas metas diárias para começar. Se não souber por onde começar, use o cálculo abaixo.</div>'}
    <section class="card">
      <div class="goals-grid">
        <label class="field wide"><span>Calorias por dia</span><div class="with-unit"><input class="in kcal-input num" id="g-kcal" inputmode="numeric" value="${esc(g.kcal)}"><em>kcal</em></div></label>
        ${unit('g-protein', 'Proteínas', g.protein)}
        ${unit('g-carbs', 'Carboidratos', g.carbs)}
        ${unit('g-fat', 'Gorduras', g.fat)}
        ${unit('g-fiber', 'Fibras', g.fiber)}
      </div>
    </section>
    <details class="card" ${state.goals ? '' : 'open'}>
      <summary>Calcular para mim</summary>
      <div class="calc-grid">
        <label class="field"><span>Sexo</span><select class="in" id="c-sex"><option value="m" ${p.sex !== 'f' ? 'selected' : ''}>Masculino</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>Feminino</option></select></label>
        <label class="field"><span>Idade</span><input class="in num" id="c-age" inputmode="numeric" value="${esc(p.age || '')}" placeholder="anos"></label>
        <label class="field"><span>Peso</span><input class="in num" id="c-weight" inputmode="decimal" value="${esc(p.weight ? fieldVal(p.weight) : '')}" placeholder="kg"></label>
        <label class="field"><span>Altura</span><input class="in num" id="c-height" inputmode="numeric" value="${esc(p.height || '')}" placeholder="cm"></label>
        <label class="field"><span>Atividade física</span><select class="in" id="c-activity">
          ${[['1.2', 'Quase nenhuma'], ['1.375', 'Leve (1–3x/sem)'], ['1.55', 'Moderada (3–5x/sem)'], ['1.725', 'Intensa (6–7x/sem)']].map(([v, l]) => `<option value="${v}" ${(p.activity || '1.375') === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></label>
        <label class="field"><span>Objetivo</span><select class="in" id="c-objective">
          ${[['perder', 'Perder peso'], ['manter', 'Manter peso'], ['ganhar', 'Ganhar massa']].map(([v, l]) => `<option value="${v}" ${(p.objective || 'manter') === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></label>
      </div>
      <div style="margin-top:14px"><button class="btn ghost big" data-action="calc">Calcular</button></div>
      <div id="calc-result"></div>
      <p class="small" style="margin-top:12px">Estimativa pela fórmula de Mifflin-St Jeor. Não substitui a orientação de um nutricionista.</p>
    </details>
    <button class="btn primary big" data-action="save-goals">Salvar metas</button>
    <section class="card">
      <h3 style="font-size:1.05rem">Seu endereço</h3>
      <p class="small" style="margin-top:4px">Este é o seu acesso: não existe senha. Qualquer pessoa que souber este endereço consegue ver e editar seu painel. Se quiser mais privacidade, apague e crie de novo com um nome menos óbvio, como <b>${esc(state.code)}-x7k</b>.</p>
      <div class="linkbox"><input class="in" id="my-link" readonly value="${esc(link)}" aria-label="Seu endereço"><button class="btn ghost" data-action="copy-link" aria-label="Copiar endereço">${icon('copy', 18)}</button></div>
    </section>
    <button class="btn danger" data-action="delete-account">Apagar todos os meus dados</button>
    <p class="small" style="padding:0 2px">As estimativas de calorias feitas por IA podem errar. Ajuste os valores sempre que souber os números reais.</p>`;
}

function nav() {
  const tabs = [['hoje', 'Hoje', 'plate'], ['semana', 'Semana', 'bars'], ['treinos', 'Treinos', 'dumbbell'], ['metas', 'Metas', 'target'], ['cardapio', 'Cardápio', 'book']];
  return `<nav class="nav" aria-label="Principal"><div class="nav-in">${tabs.map(([k, l, i]) =>
    `<button data-action="tab" data-tab="${k}" ${state.tab === k ? 'aria-current="page"' : ''}>${icon(i, 22)}${l}</button>`).join('')}</div></nav>`;
}

function viewTreinos() {
  return `${topbar()}<div id="t-root"></div>`;
}

function viewCardapio() {
  return `${topbar()}<div id="r-root"></div>`;
}

function render() {
  const view = state.tab === 'hoje' ? viewHoje() : state.tab === 'semana' ? viewSemana() : state.tab === 'treinos' ? viewTreinos() : state.tab === 'cardapio' ? viewCardapio() : viewMetas();
  const fab = state.goals && (state.tab === 'hoje' || state.tab === 'semana') ? `<button class="fab" data-action="open-add">${icon('plus', 22)}Registrar refeição</button>` : '';
  app.innerHTML = `<div class="shell">${view}</div>${nav()}${fab}`;
  if (state.tab === 'treinos') T.mountTab(state.code);
  if (state.tab === 'cardapio') R.mountTab(state.code);
}

/* ================= folha de registro ================= */
const newDraft = () => ({ mode: 'new', step: 'input', id: null, type: autoType(), date: state.date, time: nowHM(), text: '', images: [], items: [], note: '', thumb: null, source: 'ia' });
const editDraft = (m) => ({ mode: 'edit', step: 'review', id: m.id, type: m.type, date: m.date, time: m.time, text: '', images: [], items: clone(m.items), note: '', thumb: null, source: m.source });

function openSheet(d) {
  draft = d;
  document.body.classList.add('lock');
  renderSheet();
}
function closeSheet() {
  draft = null;
  sheetRoot.innerHTML = '';
  document.body.classList.remove('lock');
}

function totalsHtml(t) {
  return `<div class="tot-main"><b class="num">${fmtN(t.kcal)}</b><span>kcal</span></div>
    <div class="tot-macros num"><span><i class="dot p"></i>${fmtN(t.p, 1)} g prot.</span><span><i class="dot c"></i>${fmtN(t.c, 1)} g carb.</span><span><i class="dot f"></i>${fmtN(t.f, 1)} g gord.</span><span><i class="dot fi"></i>${fmtN(t.fi, 1)} g fibras</span></div>`;
}
function updateTotals() {
  const el = $('#totals');
  if (el && draft) el.innerHTML = totalsHtml(sumItems(draft.items));
}

function itemRow(it, i) {
  const num = (f, label) => `<label>${label}<input class="in num" inputmode="decimal" data-f="${f}" value="${esc(fieldVal(it[f]))}"></label>`;
  return `<div class="item" data-i="${i}">
    <div class="item-top">
      <input class="in" data-f="name" value="${esc(it.name)}" placeholder="Alimento" aria-label="Nome do alimento" maxlength="80">
      <input class="in" data-f="qty" value="${esc(it.qty)}" placeholder="Qtd." aria-label="Quantidade" maxlength="40">
      <button class="rm" data-action="del-item" data-i="${i}" aria-label="Remover item">${icon('x', 16)}</button>
    </div>
    ${it.rec ? `<div class="rec-tag">${icon('book', 14)}da receita: ${esc(it.rec)}</div>` : ''}
    <div class="item-nums">${num('kcal', 'kcal')}${num('p', 'Prot')}${num('c', 'Carb')}${num('f', 'Gord')}</div>
  </div>`;
}

function renderSheet() {
  if (!draft) return;
  const d = draft;
  let body = '';
  let label = 'Registrar refeição';

  if (d.step === 'loading') {
    label = 'Analisando refeição';
    body = `<div class="working" aria-live="polite"><div class="dots"><i></i><i></i><i></i></div><b>Lendo o seu prato…</b><span>Isso leva alguns segundos.</span></div>`;
  } else if (d.step === 'input') {
    const chips = TYPES.map(([k, l]) => `<button class="chip" role="radio" aria-checked="${d.type === k}" data-action="pick-type" data-type="${k}">${l}</button>`).join('');
    const imgs = d.images.map((im, i) => `<div class="photo"><img src="${esc(im.thumb)}" alt="Foto ${i + 1}"><button data-action="remove-img" data-i="${i}" aria-label="Remover foto">${icon('x', 14)}</button></div>`).join('');
    body = `<header class="sheet-head"><h2>Registrar refeição</h2><button class="icon-btn" data-action="close-sheet" aria-label="Fechar">${icon('x')}</button></header>
      <div class="chips" role="radiogroup" aria-label="Tipo de refeição">${chips}</div>
      <div>
        <label class="field-label" for="meal-text">O que você comeu?</label>
        <textarea class="in" id="meal-text" rows="4" maxlength="1500" placeholder="Ex.: 2 ovos mexidos, 1 fatia de pão integral com requeijão e um café com leite">${esc(d.text)}</textarea>
      </div>
      <div class="photos">${imgs}${d.images.length < 3 ? `<label class="photo-add" for="meal-photo">${icon('camera', 24)}<span>Foto</span></label>` : ''}<input id="meal-photo" type="file" accept="image/*" multiple hidden></div>
      <p class="hint">Use texto, foto ou os dois. Com quantidades (“150 g de arroz”) a estimativa fica mais certeira.</p>
      <div id="sheet-error" class="error" role="alert" hidden></div>
      <button class="btn primary big" data-action="analyze">${icon('sparkle', 20)}Analisar com IA</button>
      <button class="btn link" data-action="manual">Preencher manualmente</button>`;
  } else {
    label = d.mode === 'edit' ? 'Editar refeição' : 'Conferir refeição';
    const typeOpts = TYPES.concat(d.type === 'outro' ? [['outro', 'Refeição']] : []).map(([k, l]) => `<option value="${k}" ${d.type === k ? 'selected' : ''}>${l}</option>`).join('');
    body = `<header class="sheet-head"><h2>${d.mode === 'edit' ? 'Editar refeição' : 'Confira e ajuste'}</h2><button class="icon-btn" data-action="close-sheet" aria-label="Fechar">${icon('x')}</button></header>
      ${d.note ? `<p class="ai-note">${icon('sparkle', 16)}<span>${esc(d.note)}</span></p>` : ''}
      <div class="meta-row">
        <select class="in" data-meta="type" aria-label="Tipo de refeição">${typeOpts}</select>
        <input class="in" type="date" data-meta="date" value="${esc(d.date)}" max="${today()}" aria-label="Data">
        <input class="in" type="time" data-meta="time" value="${esc(d.time)}" aria-label="Horário">
      </div>
      <div class="items">${d.items.map(itemRow).join('')}</div>
      <button class="btn ghost" data-action="add-item">${icon('plus', 18)}Adicionar item</button>
      <div class="totals" id="totals">${totalsHtml(sumItems(d.items))}</div>
      <div id="sheet-error" class="error" role="alert" hidden></div>
      <button class="btn primary big" data-action="save-meal">${icon('check', 20)}Salvar refeição</button>
      ${d.mode === 'edit' ? '<button class="btn danger" data-action="delete-meal">Excluir refeição</button>' : '<button class="btn link" data-action="back-input">Voltar</button>'}`;
  }

  sheetRoot.innerHTML = `<div class="backdrop" data-action="close-sheet"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="${label}"><div class="grab"></div>${body}</section>`;
}

function sheetError(msg) {
  const el = $('#sheet-error');
  if (!el) return toast(msg);
  el.textContent = msg;
  el.hidden = false;
}

/* ================= imagens ================= */
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui abrir essa imagem. Tente outra foto.')); };
    img.src = url;
  });
}
function scaleImage(img, max, q) {
  const r = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * r));
  c.height = Math.max(1, Math.round(img.height * r));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
async function addPhotos(files) {
  const d = draft;
  if (!d) return;
  const room = 3 - d.images.length;
  if (files.length > room) toast('Máximo de 3 fotos por refeição.');
  for (const f of [...files].slice(0, room)) {
    try {
      const img = await fileToImage(f);
      d.images.push({ data: scaleImage(img, 1024, 0.8), thumb: scaleImage(img, 96, 0.6) });
    } catch (e) { toast(e.message); }
  }
  if (draft === d) renderSheet();
}

/* ================= ações ================= */
async function analyze() {
  const d = draft;
  const ta = $('#meal-text');
  if (ta) d.text = ta.value;
  d.text = d.text.trim();
  if (!d.text && !d.images.length) return sheetError('Escreva o que comeu ou envie uma foto.');
  d.step = 'loading';
  renderSheet();
  try {
    const r = await api('POST', `/api/u/${state.code}/analyze`, { text: d.text, images: d.images.map((i) => i.data) });
    if (draft !== d) return;
    if (!r.items.length) {
      d.step = 'input';
      renderSheet();
      return sheetError(r.notes || 'Não identifiquei nenhum alimento. Tente descrever melhor.');
    }
    d.items = r.items;
    d.note = r.notes || (r.confidence === 'baixa' ? 'Estimativa com pouca certeza. Confira os valores.' : '');
    d.thumb = d.images[0] ? d.images[0].thumb : null;
    d.source = 'ia';
    d.step = 'review';
    renderSheet();
  } catch (e) {
    if (draft !== d) return;
    d.step = 'input';
    renderSheet();
    sheetError(e.message);
  }
}

async function saveMeal(btn) {
  const d = draft;
  const items = d.items.filter((i) => String(i.name).trim() || i.kcal > 0);
  if (!items.length) return sheetError('Adicione pelo menos um item.');
  if (!d.date || !d.time) return sheetError('Informe a data e o horário.');
  const body = { date: d.date, time: d.time, type: d.type, items, source: d.source };
  if (d.thumb) body.thumb = d.thumb;
  btn.disabled = true;
  try {
    const r = d.id
      ? await api('PUT', `/api/u/${state.code}/meals/${d.id}`, body)
      : await api('POST', `/api/u/${state.code}/meals`, body);
    const i = state.meals.findIndex((m) => m.id === r.meal.id);
    if (i >= 0) state.meals[i] = r.meal; else state.meals.push(r.meal);
    state.date = r.meal.date;
    state.tab = 'hoje';
    closeSheet();
    render();
    toast('Refeição salva');
  } catch (e) {
    if (draft === d) { btn.disabled = false; sheetError(e.message); }
  }
}

async function claimPanel(btn) {
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = 'Criando…';
  try {
    await api('POST', '/api/create', { slug: state.code });
    state.goals = null; state.profile = null; state.meals = []; state.tab = 'metas';
    render();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = old;
    toast(e.message);
  }
}

const actions = {
  enter: () => {
    const raw = $('#slug') ? $('#slug').value : '';
    const slug = normalizeSlug(raw);
    if (slug.length < 3) return toast('Escolha um nome com pelo menos 3 letras ou números.');
    if (RESERVED.includes(slug)) return toast('Esse nome não pode ser usado. Escolha outro.');
    location.href = `/${slug}`;
  },
  'claim': (el) => claimPanel(el),
  tab: (el) => {
    const t = el.dataset.tab;
    if (!state.goals && t !== 'metas' && t !== 'treinos' && t !== 'cardapio') return toast('Defina suas metas para começar.');
    state.tab = t;
    history.replaceState(null, '', t === 'treinos' ? `/${state.code}/treino` : t === 'cardapio' ? `/${state.code}/cardapio` : `/${state.code}`);
    render();
    window.scrollTo(0, 0);
  },
  'prev-day': () => { state.date = addDays(state.date, -1); render(); },
  'next-day': () => { if (state.date < today()) { state.date = addDays(state.date, 1); render(); } },
  'go-day': (el) => { state.date = el.dataset.date; state.tab = 'hoje'; render(); window.scrollTo(0, 0); },
  'open-add': () => openSheet(newDraft()),
  'open-meal': (el) => { const m = state.meals.find((x) => x.id === el.dataset.id); if (m) openSheet(editDraft(m)); },
  'close-sheet': () => closeSheet(),
  'pick-type': (el) => { draft.type = el.dataset.type; renderSheet(); },
  'remove-img': (el) => { draft.images.splice(Number(el.dataset.i), 1); renderSheet(); },
  analyze: () => analyze(),
  manual: () => {
    draft.items = [{ name: '', qty: '', kcal: 0, p: 0, c: 0, f: 0, fi: 0 }];
    draft.source = 'manual';
    draft.thumb = draft.images[0] ? draft.images[0].thumb : null;
    draft.step = 'review';
    renderSheet();
  },
  'back-input': () => { draft.step = 'input'; renderSheet(); },
  'add-item': () => {
    draft.items.push({ name: '', qty: '', kcal: 0, p: 0, c: 0, f: 0, fi: 0 });
    renderSheet();
    const rows = sheetRoot.querySelectorAll('.item');
    const last = rows[rows.length - 1];
    if (last) { last.scrollIntoView({ block: 'nearest' }); const n = last.querySelector('[data-f="name"]'); if (n) n.focus(); }
  },
  'del-item': (el) => { draft.items.splice(Number(el.dataset.i), 1); renderSheet(); },
  'save-meal': (el) => saveMeal(el),
  'delete-meal': async () => {
    if (!confirm('Excluir esta refeição?')) return;
    const id = draft.id;
    try {
      await api('DELETE', `/api/u/${state.code}/meals/${id}`);
      state.meals = state.meals.filter((m) => m.id !== id);
      closeSheet();
      render();
      toast('Refeição excluída');
    } catch (e) { sheetError(e.message); }
  },
  calc: () => {
    const p = {
      sex: $('#c-sex').value,
      age: parseNum($('#c-age').value),
      weight: parseNum($('#c-weight').value),
      height: parseNum($('#c-height').value),
      activity: $('#c-activity').value,
      objective: $('#c-objective').value,
    };
    const out = $('#calc-result');
    if (p.age < 10 || p.age > 100 || p.weight < 30 || p.weight > 300 || p.height < 120 || p.height > 230) {
      calcResult = null;
      out.innerHTML = '<div class="calc-result"><span class="small">Preencha idade, peso (kg) e altura (cm) para calcular.</span></div>';
      return;
    }
    const g = suggestGoals(p);
    calcResult = { goals: g, profile: p };
    out.innerHTML = `<div class="calc-result"><div><span class="small">Sugestão para você</span><br><b class="big num">${fmtN(g.kcal)} kcal</b></div>
      <div class="small num">${g.protein} g proteínas · ${g.carbs} g carboidratos · ${g.fat} g gorduras · ${g.fiber} g fibras</div>
      <button class="btn primary" data-action="use-calc">Usar estas metas</button></div>`;
  },
  'use-calc': () => {
    if (!calcResult) return;
    const g = calcResult.goals;
    $('#g-kcal').value = g.kcal; $('#g-protein').value = g.protein; $('#g-carbs').value = g.carbs; $('#g-fat').value = g.fat; $('#g-fiber').value = g.fiber;
    toast('Valores preenchidos. Toque em “Salvar metas”.');
  },
  'save-goals': async (el) => {
    const goals = {
      kcal: Math.round(parseNum($('#g-kcal').value)),
      protein: Math.round(parseNum($('#g-protein').value)),
      carbs: Math.round(parseNum($('#g-carbs').value)),
      fat: Math.round(parseNum($('#g-fat').value)),
      fiber: Math.round(parseNum($('#g-fiber').value)),
    };
    if (goals.kcal < 800) return toast('A meta de calorias precisa ser de pelo menos 800 kcal.');
    el.disabled = true;
    try {
      const r = await api('PUT', `/api/u/${state.code}/goals`, { goals, profile: calcResult ? calcResult.profile : undefined });
      state.goals = r.goals;
      state.profile = r.profile;
      state.tab = 'hoje';
      render();
      window.scrollTo(0, 0);
      toast('Metas salvas');
    } catch (e) { el.disabled = false; toast(e.message); }
  },
  'copy-link': async () => {
    const input = $('#my-link');
    try { await navigator.clipboard.writeText(input.value); toast('Endereço copiado'); }
    catch { input.select(); toast('Selecionei o link. Copie manualmente.'); }
  },
  'delete-account': async () => {
    if (!confirm('Apagar todos os seus dados e este painel? Isso não pode ser desfeito.')) return;
    try {
      await api('DELETE', `/api/u/${state.code}`);
      try { localStorage.removeItem('macrinhos:code'); } catch { /* ok */ }
      location.href = '/';
    } catch (e) { toast(e.message); }
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el, e);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (!draft) return;
  if (t.id === 'meal-text') { draft.text = t.value; return; }
  if (t.dataset && t.dataset.meta) { draft[t.dataset.meta] = t.value; return; }
  if (t.dataset && t.dataset.f) {
    const row = t.closest('.item');
    if (!row) return;
    const it = draft.items[Number(row.dataset.i)];
    if (!it) return;
    const f = t.dataset.f;
    it[f] = f === 'name' || f === 'qty' ? t.value : parseNum(t.value);
    updateTotals();
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'meal-photo' && draft) {
    const files = e.target.files;
    addPhotos(files);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && draft) closeSheet();
});

/* ================= landing ================= */
function landing() {
  let saved = null;
  try { saved = localStorage.getItem('macrinhos:code'); } catch { /* ok */ }
  const sample = { kcal: 1380, goal: 2000 };
  app.innerHTML = `<div class="land">
    <div class="top"><a class="brand" href="/" aria-label="Marombinhas, ir para o início">${LOGO}Marombinhas</a></div>
    <div class="land-grid">
      <div class="hero">
        <h1>Conte o que comeu. <em>A IA faz a conta.</em></h1>
        <p class="lead">Calorias, proteínas, carboidratos e gorduras do dia em um só lugar. Mande uma foto do prato ou escreva em poucas palavras.</p>
        <form class="cta" id="enter-form">
          <label class="field-label" for="slug" style="margin:0">Seu nome no endereço</label>
          <div class="slug-box"><span>${esc(location.host)}/</span><input id="slug" class="in" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40" placeholder="seunome"></div>
          <button class="btn primary big" type="submit">Entrar no meu painel</button>
          ${saved ? `<a class="cont" href="/${esc(saved)}">Continuar em /${esc(saved)}</a>` : ''}
          <p class="small">Se o nome ainda não existir, você cria o painel na próxima tela. Sem senha: quem souber o endereço entra, então prefira um nome pouco óbvio.</p>
        </form>
        <ul class="points">
          <li>${icon('camera', 20)}<span><b>Foto ou texto.</b> Descreva a refeição do seu jeito.</span></li>
          <li>${icon('target', 20)}<span><b>Metas suas.</b> Defina calorias e macros ou deixe o app sugerir.</span></li>
          <li>${icon('dumbbell', 20)}<span><b>Caderno de treino.</b> Monte suas fichas e acompanhe a evolução dos pesos.</span></li>
          <li>${icon('check', 20)}<span><b>Sem cadastro.</b> Seu endereço é o seu acesso, em qualquer aparelho.</span></li>
        </ul>
      </div>
      <div class="preview">
        <img class="mascot" src="/logo.png" width="480" height="480" alt="Guaxinim fitness, mascote do Marombinhas">
        <div class="card" aria-hidden="true">
          <span class="tag">Exemplo</span>
          <div class="sum">
            <div class="ring">${ring(sample.kcal, sample.goal)}<div class="ring-mid num"><b>${fmtN(sample.goal - sample.kcal)}</b><span>kcal restantes</span></div></div>
            <div class="sum-side"><div class="stat"><small>Consumido</small><b class="num">${fmtN(sample.kcal)}<i>kcal</i></b></div><div class="stat"><small>Meta</small><b class="num">${fmtN(sample.goal)}<i>kcal</i></b></div></div>
          </div>
          <div class="macros">${macroRow('Proteínas', 84, 130, '--protein')}${macroRow('Carboidratos', 150, 240, '--carbs')}${macroRow('Gorduras', 48, 65, '--fat')}</div>
        </div>
      </div>
    </div>
    <p class="disclaimer">As estimativas feitas por IA são aproximadas e podem errar; ajuste os valores quando souber os números reais. O Marombinhas não substitui o acompanhamento de nutricionista ou médico.</p>
  </div>`;
  $('#enter-form').addEventListener('submit', (e) => { e.preventDefault(); actions.enter(); });
}

function claimScreen(slug) {
  app.innerHTML = `<div class="land"><div class="top"><a class="brand" href="/" aria-label="Marombinhas, ir para o início">${LOGO}Marombinhas</a></div>
    <div class="claim card">
      <h1>Esse painel ainda não existe</h1>
      <p class="lead" style="padding:0">Quer criar <b>${esc(location.host)}/${esc(slug)}</b> agora?</p>
      <p class="small">Sem senha: quem souber esse endereço consegue ver e editar o painel.</p>
      <button class="btn primary big" data-action="claim">Criar /${esc(slug)}</button>
      <a class="btn ghost big" href="/">Escolher outro nome</a>
    </div></div>`;
}

/* ================= início ================= */
async function boot(code, opts = {}) {
  state.code = code;
  app.innerHTML = '<div class="loading">Carregando…</div>';
  try {
    const d = await api('GET', `/api/u/${code}`);
    try { localStorage.setItem('macrinhos:code', code); } catch { /* ok */ }
    state.goals = d.goals;
    state.profile = d.profile;
    state.meals = d.meals;
    state.tab = opts.tab || (state.goals ? 'hoje' : 'metas');
    render();
  } catch (e) {
    if (e.status === 404) {
      try { if (localStorage.getItem('macrinhos:code') === code) localStorage.removeItem('macrinhos:code'); } catch { /* ok */ }
      return claimScreen(code);
    }
    app.innerHTML = `<div class="fatal"><h1>Não foi possível abrir o painel</h1><p>${esc(e.message)}</p><p style="margin-top:16px"><a href="/">Voltar ao início</a></p></div>`;
  }
}

(function start() {
  let parts = location.pathname.split('/').filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
  if (parts[0] === 'u') parts = parts.slice(1); // endereços antigos /u/código
  const [a, b] = parts;
  if (!a) return landing();
  // Base global de exercícios
  if (normalizeSlug(a) === 'exercicios' && !b) return T.basePage({ back: '/', label: '← início' });
  if (normalizeSlug(a) === 'receitas' && !b) return R.basePage();
  const slug = normalizeSlug(a);
  if (!validSlug(slug)) return landing();
  const sub = normalizeSlug(b || '');
  if (sub === 'evolucao') return T.progressPage(slug, { back: `/${slug}/treino`, label: '← meu treino' });
  const wantTab = sub === 'treino' || sub === 'treinos';
  const wantCard = sub === 'cardapio';
  const clean = wantTab ? `/${slug}/treino` : wantCard ? `/${slug}/cardapio` : `/${slug}`;
  // Corrige maiúsculas, acentos e rotas antigas no endereço (ex.: /Felipe vira /felipe).
  if (location.pathname !== clean) history.replaceState(null, '', clean);
  boot(slug, wantTab ? { tab: 'treinos' } : wantCard ? { tab: 'cardapio' } : {});
})();
})();
