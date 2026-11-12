// Only the active pack's manifest fields and its declared JSON model are returned.
// Rendering and pack scripts stay in the desktop-pet service's original sandbox.
export function petOrigin(raw) {
  const u = new URL(raw);
  if (
    u.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    u.username ||
    u.password ||
    !u.port ||
    u.search ||
    u.hash ||
    !['/pet', '/'].includes(u.pathname)
  )
    throw Error('桌宠服务地址不可用。');
  return u.origin;
}
async function json(url, limit) {
  const r = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw Error('桌宠服务暂时无法提供装扮。');
  const reader = r.body.getReader(),
    chunks = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw Error('装扮描述文件过大。');
    }
    chunks.push(Buffer.from(value));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function figureDescriptor(url, id) {
  const origin = petOrigin(url);
  if (typeof id !== 'string' || id.length > 128) throw Error('缺少装扮。');
  const packs = await json(origin + '/api/figures', 4 * 1024 * 1024),
    p = packs.find((p) => p.id === id);
  if (!p) throw Error('当前装扮还没有加载完成。');
  const base = new URL(p.base, origin);
  if (
    base.origin !== origin ||
    !/^\/(web|packs)\//.test(base.pathname) ||
    !base.pathname.endsWith('/')
  )
    throw Error('装扮目录不正确。');
  const asset = (file) => {
    const u = new URL(file, base);
    if (
      u.origin !== origin ||
      !u.pathname.startsWith(base.pathname) ||
      u.search ||
      u.hash
    )
      throw Error('装扮资源路径不正确。');
    return u.href;
  };
  return {
    id: p.id,
    base: base.href,
    entry: asset(p.entry),
    export: p.export,
    frame: origin + '/figure-frame?pack=' + encodeURIComponent(p.id),
    model: p.model ? await json(asset(p.model), 12 * 1024 * 1024) : null,
    words: p.vocab.map((w) => w.id),
  };
}
