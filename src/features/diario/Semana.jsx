import { addDays, dayLabel, fmtN, parseYmd, sumMeals, today } from '../../lib/utils.js';

/* Aba Semana: últimos 7 dias em colunas; tocar numa coluna abre aquele dia. */
export default function Semana({ goals: g, meals, onGoDay }) {
  const H = 150;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today(), -i);
    const list = meals.filter((m) => m.date === d);
    days.push({ d, n: list.length, ...sumMeals(list) });
  }
  const max = Math.max(g.kcal * 1.25, ...days.map((x) => x.kcal), 1);
  const logged = days.filter((x) => x.n > 0);
  const avg = (k) => (logged.length ? logged.reduce((a, x) => a + x[k], 0) / logged.length : 0);
  const hits = logged.filter((x) => x.kcal >= g.kcal * 0.9 && x.kcal <= g.kcal * 1.1).length;
  return (
    <>
      <h1 className="page-title">Últimos 7 dias</h1>
      <section className="card">
        <div className="wk-area">
          <div className="wk-goal" style={{ bottom: `${Math.round((g.kcal / max) * H)}px` }}><span className="num">meta {fmtN(g.kcal)}</span></div>
          <div className="wk">
            {days.map((x) => {
              const h = Math.round((x.kcal / max) * H);
              const cls = !x.n ? 'empty' : x.kcal > g.kcal * 1.1 ? 'over' : x.kcal >= g.kcal * 0.9 ? 'hit' : '';
              const v = x.kcal >= 1000 ? `${fmtN(x.kcal / 1000, 1)}k` : fmtN(x.kcal);
              return (
                <button key={x.d} className={`col ${cls}`} style={{ '--h': `${h}px` }} onClick={() => onGoDay(x.d)} aria-label={`${dayLabel(x.d)[0]}: ${fmtN(x.kcal)} kcal`}>
                  <span className="v num">{v}</span><i />
                </button>
              );
            })}
          </div>
        </div>
        <div className="wk-days">
          {days.map((x) => <span key={x.d} className={x.d === today() ? 'today' : ''}>{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(parseYmd(x.d)).replace('.', '')}</span>)}
        </div>
        <div className="legend"><span><i style={{ background: 'var(--ok)' }} />dentro da meta (±10%)</span><span><i style={{ background: 'var(--kcal)' }} />abaixo</span><span><i style={{ background: 'var(--over)' }} />acima</span></div>
      </section>
      <div className="stats">
        <div className="card stat"><small>Média diária</small><b className="num">{fmtN(avg('kcal'))}<i>kcal</i></b></div>
        <div className="card stat"><small>Proteína média</small><b className="num">{fmtN(avg('p'))}<i>g</i></b></div>
        <div className="card stat"><small>Dias registrados</small><b className="num">{logged.length}<i>de 7</i></b></div>
        <div className="card stat"><small>Dias na meta</small><b className="num">{hits}<i>de {logged.length}</i></b></div>
      </div>
      <p className="small" style={{ padding: '0 2px' }}>Toque em uma barra para abrir aquele dia.</p>
    </>
  );
}
