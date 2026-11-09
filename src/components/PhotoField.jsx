import { photoUrl, resizeImage } from '../lib/photos.js';

/*
 * Campo de foto dos formulários. O estado fica no formulário: { data, removed }.
 * data = foto nova (dataURL), removed = quem já tinha foto pediu para tirar.
 */
export default function PhotoField({ current, value, onChange, onError }) {
  const src = value.data || (!value.removed && current ? photoUrl(current) : '');

  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange({ data: await resizeImage(file), removed: false });
      onError('');
    } catch (err) { onError(err.message); }
  };

  return (
    <div className="b-photo">
      {src && <img src={src} alt="Prévia da foto" />}
      <label className="chip file">{src ? 'Trocar foto' : 'Adicionar foto'}<input type="file" accept="image/*" hidden onChange={pick} /></label>
      {src && <button type="button" className="btn link" onClick={() => onChange({ data: null, removed: true })}>Remover foto</button>}
    </div>
  );
}
