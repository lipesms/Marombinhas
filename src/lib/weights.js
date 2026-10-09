// Histórico de pesos: cada exercício guarda uma lista [{ d: "2026-10-08", kg: 30 }]

export const today = () => {
  const n = new Date();
  const p = (v) => String(v).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
};

// "30Kg" -> 30   "27,5 kg" -> 27.5   "2x15" -> 2 (só usamos no campo de peso)
export function parseKg(text = "") {
  const m = String(text).match(/\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(",", ".")) : null;
}

// Registra o peso de hoje (se já houver registro de hoje, ele é substituído)
export function logWeight(history = [], kg) {
  if (!(kg > 0)) return history;
  const d = today();
  return [...history.filter((h) => h.d !== d), { d, kg }]
    .sort((a, b) => (a.d < b.d ? -1 : 1))
    .slice(-200);
}

export const fmtKg = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
export const fmtDate = (d) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
};
