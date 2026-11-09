/* Descobre qual tela abrir a partir do endereço (sem biblioteca de rotas: o site tem poucas telas). */
import { normalizeSlug, validSlug } from './utils.js';

export function resolveRoute(pathname) {
  let parts = pathname.split('/').filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
  if (parts[0] === 'u') parts = parts.slice(1); // endereços antigos /u/código
  const [a, b] = parts;
  if (!a) return { name: 'landing' };
  if (normalizeSlug(a) === 'exercicios' && !b) return { name: 'exercicios' }; // base global, escondida
  if (normalizeSlug(a) === 'receitas' && !b) return { name: 'receitas' }; // base global, escondida
  const slug = normalizeSlug(a);
  if (!validSlug(slug)) return { name: 'landing' };
  const sub = normalizeSlug(b || '');
  if (sub === 'evolucao') return { name: 'evolucao', slug };
  const tab = sub === 'treino' || sub === 'treinos' ? 'treinos' : sub === 'cardapio' ? 'cardapio' : null;
  return { name: 'panel', slug, tab };
}

export const tabPath = (slug, tab) => (tab === 'treinos' ? `/${slug}/treino` : tab === 'cardapio' ? `/${slug}/cardapio` : `/${slug}`);
