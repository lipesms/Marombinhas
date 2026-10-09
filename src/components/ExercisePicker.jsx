import { useState } from "react";

/*
  Aparece ao tocar em "+ Adicionar".
  Escolha um exercício do catálogo OU digite um nome próprio (Enter ou "+ Usar ...").
*/
export default function ExercisePicker({ library, user, onPick, onClose }) {
  const [q, setQ] = useState("");
  const term = q.trim();
  const low = term.toLowerCase();
  const matches = library.filter((e) => e.name.toLowerCase().includes(low));
  const exact = library.find((e) => e.name.toLowerCase() === low);

  const pick = (name) => {
    onPick(name);
    setQ("");
  };
  const submit = (e) => {
    e.preventDefault();
    if (term) pick(exact ? exact.name : term);
  };

  return (
    <div className="picker">
      <form onSubmit={submit}>
        <input
          autoFocus
          value={q}
          maxLength={60}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Escolha da lista ou digite um nome"
          aria-label="Exercício"
        />
      </form>

      <div className="chips">
        {matches.map((e) => (
          <button key={e.id} type="button" className="chip" onClick={() => pick(e.name)}>
            {e.name}
          </button>
        ))}
        {term && !exact && (
          <button type="button" className="chip new" onClick={() => pick(term)}>
            + Usar “{term}”
          </button>
        )}
      </div>

      {library.length === 0 && !term && (
        <p className="empty">
          Seu catálogo está vazio. Digite um nome acima ou cadastre exercícios no catálogo.
        </p>
      )}

      <div className="picker-foot">
        <a href={`/${user}/exercicios`}>Gerenciar catálogo</a>
        <button type="button" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
