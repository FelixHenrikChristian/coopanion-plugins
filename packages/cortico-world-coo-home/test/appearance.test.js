import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AppearanceBridge,candidates,localOrigin,readPetConfig} from '../src/appearance.js';

const skin=figure=>({figure,scheme:'plain',colors:{body:{main:'#ffcc99',acc:'#112233'}}});
const pack=id=>({id,name:'Fixture display label',description:'Not rendering metadata',voice:{private:'omit'},base:`/packs/${id}/`,entry:'figure.js',export:'FixtureFigure',model:'model.json',axes:[{id:'style',options:[{id:'plain'},{id:'stripe'}]}],presets:[{id:'plain'},{id:'stripe'}],vocab:[{id:'idle',label:'Rest'},{id:'walk',label:'Move'}],can:{walk:true}});
class Socket extends EventTarget{
  readyState=1;sent=[];closed=0;
  send(value){this.sent.push(value);}
  close(){this.closed++;this.readyState=3;this.dispatchEvent(new Event('close'));}
  prefs(value){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({t:'prefs',skin:value})}));}
}
function fixture(options={}){
  const state={skin:skin('fixture-one')},config={enabled:true,port:7797};
  let catalog=[pack('fixture-one'),pack('fixture-two')];
  const requests=[],sockets=[];
  const bridge=new AppearanceBridge({readConfig:async()=>structuredClone(config),retryMs:60_000,timeoutMs:300,
    fetcher:async(url,init)=>{
      requests.push({url,method:init.method,redirect:init.redirect});
      if(options.fetcher)return options.fetcher(url,init,{state,catalog});
      if(url.endsWith('/api/state'))return Response.json(state);
      if(url.endsWith('/api/figures'))return Response.json(catalog);
      if(url.endsWith('/model.json'))return Response.json({width:64,height:96,frames:{idle:[0]}});
      return new Response('',{status:404});
    },createSocket:url=>{const socket=new Socket();socket.url=url;sockets.push(socket);return socket;},...options.bridge});
  return{bridge,state,config,requests,sockets,catalog:()=>catalog,setCatalog:value=>{catalog=value;}};
}
async function settle(bridge){await bridge.inflight;await new Promise(resolve=>setImmediate(resolve));await bridge.inflight;}

test('service discovery only accepts loopback HTTP and the official ten candidates',()=>{
  assert.equal(localOrigin('http://localhost:7797'),'http://localhost:7797');
  assert.equal(localOrigin('http://[::1]:7797'),'http://[::1]:7797');
  for(const value of ['https://localhost:7797','http://example.com','http://user@127.0.0.1:7797','http://127.0.0.1/x','http://127.0.0.1/?token=x'])assert.throws(()=>localOrigin(value));
  assert.deepEqual(candidates({port:0}),[]);assert.deepEqual(candidates({enabled:false}),[]);
  assert.equal(candidates({}).length,10);assert.equal(candidates({})[9],'http://127.0.0.1:7806');
  assert.deepEqual(candidates({port:65535}),['http://127.0.0.1:65535']);
  assert.deepEqual(candidates({port:'7797'}),[]);
});

