import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {HomeLife,normalizeLifeState} from '../src/life.js';
import {CROP_MINUTES,applyGardenAction,normalizeGarden} from '../src/garden.js';
import {CooHomeWorld} from '../src/index.js';
const layout=JSON.parse(await readFile(new URL('../data/home-layout.json',import.meta.url),'utf8'));
function fixture(){
  let time=1_000_000;const life=new HomeLife({layout,clock:()=>time});life.settings({autonomy:false});
  return{life,now:()=>time,set:value=>{time=value;},add:value=>{time+=value;},plot:id=>life.snapshot().garden.plots.find(plot=>plot.id===id),
    complete(){const task=life.state.current;time=task.endsAt+1;life.advance();return task;},
    act(id,actionId){life.command({itemId:id,actionId});const task=life.state.current;time=task.endsAt+1;life.advance();return task;}};
}

test('the eight existing crops start mature with the approved 30–90 minute durations',()=>{
  const f=fixture();assert.equal(f.life.state.version,2);
  assert.deepEqual(f.life.snapshot().garden.plots.map(plot=>[plot.id,plot.cropId,plot.durationMs/60_000]),[['plot-1','tomato',75],['plot-2','eggplant',75],['plot-3','cucumber',60],['plot-4','pepper',90],['plot-5','cabbage',60],['plot-6','daikon',45],['plot-7','carrot',45],['plot-8','spring-onion',30]]);
  assert.ok(f.life.snapshot().garden.plots.every(plot=>plot.stage==='ripe'&&plot.growth===1&&plot.harvests===0&&plot.actions.harvest));
  assert.equal(f.life.snapshot().garden.totalHarvests,0);assert.deepEqual(f.life.snapshot().garden.events,[]);
});

test('harvest, sow, first water, growth and harvest form one complete crop cycle',()=>{
  const f=fixture(),id='plot-8';f.act(id,'harvest');assert.equal(f.plot(id).stage,'empty');assert.equal(f.plot(id).harvests,1);
  f.act(id,'sow');assert.equal(f.plot(id).stage,'seeded');assert.equal(f.plot(id).needsFirstWater,true);
  f.add(3*60*60_000);f.life.advance();assert.equal(f.plot(id).stage,'seeded');assert.equal(f.plot(id).growth,0);
  f.act(id,'water');const first=f.plot(id);assert.equal(first.stage,'seedling');assert.equal(first.readyAt-first.growthStartedAt,CROP_MINUTES[first.cropId]*60_000);
  f.set(first.growthStartedAt+first.durationMs/2);f.life.advance();assert.equal(f.plot(id).stage,'growing');assert.ok(Math.abs(f.plot(id).growth-.5)<1e-9);
  f.set(first.readyAt);f.life.advance();assert.equal(f.plot(id).stage,'ripe');assert.equal(f.plot(id).remainingMs,0);
  f.act(id,'harvest');assert.equal(f.plot(id).stage,'empty');assert.equal(f.plot(id).harvests,2);assert.equal(f.life.snapshot().garden.totalHarvests,2);
  assert.deepEqual(f.life.snapshot().garden.events.map(event=>event.id),['garden:plot-8:0:harvest','garden:plot-8:1:ripe','garden:plot-8:1:harvest']);
});

test('later watering refreshes moisture without resetting maturity or requiring repeated care',()=>{
  const f=fixture(),id='plot-1';for(const action of ['harvest','sow','water'])f.act(id,action);
  const readyAt=f.plot(id).readyAt;f.add(20*60_000);f.life.advance();const before=f.plot(id).wetness;
  f.act(id,'water');assert.equal(f.plot(id).readyAt,readyAt);assert.ok(f.plot(id).wetness>before);
  f.set(readyAt+30*24*60*60_000);f.life.advance();assert.equal(f.plot(id).stage,'ripe');assert.equal(f.plot(id).growth,1);assert.equal(f.plot(id).wetness,0);
});

