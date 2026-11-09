import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { applyTheme, currentTheme, themeAssets } from '../lib/theme.js';

const ThemeContext = createContext({ theme: 'light', toggle: () => {}, assets: themeAssets('light') });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(currentTheme);
  useEffect(() => { applyTheme(theme, false); }, [theme]); // favicon e barra do navegador acompanham o tema inicial
  const toggle = useCallback(() => setTheme((t) => { const n = t === 'light' ? 'dark' : 'light'; applyTheme(n); return n; }), []);
  return <ThemeContext.Provider value={{ theme, toggle, assets: themeAssets(theme) }}>{children}</ThemeContext.Provider>;
}
