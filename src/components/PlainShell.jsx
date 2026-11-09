import { Brand } from './Brand.jsx';

/* Moldura das páginas fora do painel (/exercicios, /receitas, /<nome>/evolucao). */
export default function PlainShell({ title, back, label, status, children }) {
  return (
    <div className="shell plain">
      <div className="top"><Brand /></div>
      <div className="t-bar"><a className="t-back" href={back}>{label}</a>{status}</div>
      <h1 className="page-title">{title}</h1>
      {children}
    </div>
  );
}
