import { useMemo } from 'react';
import ExerciseBasePage from './features/treino/ExerciseBasePage.jsx';
import ProgressPage from './features/treino/ProgressPage.jsx';
import RecipeBasePage from './features/cardapio/RecipeBasePage.jsx';
import Landing from './pages/Landing.jsx';
import Panel from './pages/Panel.jsx';
import { resolveRoute, tabPath } from './lib/routes.js';

export default function App() {
  const route = useMemo(() => {
    const r = resolveRoute(location.pathname);
    // Corrige maiúsculas, acentos e rotas antigas no endereço (ex.: /Felipe vira /felipe).
    if (r.name === 'panel' && location.pathname !== tabPath(r.slug, r.tab)) history.replaceState(null, '', tabPath(r.slug, r.tab));
    return r;
  }, []);

  switch (route.name) {
    case 'exercicios': return <ExerciseBasePage />;
    case 'receitas': return <RecipeBasePage />;
    case 'evolucao': return <ProgressPage slug={route.slug} />;
    case 'panel': return <Panel code={route.slug} initialTab={route.tab} />;
    default: return <Landing />;
  }
}
