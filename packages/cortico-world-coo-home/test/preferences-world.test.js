import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {CooHomeWorld} from '../src/index.js';
import {HOME_DEFAULTS,HOME_SETTING_KEYS,migrateHomeConfig} from '../src/native-config.js';

async function fixture(t){
  const directory=await mkdtemp(join(tmpdir(),'coo-home-native-pages-'));let now=1_000_000,world;
  t.after(async()=>{await world?.stop();assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('coo-home-native-pages-'));await rm(directory,{recursive:true,force:true});});
  const configPath=join(directory,'config.json'),cfg={...HOME_DEFAULTS,enabled:true};await writeFile(configPath,JSON.stringify({worlds:{'coo-home':{enabled:true}}}));
  const requests=[],ctx={botDir:directory,dataDir:directory,cfg,persist:async patch=>{const config=JSON.parse(await readFile(configPath,'utf8'));Object.assign(cfg,patch);Object.assign(config.worlds['coo-home'],patch);await writeFile(configPath,JSON.stringify(config));}};
  const create=()=>world=new CooHomeWorld(ctx,{clock:()=>now,bridgeFactory:()=>({async start(){},async stop(){},snapshot:()=>({connected:false,descriptor:null})}),modelFactory:()=>({async run(options){requests.push({system:options.system,sessionId:options.sessionId});await options.beforeRespond?.();return{text:'Neutral home response.',records:[],calls:1};},async close(){return true;}})});
  return{directory,ctx,requests,create,advance:ms=>now+=ms};
}

test('real World declares native config and a role-free prompt; only independent chat and AI consume its template',async t=>{
  const f=await fixture(t),world=f.create();await world.start();const ui=world.webUi();assert.deepEqual(ui.panels.map(panel=>panel.id),['home']);assert.equal(ui.config[0].owner,'world:coo-home');
  assert.deepEqual(Object.keys(ui.config[0].schema.properties).sort(),HOME_SETTING_KEYS.map(key=>`worlds.coo-home.${key}`).sort());assert.equal(ui.promptDocs[0].role,undefined);
  await assert.rejects(ui.invoke('settings','status',[]));await assert.rejects(ui.invoke('environment','environmentGet',[]));
  const marker='NEUTRAL_HOME_ENVIRONMENT_ONLY';await writeFile(ui.promptDocs[0].deploymentPath,marker+'\n{{home.needs}}');assert.equal(f.requests.length,0);
  await ui.invoke('home','chatSend',[{text:'A neutral home conversation.',clientId:'native-environment-one'}]);await Promise.all([...world.chat.pending]);assert.equal(world.chat.snapshot().job.status,'done');assert.ok(f.requests[0].system.includes(marker));assert.ok(f.requests[0].system.includes('精力'));assert.ok(!f.requests[0].system.includes('{{home.needs}}'));
  assert.ok(!JSON.stringify(world.status()).includes(marker));assert.ok(!JSON.stringify(world.envPromptVars()).includes(marker));assert.ok(!JSON.stringify(world.tools()).includes(marker));
  await f.ctx.persist({autonomy:true,aiEnabled:true});await world.tick();f.advance(6000);await world.tick();await Promise.all([...world.brain.pending]);assert.equal(f.requests.at(-1).sessionId,'coo-home/autonomy');assert.ok(f.requests.at(-1).system.includes(marker));
  await world.stop();const reopened=f.create();await reopened.start();assert.ok(reopened.chatSystem().includes(marker));assert.equal(reopened.brain.state.settings.aiEnabled,true);
});

test('native hot configuration and home shortcuts share one host-owned setting source',async t=>{
  const f=await fixture(t),world=f.create();await world.start();assert.equal(f.ctx.cfg.configVersion,1);
  await f.ctx.persist({autonomy:false,aiEnabled:false,dailyCalls:3,dailyReports:1,intervalMinutes:15});await world.tick();assert.equal(world.life.state.autonomy,false);assert.equal(world.brain.state.settings.dailyCalls,3);
  await world.webUi().invoke('home','settings',[{autonomy:true}]);assert.equal(f.ctx.cfg.autonomy,true);await world.tick();assert.equal(world.life.state.autonomy,true);
  await world.webUi().invoke('home','brainSettings',[{dailyCalls:7}]);assert.equal(f.ctx.cfg.dailyCalls,7);assert.equal(world.brain.state.settings.dailyCalls,7);
  await assert.rejects(world.webUi().invoke('home','settings',[{autonomy:'yes'}]));assert.equal(f.ctx.cfg.autonomy,true);
});

test('migration preserves explicit host settings including default-valued choices',async t=>{
  const f=await fixture(t);await f.ctx.persist({aiEnabled:false,dailyCalls:12});await migrateHomeConfig(f.ctx,{autonomy:false,brain:{aiEnabled:true,intervalMinutes:40,dailyCalls:2,dailyReports:2,desktopReports:false}});
  assert.equal(f.ctx.cfg.aiEnabled,false);assert.equal(f.ctx.cfg.dailyCalls,12);assert.equal(f.ctx.cfg.autonomy,false);assert.equal(f.ctx.cfg.intervalMinutes,40);
});
