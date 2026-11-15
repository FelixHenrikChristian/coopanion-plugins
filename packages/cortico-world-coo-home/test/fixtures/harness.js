import * as panel from '/bundle.js';

// This host exists only in a loopback test page. Its diagnostics are not plugin APIs.
const root = document.getElementById('mount');
const fixture = await fetch('/fixture-config').then((response) => response.json());
const metrics = { mounts: 0, activeFrames: 0, frameCallbacks: 0, activeStreams: 0, invokes: [], messages: [], original: [], roleFrames: [] };
const memory = new Map();
let current = null;
let controller = null;
let owners = [];
let lastCanvas = null;
const original = document.createElement('iframe');
original.setAttribute('sandbox', 'allow-scripts');
original.src = `${fixture.petOrigin}/figure-frame?pack=fixture-original`;
original.style.cssText = 'position:fixed;left:-400px;top:0;width:256px;height:256px;border:0;pointer-events:none';
document.body.append(original);

addEventListener('message', (event) => {
  if (event.data?.t === 'frame' && event.source === document.querySelector('[data-testid="home-figure"]')?.contentWindow) {
    metrics.roleFrames.push({ at: performance.now(), layout: event.data.layout });
    if (metrics.roleFrames.length > 400) metrics.roleFrames.shift();
  }
  if (event.source === original.contentWindow && event.data?.t === 'loaded') {
    original.contentWindow.postMessage({
      t: 'init', entry: `${fixture.petOrigin}/fixture-entry.js`, export: 'createFigure',
      base: `${fixture.petOrigin}/`, scheme: 'plain', model: null,
      start: { x: 128, y: 250, facing: 1 }, bounds: { W: 256, H: 256, floorY: 250, S: .8 },
      theme: 'dark', language: 'en',
    }, '*');
  }
  if (event.data?.t !== 'fixture:trace') return;
  const list = event.source === original.contentWindow ? metrics.original : metrics.messages;
  list.push({ instance: event.data.instance, pack: event.data.pack, ...event.data.message });
  if (list.length > 400) list.splice(0, list.length - 400);
});

function own(resource) {
  owners.push(resource);
  return resource;
}

function frame(fn) {
  let stopped = false;
  let token = 0;
  let previous = performance.now();
  metrics.activeFrames++;
  const handle = own({ dispose() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(token);
    metrics.activeFrames--;
  } });
  function next(stamp) {
    if (stopped) return;
    metrics.frameCallbacks++;
    const dt = stamp - previous;
    previous = stamp;
    if (fn(dt) === false) handle.dispose();
    if (!stopped) token = requestAnimationFrame(next);
  }
  token = requestAnimationFrame(next);
  return handle;
}

function stream(handlers) {
  let closed = false;
  const id = crypto.randomUUID();
  const events = new EventSource(`/events?id=${id}`);
  metrics.activeStreams++;
  events.onopen = () => handlers.open?.();
  events.onmessage = (event) => handlers.message(event.data);
  events.onerror = () => { if (!closed) handlers.close?.(true); };
  return own({
    get open() { return events.readyState === EventSource.OPEN; },
    send(text) { fetch(`/stream-input?id=${id}`, { method: 'POST', body: text, signal: controller.signal }).catch(() => {}); },
    dispose() {
      if (closed) return;
      closed = true;
      events.close();
      metrics.activeStreams--;
      handlers.close?.(false);
    },
  });
}

async function mount() {
  if (current) throw new Error('Unmount the current panel before mounting another');
  controller = new AbortController();
  owners = [];
  const ctx = {
    root, signal: controller.signal, pageId: 'world:coo-home', panelId: 'home', language: 'zh', scope: {},
    own, frame, stream,
    memo: { get(key, fallback) { return memory.has(key) ? memory.get(key) : fallback; }, set(key, value) { memory.set(key, value); } },
    async invoke(method, args = []) {
      metrics.invokes.push({ method, args });
      const response = await fetch('/invoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, args }), signal: controller.signal });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    async invokeBinary(method, args = []) {
      metrics.invokes.push({ method, args, binary: true });
      const response = await fetch('/invoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, args }), signal: controller.signal });
      if (!response.ok) throw new Error(await response.text());
      return response.blob();
    },
    timeout(fn, ms) { const token = setTimeout(fn, ms); return own({ dispose() { clearTimeout(token); } }); },
    interval(fn, ms) { const token = setInterval(fn, ms); return own({ dispose() { clearInterval(token); } }); },
    notifyOnUnmount() {},
  };
  const factory = panel.mount || panel.default?.panels?.home?.mount;
  if (typeof factory !== 'function') throw new Error('Built bundle does not export the home panel mount');
  current = await factory(ctx);
  lastCanvas = root.querySelector('canvas');
  metrics.mounts++;
  return true;
}

async function unmount() {
  if (!current) return;
  controller.abort();
  await current.dispose();
  for (const resource of owners.reverse()) await resource.dispose();
  owners = [];
  current = null;
  root.replaceChildren();
}

window.__homeHarness = {
  mount, unmount, metrics,
  get panel() { return current; },
  get detachedFrames() { return Number(lastCanvas?.dataset.frames || 0); },
};
await mount();
