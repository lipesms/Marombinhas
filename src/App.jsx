import { useState, useEffect, useRef } from "react";

const uid = () => Math.random().toString(36).slice(2, 9);
const DEFAULT_TITLE = "Planejamento academia"

// Transforma "Felipe Souza!" em "felipe-souza" (só letras, números, - e _)
function slugify(text) {
  return decodeURIComponent(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 30);
}

/* Texto que vira input ao clicar. Salva ao sair do campo ou apertar Enter. */
function Editable({ value, onSave, className = "", autoEdit = false }) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(value);

  const finish = () => {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== value) onSave(v);
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        className={`editing ${className}`}
        value={draft}
        autoFocus
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={finish}
        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
        size={Math.max(draft.length, 3)}
      />
    );
  }
  return (
    <span
      className={`editable ${className}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {value}
    </span>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "light"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tema", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0f0f14" : "#f5f3f6");
  }, [theme]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Alternar tema claro e escuro"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

/* ---------------- Home (quando não tem nome na URL) ---------------- */
function Home() {
  const [name, setName] = useState("");
  const slug = slugify(name);

  const open = (e) => {
    e.preventDefault();
    if (slug) window.location.href = `/${slug}`;
  };

  return (
    <main className="app">
      <h1>Planejamento academia</h1>
      <p className="lead">Seu caderno de treino online. Sem cadastro, sem senha.</p>

      <section className="panel info">
        <p>
          <b>Seu treino mora num endereço com o seu nome.</b> Acessando{" "}
          <code>{location.host}/felipe</code> você vê e edita o treino do Felipe.
          Com <code>/carol</code>, o da Carol.
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

/* ---------------- Treino de uma pessoa ---------------- */
function Planner({ user }) {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [workouts, setWorkouts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [newId, setNewId] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [saved, setSaved] = useState("saved"); // saving | saved | error
  const skipSave = useRef(false);

  // 1) Busca os dados dessa pessoa no banco
  useEffect(() => {
    fetch(`/api/treino?user=${user}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(({ data }) => {
        // aceita o formato antigo (lista) e o novo ({ title, workouts })
        const saved = Array.isArray(data) ? data : data?.workouts;
        const list = saved?.length
          ? saved
          : [{ id: uid(), name: "Superior", exercises: [] }];
        setTitle((!Array.isArray(data) && data?.title) || DEFAULT_TITLE);
        setWorkouts(list);
        setActiveId(list[0].id);
        skipSave.current = true; // não regravar o que acabou de ser lido
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [user]);

  // 2) Grava no banco meio segundo depois da última alteração
  useEffect(() => {
    if (status !== "ready") return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    setSaved("saving");
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/treino?user=${user}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { title, workouts } }),
        });
        if (!r.ok) throw new Error();
        setSaved("saved");
      } catch {
        setSaved("error");
      }
    }, 500);
    return () => clearTimeout(t);
   }, [workouts, title, status, user]);

  const header = (
    <>
      <h1 className="page-title">
        {status === "ready" ? (
          <Editable value={title} onSave={setTitle} />
        ) : status === "error" ? (
          title
        ) : (
          "\u00A0"
        )}
      </h1>
      <div className="bar">
        <a href="/">← início</a>
        <span>
          {status === "loading" && "Carregando…"}
          {status === "ready" && saved === "saving" && "Salvando…"}
          {status === "ready" && saved === "saved" && "Salvo"}
          {status === "ready" && saved === "error" && "Não salvou"}
        </span>
      </div>
    </>
  );

  if (status !== "ready") {
    return (
      <main className="app">
        {header}
        {status === "error" && (
          <p className="warn">
            Não deu pra falar com o banco de dados. Recarregue a página; se
            continuar, confira se o banco está conectado ao projeto no Vercel.
          </p>
        )}
      </main>
    );
  }

  const active = workouts.find((w) => w.id === activeId) ?? workouts[0];

  /* ---- Treinos (abas) ---- */
  const addWorkout = () => {
    const w = { id: uid(), name: "Novo treino", exercises: [] };
    setWorkouts([...workouts, w]);
    setActiveId(w.id);
    setNewId(w.id);
  };
  const renameWorkout = (name) =>
    setWorkouts(workouts.map((w) => (w.id === active.id ? { ...w, name } : w)));
  const removeWorkout = () => {
    if (workouts.length === 1) return;
    if (!confirm(`Excluir o treino "${active.name}"?`)) return;
    const rest = workouts.filter((w) => w.id !== active.id);
    setWorkouts(rest);
    setActiveId(rest[0].id);
  };

  /* ---- Exercícios (linhas) ---- */
  const updateExercises = (fn) =>
    setWorkouts(
      workouts.map((w) =>
        w.id === active.id ? { ...w, exercises: fn(w.exercises) } : w
      )
    );
  const addExercise = () => {
    const ex = { id: uid(), name: "Novo exercício", series: "3x10", peso: "0Kg" };
    updateExercises((list) => [...list, ex]);
    setNewId(ex.id);
  };
  const editExercise = (id, field, value) =>
    updateExercises((list) =>
      list.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    );
  const removeExercise = (id) =>
    updateExercises((list) => list.filter((ex) => ex.id !== id));

  return (
    <main className="app">
      {header}

      <nav className="tabs" aria-label="Treinos">
        {workouts.map((w) => (
          <div
            key={w.id}
            className={`tab ${w.id === active.id ? "on" : ""}`}
            onClick={() => setActiveId(w.id)}
          >
            {w.id === active.id ? (
              <Editable
                key={w.id}
                value={w.name}
                onSave={renameWorkout}
                autoEdit={w.id === newId}
              />
            ) : (
              w.name
            )}
          </div>
        ))}
        <button className="tab plus" onClick={addWorkout} aria-label="Novo treino">
          +
        </button>
      </nav>

      <section className="panel">
        <div className="row head">
          <span>Treino</span>
          <span>Séries</span>
          <span>Peso</span>
          <span />
        </div>

        {active.exercises.length === 0 && (
          <p className="empty">Nenhum exercício ainda. Toque em “+ Adicionar”.</p>
        )}

        {active.exercises.map((ex) => (
          <div className="row" key={ex.id}>
            <Editable
              className="name"
              value={ex.name}
              autoEdit={ex.id === newId}
              onSave={(v) => editExercise(ex.id, "name", v)}
            />
            <Editable
              className="num"
              value={ex.series}
              onSave={(v) => editExercise(ex.id, "series", v)}
            />
            <Editable
              className="num"
              value={ex.peso}
              onSave={(v) => editExercise(ex.id, "peso", v)}
            />
            <button
              className="del"
              onClick={() => removeExercise(ex.id)}
              aria-label={`Remover ${ex.name}`}
            >
              ×
            </button>
          </div>
        ))}

        <button className="add" onClick={addExercise}>
          + Adicionar
        </button>
      </section>

      {workouts.length > 1 && (
        <button className="remove-workout" onClick={removeWorkout}>
          Excluir treino “{active.name}”
        </button>
      )}
    </main>
  );
}

export default function App() {
  const user = slugify(location.pathname.split("/")[1] || "");
  return (
    <>
      <ThemeToggle />
      {user ? <Planner user={user} /> : <Home />}
    </>
  );
}
