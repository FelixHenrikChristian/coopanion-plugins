// Run with the installed host's tsx loader. Everything else is temporary and
// neutral: no real account, application configuration or character is read.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname, basename, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { installFixtureProvider, fixtureConstitution } from './provider-control.mjs';

const app = process.env.COOPANION_APP_ROOT;
if (!app) throw Error('Set COOPANION_APP_ROOT to the installed application source directory.');
const temporary = await mkdtemp(join(tmpdir(), 'coo-home-model-'));
process.env.CORTICO_HOME = join(temporary, 'home');
process.env.CORTICO_EXTENSIONS_DIR = join(temporary, 'extensions');
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('External requests are blocked in the neutral model fixture');
  return originalFetch(input, init);
};
let fixture, presence;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label) { for (let i = 0; i < 300; i++) { const result = await fn(); if (result) return result; await pause(30); } throw Error(`Timed out: ${label}`); }
try {
  await import(pathToFileURL(join(app, 'build/cortico/src/extensions/runtime.ts')).href);
  const provider = await installFixtureProvider({ extensions: process.env.CORTICO_EXTENSIONS_DIR, home: process.env.CORTICO_HOME });
  const module = await import(pathToFileURL(join(process.env.CORTICO_EXTENSIONS_DIR, 'node_modules', provider.moduleName, 'index.mjs')).href);
  const { registerProviderModules } = await import('cortico/providers/registry.ts');
  registerProviderModules([module.default]);
  const { startFixtureServer } = await import('./server.mjs');
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const events = [];
  fixture = await startFixtureServer({ bundlePath: join(packageRoot, 'web/panel.js'), stylePath: join(packageRoot, 'web/panel.css'),
    initialTime: Date.UTC(2030, 0, 1, 8),
    async prepare({ directory }) {
      await writeFile(join(directory, 'config.json'), JSON.stringify({ activeProvider: 'fixture-model', timezone: 'UTC' }));
      await mkdir(join(directory, 'workspace'), { recursive: true });
      await writeFile(join(directory, 'workspace/CONSTITUTION.md'), fixtureConstitution);
    },
    worldHost: {
      store: { range: query => events.filter(row => row.event.source === query.source && row.event.senderKey === query.senderKey) },
      async pushEvent(event, delivery) { events.push({ event: structuredClone(event), delivery: structuredClone(delivery) }); },
    },
  });
  await fixture.invoke('settings', [{ autonomy: false }]);
  await fixture.advance(60 * 60_000);
  assert.equal((await provider.audit()).filter(r => r.kind === 'request').length, 0, 'AI ran while disabled');
  assert.equal(fixture.snapshot().brain.settings.aiEnabled, false);
  await fixture.invoke('settings', [{ autonomy: true }]);
  await provider.plan({ id: 'brain-budget', steps: [
    { calls: [{ id: 'brain-first-call', args: { operation: 'command', itemId: 'study.desk', actionId: 'read' } }] },
    { text: 'One neutral household plan was accepted.' },
  ] });
  await fixture.invoke('brainSettings', [{ aiEnabled: true, intervalMinutes: 5, dailyCalls: 2 }]);
  await fixture.advance(6000);
  await until(() => ['done', 'error'].includes(fixture.snapshot().brain.job?.status), 'bounded AI planning');
  assert.equal(fixture.snapshot().brain.job.status, 'done');
  assert.equal(fixture.snapshot().brain.usage.calls, 2, 'Budget must count actual provider requests, including tool follow-up');
  const planned = fixture.snapshot().life.current;
  assert.equal(planned.itemId, 'study.desk');
  assert.equal(planned.source, 'autonomous');
  await fixture.advance(6 * 60_000);
  await until(() => fixture.snapshot().brain.job?.status !== 'running', 'budget exhaustion');
  assert.equal((await provider.audit()).filter(r => r.kind === 'request' && r.plan === 'brain-budget').length, 2);
  assert.equal(fixture.snapshot().brain.usage.calls, 2);

  await fixture.invoke('cancel');
  await provider.plan({ id: 'brain-preempt', steps: [{ delayMs: 2000, calls: [{ id: 'stale-plan-call', args: { operation: 'command', itemId: 'study.desk', actionId: 'read' } }] }] });
  await fixture.invoke('brainSettings', [{ dailyCalls: 4 }]);
  await fixture.advance(6 * 60_000);
  await until(async () => (await provider.audit()).some(r => r.kind === 'request' && r.plan === 'brain-preempt'), 'pending autonomous model');
  const manual = await fixture.invoke('command', [{ itemId: 'living.water', actionId: 'drink' }]);
  await until(async () => (await provider.audit()).some(r => r.kind === 'cancelled' && r.requestId.startsWith('brain-preempt')), 'manual action cancels pending AI');
  assert.equal(fixture.snapshot().life.current.id, manual.life.current.id);
  assert.equal(fixture.snapshot().life.current.source, 'manual');
  await fixture.invoke('brainSettings', [{ aiEnabled: false, dailyReports: 1, desktopReports: true }]);
  await fixture.invoke('settings', [{ autonomy: false }]);
  await fixture.invoke('cancel');
  const requestCount = (await provider.audit()).filter(r => r.kind === 'request').length;

  async function finish(itemId, actionId, cropId = 'spring-onion') {
    const started = await fixture.invoke('command', [{ itemId, actionId, ...(actionId === 'sow' ? { cropId } : {}) }]);
    await fixture.advanceTo(started.life.current.endsAt + 10);
  }
  await fixture.invoke('brainSettings', [{ desktopReports: false }]);
  for (const id of ['plot-1', 'plot-2', 'plot-3', 'plot-4']) { await finish(id, 'sow'); await finish(id, 'water'); }
  await fixture.advanceTo(Math.max(...fixture.snapshot().life.garden.plots.map(plot => plot.readyAt ?? 0)) + 10);
  await fixture.invoke('brainSettings', [{ desktopReports: true }]);
  await finish('plot-1', 'harvest');
  await until(() => events.length === 1, 'hidden harvest report');
  assert.equal(events[0].delivery.trigger, 'piggyback');
  assert.equal(fixture.snapshot().brain.usage.reports, 0);
  await finish('plot-2', 'harvest');
  await pause(100); assert.equal(events.length, 1, 'Garden reports ignored their cooldown');
  await fixture.advance(16 * 60_000);
  await until(() => events.length === 2, 'cooled-down harvest report');
  assert.equal(events[1].delivery.trigger, 'piggyback');
  presence = new AbortController();
  const stream = await fetch(fixture.hostOrigin + '/events?id=neutral-model-presence', { signal: presence.signal });
  void stream.body.pipeTo(new WritableStream({ write() {} })).catch(() => {});
  await fetch(fixture.hostOrigin + '/stream-input?id=neutral-model-presence', { method: 'POST', body: JSON.stringify({ type: 'presence', visible: true }) });
  await fixture.advance(16 * 60_000);
  await finish('plot-3', 'harvest');
  await until(() => events.length === 3, 'visible active garden report');
  assert.equal(events[2].delivery.trigger, 'debounce');
  assert.equal(fixture.snapshot().brain.usage.reports, 1);
  await fixture.advance(16 * 60_000);
  await finish('plot-4', 'harvest');
  await until(() => events.length === 4, 'report budget fallback');
  assert.equal(events[3].delivery.trigger, 'piggyback');
  assert.equal(fixture.snapshot().brain.usage.reports, 1);
  await finish('plot-1', 'sow'); await finish('plot-1', 'water');
  const first = fixture.snapshot().life.garden.plots.find(p => p.id === 'plot-1');
  await fixture.advanceTo(first.readyAt + 10);
  await until(() => events.length === 5, 'mature garden report');
  assert.match(events.at(-1).event.text, /成熟/);
  assert.equal(new Set(events.map(row => row.event.senderKey)).size, events.length);
  const eventIds = events.flatMap(row => row.event.meta.eventIds);
  assert.equal(new Set(eventIds).size, eventIds.length, 'A garden event was reported twice');
  await fixture.restart(20 * 60_000);
  await pause(150);
  assert.equal(events.length, 5, 'Restart redelivered already reported garden events');
  assert.equal((await provider.audit()).filter(r => r.kind === 'request').length, requestCount, 'Hidden/default-off simulation generated model traffic');
  console.log(JSON.stringify({ checks: { officialProviderRegistry: true, defaultNoAi: true, dailyBudgetCountsResponds: true,
    manualPreemption: true, hiddenReportsPiggyback: true, visibleReportsWake: true, reportWakeBudget: true,
    reportCooldownAndDedup: true, restartReportIdempotence: true }, reportCount: events.length, modelRequests: requestCount }));
} finally {
  presence?.abort(); await fixture?.dispose();
  assert.equal(dirname(resolve(temporary)), resolve(tmpdir())); assert.ok(basename(temporary).startsWith('coo-home-model-'));
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
