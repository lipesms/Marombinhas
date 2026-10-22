/*
 * Treinos do Marombinhas: caderno de treino por pessoa, base global de exercícios e evolução dos pesos.
 * Carregado antes do app.js, que chama createTreino() passando seus utilitários.
 * Telas: aba "Treinos" (dentro do painel), /exercicios (escondida) e /<nome>/evolucao.
 */
(function () {
  'use strict';

  window.createTreino = function (MB) {
    const { esc, api, toast, icon } = MB;
    const $ = (s, el = document) => el.querySelector(s);
    const uid = () => Math.random().toString(36).slice(2, 9).padEnd(5, '0');
    const longId = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => (b % 36).toString(36)).join('');
    const DEFAULT_TITLE = 'Planejamento academia';
    const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR');

    /* ---------- pesos ---------- */
    const pad2 = (n) => String(n).padStart(2, '0');
    const today = () => { const n = new Date(); return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`; };
    // "30Kg" -> 30   "27,5 kg" -> 27.5
    const parseKg = (t = '') => { const m = String(t).match(/\d+(?:[.,]\d+)?/); return m ? Number(m[0].replace(',', '.')) : null; };
    // Registra o peso de hoje (se já houver registro de hoje, ele é substituído)
    const logWeight = (hist = [], kg) => {
      if (!(kg > 0)) return hist;
      const d = today();
      return [...hist.filter((h) => h.d !== d), { d, kg }].sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-200);
    };
    const fmtKg = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));
    const fmtDate = (d) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y.slice(2)}`; };

    /* ---------- fotos dos exercícios ---------- */
    const photoUrl = (id) => `/api/foto/${id}`;
    function resizeImage(file, max = 480) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          let size = max;
          let quality = 0.72;
          for (let i = 0; i < 5; i++) {
            const s = Math.min(1, size / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.width * s));
            c.height = Math.max(1, Math.round(img.height * s));
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#fff'; // PNG transparente vira fundo branco no JPEG
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);
            const out = c.toDataURL('image/jpeg', quality);
            if (out.length <= 150000) return resolve(out);
            size *= 0.8;
            quality -= 0.08;
          }
          reject(new Error('Imagem grande demais.'));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui ler essa imagem.')); };
        img.src = url;
      });
    }
    const uploadPhoto = (id, data) => api('PUT', photoUrl(id), { data }).catch(() => { throw new Error('Não consegui enviar a foto.'); });
    const deletePhoto = (id) => fetch(photoUrl(id), { method: 'DELETE' }).catch(() => {});
    const safeLink = (u) => (/^https?:\/\/[^\s]+$/i.test(u || '') ? u : '');

    /* ---------- estado ---------- */
    const S = { slug: null, doc: null, status: 'idle', saved: 'saved', activeId: null, picking: false, q: '', open: new Set(), refocus: false, editNew: false, progOpen: null };
    const B = { items: [], status: 'idle', q: '', openId: null, creating: false, photoData: null, removePhoto: false, busy: false };
    let paint = () => {};
    let dirty = false;
    let timer = null;

    function normalizeDoc(raw) {
      if (Array.isArray(raw)) raw = { workouts: raw };
      raw = raw || {};
      const list = Array.isArray(raw.workouts) && raw.workouts.length ? raw.workouts : [{ id: uid(), name: 'Treino A', exercises: [] }];
      return {
        title: raw.title || DEFAULT_TITLE,
        desc: raw.desc || '',
        library: Array.isArray(raw.library) ? raw.library : [],
        workouts: list.map((w) => ({
          id: w.id || uid(),
          name: w.name || 'Treino',
          exercises: (w.exercises || []).map((e) => ({
            id: e.id || uid(),
            name: e.name || '',
            series: e.series || '3x10',
            peso: e.peso || '0Kg',
            history: Array.isArray(e.history) ? e.history : [],
            ...(e.baseId ? { baseId: e.baseId } : {}),
          })),
        })),
      };
    }

    const active = () => S.doc.workouts.find((w) => w.id === S.activeId) || S.doc.workouts[0];
    const baseInfo = (ex) => (ex.baseId ? B.items.find((b) => b.id === ex.baseId) : null);
    const hasInfo = (it) => Boolean(it && (it.photo || it.muscles || it.desc || safeLink(it.link)));

    async function loadDoc(slug) {
      S.slug = slug;
      S.status = 'loading';
      paint();
      try {
        const r = await api('GET', `/api/treino/${slug}`);
        S.doc = normalizeDoc(r.data);
        S.activeId = S.doc.workouts[0].id;
        S.status = 'ready';
      } catch {
        S.status = 'error';
      }
      paint();
    }
    async function loadBase() {
      if (B.status === 'loading') return;
      B.status = 'loading';
      try {
        const r = await api('GET', '/api/base');
        B.items = (r.items || []).slice().sort(byName);
        B.status = 'ready';
      } catch {
        B.status = 'error';
      }
      paint();
    }

    /* ---------- gravação automática ---------- */
    function paintStatus() {
      const txt = { saved: 'Salvo', saving: 'Salvando…', error: 'Erro ao salvar. Tentando de novo ao editar.' }[S.saved];
      document.querySelectorAll('.t-status').forEach((el) => { el.className = `t-status ${S.saved}`; el.textContent = txt; });
    }
    function touch() {
      dirty = true;
      S.saved = 'saving';
      paintStatus();
      clearTimeout(timer);
      timer = setTimeout(() => flush(false), 700);
    }
    async function flush(keepalive) {
      if (!dirty || !S.doc) return;
      clearTimeout(timer);
      const snap = S.doc;
      dirty = false;
      try {
        const r = await fetch(`/api/treino/${S.slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: snap }),
          keepalive: Boolean(keepalive),
        });
        if (!r.ok) throw new Error();
        if (!dirty) S.saved = 'saved';
      } catch {
        dirty = true;
        S.saved = 'error';
      }
      paintStatus();
    }
    window.addEventListener('pagehide', () => flush(true));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });

    function mutate(fn) {
      fn(S.doc);
      touch();
      paint();
    }

    /* ---------- edição por clique ---------- */
    const statusHtml = () => `<span class="t-status ${S.saved}" role="status">${{ saved: 'Salvo', saving: 'Salvando…', error: 'Erro ao salvar. Tentando de novo ao editar.' }[S.saved]}</span>`;
    const editable = (k, text, extra = '') => `<span class="editable ${extra}" data-t="edit" data-k="${esc(k)}" role="button" tabindex="0" title="Toque para editar">${esc(text)}</span>`;

    function getVal(k) {
      if (k === 'title') return S.doc.title;
      if (k === 'desc') return S.doc.desc || '';
      if (k === 'wname') return active().name;
      const [, id, field] = k.split(':');
      const ex = active().exercises.find((e) => e.id === id);
      return ex ? ex[field] : '';
    }
    function setVal(k, v) {
      if (k === 'desc') return mutate((d) => { d.desc = v.slice(0, 800); });
      if (!v) return paint();
      if (k === 'title') return mutate((d) => { d.title = v.slice(0, 120); });
      if (k === 'wname') return mutate(() => { active().name = v.slice(0, 40); });
      const [, id, field] = k.split(':');
      mutate(() => {
        const ex = active().exercises.find((e) => e.id === id);
        if (!ex) return;
        ex[field] = v.slice(0, field === 'name' ? 80 : 20);
        if (field === 'peso') ex.history = logWeight(ex.history, parseKg(v));
      });
    }
    function startEdit(el) {
      const k = el.dataset.k;
      const multi = k === 'desc';
      const input = document.createElement(multi ? 'textarea' : 'input');
      input.className = `t-input ${k === 'title' ? 't-input-title' : ''} ${k === 'wname' ? 't-tab-input' : ''}`;
      input.value = getVal(k);
      input.maxLength = k === 'desc' ? 800 : k === 'title' ? 120 : k.endsWith(':name') ? 80 : k === 'wname' ? 40 : 20;
      input.setAttribute('aria-label', 'Editar texto');
      if (multi) { input.rows = 3; input.placeholder = 'Ex.: foco em hipertrofia, descanso de 60 s entre as séries'; }
      el.replaceWith(input);
      input.focus();
      if (!multi) input.select();
      let done = false;
      const finish = (save) => {
        if (done) return;
        done = true;
        if (save) setVal(k, input.value.trim()); else paint();
      };
      input.addEventListener('blur', () => finish(true));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !(multi && e.shiftKey)) { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      });
    }

    /* ---------- aba Treinos ---------- */
    function detailsHtml(it) {
      const link = safeLink(it.link);
      return `<div class="t-details">${it.photo ? `<img src="${photoUrl(it.photo)}" alt="${esc(it.name)}" loading="lazy">` : ''}
        <div class="t-dtxt">${it.muscles ? `<p><b>Ativação:</b> ${esc(it.muscles)}</p>` : ''}${it.desc ? `<p>${esc(it.desc)}</p>` : ''}${link ? `<p><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Ver exemplo ↗</a></p>` : ''}</div></div>`;
    }

    function pickerItems() {
      const names = new Set(B.items.map((b) => b.name.toLowerCase()));
      return [...B.items, ...(S.doc.library || []).filter((l) => !names.has(String(l.name).toLowerCase()))].map((i) => ({ id: i.id, name: i.name }));
    }
    function chipsHtml() {
      const term = S.q.trim();
      const low = term.toLowerCase();
      const items = pickerItems();
      const matches = items.filter((e) => e.name.toLowerCase().includes(low));
      const exact = items.find((e) => e.name.toLowerCase() === low);
      return matches.map((e) => `<button type="button" class="chip" data-t="pick" data-id="${esc(e.id)}">${esc(e.name)}</button>`).join('')
        + (term && !exact ? `<button type="button" class="chip new" data-t="pick-new">+ Usar “${esc(term)}”</button>` : '')
        + (B.status === 'loading' ? '<p class="hint">Carregando a base…</p>' : '')
        + (B.status === 'ready' && !items.length && !term ? '<p class="hint">A base está vazia. Digite um nome ou cadastre exercícios na base.</p>' : '');
    }

    function rowHtml(ex) {
      const it = baseInfo(ex);
      const showI = hasInfo(it);
      const open = showI && S.open.has(ex.id);
      return `<div class="t-row ${open ? 'open' : ''}">
          <div class="t-name">${editable(`ex:${ex.id}:name`, ex.name, 't-ex')}${showI ? `<button class="t-i" data-t="info" data-id="${esc(ex.id)}" aria-expanded="${open}" aria-label="Ver detalhes de ${esc(ex.name)}">i</button>` : ''}</div>
          ${editable(`ex:${ex.id}:series`, ex.series, 't-num')}
          ${editable(`ex:${ex.id}:peso`, ex.peso, 't-num')}
          <button class="t-del" data-t="del-ex" data-id="${esc(ex.id)}" aria-label="Remover ${esc(ex.name)}">×</button>
        </div>${open ? detailsHtml(it) : ''}`;
    }

    function tabHtml() {
      if (S.status === 'idle' || S.status === 'loading') return '<div class="loading">Carregando treino…</div>';
      if (S.status === 'error') {
        return '<div class="card empty"><b>Não consegui abrir o treino</b>Confira a conexão e tente de novo.<br><button class="btn ghost" data-t="retry" style="margin-top:12px">Tentar de novo</button></div>';
      }
      const d = S.doc;
      const w = active();
      const tabs = d.workouts.map((x) => `<button class="t-tab ${x.id === w.id ? 'on' : ''}" data-t="tab" data-id="${esc(x.id)}" data-k="wname" ${x.id === w.id ? 'title="Toque de novo para renomear"' : ''}>${esc(x.name)}</button>`).join('');
      return `<div class="t-top">
          <div class="t-titlebar"><h1 class="t-title">${editable('title', d.title)}</h1>${statusHtml()}</div>
          ${d.desc ? `<p class="t-desc">${editable('desc', d.desc, 't-desc-text')}</p>` : '<button class="t-adddesc" data-t="edit" data-k="desc">+ Adicionar descrição da ficha (opcional)</button>'}
        </div>
        <nav class="t-tabs" aria-label="Seções do treino">${tabs}<button class="t-tab plus" data-t="add-w" aria-label="Novo treino">+</button></nav>
        <section class="card t-panel">
          <div class="t-row head"><span>Treino</span><span>Séries</span><span>Peso</span><span></span></div>
          ${w.exercises.length ? w.exercises.map(rowHtml).join('') : '<p class="t-empty">Nenhum exercício ainda. Toque em “+ Adicionar”.</p>'}
          ${S.picking
            ? `<div class="t-picker">
                <form data-t-form="pick"><input id="t-q" class="in" value="${esc(S.q)}" maxlength="60" autocomplete="off" placeholder="Escolha da base ou digite um nome" aria-label="Exercício"></form>
                <div class="t-chips" id="t-chips">${chipsHtml()}</div>
                <div class="t-pfoot"><button type="button" data-t="close-picker">Fechar</button></div>
              </div>`
            : '<button class="t-add" data-t="open-picker">+ Adicionar</button>'}
        </section>
        <div class="t-foot">
          <a href="/${esc(S.slug)}/evolucao">Evolução dos pesos</a>
          ${d.workouts.length > 1 ? `<button data-t="del-w">Excluir treino “${esc(w.name)}”</button>` : ''}
        </div>`;
    }

    function paintTab() {
      const root = $('#t-root');
      if (!root) return;
      root.innerHTML = tabHtml();
      if (S.status !== 'ready') return;
      if (S.editNew) {
        S.editNew = false;
        const tab = $('.t-tab.on');
        if (tab) startEdit(tab);
      } else if (S.picking && S.refocus) {
        S.refocus = false;
        const q = $('#t-q');
        if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
      }
    }

    function addExercise(item) {
      const fromBase = Boolean(item.id && B.items.some((b) => b.id === item.id));
      S.q = '';
      S.refocus = true;
      mutate(() => {
        active().exercises.push({ id: uid(), name: item.name, series: '3x10', peso: '0Kg', history: [], ...(fromBase ? { baseId: item.id } : {}) });
      });
      toast(`“${item.name}” adicionado`);
    }

    /* ---------- página /exercicios (base global) ---------- */
    function formHtml(it) {
      const x = it || {};
      return `<form class="b-form" data-t-form="base" data-id="${esc(x.id || '')}" novalidate>
        <label>Nome<input class="in" name="name" maxlength="60" value="${esc(x.name || '')}" placeholder="Nome do exercício" ${it ? '' : 'autofocus'}></label>
        <label>Ativação muscular <small>(opcional)</small><input class="in" name="muscles" maxlength="120" value="${esc(x.muscles || '')}" placeholder="ex.: peitoral, tríceps, ombro anterior"></label>
        <label>Descrição <small>(opcional)</small><textarea class="in" name="desc" rows="3" maxlength="400" placeholder="Como executar o movimento">${esc(x.desc || '')}</textarea></label>
        <label>Link de exemplo <small>(opcional)</small><input class="in" name="link" inputmode="url" maxlength="300" value="${esc(x.link || '')}" placeholder="https://..."></label>
        <div class="b-photo">${photoBlock(x)}</div>
        <p class="error" id="b-err" role="alert" hidden></p>
        <div class="b-actions">
          <button class="btn primary" type="submit">Salvar</button>
          <button class="btn ghost" type="button" data-t="b-cancel">Cancelar</button>
          ${it ? `<button class="btn danger" type="button" data-t="b-del" data-id="${esc(x.id)}">Excluir</button>` : ''}
        </div>
      </form>`;
    }
    function photoBlock(x) {
      const src = B.photoData || (!B.removePhoto && x.photo ? photoUrl(x.photo) : '');
      return `${src ? `<img src="${esc(src)}" alt="Prévia da foto">` : ''}
        <label class="chip file">${src ? 'Trocar foto' : 'Adicionar foto'}<input type="file" accept="image/*" hidden data-t="b-file"></label>
        ${src ? '<button type="button" class="btn link" data-t="b-photo-remove">Remover foto</button>' : ''}`;
    }
    function baseListHtml() {
      if (B.status === 'loading' || B.status === 'idle') return '<div class="loading">Carregando a base…</div>';
      if (B.status === 'error') return '<div class="empty"><b>Não consegui abrir a base</b><button class="btn ghost" data-t="b-retry">Tentar de novo</button></div>';
      const term = B.q.trim().toLowerCase();
      const shown = B.items.filter((i) => !term || i.name.toLowerCase().includes(term) || (i.muscles || '').toLowerCase().includes(term));
      const rows = shown.map((it) => `<div class="b-item">
          <button class="b-head" data-t="b-open" data-id="${esc(it.id)}" aria-expanded="${B.openId === it.id}">
            ${it.photo ? `<img class="b-thumb" src="${photoUrl(it.photo)}" alt="" loading="lazy">` : `<span class="b-thumb ph" aria-hidden="true">${esc(it.name[0] || '?')}</span>`}
            <span class="b-text"><span class="b-name">${esc(it.name)}</span>${it.muscles ? `<span class="b-sub">${esc(it.muscles)}</span>` : ''}</span>
            <span class="b-chev" aria-hidden="true">${B.openId === it.id ? '–' : '+'}</span>
          </button>
          ${B.openId === it.id ? formHtml(it) : ''}
        </div>`).join('');
      return (shown.length ? rows : `<p class="t-empty">${B.items.length ? 'Nenhum exercício encontrado.' : 'A base está vazia.'}</p>`)
        + (B.creating ? formHtml(null) : '<button class="t-add" data-t="b-new">+ Novo exercício</button>');
    }
    const paintBaseList = () => { const el = $('#b-list'); if (el) el.innerHTML = baseListHtml(); };

    function shell(title, back, label, inner, withStatus) {
      return `<div class="shell plain">
        <div class="top"><a class="brand" href="/">${MB.logo}Marombinhas</a></div>
        <div class="t-bar"><a class="t-back" href="${back}">${esc(label)}</a>${withStatus ? statusHtml() : ''}</div>
        <h1 class="page-title">${title}</h1>${inner}</div>`;
    }

    function basePage(opts) {
      paint = paintBaseList;
      B.openId = null; B.creating = false; B.photoData = null; B.removePhoto = false;
      MB.app.innerHTML = shell('Exercícios', opts.back, opts.label, `<section class="card t-panel">
          <input class="in" id="b-q" value="${esc(B.q)}" placeholder="Buscar por nome ou músculo" aria-label="Buscar exercício" autocomplete="off">
          <div id="b-list">${baseListHtml()}</div>
        </section>
        <p class="small">Esta base é de todo mundo: os exercícios cadastrados aparecem para qualquer pessoa na hora de montar o treino. Quem escolher da base também vê a descrição, a foto e o link de exemplo no treino, pelo botão “i”.</p>`, false);
      if (B.status !== 'ready') loadBase(); else paintBaseList();
    }

    function bErr(msg) {
      const el = $('#b-err');
      if (!el) return toast(msg);
      el.textContent = msg;
      el.hidden = !msg;
    }
    async function saveItem(form) {
      if (B.busy) return;
      const fd = new FormData(form);
      const id = form.dataset.id;
      const existing = id ? B.items.find((i) => i.id === id) : null;
      const name = String(fd.get('name') || '').trim();
      if (!name) return bErr('Dê um nome ao exercício.');
      let link = String(fd.get('link') || '').trim();
      if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
      B.busy = true;
      bErr('');
      const btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
      let uploaded = null;
      try {
        let photo = B.removePhoto ? '' : (existing && existing.photo) || '';
        if (B.photoData) { uploaded = longId(); await uploadPhoto(uploaded, B.photoData); photo = uploaded; }
        const item = { id: existing ? existing.id : uid(), name, muscles: String(fd.get('muscles') || '').trim(), desc: String(fd.get('desc') || '').trim(), link, photo };
        const r = await api('PUT', `/api/base/${item.id}`, item);
        const i = B.items.findIndex((x) => x.id === r.item.id);
        if (i >= 0) B.items[i] = r.item; else B.items.push(r.item);
        B.items.sort(byName);
        if (existing && existing.photo && existing.photo !== r.item.photo) deletePhoto(existing.photo);
        B.openId = null; B.creating = false; B.photoData = null; B.removePhoto = false;
        B.busy = false;
        paintBaseList();
        toast('Exercício salvo');
      } catch (e) {
        if (uploaded) deletePhoto(uploaded);
        B.busy = false;
        if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
        bErr(e.message || 'Não deu para salvar.');
      }
    }

    /* ---------- página /<nome>/evolucao ---------- */
    function chartSvg(points) {
      const W = 300, H = 100, px = 16, top = 24, bottom = 14;
      const n = points.length;
      const kgs = points.map((p) => p.kg);
      const min = Math.min(...kgs);
      const max = Math.max(...kgs);
      const x = (i) => (n === 1 ? W / 2 : px + (i * (W - 2 * px)) / (n - 1));
      const y = (kg) => (max === min ? (top + H - bottom) / 2 : H - bottom - ((kg - min) / (max - min)) * (H - bottom - top));
      const pts = points.map((p, i) => [x(i), y(p.kg)]);
      const line = pts.map(([a, b]) => `${a},${b}`).join(' ');
      const area = n > 1 ? `M${pts[0][0]},${H - bottom} L${pts.map(([a, b]) => `${a},${b}`).join(' L')} L${pts[n - 1][0]},${H - bottom} Z` : '';
      const first = pts[0];
      const last = pts[n - 1];
      return `<svg class="wc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução de ${fmtKg(kgs[0])} para ${fmtKg(kgs[n - 1])} kg">
        ${n > 1 ? `<path class="wc-area" d="${area}"/><polyline class="wc-line" points="${line}"/>` : ''}
        ${pts.map(([a, b], i) => `<circle class="${i === n - 1 ? 'wc-last' : 'wc-dot'}" cx="${a}" cy="${b}" r="${i === n - 1 ? 5 : 3.5}"/>`).join('')}
        <text class="wc-text" x="${first[0]}" y="${first[1] - 10}" text-anchor="${n === 1 ? 'middle' : 'start'}">${fmtKg(kgs[0])}</text>
        ${n > 1 ? `<text class="wc-text" x="${last[0]}" y="${last[1] - 10}" text-anchor="end">${fmtKg(kgs[n - 1])}</text>` : ''}
      </svg>`;
    }
    function progressHtml() {
      if (S.status === 'idle' || S.status === 'loading') return '<div class="loading">Carregando…</div>';
      if (S.status === 'error') return '<div class="card empty"><b>Não consegui abrir a evolução</b><button class="btn ghost" data-t="retry">Tentar de novo</button></div>';
      const withEx = S.doc.workouts.filter((w) => w.exercises.length);
      if (!withEx.length) return '<p class="small">Ainda não há exercícios nos seus treinos.</p>';
      return withEx.map((w) => `<section><h2 class="sec" style="padding:14px 2px 8px"><span>${esc(w.name)}</span></h2><div class="card t-panel">${w.exercises.map((ex) => {
        const hist = ex.history || [];
        const n = hist.length;
        const delta = n > 1 ? hist[n - 1].kg - hist[0].kg : 0;
        const chip = n === 0 ? '' : n === 1 ? `${fmtKg(hist[0].kg)} kg` : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${fmtKg(Math.abs(delta))} kg`;
        const tone = n > 1 ? (delta > 0 ? 'up' : delta < 0 ? 'down' : '') : '';
        const open = S.progOpen === ex.id;
        return `<div class="p-card">
          <button class="p-head" data-t="p-open" data-id="${esc(ex.id)}" aria-expanded="${open}"><span class="b-name">${esc(ex.name)}</span>${chip ? `<span class="delta ${tone}">${chip}</span>` : ''}</button>
          ${n === 0 ? '<p class="small">Sem registros ainda. Mude o peso no treino e o histórico começa.</p>'
            : `${chartSvg(hist)}<div class="p-meta"><span>${fmtDate(hist[0].d)} → ${fmtDate(hist[n - 1].d)}</span><span>${n} ${n === 1 ? 'registro' : 'registros'}</span></div>`}
          ${open && n ? `<ul class="p-log">${[...hist].reverse().map((h) => `<li><span>${fmtDate(h.d)}</span><b>${fmtKg(h.kg)} kg</b><button class="t-del" data-t="p-del" data-id="${esc(ex.id)}" data-d="${h.d}" aria-label="Apagar registro de ${fmtDate(h.d)}">×</button></li>`).join('')}</ul>` : ''}
        </div>`;
      }).join('')}</div></section>`).join('');
    }
    function progressPage(slug, opts) {
      paint = () => { MB.app.innerHTML = shell('Evolução', opts.back, opts.label, `${progressHtml()}<p class="small">O histórico é gravado sozinho: toda vez que você muda o peso de um exercício no treino, o valor de hoje entra aqui. Toque num exercício para ver (e apagar) os registros.</p>`, true); };
      loadDoc(slug);
    }

    /* ---------- eventos ---------- */
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-t]');
      if (!el || el.tagName === 'FORM') return;
      const id = el.dataset.id;
      switch (el.dataset.t) {
        case 'edit': return startEdit(el);
        case 'retry': return S.slug && loadDoc(S.slug);
        case 'tab':
          if (id === S.activeId) return startEdit(el);
          S.activeId = id; S.picking = false; S.q = '';
          return paint();
        case 'add-w': {
          const w = { id: uid(), name: 'Novo treino', exercises: [] };
          S.activeId = w.id; S.picking = false; S.editNew = true;
          return mutate((d) => { d.workouts.push(w); });
        }
        case 'del-w': {
          const w = active();
          if (S.doc.workouts.length < 2 || !confirm(`Excluir o treino "${w.name}"?`)) return;
          S.activeId = S.doc.workouts.find((x) => x.id !== w.id).id;
          return mutate((d) => { d.workouts = d.workouts.filter((x) => x.id !== w.id); });
        }
        case 'info': S.open.has(id) ? S.open.delete(id) : S.open.add(id); return paint();
        case 'del-ex': {
          const w = active();
          const ex = w.exercises.find((x) => x.id === id);
          if (!ex || !confirm(`Remover "${ex.name}" deste treino?`)) return;
          return mutate(() => { w.exercises = w.exercises.filter((x) => x.id !== id); });
        }
        case 'open-picker':
          S.picking = true; S.refocus = true;
          if (B.status !== 'ready') loadBase();
          paint();
          return $('.t-picker') && $('.t-picker').scrollIntoView({ block: 'nearest' });
        case 'close-picker': S.picking = false; S.q = ''; return paint();
        case 'pick': { const it = pickerItems().find((x) => x.id === id); return it && addExercise(it); }
        case 'pick-new': return S.q.trim() && addExercise({ name: S.q.trim() });
        /* base */
        case 'b-retry': B.status = 'idle'; return loadBase();
        case 'b-open': B.openId = B.openId === id ? null : id; B.creating = false; B.photoData = null; B.removePhoto = false; return paintBaseList();
        case 'b-new': B.creating = true; B.openId = null; B.photoData = null; B.removePhoto = false; paintBaseList(); { const f = $('#b-list .b-form input[name="name"]'); if (f) f.focus(); } return;
        case 'b-cancel': B.creating = false; B.openId = null; B.photoData = null; B.removePhoto = false; return paintBaseList();
        case 'b-photo-remove': {
          B.photoData = null; B.removePhoto = true;
          const form = el.closest('form');
          const ex = B.items.find((i) => i.id === form.dataset.id) || {};
          form.querySelector('.b-photo').innerHTML = photoBlock(ex);
          return;
        }
        case 'b-del': {
          const it = B.items.find((x) => x.id === id);
          if (!it || !confirm(`Excluir "${it.name}" da base?`)) return;
          return api('DELETE', `/api/base/${id}`).then(() => {
            B.items = B.items.filter((x) => x.id !== id);
            if (it.photo) deletePhoto(it.photo);
            B.openId = null;
            paintBaseList();
            toast('Exercício excluído');
          }).catch((err) => bErr(err.message));
        }
        /* evolução */
        case 'p-open': S.progOpen = S.progOpen === id ? null : id; return paint();
        case 'p-del': {
          const d = el.dataset.d;
          return mutate(() => { S.doc.workouts.forEach((w) => w.exercises.forEach((x) => { if (x.id === id) x.history = (x.history || []).filter((h) => h.d !== d); })); });
        }
        default:
      }
    });

    document.addEventListener('keydown', (e) => {
      const el = e.target.closest && e.target.closest('[data-t="edit"]');
      if (el && el.tagName === 'SPAN' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startEdit(el); }
    });

    document.addEventListener('submit', (e) => {
      const f = e.target.closest('[data-t-form]');
      if (!f) return;
      e.preventDefault();
      if (f.dataset.tForm === 'pick') {
        const term = S.q.trim();
        if (!term) return;
        const exact = pickerItems().find((x) => x.name.toLowerCase() === term.toLowerCase());
        addExercise(exact || { name: term });
      } else if (f.dataset.tForm === 'base') {
        saveItem(f);
      }
    });

    document.addEventListener('input', (e) => {
      if (e.target.id === 't-q') {
        S.q = e.target.value;
        const c = $('#t-chips');
        if (c) c.innerHTML = chipsHtml();
      } else if (e.target.id === 'b-q') {
        B.q = e.target.value;
        paintBaseList();
      }
    });

    document.addEventListener('change', async (e) => {
      if (e.target.dataset && e.target.dataset.t === 'b-file') {
        const file = e.target.files && e.target.files[0];
        const form = e.target.closest('form');
        e.target.value = '';
        if (!file) return;
        try {
          B.photoData = await resizeImage(file);
          B.removePhoto = false;
          const ex = B.items.find((i) => i.id === form.dataset.id) || {};
          form.querySelector('.b-photo').innerHTML = photoBlock(ex);
          bErr('');
        } catch (err) { bErr(err.message); }
      }
    });

    /* ---------- pontos de entrada ---------- */
    return {
      photo: { url: photoUrl, longId, resize: resizeImage, upload: uploadPhoto },
      // Chamado pelo painel quando a aba Treinos está na tela.
      mountTab(slug) {
        paint = paintTab;
        if (S.slug !== slug || S.status === 'idle' || S.status === 'error') { S.doc = null; S.status = 'idle'; loadDoc(slug); } else paintTab();
        if (B.status === 'idle' || B.status === 'error') loadBase();
      },
      basePage,
      progressPage,
      flush: () => flush(true),
    };
  };
})();
