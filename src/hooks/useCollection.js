import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { byName } from '../lib/utils.js';

/*
 * Lista carregada da API ({ items: [...] }), ordenada por nome.
 * enabled=false adia o carregamento (ex.: só busca quando a aba é aberta pela primeira vez).
 * status: idle | loading | ready | error
 */
export function useCollection(url, enabled = true) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus('loading');
    try {
      const r = await api('GET', url);
      setItems((r.items || []).slice().sort(byName));
      setStatus('ready');
    } catch {
      setStatus('error');
    } finally {
      busy.current = false;
    }
  }, [url]);

  useEffect(() => { if (enabled && status === 'idle') load(); }, [enabled, status, load]);

  // Troca o item (mesmo id) ou acrescenta, mantendo a ordem alfabética
  const upsert = useCallback((item) => setItems((prev) => {
    const i = prev.findIndex((x) => x.id === item.id);
    const next = i >= 0 ? prev.map((x, k) => (k === i ? item : x)) : [...prev, item];
    return next.sort(byName);
  }), []);
  const remove = useCallback((id) => setItems((prev) => prev.filter((x) => x.id !== id)), []);

  return { items, status, reload: load, upsert, remove };
}
