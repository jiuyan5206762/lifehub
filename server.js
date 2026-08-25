// 生活工作台 — 服务端：真实在线存储（非浏览器 localStorage）
// 所有数据保存在服务端 JSON 文件，前端通过 REST API 读写，跨浏览器/刷新不丢。

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'data', 'store.json');
const PORT = process.env.PORT || 8787;

const COLLECTIONS = ['finance', 'habits', 'fitness', 'fitness_plan', 'schedule', 'shopping', 'media', 'settings'];

function ensureStore() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const init = {};
    COLLECTIONS.forEach(c => (init[c] = []));
    writeJSON(init);
  }
}

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeJSON(obj) {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH); // 原子替换，避免损坏
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8'));
    return;
  }

  if (parts[0] === 'api') {
    const coll = parts[1];
    if (!COLLECTIONS.includes(coll)) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: '未知集合' }));
      return;
    }
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try {
        const store = readStore();
        if (!Array.isArray(store[coll])) store[coll] = [];

        if (req.method === 'GET') {
          const id = url.searchParams.get('id');
          if (id) {
            const item = store[coll].find(x => x.id === id);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, data: item || null }));
          }  else {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, data: store[coll] }));
          }
          return;
        }

        if (req.method === 'POST') {
          const obj = JSON.parse(body || '{}');
          obj.id = uid();
          obj.createdAt = Date.now();
          store[coll].push(obj);
          writeJSON(store);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, data: obj }));
          return;
        }

        if (req.method === 'PUT') {
          const obj = JSON.parse(body || '{}');
          const id = url.searchParams.get('id') || obj.id;
          const idx = store[coll].findIndex(x => x.id === id);
          if (idx === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, error: '未找到记录' }));
            return;
          }
          store[coll][  idx] = Object.assign({}, store[coll][idx], obj, { id });
          store[coll][idx].updatedAt = Date.now();
          writeJSON(store);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, data: store[coll][idx] }));
          return;
        }

        if (req.method === 'DELETE') {
          const id = url.searchParams.get('id');
          const before = store[coll].length;
          store[coll] = store[coll].filter(x => x.id !== id);
          writeJSON(store);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, removed: before - store[coll].length }));
          return;
        }

        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: '方法不支持' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
});

ensureStore();
server.listen(PORT, () => {
  console.log('Life workspace server running at http://localhost:' + PORT);
});
