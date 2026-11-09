import { useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../lib/api.js';
import { fieldVal, fmtN, parseNum, suggestGoals } from '../../lib/utils.js';

const ACTIVITY = [['1.2', 'Quase nenhuma'], ['1.375', 'Leve (1–3x/sem)'], ['1.55', 'Moderada (3–5x/sem)'], ['1.725', 'Intensa (6–7x/sem)']];
const OBJECTIVE = [['perder', 'Perder peso'], ['manter', 'Manter peso'], ['ganhar', 'Ganhar massa']];
const DEFAULT_GOALS = { kcal: 2000, protein: 120, carbs: 230, fat: 65, fiber: 25 };

function GoalField({ label, value, onChange }) {
  return (
    <label className="field"><span>{label}</span>
      <div className="with-unit"><input className="in suffix num" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} /><em>g</em></div>
    </label>
  );
}

/* Aba Metas: metas diárias, cálculo sugerido (Mifflin-St Jeor), endereço e exclusão dos dados. */
export default function Metas({ code, goals, profile, onSaved }) {
  const toast = useToast();
  const p = profile || {};
  const g0 = goals || DEFAULT_GOALS;
  const [g, setG] = useState({ kcal: String(g0.kcal), protein: String(g0.protein), carbs: String(g0.carbs), fat: String(g0.fat), fiber: String(g0.fiber) });
  const [c, setC] = useState({
    sex: p.sex === 'f' ? 'f' : 'm', age: p.age || '', weight: p.weight ? fieldVal(p.weight) : '', height: p.height || '',
    activity: p.activity || '1.375', objective: p.objective || 'manter',
  });
  const [calc, setCalc] = useState(null); // { goals, profile } ou { invalid: true }
  const [saving, setSaving] = useState(false);
  const linkRef = useRef(null);
  const link = `${location.origin}/${code}`;
  const setGoal = (k) => (v) => setG((o) => ({ ...o, [k]: v }));
  const setCalcField = (k) => (e) => setC((o) => ({ ...o, [k]: e.target.value }));

  const calculate = () => {
    const prof = { sex: c.sex, age: parseNum(c.age), weight: parseNum(c.weight), height: parseNum(c.height), activity: c.activity, objective: c.objective };
    if (prof.age < 10 || prof.age > 100 || prof.weight < 30 || prof.weight > 300 || prof.height < 120 || prof.height > 230) return setCalc({ invalid: true });
    setCalc({ goals: suggestGoals(prof), profile: prof });
  };
  const useCalc = () => {
    const s = calc.goals;
    setG({ kcal: String(s.kcal), protein: String(s.protein), carbs: String(s.carbs), fat: String(s.fat), fiber: String(s.fiber) });
    toast('Valores preenchidos. Toque em “Salvar metas”.');
  };
  const save = async () => {
    const next = { kcal: Math.round(parseNum(g.kcal)), protein: Math.round(parseNum(g.protein)), carbs: Math.round(parseNum(g.carbs)), fat: Math.round(parseNum(g.fat)), fiber: Math.round(parseNum(g.fiber)) };
    if (next.kcal < 800) return toast('A meta de calorias precisa ser de pelo menos 800 kcal.');
    setSaving(true);
    try {
      const r = await api('PUT', `/api/u/${code}/goals`, { goals: next, profile: calc && calc.profile ? calc.profile : undefined });
      onSaved(r.goals, r.profile);
      toast('Metas salvas');
    } catch (e) { setSaving(false); toast(e.message); }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(link); toast('Endereço copiado'); }
    catch { linkRef.current.select(); toast('Selecionei o link. Copie manualmente.'); }
  };
  const deleteAccount = async () => {
    if (!confirm('Apagar todos os seus dados e este painel? Isso não pode ser desfeito.')) return;
    try {
      await api('DELETE', `/api/u/${code}`);
      try { localStorage.removeItem('macrinhos:code'); } catch { /* ok */ }
      location.href = '/';
    } catch (e) { toast(e.message); }
  };

  return (
    <>
      <h1 className="page-title">Suas metas</h1>
      {!goals && <div className="welcome"><b>Bem-vindo ao Marombinhas!</b>Defina suas metas diárias para começar. Se não souber por onde começar, use o cálculo abaixo.</div>}
      <section className="card">
        <div className="goals-grid">
          <label className="field wide"><span>Calorias por dia</span>
            <div className="with-unit"><input className="in kcal-input num" inputMode="numeric" value={g.kcal} onChange={(e) => setGoal('kcal')(e.target.value)} /><em>kcal</em></div>
          </label>
          <GoalField label="Proteínas" value={g.protein} onChange={setGoal('protein')} />
          <GoalField label="Carboidratos" value={g.carbs} onChange={setGoal('carbs')} />
          <GoalField label="Gorduras" value={g.fat} onChange={setGoal('fat')} />
          <GoalField label="Fibras" value={g.fiber} onChange={setGoal('fiber')} />
        </div>
      </section>
      <details className="card" open={!goals}>
        <summary>Calcular para mim</summary>
        <div className="calc-grid">
          <label className="field"><span>Sexo</span><select className="in" value={c.sex} onChange={setCalcField('sex')}><option value="m">Masculino</option><option value="f">Feminino</option></select></label>
          <label className="field"><span>Idade</span><input className="in num" inputMode="numeric" value={c.age} onChange={setCalcField('age')} placeholder="anos" /></label>
          <label className="field"><span>Peso</span><input className="in num" inputMode="decimal" value={c.weight} onChange={setCalcField('weight')} placeholder="kg" /></label>
          <label className="field"><span>Altura</span><input className="in num" inputMode="numeric" value={c.height} onChange={setCalcField('height')} placeholder="cm" /></label>
          <label className="field"><span>Atividade física</span><select className="in" value={c.activity} onChange={setCalcField('activity')}>{ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="field"><span>Objetivo</span><select className="in" value={c.objective} onChange={setCalcField('objective')}>{OBJECTIVE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>
        <div style={{ marginTop: 14 }}><button className="btn ghost big" onClick={calculate}>Calcular</button></div>
        <div>
          {calc && calc.invalid && <div className="calc-result"><span className="small">Preencha idade, peso (kg) e altura (cm) para calcular.</span></div>}
          {calc && calc.goals && (
            <div className="calc-result">
              <div><span className="small">Sugestão para você</span><br /><b className="big num">{fmtN(calc.goals.kcal)} kcal</b></div>
              <div className="small num">{calc.goals.protein} g proteínas · {calc.goals.carbs} g carboidratos · {calc.goals.fat} g gorduras · {calc.goals.fiber} g fibras</div>
              <button className="btn primary" onClick={useCalc}>Usar estas metas</button>
            </div>
          )}
        </div>
        <p className="small" style={{ marginTop: 12 }}>Estimativa pela fórmula de Mifflin-St Jeor. Não substitui a orientação de um nutricionista.</p>
      </details>
      <button className="btn primary big" onClick={save} disabled={saving}>Salvar metas</button>
      <section className="card">
        <h3 style={{ fontSize: '1.05rem' }}>Seu endereço</h3>
        <p className="small" style={{ marginTop: 4 }}>Este é o seu acesso: não existe senha. Qualquer pessoa que souber este endereço consegue ver e editar seu painel. Se quiser mais privacidade, apague e crie de novo com um nome menos óbvio, como <b>{code}-x7k</b>.</p>
        <div className="linkbox"><input ref={linkRef} className="in" readOnly value={link} aria-label="Seu endereço" /><button className="btn ghost" onClick={copyLink} aria-label="Copiar endereço"><Icon name="copy" size={18} /></button></div>
      </section>
      <button className="btn danger" onClick={deleteAccount}>Apagar todos os meus dados</button>
      <p className="small" style={{ padding: '0 2px' }}>As estimativas de calorias feitas por IA podem errar. Ajuste os valores sempre que souber os números reais.</p>
    </>
  );
}
