export const DEFAULT_TITLE = "Planejamento academia";

export const uid = () => Math.random().toString(36).slice(2, 9);
export const longId = () => uid() + uid() + uid(); // ids de foto (mais difíceis de adivinhar)

// "Felipe Souza!" -> "felipe-souza" (só letras, números, - e _)
export function slugify(text = "") {
  let t = text;
  try { t = decodeURIComponent(text); } catch {}
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 30);
}
