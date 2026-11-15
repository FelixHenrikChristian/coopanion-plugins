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
  const bridges=[];const world=new CooHomeWorld({botDir:'isolated-fixture'}, {bridgeFactory:options=>{const bridge=new Bridge(options);bridges.push(bridge);return bridge;}});
  return{world,bridges};
}

test('foundation declares no AI tools, events, prompt changes or persistent simulation',()=>{
  assert.equal(definition.id,'coo-home');assert.deepEqual(definition.describe,{tools:[],events:[]});
  assert.deepEqual(definition.defaults(),{enabled:false});
  const {world}=fixture();assert.deepEqual(world.tools(),[]);assert.equal(world.envPromptVars(),null);
  assert.equal(world.webUi().panels[0].id,'home');assert.equal(world.status().phase,'foundation');
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
