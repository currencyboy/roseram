const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const PORT = Number(process.env.PORT) || 3001;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body) res.end(body);
  else res.end();
}

function sendJSON(res, status, data) {
  send(res, status, { 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify(data));
}

function safeJoin(base, target) {
  const safePath = path.normalize(path.join(base, target));
  if (!safePath.startsWith(base)) return null;
  return safePath;
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const headers = { 'Content-Type': type };
  if (ext && ext !== '.html') headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  fs.createReadStream(filePath)
    .on('open', () => res.writeHead(200, headers))
    .on('error', (err) => send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, `Internal Server Error\n${err.message}`))
    .pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 5 * 1024 * 1024) { reject(new Error('Payload too large')); req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleApiChat(req, res) {
  if (req.method !== 'POST') return send(res, 405, { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' }, 'Method Not Allowed');
  const key = process.env.X_API_KEY || process.env.X_API;
  if (!key) return sendJSON(res, 500, { error: 'Server missing X_API_KEY' });

  try {
    const raw = await readBody(req);
    let payload = {};
    try { payload = JSON.parse(raw || '{}'); } catch { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
    const message = (payload && typeof payload.message === 'string') ? payload.message.trim() { error: 'Message is required' });

    const apiUrl = 'https://api.x.ai/v1/chat/completions';
    const body = {
      model: 'grok-2-latest',
      messages, content,
      temperature, {
      method: 'POST',
      headers,
        'Content-Type': 'application/json'
      },
      body)
    });

    if (!resp.ok) {
      const text = await resp.text();
      return sendJSON(res, resp.status, { error: 'Upstream error', details, 2000) });
    }

    const data = await resp.json();
    const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? String(data.choices[0].message.content) { reply });
  } catch (err) {
    return sendJSON(res, 500, { error: 'Unexpected server error' });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/chat') return handleApiChat(req, res);

  if (pathname === '/') pathname = '/index.html';

  const filePath = safeJoin(ROOT, `.${pathname}`);
  if (!filePath) return send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request');

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) return serveFile(res, filePath);

    if (!err && stat && stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      return fs.stat(indexPath, (err2, stat2) => {
        if (!err2 && stat2.isFile()) return serveFile(res, indexPath);
        const fallback = path.join(ROOT, 'index.html');
        return fs.stat(fallback, (err3, stat3) => {
          if (!err3 && stat3.isFile()) return serveFile(res, fallback);
          return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
        });
      });
    }

    const fallback = path.join(ROOT, 'index.html');
    fs.stat(fallback, (err4, stat4) => {
      if (!err4 && stat4.isFile()) return serveFile(res, fallback);
      return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
    });
  });
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
