import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {HomeLife} from '../../src/life.js';

// Only the isolated report fixture gets one crop that was actually sown,
// watered and aged by the real engine. Normal first-launch tests stay empty.
export async function prepareHostGardenReport(deployment){
  const layout=JSON.parse(await readFile(new URL('../../data/home-layout.json',import.meta.url),'utf8'));
  let now=Date.now()-35*60_000;const life=new HomeLife({layout,clock:()=>now});life.settings({autonomy:false});
  for(const actionId of ['sow','water']){
    life.command({itemId:'plot-8',actionId,...(actionId==='sow'?{cropId:'spring-onion'}:{})});now=life.state.current.endsAt+1;life.advance();
  }
  now=Date.now();life.advance(now,{offline:true});assert.equal(life.snapshot().garden.plots[7].stage,'ripe');
  const directory=join(deployment,'data','coo-home');await mkdir(directory,{recursive:true});await writeFile(join(directory,'state.json'),JSON.stringify(life.export()));
}

// A real completion, official event store and main Core model turn. The only
// synthetic component is the registered no-network model provider.
export async function verifyHostChatReport({ provider, invoke, json, origin, feed, original, until }) {
  const privateMarker = 'NEUTRAL_PRIVATE_HOME_HISTORY';
  await provider.plan({ id: 'report-private-history', steps: [{ text: 'Neutral home-only response.' }] });
  await invoke('chatSend', [{ text: privateMarker, clientId: 'report-home-only' }]);
  await until(async () => (await invoke('status')).chat.job?.status === 'done', 'home-only history fixture');
  await invoke('brainSettings', [{ aiEnabled: false, desktopReports: true, dailyReports: 1 }]);
  feed.send(JSON.stringify({ type: 'presence', visible: true }));
  const spoken = '中性测试：家园的一块菜畦已经完成采收。';
  await provider.plan({ id: 'actual-garden-report', match: '家园菜园近况', steps: [
    { calls: [{ id: 'report-desktop-say', name: 'pet_say', args: { script: spoken } }] },
    { text: 'Neutral report delivered without changing the desktop figure.' },
  ] });
  const before = await json(origin, '/api/events?source=coo-home&limit=1000&archive=1');
  assert.equal(before.events.filter(event => event.type === 'coo-home.garden').length, 0);
  const originalIndex = original.values.length;
  await json(origin, '/api/run/resume', {});
  const accepted = await invoke('command', [{ itemId: 'plot-8', actionId: 'harvest' }]);
  const task = accepted.life.current;
  assert.equal(accepted.life.garden.plots.find(plot => plot.id === 'plot-8').stage, 'ripe');
  const completed = await until(async () => {
    const value = await invoke('status');
    return value.life.recent.some(row => row.id === task.id && row.outcome === 'completed') && value;
  }, 'real-time harvest completion', Math.max(30000, task.endsAt - Date.now() + 20000));
  assert.equal(completed.life.garden.plots.find(plot => plot.id === 'plot-8').stage, 'empty');
  const event = await until(async () => {
    const value = await json(origin, '/api/events?source=coo-home&limit=1000&archive=1');
    return value.events.find(event => event.type === 'coo-home.garden');
  }, 'official Core stores home garden report');
  assert.match(event.text, /采收/);
  assert.ok(!JSON.stringify(event).includes(privateMarker));
  assert.match(event.senderKey, /^home-report:/);
  const request = await until(async () => (await provider.audit()).find(row => row.kind === 'request' && row.plan === 'actual-garden-report' && row.index === 0), 'garden report wakes main model');
  assert.ok(!request.sessionId?.startsWith('coo-home/'), 'The report called the private home model instead of the main Core');
  assert.ok(JSON.stringify(request.input).includes('家园菜园近况'));
  assert.ok(!JSON.stringify(request.input).includes(privateMarker), 'Private home chat leaked into the desktop report');
  const said = await until(async () => {
    const value = await json(origin, '/api/events?source=desktop-pet&limit=1000&archive=1');
    return value.events.find(event => event.type === 'desktop-pet.self' && event.meta?.kind === 'say' && event.meta.beats?.some(beat => beat.text === spoken));
  }, 'official desktop speech recorded');
  assert.ok(said);
  assert.ok(original.values.slice(originalIndex).some(message => message.t === 'say'), 'The connected desktop fixture never received its speech bubble');
  assert.ok(!original.values.slice(originalIndex).some(message => ['walk', 'place', 'skin'].includes(message.t)), 'A garden report moved or changed the original desktop figure');
  assert.equal((await invoke('status')).brain.usage.reports, 1);
  const stored = await json(origin, '/api/events?source=coo-home&limit=1000&archive=1');
  assert.equal(stored.events.filter(row => row.senderKey === event.senderKey).length, 1);
  await json(origin, '/api/run/pause', {});
  return { actualHarvestCompleted: true, storedByOfficialCore: true, mainModelAwakened: true,
    desktopSpeechEventRecorded: true, privateHomeHistoryExcluded: true, originalPositionAndSkinUntouched: true,
    senderKey: event.senderKey, taskElapsedMs: task.endsAt - task.startedAt };
}
