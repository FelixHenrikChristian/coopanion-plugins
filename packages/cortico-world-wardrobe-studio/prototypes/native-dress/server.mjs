/** Read-only host-copy experiment. Never patches or writes the installed host/figure files. */
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {validateProfile,validateAgainstPack} from '../../src/profile.js';
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
if(!arg('--web'))throw Error('Pass --web <installed desktop-pet web directory>; files are read only');
const web=resolve(arg('--web')),here=fileURLToPath(new URL('./',import.meta.url)),project=fileURLToPath(new URL('../../',import.meta.url));
const {WebSocketServer}=createRequire(join(web,'../package.json'))('ws');
const profile=validateProfile(JSON.parse(await readFile(arg('--profile')??join(project,'examples/lulu.profile.json'),'utf8')));
const privateMode=!!arg('--profile');let packs,skin;
if(privateMode){
 const seed=new URL(arg('--seed')??'http://127.0.0.1:7797');if(seed.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(seed.hostname)||seed.username||seed.password)throw Error('Seed service must be local HTTP');
 if(!arg('--figure-root'))throw Error('Private mode needs --figure-root <installed figures directory>');
 const get=async path=>{const r=await fetch(new URL(path,seed),{signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Local seed read failed');return r.json();};
 packs=(await get('/api/figures')).map(p=>({...p,removable:false}));skin=(await get('/api/state')).skin;
}else{
 const coo=JSON.parse(await readFile(join(web,'coo/figure.json'),'utf8'));
 const samplePack={manifest:2,api:2,id:profile.figure,version:'0.0.0-preview',name:{zh:'噜噜',en:'Lulu'},about:{zh:'噜噜衣橱界面预览；静态图不是完整动作包。',en:'Lulu wardrobe UI preview; still images are not the full animation pack.'},entry:'figure.js',export:'createLuluPreviewBody',thumb:'thumbs/bag.png',base:'/packs/lulu-capybara/',axes:[{id:'appearance',name:{zh:'完整搭配',en:'Complete look'},options:profile.outfits.flatMap(o=>o.variants.map(v=>({id:v.scheme,name:{zh:o.label+' / '+Object.values(v.pick).join(' · ')},thumb:'thumbs/'+v.scheme+'.png'})))}],presets:[],vocab:[],sounds:{},can:{walk:false},needs:[],effects:{reach:0}};
 packs=[{...coo,base:'/web/coo/',presets:coo.presets??[],removable:false},samplePack];
 skin={figure:profile.figure,scheme:'bag',palette:'mint',head:'none',side:'none',glasses:'none',neck:'none',colors:{}};
}
validateAgainstPack(profile,packs.find(p=>p.id===profile.figure));
let enabled=true,registered=true,offline=false,revision=1;const events=new Set(),sockets=new Set();
const status=()=>({enabled,registered,offline,revision,figure:skin.figure,scheme:skin.scheme});
const notify=()=>{for(const res of events)res.write('data: '+JSON.stringify({revision})+'\n\n');};
const prefs=()=>{for(const ws of sockets)if(ws.readyState===1)ws.send(JSON.stringify({t:'prefs',skin,theme:'dark',language:'zh'}));};
const source=await readFile(join(web,'dress.js'),'utf8'),sourceHash=createHash('sha256').update(source).digest('hex');
function replaceOnce(text,needle,replacement){if(text.split(needle).length!==2)throw Error('Host source anchor changed: inspect this version before running');return text.replace(needle,replacement);}
let patched=replaceOnce(source,"import { ICONS, themeButton } from './ui.js';","import { ICONS, themeButton } from './ui.js';\nimport {createWardrobeControls} from '/integration/controls.js';");
patched=replaceOnce(patched,'  const picks = picksOf(pack, skin.scheme);','  if (wardrobe.render({pack,skin,after:box,apply,language:language()})) return;\n  const picks = picksOf(pack, skin.scheme);');
patched=replaceOnce(patched,'void ready.then(() => { connect(); apply(skin, false); });',`const wardrobe=createWardrobeControls({load:async()=>{const r=await fetch('/api/wardrobe-view');if(!r.ok)throw Error('Provider unavailable');return r.json();},onChange:()=>render(),onError:()=>{}});
await wardrobe.refresh();
const providerEvents=new EventSource('/prototype/events');providerEvents.onmessage=()=>void wardrobe.refresh();addEventListener('pagehide',()=>providerEvents.close(),{once:true});
void ready.then(() => { connect(); apply(skin, false); });`);
const mime={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'};
function safe(root,relative){const file=resolve(root,relative);if(file!==root&&!file.startsWith(root+sep))throw Error('Path leaves allowed assets');return file;}
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value));}
const server=createServer(async(req,res)=>{try{
 const origin='http://'+req.headers.host,url=new URL(req.url,origin),path=decodeURIComponent(url.pathname);
 if(!['127.0.0.1','localhost'].includes(url.hostname)){res.writeHead(421).end();return;}
 if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==origin){res.writeHead(403).end();return;}
 if(path==='/prototype/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write('data: '+JSON.stringify({revision})+'\n\n');events.add(res);req.on('close',()=>events.delete(res));return;}
 if(req.method==='POST'){
  let text='';for await(const chunk of req){text+=chunk;if(text.length>70000)throw Error('Request too large');}const body=JSON.parse(text||'{}');
  if(path==='/prototype/control'){for(const key of Object.keys(body))if(!['enabled','registered','offline'].includes(key)||typeof body[key]!=='boolean')throw Error('Invalid control');if('enabled'in body)enabled=body.enabled;if('registered'in body)registered=body.registered;if('offline'in body)offline=body.offline;revision++;notify();json(res,status());return;}
  if(path==='/api/skin'){const next=body.skin,pack=packs.find(p=>p.id===next?.figure);if(!pack)throw Error('Unknown figure');if(pack.id!=='coo'&&!pack.axes.every((a,i)=>a.options.some(o=>o.id===String(next.scheme).split('-')[i]))&&!pack.presets?.some(p=>p.id===next.scheme))throw Error('Unknown scheme');skin=structuredClone(next);prefs();json(res,{ok:true});return;}
  if(path==='/api/prefs'){json(res,{ok:true});return;}
  json(res,{error:'Writes to installed figures, imports and other services are unavailable in this isolated prototype'},405);return;
 }
 if(path==='/api/wardrobe-view'){json(res,{contract:1,enabled:enabled&&registered,profiles:registered?[profile]:[],revision},offline?503:200);return;}
 if(path==='/prototype/status'){json(res,{...status(),sourceHash,installedFilesReadOnly:true,mode:privateMode?'private-local':'lulu-preview'});return;}
 if(path==='/api/figures'){json(res,packs);return;}
 if(path==='/api/figures/status'){json(res,{importable:false,large:0,depth:0,problems:[]});return;}
 if(path==='/api/state'){json(res,{skin,theme:'dark',language:'zh',sounds:{volume:0}});return;}
 if(path==='/web/dress.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(patched);return;}
 let file;
 if(path==='/')file=join(here,'shell.html');
 else if(path==='/dress')file=join(web,'dress.html');
 else if(path==='/figure-frame'){
  file=join(web,'figure-frame.html');res.setHeader('Content-Security-Policy',`sandbox allow-scripts; default-src 'none'; script-src ${origin}; img-src ${origin} data: blob:; style-src 'unsafe-inline'; connect-src ${origin};`);
 }else if(path==='/integration/controls.js')file=join(here,'controls.js');
 else if(path==='/integration/profile.js')file=join(project,'src/profile.js');
 else if(!privateMode&&path==='/packs/lulu-capybara/figure.js')file=join(here,'sample-figure.js');
 else if(!privateMode&&path.startsWith('/packs/lulu-capybara/thumbs/')){const scheme=path.split('/').at(-1).replace(/\.png$/,'');if(!['bag','plain','sleep','dino'].includes(scheme))throw Error('Unknown sample thumbnail');file=join(project,'assets/lulu',scheme+'.png');}
 else if(path.startsWith('/web/'))file=safe(web,path.slice(5));
 else if(privateMode&&path.startsWith('/packs/')){
  const id=path.split('/')[2];if(!packs.some(p=>p.id===id))throw Error('Unknown pack');const figureRoot=resolve(arg('--figure-root'));file=safe(figureRoot,path.slice(7));
 }else{res.writeHead(404).end();return;}
 if(!(await stat(file)).isFile()){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store','Access-Control-Allow-Origin':'null'}).end(await readFile(file));
 }catch(error){json(res,{error:error.message},400);}});
const wss=new WebSocketServer({noServer:true});server.on('upgrade',(req,socket,head)=>{const url=new URL(req.url,'http://'+req.headers.host);if(url.pathname!=='/socket'||(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)){socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>{sockets.add(ws);ws.send(JSON.stringify({t:'init',skin,theme:'dark',language:'zh',sounds:{volume:0}}));ws.on('close',()=>sockets.delete(ws));});});
await new Promise(resolve=>server.listen(Number(arg('--port')??0),'127.0.0.1',resolve));
console.log('Isolated native wardrobe prototype: http://127.0.0.1:'+server.address().port+'/');console.log('Installed host files remain read-only; all appearance writes stay in this process.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const res of events)res.end();for(const ws of sockets)ws.close();server.closeAllConnections();server.close();});
