import { useState } from 'react';
import RecipePanel from './RecipePanel.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../lib/api.js';
import { fold, recipeId } from '../../lib/utils.js';

/* Aba Cardápio: "Meu cardápio" (editável, só da pessoa) e "Base de receitas" (somente leitura). */
export default function CardapioTab({ slug, mine, base }) {
  const toast = useToast();
  const [view, setView] = useState('meu');

  const copyToMine = async (r) => {
    if (mine.items.some((x) => fold(x.name) === fold(r.name))) return toast('Essa receita já está no seu cardápio.');
    try {
      const copy = { ...r, id: recipeId() }; // cópia da pessoa: editar depois não mexe na base
      const res = await api('PUT', `/api/rec/${slug}/${copy.id}`, copy);
      mine.upsert(res.item);
      toast('Adicionada ao seu cardápio');
    } catch (e) { toast(e.message); }
  };

  return (
    <div id="r-root">
      <h1 className="page-title">Cardápio</h1>
      <div className="r-seg" role="group" aria-label="Escolher lista">
        <button onClick={() => setView('meu')} aria-pressed={view === 'meu'}>Meu cardápio</button>
        <button onClick={() => setView('base')} aria-pressed={view === 'base'}>Base de receitas</button>
      </div>
      <section className="card t-panel">
        {view === 'meu'
          ? <RecipePanel key="mine" ctx="mine" slug={slug} collection={mine} />
          : <RecipePanel key="base" ctx="base" slug={slug} collection={base} onCopyToMine={copyToMine} />}
      </section>
      <p className="small">{view === 'meu'
        ? 'Estas receitas são só suas. Quando você descreve uma refeição no diário, a IA procura aqui primeiro e usa os seus valores.'
        : 'Receitas compartilhadas por todos. Toque em uma para ver e adicione ao seu cardápio para editar do seu jeito.'}</p>
    </div>
  );
}
