// Link de voltar à esquerda, estado do salvamento à direita
export default function TopBar({ backHref, backLabel, status, saved }) {
  const text =
    status === "loading" ? "Carregando…"
    : status === "error" ? ""
    : saved === "saving" ? "Salvando…"
    : saved === "saved" ? "Salvo"
    : "Não salvou";

  return (
    <div className="bar">
      <a href={backHref}>{backLabel}</a>
      <span className={status === "ready" && saved === "error" ? "err" : ""}>{text}</span>
    </div>
  );
}
