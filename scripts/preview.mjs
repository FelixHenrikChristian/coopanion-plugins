/** Isolated panel harness with a fictional local desktop service. */
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {WardrobeWorld,DEFAULTS} from '../src/index.js';
const profile=JSON.parse(await readFile(new URL('../examples/forest-fox.profile.json',import.meta.url),'utf8'));
const pack={id:profile.figure,name:{zh:profile.label,en:'Moss Fox'},axes:[{id:'appearance',options:profile.outfits.flatMap(o=>o.variants.map(v=>({id:v.scheme,name:{en:v.scheme}})))}],presets:[]};
let skin={figure:profile.figure,scheme:'trailleafboots',palette:'mint'};
const pet=createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;res.setHeader('Content-Type','application/json');if(req.url==='/api/figures')res.end(JSON.stringify([pack]));else if(req.url==='/api/state')res.end(JSON.stringify({skin}));else if(req.url==='/api/skin'&&req.method==='POST'){skin=JSON.parse(body).skin;res.end('{"ok":true}');}else{res.statusCode=404;res.end('{}');}});
await new Promise(resolve=>pet.listen(0,'127.0.0.1',resolve));
const root=await mkdtemp(join(tmpdir(),'wardrobe-preview-'));
const world=new WardrobeWorld({dataDir:root,cfg:{...DEFAULTS,desktopPetUrl:`http://127.0.0.1:${pet.address().port}`}});
await world.start({log:{warn(){}}});await world.importProfile(profile);
const html=`<!doctype html><html lang="zh"><meta charset="utf-8"><title>装扮工作室 · 虚构示例</title><link rel="stylesheet" href="/web/style.css"><style>body{margin:0;padding:28px;background:#e6eae3}nav{max-width:1320px;margin:0 auto 18px;display:flex;align-items:center;gap:12px;font:14px system-ui;color:#536c5b}nav button{padding:9px 16px;border:1px solid #c8d8c9;border-radius:10px;background:white;color:#34513e;cursor:pointer}nav strong{margin-right:auto}</style><nav><strong>装扮工作室 <span style="font-weight:400">/ 独立 World 扩展</span></strong><span>虚构角色演示，不连接现有桌宠</span><button id="wardrobe">衣橱</button><button id="guide">制作指导</button></nav><main id="root"></main><script type="module">import client from '/web/client.js';let controller,mounted;function mount(panel){controller?.abort();mounted?.dispose();controller=new AbortController();const ctx={root:document.querySelector('#root'),language:'zh',signal:controller.signal,invoke:async(method,args=[])=>{const r=await fetch('/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({panel,method,args})});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}};mounted=client.panels[panel].mount(ctx);}document.querySelector('#wardrobe').onclick=()=>mount('wardrobe');document.querySelector('#guide').onclick=()=>mount('guide');mount('wardrobe');</script></html>`;
const server=createServer(async(req,res)=>{try{
 if(req.method==='POST'&&req.url==='/invoke'){
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403).end();return;}
   let body='';for await(const c of req){body+=c;if(body.length>70000)throw Error('Request too large');}
   const {panel,method,args}=JSON.parse(body);let result=await world.webUi('zh').invoke(panel,method,args);
   if(method==='state')result={...result,demo:true};res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
 }
 if(req.url==='/'||req.url==='/index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 const paths={'/web/client.js':['web/client.js','text/javascript'],'/web/style.css':['web/style.css','text/css']};
 if(!paths[req.url]){res.writeHead(404).end();return;}
 const[file,type]=paths[req.url];res.setHeader('Content-Type',type+'; charset=utf-8');res.end(await readFile(new URL('../'+file,import.meta.url)));
 }catch(e){res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:e.message}));}});
const port=Number(process.env.WARDROBE_PREVIEW_PORT??0);await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
console.log(`Wardrobe Studio fictional preview: http://127.0.0.1:${server.address().port}/`);
let closing=false;async function stop(){if(closing)return;closing=true;await world.stop();server.closeAllConnections();pet.closeAllConnections();server.close();pet.close();const target=resolve(root);if(dirname(target)!==resolve(tmpdir())||!basename(target).startsWith('wardrobe-preview-'))throw Error('Unexpected preview cleanup path');await rm(target,{recursive:true,force:true});}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