test('queued harvest → sow → water is legal even before the initial harvest completes',()=>{
  const f=fixture(),id='plot-6';f.life.command({itemId:id,actionId:'harvest'});
  f.life.command({itemId:id,actionId:'sow',enqueue:true});f.life.command({itemId:id,actionId:'water',enqueue:true});
  assert.equal(f.life.state.queue.length,2);while(f.life.state.current)f.complete();
  assert.equal(f.plot(id).stage,'seedling');assert.equal(f.plot(id).harvests,1);assert.equal(f.plot(id).cycle,1);
  assert.deepEqual(f.life.state.recent.slice(-3).map(event=>event.outcome),['completed','completed','completed']);
});

test('invalid immediate actions reject; duplicate queued harvesting is cancelled without reward',()=>{
  const f=fixture(),id='plot-1';assert.throws(()=>f.life.command({itemId:id,actionId:'sow'}),/采收/);
  f.life.command({itemId:id,actionId:'harvest'});f.life.command({itemId:id,actionId:'harvest',enqueue:true});
  f.complete();assert.equal(f.life.state.current,null);assert.equal(f.plot(id).harvests,1);assert.equal(f.life.state.items[id].uses,1);
  assert.equal(f.life.state.recent.at(-1).outcome,'cancelled');assert.match(f.life.state.recent.at(-1).reason,/重复采收/);
  assert.throws(()=>f.life.command({itemId:id,actionId:'harvest'}),/重复采收/);assert.throws(()=>f.life.command({itemId:id,actionId:'water'}),/没有播种/);
});

test('garden action completion rechecks the bound cycle and never claims stale work succeeded',()=>{
  const f=fixture(),id='plot-3';f.life.command({itemId:id,actionId:'harvest'});const task=f.life.state.current;
  applyGardenAction(f.life.state.garden,id,'harvest',f.now(),task.gardenCycle);
  f.complete();assert.equal(f.plot(id).harvests,1);assert.equal(f.life.state.items[id].uses,0);assert.equal(f.life.state.recent.at(-1).outcome,'cancelled');
  assert.ok(!f.life.state.recent.some(event=>event.id===task.id&&event.outcome==='completed'));
});

test('pause freezes crops, including a replaced paused task and an offline paused save',()=>{
  const f=fixture(),id='plot-8';for(const action of ['harvest','sow','water'])f.act(id,action);
  f.add(10*60_000);f.life.pause();const growth=f.plot(id).growth,remaining=f.plot(id).remainingMs,wetness=f.plot(id).wetness;
  f.add(2*60*60_000);f.life.advance();assert.equal(f.plot(id).growth,growth);assert.equal(f.plot(id).remainingMs,remaining);assert.equal(f.plot(id).wetness,wetness);
  f.life.command({itemId:'living.sofa',actionId:'sit'});assert.equal(f.plot(id).growth,growth);assert.equal(f.plot(id).remainingMs,remaining);
  const saved=f.life.export();f.add(3*60*60_000);const restored=new HomeLife({layout,state:saved,clock:f.now});restored.advance(f.now(),{offline:true});
  assert.equal(restored.snapshot().garden.plots[7].growth,growth);restored.resume();assert.equal(restored.snapshot().garden.plots[7].remainingMs,remaining);
  f.add(remaining);restored.advance();assert.equal(restored.snapshot().garden.plots[7].stage,'ripe');
});

test('hidden and offline progress produce one maturity event and preserve harvest counts across reloads',()=>{
  const f=fixture(),id='plot-7';for(const action of ['harvest','sow','water'])f.act(id,action);
  f.add(15*60_000);f.life.advance(f.now(),{visible:false});assert.ok(f.plot(id).growth>0);
  const saved=f.life.export();f.set(f.plot(id).readyAt+1000);const restored=new HomeLife({layout,state:saved,clock:f.now});restored.advance(f.now(),{offline:true});
  assert.equal(restored.snapshot().garden.plots[6].stage,'ripe');const events=restored.snapshot().garden.events;assert.equal(events.filter(event=>event.kind==='ripe').length,1);
  const again=new HomeLife({layout,state:restored.export(),clock:f.now});again.advance(f.now(),{offline:true});assert.deepEqual(again.snapshot().garden.events,events);assert.equal(again.snapshot().garden.totalHarvests,1);
});

