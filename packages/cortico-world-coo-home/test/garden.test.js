import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {HomeLife,normalizeLifeState} from '../src/life.js';
import {CROP_MINUTES,CROP_CATALOG,applyGardenAction,normalizeGarden} from '../src/garden.js';
import {CooHomeWorld} from '../src/index.js';
const layout=JSON.parse(await readFile(new URL('../data/home-layout.json',import.meta.url),'utf8'));
function fixture(){
  let time=1_000_000;const life=new HomeLife({layout,clock:()=>time});life.settings({autonomy:false});
  // This suite isolates growth/migration. Real seed purchases are covered by economy.test.js.
  for(const crop of CROP_CATALOG.filter(crop=>!crop.freeSeed))life.state.economy.stock[crop.seedItemId]=100;
  return{life,now:()=>time,set:value=>{time=value;},add:value=>{time+=value;},plot:id=>life.snapshot().garden.plots.find(plot=>plot.id===id),
    complete(){const task=life.state.current;time=task.endsAt+1;life.advance();return task;},
    act(id,actionId,cropId=layout.items.find(item=>item.id===id)?.cropId){life.command({itemId:id,actionId,...(['sow','播种'].includes(actionId)?{cropId}:{})});const task=life.state.current;time=task.endsAt+1;life.advance();return task;},
    ripe(id,cropId){this.act(id,'sow',cropId);this.act(id,'water');time=this.plot(id).readyAt;life.advance();}};
}

test('all eight plots start empty and offer the approved 30–90 minute crop catalog',()=>{
  const f=fixture();assert.equal(f.life.state.version,5);
  assert.deepEqual(f.life.snapshot().garden.crops,CROP_CATALOG);assert.equal(CROP_CATALOG.length,8);
  assert.ok(f.life.snapshot().garden.plots.every(plot=>plot.stage==='empty'&&plot.cropId===null&&plot.growth===0&&plot.harvests===0&&plot.actions.sow&&!plot.actions.harvest&&plot.durationMs===0));
  assert.equal(f.life.snapshot().garden.totalHarvests,0);assert.deepEqual(f.life.snapshot().garden.events,[]);
});

test('harvest, sow, first water, growth and harvest form one complete crop cycle',()=>{
  const f=fixture(),id='plot-8';f.ripe(id);f.act(id,'harvest');assert.equal(f.plot(id).stage,'empty');assert.equal(f.plot(id).harvests,1);
  f.act(id,'sow');assert.equal(f.plot(id).stage,'seeded');assert.equal(f.plot(id).needsFirstWater,true);
  f.add(3*60*60_000);f.life.advance();assert.equal(f.plot(id).stage,'seeded');assert.equal(f.plot(id).growth,0);
  f.act(id,'water');const first=f.plot(id);assert.equal(first.stage,'seedling');assert.equal(first.readyAt-first.growthStartedAt,CROP_MINUTES[first.cropId]*60_000);
  f.set(first.growthStartedAt+first.durationMs/2);f.life.advance();assert.equal(f.plot(id).stage,'growing');assert.ok(Math.abs(f.plot(id).growth-.5)<1e-9);
  f.set(first.readyAt);f.life.advance();assert.equal(f.plot(id).stage,'ripe');assert.equal(f.plot(id).remainingMs,0);
  f.act(id,'harvest');assert.equal(f.plot(id).stage,'empty');assert.equal(f.plot(id).harvests,2);assert.equal(f.life.snapshot().garden.totalHarvests,2);
  assert.deepEqual(f.life.snapshot().garden.events.map(event=>event.id),['garden:plot-8:1:ripe','garden:plot-8:1:harvest','garden:plot-8:2:ripe','garden:plot-8:2:harvest']);
});

test('later watering refreshes moisture without resetting maturity or requiring repeated care',()=>{
  const f=fixture(),id='plot-1';for(const action of ['sow','water'])f.act(id,action);
  const readyAt=f.plot(id).readyAt;f.add(20*60_000);f.life.advance();const before=f.plot(id).wetness;
  f.act(id,'water');assert.equal(f.plot(id).readyAt,readyAt);assert.ok(f.plot(id).wetness>before);
  f.set(readyAt+30*24*60*60_000);f.life.advance();assert.equal(f.plot(id).stage,'ripe');assert.equal(f.plot(id).growth,1);assert.equal(f.plot(id).wetness,0);
});

