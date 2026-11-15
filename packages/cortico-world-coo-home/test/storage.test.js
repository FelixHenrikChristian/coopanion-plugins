import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,basename} from 'node:path';
import {HomeStore} from '../src/storage.js';
import {CooHomeWorld} from '../src/index.js';
import {normalizeLifeState} from '../src/life.js';
const layout=JSON.parse(await readFile(new URL('../data/home-layout.json',import.meta.url),'utf8'));
const validate=value=>{if(value.version!==1||!Number.isInteger(value.counter))throw Error('Invalid fixture save');return{version:1,counter:value.counter};};
async function fixture(t){
  const directory=await mkdtemp(join(tmpdir(),'coo-home-save-test-'));t.after(async()=>{assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('coo-home-save-test-'));await rm(directory,{recursive:true,force:true});});
  const store=new HomeStore(directory);return{directory,store,path:name=>join(directory,'coo-home',name)};
}

test('atomic saves are serialized, namespaced and retain the previous committed version',async t=>{
  const f=await fixture(t);await writeFile(join(f.directory,'other-plugin.json'),'untouched');
  await Promise.all([f.store.save({version:1,counter:1}),f.store.save({version:1,counter:2}),f.store.save({version:1,counter:3})]);
  assert.deepEqual(await f.store.load(validate),{version:1,counter:3});assert.equal(JSON.parse(await readFile(f.path('state.backup.json'),'utf8')).counter,2);
  assert.equal(await readFile(join(f.directory,'other-plugin.json'),'utf8'),'untouched');await assert.rejects(readFile(f.path('state.pending.json')),error=>error.code==='ENOENT');
});

test('corrupt primary recovers from the previous good backup',async t=>{
  const f=await fixture(t);await f.store.save({version:1,counter:1});await f.store.save({version:1,counter:2});await writeFile(f.path('state.json'),'{partial');
  assert.deepEqual(await f.store.load(validate),{version:1,counter:1});assert.equal(f.store.recovery,'backup');
  await f.store.save({version:1,counter:3});assert.deepEqual(await f.store.load(validate),{version:1,counter:3});
});

test('a fully written pending save can recover an interrupted initial rename',async t=>{
  const f=await fixture(t);await mkdir(f.store.directory,{recursive:true});await writeFile(f.path('state.pending.json'),JSON.stringify({version:1,counter:5}));
  assert.deepEqual(await f.store.load(validate),{version:1,counter:5});assert.equal(f.store.recovery,'pending');
});

test('entirely corrupt saves stop loading and preserve all originals',async t=>{
  const f=await fixture(t);await mkdir(f.store.directory,{recursive:true});
  const originals={'state.json':'{broken-primary','state.pending.json':'{broken-pending','state.backup.json':'{broken-backup'};
  for(const [name,text] of Object.entries(originals))await writeFile(f.path(name),text);
  await assert.rejects(f.store.load(validate),error=>error.code==='HOME_SAVE_CORRUPT');
  await assert.rejects(f.store.save({version:1,counter:0}),error=>error.code==='HOME_SAVE_CORRUPT');
  for(const [name,text] of Object.entries(originals))assert.equal(await readFile(f.path(name),'utf8'),text);
});

test('future versions in any candidate block downgrade writes and leave every file unchanged',async t=>{
  const f=await fixture(t);await mkdir(f.store.directory,{recursive:true});
  for(const future of ['state.json','state.pending.json','state.backup.json']){
    const originals=Object.fromEntries(['state.json','state.pending.json','state.backup.json'].map(name=>[name,JSON.stringify({version:name===future?99:1,counter:3})]));
    for(const [name,text] of Object.entries(originals))await writeFile(f.path(name),text);
    const validator=value=>value.version>1?normalizeLifeState(value,layout,1_000_000):validate(value);
    await assert.rejects(f.store.load(validator),error=>error.code==='HOME_SAVE_UNSUPPORTED');
    await assert.rejects(f.store.save({version:1,counter:0}),error=>error.code==='HOME_SAVE_UNSUPPORTED');
    for(const [name,text] of Object.entries(originals))assert.equal(await readFile(f.path(name),'utf8'),text);
  }
});

test('World startup and later stop cannot overwrite a future save',async t=>{
  const f=await fixture(t);await mkdir(f.store.directory,{recursive:true});const text=JSON.stringify({version:99,progress:'generated-fixture-progress'});await writeFile(f.path('state.json'),text);
  let bridges=0;const world=new CooHomeWorld({dataDir:f.directory},{layout,bridgeFactory:()=>{bridges++;throw Error('Watcher must not start');}});
  await assert.rejects(world.start(),error=>error.code==='HOME_SAVE_UNSUPPORTED');await world.stop();
  assert.equal(bridges,0);assert.equal(world.life,null);assert.equal(await readFile(f.path('state.json'),'utf8'),text);
  for(const name of ['state.pending.json','state.backup.json'])await assert.rejects(readFile(f.path(name)),error=>error.code==='ENOENT');
});

test('failed reenable cannot flush an earlier in-memory household over a newer save',async t=>{
  const f=await fixture(t),bridgeFactory=()=>({start:async()=>{},stop:async()=>{},snapshot:()=>({connected:false,descriptor:null})});
  const world=new CooHomeWorld({dataDir:f.directory},{layout,clock:()=>1_000_000,bridgeFactory});await world.start();await world.stop();
  const future=JSON.stringify({version:99,progress:'newer-fixture-progress'});await writeFile(f.path('state.json'),future);const backup=await readFile(f.path('state.backup.json'),'utf8');
  await assert.rejects(world.start(),error=>error.code==='HOME_SAVE_UNSUPPORTED');await world.stop();
  assert.equal(world.life,null);assert.equal(await readFile(f.path('state.json'),'utf8'),future);assert.equal(await readFile(f.path('state.backup.json'),'utf8'),backup);
});

test('oversized writes are rejected before touching storage',async t=>{
  const f=await fixture(t);await assert.rejects(f.store.save({value:'x'.repeat(1024*1024)}),/too large/);
  await assert.rejects(readFile(f.path('state.json')),error=>error.code==='ENOENT');
});
