import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { startFixtureServer } from './server.mjs';

const MINUTES = { 'spring-onion': 30, daikon: 45, carrot: 45, cabbage: 60, cucumber: 60, tomato: 75, eggplant: 75, pepper: 90 };
const plotOf = (state, id) => state.life.garden.plots.find(plot => plot.id === id);

export async function verifyGardenContract(fixture) {
  await fixture.invoke('settings', [{ autonomy: false }]);
  await fixture.invoke('cancel');
  const initial = fixture.snapshot();
  assert.equal(initial.life.version, 3);
  assert.equal(initial.life.garden.plots.length, 8);
  assert.ok(initial.life.garden.plots.every(plot => plot.stage === 'empty' && plot.cropId === null), 'New homes must offer eight empty plots');
  assert.equal(initial.life.garden.crops.length, 8);

  async function after(time) {
    return time > fixture.snapshot().life.now + 100 ? fixture.advanceTo(time + 10) : fixture.advance(110);
  }
  async function act(id, actionId, cropId) {
    const previous = plotOf(fixture.snapshot(), id);
    const accepted = await fixture.invoke('command', [{ itemId: id, actionId, ...(cropId ? { cropId } : {}) }]);
    const task = accepted.life.current;
    assert.equal(plotOf(accepted, id).stage, previous.stage, 'Accepting a gardening task changed the plot immediately');
    assert.ok(!accepted.life.recent.some(event => event.id === task.id && event.outcome === 'completed'));
    const arrived = await after(task.arrivalAt);
    assert.equal(arrived.life.current.id, task.id);
    assert.equal(arrived.life.current.phase, 'acting');
    assert.equal(plotOf(arrived, id).stage, previous.stage, 'Arriving must not settle a gardening action');
    const done = await after(task.endsAt);
    assert.ok(done.life.recent.some(event => event.id === task.id && event.outcome === 'completed'));
    return done;
  }

  const timings = [];
  for (const [index, original] of initial.life.garden.plots.entries()) {
    const id = original.id;
    await assert.rejects(fixture.invoke('command', [{ itemId: id, actionId: 'water' }]));
    await assert.rejects(fixture.invoke('command', [{ itemId: id, actionId: 'harvest' }]));
    const cropId = initial.life.garden.crops[index].id;
    await assert.rejects(fixture.invoke('command', [{ itemId: id, actionId: 'sow' }]));
    const seeded = await act(id, 'sow', cropId);
    assert.equal(plotOf(seeded, id).stage, 'seeded');
    assert.equal(plotOf(seeded, id).cropId, cropId);
    assert.equal(plotOf(seeded, id).needsFirstWater, true);
    await fixture.advance(95 * 60_000);
    assert.equal(plotOf(fixture.snapshot(), id).stage, 'seeded', 'Seeds grew before their first watering');
    const watered = await act(id, 'water');
    const growing = plotOf(watered, id);
    assert.ok(['seedling', 'growing'].includes(growing.stage));
    assert.equal(growing.needsFirstWater, false);
    assert.equal(growing.durationMs, MINUTES[growing.cropId] * 60_000);
    assert.ok(growing.readyAt > watered.life.now);
    const before = await fixture.advanceTo(growing.readyAt - 500);
    assert.notEqual(plotOf(before, id).stage, 'ripe', 'Crop matured before its configured duration');
    const ripe = await fixture.advance(1000);
    assert.equal(plotOf(ripe, id).stage, 'ripe');
    assert.equal(plotOf(ripe, id).growth, 1);
    timings.push({ cropId: growing.cropId, minutes: growing.durationMs / 60_000 });
  }

  const id = initial.life.garden.plots[0].id;
  const countBefore = plotOf(fixture.snapshot(), id).harvests;
  const harvest = await fixture.invoke('command', [{ itemId: id, actionId: 'harvest' }]);
  const duplicate = await fixture.invoke('command', [{ itemId: id, actionId: 'harvest', enqueue: true }]);
  const duplicateId = duplicate.life.queue.at(-1).id;
  const sow = await fixture.invoke('command', [{ itemId: id, actionId: 'sow', cropId: 'pepper', enqueue: true }]);
  const sowId = sow.life.queue.at(-1).id;
  const water = await fixture.invoke('command', [{ itemId: id, actionId: 'water', enqueue: true }]);
  const waterId = water.life.queue.at(-1).id;
  const firstDone = await after(harvest.life.current.endsAt);
  const expired = firstDone.life.recent.find(event => event.id === duplicateId);
  assert.equal(expired?.outcome, 'cancelled');
  assert.ok(expired.reason, 'An expired queued action needs an understandable reason');
  assert.equal(plotOf(firstDone, id).harvests, countBefore + 1, 'A stale harvest was settled twice');
  assert.equal(firstDone.life.current.id, sowId);
  const sowDone = await after(firstDone.life.current.endsAt);
  assert.equal(sowDone.life.current.id, waterId);
  const waterDone = await after(sowDone.life.current.endsAt);
  assert.ok(['seedling', 'growing'].includes(plotOf(waterDone, id).stage));
  assert.equal(plotOf(waterDone, id).cropId, 'pepper');

  await fixture.invoke('pause');
  const frozen = plotOf(fixture.snapshot(), id);
  const paused = await fixture.advance(2 * 60 * 60_000);
  assert.equal(plotOf(paused, id).growth, frozen.growth);
  const pausedReload = await fixture.restart(2 * 60 * 60_000);
  assert.equal(pausedReload.life.paused, true);
  assert.equal(plotOf(pausedReload, id).growth, frozen.growth, 'Paused crops advanced while Coopanion was closed');
  await fixture.invoke('resume');
  const offlineRipe = await fixture.restart(100 * 60_000);
  assert.equal(plotOf(offlineRipe, id).stage, 'ripe');
  assert.equal(plotOf(offlineRipe, id).harvests, countBefore + 1, 'Offline growth must not automatically harvest');
  const afterReload = await fixture.restart(1000);
  assert.equal(afterReload.life.garden.totalHarvests, offlineRipe.life.garden.totalHarvests);
  assert.deepEqual(afterReload.life.garden.events.map(event => event.id), offlineRipe.life.garden.events.map(event => event.id), 'Reload duplicated garden events');

  // A real version-1 file is opened by a fresh World and the real save loader.
  await fixture.invoke('command', [{ itemId: 'study.desk', actionId: 'read' }]);
  await fixture.invoke('command', [{ itemId: 'bedroom.bed', actionId: 'nap', enqueue: true }]);
  await fixture.invoke('pause');
  const source = await fixture.readSave();
  const legacy = { ...source, version: 1 };
  delete legacy.garden;
  const migrated = await startFixtureServer({
    bundlePath: fileURLToPath(new URL('../../web/panel.js', import.meta.url)),
    stylePath: fileURLToPath(new URL('../../src/panel.css', import.meta.url)),
    initialSave: legacy, initialTime: source.updatedAt + 25,
  });
  try {
    const state = migrated.snapshot().life;
    assert.equal(state.version, 3);
    assert.equal(state.storage.recovery, 'migrated');
    assert.equal(state.current.id, source.current.id);
    assert.deepEqual(state.queue.map(task => task.id), source.queue.map(task => task.id));
    assert.deepEqual(state.items, source.items);
    assert.equal(state.paused, true);
    assert.ok(state.garden.plots.every(plot => plot.stage === 'empty' && plot.cropId === null));
    assert.equal((await migrated.readSave()).version, 3);
  } finally { await migrated.dispose(); }
  await fixture.invoke('cancel');
  await fixture.invoke('resume');
  return { plots: 8, timings, cycle: 'Empty plots, selected crops, first watering and ripening; changes occur only when tasks finish', queue: 'Stale duplicate harvest cancelled; harvest/replant-different-crop/water chain completed', persistence: 'Version-1 furniture task and queue preserved with empty plots, paused growth frozen across restart, offline ripening idempotent' };
}
