/* Regras do caderno de treino (sem React): normalização do documento, pesos e formatação. */
import { uid } from './utils.js';

export const DEFAULT_TITLE = 'Planejamento academia';

export function normalizeDoc(raw) {
  if (Array.isArray(raw)) raw = { workouts: raw };
  raw = raw || {};
  const list = Array.isArray(raw.workouts) && raw.workouts.length ? raw.workouts : [{ id: uid(), name: 'Treino A', exercises: [] }];
  return {
    title: raw.title || DEFAULT_TITLE,
    desc: raw.desc || '',
    library: Array.isArray(raw.library) ? raw.library : [],
    workouts: list.map((w) => ({
      id: w.id || uid(),
      name: w.name || 'Treino',
      exercises: (w.exercises || []).map((e) => ({
        id: e.id || uid(),
        name: e.name || '',
        series: e.series || '3x10',
        peso: e.peso || '0Kg',
        history: Array.isArray(e.history) ? e.history : [],
        ...(e.baseId ? { baseId: e.baseId } : {}),
      })),
    })),
  };
}

const pad2 = (n) => String(n).padStart(2, '0');
const todayStr = () => { const n = new Date(); return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`; };

// "30Kg" -> 30   "27,5 kg" -> 27.5
export const parseKg = (t = '') => { const m = String(t).match(/\d+(?:[.,]\d+)?/); return m ? Number(m[0].replace(',', '.')) : null; };

// Registra o peso de hoje (se já houver registro de hoje, ele é substituído)
export const logWeight = (hist = [], kg) => {
  if (!(kg > 0)) return hist;
  const d = todayStr();
  return [...hist.filter((h) => h.d !== d), { d, kg }].sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-200);
};

export const fmtKg = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));
export const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y.slice(2)}`; };
export const safeLink = (u) => (/^https?:\/\/[^\s]+$/i.test(u || '') ? u : '');
export const hasInfo = (it) => Boolean(it && (it.photo || it.muscles || it.desc || safeLink(it.link)));
