'use strict';
/*
 * Macrinhos — API para a Vercel (função serverless, sem dependências).
 *
 * Variáveis de ambiente (configuradas no painel da Vercel, nunca no código):
 *   ANTHROPIC_API_KEY                 chave da API usada na análise por IA
 *   UPSTASH_REDIS_REST_URL / _TOKEN   banco de dados (a integração Upstash cria sozinha;
 *   ou KV_REST_API_URL / _TOKEN       também aceitamos os nomes antigos da Vercel KV)
 *
 * Dados no Redis:
 *   macrinhos:u:<código>   JSON com metas, perfil e data de criação
 *   macrinhos:m:<código>   hash: id da refeição -> JSON da refeição
 */
const crypto = require('crypto');
const SEED = require('../lib/seed.js');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const LIMITS = {
  createsPerIpPerHour: Number(process.env.CREATES_PER_IP_HOUR) || 10,
  analysesPerIpPerHour: Number(process.env.ANALYSES_PER_IP_HOUR) || 60,
  analysesPerUserPerDay: Number(process.env.DAILY_ANALYSES_PER_USER) || 40,
  analysesGlobalPerDay: Number(process.env.DAILY_ANALYSES_GLOBAL) || 2000,
};
const MAX_MEALS = 5000;
const MEAL_TYPES = ['cafe', 'almoco', 'lanche', 'jantar', 'ceia', 'outro'];

const httpError = (status, message) => Object.assign(new Error(message), { status });

/* ---------- Redis (API REST da Upstash) ---------- */

async function pipeline(cmds) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw httpError(503, 'O banco de dados ainda não foi configurado neste site.');
  let r;
  try {
    r = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds.map((c) => c.map(String))),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    console.error('Redis inacessível:', e.message);
    throw httpError(503, 'Banco de dados indisponível. Tente novamente.');
  }
  if (!r.ok) {
    console.error('Redis respondeu', r.status, (await r.text().catch(() => '')).slice(0, 300));
    throw httpError(503, 'Banco de dados indisponível. Tente novamente.');
  }
  const arr = await r.json();
  return arr.map((x) => {
    if (x && x.error) { console.error('Erro do Redis:', x.error); throw httpError(500, 'Erro interno.'); }
    return x.result;
  });
}
const cmd1 = async (...c) => (await pipeline([c]))[0];

const userKey = (code) => `macrinhos:u:${code}`;
const mealsKey = (code) => `macrinhos:m:${code}`;
const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };

async function rateLimit(key, max, windowSec) {
  const [n] = await pipeline([['INCR', key], ['EXPIRE', key, windowSec, 'NX']]);
  return Number(n) <= max;
}

/* ---------- utilidades ---------- */

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) req.body = req.body.toString('utf8');
    if (typeof req.body === 'string') {
      if (!req.body.trim()) return {};
      try { return JSON.parse(req.body); } catch { throw httpError(400, 'Pedido inválido.'); }
    }
    return req.body;
  }
  if (req.readableEnded) return {};
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 4 * 1024 * 1024) throw httpError(413, 'Arquivo grande demais. Tente uma foto menor.');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw httpError(400, 'Pedido inválido.'); }
}

function num(v, min, max, dec = 1) {
  const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** dec;
  return Math.round(Math.min(max, Math.max(min, n)) * f) / f;
}
function str(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}
function validDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const validTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

