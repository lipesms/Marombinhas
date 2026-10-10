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
      <header className="hero">
        <img className="logo" src="/logo.png" alt="Pombo maromba" />
        <h1 className="brand">Olá, Marombinhas!</h1>
      </header>
      <p className="lead">Seu caderno de treino online. Sem cadastro, sem senha.</p>

      <section className="panel info">
        <p>
          <b>Seu treino mora num endereço com o seu nome.</b> Acessando{" "}
          <code>{location.host}/felipe</code> você vê e edita o treino do Felipe.
          Com <code>/carol</code>, o da Carol.
        </p>
        <p>
          <b>Base de exercícios para todos.</b> Em <code>/exercicios</code> fica a
          base global: já tem vários exercícios cadastrados e você pode criar os
          seus, com descrição, ativação muscular e foto (tudo opcional). Na hora
          de montar o treino é só escolher da base ou digitar um nome.
        </p>
        <p>
          <b>Acompanhe a evolução.</b> Cada vez que você muda o peso de um
          exercício, o valor entra no histórico. Veja os gráficos em{" "}
          <code>/felipe/evolucao</code>.
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
