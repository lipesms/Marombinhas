import PlainShell from '../../components/PlainShell.jsx';
import RecipePanel from './RecipePanel.jsx';
import { useCollection } from '../../hooks/useCollection.js';

/* Página escondida /receitas: único lugar que cadastra, edita e apaga receitas da base global. */
export default function RecipeBasePage() {
  const base = useCollection('/api/rbase');
  return (
    <PlainShell title="Receitas" back="/" label="← início">
      <section className="card t-panel">
        <RecipePanel ctx="mgr" collection={base} />
      </section>
      <p className="small">Esta é a base geral de receitas: o que for cadastrado aqui aparece para todos na aba Cardápio (somente leitura) e é consultado pela IA ao calcular as refeições.</p>
    </PlainShell>
  );
}
