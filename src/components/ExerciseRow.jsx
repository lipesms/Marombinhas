import { useState } from "react";
import Editable from "./Editable";
import ExerciseDetails from "./ExerciseDetails";

// info = item da base ligado a este exercício (se existir e tiver detalhes)
export default function ExerciseRow({ ex, info, onEdit, onRemove }) {
  const [open, setOpen] = useState(false);
  const hasInfo = info && (info.photo || info.muscles || info.desc);

  return (
    <>
      <div className={`row ${open ? "open" : ""}`}>
        <div className="namecell">
          <Editable className="name" value={ex.name} onSave={(v) => onEdit("name", v)} />
          {hasInfo && (
            <button className="info" onClick={() => setOpen(!open)} aria-label="Ver detalhes do exercício">
              i
            </button>
          )}
        </div>
        <Editable className="num" value={ex.series} onSave={(v) => onEdit("series", v)} />
        <Editable className="num" value={ex.peso} onSave={(v) => onEdit("peso", v)} />
        <button className="del" onClick={onRemove} aria-label={`Remover ${ex.name}`}>×</button>
      </div>
      {open && hasInfo && (
        <div className="details-wrap">
          <ExerciseDetails item={info} />
        </div>
      )}
    </>
  );
}