test('v1 migration preserves furniture work and queue while adding mature crops',()=>{
  const f=fixture();f.life.command({itemId:'living.sofa',actionId:'sit'});f.life.command({itemId:'bedroom.bed',actionId:'sleep',enqueue:true});
  const previous=f.life.export();previous.version=1;delete previous.garden;
  const migrated=normalizeLifeState(previous,layout,f.now());assert.equal(migrated.version,2);
  assert.deepEqual(migrated.position,previous.position);assert.deepEqual(migrated.needs,previous.needs);assert.equal(migrated.current.id,previous.current.id);assert.deepEqual(migrated.current.route,previous.current.route);assert.equal(migrated.queue[0].id,previous.queue[0].id);assert.deepEqual(migrated.items,previous.items);
  assert.ok(migrated.garden.plots.every(plot=>plot.stage==='ripe'));
  const inspect=fixture();inspect.life.command({itemId:'plot-1',actionId:'查看'});const old=inspect.life.export();old.version=1;delete old.garden;const resumed=new HomeLife({layout,state:old,clock:inspect.now});assert.equal(resumed.state.current.actionId,'查看');
});

test('autonomy only waters planted crops, respects indoor needs and has a garden cooldown',()=>{
  const f=fixture();for(const id of ['plot-1','plot-2']){f.act(id,'harvest');f.act(id,'sow');}
  f.life.settings({autonomy:true});f.life.state.needs.energy=5;f.add(20_000);f.life.advance();assert.equal(f.life.state.current.itemId,'bedroom.bed');
  f.life.cancel();Object.assign(f.life.state.needs,{energy:90,hunger:90,hygiene:90,comfort:90});f.add(20_000);f.life.advance();assert.equal(f.life.state.current.source,'autonomous');assert.equal(f.life.state.current.itemId,'plot-1');assert.equal(f.life.definition(f.life.state.current).canonical,'water');
  f.complete();assert.equal(f.plot('plot-1').stage,'seedling');f.add(15_000);f.life.advance();assert.ok(!f.life.state.current.itemId.startsWith('plot-'));
  assert.ok(f.life.snapshot().garden.plots.filter(plot=>plot.cycle===0).every(plot=>plot.stage==='ripe'&&plot.harvests===0));
});

test('garden save validation rejects duplicate crops and strips unrecognized fields',()=>{
  const f=fixture(),raw=f.life.export();raw.garden.privateField='not-household';raw.garden.plots[0].money=999;
  const clean=normalizeGarden(raw.garden,layout);assert.equal(clean.privateField,undefined);assert.equal(clean.plots[0].money,undefined);
  const duplicate=structuredClone(raw.garden);duplicate.plots[1].id=duplicate.plots[0].id;assert.throws(()=>normalizeGarden(duplicate,layout),/Duplicate/);
  const bad=structuredClone(raw.garden);bad.plots[0].cropId='unknown';assert.throws(()=>normalizeGarden(bad,layout),/crop/);
});

test('real World migration saves schema2 and restart keeps the same harvest',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'coo-home-garden-'));t.after(async()=>{assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('coo-home-garden-'));await rm(directory,{recursive:true,force:true});});
  const f=fixture(),legacy=f.life.export();legacy.version=1;delete legacy.garden;await mkdir(join(directory,'coo-home'));await writeFile(join(directory,'coo-home/state.json'),JSON.stringify(legacy));
  const bridgeFactory=()=>({start:async()=>{},stop:async()=>{},snapshot:()=>({connected:false,descriptor:null})});
  const world=new CooHomeWorld({dataDir:directory},{layout,clock:f.now,bridgeFactory});await world.start();
  assert.equal(world.status().life.storage.recovery,'migrated');const task=(await world.webUi().invoke('home','command',[{itemId:'plot-1',actionId:'harvest'}])).life.current;
  f.set(task.endsAt+1);await world.tick();await world.stop();const saved=JSON.parse(await readFile(join(directory,'coo-home/state.json'),'utf8'));assert.equal(saved.version,2);
  const next=new CooHomeWorld({dataDir:directory},{layout,clock:f.now,bridgeFactory});await next.start();assert.equal(next.status().life.garden.totalHarvests,1);assert.equal(next.status().life.garden.plots[0].stage,'empty');await next.stop();
});
