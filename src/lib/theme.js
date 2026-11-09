/* Tema claro (Cinnamoroll) ou escuro (guaxinim): troca atributo do <html>, favicon e cor da barra do navegador. */
const KEY = 'macrinhos:theme';

const ASSETS = {
  light: { logo: '/logo-claro.png', logoSm: '/logo-sm-claro.png', ico: '/favicon-claro.ico', png64: '/favicon-claro.png', png32: '/favicon-32-claro.png', touch: '/apple-touch-claro.png', color: '#F6F9FF' },
  dark: { logo: '/logo.png', logoSm: '/logo-sm.png', ico: '/favicon.ico', png64: '/favicon.png', png32: '/favicon-32.png', touch: '/logo.png', color: '#0E1218' },
};
export const themeAssets = (theme) => ASSETS[theme] || ASSETS.light;

export function currentTheme() {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme, save = true) {
  const a = themeAssets(theme);
  document.documentElement.dataset.theme = theme;
  if (save) { try { localStorage.setItem(KEY, theme); } catch { /* ok */ } }
  const set = (sel, href) => { const el = document.querySelector(sel); if (el) el.setAttribute('href', href); };
  set('link[rel="icon"][sizes="any"]', a.ico);
  set('link[rel="icon"][sizes="64x64"]', a.png64);
  set('link[rel="icon"][sizes="32x32"]', a.png32);
  set('link[rel="apple-touch-icon"]', a.touch);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', a.color));
}
