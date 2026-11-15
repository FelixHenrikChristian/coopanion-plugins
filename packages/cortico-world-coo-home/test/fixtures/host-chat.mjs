import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fixtureConstitution } from './provider-control.mjs';

export async function verifyHostChat({ provider, invoke, json, origin, stream, until, pause, original, configFile }) {
  const marker = 'NEUTRAL_HOME_ONLY_MESSAGE';
  const initial = await invoke('status');
  assert.equal(initial.brain.settings.aiEnabled, false, 'AI planning must be opt-in');
  await invoke('cancel');
  await provider.plan({ id: 'home-dedup', match: marker, steps: [
    { calls: [
      { id: 'same-home-call', args: { operation: 'command', itemId: 'study.desk', actionId: 'read' } },
      { id: 'same-home-call', args: { operation: 'command', itemId: 'study.desk', actionId: 'read' } },
      { id: 'invalid-home-call', args: { operation: 'command', itemId: 'unavailable.fixture', actionId: 'read' } },
    ] }, { text: 'NEUTRAL_HOME_REPLY: 已接受任务，仍待实际完成。' },
  ] });
  const submissions = await Promise.all([0, 1].map(() => invoke('chatSend', [{ text: marker, clientId: 'neutral-duplicate-client' }])));
  assert.equal(submissions[0].jobId, submissions[1].jobId, 'Duplicate client IDs started separate jobs');
  const done = await until(async () => { const s = await invoke('status'); return s.chat.job?.status === 'done' && s; }, 'independent home model completion');
  assert.equal(done.chat.messages.filter(m => m.role === 'user' && m.text === marker).length, 1);
  assert.ok(done.chat.messages.some(m => m.role === 'assistant' && m.text.includes('NEUTRAL_HOME_REPLY')));
  const requests = (await provider.audit()).filter(r => r.kind === 'request' && r.plan === 'home-dedup');
  assert.equal(requests.length, 2, 'Duplicate clients or tools increased the model request count');
  assert.deepEqual(requests[0].nativeSpec, provider.spec());
  assert.equal(requests[0].model, provider.spec().model);
  assert.ok(requests.every(r => r.secretMatched));
  assert.ok(JSON.stringify(requests[0].input).includes(fixtureConstitution));
  assert.deepEqual(requests[0].tools.map(t => t.name), ['coo_home']);
  const results = requests[1].input.filter(item => item.type === 'function_call_output').map(item => ({ id: item.call_id, ...JSON.parse(item.output) }));
  const accepted = results.filter(r => r.id === 'same-home-call');
  assert.equal(accepted.length, 2);
  assert.ok(accepted.every(r => r.ok && r.accepted && r.outcome === 'accepted'));
  assert.equal(accepted[0].taskId, accepted[1].taskId);
  assert.equal(done.life.current.id, accepted[0].taskId);
  assert.ok(!done.life.recent.some(r => r.id === accepted[0].taskId && r.outcome === 'completed'));
  assert.equal(results.find(r => r.id === 'invalid-home-call').ok, false);
  const diagnostics = await json(origin, '/api/diagnostics');
  assert.ok(!JSON.stringify(diagnostics.session).includes(marker), 'Home chat entered the desktop session');
  const events = await json(origin, '/api/events?limit=1000');
  assert.ok(!JSON.stringify(events).includes(marker), 'Home input was emitted as a desktop event');

  await provider.plan({ id: 'home-cancel', steps: [{ text: 'This delayed reply must never be appended.', delayMs: 10000 }] });
  const slow = await invoke('chatSend', [{ text: 'NEUTRAL_SLOW_MESSAGE', clientId: 'neutral-slow-client' }]);
  await until(async () => (await provider.audit()).some(r => r.kind === 'request' && r.plan === 'home-cancel'), 'delayed model entered');
  const started = performance.now(), ticking = await invoke('status');
  assert.ok(performance.now() - started < 1500, 'A model request blocked the household serial queue');
  await pause(1100);
  assert.ok((await invoke('status')).life.now > ticking.life.now);
  await invoke('chatCancel', [{ jobId: slow.jobId }]);
  await until(async () => (await invoke('status')).chat.job?.status === 'cancelled', 'model request cancelled');
  assert.ok(!(await invoke('chatHistory')).chat.messages.some(m => m.text.includes('must never be appended')));
  await invoke('cancel');

  // A second synthetic endpoint exercises module-owned auth state, without a
  // real account, token refresh or external endpoint.
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  await writeFile(configFile, JSON.stringify({ ...config, activeProvider: 'fixture-oauth' }));
  await provider.plan({ id: 'home-oauth', steps: [{ text: 'Neutral second endpoint response.' }] }, 'fixture-oauth');
  await invoke('chatSend', [{ text: 'NEUTRAL_ENDPOINT_SWITCH', clientId: 'neutral-oauth-client' }]);
  await until(async () => (await provider.audit('fixture-oauth')).some(r => r.kind === 'completed'), 'selected endpoint switch');
  await until(async () => (await invoke('status')).chat.job?.status === 'done', 'second endpoint done');
  const oauthRequest = (await provider.audit('fixture-oauth')).find(r => r.kind === 'request');
  assert.deepEqual(oauthRequest.nativeSpec, provider.spec('fixture-oauth'));
  assert.equal(oauthRequest.oauthMatched, true);
  await writeFile(configFile, JSON.stringify(config));

  const desktopMarker = 'NEUTRAL_DESKTOP_HOME_COMMAND';
  await provider.plan({ id: 'desktop-bridge', match: desktopMarker, steps: [
    { calls: [{ id: 'desktop-home-call', args: { operation: 'command', itemId: 'living.sofa', actionId: 'sit' } }] },
    { text: 'Neutral desktop receipt acknowledged.' },
  ] });
  const untouched = original.values.length;
  const desktop = stream(origin.replace('http:', 'ws:') + '/ws/providers/world%3Adesktop-pet/panels/chat');
  await until(() => desktop.readyState === WebSocket.OPEN, 'official desktop chat connection');
  desktop.send(JSON.stringify({ t: 'send', id: 'neutral-desktop-message', text: desktopMarker }));
  await json(origin, '/api/run/resume', {});
  const task = await until(async () => { const s = await invoke('status'); return s.life.current?.itemId === 'living.sofa' && s.life.current; }, 'desktop-to-home official tool dispatch');
  await until(async () => (await provider.audit()).filter(r => r.kind === 'request' && r.plan === 'desktop-bridge' && r.index >= 0).length >= 2, 'desktop received tool result');
  await json(origin, '/api/run/pause', {});
  const desktopRequest = (await provider.audit()).find(r => r.kind === 'request' && r.plan === 'desktop-bridge' && r.index === 1);
  const receipt = desktopRequest.input.findLast(item => item.type === 'function_call_output' && item.call_id === 'desktop-home-call');
  assert.ok(receipt, 'The real Core never returned the household tool receipt to its model');
  const acceptedDesktop = JSON.parse(receipt.output);
  assert.equal(acceptedDesktop.accepted, true); assert.equal(acceptedDesktop.taskId, task.id);
  assert.ok(!(await invoke('chatHistory')).chat.messages.some(m => m.text.includes(desktopMarker)));
  assert.equal(original.readyState, WebSocket.OPEN);
  assert.ok(!original.values.slice(untouched).some(m => ['walk', 'place', 'skin'].includes(m.t)), 'A home tool changed the original desktop figure position or appearance');
  assert.deepEqual(JSON.parse(await readFile(configFile, 'utf8')).worlds['desktop-pet'].skin, config.worlds['desktop-pet'].skin);
  await invoke('cancel'); desktop.close();
  return { provider: 'Official registry, selected model/spec, synthetic key and module-owned OAuth state',
    persona: 'Synthetic Constitution inherited read-only', isolation: 'Home chat absent from desktop history/events; desktop input absent from home chat',
    tools: 'Real desktop chat socket and Core tool loop; accepted receipt without premature completion',
    dedup: 'Duplicate client IDs and call IDs execute once; invalid targets rejected', lifecycle: 'Slow model leaves tick responsive; cancellation prevents late append' };
}
