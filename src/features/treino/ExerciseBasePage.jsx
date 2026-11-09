import { useState } from 'react';
import PlainShell from '../../components/PlainShell.jsx';
import PhotoField from '../../components/PhotoField.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useCollection } from '../../hooks/useCollection.js';
import { api } from '../../lib/api.js';
import { deletePhoto, photoUrl, uploadPhoto } from '../../lib/photos.js';
import { longId, uid } from '../../lib/utils.js';

const NO_PHOTO = { data: null, removed: false };

function ExerciseForm({ item, onSaved, onCancel, onDelete }) {
  const toast = useToast();
  const [photo, setPhoto] = useState(NO_PHOTO);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (!name) return setError('Dê um nome ao exercício.');
    let link = String(fd.get('link') || '').trim();
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
    setBusy(true);
    setError('');
    let uploaded = null;
    try {
      let photoId = photo.removed ? '' : (item && item.photo) || '';
      if (photo.data) { uploaded = longId(); await uploadPhoto(uploaded, photo.data); photoId = uploaded; }
      const body = { id: item ? item.id : uid(), name, muscles: String(fd.get('muscles') || '').trim(), desc: String(fd.get('desc') || '').trim(), link, photo: photoId };
      const r = await api('PUT', `/api/base/${body.id}`, body);
      if (item && item.photo && item.photo !== r.item.photo) deletePhoto(item.photo);
      onSaved(r.item);
      toast('Exercício salvo');
    } catch (err) {
      if (uploaded) deletePhoto(uploaded);
      setBusy(false);
      setError(err.message || 'Não deu para salvar.');
    }
  };

  const x = item || {};
  return (
    <form className="b-form" onSubmit={submit} noValidate>
      <label>Nome<input className="in" name="name" maxLength={60} defaultValue={x.name || ''} placeholder="Nome do exercício" autoFocus={!item} /></label>
      <label>Ativação muscular <small>(opcional)</small><input className="in" name="muscles" maxLength={120} defaultValue={x.muscles || ''} placeholder="ex.: peitoral, tríceps, ombro anterior" /></label>
      <label>Descrição <small>(opcional)</small><textarea className="in" name="desc" rows={3} maxLength={400} defaultValue={x.desc || ''} placeholder="Como executar o movimento" /></label>
      <label>Link de exemplo <small>(opcional)</small><input className="in" name="link" inputMode="url" maxLength={300} defaultValue={x.link || ''} placeholder="https://..." /></label>
      <PhotoField current={x.photo} value={photo} onChange={setPhoto} onError={setError} />
      <p className="error" role="alert" hidden={!error}>{error}</p>
      <div className="b-actions">
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
        <button className="btn ghost" type="button" onClick={onCancel}>Cancelar</button>
        {item && <button className="btn danger" type="button" onClick={() => onDelete(item)}>Excluir</button>}
      </div>
    </form>
  );
}

/* Página escondida /exercicios: único lugar que cadastra, edita e apaga exercícios da base global. */
export default function ExerciseBasePage() {
  const toast = useToast();
  const base = useCollection('/api/base');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);

  const close = () => { setOpenId(null); setCreating(false); };
  const term = q.trim().toLowerCase();
  const shown = base.items.filter((i) => !term || i.name.toLowerCase().includes(term) || (i.muscles || '').toLowerCase().includes(term));

  const del = async (it) => {
    if (!confirm(`Excluir "${it.name}" da base?`)) return;
    try {
      await api('DELETE', `/api/base/${it.id}`);
      base.remove(it.id);
      if (it.photo) deletePhoto(it.photo);
      setOpenId(null);
      toast('Exercício excluído');
    } catch (err) { toast(err.message); }
  };
  const saved = (item) => { base.upsert(item); close(); };

  let list;
  if (base.status === 'loading' || base.status === 'idle') list = <div className="loading">Carregando a base…</div>;
  else if (base.status === 'error') list = <div className="empty"><b>Não consegui abrir a base</b><button className="btn ghost" onClick={base.reload}>Tentar de novo</button></div>;
  else {
    list = (
      <>
        {shown.length ? shown.map((it) => (
          <div className="b-item" key={it.id}>
            <button className="b-head" onClick={() => { setOpenId(openId === it.id ? null : it.id); setCreating(false); }} aria-expanded={openId === it.id}>
              {it.photo ? <img className="b-thumb" src={photoUrl(it.photo)} alt="" loading="lazy" /> : <span className="b-thumb ph" aria-hidden="true">{it.name[0] || '?'}</span>}
              <span className="b-text"><span className="b-name">{it.name}</span>{it.muscles && <span className="b-sub">{it.muscles}</span>}</span>
              <span className="b-chev" aria-hidden="true">{openId === it.id ? '–' : '+'}</span>
            </button>
            {openId === it.id && <ExerciseForm item={it} onSaved={saved} onCancel={close} onDelete={del} />}
          </div>
        )) : <p className="t-empty">{base.items.length ? 'Nenhum exercício encontrado.' : 'A base está vazia.'}</p>}
        {creating
          ? <ExerciseForm item={null} onSaved={saved} onCancel={close} />
          : <button className="t-add" onClick={() => { setCreating(true); setOpenId(null); }}>+ Novo exercício</button>}
      </>
    );
  }

  return (
    <PlainShell title="Exercícios" back="/" label="← início">
      <section className="card t-panel">
        <input id="b-q" className="in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou músculo" aria-label="Buscar exercício" autoComplete="off" />
        <div>{list}</div>
      </section>
      <p className="small">Esta base é de todo mundo: os exercícios cadastrados aparecem para qualquer pessoa na hora de montar o treino. Quem escolher da base também vê a descrição, a foto e o link de exemplo no treino, pelo botão “i”.</p>
    </PlainShell>
  );
}
