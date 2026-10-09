import { useState } from "react";

/* Texto que vira input ao clicar. Salva ao sair do campo ou apertar Enter. */
export default function Editable({ value, onSave, className = "", autoEdit = false }) {
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
