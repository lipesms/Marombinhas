import Icon from '../../components/Icon.jsx';
import { MacroRow, Ring } from '../../components/Charts.jsx';
import { TYPE_LABEL, addDays, dayLabel, fmtN, sumMeals, today } from '../../lib/utils.js';

function MealCard({ m, onOpen }) {
  return (
    <button className="meal" onClick={() => onOpen(m)}>
      <div className="th">{m.thumb ? <img src={m.thumb} alt="" /> : <Icon name="fork" size={24} />}</div>
      <div className="meal-main">
        <div className="meal-title">{m.name}</div>
        <div className="meal-meta">{TYPE_LABEL[m.type] || 'Refeição'} · {m.time}</div>
        <div className="meal-macros num"><span><i className="dot p" />{fmtN(m.p)}P</span><span><i className="dot c" />{fmtN(m.c)}C</span><span><i className="dot f" />{fmtN(m.f)}G</span></div>
      </div>
      <div className="meal-kcal num"><b>{fmtN(m.kcal)}</b><small>kcal</small></div>
    </button>
  );
}

/* Aba Hoje: anel de calorias, macros e refeições do dia escolhido. */
export default function Hoje({ goals: g, meals, date, onDate, onOpenMeal }) {
  const list = meals.filter((m) => m.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const t = sumMeals(list);
  const rem = Math.round(g.kcal - t.kcal);
  const over = rem < 0 && t.kcal > g.kcal * 1.05;
  const [l1, l2] = dayLabel(date);
  return (
    <>
      <div className="datenav">
        <button className="icon-btn" onClick={() => onDate(addDays(date, -1))} aria-label="Dia anterior"><Icon name="left" /></button>
        <div className="mid"><b>{l1}</b>{l2 && <span>{l2}</span>}</div>
        <button className="icon-btn" onClick={() => onDate(addDays(date, 1))} aria-label="Próximo dia" disabled={date >= today()}><Icon name="right" /></button>
      </div>
      <section className="card sum" aria-label="Calorias do dia">
        <div className="ring"><Ring consumed={t.kcal} goal={g.kcal} /><div className={`ring-mid num${over ? ' over' : ''}`}><b>{fmtN(Math.abs(rem))}</b><span>{rem >= 0 ? 'kcal restantes' : 'kcal acima da meta'}</span></div></div>
        <div className="sum-side">
          <div className="stat"><small>Consumido</small><b className="num">{fmtN(t.kcal)}<i>kcal</i></b></div>
          <div className="stat"><small>Meta</small><b className="num">{fmtN(g.kcal)}<i>kcal</i></b></div>
        </div>
      </section>
      <section className="card macros" aria-label="Macronutrientes">
        <MacroRow label="Proteínas" val={t.p} goal={g.protein} color="--protein" />
        <MacroRow label="Carboidratos" val={t.c} goal={g.carbs} color="--carbs" />
        <MacroRow label="Gorduras" val={t.f} goal={g.fat} color="--fat" />
        {g.fiber ? <MacroRow label="Fibras" val={t.fi} goal={g.fiber} color="--fiber" /> : null}
      </section>
      <div className="sec"><h2>Refeições</h2><span className="num">{list.length ? `${list.length} ${list.length === 1 ? 'registro' : 'registros'}` : ''}</span></div>
      <div className="meals">
        {list.length
          ? list.map((m) => <MealCard key={m.id} m={m} onOpen={onOpenMeal} />)
          : <div className="card empty"><b>Nada registrado {date === today() ? 'hoje' : 'neste dia'}</b>Conte o que você comeu ou mande uma foto do prato.</div>}
      </div>
    </>
  );
}
