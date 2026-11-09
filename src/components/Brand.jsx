import Icon from './Icon.jsx';

export const Logo = () => <img className="logo" src="/logo-sm.png" width="36" height="36" alt="" />;

export function Brand() {
  return <a className="brand" href="/" aria-label="Marombinhas, ir para o início"><Logo />Marombinhas</a>;
}

/* Barra do topo do painel, com a sequência de dias. */
export function TopBar({ streak }) {
  return (
    <div className="top">
      <Brand />
      <div className={`streak${streak ? ' on' : ''}`} title="Dias seguidos com refeições registradas">
        <Icon name="flame" size={18} /><span className="num">{streak} {streak === 1 ? 'dia' : 'dias'}</span>
      </div>
    </div>
  );
}
