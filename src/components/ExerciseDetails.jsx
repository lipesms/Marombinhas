import { photoUrl } from "../lib/image";

// Foto, ativação muscular e descrição de um exercício da base
export default function ExerciseDetails({ item }) {
  return (
    <div className="xdetails">
      {item.photo && <img src={photoUrl(item.photo)} alt={item.name} loading="lazy" />}
      <div>
        {item.muscles && <p><b>Ativação:</b> {item.muscles}</p>}
        {item.desc && <p>{item.desc}</p>}
      </div>
    </div>
  );
}