function cleanItems(arr) {
  if (!Array.isArray(arr) || !arr.length) throw httpError(400, 'Adicione pelo menos um item.');
  return arr.slice(0, 30).map((it) => ({
    name: str(it && it.name, 80) || 'Item',
    qty: str(it && it.qty, 40),
    kcal: num(it && it.kcal, 0, 5000, 0),
    p: num(it && it.p, 0, 500),
    c: num(it && it.c, 0, 800),
    f: num(it && it.f, 0, 500),
    fi: num(it && it.fi, 0, 200),
  }));
}
function totals(items) {
  const t = items.reduce(
    (a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f, fi: a.fi + i.fi }),
    { kcal: 0, p: 0, c: 0, f: 0, fi: 0 }
  );
  const r1 = (x) => Math.round(x * 10) / 10;
  return { kcal: Math.round(t.kcal), p: r1(t.p), c: r1(t.c), f: r1(t.f), fi: r1(t.fi) };
}
function mealName(items) {
  const names = items.map((i) => i.name);
  let s = names.slice(0, 3).join(', ');
  if (names.length > 3) s += ` e mais ${names.length - 3}`;
  return s.slice(0, 100);
}

function buildMeal(body, existing) {
  if (!validDate(body.date)) throw httpError(400, 'Data inválida.');
  if (!validTime(body.time)) throw httpError(400, 'Horário inválido.');
  const items = cleanItems(body.items);
  const t = totals(items);
  let thumb = existing ? existing.thumb : undefined;
  if (typeof body.thumb === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(body.thumb) && body.thumb.length < 24000) {
    thumb = body.thumb;
  }
  const meal = {
    id: existing ? existing.id : crypto.randomBytes(6).toString('hex'),
    date: body.date,
    time: body.time,
    type: MEAL_TYPES.includes(body.type) ? body.type : 'outro',
    name: mealName(items),
    items,
    kcal: t.kcal, p: t.p, c: t.c, f: t.f, fi: t.fi,
    source: body.source === 'ia' ? 'ia' : 'manual',
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
  };
  if (thumb) meal.thumb = thumb;
  return meal;
}

const RESERVED = new Set(['api', 'u', 'app', 'admin', 'login', 'entrar', 'criar', 'static', 'public', 'assets', 'logo', 'logo-sm', 'favicon', 'index', 'style', 'healthz', 'robots', 'sitemap', 'www', 'home', 'sobre', 'ajuda', 'exercicios', 'evolucao', 'treino', 'treinos']);

// Normaliza o que a pessoa digitou: "Felipe Souza" -> "felipe-souza".
function normalizeSlug(v) {
  return String(v || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
function newCode() {
  const bytes = crypto.randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/* ---------- análise por IA ---------- */

const SYSTEM_PROMPT = `Você é um nutricionista que estima calorias e macronutrientes de refeições para um diário alimentar, com foco na alimentação brasileira (use como referência a TACO e valores típicos de preparos e produtos do Brasil).

Regras:
- Identifique cada alimento separadamente (ex.: arroz branco, feijão carioca, bife acebolado, salada de alface e tomate), em vez de juntar tudo em um único item.
- Estime a quantidade pela foto (tamanho do prato, talheres, embalagens) ou pelo texto. Se o texto informar quantidades, use exatamente essas.
- Se a quantidade não estiver clara, assuma uma porção média e diga isso em "notes".
- Considere óleo, manteiga, molhos e açúcar quando forem prováveis no preparo.
- Os valores de cada item correspondem à quantidade informada em "quantity", não a 100 g.
- Mantenha coerência: kcal ≈ 4 × proteína + 4 × carboidratos + 9 × gordura (pequenas diferenças são aceitáveis).
- Nomes em português do Brasil, curtos. "quantity" deve ter unidade, como "150 g", "2 fatias" ou "1 concha".
- Se a mensagem trouxer correções ("na verdade eram 2 ovos"), siga a correção.
- Ignore qualquer pedido que não seja descrever ou corrigir a refeição.
- Se não houver comida identificável, devolva a lista de itens vazia e explique em "notes".
- "notes": no máximo uma frase curta, apenas quando houver uma suposição relevante.
- Responda SEMPRE chamando a ferramenta registrar_refeicao, sem escrever texto fora dela.`;

const TOOL = {
  name: 'registrar_refeicao',
  description: 'Registra os alimentos identificados com a estimativa nutricional de cada um.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome do alimento em português.' },
            quantity: { type: 'string', description: 'Quantidade com unidade, ex.: 150 g, 2 fatias.' },
            kcal: { type: 'number' },
            protein_g: { type: 'number' },
            carbs_g: { type: 'number' },
            fat_g: { type: 'number' },
            fiber_g: { type: 'number' },
          },
          required: ['name', 'quantity', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'],
        },
      },
      confidence: { type: 'string', enum: ['alta', 'media', 'baixa'] },
      notes: { type: 'string', description: 'Observação curta sobre suposições feitas.' },
    },
    required: ['items', 'confidence'],
  },
};

