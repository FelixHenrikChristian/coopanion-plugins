import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {HomePreferences,DEFAULT_ENVIRONMENT,ENVIRONMENT_MAX_LENGTH,normalizePreferences,homePromptDocument,renderHomeTemplate} from '../src/preferences.js';
import {HomeStore} from '../src/storage.js';

async function fixture(t){
  const directory=await mkdtemp(join(tmpdir(),'coo-home-environment-'));
  t.after(async()=>{assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('coo-home-environment-'));await rm(directory,{recursive:true,force:true});});
  const create=options=>new HomePreferences({dataDir:directory,native:false,clock:()=>1_000_000,...options});
  return{directory,create,path:name=>join(directory,'coo-home',name)};
}

test('home environment is separately persisted and reset does not touch other home or host files',async t=>{
  const f=await fixture(t);await mkdir(join(f.directory,'coo-home'));await writeFile(f.path('state.json'),'neutral-household-marker');await writeFile(join(f.directory,'CONSTITUTION.md'),'neutral-personality-marker');
  const p=f.create();await p.start();assert.equal(p.text(),DEFAULT_ENVIRONMENT);assert.equal(p.snapshot().isDefault,true);
  const saved=await p.save({revision:0,text:'中性测试家园\r\n窗边留一盏暖灯。'});assert.equal(saved.revision,1);assert.equal(saved.text,'中性测试家园\n窗边留一盏暖灯。');await p.stop();
  const reopened=f.create();await reopened.start();assert.equal(reopened.text(),saved.text);
  const reset=await reopened.reset({revision:1});assert.equal(reset.revision,2);assert.equal(reset.text,DEFAULT_ENVIRONMENT);await reopened.stop();
  assert.equal(await readFile(f.path('state.json'),'utf8'),'neutral-household-marker');assert.equal(await readFile(join(f.directory,'CONSTITUTION.md'),'utf8'),'neutral-personality-marker');
  assert.deepEqual(Object.keys(JSON.parse(await readFile(f.path('preferences.json'),'utf8'))).sort(),['revision','text','updatedAt','version']);
});

test('concurrent editors cannot silently overwrite each other and revisions remain monotonic',async t=>{
  const f=await fixture(t),p=f.create();await p.start();
  const results=await Promise.allSettled([p.save({revision:0,text:'first neutral edit'}),p.save({revision:0,text:'stale neutral edit'})]);
  assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.code,'HOME_ENV_CONFLICT');assert.equal(p.text(),'first neutral edit');
  await assert.rejects(p.reset({revision:0}),error=>error.code==='HOME_ENV_CONFLICT');
  await p.save({revision:1,text:''});assert.equal(p.text(),'');assert.equal(p.snapshot().isDefault,false);assert.equal(p.snapshot().revision,2);await p.stop();
});

test('invalid or oversized text is rejected without changing the active or persisted document',async t=>{
  const f=await fixture(t),p=f.create();await p.start();const original=await readFile(f.path('preferences.json'),'utf8');
  for(const text of [null,{},'x'.repeat(ENVIRONMENT_MAX_LENGTH+1),'\u0000','\ud800'])await assert.rejects(p.save({revision:0,text}),error=>error.code==='HOME_ENV_INPUT');
  await assert.rejects(p.save({revision:0,text:'valid',path:'not-accepted'}),error=>error.code==='HOME_ENV_INPUT');
  await assert.rejects(p.save({revision:-1,text:'valid'}),error=>error.code==='HOME_ENV_INPUT');
  assert.equal(await readFile(f.path('preferences.json'),'utf8'),original);assert.equal(p.text(),DEFAULT_ENVIRONMENT);
  await p.save({revision:0,text:'x'.repeat(ENVIRONMENT_MAX_LENGTH)});assert.equal(p.text().length,ENVIRONMENT_MAX_LENGTH);await p.stop();
});

test('failed saves retain the active document and remain retryable without reporting success',async t=>{
  const f=await fixture(t),real=new HomeStore(f.directory,{name:'preferences'});let fail=false,changes=0;
  const store={load:validate=>real.load(validate),save:value=>fail?Promise.reject(Error('neutral-fixture-disk-error')):real.save(value),flush:()=>real.flush()};
  const p=f.create({store,onChange:()=>changes++});await p.start();fail=true;
  await assert.rejects(p.save({revision:0,text:'must not become active'}),error=>error.code==='HOME_ENV_STORAGE'&&!error.message.includes('fixture'));
  assert.equal(p.text(),DEFAULT_ENVIRONMENT);assert.equal(p.snapshot().revision,0);assert.equal(p.snapshot().storage.ok,false);assert.equal(p.snapshot().storage.editable,true);assert.equal(changes,1);
  fail=false;await p.save({revision:0,text:'successfully saved'});assert.equal(p.text(),'successfully saved');assert.equal(p.snapshot().storage.ok,true);await p.stop();
});

test('future preference versions in primary, pending or backup prevent any downgrade write',async t=>{
  const f=await fixture(t);await mkdir(join(f.directory,'coo-home'));
  const names=['preferences.json','preferences.pending.json','preferences.backup.json'];
  for(const future of names){
    const originals=Object.fromEntries(names.map(name=>[name,JSON.stringify({version:name===future?99:1,revision:2,text:'neutral saved environment',updatedAt:500})]));
    for(const [name,text] of Object.entries(originals))await writeFile(f.path(name),text);
    const p=f.create();await p.start();assert.equal(p.snapshot().storage.ok,false);assert.equal(p.snapshot().storage.editable,false);assert.throws(()=>p.text(),error=>error.code==='HOME_ENV_STORAGE');
    await assert.rejects(p.reset({revision:0}),error=>error.code==='HOME_ENV_STORAGE');await p.stop();
    for(const [name,text] of Object.entries(originals))assert.equal(await readFile(f.path(name),'utf8'),text);
  }
});

