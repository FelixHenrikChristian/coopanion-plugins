import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Bridge,localBase,downloadRelease} from '../src/bridge.js';
test('only loopback root origins are accepted',()=>{for(const value of ['https://localhost','http://example.test','http://localhost/path','http://user@localhost','http://127.0.0.1/?secret=x','http://127.0.0.1/#x'])assert.throws(()=>localBase(value));assert.equal(localBase('http://127.0.0.1:7797'),'http://127.0.0.1:7797');});
test('installation stages only the intended pack and never authorizes replacement',async()=>{
 const calls=[];let installed=false;
 const b=new Bridge('http://localhost:7797',{fetcher:async(url,options)=>{calls.push({url,options});if(url.endsWith('/api/figures'))return Response.json(installed?[{id:'lulu-capybara'}]:[]);if(url.endsWith('/import'))return Response.json({token:'fixture',packs:[{id:'other',dir:'unrelated'},{id:'lulu-capybara',dir:'lulu',installed:null}],problems:[]});if(url.endsWith('/install')){assert.deepEqual(JSON.parse(options.body),{token:'fixture',dirs:['lulu'],replace:[]});installed=true;return Response.json({ok:true});}throw Error(url);}});
 assert.deepEqual(await b.install(Buffer.from('fixture'),'lulu-capybara'),{installed:true});assert(calls.every(c=>c.options.redirect==='error'));
 const n=calls.length;assert.equal((await b.install(Buffer.from('fixture'),'lulu-capybara')).reason,'already-installed');assert.equal(calls.length,n+1);
});
test('a staged replacement or validation problem cannot install',async()=>{for(const stage of [{token:'x',packs:[{id:'lulu',dir:'',installed:'1.0'}],problems:[]},{token:'x',packs:[{id:'lulu',dir:'',installed:null}],problems:[{reason:'invalid'}]}]){let posts=0;const b=new Bridge('http://localhost',{fetcher:async(url)=>{if(url.endsWith('/api/figures'))return Response.json([]);posts++;return Response.json(stage);}});await assert.rejects(b.install(Buffer.from('x'),'lulu'));assert.equal(posts,1);}});
test('download pins size and hash and confines redirects',async()=>{
 const bytes=Buffer.from('fixture figure zip'),meta={url:'https://github.com/FelixHenrikChristian/coopanion-plugins/releases/download/lulu-v0.1.0/lulu.zip',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},signal=new AbortController().signal;
 assert.deepEqual(await downloadRelease(meta,signal,async()=>new Response(bytes)),bytes);
 await assert.rejects(downloadRelease({...meta,sha256:'0'.repeat(64)},signal,async()=>new Response(bytes)),/校验失败/);
 await assert.rejects(downloadRelease(meta,signal,async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})),/无效/);
 await assert.rejects(downloadRelease(meta,signal,async()=>new Response(null,{status:302,headers:{location:'https://other.test/private'}})),/来源/);
 await assert.rejects(downloadRelease(meta,signal,async()=>new Response(Buffer.concat([bytes,bytes]))),/大小/);
});
test('outfit switching preserves other skin properties and verifies result',async()=>{let skin={figure:'fixture',scheme:'a',size:1.2};const b=new Bridge('http://localhost',{fetcher:async(url,options)=>{if(url.endsWith('/api/state'))return Response.json({skin});assert.equal(url,'http://localhost/api/skin');skin=JSON.parse(options.body).skin;return Response.json({ok:true});}});await b.choose('lulu','bag');assert.deepEqual(skin,{figure:'lulu',scheme:'bag',size:1.2});});