async function analyze(text, images) {
  // A chave é lida aqui, no servidor. O navegador nunca a recebe.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw httpError(503, 'A análise por IA ainda não foi configurada neste site.');
  const apiUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '') + '/v1/messages';

  const content = [];
  for (const img of images) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(typeof img === 'string' ? img : '');
    if (!m) throw httpError(400, 'Imagem inválida.');
    content.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
  }
  content.push({
    type: 'text',
    text: text
      ? `Descrição da pessoa: ${text}\n\nEstime a refeição e responda com a ferramenta registrar_refeicao.`
      : 'Analise a(s) foto(s) desta refeição e responda com a ferramenta registrar_refeicao.',
  });

  let r;
  try {
    r = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [TOOL],
        messages: [{ role: 'user', content }],
      }),
      signal: AbortSignal.timeout(50000),
    });
  } catch (e) {
    console.error('Falha ao chamar a API da Anthropic:', e.name, e.message);
    throw httpError(504, 'A análise demorou demais. Tente novamente.');
  }

  if (!r.ok) {
    const errBody = await r.text().catch(() => '');
    let errMsg = '';
    try { errMsg = String(JSON.parse(errBody).error.message || ''); } catch { /* corpo sem JSON */ }
    console.error('API da Anthropic respondeu', r.status, errMsg || errBody.slice(0, 500));
    if (r.status === 429) throw httpError(429, 'A IA está ocupada. Tente de novo em instantes.');
    if (r.status === 401 || r.status === 403) throw httpError(502, 'A chave da IA foi recusada (erro ' + r.status + '). Confira a variável ANTHROPIC_API_KEY na Vercel.');
    if (r.status === 404) throw httpError(502, 'O modelo de IA configurado não está disponível (erro 404). Confira a variável ANTHROPIC_MODEL.');
    if (r.status === 400 && /credit|billing/i.test(errBody)) throw httpError(502, 'A conta da Anthropic está sem créditos (erro 400). Adicione créditos em console.anthropic.com.');
    if (r.status === 400 && errMsg) throw httpError(502, 'A IA recusou o pedido (erro 400): ' + errMsg.slice(0, 220));
    throw httpError(502, 'Não consegui analisar agora (erro ' + r.status + ' da IA). Tente novamente.');
  }

  const data = await r.json();
  const blocks = Array.isArray(data.content) ? data.content : [];
  let input = (blocks.find((b) => b.type === 'tool_use') || {}).input;
  if (!input) {
    // Plano B: se a IA respondeu em texto, tenta ler o JSON dele.
    const txt = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const m = /\{[\s\S]*\}/.exec(txt);
    if (m) { try { input = JSON.parse(m[0]); } catch { /* ignora */ } }
  }
  if (!input) {
    console.error('Resposta da IA sem ferramenta:', JSON.stringify(blocks).slice(0, 400));
    throw httpError(502, 'Não consegui interpretar a resposta da IA. Tente novamente.');
  }
  const tu = { input };

  const rawItems = Array.isArray(tu.input.items) ? tu.input.items : [];
  return {
    items: rawItems.slice(0, 30).map((i) => ({
      name: str(i.name, 80) || 'Item',
      qty: str(i.quantity, 40),
      kcal: num(i.kcal, 0, 5000, 0),
      p: num(i.protein_g, 0, 500),
      c: num(i.carbs_g, 0, 800),
      f: num(i.fat_g, 0, 500),
      fi: num(i.fiber_g, 0, 200),
    })),
    confidence: ['alta', 'media', 'baixa'].includes(tu.input.confidence) ? tu.input.confidence : 'media',
    notes: str(tu.input.notes, 240),
  };
}

