import { test } from 'node:test';
import assert from 'node:assert/strict';
import { furniture, route, distance, walkable } from '../src/layout.js';
import {
  fresh,
  tick,
  issue,
  setOption,
  plantStage,
  crops,
  position,
} from '../src/life.js';
import definition from '../world.js';
const t0 = Date.UTC(2026, 0, 1, 9);
const paused = () => setOption(fresh(t0), 'auto', false, t0);
function complete(s, target, at = t0) {
  const a = issue(s, { target }, '你', at);
  return tick(a, a.trip.end);
}
test('every pair of stations connects through unblocked doorways', () => {
  for (const [i, a] of Object.values(furniture).entries())
    for (const b of Object.values(furniture).slice(i + 1)) {
      const p = route(a.point, b.point);
      assert.deepEqual(p[0], a.point);
      assert.deepEqual(p.at(-1), b.point);
      for (let j = 1; j < p.length; j++) {
        const prev = p[j - 1],
          next = p[j],
          n = Math.max(1, Math.ceil(distance(prev, next) / 0.06));
        for (let k = 0; k <= n; k++)
          assert.ok(
            walkable(prev.map((v, axis) => v + ((next[axis] - v) * k) / n)),
          );
      }
    }
});
test('abandoned cooking gives no food; saved journeys resume and settle exactly once', () => {
  const s = paused(),
    cooking = issue(s, { target: 'stove' }, 'Coo', t0);
  const mid = t0 + (cooking.trip.arrive - t0) * 0.5;
  const other = issue(cooking, { target: 'bed' }, '你', mid);
  assert.deepEqual(other.trip.path[0], position(cooking, mid));
  assert.equal(complete(other, 'sink', mid).meals, 1);
  const resumed = tick(JSON.parse(JSON.stringify(cooking)), cooking.trip.end);
  assert.equal(resumed.meals, 2);
  assert.equal(tick(resumed, cooking.trip.end + 1000).meals, 2);
  const eaten = complete(resumed, 'table', cooking.trip.end);
  assert.equal(eaten.meals, 1);
  assert.ok(eaten.fullness > resumed.fullness);
});
test('soil, crop, kitchen and shop inventories balance', () => {
  let s = paused();
  s = complete(s, 'seeds');
  assert.equal(s.seeds, 7);
  assert.equal(s.coins, 420);
  s = setOption(s, 'seed', 'tomato', t0);
  s = complete(s, 'plot0');
  assert.equal(s.seeds, 6);
  assert.equal(plantStage(s.plots[0], t0), 'dry');
  s = complete(s, 'plot0', t0 + 20000);
  const ripe = s.plots[0].watered + crops.tomato.ms;
  assert.throws(() => issue(s, { target: 'plot0' }, '你', ripe - 1), /长大/);
  s = complete(s, 'plot0', ripe);
  assert.equal(s.vegetables, 1);
  s = complete(s, 'sell', ripe + 10000);
  assert.equal(s.coins, 475);
  assert.equal(s.vegetables, 0);
  const broke = { ...s, coins: 0 };
  assert.throws(() => issue(broke, { target: 'market' }, '你', ripe), /零钱/);
});
test('completed wash can be hung on the balcony; hand carrying starts at furniture', () => {
  let s = paused();
  assert.throws(() => issue(s, { target: 'rack' }, '你', t0), /先在洗衣室/);
  s = complete(s, 'washer');
  assert.equal(s.laundry, '待晾');
  s = complete(s, 'rack');
  assert.equal(s.laundry, '已晾');
  const a = issue(s, { target: 'tv', carry: true }, '你', t0);
  assert.equal(a.trip.arrive, t0);
  assert.deepEqual(position(a, t0), furniture.tv.point);
  assert.equal(tick(a, t0).tvOn, true);
  assert.equal(setOption(a, 'tvOn', false, t0).trip, null);
});
test('autonomy travels, watches TV, honours hunger and defers to manual requests', () => {
  let s = fresh(t0);
  const choices = new Set();
  for (let i = 0; i < 12; i++) {
    s = tick(s, s.next + 1);
    assert.ok(s.trip);
    choices.add(s.trip.action);
    s = tick(s, s.trip.end);
  }
  assert.ok(choices.has('stroll'));
  assert.ok(choices.has('tv'));
  s = tick({ ...s, fullness: 10, meals: 0 }, s.next + 1);
  assert.equal(s.trip.action, 'stove');
  s = issue(s, { target: 'desk' }, '你', s.trip.start + 100);
  assert.equal(s.trip.who, '你');
  s = tick(s, s.trip.end);
  assert.ok(s.pages);
  assert.equal(tick(s, s.next - 1).trip, null);
});
test('room chat separates host tools and visitors, preserves text and emits a real event', async () => {
  const cfg = definition.defaults(),
    events = [];
  const w = definition.create({
    cfg,
    persist: (patch) => Object.assign(cfg, patch),
  });
  await w.start({ pushEvent: async (e, o) => events.push([e, o]) });
  try {
    const panel = w.webUi();
    assert.deepEqual(
      panel.panels.map((p) => p.id),
      ['room'],
    );
    await panel.invoke('room', 'chat', ['你好']);
    assert.equal(events[0][0].type, 'coo-home.chat');
    assert.equal(events[0][1].trigger, 'debounce');
    await w
      .tools()
      .find((t) => t.name === 'coo_home_say')
      .handler({ text: '我在客厅。' });
    assert.deepEqual(
      cfg.life.chat.map((m) => m.who),
      ['你', 'Coo'],
    );
    await assert.rejects(panel.invoke('room', 'chat', [' ']));
    await w
      .tools()
      .find((t) => t.name === 'coo_home_visit')
      .handler({ target: 'table' });
    assert.equal(cfg.life.trip.who, 'Coo');
  } finally {
    await w.stop();
  }
});
