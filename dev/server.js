'use strict';
// Servidor local que imita a Vercel: arquivos de /public + a função de /api.
// Uso: node dev/server.js   (lê .env.local se existir; sem Redis usa um falso em memória)
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

(async () => {
  const hasRedis = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
  if (!hasRedis) {
    const port = Number(process.env.FAKE_REDIS_PORT) || 3999;
    await require('./fake-upstash').start(port);
    process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
    process.env.UPSTASH_REDIS_REST_TOKEN = 'dev-token';
    console.log('Sem Redis configurado: usando banco falso em memória (os dados somem ao reiniciar).');
  }
  const api = require(path.join(root, 'api', 'index.js'));
  const port = Number(process.env.PORT) || 3000;

  http.createServer(async (req, res) => {
    const p = new URL(req.url, 'http://localhost').pathname;
    if (p.startsWith('/api/')) {
      // Imita a regra do vercel.json: /api/a/b vira /api/index?p=a/b
      req.url = `/api/index?p=${p.slice(5)}`;
      return api(req, res);
    }
    const isPage = p === '/' || /^\/u\/[^/]+\/?$/.test(p) || /^\/[^/.]+(\/[^/.]+)?\/?$/.test(p);
    let file = isPage ? '/index.html' : p;
    const full = path.join(root, 'public', path.normalize(file));
    if (!full.startsWith(path.join(root, 'public')) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      res.writeHead(302, { Location: '/' });
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  }).listen(port, () => {
    console.log(`Macrinhos local em http://localhost:${port}  (IA: ${process.env.ANTHROPIC_API_KEY ? 'ativada' : 'DESATIVADA'})`);
  });
})();
