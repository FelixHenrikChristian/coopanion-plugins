import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {CooHomeWorld} from '../src/index.js';

class Stream{
  open=true;messages=[];closers=[];input=null;
  send(value){this.messages.push(JSON.parse(value));}
  onMessage(handler){this.input=handler;}
  onClose(handler){this.closers.push(handler);}
  close(){this.open=false;for(const handler of this.closers.splice(0))handler();}
}

test('real World exposes three scoped panels; private environment persists and reaches only home chat and AI',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'coo-home-native-pages-'));let now=1_000_000,world;
  t.after(async()=>{await world?.stop();assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('coo-home-native-pages-'));await rm(directory,{recursive:true,force:true});});
  const requests=[],create=()=>new CooHomeWorld({botDir:directory,dataDir:directory},{clock:()=>now,bridgeFactory:()=>({async start(){},async stop(){},snapshot:()=>({connected:false,descriptor:null})}),modelFactory:()=>({async run(options){requests.push({system:options.system,sessionId:options.sessionId});await options.beforeRespond?.();return{text:'Neutral home response.',records:[],calls:1};},async close(){return true;}})});
  world=create();await world.start();const ui=world.webUi();assert.deepEqual(ui.panels.map(panel=>panel.id),['home','settings','environment']);assert.equal(world.envPromptVars(),null);assert.equal(ui.promptDocs,undefined);
  const home=new Stream(),settings=new Stream(),environment=new Stream();for(const [id,stream] of [['home',home],['settings',settings],['environment',environment]])ui.stream(id,stream);
  assert.equal(world.presence.size,1);assert.equal(settings.input,null);assert.equal(environment.input,null);
  assert.deepEqual(Object.keys(settings.messages[0]).sort(),['brain','life','phase']);assert.deepEqual(Object.keys(environment.messages[0]).sort(),['environment','phase']);
  await assert.rejects(ui.invoke('settings','chatSend',[{text:'not allowed',clientId:'wrong-panel'}]));await assert.rejects(ui.invoke('environment','command',[{itemId:'living.sofa',actionId:'sit'}]));
  const marker='NEUTRAL_HOME_ENVIRONMENT_ONLY';const initial=await ui.invoke('environment','environmentGet',[]);
  await ui.invoke('environment','environmentSave',[{revision:initial.environment.revision,text:marker}]);assert.equal(environment.messages.at(-1).environment.text,marker);
  assert.ok(!JSON.stringify(home.messages).includes(marker));assert.ok(!JSON.stringify(settings.messages).includes(marker));assert.equal(requests.length,0,'Opening or saving the environment must not call a provider');
  await ui.invoke('home','chatSend',[{text:'A neutral home conversation.',clientId:'environment-turn-one'}]);await Promise.all([...world.chat.pending]);assert.equal(world.chat.snapshot().job.status,'done');assert.ok(requests[0].system.includes(marker));
  const second='NEUTRAL_UPDATED_HOME_ENVIRONMENT';await ui.invoke('environment','environmentSave',[{revision:1,text:second}]);
  await ui.invoke('home','chatSend',[{text:'Another neutral home conversation.',clientId:'environment-turn-two'}]);await Promise.all([...world.chat.pending]);assert.ok(requests[1].system.includes(second));assert.ok(!requests[1].system.includes(marker));
  await ui.invoke('settings','settings',[{autonomy:true}]);await ui.invoke('settings','brainSettings',[{aiEnabled:true}]);now+=6000;await world.tick();await Promise.all([...world.brain.pending]);assert.equal(requests.length,3);assert.equal(requests[2].sessionId,'coo-home/autonomy');assert.ok(requests[2].system.includes(second));
  assert.equal(world.envPromptVars(),null);assert.ok(!JSON.stringify(world.tools()).includes(second));
  await world.stop();assert.equal(home.open,false);assert.equal(settings.open,false);assert.equal(environment.open,false);assert.equal(world.clients.size,0);
  world=create();await world.start();const restored=await world.webUi().invoke('environment','environmentGet',[]);assert.equal(restored.environment.text,second);assert.equal(restored.environment.revision,2);
});
