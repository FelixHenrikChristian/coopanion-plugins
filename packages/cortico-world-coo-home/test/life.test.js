import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HomeLife,normalizeLifeState} from '../src/life.js';
const layout=JSON.parse(await readFile(new URL('../data/home-layout.json',import.meta.url),'utf8'));
function fixture(state=null){let now=1_000_000;const life=new HomeLife({layout,state,clock:()=>now});return{life,set:value=>{now=value;},add:value=>{now+=value;},now:()=>now};}

test('catalog covers 32 home furniture, 7 shop points and 8 plots with truthful stage boundaries',()=>{
  const {life}=fixture();assert.equal(life.catalog.length,47);assert.equal(life.catalog.filter(i=>i.kind==='furniture').length,39);
  for(const item of life.catalog){assert.ok(item.actions.length);for(const action of item.actions){assert.equal(typeof action.id,'string');assert.ok(action.stance.position.length===3);assert.ok(action.pose.kind);}}
  for(const item of life.catalog.filter(i=>i.kind==='plot'))assert.deepEqual(new Set(item.actions.map(a=>a.canonical)),new Set(['inspect','water','harvest','sow']));
  assert.throws(()=>life.command({itemId:'plot-1',actionId:'sell'}),/暂不支持/);
});

test('every approved action is reachable; arrival is distinct from completion',()=>{
  const f=fixture();f.life.settings({autonomy:false});let count=0;
  for(const item of f.life.catalog)for(const action of item.actions){
    if(item.kind==='plot'&&!['look','inspect','walk'].includes(action.canonical))continue;
    if(['shop','buy','sell','orderTea','consume'].includes(action.canonical))continue;
    const value=f.life.command({itemId:item.id,actionId:action.id}),task=value.current;assert.ok(task.route.length);assert.ok(task.endsAt>task.arrivalAt);
    const before=f.life.state.items[item.id]?.uses??0;
    f.set(task.arrivalAt);const arrived=f.life.advance();assert.equal(arrived.current.phase,'acting');assert.equal(f.life.state.items[item.id]?.uses??0,before);
    assert.ok(!arrived.recent.some(event=>event.id===task.id&&event.outcome==='completed'));
    f.set(task.endsAt);const done=f.life.advance();assert.equal(done.current,null);assert.equal(done.items[item.id].uses,before+1);
    assert.equal(done.recent.at(-1).outcome,'completed');count++;
  }
  assert.equal(count,75);
});

test('manual tasks supersede autonomy and queued manual work preserves order',()=>{
  const f=fixture();f.add(20_000);f.life.advance();assert.equal(f.life.state.current.source,'autonomous');const automatic=f.life.state.current.id;
  const first=f.life.command({itemId:'living.sofa',actionId:'sit'}).current;
  assert.ok(f.life.state.recent.some(event=>event.id===automatic&&event.outcome==='superseded'));
  f.life.command({itemId:'bedroom.bed',actionId:'sleep',enqueue:true});assert.equal(f.life.state.current.id,first.id);assert.equal(f.life.state.queue.length,1);
  f.set(first.endsAt+1);f.life.advance();assert.equal(f.life.state.current.itemId,'bedroom.bed');assert.equal(f.life.state.current.source,'manual');
  f.life.cancel();assert.equal(f.life.state.current,null);assert.equal(f.life.state.queue.length,0);assert.equal(f.life.state.recent.at(-1).outcome,'cancelled');
  f.add(1000);f.life.advance();assert.equal(f.life.state.current,null,'Cancel provides a short quiet interval');
});

test('pause freezes progress and replacing a paused task resumes without extra waiting',()=>{
  const f=fixture();f.life.command({itemId:'bedroom.bed',actionId:'sleep'});f.add(1000);f.life.pause();
  const position=f.life.snapshot().position,phase=f.life.snapshot().current.phase,needs=f.life.snapshot().needs;
  const endsAt=f.life.state.current.endsAt;f.set(endsAt+20_000);f.life.advance();assert.deepEqual(f.life.snapshot().position,position);assert.deepEqual(f.life.snapshot().needs,needs);assert.equal(f.life.snapshot().current.phase,phase);
  f.life.command({itemId:'living.sofa',actionId:'sit'});const duration=f.life.state.current.arrivalAt-f.life.state.current.startedAt;
  f.add(10_000);f.life.resume();assert.equal(f.life.state.current.startedAt,f.now());assert.equal(f.life.state.current.arrivalAt-f.now(),duration);
  f.add(500);f.life.advance();assert.notDeepEqual(f.life.snapshot().position,position);
});

