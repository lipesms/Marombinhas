import { slugify } from "./lib/utils";
import ThemeToggle from "./components/ThemeToggle";
import Home from "./pages/Home";
import Planner from "./pages/Planner";
import Base from "./pages/Base";
import Progress from "./pages/Progress";

/*
  Rotas (lidas direto da URL):
    /                    -> Home
    /exercicios          -> base global de exercícios
    /felipe              -> treino do Felipe
    /felipe/exercicios   -> a mesma base global (o botão de voltar leva ao treino)
    /felipe/evolucao     -> evolução dos pesos do Felipe
  "exercicios" é palavra reservada: não dá pra usar como nome de pessoa.
*/
export default function App() {
  const [first, second] = location.pathname.split("/").filter(Boolean);
  const a = slugify(first || "");
  const b = slugify(second || "");

  let page;
  if (!a) page = <Home />;
  else if (a === "exercicios") page = <Base backHref="/" backLabel="← início" />;
  else if (b === "exercicios") page = <Base backHref={`/${a}`} backLabel="← meu treino" />;
  else if (b === "evolucao") page = <Progress user={a} />;
  else page = <Planner user={a} />;

  return (
    <>
      <ThemeToggle />
      {page}
    </>
  );
}
