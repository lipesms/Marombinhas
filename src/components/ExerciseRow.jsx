import Editable from "./Editable";

export default function ExerciseRow({ ex, onEdit, onRemove }) {
  return (
    <div className="row">
      <Editable className="name" value={ex.name} onSave={(v) => onEdit("name", v)} />
      <Editable className="num" value={ex.series} onSave={(v) => onEdit("series", v)} />
      <Editable className="num" value={ex.peso} onSave={(v) => onEdit("peso", v)} />
      <button className="del" onClick={onRemove} aria-label={`Remover ${ex.name}`}>×</button>
    </div>
  );
}
