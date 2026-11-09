import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '../components/Brand.jsx';
import Icon from '../components/Icon.jsx';
import Nav from '../components/Nav.jsx';
import { useToast } from '../components/Toast.jsx';
import Hoje from '../features/diario/Hoje.jsx';
import MealSheet from '../features/diario/MealSheet.jsx';
import Metas from '../features/diario/Metas.jsx';
import Semana from '../features/diario/Semana.jsx';
import CardapioTab from '../features/cardapio/CardapioTab.jsx';
import TreinoTab from '../features/treino/TreinoTab.jsx';
import { useCollection } from '../hooks/useCollection.js';
import { useTreino } from '../hooks/useTreino.js';
import { api } from '../lib/api.js';
import { tabPath } from '../lib/routes.js';
import { streak, today } from '../lib/utils.js';
import ClaimScreen from './ClaimScreen.jsx';

/* Painel da pessoa (/<nome>): carrega os dados e troca entre as cinco abas. */
export default function Panel({ code, initialTab }) {
  const toast = useToast();
  const [status, setStatus] = useState('loading'); // loading | ready | claim | error
  const [error, setError] = useState('');
  const [goals, setGoals] = useState(null);
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [date, setDate] = useState(today());
  const [tab, setTab] = useState('hoje');
  const [sheet, setSheet] = useState(null); // null | { meal } (meal vazio = nova refeição)
  const [visited, setVisited] = useState(() => new Set());

  // Treinos e cardápio só carregam quando a aba é aberta pela primeira vez, e depois ficam em memória.
  const wantTreino = visited.has('treinos');
  const wantCardapio = visited.has('cardapio');
  const treino = useTreino(code, wantTreino);
  const exercises = useCollection('/api/base', wantTreino);
  const mine = useCollection(`/api/rec/${code}`, wantCardapio && status === 'ready');
  const recipeBase = useCollection('/api/rbase', wantCardapio);

  const goTab = useCallback((t) => { setTab(t); setVisited((v) => (v.has(t) ? v : new Set(v).add(t))); }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await api('GET', `/api/u/${code}`);
        if (!live) return;
        try { localStorage.setItem('macrinhos:code', code); } catch { /* ok */ }
        setGoals(d.goals); setProfile(d.profile); setMeals(d.meals);
        goTab(initialTab || (d.goals ? 'hoje' : 'metas'));
        setStatus('ready');
      } catch (e) {
        if (!live) return;
        if (e.status === 404) {
          try { if (localStorage.getItem('macrinhos:code') === code) localStorage.removeItem('macrinhos:code'); } catch { /* ok */ }
          setStatus('claim');
        } else { setError(e.message); setStatus('error'); }
      }
    })();
    return () => { live = false; };
  }, [code, initialTab, goTab]);

  const onTab = (t) => {
    if (!goals && t !== 'metas' && t !== 'treinos' && t !== 'cardapio') return toast('Defina suas metas para começar.');
    goTab(t);
    history.replaceState(null, '', tabPath(code, t));
    window.scrollTo(0, 0);
  };
  const closeSheet = useCallback(() => setSheet(null), []);

  if (status === 'loading') return <div className="loading">Carregando…</div>;
  if (status === 'claim') return <ClaimScreen slug={code} onCreated={() => { setGoals(null); setProfile(null); setMeals([]); goTab('metas'); setStatus('ready'); }} />;
  if (status === 'error') {
    return <div className="fatal"><h1>Não foi possível abrir o painel</h1><p>{error}</p><p style={{ marginTop: 16 }}><a href="/">Voltar ao início</a></p></div>;
  }

  const saveMeal = (m) => {
    setMeals((cur) => (cur.some((x) => x.id === m.id) ? cur.map((x) => (x.id === m.id ? m : x)) : [...cur, m]));
    setDate(m.date); goTab('hoje'); setSheet(null);
    toast('Refeição salva');
  };
  const deleteMeal = (id) => { setMeals((cur) => cur.filter((m) => m.id !== id)); setSheet(null); toast('Refeição excluída'); };

  let view;
  if (tab === 'hoje') view = <Hoje goals={goals} meals={meals} date={date} onDate={setDate} onOpenMeal={(meal) => setSheet({ meal })} />;
  else if (tab === 'semana') view = <Semana goals={goals} meals={meals} onGoDay={(d) => { setDate(d); goTab('hoje'); window.scrollTo(0, 0); }} />;
  else if (tab === 'treinos') view = <div id="t-root"><TreinoTab slug={code} treino={treino} base={exercises} /></div>;
  else if (tab === 'cardapio') view = <CardapioTab slug={code} mine={mine} base={recipeBase} />;
  else {
    view = <Metas code={code} goals={goals} profile={profile} onSaved={(g, p) => { setGoals(g); setProfile(p); goTab('hoje'); window.scrollTo(0, 0); }} />;
  }

  return (
    <>
      <div className="shell">
        <TopBar streak={streak(meals)} />
        {view}
      </div>
      <Nav tab={tab} onTab={onTab} />
      {goals && (tab === 'hoje' || tab === 'semana') && <button className="fab" onClick={() => setSheet({})}><Icon name="plus" size={22} />Registrar refeição</button>}
      {sheet && <MealSheet code={code} meal={sheet.meal} date={date} onClose={closeSheet} onSaved={saveMeal} onDeleted={deleteMeal} />}
    </>
  );
}
