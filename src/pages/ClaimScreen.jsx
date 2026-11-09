import { useState } from 'react';
import { Brand } from '../components/Brand.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../lib/api.js';

/* Aparece quando o endereço ainda não tem painel. */
export default function ClaimScreen({ slug, onCreated }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      await api('POST', '/api/create', { slug });
      onCreated();
    } catch (e) { setBusy(false); toast(e.message); }
  };
  return (
    <div className="land">
      <div className="top"><Brand /><ThemeToggle /></div>
      <div className="claim card">
        <h1>Esse painel ainda não existe</h1>
        <p className="lead" style={{ padding: 0 }}>Quer criar <b>{location.host}/{slug}</b> agora?</p>
        <p className="small">Sem senha: quem souber esse endereço consegue ver e editar o painel.</p>
        <button className="btn primary big" onClick={create} disabled={busy}>{busy ? 'Criando…' : `Criar /${slug}`}</button>
        <a className="btn ghost big" href="/">Escolher outro nome</a>
      </div>
    </div>
  );
}