test('host discovery reads only the isolated deployment configuration subset',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'coo-home-config-'));
  try{
    await writeFile(join(directory,'config.json'),JSON.stringify({models:{secret:'not-returned'},worlds:{'desktop-pet':{enabled:true,port:7950,skin:skin('fixture-one'),sound:{volume:.5}}}}));
    assert.deepEqual(await readPetConfig(directory),{enabled:true,port:7950,skin:skin('fixture-one')});
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('selected appearance exposes rendering metadata only, fetches models read-only and clones snapshots',async t=>{
  const f=fixture();t.after(()=>f.bridge.stop());await f.bridge.start();
  const status=f.bridge.snapshot();assert.equal(status.connected,true);
  assert.match(status.descriptor.key,/^[a-f0-9]{64}$/);assert.equal(status.descriptor.model.width,64);
  assert.equal(status.descriptor.frameUrl,'http://127.0.0.1:7797/figure-frame?pack=fixture-one');
  assert.deepEqual(status.descriptor.words,['idle','walk']);assert.equal(status.descriptor.scheme,'plain');
  assert.deepEqual(Object.keys(status.descriptor).sort(),['baseUrl','can','entry','exportName','frameUrl','key','model','scheme','skin','words'].sort());
  assert.ok(!JSON.stringify(status).includes('Fixture display label'));assert.ok(!JSON.stringify(status).includes('Not rendering metadata'));
  status.descriptor.model.width=999;assert.equal(f.bridge.snapshot().descriptor.model.width,64);
  assert.ok(f.requests.every(r=>r.method==='GET'&&r.redirect==='error'));
  assert.equal(f.sockets[0].url,'ws://127.0.0.1:7797/socket?role=watcher');assert.deepEqual(f.sockets[0].sent,[]);
  const count=f.requests.length;await f.bridge.refresh();assert.equal(f.requests.length,count,'Cached live watcher avoids repeated catalog requests');
});

test('watcher follows figure and outfit changes, reconnects and releases resources',async t=>{
  const f=fixture();t.after(()=>f.bridge.stop());await f.bridge.start();
  f.state.skin=skin('fixture-two');f.sockets[0].prefs(f.state.skin);await settle(f.bridge);
  assert.equal(f.bridge.snapshot().descriptor.skin.figure,'fixture-two');
  const key=f.bridge.snapshot().descriptor.key;
  f.state.skin.scheme='stripe';f.sockets[0].prefs(f.state.skin);await settle(f.bridge);
  assert.equal(f.bridge.snapshot().descriptor.scheme,'stripe');assert.notEqual(f.bridge.snapshot().descriptor.key,key);
  f.sockets[0].close();assert.equal(f.bridge.snapshot().connected,false);
  await f.bridge.refresh();assert.equal(f.bridge.snapshot().connected,true);assert.equal(f.sockets.length,2);
  await f.bridge.stop();assert.equal(f.bridge.timer,null);assert.equal(f.bridge.socket,null);assert.equal(f.bridge.snapshot().connected,false);
  const count=f.requests.length;f.sockets[1].prefs(skin('fixture-one'));await f.bridge.refresh();assert.equal(f.requests.length,count);
  assert.ok(f.sockets.every(s=>s.closed>=1&&s.sent.length===0));
  await f.bridge.start();assert.equal(f.bridge.snapshot().connected,true);assert.equal(f.sockets.length,3);
});

test('installed package schemes preserve custom hyphenated values and empty selections',async t=>{
  const f=fixture();t.after(()=>f.bridge.stop());
  f.catalog()[0].axes=[{id:'style',options:[{id:'blue-gray'}]}];f.catalog()[0].presets=[];
  f.state.skin.scheme='blue-gray';await f.bridge.start();assert.equal(f.bridge.snapshot().descriptor.scheme,'blue-gray');
  delete f.state.skin.scheme;f.sockets[0].prefs(f.state.skin);await settle(f.bridge);assert.equal(f.bridge.snapshot().descriptor.scheme,'');
});

test('the public built-in default figure derives appearance from skin slots',async t=>{
  const f=fixture();t.after(()=>f.bridge.stop());const builtin=pack('coo');f.setCatalog([builtin]);
  f.state.skin={figure:'coo',scheme:'irrelevant',style:'stripe'};await f.bridge.start();assert.equal(f.bridge.snapshot().descriptor.scheme,'stripe');
});

test('missing selected figure never falls back to a different catalog entry',async t=>{
  const f=fixture();t.after(()=>f.bridge.stop());f.state.skin=skin('fixture-missing');await f.bridge.start();
  assert.deepEqual(f.bridge.snapshot().descriptor,null);assert.equal(f.sockets.length,0);
  assert.equal(new Set(f.requests.map(r=>new URL(r.url).port)).size,10);
});

test('disabled or random-port desktop service stays explicitly disconnected without requests',async()=>{
  for(const config of [{enabled:false},{port:0}]){
    const f=fixture();Object.assign(f.config,config);await f.bridge.start();
    assert.equal(f.bridge.snapshot().connected,false);assert.equal(f.requests.length,0);assert.equal(f.sockets.length,0);await f.bridge.stop();
  }
});

test('port conflicts use the bounded fallback and cache the verified origin',async t=>{
  const f=fixture({fetcher:async(url,init,{state,catalog})=>{
    const location=new URL(url);if(location.port!=='7799')throw Error('Connection refused');
    return Response.json(location.pathname==='/api/state'?state:location.pathname==='/api/figures'?catalog:{width:64});
  }});t.after(()=>f.bridge.stop());await f.bridge.start();
  assert.equal(f.bridge.snapshot().connected,true);assert.ok(f.bridge.snapshot().descriptor.frameUrl.startsWith('http://127.0.0.1:7799/'));
  f.requests.length=0;f.sockets[0].prefs(f.state.skin);await settle(f.bridge);assert.ok(f.requests.every(r=>new URL(r.url).port==='7799'));
});

test('neighbor service must match the configured selected figure and scheme',async t=>{
  const f=fixture();t.after(()=>f.bridge.stop());f.config.skin=skin('fixture-two');await f.bridge.start();
  assert.equal(f.bridge.snapshot().connected,false);assert.equal(f.sockets.length,0);
});

test('foreign, traversing and malformed selected assets are rejected before loading',async()=>{
  for(const bad of [{entry:'https://example.com/code.js'},{entry:'../other/code.js'},{entry:'%2e%2e/other.js'},{entry:'%5cother.js'},{model:'http://127.0.0.1:7798/model.json'},{base:'/unrelated/'},{export:'alert(1)'},{axes:[{id:'style',options:[]}]}]){
    const f=fixture();Object.assign(f.catalog()[0],bad);await f.bridge.start();assert.equal(f.bridge.snapshot().connected,false,JSON.stringify(bad));
    assert.ok(f.requests.every(r=>new URL(r.url).hostname==='127.0.0.1'));await f.bridge.stop();
  }
});

test('configuration failures are redacted and an inflight refresh cannot publish after stop',async()=>{
  const broken=fixture({bridge:{readConfig:async()=>{throw Error('SECRET CONFIG CONTENT');}}});await broken.bridge.start();
  assert.ok(!JSON.stringify(broken.bridge.snapshot()).includes('SECRET'));await broken.bridge.stop();
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const f=fixture({fetcher:async(url,init,{state,catalog})=>{await gate;return Response.json(url.endsWith('/api/state')?state:url.endsWith('/api/figures')?catalog:{});}});
  const starting=f.bridge.start();await new Promise(resolve=>setImmediate(resolve));const stopping=f.bridge.stop();release();await Promise.all([starting,stopping]);
  assert.equal(f.bridge.snapshot().connected,false);assert.equal(f.sockets.length,0);
});

test('a second watcher change during a request is not lost',async t=>{
  let gate=null,release;
  const f=fixture({fetcher:async(url,init,{state,catalog})=>{
    if(url.endsWith('/api/state')){const result=structuredClone(state);if(gate)await gate;return Response.json(result);}
    return Response.json(url.endsWith('/api/figures')?catalog:{});
  }});t.after(()=>f.bridge.stop());await f.bridge.start();
  gate=new Promise(resolve=>{release=resolve;});f.state.skin.scheme='stripe';f.sockets[0].prefs(f.state.skin);
  await new Promise(resolve=>setImmediate(resolve));f.state.skin=skin('fixture-two');f.sockets[0].prefs(f.state.skin);gate=null;release();await settle(f.bridge);
  assert.equal(f.bridge.snapshot().descriptor.skin.figure,'fixture-two');assert.equal(f.bridge.snapshot().descriptor.scheme,'plain');
});

test('JSON response size is bounded and redirect policy reaches the fetcher',async()=>{
  const f=fixture({fetcher:async(url,init)=>{assert.equal(init.redirect,'error');return new Response('{}',{headers:{'content-type':'application/json','content-length':String(5*1024*1024)}});}});
  await assert.rejects(()=>f.bridge.json('http://127.0.0.1:7797/api/state',new AbortController().signal),/too large/);
});
