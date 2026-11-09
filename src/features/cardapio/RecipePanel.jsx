import { useState } from 'react';
import PhotoField from '../../components/PhotoField.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../lib/api.js';
import { photoUrl, uploadPhoto } from '../../lib/photos.js';
import { byName, fmtN, fold, longId, parseNum, recipeId } from '../../lib/utils.js';

const fieldVal = (n) => (n ? String(n).replace('.', ',') : '');
const NO_PHOTO = { data: null, removed: false };

function Chips({ r }) {
  return (
    <>
      <span className="r-m p">P {fmtN(r.p, 1)}</span><span className="r-m c">C {fmtN(r.c, 1)}</span><span className="r-m f">G {fmtN(r.f, 1)}</span>
      {r.fi ? <span className="r-m fi">Fib {fmtN(r.fi, 1)}</span> : null}
    </>
  );
}

const fmtAmount = (n) => fmtN(n, 2);

/* Detalhes da receita: ajuste de porções (− / +) recalcula as quantidades dos ingredientes e o total de macros. */
function Details({ r, canEdit, canCopy, onEdit, onDelete, onCopy }) {
  const base = r.servings || 1;
  const [n, setN] = useState(base);
  const k = n / base;
  const ings = r.ingredients || [];
  const mac = (label, v, unit) => <div className="r-mac"><b className="num">{fmtN(v, 1)}</b><small>{label}{unit ? ` (${unit})` : ''}</small></div>;
  return (
    <div className="r-details">
      {r.photo && <img className="r-photo" src={photoUrl(r.photo)} alt={r.name} loading="lazy" />}
      <p className="r-portion">Cada porção: <b>{r.portion}</b></p>
      <div className="r-macs">
        {mac('kcal', r.kcal, '')}{mac('Proteínas', r.p, 'g')}{mac('Carboidratos', r.c, 'g')}{mac('Gorduras', r.f, 'g')}{r.fi ? mac('Fibras', r.fi, 'g') : null}
      </div>
      <div className="r-servings">
        <span>Porções</span>
        <div className="r-stepper">
          <button type="button" onClick={() => setN(Math.max(1, n - 1))} disabled={n <= 1} aria-label="Diminuir porções">−</button>
          <b className="num" aria-live="polite">{fmtAmount(n)}</b>
          <button type="button" onClick={() => setN(Math.min(100, n + 1))} aria-label="Aumentar porções">+</button>
        </div>
        {n !== base && <button type="button" className="btn link" onClick={() => setN(base)}>Voltar para {fmtAmount(base)}</button>}
      </div>
      <p className="small num">Total para {fmtAmount(n)} {n === 1 ? 'porção' : 'porções'}: <b>{fmtN(r.kcal * n, 0)} kcal</b> · P {fmtN(r.p * n, 1)} · C {fmtN(r.c * n, 1)} · G {fmtN(r.f * n, 1)}</p>
      {ings.length > 0 && (
        <div className="r-prep"><h4>Ingredientes</h4>
          <ul className="r-ings">
            {ings.map((i, idx) => <li key={idx}><b className="num">{i.amount == null ? '' : `${fmtAmount(i.amount * k)} ${i.unit}`.trim()}</b><span>{i.name}</span></li>)}
          </ul>
        </div>
      )}
      {r.prep ? <div className="r-prep"><h4>Modo de preparo</h4><p>{r.prep}</p></div> : <p className="small">Sem modo de preparo cadastrado.</p>}
      <div className="r-actions">
        {canCopy && <button className="btn primary" onClick={onCopy}>+ Adicionar ao meu cardápio</button>}
        {canEdit && <><button className="btn ghost" onClick={onEdit}>Editar</button><button className="btn danger" onClick={onDelete}>Excluir</button></>}
      </div>
    </div>
  );
}

