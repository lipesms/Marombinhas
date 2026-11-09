import { useState } from 'react';
import PlainShell from '../../components/PlainShell.jsx';
import WeightChart from './WeightChart.jsx';
import { SaveStatus } from './TreinoTab.jsx';
import { useTreino } from '../../hooks/useTreino.js';
import { fmtDate, fmtKg } from '../../lib/treino.js';

function ExerciseProgress({ ex, open, onToggle, onDeletePoint }) {
  const hist = ex.history || [];
  const n = hist.length;
  const delta = n > 1 ? hist[n - 1].kg - hist[0].kg : 0;
  const chip = n === 0 ? '' : n === 1 ? `${fmtKg(hist[0].kg)} kg` : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${fmtKg(Math.abs(delta))} kg`;
  const tone = n > 1 ? (delta > 0 ? 'up' : delta < 0 ? 'down' : '') : '';
  return (
    <div className="p-card">
      <button className="p-head" onClick={onToggle} aria-expanded={open}>
        <span className="b-name">{ex.name}</span>{chip && <span className={`delta ${tone}`}>{chip}</span>}
      </button>
      {n === 0
        ? <p className="small">Sem registros ainda. Mude o peso no treino e o histórico começa.</p>
        : <>
          <WeightChart points={hist} />
          <div className="p-meta"><span>{fmtDate(hist[0].d)} → {fmtDate(hist[n - 1].d)}</span><span>{n} {n === 1 ? 'registro' : 'registros'}</span></div>
        </>}
      {open && n > 0 && (
        <ul className="p-log">
          {[...hist].reverse().map((h) => (
            <li key={h.d}><span>{fmtDate(h.d)}</span><b>{fmtKg(h.kg)} kg</b>
              <button className="t-del" onClick={() => onDeletePoint(h.d)} aria-label={`Apagar registro de ${fmtDate(h.d)}`}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Página /<nome>/evolucao: gráfico do peso de cada exercício. */
export default function ProgressPage({ slug }) {
  const { doc, status, saved, update, reload } = useTreino(slug);
  const [openId, setOpenId] = useState(null);

  let body;
  if (status === 'idle' || status === 'loading') body = <div className="loading">Carregando…</div>;
  else if (status === 'error') body = <div className="card empty"><b>Não consegui abrir a evolução</b><button className="btn ghost" onClick={reload}>Tentar de novo</button></div>;
  else {
    const withEx = doc.workouts.filter((w) => w.exercises.length);
    body = !withEx.length ? <p className="small">Ainda não há exercícios nos seus treinos.</p> : withEx.map((w) => (
      <section key={w.id}>
        <h2 className="sec" style={{ padding: '14px 2px 8px' }}><span>{w.name}</span></h2>
        <div className="card t-panel">
          {w.exercises.map((ex) => (
            <ExerciseProgress key={ex.id} ex={ex} open={openId === ex.id}
              onToggle={() => setOpenId(openId === ex.id ? null : ex.id)}
              onDeletePoint={(d) => update((x) => x.workouts.forEach((wk) => wk.exercises.forEach((e) => { if (e.id === ex.id) e.history = (e.history || []).filter((h) => h.d !== d); })))} />
          ))}
        </div>
      </section>
    ));
  }

  return (
    <PlainShell title="Evolução" back={`/${slug}/treino`} label="← meu treino" status={<SaveStatus saved={saved} />}>
      {body}
      <p className="small">O histórico é gravado sozinho: toda vez que você muda o peso de um exercício no treino, o valor de hoje entra aqui. Toque num exercício para ver (e apagar) os registros.</p>
    </PlainShell>
  );
}
