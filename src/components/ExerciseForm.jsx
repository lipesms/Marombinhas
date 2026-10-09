import { useState } from "react";
import { resizeImage, uploadPhoto, deletePhoto, photoUrl } from "../lib/image";
import { longId } from "../lib/utils";

/*
  Cadastro/edição de um exercício da base. Só o nome é obrigatório;
  ativação muscular, descrição e foto são opcionais.
  onSubmit({ name, muscles, desc, photo }) pode lançar um Error (a mensagem aparece no form).
*/
export default function ExerciseForm({ initial = {}, onSubmit, onCancel, onDelete }) {
  const [name, setName] = useState(initial.name || "");
  const [muscles, setMuscles] = useState(initial.muscles || "");
  const [desc, setDesc] = useState(initial.desc || "");
  const [photoData, setPhotoData] = useState(null); // foto nova (ainda não enviada)
  const [removePhoto, setRemovePhoto] = useState(false);
  const [more, setMore] = useState(Boolean(initial.name)); // editando já mostra os detalhes
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const shownPhoto = photoData || (!removePhoto && initial.photo ? photoUrl(initial.photo) : null);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPhotoData(await resizeImage(file));
      setRemovePhoto(false);
      setErr("");
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr("");
    try {
      let photo = removePhoto ? "" : initial.photo || "";
      if (photoData) {
        photo = longId();
        await uploadPhoto(photo, photoData);
      }
      await onSubmit({ name: name.trim(), muscles: muscles.trim(), desc: desc.trim(), photo });
      if (initial.photo && photo !== initial.photo) deletePhoto(initial.photo);
      setBusy(false);
    } catch (ex) {
      setErr(ex.message || "Não deu pra salvar");
      setBusy(false);
    }
  };

  return (
    <form className="xform" onSubmit={submit}>
      <input
        className="field"
        value={name}
        maxLength={60}
        autoFocus={!initial.name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do exercício"
        aria-label="Nome do exercício"
      />

      {!more ? (
        <button type="button" className="linkbtn" onClick={() => setMore(true)}>
          + detalhes (opcional): ativação muscular, descrição e foto
        </button>
      ) : (
        <>
          <label>
            Ativação muscular
            <input
              className="field"
              value={muscles}
              maxLength={120}
              onChange={(e) => setMuscles(e.target.value)}
              placeholder="ex.: peitoral, tríceps, ombro anterior"
            />
          </label>
          <label>
            Descrição
            <textarea
              className="field"
              rows={3}
              value={desc}
              maxLength={400}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Como executar o movimento"
            />
          </label>
          <div className="photo-pick">
            {shownPhoto && <img src={shownPhoto} alt="Prévia da foto" />}
            <label className="chip file">
              {shownPhoto ? "Trocar foto" : "Adicionar foto"}
              <input type="file" accept="image/*" hidden onChange={pickFile} />
            </label>
            {shownPhoto && (
              <button
                type="button"
                className="linkbtn"
                onClick={() => { setPhotoData(null); setRemovePhoto(true); }}
              >
                Remover foto
              </button>
            )}
          </div>
        </>
      )}

      {err && <p className="warn err-text">{err}</p>}

      <div className="xform-actions">
        <button className="add" type="submit" disabled={!name.trim() || busy}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className="linkbtn" onClick={onCancel}>Cancelar</button>
        {onDelete && (
          <button type="button" className="linkbtn danger" onClick={onDelete}>Excluir</button>
        )}
      </div>
    </form>
  );
}
