import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { clone } from '../lib/utils.js';
import { normalizeDoc } from '../lib/treino.js';

/*
 * Documento de treino da pessoa, com gravação automática (700 ms após a última edição,
 * e na hora ao sair da página ou da aba). update(fn) recebe uma cópia do documento para alterar.
 * saved: saved | saving | error
 */
export function useTreino(slug, enabled = true) {
  const [doc, setDoc] = useState(null);
  const [status, setStatus] = useState('idle');
  const [saved, setSaved] = useState('saved');
  const [activeId, setActiveId] = useState(null);
  const docRef = useRef(null);
  const dirty = useRef(false);
  const timer = useRef(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const r = await api('GET', `/api/treino/${slug}`);
      const d = normalizeDoc(r.data);
      docRef.current = d;
      setDoc(d);
      setActiveId(d.workouts[0].id);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [slug]);

  useEffect(() => { if (enabled && status === 'idle') load(); }, [enabled, status, load]);

  const flush = useCallback(async (keepalive) => {
    if (!dirty.current || !docRef.current) return;
    clearTimeout(timer.current);
    const snap = docRef.current;
    dirty.current = false;
    try {
      const r = await fetch(`/api/treino/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: snap }),
        keepalive: Boolean(keepalive),
      });
      if (!r.ok) throw new Error();
      if (!dirty.current) setSaved('saved');
    } catch {
      dirty.current = true;
      setSaved('error');
    }
  }, [slug]);

  const update = useCallback((fn) => {
    const next = clone(docRef.current);
    fn(next);
    docRef.current = next;
    setDoc(next);
    dirty.current = true;
    setSaved('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(false), 700);
  }, [flush]);

  useEffect(() => {
    const onHide = () => flush(true);
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(true); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      flush(true);
    };
  }, [flush]);

  return { doc, status, saved, activeId, setActiveId, update, reload: load };
}