/* ---------- treino, base de exercícios e fotos ---------- */
// Mesmo formato do Marombinhas antigo: treino:<nome>, base:global, foto:<id>.
// Assim, ligando o mesmo banco ao projeto novo, os dados antigos aparecem sem migração.

const TREINO_RE = /^\/api\/treino\/([a-z0-9][a-z0-9-]{1,28}[a-z0-9])$/;
const BASE_RE = /^\/api\/base(?:\/([a-z0-9-]{3,40}))?$/;
const FOTO_RE = /^\/api\/foto\/([a-z0-9]{6,40})$/;
const ID_RE = /^[a-z0-9-]{3,40}$/;
const treinoKey = (slug) => `treino:${slug}`;

function strMulti(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max);
}
const rid = () => crypto.randomBytes(5).toString('hex');
const okId = (v) => (typeof v === 'string' && ID_RE.test(v) ? v : rid());

// Garante o formato do documento de treino (aceita também o formato antigo, só a lista de treinos).
function cleanTreino(raw) {
  if (Array.isArray(raw)) raw = { workouts: raw };
  if (!raw || typeof raw !== 'object') throw httpError(400, 'Dados inválidos.');
  const workouts = (Array.isArray(raw.workouts) ? raw.workouts : []).slice(0, 30).map((w) => ({
    id: okId(w && w.id),
    name: str(w && w.name, 40) || 'Treino',
    exercises: (Array.isArray(w && w.exercises) ? w.exercises : []).slice(0, 80).map((e) => {
      const ex = {
        id: okId(e && e.id),
        name: str(e && e.name, 80) || 'Exercício',
        series: str(e && e.series, 20) || '3x10',
        peso: str(e && e.peso, 20) || '0Kg',
        history: (Array.isArray(e && e.history) ? e.history : [])
          .filter((h) => h && validDate(h.d) && Number(h.kg) > 0)
          .slice(-200)
          .map((h) => ({ d: h.d, kg: num(h.kg, 0, 2000) })),
      };
      if (e && typeof e.baseId === 'string' && ID_RE.test(e.baseId)) ex.baseId = e.baseId;
      return ex;
    }),
  }));
  const doc = {
    title: str(raw.title, 120) || 'Planejamento academia',
    desc: strMulti(raw.desc, 800),
    workouts: workouts.length ? workouts : [{ id: rid(), name: 'Treino', exercises: [] }],
  };
  if (Array.isArray(raw.library) && raw.library.length) {
    doc.library = raw.library.slice(0, 100).map((l) => ({ id: okId(l && l.id), name: str(l && l.name, 60) || 'Exercício' }));
  }
  return doc;
}

function cleanBaseItem(b, id) {
  const name = str(b && b.name, 60);
  if (!name) throw httpError(400, 'Dê um nome ao exercício.');
  const link = str(b && b.link, 300);
  if (link && !/^https?:\/\/[^\s]+$/i.test(link)) throw httpError(400, 'O link de exemplo precisa começar com http:// ou https://');
  return {
    id,
    name,
    muscles: str(b && b.muscles, 120),
    desc: strMulti(b && b.desc, 400),
    link,
    photo: b && typeof b.photo === 'string' && /^[a-z0-9]{6,40}$/.test(b.photo) ? b.photo : '',
  };
}

async function loadBase() {
  const raw = await cmd1('GET', 'base:global');
  const d = raw && parse(raw);
  return d && Array.isArray(d.items) ? d : { items: SEED.map((x) => ({ ...x })) };
}