test('queued harvest → sow → water is legal even before the initial harvest completes',()=>{
  const f=fixture(),id='plot-6';f.ripe(id);f.life.command({itemId:id,actionId:'harvest'});
  f.life.command({itemId:id,actionId:'sow',cropId:'pepper',enqueue:true});f.life.command({itemId:id,actionId:'water',enqueue:true});
  assert.equal(f.life.state.queue.length,2);while(f.life.state.current)f.complete();
  assert.equal(f.plot(id).stage,'seedling');assert.equal(f.plot(id).harvests,1);assert.equal(f.plot(id).cycle,2);assert.equal(f.plot(id).cropId,'pepper');
  assert.deepEqual(f.life.state.recent.slice(-3).map(event=>event.outcome),['completed','completed','completed']);
});

test('invalid immediate actions reject; duplicate queued harvesting is cancelled without reward',()=>{
  const f=fixture(),id='plot-1';assert.throws(()=>f.life.command({itemId:id,actionId:'sow'}),/选择/);f.ripe(id);assert.throws(()=>f.life.command({itemId:id,actionId:'sow',cropId:'carrot'}),/采收/);
  f.life.command({itemId:id,actionId:'harvest'});f.life.command({itemId:id,actionId:'harvest',enqueue:true});
  f.complete();assert.equal(f.life.state.current,null);assert.equal(f.plot(id).harvests,1);assert.equal(f.life.state.items[id].uses,3);
  assert.equal(f.life.state.recent.at(-1).outcome,'cancelled');assert.match(f.life.state.recent.at(-1).reason,/重复采收/);
  assert.throws(()=>f.life.command({itemId:id,actionId:'harvest'}),/重复采收/);assert.throws(()=>f.life.command({itemId:id,actionId:'water'}),/没有播种/);
});

test('garden action completion rechecks the bound cycle and never claims stale work succeeded',()=>{
  const f=fixture(),id='plot-3';f.ripe(id);f.life.command({itemId:id,actionId:'harvest'});const task=f.life.state.current;
  applyGardenAction(f.life.state.garden,id,'harvest',f.now(),task.gardenCycle);
  f.complete();assert.equal(f.plot(id).harvests,1);assert.equal(f.life.state.items[id].uses,2);assert.equal(f.life.state.recent.at(-1).outcome,'cancelled');
  assert.ok(!f.life.state.recent.some(event=>event.id===task.id&&event.outcome==='completed'));
});

test('pause freezes crops, including a replaced paused task and an offline paused save',()=>{
  const f=fixture(),id='plot-8';for(const action of ['sow','water'])f.act(id,action);
  f.add(10*60_000);f.life.pause();const growth=f.plot(id).growth,remaining=f.plot(id).remainingMs,wetness=f.plot(id).wetness;
  f.add(2*60*60_000);f.life.advance();assert.equal(f.plot(id).growth,growth);assert.equal(f.plot(id).remainingMs,remaining);assert.equal(f.plot(id).wetness,wetness);
  f.life.command({itemId:'living.sofa',actionId:'sit'});assert.equal(f.plot(id).growth,growth);assert.equal(f.plot(id).remainingMs,remaining);
  const saved=f.life.export();f.add(3*60*60_000);const restored=new HomeLife({layout,state:saved,clock:f.now});restored.advance(f.now(),{offline:true});
  assert.equal(restored.snapshot().garden.plots[7].growth,growth);restored.resume();assert.equal(restored.snapshot().garden.plots[7].remainingMs,remaining);
  f.add(remaining);restored.advance();assert.equal(restored.snapshot().garden.plots[7].stage,'ripe');
});

test('hidden and offline progress produce one maturity event and preserve harvest counts across reloads',()=>{
  const f=fixture(),id='plot-7';for(const action of ['sow','water'])f.act(id,action);
  f.add(15*60_000);f.life.advance(f.now(),{visible:false});assert.ok(f.plot(id).growth>0);
  const saved=f.life.export();f.set(f.plot(id).readyAt+1000);const restored=new HomeLife({layout,state:saved,clock:f.now});restored.advance(f.now(),{offline:true});
  assert.equal(restored.snapshot().garden.plots[6].stage,'ripe');const events=restored.snapshot().garden.events;assert.equal(events.filter(event=>event.kind==='ripe').length,1);
  const again=new HomeLife({layout,state:restored.export(),clock:f.now});again.advance(f.now(),{offline:true});assert.deepEqual(again.snapshot().garden.events,events);assert.equal(again.snapshot().garden.totalHarvests,0);
});

