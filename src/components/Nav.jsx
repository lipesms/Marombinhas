import Icon from './Icon.jsx';

const TABS = [['hoje', 'Hoje', 'plate'], ['semana', 'Semana', 'bars'], ['treinos', 'Treinos', 'dumbbell'], ['metas', 'Metas', 'target'], ['cardapio', 'Cardápio', 'book']];

export default function Nav({ tab, onTab }) {
  return (
    <nav className="nav" aria-label="Principal">
      <div className="nav-in">
        {TABS.map(([k, l, i]) => (
          <button key={k} onClick={() => onTab(k)} aria-current={tab === k ? 'page' : undefined}><Icon name={i} size={22} />{l}</button>
        ))}
      </div>
    </nav>
  );
}
