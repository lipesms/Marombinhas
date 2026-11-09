import { useEffect, useRef, useState } from 'react';

/*
 * Texto que vira campo ao tocar. Enter ou sair do campo salva; Esc cancela.
 * Em campos de várias linhas (multi), Enter salva e Shift+Enter quebra a linha.
 * `as` define o elemento mostrado quando não está editando (span por padrão, button para as abas).
 */
export default function Editable({ value, onSave, maxLength = 20, multi = false, className = '', inputClass = '', as: Tag = 'span', startEditing = false, onStop, placeholder, children, ...rest }) {
  const [editing, setEditing] = useState(startEditing);
  const ref = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    if (!editing) return;
    done.current = false;
    const el = ref.current;
    if (el) { el.focus(); if (!multi) el.select(); }
  }, [editing, multi]);

  const finish = (save) => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    if (onStop) onStop();
    if (save) onSave(ref.current.value.trim());
  };

  if (editing) {
    const props = {
      ref,
      className: `t-input ${inputClass}`.trim(),
      defaultValue: value,
      maxLength,
      'aria-label': 'Editar texto',
      onBlur: () => finish(true),
      onKeyDown: (e) => {
        if (e.key === 'Enter' && !(multi && e.shiftKey)) { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      },
    };
    return multi ? <textarea {...props} rows={3} placeholder={placeholder} /> : <input {...props} />;
  }

  const isSpan = Tag === 'span';
  return (
    <Tag
      className={className}
      onClick={() => setEditing(true)}
      {...(isSpan ? {
        role: 'button',
        tabIndex: 0,
        title: 'Toque para editar',
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true); } },
      } : {})}
      {...rest}
    >
      {children ?? value}
    </Tag>
  );
}