function RecipeForm({ recipe, saveUrl, onSaved, onCancel }) {
  const toast = useToast();
  const [photo, setPhoto] = useState(NO_PHOTO);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const x = recipe || {};
  // Ingredientes em edição: quantidade como texto enquanto digita ("1," não vira "1")
  const [ings, setIngs] = useState(() => (x.ingredients || []).map((i) => ({ amount: i.amount == null ? '' : String(i.amount).replace('.', ','), unit: i.unit || '', name: i.name })));
  const setIng = (idx, o) => setIngs((cur) => cur.map((it, k) => (k === idx ? { ...it, ...o } : it)));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (!name) return setError('Dê um nome à receita.');
    setBusy(true);
    setError('');
    try {
      let photoId = photo.removed ? '' : x.photo || '';
      if (photo.data) { photoId = longId(); await uploadPhoto(photoId, photo.data); }
      const item = {
        id: x.id || recipeId(), name, photo: photoId,
        portion: String(fd.get('portion') || '').trim() || '1 porção',
        kcal: Math.round(parseNum(fd.get('kcal'))), p: parseNum(fd.get('p')), c: parseNum(fd.get('c')), f: parseNum(fd.get('f')), fi: parseNum(fd.get('fi')),
        servings: Math.max(1, parseNum(fd.get('servings')) || 1),
        ingredients: ings.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), amount: String(i.amount).trim() === '' ? null : parseNum(i.amount), unit: i.unit.trim() })),
        prep: String(fd.get('prep') || '').trim(),
      };
      const r = await api('PUT', saveUrl(item.id), item);
      onSaved(r.item);
      toast('Receita salva');
    } catch (err) {
      setBusy(false);
      setError(err.message || 'Não deu para salvar.');
    }
  };

  const num = (name, label) => <label>{label}<input className="in num" name={name} inputMode="decimal" defaultValue={fieldVal(x[name])} placeholder="0" /></label>;
  return (
    <form className="r-form" onSubmit={submit} noValidate>
      <label>Nome da receita<input className="in" name="name" maxLength={80} defaultValue={x.name || ''} placeholder="Ex.: Arroz com cenoura" autoFocus={!recipe} /></label>
      <PhotoField current={x.photo} value={photo} onChange={setPhoto} onError={setError} />
      <div className="r-grid">
        <label>Tamanho de cada porção<input className="in" name="portion" maxLength={30} defaultValue={x.portion || ''} placeholder="Ex.: 100 g, 1 fatia" /></label>
        <label>A receita rende (porções)<input className="in num" name="servings" inputMode="decimal" defaultValue={x.servings && x.servings !== 1 ? String(x.servings).replace('.', ',') : ''} placeholder="1" /></label>
      </div>
      <div className="r-grid">
        {num('kcal', 'Calorias (kcal)')}{num('p', 'Proteínas (g)')}{num('c', 'Carboidratos (g)')}{num('f', 'Gorduras (g)')}{num('fi', 'Fibras (g)')}
      </div>
      <div className="r-ing-edit">
        <span className="r-ing-title">Ingredientes <small>(opcional; informe as quantidades para a receita poder ser ajustada por porções)</small></span>
        {ings.map((it, idx) => (
          <div className="r-ing-row" key={idx}>
            <input className="in num" inputMode="decimal" value={it.amount} onChange={(e) => setIng(idx, { amount: e.target.value })} placeholder="Qtd." aria-label="Quantidade" />
            <input className="in" value={it.unit} onChange={(e) => setIng(idx, { unit: e.target.value })} placeholder="Un." aria-label="Unidade" maxLength={15} />
            <input className="in" value={it.name} onChange={(e) => setIng(idx, { name: e.target.value })} placeholder="Ingrediente" aria-label="Ingrediente" maxLength={80} />
            <button type="button" className="rm" onClick={() => setIngs((cur) => cur.filter((_, k) => k !== idx))} aria-label="Remover ingrediente">×</button>
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={() => setIngs((cur) => [...cur, { amount: '', unit: '', name: '' }])}>+ Adicionar ingrediente</button>
      </div>
      <label>Modo de preparo <small>(opcional)</small><textarea className="in" name="prep" rows={5} maxLength={2000} defaultValue={x.prep || ''} placeholder="Ingredientes e passo a passo" /></label>
      <p className="error" role="alert" hidden={!error}>{error}</p>
      <div className="b-actions">
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
        <button className="btn ghost" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

/*
 * Lista de receitas com busca, detalhes e (quando permitido) criar/editar/excluir.
 *  ctx 'mine' = cardápio da pessoa (/api/rec/<nome>), 'base' = base geral só leitura, 'mgr' = base geral editável (/receitas).
 */
export default function RecipePanel({ ctx, slug, collection, onCopyToMine }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [formId, setFormId] = useState(null); // id em edição ou 'new'
  const canEdit = ctx !== 'base';
  const saveUrl = (id) => (ctx === 'mine' ? `/api/rec/${slug}/${id}` : `/api/rbase/${id}`);
  const reset = () => { setOpenId(null); setFormId(null); };

  const del = async (r) => {
    if (!confirm(`Excluir "${r.name}"${ctx === 'mgr' ? ' da base' : ' do seu cardápio'}?`)) return;
    try {
      await api('DELETE', saveUrl(r.id));
      collection.remove(r.id);
      reset();
      toast('Receita excluída');
    } catch (e) { toast(e.message); }
  };
  const saved = (item) => { collection.upsert(item); reset(); };

  if (collection.status === 'idle' || collection.status === 'loading') return <div className="loading">Carregando…</div>;
  if (collection.status === 'error') return <div className="empty"><b>Não consegui abrir as receitas</b><button className="btn ghost" onClick={collection.reload}>Tentar de novo</button></div>;

  const term = fold(q.trim());
  const shown = collection.items.filter((r) => !term || fold(r.name).includes(term)).sort(byName);
  const emptyText = ctx === 'mine'
    ? 'Seu cardápio ainda está vazio. Crie uma receita sua ou adicione uma da base.'
    : 'Nenhuma receita aqui ainda.';

  return (
    <>
      <input className="in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar receita" aria-label="Buscar receita" autoComplete="off" style={{ margin: '10px 0 4px' }} />
      <div>
        {shown.length ? shown.map((r) => {
          const open = openId === r.id || formId === r.id;
          return (
            <div className="b-item" key={r.id}>
              <button className="b-head r-head" onClick={() => { const was = open; reset(); if (!was) setOpenId(r.id); }} aria-expanded={open}>
                {r.photo ? <img className="b-thumb" src={photoUrl(r.photo)} alt="" loading="lazy" /> : <span className="b-thumb ph" aria-hidden="true">{(r.name[0] || '?').toUpperCase()}</span>}
                <span className="b-text">
                  <span className="b-name">{r.name}</span>
                  <span className="b-sub num">{r.portion} · {fmtN(r.kcal, 0)} kcal</span>
                  <span className="r-chips"><Chips r={r} /></span>
                </span>
                <span className="b-chev" aria-hidden="true">{open ? '–' : '+'}</span>
              </button>
              {formId === r.id
                ? <RecipeForm recipe={r} saveUrl={saveUrl} onSaved={saved} onCancel={reset} />
                : openId === r.id && <Details r={r} canEdit={canEdit} canCopy={ctx === 'base'}
                  onEdit={() => { setFormId(r.id); setOpenId(null); }} onDelete={() => del(r)} onCopy={() => onCopyToMine(r)} />}
            </div>
          );
        }) : <p className="t-empty">{collection.items.length ? 'Nenhuma receita encontrada.' : emptyText}</p>}
        {canEdit && (formId === 'new'
          ? <RecipeForm recipe={null} saveUrl={saveUrl} onSaved={saved} onCancel={reset} />
          : <button className="t-add" onClick={() => { reset(); setFormId('new'); }}>+ Nova receita</button>)}
      </div>
    </>
  );
}
