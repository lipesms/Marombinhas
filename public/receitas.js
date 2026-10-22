/*
 * Cardápio do Marombinhas: receitas com foto, modo de preparo e macros.
 *  - Aba "Cardápio" do painel: "Meu cardápio" (receitas da pessoa, só dela) e "Base de receitas" (somente leitura,
 *    com botão para copiar uma receita para o próprio cardápio).
 *  - Página escondida /receitas: único lugar que cadastra, edita e apaga receitas da base geral.
 * Carregado antes do app.js. A IA do diário consulta estas receitas (no servidor) antes de estimar.
 */
(function () {
  'use strict';

  window.createReceitas = function (MB, P) {
    const { esc, api, toast } = MB;
    const $ = (s, el = document) => el.querySelector(s);
    const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => (b % 36).toString(36)).join('');
    const fmt = (n, d = 1) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
    const parseNum = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; };
    const fieldVal = (n) => (n ? String(n).replace('.', ',') : '');
    const fold = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR');

    const M = { slug: null, items: [], status: 'idle' }; // meu cardápio
    const G = { items: [], status: 'idle' }; // base geral
    const V = { view: 'meu', q: '', openId: null, formId: null, photoData: null, removePhoto: false, busy: false };
    let page = 'tab'; // 'tab' (painel) ou 'mgr' (página /receitas)

    const ctx = () => (page === 'mgr' ? 'mgr' : V.view === 'base' ? 'base' : 'mine');
    const listFor = (c) => (c === 'mine' ? M : G);
    const canEdit = (c) => c === 'mine' || c === 'mgr';
    const endpoint = (c, id) => (c === 'mine' ? `/api/rec/${M.slug}/${id}` : `/api/rbase/${id}`);
    const resetForm = () => { V.openId = null; V.formId = null; V.photoData = null; V.removePhoto = false; };

    /* ---------- carregar ---------- */
    async function loadMine() {
      M.status = 'loading';
      try { M.items = ((await api('GET', `/api/rec/${M.slug}`)).items || []).sort(byName); M.status = 'ready'; } catch { M.status = 'error'; }
      repaint();
    }
    async function loadBase() {
      G.status = 'loading';
      try { G.items = ((await api('GET', '/api/rbase')).items || []).sort(byName); G.status = 'ready'; } catch { G.status = 'error'; }
      repaint();
    }
    const repaint = () => (page === 'mgr' ? paintList() : paintList());

    /* ---------- peças de HTML ---------- */
    const chips = (r) => `<span class="r-m p">P ${fmt(r.p)}</span><span class="r-m c">C ${fmt(r.c)}</span><span class="r-m f">G ${fmt(r.f)}</span>${r.fi ? `<span class="r-m fi">Fib ${fmt(r.fi)}</span>` : ''}`;

    function detailsHtml(r, c) {
      const mac = (label, v, unit) => `<div class="r-mac"><b class="num">${fmt(v)}</b><small>${label}${unit ? ` (${unit})` : ''}</small></div>`;
      return `<div class="r-details">
        ${r.photo ? `<img class="r-photo" src="${P.url(r.photo)}" alt="${esc(r.name)}" loading="lazy">` : ''}
        <p class="r-portion">Valores por <b>${esc(r.portion)}</b></p>
        <div class="r-macs">${mac('kcal', r.kcal, '')}${mac('Proteínas', r.p, 'g')}${mac('Carboidratos', r.c, 'g')}${mac('Gorduras', r.f, 'g')}${r.fi ? mac('Fibras', r.fi, 'g') : ''}</div>
        ${r.prep ? `<div class="r-prep"><h4>Modo de preparo</h4><p>${esc(r.prep)}</p></div>` : '<p class="small">Sem modo de preparo cadastrado.</p>'}
        <div class="r-actions">
          ${c === 'base' ? `<button class="btn primary" data-r="add-mine" data-id="${esc(r.id)}">+ Adicionar ao meu cardápio</button>` : ''}
          ${canEdit(c) ? `<button class="btn ghost" data-r="edit" data-id="${esc(r.id)}">Editar</button><button class="btn danger" data-r="del" data-id="${esc(r.id)}">Excluir</button>` : ''}
        </div>
      </div>`;
    }

    function photoBlock(r) {
      const src = V.photoData || (!V.removePhoto && r && r.photo ? P.url(r.photo) : '');
      return `${src ? `<img src="${esc(src)}" alt="Prévia da foto">` : ''}
        <label class="chip file">${src ? 'Trocar foto' : 'Adicionar foto'}<input type="file" accept="image/*" hidden data-r="file"></label>
        ${src ? '<button type="button" class="btn link" data-r="photo-remove">Remover foto</button>' : ''}`;
    }

    function formHtml(r) {
      const x = r || {};
      const num = (name, label, val, ph) => `<label>${label}<input class="in num" name="${name}" inputmode="decimal" value="${esc(fieldVal(val))}" placeholder="${ph}"></label>`;
      return `<form class="r-form" data-r-form="1" data-id="${esc(x.id || '')}" novalidate>
        <label>Nome da receita<input class="in" name="name" maxlength="80" value="${esc(x.name || '')}" placeholder="Ex.: Arroz com cenoura" ${r ? '' : 'autofocus'}></label>
        <div class="b-photo">${photoBlock(r)}</div>
        <label>Porção a que os valores se referem<input class="in" name="portion" maxlength="30" value="${esc(x.portion || '')}" placeholder="Ex.: 100 g, 1 fatia, 1 porção"></label>
        <div class="r-grid">
          ${num('kcal', 'Calorias (kcal)', x.kcal, '0')}
          ${num('p', 'Proteínas (g)', x.p, '0')}
          ${num('c', 'Carboidratos (g)', x.c, '0')}
          ${num('f', 'Gorduras (g)', x.f, '0')}
          ${num('fi', 'Fibras (g)', x.fi, '0')}
        </div>
        <label>Modo de preparo <small>(opcional)</small><textarea class="in" name="prep" rows="5" maxlength="2000" placeholder="Ingredientes e passo a passo">${esc(x.prep || '')}</textarea></label>
        <p class="error" id="r-err" role="alert" hidden></p>
        <div class="b-actions"><button class="btn primary" type="submit">Salvar</button><button class="btn ghost" type="button" data-r="cancel">Cancelar</button></div>
      </form>`;
    }

    function listHtml() {
      const c = ctx();
      const L = listFor(c);
      if (L.status === 'idle' || L.status === 'loading') return '<div class="loading">Carregando…</div>';
      if (L.status === 'error') return '<div class="empty"><b>Não consegui abrir as receitas</b><button class="btn ghost" data-r="retry">Tentar de novo</button></div>';
      const term = fold(V.q.trim());
      const shown = L.items.filter((r) => !term || fold(r.name).includes(term));
      const rows = shown.map((r) => `<div class="b-item">
          <button class="b-head r-head" data-r="open" data-id="${esc(r.id)}" aria-expanded="${V.openId === r.id || V.formId === r.id}">
            ${r.photo ? `<img class="b-thumb" src="${P.url(r.photo)}" alt="" loading="lazy">` : `<span class="b-thumb ph" aria-hidden="true">${esc((r.name[0] || '?').toUpperCase())}</span>`}
            <span class="b-text"><span class="b-name">${esc(r.name)}</span><span class="b-sub num">${esc(r.portion)} · ${fmt(r.kcal, 0)} kcal</span><span class="r-chips">${chips(r)}</span></span>
            <span class="b-chev" aria-hidden="true">${V.openId === r.id || V.formId === r.id ? '–' : '+'}</span>
          </button>
          ${V.formId === r.id ? formHtml(r) : V.openId === r.id ? detailsHtml(r, c) : ''}
        </div>`).join('');
      const empty = c === 'mine'
        ? '<p class="t-empty">Seu cardápio ainda está vazio. Crie uma receita sua ou adicione uma da base.</p>'
        : '<p class="t-empty">Nenhuma receita aqui ainda.</p>';
      return (shown.length ? rows : (L.items.length ? '<p class="t-empty">Nenhuma receita encontrada.</p>' : empty))
        + (canEdit(c) ? (V.formId === 'new' ? formHtml(null) : '<button class="t-add" data-r="new">+ Nova receita</button>') : '');
    }

    const paintList = () => { const el = $('#r-list'); if (el) el.innerHTML = listHtml(); };

    function paintTab() {
      const root = $('#r-root');
      if (!root) return;
      const c = ctx();
      root.innerHTML = `<h1 class="page-title">Cardápio</h1>
        <div class="r-seg" role="group" aria-label="Escolher lista">
          <button data-r="view" data-v="meu" aria-pressed="${c === 'mine'}">Meu cardápio</button>
          <button data-r="view" data-v="base" aria-pressed="${c === 'base'}">Base de receitas</button>
        </div>
        <section class="card t-panel">
          <input class="in" id="r-q" value="${esc(V.q)}" placeholder="Buscar receita" aria-label="Buscar receita" autocomplete="off" style="margin:10px 0 4px">
          <div id="r-list">${listHtml()}</div>
        </section>
        <p class="small">${c === 'mine'
          ? 'Estas receitas são só suas. Quando você descreve uma refeição no diário, a IA procura aqui primeiro e usa os seus valores.'
          : 'Receitas compartilhadas por todos. Toque em uma para ver e adicione ao seu cardápio para editar do seu jeito.'}</p>`;
    }

    /* ---------- salvar / copiar / excluir ---------- */
    const rErr = (m) => { const el = $('#r-err'); if (!el) return toast(m); el.textContent = m; el.hidden = !m; };

    async function save(form) {
      if (V.busy) return;
      const c = ctx();
      const L = listFor(c);
      const fd = new FormData(form);
      const id = form.dataset.id || '';
      const old = id ? L.items.find((x) => x.id === id) : null;
      const name = String(fd.get('name') || '').trim();
      if (!name) return rErr('Dê um nome à receita.');
      V.busy = true;
      rErr('');
      const btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
      try {
        let photo = V.removePhoto ? '' : (old && old.photo) || '';
        if (V.photoData) { photo = P.longId(); await P.upload(photo, V.photoData); }
        const item = {
          id: old ? old.id : newId(), name, photo,
          portion: String(fd.get('portion') || '').trim() || '1 porção',
          kcal: Math.round(parseNum(fd.get('kcal'))), p: parseNum(fd.get('p')), c: parseNum(fd.get('c')), f: parseNum(fd.get('f')), fi: parseNum(fd.get('fi')),
          prep: String(fd.get('prep') || '').trim(),
        };
        const r = await api('PUT', endpoint(c, item.id), item);
        const i = L.items.findIndex((x) => x.id === r.item.id);
        if (i >= 0) L.items[i] = r.item; else L.items.push(r.item);
        L.items.sort(byName);
        resetForm();
        V.busy = false;
        paintList();
        toast('Receita salva');
      } catch (e) {
        V.busy = false;
        if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
        rErr(e.message || 'Não deu para salvar.');
      }
    }

    async function addToMine(id) {
      const r = G.items.find((x) => x.id === id);
      if (!r) return;
      if (M.items.some((x) => fold(x.name) === fold(r.name))) return toast('Essa receita já está no seu cardápio.');
      try {
        const copy = { ...r, id: newId() }; // cópia da pessoa: editar depois não mexe na base
        const res = await api('PUT', `/api/rec/${M.slug}/${copy.id}`, copy);
        M.items.push(res.item); M.items.sort(byName);
        toast('Adicionada ao seu cardápio');
      } catch (e) { toast(e.message); }
    }

    async function remove(id) {
      const c = ctx();
      const L = listFor(c);
      const r = L.items.find((x) => x.id === id);
      if (!r || !confirm(`Excluir "${r.name}"${c === 'mgr' ? ' da base' : ' do seu cardápio'}?`)) return;
      try {
        await api('DELETE', endpoint(c, id));
        L.items = L.items.filter((x) => x.id !== id);
        resetForm();
        paintList();
        toast('Receita excluída');
      } catch (e) { toast(e.message); }
    }

    /* ---------- eventos ---------- */
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-r]');
      if (!el || el.tagName === 'FORM' || el.tagName === 'INPUT') return;
      const id = el.dataset.id;
      switch (el.dataset.r) {
        case 'view': V.view = el.dataset.v; resetForm(); return paintTab();
        case 'open': { const was = V.openId === id || V.formId === id; resetForm(); if (!was) V.openId = id; return paintList(); }
        case 'new': resetForm(); V.formId = 'new'; paintList(); { const f = $('#r-list .r-form input[name="name"]'); if (f) f.focus(); } return;
        case 'edit': V.formId = id; V.openId = null; V.photoData = null; V.removePhoto = false; return paintList();
        case 'cancel': resetForm(); return paintList();
        case 'del': return remove(id);
        case 'add-mine': return addToMine(id);
        case 'retry': return page === 'mgr' ? loadBase() : (M.status === 'error' ? loadMine() : loadBase());
        case 'photo-remove': {
          V.photoData = null; V.removePhoto = true;
          const form = el.closest('form');
          const old = listFor(ctx()).items.find((x) => x.id === form.dataset.id) || null;
          form.querySelector('.b-photo').innerHTML = photoBlock(old);
          return;
        }
        default:
      }
    });
    document.addEventListener('submit', (e) => {
      const f = e.target.closest('[data-r-form]');
      if (!f) return;
      e.preventDefault();
      save(f);
    });
    document.addEventListener('input', (e) => {
      if (e.target.id === 'r-q') { V.q = e.target.value; paintList(); }
    });
    document.addEventListener('change', async (e) => {
      if (!(e.target.dataset && e.target.dataset.r === 'file')) return;
      const file = e.target.files && e.target.files[0];
      const form = e.target.closest('form');
      e.target.value = '';
      if (!file) return;
      try {
        V.photoData = await P.resize(file);
        V.removePhoto = false;
        const old = listFor(ctx()).items.find((x) => x.id === form.dataset.id) || null;
        form.querySelector('.b-photo').innerHTML = photoBlock(old);
        rErr('');
      } catch (err) { rErr(err.message); }
    });

    /* ---------- pontos de entrada ---------- */
    return {
      // aba Cardápio do painel
      mountTab(slug) {
        page = 'tab';
        if (M.slug !== slug) { M.slug = slug; M.items = []; M.status = 'idle'; }
        V.q = ''; resetForm();
        paintTab();
        if (M.status === 'idle' || M.status === 'error') loadMine();
        if (G.status === 'idle' || G.status === 'error') loadBase();
      },
      // página escondida /receitas
      basePage() {
        page = 'mgr';
        V.q = ''; resetForm();
        MB.app.innerHTML = `<div class="shell plain">
          <div class="top"><a class="brand" href="/" aria-label="Marombinhas, ir para o início">${MB.logo}Marombinhas</a></div>
          <div class="t-bar"><a class="t-back" href="/">← início</a></div>
          <h1 class="page-title">Receitas</h1>
          <section class="card t-panel">
            <input class="in" id="r-q" placeholder="Buscar receita" aria-label="Buscar receita" autocomplete="off" style="margin:10px 0 4px">
            <div id="r-list">${listHtml()}</div>
          </section>
          <p class="small">Esta é a base geral de receitas: o que for cadastrado aqui aparece para todos na aba Cardápio (somente leitura) e é consultado pela IA ao calcular as refeições.</p>
        </div>`;
        loadBase();
      },
    };
  };
})();
