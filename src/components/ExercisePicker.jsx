import { useState } from "react";

/*
  Aparece ao tocar em "+ Adicionar".
  Escolha um exercício da base OU digite um nome próprio (Enter ou "+ Usar ...").
  items: [{ id, name }]      onPick({ id?, name })
*/
export default function ExercisePicker({ items, loading, user, onPick, onClose }) {
  const [q, setQ] = useState("");
  const term = q.trim();
  const low = term.toLowerCase();
  const matches = items.filter((e) => e.name.toLowerCase().includes(low));
  const exact = items.find((e) => e.name.toLowerCase() === low);

  const pick = (item) => {
    onPick(item);
    setQ("");
  };
  const submit = (e) => {
    e.preventDefault();
    if (term) pick(exact || { name: term });
  };

  return (
    <div className="picker">
      <form onSubmit={submit}>
        <input
          autoFocus
          value={q}
          maxLength={60}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Escolha da base ou digite um nome"
          aria-label="Exercício"
        />
      </form>

      <div className="chips">
        {matches.map((e) => (
          <button key={e.id} type="button" className="chip" onClick={() => pick(e)}>
            {e.name}
          </button>
        ))}
        {term && !exact && (
          <button type="button" className="chip new" onClick={() => pick({ name: term })}>
            + Usar “{term}”
          </button>
        )}
      </div>

      {loading && <p className="empty">Carregando a base…</p>}
      {!loading && items.length === 0 && !term && (
        <p className="empty">A base está vazia. Digite um nome acima ou cadastre exercícios na base.</p>
      )}

      <div className="picker-foot">
        <a href={`/${user}/exercicios`}>Gerenciar base</a>
        <button type="button" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
