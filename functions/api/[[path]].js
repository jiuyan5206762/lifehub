// Cloudflare Pages Functions — 服务端 API（替代本地 Node 后端）
// 存储：Cloudflare KV（绑定名 LIFE_DB）。所有集合存于单个 JSON 对象，键名为集合名。
// 接口与本地 server.js 完全一致：GET/POST/PUT/DELETE /api/<collection>?id=...
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean); // ['api', <collection>]
  const coll = segments[1];
  const COLLECTIONS = ['finance', 'habits', 'fitness', 'fitness_plan', 'schedule', 'shopping', 'media', 'settings'];

  if (!coll || !COLLECTIONS.includes(coll)) {
    return Response.json({ ok: false, error: '未知集合' }, { status: 400 });
  }

  // 用户隔离：每个用户独立数据空间（同步码 / uid）
  const reqUid = url.searchParams.get('uid');
  if (!reqUid) {
    return Response.json({ ok: false, error: '缺少 uid（同步码），请先设置同步码' }, { status: 400 });
  }

  // 防御：KV 未绑定时返回明确提示（而非抛 "Cannot read properties of undefined"）
  if (!env.LIFE_DB) {
    return Response.json({
      ok: false,
      error: 'KV 未绑定：请在 Cloudflare 控制台 → Pages 项目 → 设置 → 函数 → KV 命名空间绑定 中添加变量名为 LIFE_DB 的绑定。'
    }, { status: 503 });
  }

  const STORE_KEY = 'store:' + reqUid;
  async function readStore() {
    const raw = await env.LIFE_DB.get(STORE_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }
  async function writeStore(obj) {
    await env.LIFE_DB.put(STORE_KEY, JSON.stringify(obj));
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  try {
    const store = await readStore();
    if (!Array.isArray(store[coll])) store[coll] = [];

    if (request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (id) {
        const item = store[coll].find(x => x.id === id) || null;
        return Response.json({ ok: true, data: item });
      }
      return Response.json({ ok: true, data: store[coll] });
    }

    if (request.method === 'POST') {
      const obj = await request.json().catch(() => ({}));
      if (!obj.id) obj.id = uid(); // 保留前端传入的固定 id（如 'budget'），不强制覆盖
      obj.createdAt = Date.now();
      store[coll].push(obj);
      await writeStore(store);
      return Response.json({ ok: true, data: obj });
    }

    if (request.method === 'PUT') {
      const obj = await request.json().catch(() => ({}));
      const id = url.searchParams.get('id') || obj.id;
      const idx = store[coll].findIndex(x => x.id === id);
      if (idx === -1) return Response.json({ ok: false, error: '未找到记录' }, { status: 404 });
      store[coll][idx] = Object.assign({}, store[coll][idx], obj, { id });
      store[coll][idx].updatedAt = Date.now();
      await writeStore(store);
      return Response.json({ ok: true, data: store[coll][idx] });
    }

    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id');
      const before = store[coll].length;
      store[coll] = store[coll].filter(x => x.id !== id);
      await writeStore(store);
      return Response.json({ ok: true, removed: before - store[coll].length });
    }

    return Response.json({ ok: false, error: '方法不支持' }, { status: 405 });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
