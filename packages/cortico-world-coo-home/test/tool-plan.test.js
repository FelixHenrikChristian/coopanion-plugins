import test from 'node:test';
import assert from 'node:assert/strict';
import {CooHomeWorld,DESCRIBE} from '../src/index.js';
import {applyGardenAction} from '../src/garden.js';

const copy=structuredClone;
function memory(){let saved=null;return{load:async normalize=>saved?normalize(copy(saved)):null,save:async value=>{saved=copy(value);},flush:async()=>{},read:()=>copy(saved)};}
function fixture({run=async()=>({text:'Neutral fixture reply',records:[]})}={}){
  let now=Date.UTC(2030,0,1),failSave=false;const base=memory(),storage={...base,save:async value=>{if(failSave)throw Error('Neutral fixture disk failure');await base.save(value);}};
  const world=new CooHomeWorld({botDir:'neutral-fixture',timezone:'UTC'},{storage,chatStorage:memory(),brainStorage:memory(),preferencesStorage:memory(),clock:()=>now,modelFactory:()=>({run,close:async()=>true}),bridgeFactory:()=>({start:async()=>{},stop:async()=>{},snapshot:()=>({connected:false,descriptor:null})})});
  return{world,storage,setFailure:value=>{failSave=value;},setTime:value=>{now=value;},invoke:(method,arg)=>world.webUi().invoke('home',method,arg===undefined?[]:[arg])};
}
const strict=fields=>Object.assign(Object.fromEntries(Object.keys(DESCRIBE.tools[0].parameters.properties).map(key=>[key,null])),fields);
async function tool(f,args,id='neutral-call'){return JSON.parse((await f.world.tools()[0].handler(args,{callId:id,role:'neutral-main',round:1})).text);}
async function done(f){for(let i=0;i<40&&f.world.status().life.current;i++){f.setTime(f.world.status().life.current.endsAt+1);await f.world.tick();}}

test('strict nullable tool slots work for catalog, status and TV; unrelated values still fail closed',async()=>{
  const f=fixture();await f.world.start();
  const schema=DESCRIBE.tools[0].parameters;assert.deepEqual(schema.required,Object.keys(schema.properties));
  const catalog=await tool(f,strict({operation:'catalog'}));assert.equal(catalog.items.length,47);assert.equal(catalog.crops.length,8);
  assert.equal((await tool(f,strict({operation:'status'}))).ok,true);
  const accepted=await tool(f,strict({operation:'command',itemId:'living.tv',actionId:'tv'}),'tv');assert.equal(accepted.accepted,true);assert.equal(f.world.life.state.current.itemId,'living.tv');
  for(const value of [strict({operation:'catalog',itemId:'living.tv'}),{...strict({operation:'status'}),unknown:null},strict({operation:'command',itemId:'living.tv',actionId:'tv',cropId:'carrot'})])assert.equal((await tool(f,value,'bad')).ok,false);
  assert.equal(f.world.life.state.current.id,accepted.taskId);await f.world.stop();
});

test('eight-plot plan durably accepts sixteen ordered actions, survives restart and completes exactly once',async()=>{
  const f=fixture();await f.world.start();await f.invoke('settings',{autonomy:false});
  const args=strict({operation:'gardenPlan',plotIds:Array.from({length:8},(_,i)=>`plot-${i+1}`),cropId:'spring-onion'});
  const receipt=await tool(f,args,'garden');assert.equal(receipt.accepted,true);assert.equal(receipt.taskIds.length,16);assert.equal(receipt.outcome,'accepted');
  assert.equal(receipt.life.plans[0].status,'accepted');assert.equal(receipt.life.plans[0].completed,0);assert.equal(f.storage.read().queue.length,15);
  const counter=f.world.life.state.counter;assert.equal((await tool(f,args,'garden')).duplicate,true);assert.equal(f.world.life.state.counter,counter);
  await f.world.stop();await f.world.start();const replay=await tool(f,args,'garden');assert.equal(replay.duplicate,true);assert.equal(replay.planId,receipt.planId);assert.equal(replay.taskIds.length,16);
  await done(f);const state=f.world.status().life;
  assert.equal(state.plans[0].status,'completed');assert.equal(state.plans[0].completed,16);
  assert.ok(state.garden.plots.every(plot=>plot.cropId==='spring-onion'&&plot.cycle===1&&plot.growthStartedAt!==null));
  assert.ok(state.garden.plots.every(plot=>state.items[plot.id].uses===2));
  const again=await tool(f,args,'garden');assert.equal(again.duplicate,true);assert.equal(f.world.life.state.counter,counter);await f.world.stop();
});

test('occupied plots are skipped, seeded matching crops get water, and a manual command cancels all remaining plan steps',async()=>{
  const f=fixture();await f.world.start();await f.invoke('settings',{autonomy:false});
  await f.invoke('commerce',{kind:'buy',lines:[{itemId:'seed-carrot',quantity:1}],requestId:`${f.world.status().life.now}:mixed-seed`});await done(f);
  await f.invoke('command',{itemId:'plot-1',actionId:'sow',cropId:'carrot'});await done(f);
  await f.invoke('command',{itemId:'plot-2',actionId:'sow',cropId:'spring-onion'});await done(f);
  const result=await tool(f,strict({operation:'gardenPlan',plotIds:['plot-1','plot-2','plot-3'],cropId:'spring-onion'}),'mixed');
  assert.deepEqual(result.skipped,[{itemId:'plot-1',cropId:'carrot',reason:'occupied'}]);assert.equal(result.taskIds.length,3);
  assert.equal(f.world.life.state.current.actionId,'浇水');assert.equal(f.world.status().life.garden.plots[0].cropId,'carrot');
  await f.invoke('command',{itemId:'living.tv',actionId:'tv'});assert.equal(f.world.life.state.queue.length,0);
  const plan=f.world.status().life.plans[0];assert.equal(plan.status,'cancelled');assert.equal(plan.cancelled,3);assert.equal(f.world.status().life.garden.plots[2].stage,'empty');await f.world.stop();
});

