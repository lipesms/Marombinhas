import Editable from "./Editable";

export default function WorkoutTabs({ workouts, activeId, newId, onSelect, onRename, onAdd }) {
  return (
    <nav className="tabs" aria-label="Treinos">
      {workouts.map((w) => (
        <div
          key={w.id}
          className={`tab ${w.id === activeId ? "on" : ""}`}
          onClick={() => onSelect(w.id)}
        >
          {w.id === activeId ? (
            <Editable key={w.id} value={w.name} onSave={onRename} autoEdit={w.id === newId} />
          ) : (
            w.name
          )}
        </div>
      ))}
      <button className="tab plus" onClick={onAdd} aria-label="Novo treino">+</button>
    </nav>
  );
}
