import { useEffect, useRef, useState } from 'react';
import Editable from './Editable.jsx';
import { useToast } from '../../components/Toast.jsx';
import { photoUrl } from '../../lib/photos.js';
import { hasInfo, logWeight, parseKg, safeLink } from '../../lib/treino.js';
import { uid } from '../../lib/utils.js';

export const SAVE_TEXT = { saved: 'Salvo', saving: 'Salvando…', error: 'Erro ao salvar. Tentando de novo ao editar.' };
export const SaveStatus = ({ saved }) => <span className={`t-status ${saved}`} role="status">{SAVE_TEXT[saved]}</span>;

function Details({ it }) {
  const link = safeLink(it.link);
  return (
    <div className="t-details">
      {it.photo && <img src={photoUrl(it.photo)} alt={it.name} loading="lazy" />}
      <div className="t-dtxt">
        {it.muscles && <p><b>Ativação:</b> {it.muscles}</p>}
        {it.desc && <p>{it.desc}</p>}
        {link && <p><a href={link} target="_blank" rel="noopener noreferrer">Ver exemplo ↗</a></p>}
      </div>
    </div>
  );
}

function ExerciseRow({ ex, info, open, onToggleInfo, onSave, onRemove }) {
  const showInfo = hasInfo(info);
  const isOpen = showInfo && open;
  return (
    <>
      <div className={`t-row ${isOpen ? 'open' : ''}`}>
        <div className="t-name">
          <Editable className="editable t-ex" value={ex.name} maxLength={80} onSave={(v) => onSave('name', v)} />
          {showInfo && <button className="t-i" onClick={onToggleInfo} aria-expanded={isOpen} aria-label={`Ver detalhes de ${ex.name}`}>i</button>}
        </div>
        <Editable className="editable t-num" value={ex.series} onSave={(v) => onSave('series', v)} />
        <Editable className="editable t-num" value={ex.peso} onSave={(v) => onSave('peso', v)} />
        <button className="t-del" onClick={onRemove} aria-label={`Remover ${ex.name}`}>×</button>
      </div>
      {isOpen && <Details it={info} />}
    </>
  );
}

/* Escolha de exercício: da base, da biblioteca antiga da pessoa ou um nome digitado. */
function Picker({ items, baseStatus, onAdd, onClose }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    if (rootRef.current) rootRef.current.scrollIntoView({ block: 'nearest' });
  }, []);

  const term = q.trim();
  const low = term.toLowerCase();
  const matches = items.filter((e) => e.name.toLowerCase().includes(low));
  const exact = items.find((e) => e.name.toLowerCase() === low);

  const add = (item) => {
    onAdd(item);
    setQ('');
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="t-picker" ref={rootRef}>
      <form onSubmit={(e) => { e.preventDefault(); if (term) add(exact || { name: term }); }}>
        <input ref={inputRef} id="t-q" className="in" value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} autoComplete="off" placeholder="Escolha da base ou digite um nome" aria-label="Exercício" />
      </form>
      <div className="t-chips">
        {matches.map((e) => <button key={e.id} type="button" className="chip" onClick={() => add(e)}>{e.name}</button>)}
        {term && !exact && <button type="button" className="chip new" onClick={() => add({ name: term })}>+ Usar “{term}”</button>}
        {baseStatus === 'loading' && <p className="hint">Carregando a base…</p>}
        {baseStatus === 'ready' && !items.length && !term && <p className="hint">A base está vazia. Digite um nome ou cadastre exercícios na base.</p>}
      </div>
      <div className="t-pfoot"><button type="button" onClick={onClose}>Fechar</button></div>
    </div>
  );
}

function Description({ desc, onSave }) {
  const [adding, setAdding] = useState(false);
  if (desc) {
    return <p className="t-desc"><Editable className="editable t-desc-text" value={desc} multi maxLength={800} onSave={(v) => onSave(v.slice(0, 800))} /></p>;
  }
  if (adding) {
    return <Editable value="" multi maxLength={800} startEditing onStop={() => setAdding(false)} onSave={(v) => onSave(v.slice(0, 800))} placeholder="Ex.: foco em hipertrofia, descanso de 60 s entre as séries" />;
  }
  return <button className="t-adddesc" onClick={() => setAdding(true)}>+ Adicionar descrição da ficha (opcional)</button>;
}

/*
 * Aba Treinos. `treino` vem do hook useTreino e `base` do useCollection('/api/base').
 */