test('an already planted plan is a durable no-op and never interrupts unrelated work',async()=>{
  const f=fixture();await f.world.start();await f.invoke('settings',{autonomy:false});
  const args=strict({operation:'gardenPlan',plotIds:['plot-1'],cropId:'spring-onion'});
  await tool(f,args,'initial');await done(f);await f.invoke('command',{itemId:'living.tv',actionId:'tv'});
  const currentId=f.world.life.state.current.id,counter=f.world.life.state.counter;
  const skipped=await tool(f,args,'already-planted');assert.equal(skipped.outcome,'no-op');assert.equal(skipped.accepted,false);assert.equal(skipped.planId,null);assert.equal(skipped.skipped[0].reason,'already-growing');assert.deepEqual(skipped.taskIds,[]);
  assert.equal(f.world.life.state.current.id,currentId);await f.world.stop();await f.world.start();
  const replay=await tool(f,args,'already-planted');assert.equal(replay.duplicate,true);assert.equal(replay.outcome,'no-op');assert.equal(replay.accepted,false);assert.equal(f.world.life.state.counter,counter);await f.world.stop();
});

test('invalid or unsaved plans leave current work intact; stale planned steps cancel their whole remaining plan',async()=>{
  const f=fixture();await f.world.start();await f.invoke('settings',{autonomy:false});
  await f.invoke('commerce',{kind:'buy',lines:[{itemId:'seed-carrot',quantity:2}],requestId:`${f.world.status().life.now}:stale-plan-seeds`});await done(f);
  await f.invoke('command',{itemId:'living.tv',actionId:'tv'});const previous=f.world.life.export();
  for(const patch of [{plotIds:['plot-1','plot-1'],cropId:'carrot'},{plotIds:['plot-9'],cropId:'carrot'},{plotIds:['plot-1'],cropId:'unknown'}])assert.equal((await tool(f,strict({operation:'gardenPlan',...patch}),'invalid')).ok,false);
  const unchanged=()=>{const current=f.world.life.export();assert.equal(current.current.id,previous.current.id);assert.deepEqual(current.current.route,previous.current.route);assert.deepEqual(current.garden,previous.garden);assert.deepEqual(current.queue,previous.queue);assert.equal(current.counter,previous.counter);};unchanged();
  f.setFailure(true);assert.equal((await tool(f,strict({operation:'gardenPlan',plotIds:['plot-1'],cropId:'carrot'}),'save-failure')).ok,false);f.setFailure(false);
  unchanged();
  const accepted=await tool(f,strict({operation:'gardenPlan',plotIds:['plot-1','plot-2'],cropId:'carrot'}),'valid');
  applyGardenAction(f.world.life.state.garden,'plot-1','sow',f.world.life.state.updatedAt,0,'carrot'); // Isolated valid newer-cycle fault.
  f.setTime(f.world.life.state.current.endsAt+1);await f.world.tick();
  assert.equal(f.world.status().life.plans.at(-1).id,accepted.planId);assert.equal(f.world.status().life.plans.at(-1).cancelled,4);assert.equal(f.world.life.state.current,null);assert.equal(f.world.life.state.queue.length,0);await f.world.stop();
});

test('successive actions in one chat append, but a newer mouse action prevents the old chat from adding more',async()=>{
  let release,entered;const wait=new Promise(resolve=>{release=resolve;}),ready=new Promise(resolve=>{entered=resolve;}),receipts=[];
  const f=fixture({run:async({tools})=>{
    receipts.push(JSON.parse((await tools[0].handler(strict({operation:'gardenPlan',plotIds:['plot-1'],cropId:'spring-onion'}),{callId:'plan'})).text));
    receipts.push(JSON.parse((await tools[0].handler(strict({operation:'command',itemId:'living.tv',actionId:'tv',enqueue:false}),{callId:'tv'})).text));
    entered();await wait;
    receipts.push(JSON.parse((await tools[0].handler(strict({operation:'command',itemId:'living.sofa',actionId:'sit'}),{callId:'late'})).text));
    return{text:'Neutral sequence accepted.',records:[]};
  }});await f.world.start();await f.invoke('settings',{autonomy:false});await f.invoke('chatSend',{text:'Neutral garden then TV plan.',clientId:'one-turn'});await ready;
  assert.equal(receipts[0].taskIds.length,2);assert.equal(receipts[1].outcome,'queued');assert.equal(f.world.life.state.queue.length,2);
  await f.invoke('command',{itemId:'study.laptop',actionId:'type'});release();await Promise.all([...f.world.chat.pending]);
  assert.equal(receipts[2].ok,false);assert.equal(f.world.life.state.current.itemId,'study.laptop');assert.equal(f.world.life.state.queue.length,0);assert.equal(f.world.status().life.plans[0].status,'cancelled');await f.world.stop();
});
