import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,readdir,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import definition,{WardrobeWorld,DEFAULTS} from '../src/index.js';
import {validateProfile,selectVariant,availableOptions,isScheme} from '../src/profile.js';
import {localBase,PetBridge,AppearanceLease} from '../src/bridge.js';
import {Store} from '../src/store.js';
import {authoringGuide} from '../src/guide.js';
const example=JSON.parse(await readFile(new URL('../examples/forest-fox.profile.json',import.meta.url),'utf8'));
const profile=validateProfile(example);
const pack={id:profile.figure,name:{en:'Moss Fox'},axes:[{id:'appearance',options:profile.outfits.flatMap(o=>o.variants.map(v=>({id:v.scheme,name:{en:v.scheme}})))}],presets:[]};
const initial={figure:'forest-fox',scheme:'trailleafboots',palette:'mint',head:'none',colors:{main:'#aabbcc'}};
async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'wardrobe-test-'));let skin=structuredClone(initial),requests=[];
 const servedPack=structuredClone(pack);servedPack.base='/packs/forest-fox/';for(const o of servedPack.axes[0].options)o.thumb='thumb.svg';
 const original=join(root,'figures','forest-fox');await mkdir(original,{recursive:true});await writeFile(join(original,'figure.json'),JSON.stringify(servedPack));
 const server=createServer(async(req,res)=>{
   requests.push([req.method,req.url]);let body='';for await(const c of req)body+=c;
   res.setHeader('Content-Type','application/json');
   if(req.method==='GET'&&req.url==='/api/figures')res.end(JSON.stringify([servedPack]));
   else if(req.method==='GET'&&req.url==='/packs/forest-fox/thumb.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><circle cx="2" cy="2" r="1"/></svg>');}
   else if(req.method==='GET'&&req.url==='/packs/forest-fox/thumb.bin'){res.setHeader('Content-Type','application/octet-stream');res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX2kAAAAASUVORK5CYII=','base64'));}
   else if(req.method==='GET'&&req.url==='/packs/forest-fox/not-image.bin'){res.setHeader('Content-Type','application/octet-stream');res.end('not an image');}
   else if(req.method==='GET'&&req.url==='/api/state')res.end(JSON.stringify({skin,unrelatedPrivateValue:'never-exposed'}));
   else if(req.method==='POST'&&req.url==='/api/skin'){skin=JSON.parse(body).skin;res.end('{"ok":true}');}
   else{res.statusCode=404;res.end('{}');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const ctx={dataDir:root,cfg:{...DEFAULTS,desktopPetUrl:base}};
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));const target=resolve(root);assert.equal(dirname(target),resolve(tmpdir()));assert(basename(target).startsWith('wardrobe-test-'));await rm(target,{recursive:true,force:true});});
 return{root,ctx,base,requests,skin:()=>structuredClone(skin),setSkin:s=>{skin=s;},original,pack:servedPack};
}
const host={log:{warn(){}}};
test('outfits expose their own controls and map only legal complete combinations',()=>{
 assert.deepEqual(profile.outfits[0].controls.map(c=>c.id),['cape','footwear']);
 assert.deepEqual(profile.outfits[1].controls.map(c=>c.id),['hood','colour']);
 assert.equal(selectVariant(profile.outfits[1],{hood:'down',colour:'teal'}).scheme,'raindownteal');
 assert.throws(()=>selectVariant(profile.outfits[1],{cape:'leaf'}),/does not belong/);
 assert.throws(()=>selectVariant(profile.outfits[0],{cape:'invalid'}),/Unknown option/);
 assert.equal(selectVariant(profile.outfits[2]).scheme,'stargazerraised');
});
test('incomplete resource matrices disable impossible combinations',()=>{
 const o=structuredClone(profile.outfits[0]);o.variants=o.variants.filter(v=>v.scheme!=='trailsandpaws');
 assert.deepEqual(availableOptions(o,{cape:'sand',footwear:'boots'},'footwear').map(o=>o.id),['boots']);
 assert.throws(()=>selectVariant(o,{cape:'sand',footwear:'paws'}),/no animation resources/);
});
test('profile boundary rejects duplicate choices, foreign controls, code-like values and Coo',()=>{
 for(const mutate of [p=>{p.figure='coo';},p=>{p.id='../escape';},p=>{p.outfits[0].variants[0].pick.foreign='x';},p=>{p.outfits.push(p.outfits[0]);},p=>{p.outfits[0].variants[0].scheme='https://outside.invalid';}]){
   const p=structuredClone(example);mutate(p);assert.throws(()=>validateProfile(p));
 }
 assert(isScheme(pack,'raindownteal'));assert(!isScheme(pack,'missing'));assert(isScheme({...pack,presets:[{id:'presetone'}]},'presetone'));
});
test('default World constructs without touching a deployment or network',()=>{
 const world=definition.create({dataDir:join(tmpdir(),'not-created-wardrobe'),cfg:definition.defaults()});
 assert.equal(world.id,'wardrobe-studio');assert.equal(world.tools().length,4);assert.equal(world.envPromptVars(),null);
 const ui=world.webUi('en');assert.deepEqual(ui.panels.map(p=>p.id),['wardrobe','guide']);
 assert.equal(ui.config[0].owner,'world:wardrobe-studio');assert.equal(definition.defaults().enabled,false);
});
test('import, apply and stop use an unchanged figure and restore the original appearance',async t=>{
 const f=await fixture(t),before=await readFile(join(f.original,'figure.json'));const world=new WardrobeWorld(f.ctx);
 await world.start(host);await world.importProfile(example);
 const ui=world.webUi();await ui.invoke('wardrobe','choose',[{profile:profile.id,outfit:'rain',pick:{hood:'up',colour:'teal'}}]);
 assert.equal(f.skin().scheme,'rainupteal');assert.deepEqual(f.skin().colors,initial.colors);
 const state=await world.state();assert(!JSON.stringify(state).includes('never-exposed'));
 const tool=world.tools().find(t=>t.name==='wardrobe_authoring_guide');assert.match((await tool.handler({stage:'matte'})).text,/MatAnyone2/);
 await world.stop();assert.deepEqual(f.skin(),initial);
 assert.deepEqual(await readFile(join(f.original,'figure.json')),before);
 assert.deepEqual((await readdir(f.root)).sort(),['figures','wardrobe-studio']);
 assert.equal(world.shutdownVerification()[0].status,'verified-ended');
});
test('external wardrobe changes are preserved on disable',async t=>{
 const f=await fixture(t),world=new WardrobeWorld(f.ctx);await world.start(host);await world.importProfile(example);
 await world.choose({profile:profile.id,outfit:'rain',pick:{hood:'down',colour:'gold'}});
 const external={...f.skin(),scheme:'stargazerlowered',head:'custom'};f.setSkin(external);
 await world.stop();assert.deepEqual(f.skin(),external);assert.equal(world.restoration.status,'external-change-preserved');
});
test('restoration keeps unrelated preference updates made while the extension owns the outfit',async t=>{
 const f=await fixture(t),world=new WardrobeWorld(f.ctx);await world.start(host);await world.importProfile(example);
 await world.choose({profile:profile.id,outfit:'rain',pick:{hood:'up',colour:'gold'}});
 f.setSkin({...f.skin(),palette:'violet'});await world.restore();assert.equal(f.skin().scheme,initial.scheme);assert.equal(f.skin().palette,'violet');
});
test('write-ahead recovery handles termination after a successful desktop write',async t=>{
 const f=await fixture(t),store=new Store(f.root),bridge=new PetBridge(f.base),lease=new AppearanceLease(bridge,store);
 const save=store.write.bind(store);let calls=0;store.write=async(...args)=>{if(++calls===2)throw Error('simulated termination');return save(...args);};
 await assert.rejects(lease.apply('forest-fox','rainupgold'),/termination/);assert.equal(f.skin().scheme,'rainupgold');
 const recovered=new WardrobeWorld(f.ctx);await recovered.start(host);assert.deepEqual(f.skin(),initial);assert.equal(recovered.restoration.status,'restored');
});
test('serialized requests finish in order and stale actions cannot apply after stop',async t=>{
 const f=await fixture(t),world=new WardrobeWorld(f.ctx);await world.start(host);await world.importProfile(example);
 await Promise.all([world.choose({profile:profile.id,outfit:'rain',pick:{hood:'up',colour:'gold'}}),world.choose({profile:profile.id,outfit:'rain',pick:{hood:'down',colour:'teal'}})]);
 assert.equal(f.skin().scheme,'raindownteal');await world.stop();assert.deepEqual(f.skin(),initial);
 await assert.rejects(world.choose({profile:profile.id,outfit:'trail',pick:{cape:'leaf',footwear:'boots'}}),/not active/);
});
test('remote origins, credentials and injected paths are rejected before network use',()=>{
 for(const s of ['https://127.0.0.1:7797','http://outside.invalid','http://user:pass@localhost:7797','http://localhost:7797/subpath','http://localhost:7797/?x=1'])assert.throws(()=>localBase(s));
 assert.equal(localBase('http://127.0.0.1:7797'),'http://127.0.0.1:7797');assert.equal(localBase('http://[::1]:7797'),'http://[::1]:7797');
});
test('reinstall reuses only its own profile data and starts with the restored appearance',async t=>{
 const f=await fixture(t),one=new WardrobeWorld(f.ctx);await one.start(host);await one.importProfile(example);
 await one.choose({profile:profile.id,outfit:'rain',pick:{hood:'up',colour:'gold'}});await one.stop();
 const two=new WardrobeWorld(f.ctx);await two.start(host);assert.equal(two.profiles[0].id,profile.id);assert.deepEqual(f.skin(),initial);await two.stop();
});
test('an unavailable desktop retains the recovery journal and reports incomplete restoration',async t=>{
 const f=await fixture(t),world=new WardrobeWorld(f.ctx);await world.start(host);await world.importProfile(example);
 await world.choose({profile:profile.id,outfit:'rain',pick:{hood:'up',colour:'gold'}});
 const request=world.bridge.request.bind(world.bridge);world.bridge.request=async()=>{throw Error('desktop unavailable');};
 await world.stop();assert.equal(world.shutdownVerification()[0].status,'unknown');
 assert((await world.store.read('lease.json',null)).before);assert.equal(f.skin().scheme,'rainupgold');
 world.bridge.request=request;await world.restore();assert.deepEqual(f.skin(),initial);
});
test('preview images come from the mapped local figure and do not change appearance',async t=>{
 const f=await fixture(t),world=new WardrobeWorld(f.ctx);await world.start(host);await world.importProfile(example);
 const image=await world.webUi().invoke('wardrobe','thumbnail',[{profile:profile.id,outfit:'trail',pick:{cape:'leaf',footwear:'boots'}}]);
 assert.equal(image.$binary.mime,'image/svg+xml');assert.match(Buffer.from(image.$binary.base64,'base64').toString(),/<svg/);
 assert.deepEqual(f.skin(),initial);assert(f.requests.some(([method,url])=>method==='GET'&&url==='/packs/forest-fox/thumb.svg'));
});
test('figure preview paths cannot leave their local pack directory',async t=>{
 const f=await fixture(t),world=new WardrobeWorld(f.ctx);await world.start(host);await world.importProfile(example);
 const args={profile:profile.id,outfit:'trail',pick:{cape:'leaf',footwear:'boots'}};
 for(const file of ['https://outside.invalid/image.png','../../api/state']){
  f.pack.axes[0].options[0].thumb=file;await assert.rejects(world.thumbnail(args),/Invalid figure preview path/);
 }
});
test('octet-stream raster thumbnails are identified by signature and other bytes rejected',async t=>{
 const f=await fixture(t),bridge=new PetBridge(f.base);
 f.pack.axes[0].options[0].thumb='thumb.bin';
 assert.equal((await bridge.thumbnail(f.pack,'trailleafboots')).$binary.mime,'image/png');
 f.pack.axes[0].options[0].thumb='not-image.bin';
 await assert.rejects(bridge.thumbnail(f.pack,'trailleafboots'),/Figure preview unavailable/);
});
test('configuration check is read-only and validates installed schemes before import',async t=>{
 const f=await fixture(t),world=new WardrobeWorld(f.ctx);await world.start(host);
 const result=await world.webUi().invoke('wardrobe','check',[example]);
 assert.deepEqual(result,{valid:true,id:profile.id,figure:profile.figure,outfits:3,variants:10,scope:'structure-and-installed-ids-only'});
 assert.equal(world.profiles.length,0);assert.deepEqual(f.skin(),initial);assert.deepEqual(await readdir(f.root),['figures']);
 assert(!f.requests.some(([m])=>m==='POST'));
 const invalid=structuredClone(example);invalid.outfits[0].variants[0].scheme='missing';await assert.rejects(world.checkProfile(invalid),/Scheme is not available/);
 assert.deepEqual(await readdir(f.root),['figures']);
});
test('profile size is bounded by UTF-8 bytes even for pasted non-ASCII metadata',()=>{
 const input={...example,note:'é'.repeat(33000)};assert(JSON.stringify(input).length<65536);assert.throws(()=>validateProfile(input),/64 KiB/);
});
test('bundled manual, downloads and standalone documented profiles agree',async()=>{
 const world=definition.create({dataDir:join(tmpdir(),'unused-manual-data'),cfg:DEFAULTS}),ui=world.webUi('zh');
 const downloaded=await ui.invoke('guide','example',[]);assert.deepEqual(validateProfile(downloaded),profile);
 const schema=await ui.invoke('guide','schema',[]);assert.equal(schema.properties.schema.const,1);assert.equal(schema.properties.outfits.maxItems,32);
 for(const lang of ['en','zh']){
  const sections=authoringGuide('all',lang);assert.equal(sections.length,9);assert(sections.every(s=>s.title&&s.text.length>300));
  assert.match(authoringGuide('matte',lang)[0].text,/MatAnyone2/);assert.match(authoringGuide('profile',lang)[0].text,/65536|65,536/);
  const doc=await readFile(new URL(lang==='zh'?'../docs/profile-format.zh.md':'../docs/profile-format.md',import.meta.url),'utf8');
  const documented=validateProfile(JSON.parse(doc.match(/```json\s*\n([\s\S]*?)\n```/)[1]));
  assert.equal(documented.outfits.length,2);assert(documented.outfits.every(o=>o.variants.every(v=>isScheme(pack,v.scheme))));
 }
});
test('language defaults to Chinese, is shared across panels and persists without changing wardrobe data',async t=>{
 const f=await fixture(t),world=new WardrobeWorld(f.ctx);await world.start(host);await world.importProfile(example);
 const profileBytes=await readFile(join(f.root,'wardrobe-studio','profiles.json'));
 assert.equal(world.webUi('en').label,'装扮工作室');
 assert.deepEqual(await world.webUi('en').invoke('guide','locale',[]),{language:'zh'});
 assert.match((await world.webUi('en').invoke('guide','read',['reference']))[0].title,/参考图/);
 await world.webUi().invoke('wardrobe','setLanguage',['en']);
 assert.equal(world.webUi('zh').label,'Wardrobe Studio');
 assert.deepEqual(await world.webUi().invoke('guide','locale',[]),{language:'en'});
 assert.match((await world.webUi().invoke('guide','read',['reference']))[0].title,/references/);
 assert.match((await world.webUi().invoke('guide','read',['reference','zh']))[0].title,/参考图/);
 await assert.rejects(world.setLanguage('other'),/Unsupported/);
 await world.stop();const reopened=new WardrobeWorld(f.ctx);await reopened.start(host);assert.equal(reopened.language,'en');
 assert.deepEqual(await readFile(join(f.root,'wardrobe-studio','profiles.json')),profileBytes);assert.deepEqual(f.skin(),initial);
 await reopened.setLanguage('zh');assert.equal(reopened.webUi('en').label,'装扮工作室');
});