test('background rule activities use prepared graph routes without geometry search',()=>{
  const f=fixture();let prepared=0;const original=f.life.navigation.preparedRoute.bind(f.life.navigation);
  f.life.navigation.preparedRoute=(...args)=>{prepared++;return original(...args);};
  f.life.navigation.route=()=>{throw Error('Detailed navigation must not run in the background');};
  f.life.navigation.visible=()=>{throw Error('Geometry scans must not run in the background');};
  f.add(20*60_000);f.life.advance(f.now(),{visible:false});assert.ok(prepared>3);assert.ok(f.life.state.recent.some(event=>event.outcome==='completed'));
  assert.equal(f.life.snapshot().simulation,'background');
});

test('a cancelled mid-route rest point can resume background activities without geometry scans',()=>{
  const f=fixture();f.life.command({itemId:'bedroom.bed',actionId:'sleep'});f.add(1200);f.life.cancel();
  f.life.navigation.route=()=>{throw Error('Unexpected detailed route');};f.life.navigation.visible=()=>{throw Error('Unexpected geometry scan');};
  f.add(20_000);f.life.advance(f.now(),{visible:false});assert.equal(f.life.state.current.source,'autonomous');
});

test('offline completion is idempotent and very long absences have bounded work',()=>{
  const f=fixture();f.life.settings({autonomy:false});const task=f.life.command({itemId:'living.sofa',actionId:'sit'}).current;
  const saved=f.life.export();f.set(task.endsAt+5_000);
  const restored=new HomeLife({layout,state:saved,clock:f.now});restored.advance(f.now(),{offline:true});assert.equal(restored.state.items['living.sofa'].uses,1);
  restored.advance(f.now(),{offline:true});assert.equal(restored.state.items['living.sofa'].uses,1);
  restored.settings({autonomy:true});const start=performance.now();restored.advance(f.now()+365*24*60*60_000,{offline:true});
  assert.ok(performance.now()-start<1000);assert.equal(restored.offline.approximate,true);assert.ok(restored.offline.completed<=129);
  assert.ok(Object.values(restored.state.needs).every(value=>value>=0&&value<=100));
});

test('paused saves stay paused offline and wall-clock rollback preserves remaining durations',()=>{
  const f=fixture();f.life.command({itemId:'bedroom.bed',actionId:'sleep'});f.add(800);f.life.pause();const saved=f.life.export(),position=f.life.state.position;
  f.add(4*60*60_000);const restored=new HomeLife({layout,state:saved,clock:f.now});restored.advance(f.now(),{offline:true});assert.deepEqual(restored.state.position,position);assert.equal(restored.state.paused,true);
  restored.resume();assert.equal(restored.state.current.endsAt-f.now(),saved.current.endsAt-saved.pausedAt);
  const backwards=normalizeLifeState(saved,layout,saved.updatedAt-300_000);assert.equal(backwards.current.endsAt-backwards.updatedAt,saved.current.endsAt-saved.updatedAt);
});

test('electrical defaults match the scene and toggle changes the saved state once',()=>{
  const f=fixture();for(const id of ['living.tv','study.laptop','bedroom.bedside','genkan.washer'])assert.equal(f.life.state.items[id].on,true,id);
  const task=f.life.command({itemId:'bedroom.bedside',actionId:'toggle'}).current;f.set(task.endsAt);f.life.advance();assert.equal(f.life.state.items['bedroom.bedside'].on,false);
  const restored=new HomeLife({layout,state:f.life.export(),clock:f.now});assert.equal(restored.state.items['bedroom.bedside'].on,false);
});

test('walk validates the floor, ignores client height and rejects blocked/outside destinations',()=>{
  const f=fixture();const value=f.life.walk({position:[.95,999,9.45]});assert.equal(value.current.destination[1],.327);
  assert.throws(()=>f.life.walk({position:[999,0,999]}),/地面/);assert.throws(()=>f.life.walk({position:[0,0,NaN]}),/地面/);
  const bed=layout.items.find(i=>i.id==='bedroom.bed').actions[0].target;assert.throws(()=>f.life.walk({position:bed}),/地面/);
});

test('migration and saves exclude non-household data and reject malformed jobs',()=>{
  const f=fixture();const raw={...f.life.export(),version:0,figure:'private-fixture-sentinel',chat:[{text:'not-household'}],unknown:'not-household'};
  const normalized=normalizeLifeState(raw,layout,f.now());assert.equal(normalized.version,5);assert.ok(!JSON.stringify(normalized).includes('private-fixture-sentinel'));assert.ok(!JSON.stringify(normalized).includes('not-household'));
  f.life.command({itemId:'living.sofa',actionId:'sit'});const bad=f.life.export();bad.current.actionId='unavailable';assert.throws(()=>normalizeLifeState(bad,layout,f.now()),/action/);
  const crossed=f.life.export();crossed.current.route=[{position:layout.spawn,at:1},{position:[999,0,999],at:2}];assert.throws(()=>normalizeLifeState(crossed,layout,f.now()),/walkable/);
});
