import TopBar from "./TopBar";

// Tela mostrada enquanto carrega (ou se o banco não responder)
export default function StatusScreen({ status, backHref, backLabel }) {
  return (
    <main className="app">
      <h1 className="page-title">{"\u00A0"}</h1>
      <TopBar backHref={backHref} backLabel={backLabel} status={status} saved="saved" />
      {status === "error" && (
        <p className="warn">
          Não deu pra falar com o banco de dados. Recarregue a página; se
          continuar, confira se o banco está conectado ao projeto no Vercel.
        </p>
      )}
    </main>
  );
}
