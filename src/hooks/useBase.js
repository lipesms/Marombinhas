import { useDoc } from "./useDoc";
import { SEED } from "../lib/seed";

// Base global de exercícios. Se ainda não existe no banco, começa com os exercícios do SEED.
const normalize = (raw) => ({ items: raw ? raw.items || [] : SEED });

export const useBase = () => useDoc("/api/base", normalize);
