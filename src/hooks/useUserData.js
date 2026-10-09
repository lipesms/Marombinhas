import { useState, useEffect, useRef, useCallback } from "react";
import { DEFAULT_TITLE, uid } from "../lib/utils";

// Aceita o formato antigo (só a lista de treinos) e o novo { title, workouts, library }
function normalize(raw) {
  if (Array.isArray(raw)) raw = { workouts: raw };
  return {
    title: raw?.title || DEFAULT_TITLE,
    workouts: raw?.workouts?.length
      ? raw.workouts
      : [{ id: uid(), name: "Superior", exercises: [] }],
    library: raw?.library || [],
  };
}

/*
  Devolve { data, update, status, saved }
  - data:   { title, workouts, library }
  - update: update((d) => novoD)  -> altera e salva sozinho no banco
  - status: loading | ready | error     saved: saving | saved | error
*/
export function useUserData(user) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [saved, setSaved] = useState("saved");
  const dirty = useRef(false); // tem alteração ainda não gravada?
  const latest = useRef(null);

  const url = `/api/treino?user=${user}`;
  const put = (body, keepalive = false) =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: body }),
      keepalive,
    });

  // 1) carrega
  useEffect(() => {
    fetch(url, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(({ data }) => {
        setData(normalize(data));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [user]);

  // 2) grava meio segundo depois da última alteração
  useEffect(() => {
    if (!dirty.current) return;
    latest.current = data;
    setSaved("saving");
    const t = setTimeout(async () => {
      try {
        const r = await put(data);
        if (!r.ok) throw new Error();
        if (latest.current === data) dirty.current = false;
        setSaved("saved");
      } catch {
        setSaved("error");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [data]);

  // 3) se a pessoa trocar de página antes dos 0,5s, grava na saída
  useEffect(() => {
    const flush = () => dirty.current && latest.current && put(latest.current, true);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [user]);

  const update = useCallback((fn) => {
    dirty.current = true;
    setData((prev) => fn(prev));
  }, []);

  return { data, update, status, saved };
}
