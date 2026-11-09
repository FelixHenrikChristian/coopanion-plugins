import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import syncFs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import atomic from '../src/atomic-json.cjs';
import definition,{CaptureGuardWorld} from '../src/index.js';

async function temp(t,beforeCleanup=async()=>{}){
 const prefix=join(tmpdir(),'capture-guard-atomic-'),dir=await fs.mkdtemp(prefix);
 t.after(async()=>{await beforeCleanup();assert(resolve(dir).startsWith(resolve(prefix)));await fs.rm(dir,{recursive:true,force:true});});
 return dir;
}
const busy=()=>Object.assign(new Error('EPERM: destination briefly in use'),{code:'EPERM'});

test('sharing failures retry while readers keep the previous valid JSON',async t=>{
 const dir=await temp(t),file=join(dir,'control.json');await fs.writeFile(file,JSON.stringify({value:'old'}));let calls=0;
 await atomic.writeJson(file,{value:'new'},{retryDelays:[1,1,1],rename:async(from,to)=>{
  if(calls++<3){assert.deepEqual(JSON.parse(await fs.readFile(to,'utf8')),{value:'old'});throw busy();}
  return fs.rename(from,to);
 }});
 assert.equal(calls,4);assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),{value:'new'});
 assert.deepEqual(await fs.readdir(dir),['control.json']);
});

test('persistent or non-sharing failures preserve the previous file and original error',async t=>{
 const dir=await temp(t),file=join(dir,'control.json');await fs.writeFile(file,'{"value":"old"}');
 const error=busy();let attempts=0;
 await assert.rejects(atomic.writeJson(file,{value:'new'},{retryDelays:[1,1],rename:async()=>{attempts++;throw error;}}),e=>e===error);
 assert.equal(attempts,3);assert.equal(await fs.readFile(file,'utf8'),'{"value":"old"}');
 let calls=0;await assert.rejects(atomic.writeJson(file,{}, {retryDelays:[1,1],rename:async()=>{calls++;throw Object.assign(new Error('invalid'),{code:'EINVAL'});}}),{code:'EINVAL'});
 assert.equal(calls,1);assert.deepEqual(await fs.readdir(dir),['control.json']);
});

test('synchronous setup writes retry without discarding the existing destination',async t=>{
 const dir=await temp(t),file=join(dir,'host.json');await fs.writeFile(file,'{"value":"old"}');let calls=0;
 atomic.writeJsonSync(file,{value:'new'},{retryDelays:[0,0],delay:()=>{},rename:(from,to)=>{if(calls++<2){assert.equal(syncFs.readFileSync(to,'utf8'),'{"value":"old"}');throw busy();}syncFs.renameSync(from,to);}});
 assert.equal(calls,3);assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),{value:'new'});
});

test('status writes are serialized and the final stopped snapshot wins',async()=>{
 let release,started;const writing=new Promise(r=>{started=r;}),gate=new Promise(r=>{release=r;});const written=[];let running=0,maxRunning=0;
 const publisher=atomic.createLatestWriter('fixture.json',{write:async(_file,value)=>{running++;maxRunning=Math.max(maxRunning,running);written.push(value);if(written.length===1){started();await gate;}running--;}});
 publisher.publish({running:true,sequence:1});await writing;
 publisher.publish({running:true,sequence:2});publisher.publish({running:false,sequence:3});release();await publisher.flush();
 assert.equal(maxRunning,1);assert.deepEqual(written,[{running:true,sequence:1},{running:false,sequence:3}]);
});

async function worldFixture(t){
 let world;
 const dir=await temp(t,async()=>{if(world){world.writeControl=atomic.writeJson;await world.stop();}}),cfg=definition.defaults();
 world=new CaptureGuardWorld({cfg,persist:p=>Object.assign(cfg,p)});
 world.runtime={control:join(dir,'control.json'),status:join(dir,'status.json'),command:'capture-guard-atomic-fixture',original:process.env.CORTICO_DESKTOP_PET_HOST};
 await world.start({log:{warn:()=>{},info:()=>{}}});clearInterval(world.timer);
 return{world,cfg,ack:async()=>fs.writeFile(world.runtime.status,JSON.stringify({pid:process.pid,running:true,session:world.session,requestId:world.requestId,affinity:0,error:null}))};
}

test('a later successful sync clears the previously latched red error',async t=>{
 const {world,ack}=await worldFixture(t);await ack();assert.equal(world.webUi().lamps[0].state,'online');
 const before=await fs.readFile(world.runtime.control,'utf8');world.writeControl=async()=>{throw busy();};
 await assert.rejects(world.publish(true),{code:'EPERM'});assert.equal(world.webUi().lamps[0].state,'error');assert.equal(await fs.readFile(world.runtime.control,'utf8'),before);
 world.writeControl=atomic.writeJson;await world.publish(true);await ack();
 assert.equal(world.problem,null);assert.equal(world.webUi().lamps[0].state,'online');assert(!world.webUi().lamps[0].hint.includes('EPERM'));
});

test('stopping waits for an active write, then publishes disabled state last',async t=>{
 const {world,cfg}=await worldFixture(t);let release,started;const gate=new Promise(r=>{release=r;}),writing=new Promise(r=>{started=r;});
 world.writeControl=async(file,value)=>{if(value.enabled){started();await gate;}await atomic.writeJson(file,value);};
 cfg.includeInCapture=true;const active=world.publish(true);await writing;const stopped=world.stop();release();await active;await stopped;
 const final=JSON.parse(await fs.readFile(world.runtime.control,'utf8'));assert.equal(final.enabled,false);assert.equal(final.include,false);assert.equal(final.leaseUntil,0);assert.equal(world.pending,null);
});
