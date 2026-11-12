// Screen-facing cutout at a projected world position. The isolated native figure
// frame draws the actual outfit and animations. Never import pack code into WebUI.
export function mountFigure(ctx, stage, status) {
  const host = document.createElement('div');
  host.className = 'home-actor';
  stage.append(host);
  const W = 500,
    H = 280,
    S = 0.72,
    floorY = 250;
  let frame = null,
    desc,
    signature = '',
    known = [],
    skin,
    layout,
    ready = false,
    loading = false,
    loadingSince = 0;
  let lastMode = '',
    lastDir = 1,
    bounds = null,
    lastQuery = 0,
    frameDue = 0,
    waitingFrame = false,
    lastRequest = 0;
  const send = (m) => frame?.contentWindow?.postMessage(m, '*');
  function dismiss() {
    ready = false;
    waitingFrame = false;
    frame?.remove();
    frame = null;
    layout = null;
    host.hidden = true;
    lastMode = '';
  }
  function error(text) {
    dismiss();
    signature = '';
    status(text);
  }
  function install(d, activeSkin) {
    dismiss();
    desc = d;
    skin = activeSkin;
    known = d.words;
    frame = document.createElement('iframe');
    frame.title = '当前 Coopanion 桌宠装扮';
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.src = d.frame;
    frame.style.width = W + 'px';
    frame.style.height = H + 'px';
    host.append(frame);
    loadingSince = Date.now();
  }
  async function connect(force = false) {
    if (
      loading ||
      ctx.signal.aborted ||
      Date.now() - lastQuery < (force ? 0 : 4500)
    )
      return;
    loading = true;
    lastQuery = Date.now();
    try {
      const r = await fetch(
        '/api/webui/providers/world%3Adesktop-pet/panels/pet/state',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ args: [] }),
          signal: ctx.signal,
        },
      );
      if (!r.ok) throw Error('请启用 Coopanion 的桌宠 World。');
      const data = await r.json();
      if (!data.url || !data.skin?.figure) throw Error('桌宠服务尚未就绪。');
      const id = JSON.stringify([data.url, data.skin]);
      if (signature === id && frame) {
        if (!ready && Date.now() - loadingSince > 22000)
          error('装扮加载超时，将自动重试。');
        return;
      }
      const descriptor = await ctx.invoke('figure', [
        data.url,
        data.skin.figure,
      ]);
      if (ctx.signal.aborted) return;
      signature = id;
      install(descriptor, data.skin);
      status('正在载入当前装扮…');
    } catch (e) {
      if (!ctx.signal.aborted) error(e.message || '桌宠暂时离线。');
    } finally {
      loading = false;
    }
  }
  const words = {
    desk: ['write', 'sit'],
    shelf: ['read', 'sit'],
    washer: ['work', 'look'],
    rack: ['work', 'look'],
    shoes: ['sit', 'nod'],
    tea: ['drink', 'sit'],
    market: ['nod', 'look'],
    seeds: ['nod', 'look'],
    sell: ['nod', 'look'],
    idle: ['stand', 'idle'],
    walking: ['walk', 'run'],
    carried: ['surprised', 'look'],
    tv: ['sit', 'look'],
    sofa: ['sit', 'idle'],
    table: ['eat', 'sit'],
    bed: ['sleep', 'sit'],
    bath: ['sit', 'calm'],
    sink: ['look', 'stand'],
    stove: ['work', 'look'],
    sow: ['work', 'look'],
    water: ['water', 'look'],
    harvest: ['happy', 'nod'],
    vendor: ['nod', 'look'],
    stroll: ['look', 'stand'],
  };
  function mode(kind, dir, force = false) {
    if (
      !ready ||
      (!force && lastMode === kind && (kind !== 'walking' || dir === lastDir))
    )
      return;
    if (lastMode === 'walking') send({ t: 'stop-walk', id: 'room-walk' });
    send({ t: 'place', x: W / 2, facing: dir });
    if (kind === 'walking') {
      if (known.includes('walk') || known.includes('run'))
        send({
          t: 'walk',
          x: dir > 0 ? W - 85 : 85,
          run: false,
          id: 'room-walk',
        });
    } else {
      const word = (words[kind] || words.idle).find((w) => known.includes(w));
      if (word) send({ t: 'do', word });
    }
    lastMode = kind;
    lastDir = dir;
  }
  window.addEventListener(
    'message',
    (event) => {
      if (
        !frame ||
        event.source !== frame.contentWindow ||
        event.origin !== 'null'
      )
        return;
      const m = event.data ?? {};
      if (m.t === 'loaded')
        send({
          t: 'init',
          entry: desc.entry,
          export: desc.export,
          base: desc.base,
          model: desc.model,
          scheme: skin.scheme,
          start: { x: W / 2, facing: 1, enter: false, skin },
          theme: 'light',
          language: ctx.language || 'zh',
          bounds: { W, H, S, floorY },
        });
      if (m.t === 'ready') {
        ready = true;
        waitingFrame = false;
        known = Array.isArray(m.words)
          ? desc.words.filter((w) => m.words.includes(w))
          : desc.words;
        send({ t: 'set', state: { skin, roam: 'off' } });
        status('');
      }
      if (m.t === 'frame') {
        waitingFrame = false;
        const l = m.layout;
        if (!l || !Number.isFinite(l.x) || !l.box) return;
        layout = l;
        if (
          lastMode === 'walking' &&
          ((lastDir > 0 && l.x > W - 115) || (lastDir < 0 && l.x < 115))
        )
          mode('walking', lastDir, true);
      }
      if (m.t === 'error')
        error('当前装扮加载失败：' + String(m.message).slice(0, 120));
    },
    { signal: ctx.signal },
  );
  connect(true);
  ctx.interval(() => {
    if (!document.hidden) connect();
  }, 5000);
  ctx.own({
    dispose() {
      dismiss();
      host.remove();
    },
  });
  return {
    draw(x, y, size, kind, dir, visibleFraction, dt) {
      if (!ready) {
        host.hidden = true;
        bounds = null;
        return;
      }
      mode(kind, dir);
      const now = performance.now();
      if (now >= frameDue && (!waitingFrame || now - lastRequest > 350)) {
        send({
          t: 'tick',
          dt: Math.min(0.1, Math.max(0.014, (now - lastRequest) / 1000 || dt)),
          draw: true,
        });
        lastRequest = now;
        waitingFrame = true;
        frameDue = now + 34;
      }
      const px = size / (256 * S),
        base = layout?.x ?? W / 2,
        ground = layout?.y ?? floorY;
      const b = layout?.box ?? {
        x: W / 2 - 90,
        y: floorY - 165,
        w: 180,
        h: 165,
      };
      const sane =
        [b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w > 0 && b.h > 0;
      if (!sane || visibleFraction <= 0) {
        host.hidden = true;
        bounds = null;
        return;
      }
      host.hidden = false;
      host.style.transform =
        'translate(' + x + 'px,' + y + 'px) scale(' + px + ')';
      frame.style.transform = 'translate(' + -base + 'px,' + -ground + 'px)';
      frame.style.clipPath =
        'inset(0 0 ' +
        Math.max(0, H - ground + (1 - visibleFraction) * b.h) +
        'px 0)';
      bounds = {
        x: x + (b.x - base) * px,
        y: y + (b.y - ground) * px,
        w: b.w * px,
        h: b.h * px * visibleFraction,
      };
    },
    hit(x, y) {
      return (
        !!bounds &&
        x >= bounds.x - 4 &&
        x <= bounds.x + bounds.w + 4 &&
        y >= bounds.y - 4 &&
        y <= bounds.y + bounds.h + 4
      );
    },
    animations: () => (ready ? [...known] : []),
    animate: (word) => {
      if (!ready || !known.includes(word)) return false;
      send({ t: 'do', word });
      return true;
    },
    refresh: () => connect(true),
  };
}
