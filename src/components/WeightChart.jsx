import { fmtKg } from "../lib/weights";

// Gráfico de linha simples em SVG. points: [{ d, kg }] em ordem de data
export default function WeightChart({ points }) {
  const W = 300, H = 100, px = 16, top = 24, bottom = 14;
  const n = points.length;
  const kgs = points.map((p) => p.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);

  const x = (i) => (n === 1 ? W / 2 : px + (i * (W - 2 * px)) / (n - 1));
  const y = (kg) =>
    max === min
      ? (top + H - bottom) / 2
      : H - bottom - ((kg - min) / (max - min)) * (H - bottom - top);

  const pts = points.map((p, i) => [x(i), y(p.kg)]);
  const line = pts.map(([a, b]) => `${a},${b}`).join(" ");
  const area = n > 1
    ? `M${pts[0][0]},${H - bottom} L${pts.map(([a, b]) => `${a},${b}`).join(" L")} L${pts[n - 1][0]},${H - bottom} Z`
    : "";
  const last = pts[n - 1];
  const first = pts[0];

  return (
    <svg className="wc" viewBox={`0 0 ${W} ${H}`} role="img"
         aria-label={`Evolução de ${fmtKg(kgs[0])} para ${fmtKg(kgs[n - 1])} Kg`}>
      {n > 1 && <path className="wc-area" d={area} />}
      {n > 1 && <polyline className="wc-line" points={line} />}
      {pts.map(([a, b], i) => (
        <circle key={i} className={i === n - 1 ? "wc-last" : "wc-dot"} cx={a} cy={b} r={i === n - 1 ? 5 : 3.5} />
      ))}
      <text className="wc-text" x={first[0]} y={first[1] - 10} textAnchor={n === 1 ? "middle" : "start"}>
        {fmtKg(kgs[0])}
      </text>
      {n > 1 && (
        <text className="wc-text" x={last[0]} y={last[1] - 10} textAnchor="end">
          {fmtKg(kgs[n - 1])}
        </text>
      )}
    </svg>
  );
}
