import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {join,dirname,resolve,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {CooHomeWorld} from '../src/index.js';
import {HomeBrain} from '../src/brain.js';
import {HomeStore} from '../src/storage.js';
import {normalizeChat} from '../src/chat.js';
import {normalizeBrain} from '../src/brain.js';

const copy=structuredClone;
function memory(){let saved=null;return{recovery:'new',load:async validate=>saved?validate(saved):null,save:async value=>{saved=copy(value);},read:()=>copy(saved),flush:async()=>{}};}
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};}
async function until(fn){for(let i=0;i<500;i++){const value=fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,2));}throw Error('Fixture did not settle');}
function fixture({run=async()=>({text:'Neutral fixture reply',records:[]}),bridgeStart=async()=>{},chatStorage=memory()}={}){
  let now=Date.UTC(2026,0,2),calls=0,closed=0;const storage=memory(),brainStorage=memory();
  const world=new CooHomeWorld({botDir:'isolated-fixture',timezone:'UTC'},{storage,chatStorage,brainStorage,clock:()=>now,
    modelFactory:()=>({run:async options=>{calls++;return run(options);},close:async()=>{closed++;return true;}}),
    bridgeFactory:()=>({start:bridgeStart,stop:async()=>{},snapshot:()=>({connected:false,descriptor:null})})});
  return{world,storage,chatStorage,brainStorage,setTime:value=>{now=value;},now:()=>now,calls:()=>calls,closed:()=>closed,invoke:(method,...args)=>world.webUi().invoke('home',method,args)};
}

test('chat acknowledgements are durable, duplicate client IDs do not rerun, and history is independent',async()=>{
  const held=deferred();const f=fixture({run:async()=>{await held.promise;return{text:'Neutral result',records:[]};}});await f.world.start();
  const first=await f.invoke('chatSend',{text:'Hello fixture',clientId:'fixture-1'});
  assert.equal(first.phase,'chat');assert.equal(first.chat.job.status,'running');assert.equal(f.chatStorage.read().turns[0].id,first.jobId);
  const duplicate=await f.invoke('chatSend',{text:'Hello fixture',clientId:'fixture-1'});assert.equal(duplicate.jobId,first.jobId);assert.equal(f.calls(),1);
  const before=f.world.life.state.updatedAt;f.setTime(before+2000);await f.world.tick();assert.equal(f.world.life.state.updatedAt,before+2000);
  assert.equal(f.storage.read().turns,undefined);held.resolve();await until(()=>f.world.chat.snapshot().job.status==='done');
  await f.world.stop();await f.world.start();assert.equal(f.world.chat.snapshot().messages.at(-1).text,'Neutral result');assert.equal(f.calls(),1);
  const revision=f.world.chat.snapshot().revision;await f.invoke('chatClear');assert.ok(f.world.chat.snapshot().revision>revision);assert.equal(f.world.chat.snapshot().messages.length,0);
  await f.invoke('chatSend',{text:'Hello fixture',clientId:'fixture-1'});assert.equal(f.calls(),1);await f.world.stop();
});

test('stop waits for the in-flight chat abort and closes the model resource',async()=>{
  const entered=deferred();let aborted=false;
  const f=fixture({run:async({signal})=>{entered.resolve();await new Promise(resolve=>signal.addEventListener('abort',()=>{aborted=true;setTimeout(resolve,15);},{once:true}));return{text:'late reply',records:[]};}});
  await f.world.start();await f.invoke('chatSend',{text:'Wait fixture',clientId:'wait'});await entered.promise;await f.world.stop();
  assert.equal(aborted,true);assert.equal(f.world.chat.pending.size,0);assert.equal(f.world.chat.snapshot().job.status,'cancelled');assert.equal(f.closed(),1);assert.equal(f.world.shutdownVerification()[2].status,'verified-ended');
});

test('start followed by stop while the watcher is opening leaves no timer or live state',async()=>{
  const entered=deferred(),release=deferred();const f=fixture({bridgeStart:async()=>{entered.resolve();await release.promise;}});
  const starting=f.world.start();await entered.promise;const stopping=f.world.stop();release.resolve();await Promise.all([starting,stopping]);
  assert.equal(f.world.started,false);assert.equal(f.world.timer,null);assert.equal(f.world.bridge,null);assert.equal(f.world.chat.started,false);
});

test('a late chat cannot replace a newer manual task, including while its initial save is pending',async()=>{
  const saving=deferred(),release=deferred(),base=memory();let pauseSave=false,toolResult;
  const chatStorage={...base,save:async value=>{if(pauseSave&&value.turns.at(-1)?.status==='running'){pauseSave=false;saving.resolve();await release.promise;}await base.save(value);}};
  const f=fixture({chatStorage,run:async({tools,signal})=>{toolResult=await tools[0].handler({operation:'command',itemId:'living.sofa',actionId:'sit'},{signal,callId:'old-chat-action'});return{text:'The newer request takes priority.',records:[]};}});
  await f.world.start();pauseSave=true;
  const sending=f.invoke('chatSend',{text:'Please sit',clientId:'late-chat'});await saving.promise;
  const manual=await f.invoke('command',{itemId:'study.laptop',actionId:'type'});release.resolve();await sending;await until(()=>f.world.chat.snapshot().job.status==='done');
  assert.equal(toolResult.failed,true);assert.match(JSON.parse(toolResult.text).error,/更新的手动操作/);assert.equal(f.world.life.state.current.id,manual.life.current.id);await f.world.stop();
});