async function limitGlobalWrites(req) {
  if (!(await rateLimit(`macrinhos:rl:base:${clientIp(req)}`, 120, 3600))) {
    throw httpError(429, 'Muitas alterações seguidas. Tente de novo em alguns minutos.');
  }
}

async function handleTreino(req, res, slug) {
  const key = treinoKey(slug);
  if (req.method === 'GET') {
    const raw = await cmd1('GET', key);
    return sendJson(res, 200, { data: (raw && parse(raw)) || null });
  }
  if (req.method === 'PUT') {
    const body = await readBody(req);
    const doc = cleanTreino(body.data);
    const json = JSON.stringify(doc);
    if (json.length > 100000) throw httpError(400, 'O treino ficou grande demais.');
    const [n, , exists] = await pipeline([
      ['INCR', `macrinhos:rl:treino:${clientIp(req)}`],
      ['EXPIRE', `macrinhos:rl:treino:${clientIp(req)}`, 3600, 'NX'],
      ['EXISTS', userKey(slug)],
    ]);
    if (Number(n) > 3000) throw httpError(429, 'Muitas alterações seguidas. Tente de novo em alguns minutos.');
    if (!exists) throw httpError(404, 'Painel não encontrado. Crie o painel antes de salvar o treino.');
    await cmd1('SET', key, json);
    return sendJson(res, 200, { ok: true });
  }
  throw httpError(405, 'Método não permitido.');
}

async function handleBase(req, res, id) {
  if (req.method === 'GET' && !id) {
    return sendJson(res, 200, { items: (await loadBase()).items });
  }
  if (req.method === 'PUT' && id) {
    const body = await readBody(req);
    const item = cleanBaseItem(body, id);
    await limitGlobalWrites(req);
    const base = await loadBase();
    if (base.items.some((x) => x.id !== id && String(x.name).toLowerCase() === item.name.toLowerCase())) {
      throw httpError(409, 'Já existe um exercício com esse nome.');
    }
    const i = base.items.findIndex((x) => x.id === id);
    if (i < 0) {
      if (base.items.length >= 500) throw httpError(400, 'A base chegou ao limite de 500 exercícios.');
      base.items.push(item);
    } else {
      base.items[i] = { ...base.items[i], ...item };
    }
    await cmd1('SET', 'base:global', JSON.stringify(base));
    return sendJson(res, 200, { item });
  }
  if (req.method === 'DELETE' && id) {
    await limitGlobalWrites(req);
    const base = await loadBase();
    const left = base.items.filter((x) => x.id !== id);
    if (left.length === base.items.length) throw httpError(404, 'Exercício não encontrado.');
    await cmd1('SET', 'base:global', JSON.stringify({ ...base, items: left }));
    return sendJson(res, 200, { ok: true });
  }
  throw httpError(405, 'Método não permitido.');
}

async function handleFoto(req, res, id) {
  const key = `foto:${id}`;
  if (req.method === 'GET') {
    let raw = await cmd1('GET', key);
    if (typeof raw === 'string' && raw.startsWith('"')) raw = parse(raw) || raw;
    const m = typeof raw === 'string' ? /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(raw) : null;
    if (!m) { res.writeHead(404, { 'Cache-Control': 'no-store' }); return res.end(); }
    const buf = Buffer.from(m[1], 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': buf.length,
      // o id muda a cada foto nova, então pode ficar em cache
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return res.end(buf);
  }
  if (req.method === 'PUT') {
    const body = await readBody(req);
    const data = body.data;
    if (typeof data !== 'string' || data.length > 200000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data)) {
      throw httpError(400, 'Imagem inválida.');
    }
    await limitGlobalWrites(req);
    await cmd1('SET', key, data);
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'DELETE') {
    await cmd1('DEL', key);
    return sendJson(res, 200, { ok: true });
  }
  throw httpError(405, 'Método não permitido.');
}

/* ---------- rotas ---------- */

