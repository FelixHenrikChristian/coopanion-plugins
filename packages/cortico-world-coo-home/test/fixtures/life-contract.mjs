import assert from 'node:assert/strict';
import { getNavigationData } from '../../../../scenes/amane-mart/src/navigation-data.js';
import { createNavigationQuery } from '../../../../scenes/amane-mart/src/navigation-query.js';

// Integration checks use the real World, life engine, clock and save store.
// Only time is accelerated; task results are never manufactured by the fixture.
export async function verifyLifeContract(fixture) {
  const layout = getNavigationData();
  const geometry = createNavigationQuery(layout);
  const catalog = fixture.catalog();
  assert.equal(catalog.length, 47);
  assert.equal(catalog.filter(item => item.kind === 'furniture').length, 39);
  assert.equal(catalog.filter(item => item.kind === 'plot').length, 8);
  await fixture.invoke('settings', [{ autonomy: false }]);
  await fixture.invoke('cancel');

  async function after(timestamp) {
    return timestamp > fixture.snapshot().life.now + 50
      ? fixture.advanceTo(timestamp + 5)
      : fixture.advance(55);
  }
  function completed(life, id) {
    return life.recent.some(event => event.id === id && event.outcome === 'completed');
  }
  function checkRoute(route) {
    assert.ok(route.length > 0);
    for (let i = 1; i < route.length; i++) {
      assert.ok(geometry.segmentWalkable(route[i - 1].position, route[i].position), 'A task route crossed an opaque obstacle or left its walking surface');
      assert.ok(route[i].at >= route[i - 1].at);
    }
  }

  let actionCount = 0;
  for (const item of catalog) {
    assert.ok(item.actions.length > 0, `No supported behavior for ${item.id}`);
    for (const action of item.actions) {
      // Garden mutations have ordered stage requirements and are exercised by
      // the garden-cycle integration check, not this navigation inventory loop.
      if (['shop', 'buy', 'sell', 'orderTea', 'consume'].includes(action.canonical)) continue;
      if (item.kind === 'plot' && !['look', 'inspect', 'walk'].includes(action.canonical)) continue;
      const accepted = await fixture.invoke('command', [{ itemId: item.id, actionId: action.id }]);
      const task = accepted.life.current;
      assert.equal(task.itemId, item.id);
      assert.equal(task.source, 'manual');
      assert.ok(!completed(accepted.life, task.id), 'Accepting an action must not complete it');
      checkRoute(task.route);
      const atItem = await after(task.arrivalAt);
      if (task.endsAt - task.arrivalAt > 100) {
        assert.equal(atItem.life.current.id, task.id);
        assert.equal(atItem.life.current.phase, 'acting');
        assert.ok(!completed(atItem.life, task.id), 'Arrival must not complete an ongoing action');
      }
      const finished = await after(task.endsAt);
      assert.ok(completed(finished.life, task.id), `The activity never completed: ${item.id}/${action.id}`);
      assert.equal(finished.life.current, null);
      actionCount++;
    }
  }

  const first = await fixture.invoke('command', [{ itemId: 'study.desk', actionId: 'read' }]);
  const queued = await fixture.invoke('command', [{ itemId: 'living.sofa', actionId: 'sit', enqueue: true }]);
  assert.equal(queued.life.current.id, first.life.current.id);
  assert.equal(queued.life.queue.length, 1);
  const queuedId = queued.life.queue[0].id;
  const replaced = await fixture.invoke('command', [{ itemId: 'living.water', actionId: 'drink' }]);
  assert.ok(replaced.life.recent.some(event => event.id === first.life.current.id && event.outcome === 'superseded'));
  assert.ok(replaced.life.recent.some(event => event.id === queuedId && event.outcome === 'superseded'));
  assert.equal(replaced.life.queue.length, 0);
  await fixture.invoke('pause');
  const frozen = fixture.snapshot().life;
  await fixture.advance(20_000);
  const still = fixture.snapshot().life;
  assert.deepEqual(still.position, frozen.position);
  assert.deepEqual(still.needs, frozen.needs);
  assert.equal(still.current.id, frozen.current.id);
  const duringPause = await fixture.invoke('command', [{ itemId: 'study.desk', actionId: 'read' }]);
  assert.equal(duringPause.life.paused, true);
  await fixture.advance(10_000);
  const resumed = await fixture.invoke('resume');
  assert.ok(Math.abs(resumed.life.current.startedAt - resumed.life.now) < 250, 'A task chosen while paused must start promptly after resuming');
  await fixture.invoke('pause');
  const validId = fixture.snapshot().life.current.id;
  await assert.rejects(fixture.invoke('walk', [{ position: [-50, 0, -50] }]));
  await assert.rejects(fixture.invoke('command', [{ itemId: 'plot-1', actionId: 'not-implemented' }]));
  assert.equal(fixture.snapshot().life.current.id, validId, 'A rejected command must preserve the previous task');
  const cancelled = await fixture.invoke('cancel');
  assert.equal(cancelled.life.current, null);
  assert.ok(cancelled.life.recent.some(event => event.id === validId && event.outcome === 'cancelled'));
  await fixture.invoke('resume');

  await fixture.invoke('settings', [{ autonomy: true }]);
  const autonomous = await fixture.advance(31_000);
  assert.equal(autonomous.life.current?.source, 'autonomous');
  const manual = await fixture.invoke('command', [{ itemId: 'bedroom.bed', actionId: 'sleep' }]);
  assert.equal(manual.life.current.source, 'manual');
  assert.ok(manual.life.recent.some(event => event.id === autonomous.life.current.id && event.outcome === 'superseded'));
  await fixture.invoke('settings', [{ autonomy: false }]);
  const beforeRestart = fixture.snapshot().life;
  const restored = await fixture.restart(2500);
  assert.equal(restored.life.current.id, beforeRestart.current.id);
  assert.equal(restored.life.autonomy, false);
  assert.ok(restored.life.offline.elapsedMs >= 2500);
  const done = await after(restored.life.current.endsAt);
  assert.ok(completed(done.life, beforeRestart.current.id));
  const save = await fixture.readSave();
  const serialized = JSON.stringify(save);
  assert.ok(!/fixture-(?:round|kite)|"(?:skin|scheme|appearance|persona|model|voice)"/.test(serialized), 'Appearance or model data entered the household save');
  const savedUses = done.life.items['bedroom.bed'].uses;
  const again = await fixture.restart(3000);
  assert.equal(again.life.items['bedroom.bed'].uses, savedUses, 'Reloading must not settle a completed action twice');
  assert.equal(again.life.current, null);
  return { furniture: 39, plots: 8, actions: actionCount, routing: 'Every declared action reached its slot without crossing semantic geometry', results: 'Accepted, arrived and completed checked separately', control: 'Queue, pause, resume, cancellation and manual priority', saves: 'Real stop/restart, offline catch-up and idempotent settlement; no figure data' };
}
