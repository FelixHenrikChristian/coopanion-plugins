import test from 'node:test';
import assert from 'node:assert/strict';
import definition,{CooHomeWorld} from '../src/index.js';

class Bridge{
  constructor(options){this.options=options;this.started=0;this.stopped=0;this.value={connected:false,descriptor:null};}
  async start(){this.started++;}
  async stop(){this.stopped++;this.value={connected:false,descriptor:null};this.options.onChange();}
  snapshot(){return structuredClone(this.value);}
  changed(){this.value={connected:true,descriptor:{key:'neutral-fixture-key'}};this.options.onChange();}
}
class Stream{
  open=true;messages=[];listeners=[];
  send(text){this.messages.push(JSON.parse(text));}
  onClose(listener){this.listeners.push(listener);}
  close(){this.open=false;for(const listener of this.listeners.splice(0))listener();}
}
function fixture(){
  const bridges=[];let saved=null,time=1_000_000,failSave=false;
  const storage={recovery:'new',load:async validate=>saved?validate(saved):null,save:async value=>{if(failSave)throw Error('fixture disk failure');saved=structuredClone(value);},flush:async()=>{}};
  const memory=()=>{let value=null;return{load:async validate=>value?validate(value):null,save:async next=>{value=structuredClone(next);}};};
  const world=new CooHomeWorld({botDir:'isolated-fixture'}, {clock:()=>time,storage,chatStorage:memory(),brainStorage:memory(),preferencesStorage:memory(),bridgeFactory:options=>{const bridge=new Bridge(options);bridges.push(bridge);return bridge;}});
  return{world,bridges,storage,setTime:value=>{time=value;},setFailure:value=>{failSave=value;},saved:()=>saved};
}

test('home declares its limited tool and garden reports without changing persona prompts',()=>{
  assert.equal(definition.id,'coo-home');assert.equal(definition.describe.tools[0].name,'coo_home');assert.equal(definition.describe.events[0].type,'coo-home.garden');
  assert.equal(definition.defaults().enabled,false);assert.equal(definition.defaults().aiEnabled,false);
  const {world}=fixture();assert.equal(world.tools()[0].name,'coo_home');assert.deepEqual(Object.keys(world.envPromptVars()),['home.activity','home.needs','home.garden','home.inventory']);
  assert.equal(world.webUi().panels[0].id,'home');assert.equal(world.status().phase,'life');
  assert.equal(world.status().appearance.connected,false);
});

test('start and stop are idempotent; reenable creates a fresh watcher',async()=>{
  const {world,bridges}=fixture();await Promise.all([world.start(),world.start()]);assert.equal(bridges.length,1);assert.equal(bridges[0].started,1);
  assert.equal(world.shutdownVerification()[0].status,'still-live');
  await Promise.all([world.stop(),world.stop()]);assert.equal(bridges[0].stopped,1);assert.equal(world.shutdownVerification()[0].status,'verified-ended');
  await world.start();assert.equal(bridges.length,2);assert.equal(bridges[1].started,1);await world.stop();
});

test('status and stream share the same schema; stop releases all clients',async()=>{
  const {world,bridges}=fixture();await world.start();const ui=world.webUi();const stream=new Stream();ui.stream('home',stream);
  assert.deepEqual(stream.messages[0],await ui.invoke('home','status',[]));
  bridges[0].changed();assert.equal(stream.messages.at(-1).appearance.connected,true);
  const copy=await ui.invoke('home','status',[]);copy.appearance.descriptor.key='changed';assert.equal(world.status().appearance.descriptor.key,'neutral-fixture-key');
  await world.stop();assert.equal(stream.open,false);assert.equal(world.clients.size,0);assert.equal(stream.listeners.length,0);assert.equal(stream.messages.at(-1).appearance.connected,false);
});

test('closed clients are removed; unknown panel and method cannot invoke any other action',async()=>{
  const {world}=fixture();const before=new Stream();world.webUi().stream('home',before);assert.equal(before.open,false);
  await world.start();const ui=world.webUi();const stream=new Stream();ui.stream('home',stream);stream.close();assert.equal(world.clients.size,0);
  const bad=new Stream();ui.stream('other',bad);assert.equal(bad.open,false);
  for(const args of [['other','status',[]],['home','move',[]],['home','status',[{}]],['home','status',null]])await assert.rejects(ui.invoke(...args),/Unsupported/);
  await world.stop();
});

test('one broken stream cannot break watcher updates or healthy clients',async()=>{
  const {world,bridges}=fixture();await world.start();const broken=new Stream(),healthy=new Stream();const ui=world.webUi();ui.stream('home',broken);ui.stream('home',healthy);
  broken.send=()=>{throw Error('closed transport');};bridges[0].changed();assert.equal(healthy.messages.at(-1).appearance.connected,true);assert.equal(world.clients.size,1);await world.stop();
});

test('lifecycle never calls desktop control, model, logging or event host methods',async()=>{
  const {world,bridges}=fixture();const host=new Proxy({},{get(){throw Error('Unexpected host access');}});
  await world.start(host);bridges[0].changed();await world.webUi().invoke('home','status',[]);await world.stop();
});

test('life-only streams omit figure models and use per-connection visibility',async()=>{
  const f=fixture();await f.world.start();const stream=new Stream();stream.onMessage=handler=>{stream.receive=handler;};f.world.webUi().stream('home',stream);
  stream.receive(JSON.stringify({type:'presence',visible:true}));f.setTime(1_001_000);await f.world.tick();
  assert.equal(stream.messages.at(-1).appearance,undefined);assert.equal(stream.messages.at(-1).life.simulation,'visible');
  stream.close();assert.equal(f.world.presence.size,0);await f.world.stop();
});

test('save failures are broadcast, commands roll back, and retry can recover',async()=>{
  const f=fixture();await f.world.start();const stream=new Stream();f.world.webUi().stream('home',stream);
  const before=f.world.life.export();f.setFailure(true);
  await assert.rejects(f.world.webUi().invoke('home','command',[{itemId:'living.sofa',actionId:'sit'}]),/保存/);
  assert.equal(f.world.life.state.current,null);assert.equal(f.world.life.state.counter,before.counter);assert.equal(stream.messages.at(-1).life.storage.ok,false);
  f.setTime(1_006_000);await assert.rejects(f.world.tick(),/保存/);assert.equal(stream.messages.at(-1).life.storage.ok,false);
  f.setFailure(false);await f.world.tick();assert.equal(stream.messages.at(-1).life.storage.ok,true);await f.world.stop();
});

test('world command is durable before returning and restart restores progress',async()=>{
  const f=fixture();await f.world.start();const first=await f.world.webUi().invoke('home','command',[{itemId:'living.sofa',actionId:'sit'}]);
  assert.equal(f.saved().current.id,first.life.current.id);f.setTime(first.life.current.arrivalAt+1000);await f.world.tick();const position=f.world.status().life.position;
  await f.world.stop();await f.world.start();assert.deepEqual(f.world.status().life.position,position);assert.equal(f.world.status().life.current.phase,'acting');await f.world.stop();
});
