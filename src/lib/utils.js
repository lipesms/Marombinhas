/* Funções puras usadas em várias telas. */
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const today = () => ymd(new Date());
export const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtN = (n, dec = 0) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
export const parseNum = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; };
export const fieldVal = (n) => String(n || 0).replace('.', ',');
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR');
export const fold = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const uid = () => Math.random().toString(36).slice(2, 9).padEnd(5, '0');
export const longId = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => (b % 36).toString(36)).join('');
export const recipeId = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => (b % 36).toString(36)).join('');

export const RESERVED = ['api', 'u', 'app', 'admin', 'login', 'entrar', 'criar', 'static', 'public', 'assets', 'logo', 'logo-sm', 'favicon', 'index', 'style', 'healthz', 'robots', 'sitemap', 'www', 'home', 'sobre', 'ajuda', 'exercicios', 'evolucao', 'treino', 'treinos', 'receitas', 'cardapio', 'cardapios'];
export const normalizeSlug = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/g, '');
export const validSlug = (s) => /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(s) && !RESERVED.includes(s);

export const TYPES = [['cafe', 'Café da manhã'], ['almoco', 'Almoço'], ['lanche', 'Lanche'], ['jantar', 'Jantar'], ['ceia', 'Ceia']];
export const TYPE_LABEL = { cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar', ceia: 'Ceia', outro: 'Refeição' };
export const autoType = () => { const h = new Date().getHours(); return h < 10 ? 'cafe' : h < 14 ? 'almoco' : h < 18 ? 'lanche' : h < 22 ? 'jantar' : 'ceia'; };

export const dayLabel = (date) => {
  const t = today();
  const long = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseYmd(date));
  if (date === t) return ['Hoje', long];
  if (date === addDays(t, -1)) return ['Ontem', long];
  return [long, ''];
};

/* ---- cálculos de refeições e metas ---- */
const ZERO = { kcal: 0, p: 0, c: 0, f: 0, fi: 0 };
export const sumMeals = (list) => list.reduce((t, m) => ({ kcal: t.kcal + m.kcal, p: t.p + m.p, c: t.c + m.c, f: t.f + m.f, fi: t.fi + (m.fi || 0) }), ZERO);
export const sumItems = (items) => items.reduce((t, i) => ({ kcal: t.kcal + (+i.kcal || 0), p: t.p + (+i.p || 0), c: t.c + (+i.c || 0), f: t.f + (+i.f || 0), fi: t.fi + (+i.fi || 0) }), ZERO);

export function streak(meals) {
  const set = new Set(meals.map((m) => m.date));
  let d = today();
  if (!set.has(d)) d = addDays(d, -1);
  let n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

export function suggestGoals(p) {
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
