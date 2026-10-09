import { useState } from "react";
import { useUserData } from "../hooks/useUserData";
import { fmtKg, fmtDate } from "../lib/weights";
import TopBar from "../components/TopBar";
import StatusScreen from "../components/StatusScreen";
import WeightChart from "../components/WeightChart";

// /:user/evolucao -> gráfico do peso de cada exercício ao longo do tempo
export default function Progress({ user }) {
  const { data, update, status, saved } = useUserData(user);
  const [openId, setOpenId] = useState(null);

  const back = `/${user}`;
  if (status !== "ready") {
    return <StatusScreen status={status} backHref={back} backLabel="← meu treino" />;
  }

  const removeEntry = (exId, date) =>
    update((d) => ({
      ...d,
      workouts: d.workouts.map((w) => ({
        ...w,
        exercises: w.exercises.map((e) =>
          e.id === exId ? { ...e, history: (e.history || []).filter((h) => h.d !== date) } : e
        ),
      })),
    }));

  const withEx = data.workouts.filter((w) => w.exercises.length > 0);

  return (
    <main className="app">
      <h1 className="page-title">Evolução</h1>
      <TopBar backHref={back} backLabel="← meu treino" status={status} saved={saved} />

      {withEx.length === 0 && (
        <p className="warn">Ainda não há exercícios nos seus treinos.</p>
      )}

      {withEx.map((w) => (
        <section key={w.id}>
          <h2 className="sec">{w.name}</h2>
          <div className="panel">
            {w.exercises.map((ex) => {
              const hist = ex.history || [];
              const n = hist.length;
              const delta = n > 1 ? hist[n - 1].kg - hist[0].kg : 0;
              const chip =
                n === 0 ? "" : n === 1 ? `${fmtKg(hist[0].kg)} Kg`
                : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${fmtKg(Math.abs(delta))} Kg`;
              const tone = n > 1 ? (delta > 0 ? "up" : delta < 0 ? "down" : "") : "";

              return (
                <div className="pcard" key={ex.id}>
                  <button className="phead" onClick={() => setOpenId(openId === ex.id ? null : ex.id)}
                          aria-expanded={openId === ex.id}>
                    <span className="name">{ex.name}</span>
                    {chip && <span className={`delta ${tone}`}>{chip}</span>}
                  </button>

                  {n === 0 ? (
                    <p className="empty small">
                      Sem registros ainda. Mude o peso no treino e o histórico começa.
                    </p>
                  ) : (
                    <>
                      <WeightChart points={hist} />
                      <div className="pmeta">
                        <span>{fmtDate(hist[0].d)} → {fmtDate(hist[n - 1].d)}</span>
                        <span>{n} {n === 1 ? "registro" : "registros"}</span>
                      </div>
                    </>
                  )}

                  {openId === ex.id && n > 0 && (
                    <ul className="plog">
                      {[...hist].reverse().map((h) => (
                        <li key={h.d}>
                          <span>{fmtDate(h.d)}</span>
                          <b>{fmtKg(h.kg)} Kg</b>
                          <button className="del" onClick={() => removeEntry(ex.id, h.d)}
                                  aria-label={`Apagar registro de ${fmtDate(h.d)}`}>×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <p className="warn">
        O histórico é gravado sozinho: toda vez que você muda o peso de um
        exercício no treino, o valor de hoje entra aqui. Toque num exercício
        para ver (e apagar) os registros.
      </p>
    </main>
  );
}
