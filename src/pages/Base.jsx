import { useState } from "react";
import { useBase } from "../hooks/useBase";
import { uid } from "../lib/utils";
import { deletePhoto, photoUrl } from "../lib/image";
import TopBar from "../components/TopBar";
import StatusScreen from "../components/StatusScreen";
import ExerciseForm from "../components/ExerciseForm";

/*
  Base GLOBAL de exercícios (/exercicios, ou /felipe/exercicios — é a mesma base).
  Qualquer pessoa pode cadastrar/editar; todos veem os mesmos exercícios no seletor.
*/
export default function Base({ backHref, backLabel }) {
  const { data, update, status, saved } = useBase();
  const [openId, setOpenId] = useState(null); // item aberto para edição
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");

  if (status !== "ready") {
    return <StatusScreen status={status} backHref={backHref} backLabel={backLabel} />;
  }

  const items = data.items;
  const taken = (name, exceptId) =>
    items.some((i) => i.id !== exceptId && i.name.toLowerCase() === name.toLowerCase());

  const create = async (values) => {
    if (taken(values.name)) throw new Error("Já existe um exercício com esse nome");
    update((d) => ({ ...d, items: [...d.items, { id: uid(), ...values }] }));
    setCreating(false);
  };
  const edit = (id) => async (values) => {
    if (taken(values.name, id)) throw new Error("Já existe um exercício com esse nome");
    update((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...values } : i)) }));
    setOpenId(null);
  };
  const remove = (item) => {
    if (!confirm(`Excluir "${item.name}" da base?`)) return;
    update((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id) }));
    if (item.photo) deletePhoto(item.photo);
    setOpenId(null);
  };

  const term = q.trim().toLowerCase();
  const shown = items.filter(
    (i) => !term || i.name.toLowerCase().includes(term) || (i.muscles || "").toLowerCase().includes(term)
  );

  return (
    <main className="app">
      <h1 className="page-title">Exercícios</h1>
      <TopBar backHref={backHref} backLabel={backLabel} status={status} saved={saved} />

      <section className="panel">
        <div className="base-search">
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou músculo"
            aria-label="Buscar exercício"
          />
        </div>

        {shown.length === 0 && (
          <p className="empty">
            {items.length === 0 ? "A base está vazia." : "Nenhum exercício encontrado."}
          </p>
        )}

        {shown.map((item) => (
          <div className="xitem" key={item.id}>
            <button
              className="xhead"
              onClick={() => { setOpenId(openId === item.id ? null : item.id); setCreating(false); }}
              aria-expanded={openId === item.id}
            >
              {item.photo ? (
                <img className="thumb" src={photoUrl(item.photo)} alt="" loading="lazy" />
              ) : (
                <span className="thumb ph" aria-hidden="true">{item.name[0]}</span>
              )}
              <span className="xtext">
                <span className="name">{item.name}</span>
                {item.muscles && <span className="sub">{item.muscles}</span>}
              </span>
              <span className="chev" aria-hidden="true">{openId === item.id ? "–" : "+"}</span>
            </button>

            {openId === item.id && (
              <ExerciseForm
                initial={item}
                onSubmit={edit(item.id)}
                onCancel={() => setOpenId(null)}
                onDelete={() => remove(item)}
              />
            )}
          </div>
        ))}

        {creating ? (
          <ExerciseForm onSubmit={create} onCancel={() => setCreating(false)} />
        ) : (
          <button className="add" onClick={() => { setCreating(true); setOpenId(null); }}>
            + Novo exercício
          </button>
        )}
      </section>

      <p className="warn">
        Esta base é de todo mundo: os exercícios cadastrados aqui aparecem para
        qualquer pessoa na hora de montar o treino. Quem escolher da base também
        vê a descrição e a foto no treino, pelo botão “i”.
      </p>
    </main>
  );
}