test('a chat can issue its own consecutive commands; desktop tool receipts survive reload without rerunning',async()=>{
  const receipts=[];const f=fixture({run:async({tools,signal})=>{
    receipts.push(await tools[0].handler({operation:'command',itemId:'living.sofa',actionId:'sit'},{signal,callId:'one'}));
    receipts.push(await tools[0].handler({operation:'command',itemId:'study.laptop',actionId:'type',enqueue:true},{signal,callId:'two'}));return{text:'Two tasks queued.',records:[]};
  }});await f.world.start();await f.invoke('chatSend',{text:'Two activities',clientId:'two-tasks'});await until(()=>f.world.chat.snapshot().job.status==='done');
  assert.equal(JSON.parse(receipts[0].text).outcome,'accepted');assert.equal(JSON.parse(receipts[1].text).outcome,'queued');
  const args={operation:'command',itemId:'living.sofa',actionId:'sit'},ctx={role:'fixture-main',round:7,callId:'same-call'};
  const first=JSON.parse((await f.world.tools()[0].handler(args,ctx)).text),counter=f.world.life.state.counter;
  await f.world.stop();await f.world.start();const replay=JSON.parse((await f.world.tools()[0].handler(args,ctx)).text);
  assert.equal(replay.duplicate,true);assert.equal(replay.taskId,first.taskId);assert.equal(f.world.life.state.counter,counter);
  const next=JSON.parse((await f.world.tools()[0].handler(args,{...ctx,round:8})).text);assert.notEqual(next.taskId,first.taskId);
  const controller=new AbortController();controller.abort();const denied=await f.world.tools()[0].handler({operation:'cancel'},{signal:controller.signal});assert.equal(denied.failed,true);assert.equal(f.world.life.state.current.id,next.taskId);await f.world.stop();
});

test('AI request budget is durable per respond, and different plans may reuse a provider call id',async()=>{
  const f=fixture({run:async({beforeRespond,tools,signal})=>{
    await beforeRespond();await tools[0].handler({operation:'command',itemId:'living.sofa',actionId:'sit'},{signal,callId:'call_0'});await beforeRespond();return{text:'Plan accepted',records:[],calls:2};
  }});await f.world.start();await f.invoke('brainSettings',{aiEnabled:true,intervalMinutes:5,dailyCalls:4,desktopReports:false});
  f.setTime(f.now()+6000);await f.world.tick();await until(()=>f.world.brain.job?.status==='done');const first=f.world.life.state.current.id;
  assert.equal(f.world.life.state.current.source,'autonomous');assert.equal(f.world.brain.state.usage.calls,2);assert.equal(f.brainStorage.read().usage.calls,2);
  f.setTime(f.world.brain.state.nextPlanAt+1);await f.world.tick();await until(()=>f.world.brain.job?.status==='done'&&f.world.brain.state.usage.calls===4);assert.notEqual(f.world.life.state.current.id,first);
  f.setTime(f.world.brain.state.nextPlanAt+1);await f.world.tick();await until(()=>f.world.brain.job?.status==='error');assert.equal(f.world.brain.state.usage.calls,4);await f.world.stop();
});

test('reports use a separate wake budget, recover the outbox and do not duplicate an archived report',async()=>{
  let now=Date.UTC(2026,0,2),visible=false,failSave=false;const base=memory(),events=[],sent=[];
  const store={...base,save:async value=>{if(failSave&&value.outbox===null)throw Error('Fixture disk failure');await base.save(value);}};
  const host={pushEvent:async(event,options)=>{sent.push({event,options});},store:{range:async({senderKey})=>sent.filter(value=>value.event.senderKey===senderKey)}};
  const brain=new HomeBrain({store,host,clock:()=>now,context:()=>({garden:{events}}),visible:()=>visible});await brain.start();
  events.push({id:'garden:plot-1:0:harvest',kind:'harvest'});failSave=true;await assert.rejects(brain.report());assert.equal(sent[0].options.trigger,'piggyback');assert.ok(base.read().outbox);
  failSave=false;await brain.report();assert.equal(sent.length,1);assert.equal(brain.state.outbox,null);visible=true;
  await brain.settings({dailyReports:1});now+=15*60_000;events.push({id:'garden:plot-2:0:harvest',kind:'harvest'});await brain.report();assert.equal(sent[1].options.trigger,'debounce');assert.equal(brain.state.usage.reports,1);assert.equal(brain.state.usage.calls,0);
  now+=15*60_000;events.push({id:'garden:plot-3:0:harvest',kind:'harvest'});await brain.report();assert.equal(sent[2].options.trigger,'piggyback');await brain.stop();
});

test('future chat and brain versions block writes and preserve all original files',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'home-chat-save-'));t.after(async()=>{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('home-chat-save-'));await rm(dir,{recursive:true,force:true});});
  await mkdir(join(dir,'coo-home'));
  for(const [name,validator] of [['chat',normalizeChat],['brain',normalizeBrain]]){
    const file=join(dir,'coo-home',`${name}.json`),original=JSON.stringify({version:99,fixture:'preserve'});await writeFile(file,original);const store=new HomeStore(dir,{name});
    await assert.rejects(store.load(validator),error=>error.code==='HOME_SAVE_UNSUPPORTED');await assert.rejects(store.save({version:1}));assert.equal(await readFile(file,'utf8'),original);
  }
});