test('damaged primary recovers a valid backup but fully corrupt documents are never reset',async t=>{
  const f=await fixture(t),p=f.create();await p.start();await p.save({revision:0,text:'retained backup'});await p.save({revision:1,text:'current'});await p.stop();
  await writeFile(f.path('preferences.json'),'{partial');const restored=f.create();await restored.start();assert.equal(restored.text(),'retained backup');await restored.stop();
  await writeFile(f.path('preferences.backup.json'),'{broken-backup');const broken=f.create();await broken.start();assert.equal(broken.snapshot().storage.editable,false);await assert.rejects(broken.save({revision:0,text:'replacement'}),error=>error.code==='HOME_ENV_STORAGE');await broken.stop();
  assert.equal(await readFile(f.path('preferences.json'),'utf8'),'{partial');assert.equal(await readFile(f.path('preferences.backup.json'),'utf8'),'{broken-backup');
});

test('normalization retains only the document schema and stop closes an overlapping startup',async()=>{
  assert.deepEqual(normalizePreferences({version:1,revision:2,text:'neutral',updatedAt:500,extra:'not retained'}),{version:1,revision:2,text:'neutral',updatedAt:500});
  let release,entered;const entry=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
  const p=new HomePreferences({store:{async load(){entered();await gate;return null;},async save(){},async flush(){}},clock:()=>500});
  const start=p.start();await entry;const stop=p.stop();release();await Promise.all([start,stop]);assert.equal(p.started,false);assert.throws(()=>p.text(),error=>error.code==='HOME_ENV_STORAGE');
});

test('native editor uses a role-free document with declared safe variables and no main-session injection contract',async t=>{
  const f=await fixture(t),doc=homePromptDocument(f.directory);
  assert.equal(doc.role,undefined);assert.equal(doc.deploymentPath,f.path('ENVIRONMENT.md'));assert.notEqual(doc.path,doc.deploymentPath);
  assert.deepEqual(doc.vars.map(value=>value.name),['home.activity','home.needs','home.garden','home.inventory']);
  assert.equal(renderHomeTemplate('{{home.activity}} / {{home.inventory | 空}} / {{unknown}}',{'home.activity':'阅读','home.inventory':''}),'阅读 / 空 / {{unknown}}');
  const p=f.create({native:true});await p.start();await writeFile(f.path('ENVIRONMENT.md'),'中性编辑：{{home.activity}}');assert.equal(p.text({'home.activity':'用餐'}),'中性编辑：用餐');
  assert.equal(homePromptDocument(f.directory).path,f.path('ENVIRONMENT.md'));await p.stop();
});

test('legacy environment migrates once without overriding native edits or reappearing after native reset',async t=>{
  const f=await fixture(t),legacy=f.create();await legacy.start();await legacy.save({revision:0,text:'neutral legacy custom document'});await legacy.stop();
  const old=await readFile(f.path('preferences.json'),'utf8');let p=f.create({native:true});await p.start();assert.equal(p.text(),'neutral legacy custom document');await p.stop();
  await writeFile(f.path('ENVIRONMENT.md'),'new native editor text');p=f.create({native:true});await p.start();assert.equal(p.text(),'new native editor text');await p.reset({revision:p.snapshot().revision});await p.stop();
  p=f.create({native:true});await p.start();assert.equal(p.text(),DEFAULT_ENVIRONMENT);assert.equal(await readFile(f.path('preferences.json'),'utf8'),old);await p.stop();
});

test('invalid native text is preserved and can be repaired without restart',async t=>{
  const f=await fixture(t),p=f.create({native:true});await p.start();const oversized='x'.repeat(8001);await writeFile(f.path('ENVIRONMENT.md'),oversized);
  assert.throws(()=>p.text(),error=>error.code==='HOME_ENV_STORAGE');assert.equal(await readFile(f.path('ENVIRONMENT.md'),'utf8'),oversized);
  await writeFile(f.path('ENVIRONMENT.md'),'repaired neutral environment');assert.equal(p.text(),'repaired neutral environment');await p.stop();
});

test('invalid native template at startup recovers after editing without bypassing future migration protection',async t=>{
  const f=await fixture(t);await mkdir(join(f.directory,'coo-home'));await writeFile(f.path('ENVIRONMENT.md'),'x'.repeat(8001));
  let p=f.create({native:true});await p.start();assert.equal(p.snapshot().storage.editable,false);assert.throws(()=>p.text(),error=>error.code==='HOME_ENV_STORAGE');
  await writeFile(f.path('ENVIRONMENT.md'),'repaired after startup');assert.equal(p.snapshot().storage.editable,true);assert.equal(p.text(),'repaired after startup');await p.stop();
  const future=JSON.stringify({version:99,migrated:true});await writeFile(f.path('preferences-native.json'),future);p=f.create({native:true});await p.start();
  await writeFile(f.path('ENVIRONMENT.md'),'another valid native edit');assert.equal(p.snapshot().storage.editable,false);assert.throws(()=>p.text(),error=>error.code==='HOME_ENV_STORAGE');assert.equal(await readFile(f.path('preferences-native.json'),'utf8'),future);await p.stop();
});
