import { slugify } from "./lib/utils";
import ThemeToggle from "./components/ThemeToggle";
import Home from "./pages/Home";
import Planner from "./pages/Planner";
import Library from "./pages/Library";

/*
  Rotas (lidas direto da URL):
    /                    -> Home
    /felipe              -> treino do Felipe
    /felipe/exercicios   -> catálogo de exercícios do Felipe
*/
export default function App() {
  const [first, second] = location.pathname.split("/").filter(Boolean);
  const user = slugify(first || "");

  let page;
  if (!user) page = <Home />;
  else if (slugify(second || "") === "exercicios") page = <Library user={user} />;
  else page = <Planner user={user} />;

  return (
    <>
      <ThemeToggle />
      {page}
    </>
  );
}
