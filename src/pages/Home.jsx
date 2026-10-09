import { useState } from "react";
import { slugify } from "../lib/utils";

export default function Home() {
  const [name, setName] = useState("");
  const slug = slugify(name);

  const open = (e) => {
    e.preventDefault();
    if (slug) window.location.href = `/${slug}`;
  };

  return (
    <main className="app">
      <img className="logo" src="/logo.png" alt="Pombo maromba" />
      <h1 className="brand">Marombinhas</h1>
      <p className="lead">Seu caderno de treino online. Sem cadastro, sem senha.</p>

      <section className="panel info">
        <p>
          <b>Seu treino mora num endereço com o seu nome.</b> Acessando{" "}
          <code>{location.host}/felipe</code> você vê e edita o treino do Felipe.
          Com <code>/carol</code>, o da Carol.
        </p>
        <p>
          <b>Monte seu catálogo de exercícios.</b> Em{" "}
          <code>/felipe/exercicios</code> você cadastra os exercícios que costuma
          fazer e escolhe da lista na hora de montar o treino (ou digita um novo).
        </p>
        <p>
          <b>Abra de qualquer aparelho.</b> Celular, computador, o que for: o
          treino é o mesmo e fica salvo na nuvem.
        </p>
        <p>
          <b>Toque num texto pra editar.</b> Exercícios, séries, pesos e nomes
          dos treinos. Tudo salva sozinho.
        </p>

        <form className="start" onSubmit={open}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="seu nome"
            aria-label="Seu nome"
            maxLength={30}
          />
          <button className="add" type="submit" disabled={!slug}>
            Abrir meu treino
          </button>
        </form>
        <p className="preview">{location.host}/{slug || "seunome"}</p>
      </section>

      <p className="warn">
        Não existe senha: quem souber o seu endereço consegue ver e editar o seu
        treino. Não guarde nada sigiloso e escolha um nome difícil de adivinhar.
      </p>
    </main>
  );
}