export default function TreinoTab({ slug, treino, base }) {
  const toast = useToast();
  const { doc, status, saved, activeId, setActiveId, update, reload } = treino;
  const [picking, setPicking] = useState(false);
  const [openInfo, setOpenInfo] = useState(() => new Set());
  const [renamingNew, setRenamingNew] = useState(null);

  if (status === 'idle' || status === 'loading') return <div className="loading">Carregando treino…</div>;
  if (status === 'error') {
    return (
      <div className="card empty"><b>Não consegui abrir o treino</b>Confira a conexão e tente de novo.<br />
        <button className="btn ghost" onClick={reload} style={{ marginTop: 12 }}>Tentar de novo</button>
      </div>
    );
  }

  const w = doc.workouts.find((x) => x.id === activeId) || doc.workouts[0];
  const editWorkout = (fn) => update((d) => fn(d.workouts.find((x) => x.id === w.id)));
  const baseInfo = (ex) => (ex.baseId ? base.items.find((b) => b.id === ex.baseId) : null);

  const names = new Set(base.items.map((b) => b.name.toLowerCase()));
  const pickerItems = [...base.items, ...(doc.library || []).filter((l) => !names.has(String(l.name).toLowerCase()))].map((i) => ({ id: i.id, name: i.name }));

  const addExercise = (item) => {
    const fromBase = Boolean(item.id && base.items.some((b) => b.id === item.id));
    editWorkout((x) => x.exercises.push({ id: uid(), name: item.name, series: '3x10', peso: '0Kg', history: [], ...(fromBase ? { baseId: item.id } : {}) }));
    toast(`“${item.name}” adicionado`);
  };
  const saveField = (id, field, v) => {
    if (!v) return; // campo vazio não grava
    editWorkout((x) => {
      const ex = x.exercises.find((e) => e.id === id);
      if (!ex) return;
      ex[field] = v.slice(0, field === 'name' ? 80 : 20);
      if (field === 'peso') ex.history = logWeight(ex.history, parseKg(v));
    });
  };
  const removeExercise = (ex) => {
    if (!confirm(`Remover "${ex.name}" deste treino?`)) return;
    editWorkout((x) => { x.exercises = x.exercises.filter((e) => e.id !== ex.id); });
  };
  const addWorkout = () => {
    const nw = { id: uid(), name: 'Novo treino', exercises: [] };
    setActiveId(nw.id);
    setPicking(false);
    setRenamingNew(nw.id);
    update((d) => { d.workouts.push(nw); });
  };
  const removeWorkout = () => {
    if (doc.workouts.length < 2 || !confirm(`Excluir o treino "${w.name}"?`)) return;
    setActiveId(doc.workouts.find((x) => x.id !== w.id).id);
    update((d) => { d.workouts = d.workouts.filter((x) => x.id !== w.id); });
  };
  const toggleInfo = (id) => setOpenInfo((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      <div className="t-top">
        <div className="t-titlebar">
          <h1 className="t-title"><Editable className="editable" inputClass="t-input-title" value={doc.title} maxLength={120} onSave={(v) => v && update((d) => { d.title = v.slice(0, 120); })} /></h1>
          <SaveStatus saved={saved} />
        </div>
        <Description desc={doc.desc} onSave={(v) => update((d) => { d.desc = v; })} />
      </div>

      <nav className="t-tabs" aria-label="Seções do treino">
        {doc.workouts.map((x) => (x.id === w.id
          ? <Editable key={x.id} as="button" className="t-tab on" inputClass="t-tab-input" title="Toque de novo para renomear" value={x.name} maxLength={40}
              startEditing={renamingNew === x.id} onStop={() => setRenamingNew(null)}
              onSave={(v) => v && update((d) => { d.workouts.find((k) => k.id === x.id).name = v.slice(0, 40); })} />
          : <button key={x.id} className="t-tab" onClick={() => { setActiveId(x.id); setPicking(false); }}>{x.name}</button>))}
        <button className="t-tab plus" onClick={addWorkout} aria-label="Novo treino">+</button>
      </nav>

      <section className="card t-panel">
        <div className="t-row head"><span>Treino</span><span>Séries</span><span>Peso</span><span></span></div>
        {w.exercises.length
          ? w.exercises.map((ex) => (
            <ExerciseRow key={ex.id} ex={ex} info={baseInfo(ex)} open={openInfo.has(ex.id)}
              onToggleInfo={() => toggleInfo(ex.id)} onSave={(f, v) => saveField(ex.id, f, v)} onRemove={() => removeExercise(ex)} />))
          : <p className="t-empty">Nenhum exercício ainda. Toque em “+ Adicionar”.</p>}
        {picking
          ? <Picker items={pickerItems} baseStatus={base.status} onAdd={addExercise} onClose={() => setPicking(false)} />
          : <button className="t-add" onClick={() => { setPicking(true); if (base.status === 'error') base.reload(); }}>+ Adicionar</button>}
      </section>

      <div className="t-foot">
        <a href={`/${slug}/evolucao`}>Evolução dos pesos</a>
        {doc.workouts.length > 1 && <button onClick={removeWorkout}>Excluir treino “{w.name}”</button>}
      </div>
    </>
  );
}
