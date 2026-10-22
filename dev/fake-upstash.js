'use strict';
// Redis falso em memória, com a mesma API REST da Upstash. Só para testes locais.
const http = require('http');

function start(port) {
  const store = new Map(); // chave -> { v, exp }
  const live = (k) => {
    const e = store.get(k);
    if (e && e.exp && e.exp <= Date.now()) { store.delete(k); return null; }
    return e || null;
  };
  const run = (c) => {
    const [op, key, ...a] = c;
    switch (String(op).toUpperCase()) {
      case 'GET': { const e = live(key); return e ? e.v : null; }
      case 'SET': {
        if (a.includes('NX') && live(key)) return null;
        store.set(key, { v: String(a[0]) });
        return 'OK';
      }
      case 'EXISTS': return live(key) ? 1 : 0;
      case 'DEL': { let n = 0; [key, ...a].forEach((k) => { if (live(k)) { store.delete(k); n++; } }); return n; }
      case 'INCR': {
        const e = live(key) || { v: '0' };
        e.v = String(Number(e.v) + 1);
        store.set(key, e);
        return Number(e.v);
      }
      case 'EXPIRE': {
        const e = live(key);
        if (!e) return 0;
        if (a.includes('NX') && e.exp) return 0;
        e.exp = Date.now() + Number(a[0]) * 1000;
        return 1;
      }
      case 'HSET': {
        const e = live(key) || { v: new Map() };
        let n = 0;
        for (let i = 0; i < a.length; i += 2) { if (!e.v.has(a[i])) n++; e.v.set(a[i], String(a[i + 1])); }
        store.set(key, e);
        return n;
      }
      case 'HGET': { const e = live(key); return e && e.v.has(a[0]) ? e.v.get(a[0]) : null; }
      case 'HDEL': { const e = live(key); return e && e.v.delete(a[0]) ? 1 : 0; }
      case 'HLEN': { const e = live(key); return e ? e.v.size : 0; }
      case 'HGETALL': { const e = live(key); return e ? [...e.v].flat() : []; }
      default: throw new Error(`comando não suportado: ${op}`);
    }
  };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let b = '';
      req.on('data', (c) => (b += c));
      req.on('end', () => {
        if (req.headers.authorization !== 'Bearer dev-token') { res.writeHead(401); return res.end('{"error":"unauthorized"}'); }
        const cmds = JSON.parse(b);
        const out = (Array.isArray(cmds[0]) ? cmds : [cmds]).map((c) => {
          try { return { result: run(c) }; } catch (e) { return { error: e.message }; }
        });
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(req.url.endsWith('/pipeline') ? out : out[0]));
      });
    });
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}
module.exports = { start };