const API_RE = /^\/api\/u\/([a-z0-9][a-z0-9-]{1,28}[a-z0-9]|[a-z0-9]{16})(?:\/(goals|analyze|meals)(?:\/([a-z0-9]{6,40}))?)?$/;

async function route(req, res) {
  const method = req.method;
  // Na Vercel, o vercel.json reescreve /api/qualquer/coisa para /api/index?p=qualquer/coisa.
  const url = new URL(req.url, 'http://localhost');
  const rewritten = url.searchParams.get('p');
  const p = (rewritten ? `/api/${rewritten}` : url.pathname).replace(/\/+$/, '');

  if (p === '/api/healthz') {
    return sendJson(res, 200, {
      ok: true,
      ai: Boolean(process.env.ANTHROPIC_API_KEY),
      db: Boolean((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)),
    });
  }

  let mm;
  if ((mm = TREINO_RE.exec(p))) return handleTreino(req, res, mm[1]);
  if ((mm = BASE_RE.exec(p))) return handleBase(req, res, mm[1]);
  if ((mm = FOTO_RE.exec(p))) return handleFoto(req, res, mm[1]);

  if (p === '/api/create') {
    if (method !== 'POST') throw httpError(405, 'Método não permitido.');
    const body = await readBody(req);
    const slug = normalizeSlug(body.slug);
    if (slug.length < 3) throw httpError(400, 'Escolha um nome com pelo menos 3 letras ou números.');
    if (RESERVED.has(slug)) throw httpError(400, 'Esse nome não pode ser usado. Escolha outro.');
    if (!(await rateLimit(`macrinhos:rl:create:${clientIp(req)}`, LIMITS.createsPerIpPerHour, 3600))) {
      throw httpError(429, 'Muitos painéis criados por aqui. Tente de novo mais tarde.');
    }
    const doc = { code: slug, createdAt: new Date().toISOString(), goals: null, profile: null };
    const done = await cmd1('SET', userKey(slug), JSON.stringify(doc), 'NX');
    if (done !== 'OK') throw httpError(409, 'Esse nome já está em uso. Escolha outro ou entre nele.');
    return sendJson(res, 201, { code: slug });
  }

  const m = API_RE.exec(p);
  if (!m) throw httpError(404, 'Não encontrado.');
  const [, code, sub, id] = m;
  const uk = userKey(code);
  const mk = mealsKey(code);

  if (!sub) {
    if (method === 'GET') {
      const [rawUser, rawMeals] = await pipeline([['GET', uk], ['HGETALL', mk]]);
      const user = rawUser && parse(rawUser);
      if (!user) throw httpError(404, 'Painel não encontrado. Confira o link.');
      const flat = Array.isArray(rawMeals) ? rawMeals : Object.entries(rawMeals || {}).flat();
      const cutoff = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
      const meals = [];
      for (let i = 1; i < flat.length; i += 2) {
        const meal = parse(flat[i]);
        if (!meal) continue;
        if (meal.thumb && meal.date < cutoff) delete meal.thumb;
        meals.push(meal);
      }
      return sendJson(res, 200, { goals: user.goals, profile: user.profile, meals });
    }
    if (method === 'DELETE') {
      const raw = await cmd1('GET', uk);
      if (!raw) throw httpError(404, 'Painel não encontrado.');
      await cmd1('DEL', uk, mk, treinoKey(code));
      return sendJson(res, 200, { ok: true });
    }
    throw httpError(405, 'Método não permitido.');
  }

  if (sub === 'goals') {
    if (method !== 'PUT') throw httpError(405, 'Método não permitido.');
    const body = await readBody(req);
    const g = body.goals || {};
    const goals = {
      kcal: num(g.kcal, 0, 8000, 0),
      protein: num(g.protein, 0, 600, 0),
      carbs: num(g.carbs, 0, 1000, 0),
      fat: num(g.fat, 0, 400, 0),
      fiber: num(g.fiber, 0, 200, 0),
    };
    if (goals.kcal < 800) throw httpError(400, 'A meta de calorias precisa ser de pelo menos 800 kcal.');
    let profile = null;
    const pr = body.profile;
    if (pr && typeof pr === 'object') {
      profile = {
        sex: pr.sex === 'f' ? 'f' : 'm',
        age: num(pr.age, 0, 120, 0),
        weight: num(pr.weight, 0, 400),
        height: num(pr.height, 0, 260, 0),
        activity: ['1.2', '1.375', '1.55', '1.725'].includes(String(pr.activity)) ? String(pr.activity) : '1.375',
        objective: ['perder', 'manter', 'ganhar'].includes(pr.objective) ? pr.objective : 'manter',
      };
    }
    const user = parse(await cmd1('GET', uk));
    if (!user) throw httpError(404, 'Painel não encontrado.');
    user.goals = goals;
    if (profile) user.profile = profile;
    await cmd1('SET', uk, JSON.stringify(user));
    return sendJson(res, 200, { goals: user.goals, profile: user.profile });
  }

  if (sub === 'analyze') {
    if (method !== 'POST') throw httpError(405, 'Método não permitido.');
    const body = await readBody(req);
    const text = str(body.text, 1500);
    const images = Array.isArray(body.images) ? body.images.slice(0, 3) : [];
    if (!text && !images.length) throw httpError(400, 'Escreva o que comeu ou envie uma foto.');
    if (!(await cmd1('EXISTS', uk))) throw httpError(404, 'Painel não encontrado. Confira o link.');
    if (!(await rateLimit(`macrinhos:rl:an-ip:${clientIp(req)}`, LIMITS.analysesPerIpPerHour, 3600))
      || !(await rateLimit(`macrinhos:rl:an-user:${code}`, LIMITS.analysesPerUserPerDay, 86400))) {
      throw httpError(429, 'Você atingiu o limite de análises por hoje. Dá para continuar preenchendo manualmente.');
    }
    if (!(await rateLimit('macrinhos:rl:an-global', LIMITS.analysesGlobalPerDay, 86400))) {
      throw httpError(429, 'O limite diário de análises do site foi atingido. Tente amanhã ou preencha manualmente.');
    }
    return sendJson(res, 200, await analyze(text, images));
  }

  /* sub === 'meals' */
  if (method === 'POST' && !id) {
    const body = await readBody(req);
    const meal = buildMeal(body, null);
    const [exists, count] = await pipeline([['EXISTS', uk], ['HLEN', mk]]);
    if (!exists) throw httpError(404, 'Painel não encontrado.');
    if (Number(count) >= MAX_MEALS) throw httpError(400, 'Limite de refeições atingido.');
    await cmd1('HSET', mk, meal.id, JSON.stringify(meal));
    return sendJson(res, 201, { meal });
  }

  if (method === 'PUT' && id) {
    const body = await readBody(req);
    const [exists, raw] = await pipeline([['EXISTS', uk], ['HGET', mk, id]]);
    const old = raw && parse(raw);
    if (!exists || !old) throw httpError(404, 'Refeição não encontrada.');
    const meal = buildMeal(body, old);
    await cmd1('HSET', mk, id, JSON.stringify(meal));
    return sendJson(res, 200, { meal });
  }

  if (method === 'DELETE' && id) {
    const [exists, removed] = await pipeline([['EXISTS', uk], ['HDEL', mk, id]]);
    if (!exists || !Number(removed)) throw httpError(404, 'Refeição não encontrada.');
    return sendJson(res, 200, { ok: true });
  }

  throw httpError(405, 'Método não permitido.');
}

module.exports = async (req, res) => {
  try {
    await route(req, res);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (res.headersSent) return res.end();
    sendJson(res, status, { error: status === 500 ? 'Erro interno. Tente novamente.' : e.message });
  }
};
