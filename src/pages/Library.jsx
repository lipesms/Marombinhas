import { useState } from "react";
import { useUserData } from "../hooks/useUserData";
import { uid } from "../lib/utils";
import Editable from "../components/Editable";
import TopBar from "../components/TopBar";
import StatusScreen from "../components/StatusScreen";

// /:user/exercicios -> cadastrar, renomear e apagar exercícios do catálogo
export default function Library({ user }) {
  const { data, update, status, saved } = useUserData(user);
  const [name, setName] = useState("");

  if (status !== "ready") {
    return <StatusScreen status={status} backHref={`/${user}`} backLabel="← meu treino" />;
  }

  const lib = data.library;
  const setLib = (fn) => update((d) => ({ ...d, library: fn(d.library) }));
  const taken = (n) => lib.some((x) => x.name.toLowerCase() === n.toLowerCase());

  const add = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || taken(n)) return;
    setLib((list) => [...list, { id: uid(), name: n }]);
    setName("");
  };
  const rename = (id, n) => {
    if (taken(n)) return;
    setLib((list) => list.map((x) => (x.id === id ? { ...x, name: n } : x)));
  };
  const remove = (id) => setLib((list) => list.filter((x) => x.id !== id));

  return (
    <main className="app">
      <h1 className="page-title">Catálogo</h1>
      <TopBar backHref={`/${user}`} backLabel="← meu treino" status={status} saved={saved} />

      <section className="panel">
        <div className="row lib head">
          <span>Exercício</span>
          <span />
        </div>

        {lib.length === 0 && <p className="empty">Nenhum exercício cadastrado ainda.</p>}

        {lib.map((x) => (
          <div className="row lib" key={x.id}>
            <Editable className="name" value={x.name} onSave={(n) => rename(x.id, n)} />
            <button className="del" onClick={() => remove(x.id)} aria-label={`Remover ${x.name}`}>
              ×
            </button>
          </div>
        ))}

        <form className="start" onSubmit={add}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="novo exercício"
            aria-label="Novo exercício"
            maxLength={60}
          />
          <button className="add" type="submit" disabled={!name.trim()}>
            + Adicionar
          </button>
        </form>
      </section>

      <p className="warn">
        Os exercícios cadastrados aparecem como opção ao montar seus treinos.
        Apagar um exercício daqui não remove ele dos treinos que já o usam.
      </p>
    </main>
  );
}
