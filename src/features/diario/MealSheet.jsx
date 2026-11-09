import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../lib/api.js';
import { fileToImage, scaleImage } from '../../lib/photos.js';
import { TYPES, autoType, fieldVal, fmtN, nowHM, parseNum, sumItems, today } from '../../lib/utils.js';

const EMPTY_ITEM = { name: '', qty: '', kcal: '0', p: '0', c: '0', f: '0', fi: '0' };
// Os campos numéricos ficam como texto enquanto a pessoa digita ("1," não vira "1") e são convertidos ao salvar.
const toEditable = (it) => ({ ...it, kcal: fieldVal(it.kcal), p: fieldVal(it.p), c: fieldVal(it.c), f: fieldVal(it.f), fi: fieldVal(it.fi) });
const toNumbers = (it) => ({ ...it, kcal: parseNum(it.kcal), p: parseNum(it.p), c: parseNum(it.c), f: parseNum(it.f), fi: parseNum(it.fi) });

function ItemRow({ it, onChange, onRemove, inputRef }) {
  const num = (f, label) => <label>{label}<input className="in num" inputMode="decimal" value={it[f]} onChange={(e) => onChange({ [f]: e.target.value })} /></label>;
  return (
    <div className="item">
      <div className="item-top">
        <input ref={inputRef} className="in" value={it.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Alimento" aria-label="Nome do alimento" maxLength={80} />
        <input className="in" value={it.qty} onChange={(e) => onChange({ qty: e.target.value })} placeholder="Qtd." aria-label="Quantidade" maxLength={40} />
        <button className="rm" onClick={onRemove} aria-label="Remover item"><Icon name="x" size={16} /></button>
      </div>
      {it.rec && <div className="rec-tag"><Icon name="book" size={14} />da receita: {it.rec}</div>}
      <div className="item-nums">{num('kcal', 'kcal')}{num('p', 'Prot')}{num('c', 'Carb')}{num('f', 'Gord')}</div>
    </div>
  );
}

function Totals({ items }) {
  const t = sumItems(items.map(toNumbers));
  return (
    <div className="totals">
      <div className="tot-main"><b className="num">{fmtN(t.kcal)}</b><span>kcal</span></div>
      <div className="tot-macros num">
        <span><i className="dot p" />{fmtN(t.p, 1)} g prot.</span><span><i className="dot c" />{fmtN(t.c, 1)} g carb.</span>
        <span><i className="dot f" />{fmtN(t.f, 1)} g gord.</span><span><i className="dot fi" />{fmtN(t.fi, 1)} g fibras</span>
      </div>
    </div>
  );
}

/*
 * Folha para registrar, conferir ou editar uma refeição. `meal` vazio = nova refeição.
 * Passos: input (texto/fotos) -> loading (IA) -> review (itens editáveis).
 */
export default function MealSheet({ code, meal, date, onClose, onSaved, onDeleted }) {
  const toast = useToast();
  const editing = Boolean(meal);
  const [d, setD] = useState(() => (editing
    ? { step: 'review', type: meal.type, date: meal.date, time: meal.time, items: meal.items.map(toEditable), source: meal.source, note: '', thumb: null }
    : { step: 'input', type: autoType(), date, time: nowHM(), items: [], source: 'ia', note: '', thumb: null }));
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const alive = useRef(true);
  const lastItem = useRef(null);
  const focusLast = useRef(false);
  const patch = (o) => setD((x) => ({ ...x, ...o }));

  useEffect(() => {
    alive.current = true;
    document.body.classList.add('lock');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { alive.current = false; document.body.classList.remove('lock'); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  useEffect(() => {
    if (focusLast.current && lastItem.current) {
      focusLast.current = false;
      lastItem.current.scrollIntoView({ block: 'nearest' });
      lastItem.current.focus();
    }
  }, [d.items.length]);

  const addPhotos = async (files) => {
    const room = 3 - images.length;
    if (files.length > room) toast('Máximo de 3 fotos por refeição.');
    for (const f of [...files].slice(0, room)) {
      try {
        const img = await fileToImage(f);
        if (!alive.current) return;
        setImages((cur) => [...cur, { data: scaleImage(img, 1024, 0.8), thumb: scaleImage(img, 96, 0.6) }]);
      } catch (e) { toast(e.message); }
    }
  };

  const analyze = async () => {
    const t = text.trim();
    setText(t);
    if (!t && !images.length) return setError('Escreva o que comeu ou envie uma foto.');
    setError('');
    patch({ step: 'loading' });
    try {
      const r = await api('POST', `/api/u/${code}/analyze`, { text: t, images: images.map((i) => i.data) });
      if (!alive.current) return;
      if (!r.items.length) {
        patch({ step: 'input' });
        return setError(r.notes || 'Não identifiquei nenhum alimento. Tente descrever melhor.');
      }
      patch({
        items: r.items.map(toEditable), step: 'review', source: 'ia',
        note: r.notes || (r.confidence === 'baixa' ? 'Estimativa com pouca certeza. Confira os valores.' : ''),
        thumb: images[0] ? images[0].thumb : null,
      });
    } catch (e) {
      if (!alive.current) return;
      patch({ step: 'input' });
      setError(e.message);
    }
  };

  const manual = () => patch({ items: [{ ...EMPTY_ITEM }], source: 'manual', thumb: images[0] ? images[0].thumb : null, step: 'review' });
  const changeItem = (i, o) => patch({ items: d.items.map((it, k) => (k === i ? { ...it, ...o } : it)) });
  const addItem = () => { focusLast.current = true; patch({ items: [...d.items, { ...EMPTY_ITEM }] }); };

  const save = async () => {
    const items = d.items.map(toNumbers).filter((i) => String(i.name).trim() || i.kcal > 0);
    if (!items.length) return setError('Adicione pelo menos um item.');
    if (!d.date || !d.time) return setError('Informe a data e o horário.');
    const body = { date: d.date, time: d.time, type: d.type, items, source: d.source };
    if (d.thumb) body.thumb = d.thumb;
    setSaving(true);
    setError('');
    try {
      const r = editing
        ? await api('PUT', `/api/u/${code}/meals/${meal.id}`, body)
        : await api('POST', `/api/u/${code}/meals`, body);
      onSaved(r.meal);
    } catch (e) {
      if (alive.current) { setSaving(false); setError(e.message); }
    }
  };
  const remove = async () => {
    if (!confirm('Excluir esta refeição?')) return;
    try {
      await api('DELETE', `/api/u/${code}/meals/${meal.id}`);
      onDeleted(meal.id);
    } catch (e) { setError(e.message); }
  };

  const Err = () => <div className="error" role="alert" hidden={!error}>{error}</div>;
  const close = (
    <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="x" /></button>
  );
  let label = 'Registrar refeição';
  let body;

  if (d.step === 'loading') {
    label = 'Analisando refeição';
    body = <div className="working" aria-live="polite"><div className="dots"><i /><i /><i /></div><b>Lendo o seu prato…</b><span>Isso leva alguns segundos.</span></div>;
  } else if (d.step === 'input') {
    body = (
      <>
        <header className="sheet-head"><h2>Registrar refeição</h2>{close}</header>
        <div className="chips" role="radiogroup" aria-label="Tipo de refeição">
          {TYPES.map(([k, l]) => <button key={k} className="chip" role="radio" aria-checked={d.type === k} onClick={() => patch({ type: k })}>{l}</button>)}
        </div>
        <div>
          <label className="field-label" htmlFor="meal-text">O que você comeu?</label>
          <textarea className="in" id="meal-text" rows={4} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: 2 ovos mexidos, 1 fatia de pão integral com requeijão e um café com leite" />
        </div>
        <div className="photos">
          {images.map((im, i) => (
            <div className="photo" key={i}><img src={im.thumb} alt={`Foto ${i + 1}`} />
              <button onClick={() => setImages(images.filter((_, k) => k !== i))} aria-label="Remover foto"><Icon name="x" size={14} /></button>
            </div>
          ))}
          {images.length < 3 && <label className="photo-add" htmlFor="meal-photo"><Icon name="camera" size={24} /><span>Foto</span></label>}
          <input id="meal-photo" type="file" accept="image/*" multiple hidden onChange={(e) => { const files = [...e.target.files]; e.target.value = ''; addPhotos(files); }} />
        </div>
        <p className="hint">Use texto, foto ou os dois. Com quantidades (“150 g de arroz”) a estimativa fica mais certeira.</p>
        <Err />
        <button className="btn primary big" onClick={analyze}><Icon name="sparkle" size={20} />Analisar com IA</button>
        <button className="btn link" onClick={manual}>Preencher manualmente</button>
      </>
    );
  } else {
    label = editing ? 'Editar refeição' : 'Conferir refeição';
    const typeOpts = TYPES.concat(d.type === 'outro' ? [['outro', 'Refeição']] : []);
    body = (
      <>
        <header className="sheet-head"><h2>{editing ? 'Editar refeição' : 'Confira e ajuste'}</h2>{close}</header>
        {d.note && <p className="ai-note"><Icon name="sparkle" size={16} /><span>{d.note}</span></p>}
        <div className="meta-row">
          <select className="in" value={d.type} onChange={(e) => patch({ type: e.target.value })} aria-label="Tipo de refeição">{typeOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <input className="in" type="date" value={d.date} max={today()} onChange={(e) => patch({ date: e.target.value })} aria-label="Data" />
          <input className="in" type="time" value={d.time} onChange={(e) => patch({ time: e.target.value })} aria-label="Horário" />
        </div>
        <div className="items">
          {d.items.map((it, i) => (
            <ItemRow key={i} it={it} inputRef={i === d.items.length - 1 ? lastItem : null}
              onChange={(o) => changeItem(i, o)} onRemove={() => patch({ items: d.items.filter((_, k) => k !== i) })} />
          ))}
        </div>
        <button className="btn ghost" onClick={addItem}><Icon name="plus" size={18} />Adicionar item</button>
        <Totals items={d.items} />
        <Err />
        <button className="btn primary big" onClick={save} disabled={saving}><Icon name="check" size={20} />Salvar refeição</button>
        {editing
          ? <button className="btn danger" onClick={remove}>Excluir refeição</button>
          : <button className="btn link" onClick={() => patch({ step: 'input' })}>Voltar</button>}
      </>
    );
  }

  return (
    <div id="sheet-root">
      <div className="backdrop" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={label}><div className="grab" />{body}</section>
    </div>
  );
}
