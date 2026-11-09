import { Brand } from './Brand.jsx';
import ThemeToggle from './ThemeToggle.jsx';

/* Moldura das páginas fora do painel (/exercicios, /receitas, /<nome>/evolucao). */
export default function PlainShell({ title, back, label, status, children }) {
  return (
    <div className="shell plain">
      <div className="top"><Brand /><ThemeToggle /></div>
      <div className="t-bar"><a className="t-back" href={back}>{label}</a>{status}</div>
      <h1 className="page-title">{title}</h1>
      {children}
    </div>
  );
}