test('v1 migration preserves furniture work and queue while adding empty plots',()=>{
  const f=fixture();f.life.command({itemId:'living.sofa',actionId:'sit'});f.life.command({itemId:'bedroom.bed',actionId:'sleep',enqueue:true});
  const previous=f.life.export();previous.version=1;delete previous.garden;
  const migrated=normalizeLifeState(previous,layout,f.now());assert.equal(migrated.version,5);
  assert.deepEqual(migrated.position,previous.position);assert.deepEqual(migrated.needs,previous.needs);assert.equal(migrated.current.id,previous.current.id);assert.deepEqual(migrated.current.route,previous.current.route);assert.equal(migrated.queue[0].id,previous.queue[0].id);assert.deepEqual(migrated.items,previous.items);
  assert.ok(migrated.garden.plots.every(plot=>plot.stage==='empty'&&plot.cropId===null));
  const inspect=fixture();inspect.life.command({itemId:'plot-1',actionId:'查看'});const old=inspect.life.export();old.version=1;delete old.garden;const resumed=new HomeLife({layout,state:old,clock:inspect.now});assert.equal(resumed.state.current.actionId,'查看');
});

test('autonomy only waters planted crops, respects indoor needs and has a garden cooldown',()=>{
  const f=fixture();for(const id of ['plot-1','plot-2'])f.act(id,'sow');
  f.life.settings({autonomy:true});f.life.state.needs.energy=5;f.add(20_000);f.life.advance();assert.equal(f.life.state.current.itemId,'bedroom.bed');
  f.life.cancel();Object.assign(f.life.state.needs,{energy:90,hunger:90,hygiene:90,comfort:90});f.add(20_000);f.life.advance();assert.equal(f.life.state.current.source,'autonomous');assert.equal(f.life.state.current.itemId,'plot-1');assert.equal(f.life.definition(f.life.state.current).canonical,'water');
  f.complete();assert.equal(f.plot('plot-1').stage,'seedling');f.add(15_000);f.life.advance();assert.ok(!f.life.state.current.itemId.startsWith('plot-'));
  assert.ok(f.life.snapshot().garden.plots.filter(plot=>plot.cycle===0).every(plot=>plot.stage==='empty'&&plot.harvests===0));
});

test('garden save validation rejects duplicate crops and strips unrecognized fields',()=>{
  const f=fixture(),raw=f.life.export();raw.garden.privateField='not-household';raw.garden.plots[0].money=999;
  const clean=normalizeGarden(raw.garden,layout);assert.equal(clean.privateField,undefined);assert.equal(clean.plots[0].money,undefined);
  const duplicate=structuredClone(raw.garden);duplicate.plots[1].id=duplicate.plots[0].id;assert.throws(()=>normalizeGarden(duplicate,layout),/Duplicate/);
  const bad=structuredClone(raw.garden);bad.plots[0].cropId='unknown';assert.throws(()=>normalizeGarden(bad,layout),/crop/);
});

test('real World migration saves schema5 and restart keeps a selected crop',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'coo-home-garden-'));t.after(async()=>{assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('coo-home-garden-'));await rm(directory,{recursive:true,force:true});});
  const f=fixture(),legacy=f.life.export();legacy.version=1;delete legacy.garden;await mkdir(join(directory,'coo-home'));await writeFile(join(directory,'coo-home/state.json'),JSON.stringify(legacy));
  const bridgeFactory=()=>({start:async()=>{},stop:async()=>{},snapshot:()=>({connected:false,descriptor:null})});
  const world=new CooHomeWorld({dataDir:directory},{layout,clock:f.now,bridgeFactory});await world.start();
  Object.assign(world.life.state.economy.stock,{'seed-carrot':1,'seed-pepper':1});
  assert.equal(world.status().life.storage.recovery,'migrated');
  const accepted=JSON.parse((await world.tools()[0].handler({operation:'command',itemId:'plot-1',actionId:'sow',cropId:'carrot'},{role:'fixture-home',callId:'choose-carrot'})).text);
  assert.equal(accepted.life.current.cropId,'carrot');const task=world.status().life.current;
  const queued=JSON.parse((await world.tools()[0].handler({operation:'command',itemId:'plot-2',actionId:'sow',cropId:'pepper',enqueue:true},{role:'fixture-home',callId:'choose-pepper'})).text);
  assert.equal(queued.life.queue[0].cropId,'pepper');
  const changed=await world.tools()[0].handler({operation:'command',itemId:'plot-1',actionId:'sow',cropId:'pepper'},{role:'fixture-home',callId:'choose-carrot'});assert.equal(changed.failed,true);assert.equal(world.status().life.current.cropId,'carrot');
  f.set(task.endsAt+1);await world.tick();await world.stop();const saved=JSON.parse(await readFile(join(directory,'coo-home/state.json'),'utf8'));assert.equal(saved.version,5);
  const next=new CooHomeWorld({dataDir:directory},{layout,clock:f.now,bridgeFactory});await next.start();assert.equal(next.status().life.garden.totalHarvests,0);assert.equal(next.status().life.garden.plots[0].cropId,'carrot');assert.equal(next.status().life.garden.plots[0].stage,'seeded');await next.stop();
});

