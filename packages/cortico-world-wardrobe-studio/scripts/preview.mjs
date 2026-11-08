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
const html=await readFile(new URL('./preview.html',import.meta.url),'utf8');
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
