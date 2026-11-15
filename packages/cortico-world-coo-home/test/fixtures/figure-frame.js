// Neutral protocol fixture. No installed figure, personal media, or host state is used.
const root = document.getElementById('root');
const pack = new URL(location.href).searchParams.get('pack') || 'fixture-round';
const instance = crypto.randomUUID();
let state = null;
let clock = 0;
let scheme = 'plain';
let word = 'stand';
let ticks = 0;
let events = [];
let walking = null;
const words = ['stand', 'walk', 'sit', ...(pack === 'fixture-rest' ? ['sleep'] : [])];
const post = (value) => parent.postMessage(value, '*');
const trace = (message) => post({ t: 'fixture:trace', instance, pack, message });
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

function geometry() {
  const bounds = state.bounds;
  const height = Math.max(1, 256 * finite(bounds.S, 1));
  return {
    x: finite(state.start.x, bounds.W / 2),
    // Exercise packs whose visible bound extends below their reported feet.
    y: finite(state.start.y, bounds.floorY) + (pack === 'fixture-rest' && ['sit','sleep'].includes(word) ? 14 : 0),
    height: height * (word === 'sleep' ? .33 : word === 'sit' ? .70 : .94),
    width: height * (word === 'sleep' ? .95 : .56),
  };
}

function layout() {
  const p = geometry();
  return {
    x: p.x, y: finite(state.start.y,state.bounds.floorY), facing: state.start.facing === -1 ? -1 : 1,
    mode: word, busy: word === 'sit', moving: word === 'walk', pressing: false,
    cursor: '',
    box: { x: p.x - p.width / 2, y: p.y - p.height, w: p.width, h: p.height },
    hit: [{ x: p.x, y: p.y - p.height / 2, r: p.width / 2 }],
    bubble: { x: p.x, y: p.y - p.height },
    side: { x: p.x + p.width / 2, y: p.y - p.height / 2, reach: 0 },
  };
}

function draw() {
  if (!state) return;
  const p = geometry();
  const b = state.bounds;
  const swing = word === 'walk' ? Math.sin(clock * 8) * p.width * .12 : 0;
  const top = p.y - p.height;
  const radius = p.width * .29;
  const shirt = scheme === 'stripe' ? '#b4e3c9' : '#f2bd68';
  if(word === 'sleep'){
    root.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${b.W} ${b.H}"><g stroke="#26354a" stroke-width="4"><rect x="${p.x-p.width/2}" y="${top+3}" width="${p.width}" height="${p.height-6}" rx="22" fill="${shirt}"/><circle cx="${p.x-p.width/2+p.height/2}" cy="${top+p.height/2}" r="${p.height*.44}" fill="#ef3b9d"/></g></svg>`;
    root.dataset.word=word;root.dataset.scheme=scheme;root.dataset.localX=String(p.x);root.dataset.stride='0';return;
  }
  const head = pack === 'fixture-kite'
    ? `<path d="M ${p.x} ${top} L ${p.x + radius} ${top + radius} L ${p.x} ${top + radius * 2} L ${p.x - radius} ${top + radius} Z" fill="#ef3b9d"/>`
    : `<circle cx="${p.x}" cy="${top + radius}" r="${radius}" fill="#ef3b9d"/>`;
  root.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${b.W} ${b.H}">
    <g stroke="#26354a" stroke-width="${Math.max(1, p.width * .035)}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M ${p.x - p.width * .16} ${p.y - p.height * .28} L ${p.x - p.width * .18 + swing} ${p.y} M ${p.x + p.width * .16} ${p.y - p.height * .28} L ${p.x + p.width * .18 - swing} ${p.y}" fill="none"/>
      <rect x="${p.x - p.width * .33}" y="${top + radius * 1.9}" width="${p.width * .66}" height="${p.height - radius * 1.9 - p.height * .24}" rx="${radius * .2}" fill="${shirt}"/>
      ${head}
      <path d="M ${p.x - radius * .38} ${top + radius * .92} v 1 M ${p.x + radius * .38} ${top + radius * .92} v 1"/>
    </g>
  </svg>`;
  root.dataset.word = word;
  root.dataset.scheme = scheme;
  root.dataset.localX = String(p.x);
  root.dataset.stride = String(swing);
}

function interruptWalk(by) {
  if (!walking) return;
  events.push({ kind: 'interrupted', detail: { walkId: walking.id, by } });
  walking = null;
}

function advanceWalk(dt) {
  if (!walking) return;
  const remaining = walking.x - state.start.x;
  state.start.facing = remaining < 0 ? -1 : 1;
  const step = walking.speed * Math.max(0, Math.min(.1, dt));
  if (Math.abs(remaining) <= step) {
    state.start.x = walking.x;
    events.push({ kind: 'arrived', detail: { walkId: walking.id, x: walking.x, y: state.start.y } });
    trace({ t: 'arrived', id: walking.id, x: walking.x });
    walking = null;
    word = 'stand';
  } else {
    state.start.x += Math.sign(remaining) * step;
  }
}

addEventListener('message', (event) => {
  if (event.source !== parent) return;
  const m = event.data || {};
  try {
    if (m.t === 'init') {
      if (!m.bounds || !['W', 'H', 'floorY', 'S'].every((key) => Number.isFinite(m.bounds[key]))) {
        throw new Error('Fixture init requires finite Figure API 2 bounds');
      }
      state = { bounds: { ...m.bounds }, start: { ...m.start } };
      scheme = String(m.scheme || 'plain');
      trace({ t: 'init', entry: m.entry, export: m.export, scheme, bounds: { ...m.bounds } });
      draw();
      post({ t: 'ready', z: null, words });
    } else if (!state) {
      return;
    } else if (m.t === 'tick') {
      clock += finite(m.dt, 0);
      advanceWalk(finite(m.dt, 0));
      ticks++;
      if (m.draw !== false) draw();
      post({ t: 'frame', layout: layout(), events, sounds: [], z: null });
      events = [];
      if (ticks === 1 || ticks % 60 === 0) trace({ t: 'ticks', count: ticks, word, scheme });
    } else if (m.t === 'do') {
      if (!words.includes(m.word)) throw new Error('Fixture received an unsupported action');
      interruptWalk('action');
      word = m.word;
      trace({ t: 'do', word });
      draw();
    } else if (m.t === 'place') {
      interruptWalk('place');
      state.start.x = finite(m.x, state.start.x);
      state.start.y = finite(m.y, state.start.y);
      state.start.facing = m.facing === -1 ? -1 : 1;
      draw();
    } else if (m.t === 'set') {
      if (m.state?.bounds) state.bounds = { ...m.state.bounds };
      trace({ t: 'set', roam: m.state?.roam === 'off' ? 'off' : undefined });
      draw();
    } else if (m.t === 'scheme') {
      scheme = String(m.id);
      trace({ t: 'scheme', scheme });
      draw();
      post({ t: 'scheme', seq: m.seq, z: null });
    } else if (m.t === 'walk') {
      if (!Number.isFinite(m.x)) throw new Error('Fixture walk requires a finite target');
      interruptWalk('replaced');
      walking = { x: Math.max(0, Math.min(state.bounds.W, m.x)), id: m.id, speed: m.run ? 180 : 100 };
      word = 'walk';
      trace({ t: 'walk', id: m.id, x: walking.x });
      draw();
    } else if (m.t === 'stop-walk') {
      if (walking && m.id !== undefined && walking.id !== m.id) return;
      interruptWalk('stop');
      word = 'stand';
      draw();
    }
  } catch (error) {
    post({ t: 'error', message: error.message });
  }
});
post({ t: 'loaded' });