test('every plot can grow each of the eight crops, with independent durations and historical crop labels',()=>{
  const f=fixture();
  for(const id of f.life.state.garden.plots.map(plot=>plot.id))for(const crop of CROP_CATALOG){
    f.act(id,'sow',crop.id);assert.equal(f.plot(id).cropId,crop.id);assert.equal(f.plot(id).durationMs,crop.durationMs);
    const saved=f.life.export();const restored=new HomeLife({layout,state:saved,clock:f.now});assert.equal(restored.snapshot().garden.plots.find(plot=>plot.id===id).cropId,crop.id);
    f.act(id,'water');assert.equal(f.plot(id).readyAt-f.plot(id).growthStartedAt,crop.durationMs);
    f.set(f.plot(id).readyAt);f.life.advance();f.act(id,'harvest');assert.equal(f.plot(id).cropId,null);
    assert.equal(f.life.state.garden.events.at(-1).cropId,crop.id);
  }
  assert.equal(f.life.snapshot().garden.totalHarvests,64);
  const again=new HomeLife({layout,state:f.life.export(),clock:f.now});assert.deepEqual(again.state.garden.events,f.life.state.garden.events);
});

test('crop choices are required, durable in queued tasks, and cancelled sowing leaves soil empty',()=>{
  const f=fixture(),id='plot-1';
  for(const cropId of [undefined,null,'unknown'])assert.throws(()=>f.life.command({itemId:id,actionId:'sow',cropId}),/选择/);
  f.life.command({itemId:'living.sofa',actionId:'sit'});f.life.command({itemId:id,actionId:'sow',cropId:'pepper',enqueue:true});
  const restored=new HomeLife({layout,state:f.life.export(),clock:f.now});assert.equal(restored.state.queue[0].cropId,'pepper');
  assert.match(restored.catalog.find(item=>item.id===id).label,/菜畦 1/);
  f.life.cancel();assert.equal(f.plot(id).stage,'empty');assert.equal(f.plot(id).cropId,null);
  f.life.command({itemId:id,actionId:'sow',cropId:'carrot'});f.life.cancel();assert.equal(f.plot(id).stage,'empty');
});

test('v2 migration clears only unplanted display crops and preserves real sowing clocks and harvest totals',()=>{
  const f=fixture();f.act('plot-2','sow');f.act('plot-2','water');const real=f.plot('plot-2');
  const old=f.life.export();old.version=2;
  old.garden.plots=old.garden.plots.map((plot,index)=>plot.id==='plot-2'?{...plot,harvests:1}:{...plot,cropId:layout.items.filter(item=>item.kind==='plot'||item.id.startsWith('plot-'))[index].cropId,stage:'ripe'});
  for(const plot of old.garden.plots)delete plot.legacyHarvests;
  old.garden.plots[0].wateredAt=f.now()-1000; // Care is not evidence of sowing.
  const migrated=normalizeLifeState(old,layout,f.now());
  assert.equal(migrated.version,5);assert.equal(migrated.garden.plots[0].stage,'empty');assert.equal(migrated.garden.plots[0].cropId,null);
  const kept=migrated.garden.plots[1];assert.equal(kept.cropId,'eggplant');assert.equal(kept.readyAt,real.readyAt);assert.equal(kept.growthStartedAt,real.growthStartedAt);assert.equal(kept.harvests,1);assert.equal(kept.cycle,1);assert.equal(kept.legacyHarvests,1);
  assert.equal(migrated.garden.events.length,0);
  const roundtrip=new HomeLife({layout,state:migrated,clock:f.now});assert.deepEqual(roundtrip.state.garden,migrated.garden);
});

test('old queued sowing inherits its former fixed crop and remains executable after migration',()=>{
  const f=fixture();f.ripe('plot-3');f.life.command({itemId:'plot-3',actionId:'harvest'});f.life.command({itemId:'plot-3',actionId:'sow',cropId:'cucumber',enqueue:true});
  const old=f.life.export();old.version=2;delete old.queue[0].cropId;
  old.garden.plots=old.garden.plots.map((plot,index)=>plot.id==='plot-3'?{...plot,harvests:plot.harvests+1}:{...plot,cropId:layout.items.filter(item=>item.id.startsWith('plot-'))[index].cropId,stage:'ripe'});
  for(const plot of old.garden.plots)delete plot.legacyHarvests;
  const restored=new HomeLife({layout,state:old,clock:f.now});assert.equal(restored.state.queue[0].cropId,'cucumber');
  f.set(restored.state.current.endsAt+1);restored.advance();assert.equal(restored.state.current.cropId,'cucumber');
  f.set(restored.state.current.endsAt+1);restored.advance();assert.equal(restored.snapshot().garden.plots[2].stage,'seeded');assert.equal(restored.snapshot().garden.plots[2].cropId,'cucumber');
});
