import { useDoc } from "./useDoc";
import { DEFAULT_TITLE, uid } from "../lib/utils";

// Aceita o formato antigo (só a lista de treinos) e o novo
function normalize(raw) {
  if (Array.isArray(raw)) raw = { workouts: raw };
  return {
    title: raw?.title || DEFAULT_TITLE,
    workouts: raw?.workouts?.length
      ? raw.workouts
      : [{ id: uid(), name: "Superior", exercises: [] }],
    library: raw?.library || [], // catálogo pessoal da versão anterior (ainda aparece no seletor)
  };
}

// Documento de uma pessoa: { title, workouts, library }
export const useUserData = (user) => useDoc(`/api/treino?user=${user}`, normalize);
