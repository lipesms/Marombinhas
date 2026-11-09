import { fmtN } from '../lib/utils.js';

export function Ring({ consumed, goal }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const over = goal > 0 && consumed > goal * 1.05;
  return (
    <svg viewBox="0 0 168 168" role="img" aria-label={`${fmtN(consumed)} de ${fmtN(goal)} calorias`}>
      <circle className="ring-bg" cx="84" cy="84" r={r} />
      <circle className={`ring-fg${over ? ' over' : ''}`} cx="84" cy="84" r={r} strokeDasharray={c.toFixed(1)} strokeDashoffset={(c * (1 - pct)).toFixed(1)} transform="rotate(-90 84 84)" />
    </svg>
  );
}

export function MacroRow({ label, val, goal, color }) {
  const pct = goal > 0 ? Math.min(100, (val / goal) * 100) : 0;
  return (
    <div className="macro">
      <div className="macro-head"><span>{label}</span><span className="num"><b>{fmtN(val)}</b> / {fmtN(goal)} g</span></div>
      <div className="bar"><i style={{ width: `${pct.toFixed(1)}%`, background: `var(${color})` }} /></div>
    </div>
  );
}
