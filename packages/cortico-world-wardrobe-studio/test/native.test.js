import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {connect} from 'node:net';
import {NativeAdapter,patchDress,SUPPORTED_DRESS_SHA256S} from '../src/native-adapter.js';
import {NativeFeed} from '../src/native-feed.js';
import {Store} from '../src/store.js';
const source="import { ICONS, themeButton } from './ui.js';\nfunction fixture(){\n  const picks = picksOf(pack, skin.scheme);\n}\nvoid ready.then(() => { connect(); apply(skin, false); });\n";
const digest=b=>createHash('sha256').update(b).digest('hex');
// The production adapter always checks the released host checksum. Only the
// disposable subclass substitutes a tiny, original fixture for that host file.
class FixtureAdapter extends NativeAdapter{verifyOriginal(b){assert.equal(digest(b),digest(source));}}
const updatedSource=source+'\nfunction renderLooks(){return "upstream saved looks";}\n';
class UpdatedFixtureAdapter extends NativeAdapter{verifyOriginal(bytes){assert([digest(source),digest(updatedSource)].includes(digest(bytes)));}}
async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'wardrobe-native-test-')),web=join(root,'desktop-pet','web');await mkdir(web,{recursive:true});
  await writeFile(join(dirname(web),'package.json'),JSON.stringify({name:'cortico-world-desktop-pet',version:'0.2.0'}));await writeFile(join(web,'dress.js'),source);
  t.after(async()=>{const target=resolve(root);assert.equal(dirname(target),resolve(tmpdir()));assert(basename(target).startsWith('wardrobe-native-test-'));await rm(target,{recursive:true,force:true});});
  const options={webDir:web,store:new Store(root),origin:'http://127.0.0.1:7797',port:0,snapshot:()=>({contract:1,enabled:true,profiles:[]})};
  return{root,web,options};
}
test('native patch requires each reviewed anchor exactly once',()=>{
  const patched=patchDress(source);assert.match(patched,/wardrobe.render\(/);assert.match(patched,/wardrobe.onChange/);
  assert.throws(()=>patchDress(source+source),/anchors/);assert.throws(()=>patchDress('unknown page'),/anchors/);
});
test('production host allowlist contains only the two reviewed native pages',()=>{
  assert.deepEqual(SUPPORTED_DRESS_SHA256S,['b594171051e90e4f368c635b4fd008405f6e41e6dfd3dbd907fdbffa767fbe9f','87919223e6d26bdbcfc8bff7f1f51e5c5f52b51ceafd45a72b4f0f5b780b30af']);
  assert(Object.isFrozen(SUPPORTED_DRESS_SHA256S));
});
test('unknown native source is refused without host writes or a listening service',async t=>{
  const f=await fixture(t),adapter=new NativeAdapter(f.options);await assert.rejects(adapter.start(),/checksum/);
  assert.deepEqual(await readdir(f.web),['dress.js']);assert.equal(await readFile(join(f.web,'dress.js'),'utf8'),source);assert.equal(adapter.feed,undefined);
});
test('native adapter backs up, patches, restores and survives a repeated stop',async t=>{
  const f=await fixture(t),adapter=new FixtureAdapter(f.options);t.after(()=>adapter.stop());await adapter.start();
  assert.equal(adapter.status.state,'active');assert.match(await readFile(join(f.web,'dress.js'),'utf8'),/wardrobe.render/);
  const record=await adapter.readRecord();assert.equal(Buffer.from(record.original,'base64').toString(),source);
  await adapter.stop();await adapter.stop();assert.equal(await readFile(join(f.web,'dress.js'),'utf8'),source);assert.deepEqual(await readdir(f.web),['dress.js']);
});
test('interrupted native installation is recovered before reactivation',async t=>{
  const f=await fixture(t),one=new FixtureAdapter(f.options);await one.start();const token=(await one.readRecord()).token;await one.feed.stop();
  const two=new FixtureAdapter(f.options);t.after(()=>two.stop());await two.start();assert.equal((await two.readRecord()).token,token);await two.stop();assert.equal(await readFile(join(f.web,'dress.js'),'utf8'),source);
});
test('externally changed native page is never overwritten by rollback',async t=>{
  const f=await fixture(t),adapter=new FixtureAdapter(f.options);await adapter.start();await writeFile(join(f.web,'dress.js'),'external update');
  await assert.rejects(adapter.stop(),/changed externally/);assert.equal(await readFile(join(f.web,'dress.js'),'utf8'),'external update');
});
test('reviewed host upgrade retains the new page and archives the old recovery record',async t=>{
  const f=await fixture(t),one=new FixtureAdapter(f.options);await one.start();const previous=await one.readRecord();await one.feed.stop();
  await writeFile(join(f.web,'dress.js'),updatedSource);
  const two=new UpdatedFixtureAdapter(f.options);t.after(()=>two.stop());await two.start();
  assert.equal(two.status.state,'active');assert.equal(two.status.hostHash,digest(updatedSource));
  assert.equal(await readFile(join(f.web,'dress.js'),'utf8'),patchDress(updatedSource));
  assert.equal(Buffer.from((await two.readRecord()).original,'base64').toString(),updatedSource);
  const archives=await readdir(join(f.options.store.root,'native-adapter-history'));assert.equal(archives.length,1);
  assert.deepEqual(JSON.parse(await readFile(join(f.options.store.root,'native-adapter-history',archives[0]),'utf8')),previous);
  await two.stop();await two.stop();assert.equal(await readFile(join(f.web,'dress.js'),'utf8'),updatedSource);
});
test('stopping after a reviewed update never restores the old upstream page',async t=>{
  const f=await fixture(t),adapter=new UpdatedFixtureAdapter(f.options);await adapter.start();await writeFile(join(f.web,'dress.js'),updatedSource);
  await adapter.stop();await adapter.stop();assert.equal(await readFile(join(f.web,'dress.js'),'utf8'),updatedSource);
  assert.deepEqual(await readdir(f.web),['dress.js']);assert.equal((await readdir(join(f.options.store.root,'native-adapter-history'))).length,1);
});
test('modified helpers block reviewed update recovery before any host file changes',async t=>{
  const f=await fixture(t),one=new FixtureAdapter(f.options);await one.start();await one.feed.stop();
  await writeFile(join(f.web,'dress.js'),updatedSource);await writeFile(join(f.web,'wardrobe-studio-native.js'),'foreign helper change');
  const two=new UpdatedFixtureAdapter(f.options);await assert.rejects(two.start(),/helper changed externally/);
  assert.equal(await readFile(join(f.web,'dress.js'),'utf8'),updatedSource);
  assert.equal(await readFile(join(f.web,'wardrobe-studio-native.js'),'utf8'),'foreign helper change');
  assert.equal((await two.readRecord()).originalHash,digest(source));
  assert.equal(await readFile(join(f.web,'wardrobe-studio-controls.js'),'utf8')!=='',true);assert.equal(two.feed,undefined);
});
test('existing helper collisions preserve the original files',async t=>{
  const f=await fixture(t);await writeFile(join(f.web,'wardrobe-studio-native.js'),'foreign file');const adapter=new FixtureAdapter(f.options);
  await assert.rejects(adapter.start(),/already exists/);assert.equal(await readFile(join(f.web,'dress.js'),'utf8'),source);assert.equal(await readFile(join(f.web,'wardrobe-studio-native.js'),'utf8'),'foreign file');
});
function handshake(feed,{origin='http://127.0.0.1:7797',token='test-token'}={}){
  return new Promise((resolve,reject)=>{
    const socket=connect(feed.port,'127.0.0.1');let bytes=Buffer.alloc(0);const timer=setTimeout(()=>{socket.destroy();reject(Error('Feed timeout'));},3000);
    socket.on('error',reject);socket.on('connect',()=>socket.write(`GET /wardrobe-view?key=${token} HTTP/1.1\r\nHost: 127.0.0.1:${feed.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nOrigin: ${origin}\r\n\r\n`));
    socket.on('data',data=>{bytes=Buffer.concat([bytes,data]);const end=bytes.indexOf('\r\n\r\n');if(end<0)return;const headers=bytes.subarray(0,end).toString();if(headers.includes('403')||bytes.length>end+6){clearTimeout(timer);socket.destroy();resolve({headers,body:bytes.subarray(end+4)});}});
  });
}
test('native feed rejects foreign origins and tokens, and exposes only the declared snapshot',async t=>{
  const feed=new NativeFeed({origin:'http://127.0.0.1:7797',token:'test-token',port:0,snapshot:()=>({contract:1,enabled:true,profiles:[]})});await feed.start();t.after(()=>feed.stop());
  assert.match((await handshake(feed,{origin:'https://foreign.invalid'})).headers,/403/);
  assert.match((await handshake(feed,{token:'wrong'})).headers,/403/);
  const accepted=await handshake(feed);assert.match(accepted.headers,/101 Switching/);const payload=JSON.parse(accepted.body.subarray(2).toString());assert.deepEqual(payload,{contract:1,enabled:true,profiles:[]});
  assert.equal((await fetch(`http://127.0.0.1:${feed.port}/wardrobe-view`)).status,404);
});
