import Icon from './Icon.jsx';
import { useTheme } from './ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'light' ? 'escuro' : 'claro';
  return (
    <button className="icon-btn theme-btn" onClick={toggle} aria-label={`Mudar para o tema ${next}`} title={`Tema ${next}`}>
      <Icon name={theme === 'light' ? 'moon' : 'sun'} size={20} />
    </button>
  );
}
