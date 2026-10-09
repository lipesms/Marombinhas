import { useState } from "react";
import { useUserData } from "../hooks/useUserData";
import { useBase } from "../hooks/useBase";
import { uid } from "../lib/utils";
import { parseKg, logWeight } from "../lib/weights";
import Editable from "../components/Editable";
import TopBar from "../components/TopBar";
import StatusScreen from "../components/StatusScreen";
import WorkoutTabs from "../components/WorkoutTabs";
import ExerciseRow from "../components/ExerciseRow";
import ExercisePicker from "../components/ExercisePicker";

export default function Planner({ user }) {
  const { data, update, status, saved } = useUserData(user);
  const base = useBase();
  const [activeId, setActiveId] = useState(null);
  const [newTabId, setNewTabId] = useState(null); // aba recém-criada abre em edição
  const [picking, setPicking] = useState(false);

  if (status !== "ready") {
    return <StatusScreen status={status} backHref="/" backLabel="← início" />;
  }

  const { title, workouts, library } = data;
  const active = workouts.find((w) => w.id === activeId) ?? workouts[0];

  // Opções do seletor: base global + catálogo pessoal da versão anterior (sem repetir nomes)
  const baseItems = base.data?.items ?? [];
  const names = new Set(baseItems.map((b) => b.name.toLowerCase()));
  const pickerItems = [
    ...baseItems,
    ...library.filter((l) => !names.has(l.name.toLowerCase())),
  ].map((i) => ({ id: i.id, name: i.name }));

  /* ---- treinos (abas) ---- */
  const setWorkouts = (fn) => update((d) => ({ ...d, workouts: fn(d.workouts) }));

  const addWorkout = () => {
    const w = { id: uid(), name: "Novo treino", exercises: [] };
    setWorkouts((list) => [...list, w]);
    setActiveId(w.id);
    setNewTabId(w.id);
    setPicking(false);
  };
  const renameWorkout = (name) =>
    setWorkouts((list) => list.map((w) => (w.id === active.id ? { ...w, name } : w)));
  const removeWorkout = () => {
    if (workouts.length === 1) return;
    if (!confirm(`Excluir o treino "${active.name}"?`)) return;
    const rest = workouts.filter((w) => w.id !== active.id);
    setWorkouts(() => rest);
    setActiveId(rest[0].id);
  };

  /* ---- exercícios (linhas) ---- */
  const updateExercises = (fn) =>
    setWorkouts((list) =>
      list.map((w) => (w.id === active.id ? { ...w, exercises: fn(w.exercises) } : w))
    );

  // item vem do seletor: { id, name } se for da base, ou só { name } se for digitado
  const addExercise = (item) => {
    const fromBase = item.id && baseItems.some((b) => b.id === item.id);
    updateExercises((list) => [
      ...list,
      {
        id: uid(),
        name: item.name,
        series: "3x10",
        peso: "0Kg",
        history: [],
        ...(fromBase ? { baseId: item.id } : {}),
      },
    ]);
  };

  // Ao mudar o peso, registra o valor de hoje no histórico (usado na página de evolução)
  const editExercise = (id, field, value) =>
    updateExercises((list) =>
      list.map((ex) => {
        if (ex.id !== id) return ex;
        const next = { ...ex, [field]: value };
        if (field === "peso") next.history = logWeight(ex.history, parseKg(value));
        return next;
      })
    );
  const removeExercise = (id) => updateExercises((list) => list.filter((ex) => ex.id !== id));

  return (
    <main className="app">
      <h1 className="page-title">
        <Editable value={title} onSave={(t) => update((d) => ({ ...d, title: t }))} />
      </h1>
      <TopBar backHref="/" backLabel="← início" status={status} saved={saved} />

      <WorkoutTabs
        workouts={workouts}
        activeId={active.id}
        newId={newTabId}
        onSelect={(id) => { setActiveId(id); setPicking(false); }}
        onRename={renameWorkout}
        onAdd={addWorkout}
      />

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
          <ExerciseRow
            key={ex.id}
            ex={ex}
            info={baseItems.find((b) => b.id === ex.baseId)}
            onEdit={(field, v) => editExercise(ex.id, field, v)}
            onRemove={() => removeExercise(ex.id)}
          />
        ))}

        {picking ? (
          <ExercisePicker
            items={pickerItems}
            loading={base.status === "loading"}
            user={user}
            onPick={addExercise}
            onClose={() => setPicking(false)}
          />
        ) : (
          <button className="add" onClick={() => setPicking(true)}>+ Adicionar</button>
        )}
      </section>

      <div className="foot">
        <a href={`/${user}/evolucao`}>Evolução dos pesos</a>
        <a href={`/${user}/exercicios`}>Base de exercícios</a>
        {workouts.length > 1 && (
          <button onClick={removeWorkout}>Excluir treino “{active.name}”</button>
        )}
      </div>
    </main>
  );
}
